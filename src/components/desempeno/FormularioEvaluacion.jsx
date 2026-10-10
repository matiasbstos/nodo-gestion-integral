import React, { useState, useMemo } from 'react';
import { 
  X, 
  Award, 
  Clock, 
  UserX, 
  AlertTriangle, 
  FileCheck, 
  Printer, 
  Loader2,
  Calendar,
  Building2,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  ShieldCheck,
  Check,
  Layers,
  Sparkles,
  Eye
} from 'lucide-react';
import DocumentoOficialMelipilla from './DocumentoOficialMelipilla';
import { 
  guardarEvaluacion, 
  calcularMetricasDesempeno,
  CONCEPTOS_EVALUACION,
  FACTORES_EVALUACION_CONFIG
} from '../../services/hojaVidaService';

/**
 * FormularioEvaluacion (MÓDULO 4 - Ley 19.378 APS)
 * Formato oficial de Pre-calificación y Calificación basado en Factores y Conceptos:
 * [MUY BUENO, BUENO, REGULAR, MALO], con control de asistencia y comentarios específicos.
 */
const FormularioEvaluacion = ({
  isOpen,
  onClose,
  funcionario,
  anotaciones = [],
  currentUser,
  onEvaluacionGuardada,
  onAbrirImpresion
}) => {
  const anioActual = new Date().getFullYear();

  // ── REQUERIMIENTO 1: Lógica de Pre-calificación vs Calificación ──────────────
  const [tipoInforme, setTipoInforme] = useState('Pre-calificación');
  const [fechaInicio, setFechaInicio] = useState(`${anioActual}-04-01`);
  const [fechaFin, setFechaFin] = useState(`${anioActual}-08-31`);
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().split('T')[0]);

  // Datos Institucionales y de Dotación
  const [establecimiento, setEstablecimiento] = useState('SAR Arpillerista Elsa Romo Aravena');
  const [programaUnidad, setProgramaUnidad] = useState('Servicio de Atención Primaria de Urgencia (SAR)');
  const [categoria, setCategoria] = useState(funcionario?.categoria || 'E');
  const [nivel, setNivel] = useState(funcionario?.grado ? parseInt(funcionario.grado, 10) : 15);

  // Métricas automáticas del historial de anotaciones
  const metricas = useMemo(() => calcularMetricasDesempeno(anotaciones), [anotaciones]);

  // Control de Asistencia Oficial (editable por la jefatura)
  const [minutosAtraso, setMinutosAtraso] = useState(metricas.retrasos * 15 || 0);
  const [diasInasistentes, setDiasInasistentes] = useState(metricas.ausencias || 0);

  // ── REQUERIMIENTO 2: Matriz de Factores y Conceptos ───────────────────────────
  // Estructura de estado para cada factor: { concepto: 'MUY BUENO' | 'BUENO' | 'REGULAR' | 'MALO', comentario: '' }
  const [factoresCompetencia, setFactoresCompetencia] = useState({
    preparacion_conocimiento: { concepto: 'MUY BUENO', comentario: '' },
    acogida_usuario:          { concepto: 'MUY BUENO', comentario: '' },
    satisfaccion_usuaria:     { concepto: 'MUY BUENO', comentario: '' },
    cantidad_calidad_trabajo: { concepto: 'MUY BUENO', comentario: '' },
    interes_trabajo:          { concepto: 'MUY BUENO', comentario: '' },
    iniciativa_trabajo:       { concepto: 'MUY BUENO', comentario: '' },
    responsabilidad:          { concepto: 'MUY BUENO', comentario: '' },
    eficiencia:               { concepto: 'MUY BUENO', comentario: '' }
  });

  const [factoresConducta, setFactoresConducta] = useState({
    asistencia:               { concepto: 'MUY BUENO', comentario: '' },
    puntualidad:              { concepto: 'MUY BUENO', comentario: '' },
    cumplimiento_normas:      { concepto: 'MUY BUENO', comentario: '' },
    permanencia:              { concepto: 'MUY BUENO', comentario: '' },
    comportamiento:           { concepto: 'MUY BUENO', comentario: '' },
    presentacion_personal:    { concepto: 'MUY BUENO', comentario: '' }
  });

  // Control de comentarios colapsables
  const [expandedComments, setExpandedComments] = useState({});

  // ── Plan de Trabajo y Observaciones ──────────────────────────────────────────
  const [planDeTrabajo, setPlanDeTrabajo] = useState(
    '1. Asistencia y Puntualidad: Mantener 100% de cumplimiento en ingresos y permanencia en turnos de urgencia.\n2. Protocolos y Calidad: Rigurosa adherencia a normas de bioseguridad, guías clínicas SAR y registro clínico oportuno.\n3. Acogida al Usuario: Fomentar un trato empático, respetuoso y humanizado hacia usuarios y equipo de trabajo.'
  );
  const [observaciones, setObservaciones] = useState('');
  const [plazoRevisionMeses, setPlazoRevisionMeses] = useState(6);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !funcionario) return null;

  // Manejadores para actualizar selecciones de la matriz
  const handleConceptoChange = (seccion, itemId, nuevoConcepto) => {
    if (seccion === 'competencia') {
      setFactoresCompetencia(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], concepto: nuevoConcepto }
      }));
    } else {
      setFactoresConducta(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], concepto: nuevoConcepto }
      }));
    }
  };

  const handleComentarioChange = (seccion, itemId, nuevoComentario) => {
    if (seccion === 'competencia') {
      setFactoresCompetencia(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], comentario: nuevoComentario }
      }));
    } else {
      setFactoresConducta(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], comentario: nuevoComentario }
      }));
    }
  };

  const toggleComment = (key) => {
    setExpandedComments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Acciones rápidas para predeterminar selecciones
  const handleSetAllConceptos = (conceptoTarget) => {
    setFactoresCompetencia(prev => {
      const updated = {};
      Object.keys(prev).forEach(k => {
        updated[k] = { ...prev[k], concepto: conceptoTarget };
      });
      return updated;
    });
    setFactoresConducta(prev => {
      const updated = {};
      Object.keys(prev).forEach(k => {
        updated[k] = { ...prev[k], concepto: conceptoTarget };
      });
      return updated;
    });
  };

  // ── Cálculos de Resumen en Tiempo Real ────────────────────────────────────────
  const conteoConceptos = useMemo(() => {
    const todos = [
      ...Object.values(factoresCompetencia).map(i => i.concepto),
      ...Object.values(factoresConducta).map(i => i.concepto)
    ];

    const counts = {
      muyBueno: todos.filter(c => c === 'MUY BUENO').length,
      bueno: todos.filter(c => c === 'BUENO').length,
      regular: todos.filter(c => c === 'REGULAR').length,
      malo: todos.filter(c => c === 'MALO').length,
      total: todos.length
    };

    // Determinación del Concepto Global sugerido
    let global = 'BUENO';
    if (counts.malo >= 2) {
      global = 'MALO';
    } else if (counts.regular >= 4) {
      global = 'REGULAR';
    } else if (counts.muyBueno >= counts.bueno) {
      global = 'MUY BUENO';
    } else {
      global = 'BUENO';
    }

    return { counts, global };
  }, [factoresCompetencia, factoresConducta]);

  const [vistaPreviaPapel, setVistaPreviaPapel] = useState(false);

  // Objeto en memoria para la previsualización del documento estándar de Melipilla
  const evaluacionEnMemoria = useMemo(() => ({
    funcionarioId: funcionario?.id || funcionario?.rut,
    funcionarioNombre: funcionario?.nombre,
    funcionarioRut: funcionario?.rut,
    funcionarioCargo: funcionario?.cargo || funcionario?.tipoPrestador || 'Funcionario SAR',
    tipoInforme,
    fechaInicioPeriodo: fechaInicio,
    fechaFinPeriodo: fechaFin,
    fechaEmision,
    periodoEvaluacion: `${tipoInforme} (${fechaInicio} al ${fechaFin})`,
    establecimiento,
    programaUnidad,
    categoria,
    nivel: parseInt(nivel, 10),
    controlAsistencia: {
      minutosAtraso: parseInt(minutosAtraso, 10) || 0,
      diasInasistentes: parseInt(diasInasistentes, 10) || 0
    },
    factores: {
      competencia: factoresCompetencia,
      conducta: factoresConducta
    },
    resumenConceptos: {
      muyBueno: conteoConceptos.counts.muyBueno,
      bueno: conteoConceptos.counts.bueno,
      regular: conteoConceptos.counts.regular,
      malo: conteoConceptos.counts.malo,
      totalEvaluados: conteoConceptos.counts.total
    },
    conceptoGlobal: conteoConceptos.global,
    planDeTrabajo,
    observaciones,
    evaluadorNombre: currentUser?.nombre,
    evaluadorCargo: currentUser?.cargo || currentUser?.tipoPrestador
  }), [
    funcionario,
    tipoInforme,
    fechaInicio,
    fechaFin,
    fechaEmision,
    establecimiento,
    programaUnidad,
    categoria,
    nivel,
    minutosAtraso,
    diasInasistentes,
    factoresCompetencia,
    factoresConducta,
    conteoConceptos,
    planDeTrabajo,
    observaciones,
    currentUser
  ]);

  // ── Guardado Oficial e Impresión ─────────────────────────────────────────────
  const handleSubmit = async (abrirPdf = false) => {
    setError('');

    const fInicio = fechaInicio || `${new Date().getFullYear()}-04-01`;
    const fFin = fechaFin || `${new Date().getFullYear()}-08-31`;
    const fEmision = fechaEmision || new Date().toISOString().split('T')[0];

    // Validaciones estrictas solo si NO es modo impresión (ej. al "Finalizar y Registrar")
    if (!abrirPdf) {
      if (!fechaInicio || !fechaFin) {
        setError('Debe especificar la fecha de inicio y fecha de término del período a evaluar.');
        return;
      }

      if (new Date(fechaFin) < new Date(fechaInicio)) {
        setError('La fecha de fin no puede ser anterior a la fecha de inicio del período.');
        return;
      }

      if (!planDeTrabajo.trim()) {
        setError('Debe definir al menos un objetivo o compromiso en el Plan de Trabajo y Mejora Continua.');
        return;
      }
    }

    setLoading(true);
    try {
      const periodoFormateado = `${tipoInforme} (${fInicio} al ${fFin})`;

      const payload = {
        funcionarioId: funcionario?.id || funcionario?.rut || 'funcionario',
        funcionarioNombre: funcionario?.nombre || 'Funcionario Sin Nombre',
        funcionarioRut: funcionario?.rut || funcionario?.id || '',
        funcionarioCargo: funcionario?.cargo || funcionario?.tipoPrestador || 'Funcionario SAR',
        
        // Parámetros oficiales requeridos
        tipoInforme,
        fechaInicioPeriodo: fInicio,
        fechaFinPeriodo: fFin,
        fechaEmision: fEmision,
        periodoEvaluacion: periodoFormateado,

        // Datos administrativos de Melipilla APS
        establecimiento,
        programaUnidad,
        categoria: categoria || funcionario?.categoria || 'E',
        nivel: parseInt(nivel, 10) || 15,

        // Control de asistencia
        controlAsistencia: {
          minutosAtraso: parseInt(minutosAtraso, 10) || 0,
          diasInasistentes: parseInt(diasInasistentes, 10) || 0
        },

        // Matriz de Factores
        factores: {
          competencia: factoresCompetencia,
          conducta: factoresConducta
        },
        resumenConceptos: {
          muyBueno: conteoConceptos.counts.muyBueno,
          bueno: conteoConceptos.counts.bueno,
          regular: conteoConceptos.counts.regular,
          malo: conteoConceptos.counts.malo,
          totalEvaluados: conteoConceptos.counts.total
        },
        conceptoGlobal: conteoConceptos.global,

        // Equivalencia numérica compatible
        calificacion: conteoConceptos.global === 'MUY BUENO' ? 6.8 :
                      conteoConceptos.global === 'BUENO' ? 5.8 :
                      conteoConceptos.global === 'REGULAR' ? 4.5 : 3.0,
        escalaDescriptor: conteoConceptos.global,

        planDeTrabajo: planDeTrabajo.trim() || 'Plan de trabajo formativo y seguimiento continuo de competencias Ley 19.378.',
        observaciones: observaciones.trim(),
        plazoRevisionMeses: parseInt(plazoRevisionMeses, 10) || 6,

        resumenAnotacionesSnapshot: {
          felicitaciones: metricas.felicitaciones || 0,
          retrasos: metricas.retrasos || 0,
          ausencias: metricas.ausencias || 0,
          faltasProtocolo: metricas.faltasProtocolo || 0,
          total: metricas.totalEventos || 0
        }
      };

      let guardada = null;
      try {
        guardada = await guardarEvaluacion(payload, currentUser);
        if (onEvaluacionGuardada) {
          onEvaluacionGuardada(guardada);
        }
      } catch (saveErr) {
        console.warn('Aviso: No se pudo sincronizar en Firestore pero se permite continuar:', saveErr);
        // Si NO es impresión, reportar el error en la interfaz
        if (!abrirPdf) {
          throw saveErr;
        }
      }

      // Si se solicitó imprimir, siempre abrir la vista de impresión con los datos disponibles
      if (abrirPdf && onAbrirImpresion) {
        onAbrirImpresion(guardada || payload);
      } else if (!abrirPdf) {
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al guardar la evaluación de desempeño.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in my-auto">
        
        {/* ── Encabezado Institucional NODO / APS ──────────────────────────── */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-blue-400 border border-slate-700 flex items-center justify-center shrink-0">
              <FileCheck size={24} strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">
                  Ley 19.378 APS • Cormumel
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                  {tipoInforme}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-1">
                Formulario de Evaluación de Desempeño
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {funcionario.nombre} • RUT: <span className="font-mono">{funcionario.rut}</span> • Estamento Cat {categoria}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setVistaPreviaPapel(!vistaPreviaPapel)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                vistaPreviaPapel
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
              }`}
              title="Previsualizar formato físico oficial de 3 páginas de la Corporación Municipal de Melipilla"
            >
              <Eye size={15} strokeWidth={1.5} />
              <span>{vistaPreviaPapel ? 'Volver al Formulario' : 'Vista Previa Hoja Oficial'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar formulario"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Cuerpo del Formulario ────────────────────────────────────────── */}
        <div className="p-6 md:p-8 space-y-8 max-h-[80vh] overflow-y-auto">
          
          {vistaPreviaPapel ? (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-blue-900 block text-sm">
                    Estándar Oficial Ley 19.378 • Cormumel (3 Páginas)
                  </span>
                  <span className="text-blue-700">
                    Recreación fiel del formulario oficial en papel basada en sus selecciones actuales.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVistaPreviaPapel(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-white text-blue-900 border border-blue-200 font-bold hover:bg-blue-50 transition-colors"
                  >
                    Seguir Editando
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onAbrirImpresion) {
                        onAbrirImpresion(evaluacionEnMemoria);
                      } else {
                        handleSubmit(true);
                      }
                    }}
                    disabled={loading}
                    className="btn-primary px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs shadow-xs"
                    title="Abre la vista completa de impresión oficial A4/PDF"
                  >
                    <Printer size={14} strokeWidth={1.5} />
                    <span>Imprimir Documento</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-100 p-2 sm:p-6 rounded-2xl border border-slate-200 shadow-inner">
                <DocumentoOficialMelipilla
                  evaluacion={evaluacionEnMemoria}
                  funcionario={funcionario}
                  evaluador={currentUser}
                />
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="text-rose-600 shrink-0" strokeWidth={2} />
                  <span>{error}</span>
                </div>
              )}

          {/* ══════════════ REQUERIMIENTO 1: LÓGICA DE CONTROL DEL PROCESO ══════════════ */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-primary" strokeWidth={1.5} />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  1. Parámetros del Proceso Evaluativo
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Selección de informe y ciclo reglamentario
              </span>
            </div>

            {/* Fila 1: Tipo de Informe, Período y Fecha Emisión */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Select Tipo de Informe */}
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Tipo de Informe *
                </label>
                <select
                  value={tipoInforme}
                  onChange={(e) => setTipoInforme(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
                >
                  <option value="Pre-calificación">Pre-calificación</option>
                  <option value="Calificación Final">Calificación Final</option>
                </select>
              </div>

              {/* Fecha Inicio */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Período Desde *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                  />
                </div>
              </div>

              {/* Fecha Fin */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Período Hasta *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                  />
                </div>
              </div>

              {/* Fecha Emisión */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Fecha de Emisión *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={fechaEmision}
                    onChange={(e) => setFechaEmision(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                  />
                </div>
              </div>

            </div>

            {/* Fila 2: Identificación del Funcionario y Establecimiento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Establecimiento
                </label>
                <input
                  type="text"
                  value={establecimiento}
                  onChange={(e) => setEstablecimiento(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Programa o Unidad
                </label>
                <input
                  type="text"
                  value={programaUnidad}
                  onChange={(e) => setProgramaUnidad(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Categoría Funcionaria
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
                >
                  <option value="A">Cat A — Médicos / Odontólogos</option>
                  <option value="B">Cat B — Profesionales de Salud</option>
                  <option value="C">Cat C — Técnicos Nivel Superior (TENS)</option>
                  <option value="D">Cat D — Técnicos de Salud</option>
                  <option value="E">Cat E — Administrativos</option>
                  <option value="F">Cat F — Auxiliares y Choferes</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Nivel (Escalafón 1 - 15)
                </label>
                <select
                  value={nivel}
                  onChange={(e) => setNivel(parseInt(e.target.value, 10))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer shadow-xs"
                >
                  {Array.from({ length: 15 }, (_, i) => 15 - i).map(n => (
                    <option key={n} value={n}>Nivel {n}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Fila 3: Control Oficial de Asistencia */}
            <div className="pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" strokeWidth={1.5} />
                  Control de Asistencia del Período
                </span>
                <span className="text-[10px] text-slate-400">
                  Basado en marcajes y novedades oficiales
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Puntualidad / Minutos de atraso */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Puntualidad
                    </label>
                    <span className="text-xs font-bold text-slate-700">Total minutos de atraso:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={minutosAtraso}
                      onChange={(e) => setMinutosAtraso(e.target.value)}
                      className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-black text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs font-bold text-slate-500">min</span>
                  </div>
                </div>

                {/* Asistencia / Días inasistentes */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                      Asistencia
                    </label>
                    <span className="text-xs font-bold text-slate-700">Número de días inasistentes:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={diasInasistentes}
                      onChange={(e) => setDiasInasistentes(e.target.value)}
                      className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-mono font-black text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <span className="text-xs font-bold text-slate-500">días</span>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ══════════════ REQUERIMIENTO 2: MATRIZ DE FACTORES Y CONCEPTOS ══════════════ */}
          <div className="space-y-6">
            
            {/* Cabecera de la Matriz & Contadores Semánticos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Award size={18} className="text-primary" strokeWidth={1.5} />
                  Matriz Oficial de Calificación por Factores
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evalúe cada factor asignando el concepto legal correspondiente.
                </p>
              </div>

              {/* Botones de selección rápida y contadores */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 mr-1 hidden lg:inline">
                  Asignar todos:
                </span>
                <button
                  type="button"
                  onClick={() => handleSetAllConceptos('MUY BUENO')}
                  className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold transition-colors"
                  title="Asigna 'MUY BUENO' a todos los ítems para agilizar la edición"
                >
                  Todos Muy Bueno
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllConceptos('BUENO')}
                  className="px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-[11px] font-bold transition-colors"
                  title="Asigna 'BUENO' a todos los ítems para agilizar la edición"
                >
                  Todos Bueno
                </button>
              </div>
            </div>

            {/* Barra Resumen de Conceptos en Tiempo Real */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-700 uppercase block">Muy Bueno</span>
                <span className="text-xl font-black text-emerald-900">{conteoConceptos.counts.muyBueno}</span>
              </div>
              <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-2xl">
                <span className="text-[10px] font-bold text-sky-700 uppercase block">Bueno</span>
                <span className="text-xl font-black text-sky-900">{conteoConceptos.counts.bueno}</span>
              </div>
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-2xl">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Regular</span>
                <span className="text-xl font-black text-amber-900">{conteoConceptos.counts.regular}</span>
              </div>
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-2xl">
                <span className="text-[10px] font-bold text-rose-700 uppercase block">Malo</span>
                <span className="text-xl font-black text-rose-900">{conteoConceptos.counts.malo}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3 bg-slate-900 text-white rounded-2xl flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Resultado Global</span>
                <span className="text-xs font-black text-white tracking-wide uppercase mt-0.5">
                  {conteoConceptos.global}
                </span>
              </div>
            </div>

            {/* ── SECCIÓN 1: FACTOR COMPETENCIA (8 ÍTEMS) ────────────────── */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {FACTORES_EVALUACION_CONFIG.competencia.titulo}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Aptitud técnica, calidad asistencial, trato usuaria y orientación al logro
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                  8 Ítems
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {FACTORES_EVALUACION_CONFIG.competencia.items.map((item) => {
                  const stateItem = factoresCompetencia[item.id] || { concepto: 'MUY BUENO', comentario: '' };
                  const isCommentExpanded = expandedComments[`comp_${item.id}`] || !!stateItem.comentario;

                  return (
                    <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        
                        {/* Nombre del ítem */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                              {item.letra})
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {item.label}
                            </span>
                          </div>
                        </div>

                        {/* Botones Segmentados (Radio Group) de Conceptos */}
                        <div className="flex items-center gap-1.5 self-start lg:self-center shrink-0">
                          {Object.keys(CONCEPTOS_EVALUACION).map((cKey) => {
                            const isSelected = stateItem.concepto === cKey;
                            const cfg = CONCEPTOS_EVALUACION[cKey];

                            return (
                              <button
                                key={cKey}
                                type="button"
                                onClick={() => handleConceptoChange('competencia', item.id, cKey)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                                  isSelected
                                    ? cfg.btnActive
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {cKey}
                              </button>
                            );
                          })}

                          {/* Toggle comentario */}
                          <button
                            type="button"
                            onClick={() => toggleComment(`comp_${item.id}`)}
                            className={`p-1.5 rounded-xl border transition-colors ml-1 ${
                              stateItem.comentario
                                ? 'bg-blue-50 text-primary border-blue-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700'
                            }`}
                            title="Agregar comentario u observación"
                          >
                            <MessageSquare size={14} strokeWidth={1.5} />
                          </button>
                        </div>

                      </div>

                      {/* Textarea de Comentario Colapsable */}
                      {isCommentExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 animate-fade-in">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Comentario Oficial ({item.label}):
                          </label>
                          <textarea
                            rows={2}
                            value={stateItem.comentario}
                            onChange={(e) => handleComentarioChange('competencia', item.id, e.target.value)}
                            placeholder="Comentario u observación justificativa para el informe impreso..."
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder-slate-400 font-normal"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── SECCIÓN 2: FACTOR CONDUCTA FUNCIONARIA (6 ÍTEMS) ───────── */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {FACTORES_EVALUACION_CONFIG.conducta.titulo}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Cumplimiento normativo, asistencia, permanencia y probidad funcionaria
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                  6 Ítems
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {FACTORES_EVALUACION_CONFIG.conducta.items.map((item) => {
                  const stateItem = factoresConducta[item.id] || { concepto: 'MUY BUENO', comentario: '' };
                  const isCommentExpanded = expandedComments[`cond_${item.id}`] || !!stateItem.comentario;

                  return (
                    <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        
                        {/* Nombre del ítem */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                              {item.letra})
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {item.label}
                            </span>
                          </div>
                        </div>

                        {/* Botones Segmentados (Radio Group) de Conceptos */}
                        <div className="flex items-center gap-1.5 self-start lg:self-center shrink-0">
                          {Object.keys(CONCEPTOS_EVALUACION).map((cKey) => {
                            const isSelected = stateItem.concepto === cKey;
                            const cfg = CONCEPTOS_EVALUACION[cKey];

                            return (
                              <button
                                key={cKey}
                                type="button"
                                onClick={() => handleConceptoChange('conducta', item.id, cKey)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                                  isSelected
                                    ? cfg.btnActive
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {cKey}
                              </button>
                            );
                          })}

                          {/* Toggle comentario */}
                          <button
                            type="button"
                            onClick={() => toggleComment(`cond_${item.id}`)}
                            className={`p-1.5 rounded-xl border transition-colors ml-1 ${
                              stateItem.comentario
                                ? 'bg-blue-50 text-primary border-blue-200'
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-700'
                            }`}
                            title="Agregar comentario u observación"
                          >
                            <MessageSquare size={14} strokeWidth={1.5} />
                          </button>
                        </div>

                      </div>

                      {/* Textarea de Comentario Colapsable */}
                      {isCommentExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-100 animate-fade-in">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                            Comentario Oficial ({item.label}):
                          </label>
                          <textarea
                            rows={2}
                            value={stateItem.comentario}
                            onChange={(e) => handleComentarioChange('conducta', item.id, e.target.value)}
                            placeholder="Comentario u observación justificativa para el informe impreso..."
                            className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder-slate-400 font-normal"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ══════════════ PLAN DE TRABAJO Y COMPROMISOS ══════════════ */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-primary" strokeWidth={1.5} />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Plan de Trabajo, Compromisos y Mejora Continua
                </h3>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Acuerdos formales suscritos
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                Objetivos y Metas Acordadas con el Funcionario *
              </label>
              <textarea
                rows={4}
                value={planDeTrabajo}
                onChange={(e) => setPlanDeTrabajo(e.target.value)}
                placeholder="Indique los compromisos y metas formativas que el funcionario cumplirá durante el período..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed font-normal shadow-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Observaciones Generales de la Jefatura
                </label>
                <textarea
                  rows={2}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Síntesis adicional de la Dirección Técnica o Enfermero Jefe..."
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                  Plazo para Próxima Revisión de Avances
                </label>
                <select
                  value={plazoRevisionMeses}
                  onChange={(e) => setPlazoRevisionMeses(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs cursor-pointer"
                >
                  <option value={3}>3 Meses (Seguimiento Cercano / Plan de Apoyo)</option>
                  <option value={6}>6 Meses (Período Ordinario Pre-calificación)</option>
                  <option value={12}>12 Meses (Evaluación Anual / Calificación Final)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Establece el horizonte de seguimiento antes de la sesión de la Junta Calificadora.
                </p>
              </div>
            </div>
          </div>

          {/* ══════════════ CONSTANCIA DE FIRMAS OFICIALES ══════════════ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white border border-slate-200 rounded-3xl text-xs">
            <div className="border border-dashed border-slate-200 rounded-2xl p-4 space-y-1">
              <p className="font-black text-slate-400 uppercase tracking-wider text-[10px]">Jefe Directo Evaluador</p>
              <p className="font-bold text-slate-800 text-sm">{currentUser?.nombre || 'Jefatura Evaluadora'}</p>
              <p className="text-[11px] text-slate-500">{currentUser?.cargo || currentUser?.tipoPrestador || 'Dirección Técnica / Jefatura SAR'}</p>
              <div className="pt-4 text-[10px] text-slate-400 font-mono">Firma y Timbre Digital registrado</div>
            </div>

            <div className="border border-dashed border-slate-200 rounded-2xl p-4 space-y-1">
              <p className="font-black text-slate-400 uppercase tracking-wider text-[10px]">Funcionario Notificado</p>
              <p className="font-bold text-slate-800 text-sm">{funcionario.nombre}</p>
              <p className="text-[11px] text-slate-500">RUT: <span className="font-mono">{funcionario.rut}</span> • Cat {categoria}</p>
              <div className="pt-4 text-[10px] text-slate-400 font-mono">Notificación formal conforme Ley 19.378</div>
            </div>
          </div>

          {/* ══════════════ BOTONES DE ACCIÓN ══════════════ */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="btn-secondary px-4 py-2.5 rounded-2xl font-bold text-xs text-slate-700 flex items-center gap-2 shadow-xs hover:border-slate-300 transition-all"
                title="Guarda la evaluación oficial y genera la vista previa para impresión A4/PDF"
              >
                <Printer size={15} strokeWidth={1.5} />
                <span>Guardar e Imprimir Documento Oficial</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="btn-primary px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md shadow-primary/20 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Guardando Evaluación...</span>
                  </>
                ) : (
                  <>
                    <FileCheck size={16} strokeWidth={2} />
                    <span>Finalizar y Registrar {tipoInforme}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}

        </div>
      </div>
    </div>
  );
};

export default FormularioEvaluacion;
