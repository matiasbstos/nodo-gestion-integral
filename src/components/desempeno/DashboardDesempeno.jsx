import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Award, 
  Clock, 
  AlertTriangle, 
  Plus, 
  FileCheck, 
  Printer, 
  Search, 
  Filter, 
  Calendar, 
  ChevronRight, 
  ShieldCheck, 
  UserCheck, 
  FileText, 
  BookOpen, 
  History, 
  CheckCircle2, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import HorizonWidget from './HorizonWidget';
import DesempenoTimeline from './DesempenoTimeline';
import ModalNuevaAnotacion from './ModalNuevaAnotacion';
import FormularioEvaluacion from './FormularioEvaluacion';
import HojaVidaPrint from './HojaVidaPrint';
import EmptyState from '../common/EmptyState';
import { 
  getFuncionariosDisponibles, 
  getAnotacionesFuncionario, 
  getEvaluacionesFuncionario, 
  eliminarAnotacion,
  calcularMetricasDesempeno,
  esJefaturaOAdmin,
  TIPOS_ANOTACION,
  getEscalaInfo
} from '../../services/hojaVidaService';

/**
 * DashboardDesempeno (Enterprise SaaS / Taxonomy Standard)
 * Centro de Mando de Desempeño y Hoja de Vida en NODO
 * Rediseñado con bordes sutiles (border-slate-200), fondos neutros (bg-slate-50),
 * trazo fino SVG (strokeWidth=1.5) y cero emojis.
 */
