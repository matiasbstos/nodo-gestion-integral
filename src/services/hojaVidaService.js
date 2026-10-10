import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { logAuditAction } from '../utils/auditLogger';

/**
 * Constantes y Metadatos de Tipos de Anotación
 */
export const TIPOS_ANOTACION = {
  felicitacion: {
    id: 'felicitacion',
    label: 'Felicitación / Reconocimiento',
    shortLabel: 'Felicitación',
    color: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500 ring-emerald-100',
    iconName: 'Award',
    impacto: 'positivo',
    descripcion: 'Reconocimiento formal por desempeño sobresaliente, trato humanizado o aporte destacado.'
  },
  retraso: {
    id: 'retraso',
    label: 'Retraso en Turno',
    shortLabel: 'Retraso',
    color: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClass: 'bg-amber-500 ring-amber-100',
    iconName: 'Clock',
    impacto: 'atencion',
    descripcion: 'Llegada posterior a la hora pactada de inicio de turno sin previo aviso justificado.'
  },
  ausencia: {
    id: 'ausencia',
    label: 'Ausencia Injustificada',
    shortLabel: 'Ausencia',
    color: 'orange',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
    dotClass: 'bg-orange-500 ring-orange-100',
    iconName: 'UserX',
    impacto: 'negativo',
    descripcion: 'Inasistencia a turno programado sin cobertura oportuna ni justificación médica/legal.'
  },
  falta_protocolo: {
    id: 'falta_protocolo',
    label: 'Falta de Protocolo / Procedimiento',
    shortLabel: 'Falta Protocolo',
    color: 'rose',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500 ring-rose-100',
    iconName: 'AlertTriangle',
    impacto: 'critico',
    descripcion: 'Incumplimiento de normas clínicas, bioseguridad, trato al paciente o protocolos SAR/APS.'
  },
  nota_desempeno: {
    id: 'nota_desempeno',
    label: 'Nota de Desempeño / Observación Clínica',
    shortLabel: 'Nota Desempeño',
    color: 'sky',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
    dotClass: 'bg-sky-500 ring-sky-100',
    iconName: 'FileText',
    impacto: 'neutro',
    descripcion: 'Seguimiento general de competencias, retroalimentación formativa y metas alcanzadas.'
  }
};

/**
 * Escala de Calificación 1.0 a 7.0 (Estándar Salud / Chile)
 */
export const ESCALA_EVALUACION = [
  { min: 6.0, max: 7.0, label: 'Sobresaliente / Destacado', color: 'emerald', badge: 'bg-emerald-100 text-emerald-800' },
  { min: 5.0, max: 5.9, label: 'Bueno / Cumple Estándar', color: 'sky', badge: 'bg-sky-100 text-sky-800' },
  { min: 4.0, max: 4.9, label: 'Aceptable / Requiere Monitoreo', color: 'amber', badge: 'bg-amber-100 text-amber-800' },
  { min: 1.0, max: 3.9, label: 'Insuficiente / Requiere Plan Crítico', color: 'rose', badge: 'bg-rose-100 text-rose-800' }
];

export const getEscalaInfo = (nota) => {
  const num = parseFloat(nota) || 0;
  return ESCALA_EVALUACION.find(e => num >= e.min && num <= e.max) || ESCALA_EVALUACION[3];
};

/**
 * Conceptos Oficiales de Calificación / Pre-calificación (Ley 19.378 APS - Melipilla)
 */
export const CONCEPTOS_EVALUACION = {
  'MUY BUENO': {
    id: 'MUY BUENO',
    label: 'MUY BUENO',
    puntos: 4,
    color: 'emerald',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30 font-bold',
    btnActive: 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30 border-emerald-600'
  },
  'BUENO': {
    id: 'BUENO',
    label: 'BUENO',
    puntos: 3,
    color: 'sky',
    badge: 'bg-sky-50 text-sky-800 border-sky-300 ring-1 ring-sky-400/30 font-bold',
    btnActive: 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-600/30 border-sky-600'
  },
  'REGULAR': {
    id: 'REGULAR',
    label: 'REGULAR',
    puntos: 2,
    color: 'amber',
    badge: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/30 font-bold',
    btnActive: 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-500/30 border-amber-500'
  },
  'MALO': {
    id: 'MALO',
    label: 'MALO',
    puntos: 1,
    color: 'rose',
    badge: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/30 font-bold',
    btnActive: 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30 border-rose-600'
  }
};

/**
 * Matriz Oficial de Factores de Evaluación (Formulario Pre-calificación / Calificación)
 */
export const FACTORES_EVALUACION_CONFIG = {
  competencia: {
    id: 'competencia',
    titulo: 'I Factor Competencia',
    items: [
      { id: 'preparacion_conocimiento', letra: 'a', label: 'Preparación y conocimiento' },
      { id: 'acogida_usuario', letra: 'b', label: 'Acogida al usuario' },
      { id: 'satisfaccion_usuaria', letra: 'c', label: 'Satisfacción usuaria' },
      { id: 'cantidad_calidad_trabajo', letra: 'd', label: 'Cantidad y Calidad del Trabajo' },
      { id: 'interes_trabajo', letra: 'e', label: 'Interés en el trabajo' },
      { id: 'iniciativa_trabajo', letra: 'f', label: 'Iniciativa en el trabajo' },
      { id: 'responsabilidad', letra: 'g', label: 'Responsabilidad' },
      { id: 'eficiencia', letra: 'h', label: 'Eficiencia' }
    ]
  },
  conducta: {
    id: 'conducta',
    titulo: 'II Factor Conducta Funcionaria',
    items: [
      { id: 'asistencia', letra: 'a', label: 'Asistencia' },
      { id: 'puntualidad', letra: 'b', label: 'Puntualidad' },
      { id: 'cumplimiento_normas', letra: 'c', label: 'Cumplimiento de normas' },
      { id: 'permanencia', letra: 'd', label: 'Permanencia' },
      { id: 'comportamiento', letra: 'e', label: 'Comportamiento' },
      { id: 'presentacion_personal', letra: 'f', label: 'Presentación Personal' }
    ]
  }
};

/**
 * Helper para verificar si un usuario tiene permisos de Jefatura o Admin
 */
export const esJefaturaOAdmin = (userData) => {
  if (!userData) return false;
  const role = (userData.role || '').toLowerCase();
  const tipo = (userData.tipoPrestador || '').toLowerCase();
  const cargo = (userData.cargo || '').toLowerCase();

  return (
    role === 'admin_global' || 
    role === 'admin_local' ||
    role.includes('admin') ||
    tipo.includes('admin') ||
    tipo.includes('jefe') ||
    tipo.includes('direct') ||
    cargo.includes('direct') ||
    cargo.includes('jefe') ||
    cargo.includes('coordinad')
  );
};

/**
 * Obtener listado de funcionarios activos para el selector
 */
export const getFuncionariosDisponibles = async () => {
  try {
    const snap = await getDocs(collection(db, 'usuarios'));
    const lista = [];
    snap.forEach((d) => {
      const data = d.data();
      const nombre = (data.nombre || data.displayName || data.nombreCompleto || '').trim();
      const rut = (data.rut || (d.id.includes('-') || !d.id.startsWith('UA') ? d.id : '')).trim();

      // Omitir documentos anónimos o tokens de sesión sin datos reales
      if (!nombre && !rut) return;

      lista.push({
        id: d.id,
        rut: rut || d.id,
        nombre: nombre || (rut ? `Funcionario (${rut})` : 'Funcionario'),
        cargo: data.cargo || data.tipoPrestador || 'Funcionario de Salud',
        correo: data.correoInstitucional || data.correo || data.email || '',
        telefono: data.telefono || '',
        role: data.role || 'user',
        categoria: data.categoria || 'E',
        grado: data.grado || 15
      });
    });
    // Ordenar alfabéticamente por nombre
    return lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
  } catch (err) {
    console.error('Error al obtener lista de funcionarios:', err);
    return [];
  }
};

/**
 * MÓDULO 1: Obtener anotaciones de hoja de vida de un funcionario
 */
