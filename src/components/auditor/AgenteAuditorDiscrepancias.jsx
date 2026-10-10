import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Filter, 
  Calendar, 
  RefreshCw, 
  FileCheck, 
  ArrowRight, 
  Info, 
  X, 
  SlidersHorizontal, 
  CheckCheck, 
  Layers, 
  User, 
  FileText,
  Sparkles,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
import EmptyState from '../common/EmptyState';
import { 
  REGLAS_CONFIG, 
  TIPOS_DISCREPANCIA, 
  auditarLoteTurnos, 
  resolverDiscrepanciaConJustificacion, 
  autoConciliarTurno 
} from '../../services/reglasFuncionamientoService';

/**
 * AgenteAuditorDiscrepancias (Enterprise SaaS / Taxonomy Standard)
 * Motor de Auditoría y Conciliación Inteligente de Asistencia vs Pauta de Turnos
 * Diseñado con tipografía Inter, bordes sutiles (border-slate-200), trazo fino (strokeWidth=1.5) y cero emojis.
 */
const AgenteAuditorDiscrepancias = ({ userData }) => {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastAuditDate, setLastAuditDate] = useState(new Date());

  // Filtros de búsqueda
  const [selectedFuncionario, setSelectedFuncionario] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroSeveridad, setFiltroSeveridad] = useState('discrepancias'); // 'todos', 'discrepancias', 'critica', 'advertencia', 'conciliados'
  const [filtroMes, setFiltroMes] = useState('actual'); // 'actual', 'anterior', 'todos'

  // Modal de Resolución
  const [resolviendoTurno, setResolviendoTurno] = useState(null);
  const [motivoResolucion, setMotivoResolucion] = useState('Marcaje regularizado por Jefatura');
  const [horasAprobadas, setHorasAprobadas] = useState('');
  const [observacionAuditor, setObservacionAuditor] = useState('');
  const [resolviendoLoading, setResolviendoLoading] = useState(false);

  // 1. Cargar turnos desde Firestore
  const cargarTurnos = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'turnos'));
      const list = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          ...data
        });
      });
      setTurnos(list);
      setLastAuditDate(new Date());
    } catch (err) {
      console.error('Error al cargar turnos para auditoría:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarTurnos();
  }, []);

  // Filtrado temporal
  const turnosFiltradosPorFecha = useMemo(() => {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = ahora.getMonth();

    return turnos.filter(t => {
      const fecha = t.fechaInicio?.toDate?.() || (t.fechaInicio ? new Date(t.fechaInicio) : null);
      if (!fecha) return true;

      if (filtroMes === 'actual') {
        return fecha.getFullYear() === anio && fecha.getMonth() === mes;
      }
      if (filtroMes === 'anterior') {
        const mesAnterior = mes === 0 ? 11 : mes - 1;
        const anioAnterior = mes === 0 ? anio - 1 : anio;
        return fecha.getFullYear() === anioAnterior && fecha.getMonth() === mesAnterior;
      }
      return true; // 'todos'
    });
  }, [turnos, filtroMes]);

  // 2. Ejecutar Auditoría mediante el Motor de Reglas
  const reporteAuditoria = useMemo(() => {
    return auditarLoteTurnos(turnosFiltradosPorFecha);
  }, [turnosFiltradosPorFecha]);

  // Lista única de funcionarios presentes en los turnos
  const listaFuncionarios = useMemo(() => {
    const map = new Map();
    turnos.forEach(t => {
      if (t.rutFuncionario) {
        map.set(t.rutFuncionario, t.nombreFuncionario || t.rutFuncionario);
      }
    });
    return Array.from(map.entries()).map(([rut, nombre]) => ({ rut, nombre }));
  }, [turnos]);

  // Filtrado de la tabla de resultados
  const resultadosFiltrados = useMemo(() => {
    return reporteAuditoria.resultados.filter(item => {
      const turno = item.turnoData;

      // Filtro por funcionario
      if (selectedFuncionario !== 'todos' && turno.rutFuncionario !== selectedFuncionario) {
        return false;
      }

      // Buscador
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const coincideNombre = (turno.nombreFuncionario || '').toLowerCase().includes(q);
        const coincideRut = (turno.rutFuncionario || '').toLowerCase().includes(q);
        const coincideCentro = (turno.centroAsignacion || turno.centroSalud || '').toLowerCase().includes(q);
        if (!coincideNombre && !coincideRut && !coincideCentro) return false;
      }

      // Filtro por severidad/estado
      if (filtroSeveridad === 'discrepancias') {
        return item.tieneDiscrepancia;
      }
      if (filtroSeveridad === 'critica') {
        return item.severidadMaxima === 'critica';
      }
      if (filtroSeveridad === 'advertencia') {
        return item.severidadMaxima === 'advertencia';
      }
      if (filtroSeveridad === 'conciliados') {
        return !item.tieneDiscrepancia;
      }

      return true; // 'todos'
    });
  }, [reporteAuditoria.resultados, selectedFuncionario, searchQuery, filtroSeveridad]);

  // Forzar re-escaneo visual
  const handleEjecutarEscaneo = () => {
    setScanning(true);
    setTimeout(() => {
      cargarTurnos();
      setScanning(false);
    }, 600);
  };

  // Manejador de resolución
  const handleConfirmarResolucion = async () => {
    if (!resolviendoTurno) return;
    setResolviendoLoading(true);
    try {
      await resolverDiscrepanciaConJustificacion(
        resolviendoTurno.turnoId,
        {
          motivo: motivoResolucion,
          horasAprobadas: horasAprobadas || resolviendoTurno.horasProgramadas,
          observacion: observacionAuditor
        },
        userData
      );

      // Actualizar estado local
      setTurnos(prev => prev.map(t => {
        if (t.id === resolviendoTurno.turnoId) {
          return {
            ...t,
            estado: 'completado_manual',
            discrepanciaResuelta: true,
            motivoJustificacionRRHH: motivoResolucion
          };
        }
        return t;
      }));

      setResolviendoTurno(null);
    } catch (err) {
      alert('Error al aplicar resolución: ' + err.message);
    } finally {
      setResolviendoLoading(false);
    }
  };

  const handleAutoConciliarDirecto = async (item) => {
    if (!window.confirm(`¿Deseas auto-conciliar el turno de ${item.turnoData.nombreFuncionario} ajustándolo a las ${item.horasProgramadas} horas de pauta?`)) {
      return;
    }
    try {
      await autoConciliarTurno(item.turnoId, userData);
      setTurnos(prev => prev.map(t => {
        if (t.id === item.turnoId) {
          return {
            ...t,
            estado: 'completado',
            discrepanciaResuelta: true,
            autoConciliadoPorAgente: true
          };
        }
        return t;
      }));
    } catch (err) {
      alert('Error al auto-conciliar: ' + err.message);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      
      {/* 1. ENCABEZADO INSTITUCIONAL DEL AGENTE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-2">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Bot size={20} strokeWidth={1.5} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              Motor de Reglas y Conciliación Automática
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Agente Auditor de Pauta y Asistencia
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Supervisión algorítmica continua: cruza la pauta de turnos con los marcajes reales de entrada y salida, identifica desviaciones respecto a las reglas de tolerancia del SAR y previene inconsistencias en la liquidación de honorarios.
          </p>
        </div>

        {/* Acciones del Agente */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right text-[11px] text-slate-400">
            <span>Último escaneo:</span>
            <span className="font-mono text-slate-600 font-medium">
              {lastAuditDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <button
            onClick={handleEjecutarEscaneo}
            disabled={scanning || loading}
            className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-xs"
          >
            <RefreshCw size={15} strokeWidth={1.5} className={scanning ? 'animate-spin' : ''} />
            <span>{scanning ? 'Auditando...' : 'Re-escanear Pauta'}</span>
          </button>
        </div>
      </div>

      {/* 2. REGLAS DE ORO EN VIGOR (Banner Informativo) */}
      <div className="rounded-2xl bg-slate-900 text-white p-4 md:p-5 border border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-blue-400 border border-slate-700 shrink-0 mt-0.5">
            <ShieldCheck size={20} strokeWidth={1.5} />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-white">
              Reglas de Funcionamiento Activas (Protocolo SAR / NODO)
            </h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Tolerancia de ingreso: <strong>+{REGLAS_CONFIG.TOLERANCIA_ENTRADA_TARDIA_MIN} min</strong> • Tolerancia de salida: <strong>-{REGLAS_CONFIG.TOLERANCIA_SALIDA_ANTICIPADA_MIN} min</strong> • Cierre por abandono: <strong>+{REGLAS_CONFIG.MARGEN_TURNO_ABANDONADO_HORAS}h</strong> • Validación estricta de incidencias.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Motor Activo
          </span>
        </div>
      </div>

      {/* 3. TARJETAS KPI DE AUDITORÍA (Estándar Taxonomy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Turnos */}
        <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Turnos Auditados
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
              <Layers size={18} strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
              {reporteAuditoria.totalTurnos}
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {reporteAuditoria.tasaCumplimiento}% en conformidad
            </p>
          </div>
        </div>

        {/* Discrepancias Críticas */}
        <div 
          onClick={() => setFiltroSeveridad('critica')}
          className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs hover:border-rose-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Discrepancias Críticas
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <ShieldAlert size={18} strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-rose-600 tracking-tight leading-none">
              {reporteAuditoria.totalCriticas}
            </h3>
            <p className="text-xs text-rose-600/80 mt-1 font-medium">
              Ausencias y turnos sin salida
            </p>
          </div>
        </div>

        {/* Retrasos y Desfases */}
        <div 
          onClick={() => setFiltroSeveridad('advertencia')}
          className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs hover:border-amber-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Retrasos y Desfases
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock size={18} strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-600 tracking-tight leading-none">
              {reporteAuditoria.totalAdvertencias + reporteAuditoria.totalLeves}
            </h3>
            <p className="text-xs text-amber-600/80 mt-1 font-medium">
              Fuera de margen de tolerancia
            </p>
          </div>
        </div>

        {/* Turnos Conciliados */}
        <div 
          onClick={() => setFiltroSeveridad('conciliados')}
          className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Listos p/ Liquidación
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={18} strokeWidth={1.5} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-600 tracking-tight leading-none">
              {reporteAuditoria.totalConciliados}
            </h3>
            <p className="text-xs text-emerald-600/80 mt-1 font-medium">
              Marcajes validados y conformes
            </p>
          </div>
        </div>
      </div>

      {/* 4. BARRA DE FILTROS AVANZADA */}
      <div className="rounded-2xl bg-white p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Pestañas de Severidad */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setFiltroSeveridad('discrepancias')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filtroSeveridad === 'discrepancias'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Solo con Discrepancias ({reporteAuditoria.totalDiscrepancias})
          </button>

          <button
            onClick={() => setFiltroSeveridad('critica')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filtroSeveridad === 'critica'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Críticas ({reporteAuditoria.totalCriticas})
          </button>

          <button
            onClick={() => setFiltroSeveridad('conciliados')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filtroSeveridad === 'conciliados'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Conformes ({reporteAuditoria.totalConciliados})
          </button>

          <button
            onClick={() => setFiltroSeveridad('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filtroSeveridad === 'todos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todos ({reporteAuditoria.totalTurnos})
          </button>
        </div>

        {/* Buscador y Selectores */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Período */}
          <select
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="actual">Mes en Curso</option>
            <option value="anterior">Mes Anterior</option>
            <option value="todos">Todos los Meses</option>
          </select>

          {/* Selector de Funcionario */}
          <select
            value={selectedFuncionario}
            onChange={e => setSelectedFuncionario(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none max-w-[180px]"
          >
            <option value="todos">Todos los Funcionarios</option>
            {listaFuncionarios.map(f => (
              <option key={f.rut} value={f.rut}>{f.nombre}</option>
            ))}
          </select>

          {/* Campo de búsqueda libre */}
          <div className="relative">
            <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none w-36 sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* 5. TABLA EJECUTIVA DE AUDITORÍA */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Auditando registros de pauta con motor de reglas...
            </p>
          </div>
        ) : resultadosFiltrados.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CheckCircle2}
              title="Cero Discrepancias Detectadas"
              description="Todos los turnos analizados cumplen con las ventanas de tolerancia y los marcajes oficiales de pauta."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Funcionario</th>
                  <th className="py-3 px-4">Horario Programado</th>
                  <th className="py-3 px-4">Marcaje Real (GPS)</th>
                  <th className="py-3 px-4">Diagnóstico del Agente</th>
                  <th className="py-3 px-4 text-center">Horas</th>
                  <th className="py-3 px-4 text-right">Acción Correctiva</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resultadosFiltrados.map((item) => {
                  const t = item.turnoData;
                  const tieneDisc = item.tieneDiscrepancia;

                  return (
                    <tr key={item.turnoId} className="hover:bg-slate-50/60 transition-colors">
                      {/* Funcionario */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 tracking-tight">
                          {t.nombreFuncionario || 'Sin Nombre'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {t.rutFuncionario || 'Sin RUT'} • {t.centroAsignacion || t.centroSalud || 'SAR'}
                        </div>
                      </td>

                      {/* Horario Programado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">
                          {item.inicioProgramado ? item.inicioProgramado.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) : '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {item.inicioProgramado ? item.inicioProgramado.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          {' → '}
                          {item.finProgramado ? item.finProgramado.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </div>
                      </td>

                      {/* Marcaje Real */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.entradaReal ? (
                          <div className="space-y-0.5 font-mono text-[11px]">
                            <div className="text-emerald-700">
                              Ent: {item.entradaReal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className={item.salidaReal ? "text-slate-600" : "text-rose-600 font-semibold"}>
                              Sal: {item.salidaReal ? item.salidaReal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No registrada'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sin marcaje físico
                          </span>
                        )}
                      </td>

                      {/* Diagnóstico del Agente */}
                      <td className="py-3.5 px-4">
                        {tieneDisc ? (
                          <div className="space-y-1 max-w-sm">
                            {item.discrepancias.map((d, dIdx) => (
                              <div key={dIdx} className="space-y-0.5">
                                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${d.badgeClass}`}>
                                  {d.shortLabel}
                                </span>
                                <p className="text-[11px] text-slate-600 leading-tight">
                                  {d.detalles}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 size={13} strokeWidth={1.5} />
                            <span>Pauta y Marcaje Conciliados</span>
                          </span>
                        )}
                      </td>

                      {/* Horas */}
                      <td className="py-3.5 px-4 text-center font-mono whitespace-nowrap">
                        <div className="font-bold text-slate-800">
                          {item.horasProgramadas}h pactadas
                        </div>
                        {item.horasRealesEfectivas > 0 && (
                          <div className="text-[11px] text-slate-500">
                            {item.horasRealesEfectivas}h reales
                          </div>
                        )}
                      </td>

                      {/* Acción Correctiva */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {tieneDisc ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAutoConciliarDirecto(item)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                              title="Auto-conciliar según horario pactado"
                            >
                              Auto-conciliar
                            </button>
                            <button
                              onClick={() => {
                                setResolviendoTurno(item);
                                setHorasAprobadas(item.horasProgramadas);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-lg transition-colors"
                            >
                              Resolver
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Aprobado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. MODAL DE RESOLUCIÓN DE DISCREPANCIA */}
      {resolviendoTurno && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div 
            onClick={() => setResolviendoTurno(null)} 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-fade-in" 
          />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-scale-in">
            {/* Header del Modal */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-blue-400 border border-slate-700 flex items-center justify-center">
                  <Bot size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    Resolver Discrepancia de Pauta
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {resolviendoTurno.turnoData.nombreFuncionario}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setResolviendoTurno(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              {/* Diagnóstico */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Discrepancia Identificada:
                </span>
                <p className="text-slate-800 font-semibold">
                  {resolviendoTurno.discrepancias.map(d => d.label).join(' • ')}
                </p>
                <p className="text-[11px] text-slate-500">
                  Horario de Pauta: {resolviendoTurno.inicioProgramado?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} a {resolviendoTurno.finProgramado?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({resolviendoTurno.horasProgramadas} horas)
                </p>
              </div>

              {/* Motivo de Justificación */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Causa / Justificación de Jefatura
                </label>
                <select
                  value={motivoResolucion}
                  onChange={e => setMotivoResolucion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  <option value="Marcaje regularizado por Jefatura">Marcaje regularizado por Jefatura</option>
                  <option value="Falla en conexión móvil o GPS del funcionario">Falla en conexión móvil o GPS del funcionario</option>
                  <option value="Turno realizado y corroborado en libro de novedades">Turno realizado y corroborado en libro de novedades</option>
                  <option value="Licencia médica o permiso administrativo justificado">Licencia médica o permiso administrativo justificado</option>
                  <option value="Reemplazo o cobertura urgente de turno">Reemplazo o cobertura urgente de turno</option>
                </select>
              </div>

              {/* Horas a imputar */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Horas Efectivas Aprobadas para Informe de Pago
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={horasAprobadas}
                  onChange={e => setHorasAprobadas(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  placeholder="Ej: 12.0"
                />
              </div>

              {/* Observaciones */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Observación de Auditoría
                </label>
                <textarea
                  rows={2}
                  value={observacionAuditor}
                  onChange={e => setObservacionAuditor(e.target.value)}
                  placeholder="Comentario para respaldo en informe de Recursos Humanos..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setResolviendoTurno(null)}
                disabled={resolviendoLoading}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarResolucion}
                disabled={resolviendoLoading}
                className="btn-primary px-4 py-1.5 text-xs font-semibold"
              >
                {resolviendoLoading ? 'Guardando...' : 'Aplicar Resolución'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgenteAuditorDiscrepancias;
