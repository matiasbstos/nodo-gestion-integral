import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { logAuditAction } from '../utils/auditLogger';

/**
 * REGLAS DE FUNCIONAMIENTO OFICIALES NODO (SAR / APS)
 * Parámetros y márgenes de tolerancia configurables para auditoría y conciliación
 */
export const REGLAS_CONFIG = {
  // Tolerancia de entrada
  TOLERANCIA_ENTRADA_TEMPRANA_MIN: 15, // minutos antes del inicio permitido
  TOLERANCIA_ENTRADA_TARDIA_MIN: 10,   // minutos después del inicio sin considerarse retraso
  RETRASO_LEVE_MAX_MIN: 20,            // entre 11 y 20 min es retraso leve
  RETRASO_GRAVE_MIN: 21,               // 21 min o más se considera retraso severo

  // Tolerancia de salida
  TOLERANCIA_SALIDA_ANTICIPADA_MIN: 15, // minutos antes del fin permitido
  MARGEN_TURNO_ABANDONADO_HORAS: 3,    // si pasan 3h de la hora fin y no marcó salida -> incompleto

  // Horas mínimas y máximas por turno
  DURACION_MINIMA_TURNO_HORAS: 1,
  DURACION_MAXIMA_TURNO_HORAS: 24
};

/**
 * Catálogo de Discrepancias Tipificadas
 */
export const TIPOS_DISCREPANCIA = {
  AUSENCIA_SIN_MARCAJE: {
    id: 'AUSENCIA_SIN_MARCAJE',
    label: 'Turno Programado Sin Marcaje',
    shortLabel: 'Sin Marcaje',
    severidad: 'critica', // critica, advertencia, leve
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    descripcion: 'El turno programado ya transcurrió o superó su inicio sin que exista registro de entrada.',
    accionRecomendada: 'Registrar inasistencia o aplicar justificación formal si medió aviso verbal/médico.'
  },
  MARCAJE_INCOMPLETO_SIN_SALIDA: {
    id: 'MARCAJE_INCOMPLETO_SIN_SALIDA',
    label: 'Entrada Marcada Sin Salida (Turno Abierto)',
    shortLabel: 'Salida Omitida',
    severidad: 'critica',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    descripcion: 'El funcionario marcó ingreso, pero el turno ya finalizó hace más de 3 horas sin registrar salida.',
    accionRecomendada: 'Verificar término real del turno con jefatura y cerrar con horario contractual pactado.'
  },
  RETRASO_SEVERO: {
    id: 'RETRASO_SEVERO',
    label: 'Retraso de Entrada Severo (>20 min)',
    shortLabel: 'Retraso Severo',
    severidad: 'advertencia',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    descripcion: 'El funcionario ingresó con más de 20 minutos de desfase respecto a la hora programada en pauta.',
    accionRecomendada: 'Descontar minutos o imputar horas efectivas previa autorización de jefatura.'
  },
  RETRASO_LEVE: {
    id: 'RETRASO_LEVE',
    label: 'Retraso de Entrada Leve (11-20 min)',
    shortLabel: 'Retraso Leve',
    severidad: 'leve',
    badgeClass: 'bg-amber-50 text-amber-600 border-amber-100',
    descripcion: 'Ingreso posterior a la ventana de 10 minutos de tolerancia permitida.',
    accionRecomendada: 'Auto-conciliar si existe compensación o registrar en seguimiento formativo.'
  },
  SALIDA_ANTICIPADA: {
    id: 'SALIDA_ANTICIPADA',
    label: 'Salida Prematura no Autorizada',
    shortLabel: 'Salida Prematura',
    severidad: 'advertencia',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    descripcion: 'El marcaje de salida se realizó más de 15 minutos antes de la hora estipulada.',
    accionRecomendada: 'Corroborar motivo de retiro o ajustar el cómputo de horas para honorarios.'
  },
  TURNO_PENDIENTE_ACEPTACION: {
    id: 'TURNO_PENDIENTE_ACEPTACION',
    label: 'Turno en Pauta Sin Aceptar por Funcionario',
    shortLabel: 'Sin Aceptar',
    severidad: 'leve',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200/80',
    descripcion: 'El turno fue asignado en pauta pero el funcionario aún no ha tomado conocimiento formal.',
    accionRecomendada: 'Notificar al funcionario para confirmación en la app.'
  },
  INCIDENCIA_SIN_RESOLVER: {
    id: 'INCIDENCIA_SIN_RESOLVER',
    label: 'Justificación / Novedad Pendiente de Firma',
    shortLabel: 'Incidencia Pendiente',
    severidad: 'advertencia',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    descripcion: 'El turno registra licencia o permiso pero carece de decreto o visto bueno de RRHH.',
    accionRecomendada: 'Revisar documentación de respaldo y validar estado final del turno.'
  }
};