export const getAnotacionesFuncionario = async (funcionarioId) => {
  try {
    if (!funcionarioId) return [];
    
    // Consulta por funcionarioId
    const q = query(
      collection(db, 'anotaciones_hoja_vida'),
      where('funcionarioId', '==', funcionarioId)
    );

    const snapshot = await getDocs(q);
    const anotaciones = [];

    snapshot.forEach((docSnap) => {
      anotaciones.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    // Ordenar en cliente de más reciente a más antiguo (por fechaEvento o timestamp)
    anotaciones.sort((a, b) => {
      const fechaA = new Date(a.fechaEvento || a.timestamp?.toDate?.() || a.timestamp || 0);
      const fechaB = new Date(b.fechaEvento || b.timestamp?.toDate?.() || b.timestamp || 0);
      return fechaB - fechaA;
    });

    return anotaciones;
  } catch (error) {
    console.error('Error al obtener anotaciones:', error);
    return [];
  }
};

/**
 * MÓDULO 1: Guardar una nueva anotación en anotaciones_hoja_vida
 */
export const agregarAnotacion = async (anotacionData, currentUser) => {
  try {
    if (!anotacionData.funcionarioId || !anotacionData.tipo || !anotacionData.descripcion) {
      throw new Error('Campos obligatorios incompletos: funcionarioId, tipo y descripción son requeridos.');
    }

    const payload = {
      funcionarioId: anotacionData.funcionarioId,
      funcionarioNombre: anotacionData.funcionarioNombre || 'Funcionario',
      funcionarioRut: anotacionData.funcionarioRut || anotacionData.funcionarioId,
      autorId: currentUser?.rut || currentUser?.id || currentUser?.uid || 'admin',
      autorNombre: currentUser?.nombre || currentUser?.displayName || 'Jefatura NODO',
      autorCargo: currentUser?.cargo || currentUser?.tipoPrestador || 'Jefatura de Servicio',
      tipo: anotacionData.tipo, // retraso, ausencia, felicitacion, falta_protocolo, nota_desempeno
      descripcion: anotacionData.descripcion.trim(),
      fechaEvento: anotacionData.fechaEvento || new Date().toISOString().split('T')[0],
      gravedad: anotacionData.gravedad || 'normal', // leve, media, grave (si aplica)
      categoriaClinica: anotacionData.categoriaClinica || 'general',
      timestamp: serverTimestamp(),
      fechaCreacionISO: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'anotaciones_hoja_vida'), payload);

    // Registro de Auditoría para trazabilidad
    await logAuditAction(db, {
      accion: 'REGISTRO_ANOTACION_HOJA_VIDA',
      detalles: `Anotación registrada (${payload.tipo}): "${payload.descripcion.substring(0, 80)}..."`,
      usuario: currentUser,
      targetFuncionario: {
        nombre: payload.funcionarioNombre,
        rut: payload.funcionarioRut
      },
      categoria: 'desempeno'
    });

    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('Error al agregar anotación:', error);
    throw error;
  }
};

/**
 * Eliminar una anotación (Solo Jefatura/Admin)
 */
export const eliminarAnotacion = async (anotacionId, anotacionInfo, currentUser) => {
  try {
    await deleteDoc(doc(db, 'anotaciones_hoja_vida', anotacionId));

    await logAuditAction(db, {
      accion: 'ELIMINACION_ANOTACION_HOJA_VIDA',
      detalles: `Se eliminó la anotación ID ${anotacionId} (${anotacionInfo?.tipo}): "${anotacionInfo?.descripcion?.substring(0, 60)}"`,
      usuario: currentUser,
      targetFuncionario: {
        nombre: anotacionInfo?.funcionarioNombre || 'Funcionario',
        rut: anotacionInfo?.funcionarioRut || anotacionInfo?.funcionarioId
      },
      categoria: 'desempeno'
    });

    return true;
  } catch (error) {
    console.error('Error al eliminar anotación:', error);
    throw error;
  }
};

/**
 * MÓDULO 1: Obtener evaluaciones de desempeño de un funcionario
 */
export const getEvaluacionesFuncionario = async (funcionarioId) => {
  try {
    if (!funcionarioId) return [];
    
    const q = query(
      collection(db, 'evaluaciones_desempeno'),
      where('funcionarioId', '==', funcionarioId)
    );

    const snapshot = await getDocs(q);
    const evaluaciones = [];

    snapshot.forEach((docSnap) => {
      evaluaciones.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    // Ordenar por fecha o periodo
    evaluaciones.sort((a, b) => {
      const fA = new Date(a.fechaEvaluacion || a.fechaCreacionISO || 0);
      const fB = new Date(b.fechaEvaluacion || b.fechaCreacionISO || 0);
      return fB - fA;
    });

    return evaluaciones;
  } catch (error) {
    console.error('Error al obtener evaluaciones:', error);
    return [];
  }
};

/**
 * MÓDULO 1 & 4: Guardar una nueva evaluación en evaluaciones_desempeno
 */
export const guardarEvaluacion = async (evaluacionData, currentUser) => {
  try {
    if (!evaluacionData.funcionarioId) {
      throw new Error('El Funcionario es obligatorio.');
    }

    const tipoInforme = evaluacionData.tipoInforme || 'Pre-calificación';
    const periodoStr = evaluacionData.periodoEvaluacion || 
      `${tipoInforme} (${evaluacionData.fechaInicioPeriodo || '01-04'} al ${evaluacionData.fechaFinPeriodo || '31-08'})`;

    const payload = {
      funcionarioId: evaluacionData.funcionarioId,
      funcionarioNombre: evaluacionData.funcionarioNombre || 'Funcionario',
      funcionarioRut: evaluacionData.funcionarioRut || evaluacionData.funcionarioId,
      funcionarioCargo: evaluacionData.funcionarioCargo || 'Funcionario',
      
      // Control de Proceso Oficial Ley 19.378
      tipoInforme: tipoInforme,
      fechaInicioPeriodo: evaluacionData.fechaInicioPeriodo || '',
      fechaFinPeriodo: evaluacionData.fechaFinPeriodo || '',
      fechaEmision: evaluacionData.fechaEmision || new Date().toISOString().split('T')[0],
      periodoEvaluacion: periodoStr,

      // Datos Administrativos
      establecimiento: evaluacionData.establecimiento || 'SAR Arpillerista Elsa Romo Aravena',
      programaUnidad: evaluacionData.programaUnidad || 'Servicio de Atención Primaria de Urgencia (SAR)',
      categoria: evaluacionData.categoria || 'E',
      nivel: parseInt(evaluacionData.nivel || 15, 10),

      // Control de Asistencia Oficial
      controlAsistencia: evaluacionData.controlAsistencia || {
        minutosAtraso: 0,
        diasInasistentes: 0
      },

      // Matriz de Factores Evaluados
      factores: evaluacionData.factores || {
        competencia: {},
        conducta: {}
      },
      resumenConceptos: evaluacionData.resumenConceptos || {
        muyBueno: 0,
        bueno: 0,
        regular: 0,
        malo: 0,
        totalEvaluados: 0
      },
      conceptoGlobal: evaluacionData.conceptoGlobal || 'BUENO',

      // Calificación compatible
      calificacion: evaluacionData.calificacion || (
        evaluacionData.conceptoGlobal === 'MUY BUENO' ? 6.8 :
        evaluacionData.conceptoGlobal === 'BUENO' ? 5.8 :
        evaluacionData.conceptoGlobal === 'REGULAR' ? 4.5 : 3.0
      ),
      escalaDescriptor: evaluacionData.conceptoGlobal || 'BUENO',

      planDeTrabajo: evaluacionData.planDeTrabajo || '',
      observaciones: evaluacionData.observaciones || '',
      compromisosFuncionario: evaluacionData.compromisosFuncionario || '',
      plazoRevisionMeses: evaluacionData.plazoRevisionMeses || 6,
      evaluadorId: currentUser?.rut || currentUser?.id || 'admin',
      evaluadorNombre: currentUser?.nombre || 'Jefatura NODO',
      evaluadorCargo: currentUser?.cargo || currentUser?.tipoPrestador || 'Jefatura Directa',
      resumenAnotacionesSnapshot: evaluacionData.resumenAnotacionesSnapshot || {
        felicitaciones: 0,
        retrasos: 0,
        ausencias: 0,
        faltasProtocolo: 0,
        total: 0
      },
      fechaEvaluacion: evaluacionData.fechaEmision || evaluacionData.fechaEvaluacion || new Date().toISOString().split('T')[0],
      timestamp: serverTimestamp(),
      fechaCreacionISO: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'evaluaciones_desempeno'), payload);

    await logAuditAction(db, {
      accion: 'EVALUACION_DESEMPENO_GENERADA',
      detalles: `${payload.tipoInforme} oficial registrada para período ${payload.periodoEvaluacion} (${payload.conceptoGlobal})`,
      usuario: currentUser,
      targetFuncionario: {
        nombre: payload.funcionarioNombre,
        rut: payload.funcionarioRut
      },
      categoria: 'desempeno'
    });

    return { id: docRef.id, ...payload };
  } catch (error) {
    console.error('Error al guardar evaluación:', error);
    throw error;
  }
};

/**
 * Calcular métricas e indicadores de desempeño a partir de las anotaciones
 */
export const calcularMetricasDesempeno = (anotaciones = []) => {
  let felicitaciones = 0;
  let retrasos = 0;
  let ausencias = 0;
  let faltasProtocolo = 0;
  let notasDesempeno = 0;

  anotaciones.forEach(a => {
    switch (a.tipo) {
      case 'felicitacion':
        felicitaciones++;
        break;
      case 'retraso':
        retrasos++;
        break;
      case 'ausencia':
        ausencias++;
        break;
      case 'falta_protocolo':
        faltasProtocolo++;
        break;
      case 'nota_desempeno':
      default:
        notasDesempeno++;
        break;
    }
  });

  const totalFaltasRetrasos = retrasos + ausencias + faltasProtocolo;
  const totalEventos = anotaciones.length;

  // Cálculo de índice de cumplimiento proporcional (base 100%)
  // Cada felicitación suma ponderación positiva, cada falta/retraso penaliza
  let indiceDesempeno = 100;
  if (totalEventos > 0) {
    const penalizacion = (retrasos * 5) + (ausencias * 20) + (faltasProtocolo * 15);
    const bonificacion = felicitaciones * 5;
    indiceDesempeno = Math.max(0, Math.min(100, 100 - penalizacion + bonificacion));
  }

  return {
    felicitaciones,
    retrasos,
    ausencias,
    faltasProtocolo,
    notasDesempeno,
    totalFaltasRetrasos,
    totalEventos,
    indiceDesempeno: Math.round(indiceDesempeno)
  };
};