const DashboardDesempeno = ({ 
  userData, 
  funcionarioId = null, 
  readOnly = false 
}) => {
  // Estado de permisos y rol
  const esAdmin = !readOnly && esJefaturaOAdmin(userData);

  // Estados de datos
  const [funcionarios, setFuncionarios] = useState([]);
  const [selectedFuncionario, setSelectedFuncionario] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [anotaciones, setAnotaciones] = useState([]);
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros del Dashboard
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todo'); // 'todo', '2026', '2025', 'mes'
  const [tabActiva, setTabActiva] = useState('timeline'); // 'timeline', 'evaluaciones', 'plan'

  // Modales
  const [modalAnotacionOpen, setModalAnotacionOpen] = useState(false);
  const [modalEvaluacionOpen, setModalEvaluacionOpen] = useState(false);
  const [printDocOpen, setPrintDocOpen] = useState(false);
  const [evaluacionParaImprimir, setEvaluacionParaImprimir] = useState(null);

  // 1. Cargar lista de funcionarios al inicio
  useEffect(() => {
    const cargarFuncionarios = async () => {
      setLoading(true);
      try {
        const list = await getFuncionariosDisponibles();
        setFuncionarios(list);

        const idBuscado = funcionarioId || (!esAdmin ? (userData?.rut || userData?.id) : null);

        if (idBuscado) {
          const match = list.find(f => f.id === idBuscado || f.rut === idBuscado);
          if (match) {
            setSelectedFuncionario(match);
          } else if (userData) {
            setSelectedFuncionario({
              id: userData.id || userData.rut,
              rut: userData.rut || userData.id,
              nombre: userData.nombre || 'Funcionario Actual',
              cargo: userData.cargo || userData.tipoPrestador || 'Funcionario',
              correo: userData.correoInstitucional || userData.email || '',
              role: userData.role || 'user'
            });
          }
        } else if (list.length > 0 && esAdmin) {
          const defaultFunc = list.find(f => f.rut === userData?.rut || f.id === userData?.id) ||
                              list.find(f => f.nombre && !f.nombre.includes('Sin Nombre') && !f.id.startsWith('UA')) ||
                              list[0];
          setSelectedFuncionario(defaultFunc);
        }
      } catch (err) {
        console.error('Error al cargar funcionarios:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarFuncionarios();
  }, [funcionarioId, esAdmin, userData]);

  // 2. Cargar anotaciones y evaluaciones cuando cambia el funcionario seleccionado
  const cargarHistorial = async (funcionario) => {
    if (!funcionario) return;
    setRefreshing(true);
    try {
      const fId = funcionario.id || funcionario.rut;
      const [anots, evals] = await Promise.all([
        getAnotacionesFuncionario(fId),
        getEvaluacionesFuncionario(fId)
      ]);
      setAnotaciones(anots);
      setEvaluaciones(evals);
    } catch (err) {
      console.error('Error al cargar historial de desempeño:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedFuncionario) {
      cargarHistorial(selectedFuncionario);
    }
  }, [selectedFuncionario]);

  // Manejo de eliminación de anotación
  const handleDeleteAnotacion = async (item) => {
    if (!esAdmin) return;
    const confirmacion = window.confirm(
      `¿Está seguro de eliminar esta anotación del registro oficial de ${selectedFuncionario?.nombre}?\n\nEsta acción quedará registrada en el sistema de Auditoría.`
    );
    if (!confirmacion) return;

    try {
      await eliminarAnotacion(item.id, item, userData);
      setAnotaciones(prev => prev.filter(a => a.id !== item.id));
    } catch (err) {
      alert('Error al eliminar la anotación: ' + err.message);
    }
  };

  // Filtrado de anotaciones en memoria
  const anotacionesFiltradas = useMemo(() => {
    return anotaciones.filter(item => {
      if (filtroTipo !== 'todos' && item.tipo !== filtroTipo) {
        return false;
      }
      if (filtroPeriodo === '2026' && !item.fechaEvento?.startsWith('2026')) {
        return false;
      }
      if (filtroPeriodo === '2025' && !item.fechaEvento?.startsWith('2025')) {
        return false;
      }
      if (filtroPeriodo === 'mes') {
        const fechaMesActual = new Date().toISOString().slice(0, 7);
        if (!item.fechaEvento?.startsWith(fechaMesActual)) {
          return false;
        }
      }
      return true;
    });
  }, [anotaciones, filtroTipo, filtroPeriodo]);

  // Métricas calculadas para Horizon Widgets
  const metricas = useMemo(() => {
    return calcularMetricasDesempeno(anotacionesFiltradas);
  }, [anotacionesFiltradas]);

  // Lista de funcionarios filtrada por búsqueda en el selector
  const funcionariosFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return funcionarios;
    const q = searchQuery.toLowerCase();
    return funcionarios.filter(f => 
      f.nombre?.toLowerCase().includes(q) || 
      f.rut?.toLowerCase().includes(q) ||
      f.cargo?.toLowerCase().includes(q)
    );
  }, [funcionarios, searchQuery]);

  const ultimaEvaluacion = evaluaciones.length > 0 ? evaluaciones[0] : null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in print:p-0">
      
      {/* 1. ENCABEZADO Y ACCIONES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <ShieldCheck size={18} strokeWidth={1.5} />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700">
              Gestión de Desempeño NODO
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Hoja de Vida y Desempeño
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            {esAdmin
              ? 'Panel de control disciplinario, méritos y evaluaciones para Dirección Técnica y Jefaturas SAR.'
              : 'Historial individual de desempeño, reconocimientos institucionales y plan de mejora continua.'}
          </p>
        </div>

        {/* Acciones Globales */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => cargarHistorial(selectedFuncionario)}
            disabled={refreshing}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refrescar datos"
          >
            <RefreshCw size={16} strokeWidth={1.5} className={refreshing ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button
            onClick={() => {
              setEvaluacionParaImprimir(ultimaEvaluacion);
              setPrintDocOpen(true);
            }}
            disabled={!selectedFuncionario}
            className="btn-secondary px-3.5 py-2 text-xs"
          >
            <Printer size={15} strokeWidth={1.5} />
            <span>Imprimir Hoja de Vida</span>
          </button>

          {esAdmin && (
            <>
              <button
                onClick={() => setModalEvaluacionOpen(true)}
                disabled={!selectedFuncionario}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 shadow-xs"
              >
                <FileCheck size={15} strokeWidth={1.5} />
                <span>Generar Evaluación</span>
              </button>

              <button
                onClick={() => setModalAnotacionOpen(true)}
                disabled={!selectedFuncionario}
                className="btn-primary px-4 py-2 text-xs"
              >
                <Plus size={15} strokeWidth={1.5} />
                <span>Nueva Anotación</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. SELECTOR DE FUNCIONARIO (Modo Admin) */}
      {esAdmin && (
        <div className="rounded-2xl bg-white p-4 md:p-5 border border-slate-200/90 shadow-xs print:hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <Users size={18} strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Funcionario Seleccionado
                </p>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {selectedFuncionario ? selectedFuncionario.nombre : 'Seleccione un funcionario'}
                </h3>
                {selectedFuncionario && (
                  <p className="text-xs text-slate-500 font-mono">
                    RUT: {selectedFuncionario.rut} • {selectedFuncionario.cargo || 'Funcionario SAR'}
                  </p>
                )}
              </div>
            </div>

            {/* Buscador inteligente */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={14} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o RUT..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <select
                value={selectedFuncionario?.id || selectedFuncionario?.rut || ''}
                onChange={(e) => {
                  const match = funcionarios.find(f => f.id === e.target.value || f.rut === e.target.value);
                  if (match) setSelectedFuncionario(match);
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 max-w-[220px]"
              >
                {funcionariosFiltrados.map((f) => (
                  <option key={f.id || f.rut} value={f.id || f.rut}>
                    {f.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 3. KPIS DE DESEMPEÑO (Horizon Widgets con estilo limpio) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        <HorizonWidget
          icon={Award}
          title="Total Felicitaciones"
          subtitle={metricas.felicitaciones}
          color="emerald"
          trend="Reconocimiento"
          onClick={() => setFiltroTipo('felicitacion')}
        />

        <HorizonWidget
          icon={Clock}
          title="Retrasos en Turno"
          subtitle={metricas.retrasos}
          color="amber"
          trend="Puntualidad"
          onClick={() => setFiltroTipo('retraso')}
        />

        <HorizonWidget
          icon={AlertTriangle}
          title="Faltas de Protocolo y Ausencias"
          subtitle={metricas.faltasProtocolo + metricas.ausencias}
          color="rose"
          trend="Disciplinario"
          onClick={() => setFiltroTipo('falta_protocolo')}
        />

        <HorizonWidget
          icon={FileCheck}
          title="Calificación Formal"
          subtitle={
            ultimaEvaluacion 
              ? `${parseFloat(ultimaEvaluacion.calificacion).toFixed(1)} / 7.0` 
              : `${metricas.indiceDesempeno}%`
          }
          color="indigo"
          trend={ultimaEvaluacion ? ultimaEvaluacion.escalaDescriptor : 'Índice Cumplimiento'}
          onClick={() => setTabActiva('evaluaciones')}
        />
      </div>

      {/* 4. BARRA DE FILTROS Y PESTAÑAS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-200 pb-3 print:hidden">
        {/* Pestañas de Navegación del Módulo */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTabActiva('timeline')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              tabActiva === 'timeline'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <History size={14} strokeWidth={1.5} />
            <span>Línea de Tiempo ({anotacionesFiltradas.length})</span>
          </button>

          <button
            onClick={() => setTabActiva('evaluaciones')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              tabActiva === 'evaluaciones'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText size={14} strokeWidth={1.5} />
            <span>Evaluaciones Anuales ({evaluaciones.length})</span>
          </button>

          <button
            onClick={() => setTabActiva('plan')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              tabActiva === 'plan'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen size={14} strokeWidth={1.5} />
            <span>Plan de Trabajo Activo</span>
          </button>
        </div>

        {/* Filtros para la Línea de Tiempo */}
        {tabActiva === 'timeline' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="felicitacion">Felicitaciones</option>
              <option value="retraso">Retrasos</option>
              <option value="ausencia">Ausencias</option>
              <option value="falta_protocolo">Faltas de Protocolo</option>
              <option value="nota_desempeno">Notas de Desempeño</option>
            </select>

            <select
              value={filtroPeriodo}
              onChange={(e) => setFiltroPeriodo(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
            >
              <option value="todo">Histórico Completo</option>
              <option value="2026">Año 2026</option>
              <option value="2025">Año 2025</option>
              <option value="mes">Mes Actual</option>
            </select>
          </div>
        )}
      </div>

      {/* 5. CONTENIDO PRINCIPAL SEGÚN PESTAÑA */}
      {tabActiva === 'timeline' && (
        <div className="rounded-2xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Historial Cronológico de Anotaciones
              </h2>
              <p className="text-xs text-slate-400">
                Eventos registrados por orden de ocurrencia con trazabilidad de jefatura
              </p>
            </div>

            {anotacionesFiltradas.length > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                {anotacionesFiltradas.length} eventos
              </span>
            )}
          </div>

          <DesempenoTimeline
            anotaciones={anotacionesFiltradas}
            loading={refreshing}
            esAdmin={esAdmin}
            onDeleteAnotacion={handleDeleteAnotacion}
          />
        </div>
      )}

      {/* Pestaña: Historial de Evaluaciones */}
      {tabActiva === 'evaluaciones' && (
        <div className="space-y-4">
          {evaluaciones.length === 0 ? (
            <EmptyState
              icon={FileCheck}
              title="Sin Evaluaciones Registradas"
              description="Aún no se han emitido evaluaciones anuales ni calificaciones formales para este funcionario."
              action={esAdmin ? () => setModalEvaluacionOpen(true) : null}
              actionLabel="Generar Primera Evaluación"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {evaluaciones.map((evalu) => {
                const escala = getEscalaInfo(evalu.calificacion);
                return (
                  <div 
                    key={evalu.id}
                    className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                            {evalu.periodoEvaluacion}
                          </span>
                          <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-0.5 rounded-full ${escala.badge}`}>
                            {escala.label}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                            {parseFloat(evalu.calificacion).toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-400 font-mono"> / 7.0</span>
                        </div>
                      </div>

                      {/* Plan de Trabajo resumido */}
                      <div className="space-y-1.5 mb-3">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Plan de Trabajo Acordado:
                        </p>
                        <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-line leading-relaxed">
                          {evalu.planDeTrabajo}
                        </p>
                      </div>

                      {evalu.observaciones && (
                        <p className="text-xs text-slate-500 italic mb-3">
                          "{evalu.observaciones}"
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Evaluador: <strong className="text-slate-700 font-semibold">{evalu.evaluadorNombre}</strong>
                      </span>

                      <button
                        onClick={() => {
                          setEvaluacionParaImprimir(evalu);
                          setPrintDocOpen(true);
                        }}
                        className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Printer size={13} strokeWidth={1.5} />
                        <span>Ver e Imprimir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pestaña: Plan de Trabajo Activo */}
      {tabActiva === 'plan' && (
        <div className="rounded-2xl bg-white border border-slate-200/90 p-5 md:p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Plan de Trabajo y Compromisos de Mejora Vigente
              </h2>
              <p className="text-xs text-slate-400">
                Metas acordadas entre Jefatura y Funcionario para el período en curso
              </p>
            </div>
            {ultimaEvaluacion && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Período: {ultimaEvaluacion.periodoEvaluacion}
              </span>
            )}
          </div>

          {ultimaEvaluacion?.planDeTrabajo ? (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5">
                <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                  Detalle del Plan y Objetivos Asignados
                </h4>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
                  {ultimaEvaluacion.planDeTrabajo}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl border border-slate-200/80 bg-emerald-50/20">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase block tracking-wider">Meta Asistencia</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">100% de Turnos Cumplidos</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Control de ingresos y marcajes</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/80 bg-sky-50/20">
                  <span className="text-[10px] font-semibold text-sky-800 uppercase block tracking-wider">Monitoreo Clínico</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">Cumplimiento Guías Clínicas</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Revisión aleatoria de fichas</p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/80 bg-blue-50/20">
                  <span className="text-[10px] font-semibold text-blue-800 uppercase block tracking-wider">Próxima Revisión</span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    En {ultimaEvaluacion.plazoRevisionMeses || 6} meses
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Seguimiento por Jefatura</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Sin Plan de Trabajo Activo"
              description="Genere una evaluación formal para establecer el plan de compromisos, objetivos y metas."
            />
          )}
        </div>
      )}

      {/* 6. MODALES Y VISTA DE IMPRESIÓN */}
      {modalAnotacionOpen && (
        <ModalNuevaAnotacion
          isOpen={modalAnotacionOpen}
          onClose={() => setModalAnotacionOpen(false)}
          funcionarioSeleccionado={selectedFuncionario}
          listaFuncionarios={funcionarios}
          currentUser={userData}
          onAnotacionCreada={(nueva) => {
            setAnotaciones(prev => [nueva, ...prev]);
          }}
        />
      )}

      {modalEvaluacionOpen && (
        <FormularioEvaluacion
          isOpen={modalEvaluacionOpen}
          onClose={() => setModalEvaluacionOpen(false)}
          funcionario={selectedFuncionario}
          anotaciones={anotaciones}
          currentUser={userData}
          onEvaluacionGuardada={(nuevaEval) => {
            setEvaluaciones(prev => [nuevaEval, ...prev]);
          }}
          onAbrirImpresion={(evalParaImprimir) => {
            setEvaluacionParaImprimir(evalParaImprimir);
            setModalEvaluacionOpen(false);
            setPrintDocOpen(true);
          }}
        />
      )}

      {printDocOpen && (
        <HojaVidaPrint
          funcionario={selectedFuncionario}
          anotaciones={anotacionesFiltradas}
          metricas={metricas}
          evaluacion={evaluacionParaImprimir || ultimaEvaluacion}
          periodo={filtroPeriodo === 'todo' ? 'HISTÓRICO' : filtroPeriodo}
          evaluador={userData}
          onClose={() => setPrintDocOpen(false)}
        />
      )}

    </div>
  );
};

export default DashboardDesempeno;