/**
 * Convertir fechas a objeto Date estándar de JS
 */
const toDateSafe = (fecha) => {
  if (!fecha) return null;
  if (fecha instanceof Date) return fecha;
  if (typeof fecha.toDate === 'function') return fecha.toDate();
  if (typeof fecha === 'string' || typeof fecha === 'number') {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

/**
 * REGLA DE ORO: Evaluar un turno individual contra el motor de reglas
 */
export const auditarTurnoSegunReglas = (turno, fechaReferencia = new Date()) => {
  const inicioProgramado = toDateSafe(turno.fechaInicio || turno.inicio);
  const finProgramado = toDateSafe(turno.fechaFin || turno.termino || turno.fin);
  const entradaReal = toDateSafe(turno.entradaReal);
  const salidaReal = toDateSafe(turno.salidaReal);

  const ahora = toDateSafe(fechaReferencia) || new Date();

  // Si no hay fecha de inicio programada, no se puede auditar con precisión
  if (!inicioProgramado) {
    return {
      turnoId: turno.id,
      esValido: true,
      tieneDiscrepancia: false,
      discrepancias: []
    };
  }

  const discrepancias = [];
  const estado = (turno.estado || '').toLowerCase();
  const esJustificado = ['licencia', 'vacaciones', 'permiso', 'justificado'].includes(estado) || 
                        Boolean(turno.motivoNovedad || turno.tipoNovedad);

  // 1. REGLA: Incidencia administrativa sin resolver
  if (esJustificado && !turno.aprobadoPorRRHH && !turno.estadoCierreRRHH) {
    discrepancias.push({
      ...TIPOS_DISCREPANCIA.INCIDENCIA_SIN_RESOLVER,
      detalles: `Turno en estado "${estado}". Motivo: ${turno.motivoNovedad || turno.tipoNovedad || 'No especificado'}. Falta validación RRHH.`
    });
  }

  // Si está justificado oficialmente, no evaluamos marcajes físicos
  if (esJustificado) {
    return {
      turnoId: turno.id,
      esValido: discrepancias.length === 0,
      tieneDiscrepancia: discrepancias.length > 0,
      discrepancias,
      horasProgramadas: finProgramado ? (finProgramado - inicioProgramado) / 3600000 : 0,
      horasRealesEfectivas: 0,
      estadoConciliacion: 'justificado'
    };
  }

  // 2. REGLA: Turno en el pasado sin marcaje de entrada (Ausencia)
  const turnoYaInicio = ahora > inicioProgramado;
  const margenInicioExcedido = (ahora - inicioProgramado) > (REGLAS_CONFIG.TOLERANCIA_ENTRADA_TARDIA_MIN * 60 * 1000);

  if (turnoYaInicio && margenInicioExcedido && !entradaReal) {
    const yaFinalizo = finProgramado && ahora > finProgramado;
    discrepancias.push({
      ...TIPOS_DISCREPANCIA.AUSENCIA_SIN_MARCAJE,
      detalles: yaFinalizo
        ? `El turno terminó a las ${finProgramado.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} y no registra ningún marcaje de ingreso.`
        : `El turno inició a las ${inicioProgramado.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} y han transcurrido más de ${Math.round((ahora - inicioProgramado) / 60000)} minutos sin entrada.`
    });
  }

  // 3. REGLA: Retraso en el marcaje de entrada
  if (entradaReal && inicioProgramado) {
    const desfaseMinutos = (entradaReal - inicioProgramado) / (60 * 1000);
    if (desfaseMinutos > REGLAS_CONFIG.RETRASO_GRAVE_MIN) {
      discrepancias.push({
        ...TIPOS_DISCREPANCIA.RETRASO_SEVERO,
        minutosDesfase: Math.round(desfaseMinutos),
        detalles: `Entrada marcada a las ${entradaReal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${Math.round(desfaseMinutos)} min de retraso sobre la pauta de las ${inicioProgramado.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`
      });
    } else if (desfaseMinutos > REGLAS_CONFIG.TOLERANCIA_ENTRADA_TARDIA_MIN) {
      discrepancias.push({
        ...TIPOS_DISCREPANCIA.RETRASO_LEVE,
        minutosDesfase: Math.round(desfaseMinutos),
        detalles: `Entrada marcada con ${Math.round(desfaseMinutos)} min de retraso (tolerancia máxima de 10 min superada).`
      });
    }
  }

  // 4. REGLA: Marcaje incompleto (Entrada registrada pero salida vacía mucho después de fin de turno)
  if (entradaReal && !salidaReal && finProgramado) {
    const horasDespuesFin = (ahora - finProgramado) / 3600000;
    if (horasDespuesFin > REGLAS_CONFIG.MARGEN_TURNO_ABANDONADO_HORAS) {
      discrepancias.push({
        ...TIPOS_DISCREPANCIA.MARCAJE_INCOMPLETO_SIN_SALIDA,
        detalles: `Turno finalizaba a las ${finProgramado.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Han transcurrido ${Math.round(horasDespuesFin)}h sin registro de salida.`
      });
    }
  }

  // 5. REGLA: Salida anticipada
  if (salidaReal && finProgramado) {
    const minutosAntes = (finProgramado - salidaReal) / (60 * 1000);
    if (minutosAntes > REGLAS_CONFIG.TOLERANCIA_SALIDA_ANTICIPADA_MIN) {
      discrepancias.push({
        ...TIPOS_DISCREPANCIA.SALIDA_ANTICIPADA,
        minutosDesfase: Math.round(minutosAntes),
        detalles: `Salida registrada a las ${salidaReal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${Math.round(minutosAntes)} min antes del término oficial pactado).`
      });
    }
  }

  // 6. REGLA: Turno futuro o en curso no aceptado por funcionario
  if (!turno.aceptado && turno.estado !== 'cancelado') {
    discrepancias.push({
      ...TIPOS_DISCREPANCIA.TURNO_PENDIENTE_ACEPTACION,
      detalles: 'El funcionario aún no ha presionado "Aceptar Turno" en su panel personal.'
    });
  }

  // Cálculo de horas programadas vs reales
  const horasProgramadas = finProgramado ? Math.max(0, (finProgramado - inicioProgramado) / 3600000) : 0;
  let horasRealesEfectivas = 0;
  if (entradaReal && salidaReal) {
    horasRealesEfectivas = Math.max(0, (salidaReal - entradaReal) / 3600000);
  }

  const tieneDiscrepancia = discrepancias.length > 0;
  const severidadMaxima = discrepancias.some(d => d.severidad === 'critica') 
    ? 'critica' 
    : discrepancias.some(d => d.severidad === 'advertencia') 
      ? 'advertencia' 
      : tieneDiscrepancia ? 'leve' : 'normal';

  return {
    turnoId: turno.id,
    turnoData: turno,
    esValido: !tieneDiscrepancia,
    tieneDiscrepancia,
    severidadMaxima,
    discrepancias,
    horasProgramadas: parseFloat(horasProgramadas.toFixed(2)),
    horasRealesEfectivas: parseFloat(horasRealesEfectivas.toFixed(2)),
    diferenciaHoras: parseFloat((horasRealesEfectivas - horasProgramadas).toFixed(2)),
    inicioProgramado,
    finProgramado,
    entradaReal,
    salidaReal,
    estadoConciliacion: tieneDiscrepancia ? 'en_disputa' : (turno.estadoCierreRRHH ? 'cerrado' : 'listo_para_liquidacion')
  };
};

/**
 * Escanear lote completo de turnos y generar reporte del Agente Auditor
 */
export const auditarLoteTurnos = (turnos = [], filtros = {}) => {
  const auditados = [];
  let totalCriticas = 0;
  let totalAdvertencias = 0;
  let totalLeves = 0;
  let totalConciliados = 0;
  let totalHorasDisputa = 0;

  turnos.forEach(turno => {
    // Aplicar filtros en memoria si existen
    if (filtros.rutFuncionario && turno.rutFuncionario !== filtros.rutFuncionario) {
      return;
    }
    if (filtros.centro && turno.centroAsignacion !== filtros.centro && turno.centroSalud !== filtros.centro) {
      return;
    }

    const resultado = auditarTurnoSegunReglas(turno);
    auditados.push(resultado);

    if (resultado.tieneDiscrepancia) {
      if (resultado.severidadMaxima === 'critica') totalCriticas++;
      else if (resultado.severidadMaxima === 'advertencia') totalAdvertencias++;
      else totalLeves++;

      totalHorasDisputa += Math.abs(resultado.diferenciaHoras || resultado.horasProgramadas);
    } else {
      totalConciliados++;
    }
  });

  return {
    totalTurnos: auditados.length,
    totalDiscrepancias: totalCriticas + totalAdvertencias + totalLeves,
    totalCriticas,
    totalAdvertencias,
    totalLeves,
    totalConciliados,
    totalHorasDisputa: parseFloat(totalHorasDisputa.toFixed(1)),
    tasaCumplimiento: auditados.length > 0 ? Math.round((totalConciliados / auditados.length) * 100) : 100,
    resultados: auditados
  };
};

/**
 * ACCIONES DEL AGENTE AUDITOR: Resolver discrepancia con justificación formal
 */
export const resolverDiscrepanciaConJustificacion = async (turnoId, datosResolucion, currentUser) => {
  try {
    const { motivo, horasAprobadas, observacion } = datosResolucion;
    const turnoRef = doc(db, 'turnos', turnoId);

    const updatePayload = {
      estado: 'completado_manual',
      discrepanciaResuelta: true,
      motivoJustificacionRRHH: motivo || 'Marcaje regularizado por Jefatura',
      observacionAuditor: observacion || '',
      horasAprobadasParaPago: parseFloat(horasAprobadas) || null,
      fechaResolucionAuditor: new Date().toISOString(),
      resueltoPorNombre: currentUser?.nombre || 'Jefatura / RRHH',
      resueltoPorRut: currentUser?.rut || currentUser?.id || 'admin',
      estadoConciliacion: 'conciliado_manual'
    };

    await updateDoc(turnoRef, updatePayload);

    await logAuditAction(db, {
      accion: 'AGENTE_AUDITOR_DISCREPANCIA_RESUELTA',
      detalles: `Turno ID ${turnoId} justificado: "${motivo}" por ${updatePayload.resueltoPorNombre}. Horas aprobadas: ${horasAprobadas || 'Pauta contractual'}.`,
      usuario: currentUser,
      categoria: 'asistencia'
    });

    return true;
  } catch (error) {
    console.error('Error al resolver discrepancia:', error);
    throw error;
  }
};

/**
 * ACCIONES DEL AGENTE AUDITOR: Auto-conciliar (Ajustar a horario de pauta cuando el desfase es tolerable)
 */
export const autoConciliarTurno = async (turnoId, currentUser) => {
  try {
    const turnoRef = doc(db, 'turnos', turnoId);
    const snap = await getDoc(turnoRef);
    if (!snap.exists()) throw new Error('Turno no encontrado.');

    const turnoData = snap.data();
    const updatePayload = {
      estado: 'completado',
      discrepanciaResuelta: true,
      autoConciliadoPorAgente: true,
      fechaAutoConciliacion: new Date().toISOString(),
      conciliadoPor: currentUser?.nombre || 'Agente Auditor NODO',
      estadoConciliacion: 'conciliado_automatico'
    };

    // Si le faltaba salida y fue auto-conciliado, imputamos fin pactado
    if (!turnoData.salidaReal && turnoData.fechaFin) {
      updatePayload.salidaReal = turnoData.fechaFin;
    }

    await updateDoc(turnoRef, updatePayload);

    await logAuditAction(db, {
      accion: 'AGENTE_AUDITOR_AUTO_CONCILIACION',
      detalles: `Turno ID ${turnoId} de ${turnoData.nombreFuncionario} auto-conciliado bajo tolerancia de pauta oficial.`,
      usuario: currentUser,
      categoria: 'asistencia'
    });

    return true;
  } catch (error) {
    console.error('Error al auto-conciliar turno:', error);
    throw error;
  }
};
