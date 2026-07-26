import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Info, X, Loader2, Calculator, TrendingUp, Receipt, CheckCircle2, Stethoscope, Umbrella, ClipboardCheck, AlertTriangle, Lock } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { calcularProyeccionTurno } from '../utils/escalaRemuneraciones';
import { logAuditAction } from '../utils/auditLogger';

const FuncionarioTurnosView = ({ userData }) => {
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.rut) return;
    
    setLoading(true);
    
    // MÓDULO 2: Sanitización de RUT para Query Estricta
    const cleanRut = userData.rut.replace(/[^0-9kK]/g, '');
    console.log("Buscando turnos para RUT limpio:", cleanRut);

    const q = query(
      collection(db, 'turnos'),
      where('rutFuncionario', '==', cleanRut)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            inicio: data.fechaInicio?.toDate() || data.inicio,
            termino: data.fechaFin?.toDate() || data.termino,
            centroSalud: data.centroAsignacion || data.centroSalud
          };
        })
        .filter(t => ['pendiente', 'programado', 'en_curso', 'cancelado_por_usuario'].includes(t.estado))
        .sort((a, b) => {
          const timeA = a.inicio ? new Date(a.inicio).getTime() : 0;
          const timeB = b.inicio ? new Date(b.inicio).getTime() : 0;
          return timeA - timeB;
        });
      setTurnos(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error onSnapshot turnos:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  const [novedades, setNovedades] = useState([]);

  useEffect(() => {
    if (!userData?.rut) return;
    const cleanRut = userData.rut.replace(/[^0-9kK]/g, '');

    const qNov = query(
      collection(db, 'novedades'),
      where('rutFuncionario', '==', cleanRut)
    );

    const unsubNov = onSnapshot(qNov, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNovedades(list);
    }, (err) => {
      console.warn("Error fetching novedades:", err);
    });

    return () => unsubNov();
  }, [userData]);

  const getTurnoNovedadInfo = (turno) => {
    const estado = (turno.estado || '').toLowerCase();
    const tipoNovedadDirect = (turno.tipoNovedad || turno.tipoJustificacion || turno.motivoNovedad || '').toLowerCase();

    if (estado === 'licencia' || tipoNovedadDirect.includes('licencia')) {
      return {
        tipo: 'licencia',
        label: 'Justificado por Licencia Médica',
        bgClass: 'bg-purple-50/90 border-purple-300 text-purple-900',
        badgeClass: 'bg-purple-600 text-white',
        iconType: 'stethoscope',
        desc: 'Inasistencia justificada mediante Licencia Médica registrada por la Administración.'
      };
    }

    if (estado === 'vacaciones' || tipoNovedadDirect.includes('vacaciones')) {
      return {
        tipo: 'vacaciones',
        label: 'Justificado por Vacaciones',
        bgClass: 'bg-cyan-50/90 border-cyan-300 text-cyan-900',
        badgeClass: 'bg-cyan-600 text-white',
        iconType: 'umbrella',
        desc: 'Turno liberado por período de Vacaciones anuales.'
      };
    }

    if (estado === 'permiso' || tipoNovedadDirect.includes('permiso')) {
      return {
        tipo: 'permiso',
        label: 'Justificado por Permiso Administrativo',
        bgClass: 'bg-amber-50/90 border-amber-300 text-amber-900',
        badgeClass: 'bg-amber-600 text-white',
        iconType: 'clipboard',
        desc: 'Turno eximido con Permiso Administrativo autorizado.'
      };
    }

    if (estado === 'ausente' || tipoNovedadDirect.includes('ausente')) {
      return {
        tipo: 'ausente',
        label: 'Inasistencia Registrada',
        bgClass: 'bg-rose-50/90 border-rose-300 text-rose-900',
        badgeClass: 'bg-rose-600 text-white',
        iconType: 'alert',
        desc: 'Inasistencia reportada en la bitácora del centro.'
      };
    }

    if (novedades && novedades.length > 0 && turno.inicio) {
      const shiftDate = new Date(turno.inicio);
      shiftDate.setHours(0,0,0,0);

      const foundNov = novedades.find(n => {
        const start = n.fechaInicio ? new Date(n.fechaInicio) : null;
        const end = n.fechaFin ? new Date(n.fechaFin) : start;
        if (start) start.setHours(0,0,0,0);
        if (end) end.setHours(23,59,59,999);

        return start && end && shiftDate >= start && shiftDate <= end;
      });

      if (foundNov) {
        const tipo = (foundNov.tipo || foundNov.tipoNovedad || '').toLowerCase();
        if (tipo.includes('licencia')) {
          return {
            tipo: 'licencia',
            label: 'Justificado por Licencia Médica',
            bgClass: 'bg-purple-50/90 border-purple-300 text-purple-900',
            badgeClass: 'bg-purple-600 text-white',
            iconType: 'stethoscope',
            desc: foundNov.observaciones || 'Licencia médica registrada en tu expediente por la Administración.'
          };
        }
        if (tipo.includes('vacaciones')) {
          return {
            tipo: 'vacaciones',
            label: 'Justificado por Vacaciones',
            bgClass: 'bg-cyan-50/90 border-cyan-300 text-cyan-900',
            badgeClass: 'bg-cyan-600 text-white',
            iconType: 'umbrella',
            desc: foundNov.observaciones || 'Vacaciones autorizadas por la Administración.'
          };
        }
        if (tipo.includes('permiso')) {
          return {
            tipo: 'permiso',
            label: 'Justificado por Permiso Administrativo',
            bgClass: 'bg-amber-50/90 border-amber-300 text-amber-900',
            badgeClass: 'bg-amber-600 text-white',
            iconType: 'clipboard',
            desc: foundNov.observaciones || 'Permiso administrativo autorizado.'
          };
        }
        if (tipo.includes('ausente') || tipo.includes('inasistencia')) {
          return {
            tipo: 'ausente',
            label: 'Inasistencia Registrada',
            bgClass: 'bg-rose-50/90 border-rose-300 text-rose-900',
            badgeClass: 'bg-rose-600 text-white',
            iconType: 'alert',
            desc: foundNov.observaciones || 'Inasistencia reportada.'
          };
        }
      }
    }

    return null;
  };

  const MOTIVOS_CANCELACION = [
    'Salud / Licencia médica',
    'Permiso administrativo / Motivos personales',
    'Topación / Traslape con otro turno',
    'Problemas de movilización / Transporte',
    'Emergencia familiar',
    'Otro motivo (especificar)'
  ];

  const [showCancelModal, setShowCancelModal] = useState(null); // ID del turno a cancelar
  const [cancelCategory, setCancelCategory] = useState(MOTIVOS_CANCELACION[0]);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCancelTurno = async () => {
    if (!showCancelModal) return;
    const finalReason = cancelReason.trim() ? `${cancelCategory}: ${cancelReason.trim()}` : cancelCategory;
    
    setSubmitting(true);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'turnos', showCancelModal), {
        estado: 'cancelado_por_usuario',
        aceptado: false,
        motivoCategoria: cancelCategory,
        motivoCancelacion: finalReason,
        fechaCancelacion: serverTimestamp(),
        canceladoPor: userData?.nombre || 'Funcionario'
      });

      // Auditoría en tiempo real para el Administrador
      logAuditAction(
        'RECHAZO_TURNO',
        `El funcionario ${userData?.nombre || ''} (RUT ${userData?.rut || ''}) canceló/rechazó el turno ID ${showCancelModal}. Motivo: ${finalReason}`,
        userData
      );

      setTurnos(prev => prev.map(t => t.id === showCancelModal ? { 
        ...t, 
        estado: 'cancelado_por_usuario',
        aceptado: false,
        motivoCategoria: cancelCategory, 
        motivoCancelacion: finalReason 
      } : t));

      setShowCancelModal(null);
      setCancelReason('');
      alert('Turno cancelado/rechazado. El motivo ha sido registrado correctamente en la Auditoría.');
    } catch (err) {
      console.error(err);
      alert('Error al procesar la cancelación: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const [selectedShiftToAccept, setSelectedShiftToAccept] = useState(null);

  const confirmAcceptTurno = async () => {
    if (!selectedShiftToAccept) return;
    setSubmitting(true);
    try {
      const proyeccion = calcularProyeccionTurno(selectedShiftToAccept, userData);
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');

      await updateDoc(doc(db, 'turnos', selectedShiftToAccept.id), {
        estado: 'programado',
        aceptado: true,
        fechaAceptacion: serverTimestamp(),
        brutoProyectado: proyeccion.brutoTotal,
        netoProyectado: proyeccion.netoEstimado,
        retencionSII: proyeccion.retencionSII
      });

      setTurnos(prev => prev.map(t => t.id === selectedShiftToAccept.id ? { ...t, estado: 'programado', aceptado: true } : t));
      setSelectedShiftToAccept(null);
      alert('¡Turno aceptado con éxito! Se ha habilitado la opción para iniciar la jornada.');
    } catch (err) {
      console.error(err);
      alert('Error al aceptar el turno: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-secondary">Mis Turnos Asignados</h1>
        <p className="text-gray-500 mt-1">Consulta tu agenda mensual y centros de asignación.</p>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-200">
              <ChevronLeft size={20} />
            </button>
            <h2 className="font-bold text-secondary text-lg">Mayo 2026</h2>
            <button className="p-2 hover:bg-white rounded-xl transition-colors border border-transparent hover:border-gray-200">
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-xl text-primary text-xs font-bold uppercase">
            <Info size={14} />
            <span>{turnos.length} Turnos este mes</span>
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Cargando tu agenda...</div>
          ) : turnos.length > 0 ? (
            turnos.map((turno) => {
              const novedadInfo = getTurnoNovedadInfo(turno);
              const esPlazoFijo = (userData?.tipoContrato || '').toLowerCase().includes('plazo') || (userData?.tipoContrato || '').toLowerCase().includes('planta');
              const esTurnoOrdinarioAuto = ['Turno 1', 'Turno 2', 'Turno 3', 'Turno A', 'Turno B', 'Turno C'].includes(turno.tipoTurno || turno.turno);
              const esTurnoInstitucionalObligatorio = esPlazoFijo || (esTurnoOrdinarioAuto && !turno.esExtra && !turno.esRefuerzo);

              const esFuturo = new Date(turno.inicio) > new Date();
              const estaCancelado = turno.estado === 'cancelado_por_usuario';
              const estaAceptado = turno.aceptado === true || turno.estado === 'programado' || esTurnoInstitucionalObligatorio;
              const estaPendiente = !estaAceptado && !estaCancelado && !novedadInfo;

              const tipoTurnoName = turno.tipoTurno || turno.turno || turno.tipo;
              let shiftBadge = { label: 'Turno 1 (Verde)', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-300' };
              if (tipoTurnoName === 'Turno 2' || tipoTurnoName === 'Turno B') {
                shiftBadge = { label: 'Turno 2 (Amarillo)', cls: 'bg-amber-100 text-amber-900 border border-amber-300' };
              } else if (tipoTurnoName === 'Turno 3' || tipoTurnoName === 'Turno C') {
                shiftBadge = { label: 'Turno 3 (Celeste)', cls: 'bg-sky-100 text-sky-800 border border-sky-300' };
              } else if (tipoTurnoName === 'Refuerzo') {
                shiftBadge = { label: 'Refuerzo', cls: 'bg-purple-100 text-purple-800 border border-purple-300' };
              }

              return (
                <div 
                  key={turno.id} 
                  className={`p-6 flex flex-col md:flex-row md:items-center justify-between transition-colors gap-4 rounded-2xl border my-2 ${
                    novedadInfo
                      ? `${novedadInfo.bgClass} shadow-sm`
                      : estaPendiente
                      ? 'bg-amber-50/30 border-amber-200'
                      : 'bg-white border-gray-100 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border shadow-sm shrink-0 ${
                      novedadInfo
                        ? 'bg-white border-gray-200 text-secondary'
                        : estaPendiente 
                        ? 'bg-amber-500 border-amber-400 text-white' 
                        : 'bg-tertiary border-gray-100 text-secondary'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase leading-none ${estaPendiente && !novedadInfo ? 'text-white/80' : 'text-gray-400'}`}>
                        {new Date(turno.inicio).toLocaleDateString('es-CL', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-2xl font-black leading-none mt-1">
                        {new Date(turno.inicio).getDate()}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-secondary text-lg">
                          {turno.nombreHorario || (
                            new Date(turno.inicio).toLocaleDateString('es-CL', { weekday: 'long' }).charAt(0).toUpperCase() + 
                            new Date(turno.inicio).toLocaleDateString('es-CL', { weekday: 'long' }).slice(1)
                          )}
                        </p>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${shiftBadge.cls}`}>
                          {shiftBadge.label}
                        </span>

                        {novedadInfo && (
                          <span className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${novedadInfo.badgeClass}`}>
                            {novedadInfo.label}
                          </span>
                        )}

                        {!novedadInfo && estaPendiente && (
                          <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded-md animate-pulse">
                            Pendiente Aceptación
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        <span className="flex items-center gap-1 font-semibold"><MapPin size={14} /> {turno.centroSalud}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="flex items-center gap-1 font-semibold"><Clock size={14} /> {new Date(turno.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(turno.termino).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {turno.rolTurno && (
                          <>
                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                            <span className="font-bold text-secondary text-xs bg-white/80 px-2 py-0.5 rounded border border-gray-200">{turno.rolTurno}</span>
                          </>
                        )}
                      </div>

                      {novedadInfo && (
                        <p className="text-xs font-semibold mt-1 opacity-90">
                          {novedadInfo.desc}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end md:self-auto">
                    {novedadInfo ? (
                      <span className="px-3.5 py-1.5 bg-white/90 text-secondary border border-gray-200 text-[10px] font-extrabold uppercase tracking-widest rounded-xl shadow-sm">
                        Justificado por Administración
                      </span>
                    ) : estaPendiente ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowCancelModal(turno.id)}
                          className="px-4 py-2 bg-white border border-error text-error text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-error/5 transition-all"
                        >
                          Rechazar
                        </button>
                        <button 
                          onClick={() => setSelectedShiftToAccept(turno)}
                          disabled={submitting}
                          className="px-4 py-2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all shadow-md shadow-primary/20"
                        >
                          Revisar & Aceptar Turno
                        </button>
                      </div>
                    ) : estaCancelado ? (
                      <div className="text-right">
                        <span className="px-4 py-2 bg-error/10 text-error text-[10px] font-bold uppercase tracking-widest rounded-full border border-error/20 inline-block">
                          Cancelado
                        </span>
                        {turno.motivoCancelacion && (
                          <p className="text-[10px] text-gray-400 font-medium mt-1 max-w-[200px] truncate" title={turno.motivoCancelacion}>
                            Motivo: {turno.motivoCancelacion}
                          </p>
                        )}
                      </div>
                    ) : esTurnoInstitucionalObligatorio ? (
                      <div className="flex items-center gap-2">
                        <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-1">
                          <CheckCircle2 size={12} /> Carga Automática
                        </span>
                        <span className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-xl text-[10px] font-extrabold uppercase border border-gray-200 flex items-center gap-1">
                          <Lock size={12} /> Turno Institucional
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-widest rounded-full flex items-center gap-1">
                          <CheckCircle2 size={12} /> Confirmado
                        </span>
                        <button 
                          onClick={() => setSelectedShiftToAccept(turno)}
                          className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                        >
                          Ver Proyección
                        </button>
                        <button 
                          onClick={() => setShowCancelModal(turno.id)}
                          className="text-xs font-bold text-rose-500 hover:underline uppercase tracking-wider"
                        >
                          Rechazar / Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-gray-400">No tienes turnos programados.</div>
          )}
        </div>
      </div>

      {/* Modal de Cancelación */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-secondary/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-error/5 text-error">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Info size={20} />
                Motivo de Rechazo / Cancelación
              </h3>
              <button onClick={() => setShowCancelModal(null)} className="text-gray-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 md:p-8 space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Categoría del Motivo
                  </label>
                  <select
                    value={cancelCategory}
                    onChange={e => setCancelCategory(e.target.value)}
                    className="w-full input-field bg-gray-50 text-xs font-bold text-secondary border border-gray-200 cursor-pointer"
                  >
                    {MOTIVOS_CANCELACION.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Detalle / Observación (Opcional)
                  </label>
                  <textarea 
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Describe brevemente el motivo o detalle relevante..."
                    className="w-full bg-tertiary border border-gray-200 rounded-2xl p-3.5 text-xs font-medium text-secondary focus:ring-2 focus:ring-error/20 min-h-[90px] resize-none"
                  />
                </div>

                <p className="text-[10px] text-gray-400 italic">
                  * Este motivo quedará registrado en la Bitácora de Auditoría para revisión del Administrador Local y Global.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowCancelModal(null)}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Volver
                </button>
                <button 
                  onClick={handleCancelTurno}
                  disabled={submitting}
                  className="flex-1 py-3.5 bg-error text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-error-dark transition-all flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Confirmar Cancelación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════
          MODAL DE ACEPTACIÓN & PROYECCIÓN FINANCIERA DEL TURNO
         ════════════════════════════════════════════════════════════════════════════ */}
      {selectedShiftToAccept && (() => {
        const proyeccion = calcularProyeccionTurno(selectedShiftToAccept, userData);
        const fechaStr = selectedShiftToAccept.inicio
          ? new Date(selectedShiftToAccept.inicio).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
          : 'Fecha de turno programado';

        return (
          <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[36px] shadow-2xl p-6 md:p-8 space-y-6 border border-gray-100 animate-scale-up font-sans">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-bold">
                    <Calculator size={24} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-secondary text-base">Aceptación & Proyección de Turno</h3>
                    <p className="text-xs text-gray-400 capitalize">{fechaStr}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedShiftToAccept(null)} className="text-gray-400 hover:text-secondary p-2 rounded-xl">
                  <X size={20} />
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase">Centro de Salud:</span>
                  <span className="font-bold text-secondary">{selectedShiftToAccept.centroSalud || 'SAR Arpillerista'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase">Función / Rol:</span>
                  <span className="font-bold text-primary">{proyeccion.rolLabel} (Cat {proyeccion.categoria})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase">Horas Estimadas:</span>
                  <span className="font-mono font-bold text-secondary">{proyeccion.horasTotales} hrs</span>
                </div>
              </div>

              {/* Financial Breakdown Box */}
              <div className="bg-gradient-to-br from-emerald-50/70 via-white to-gray-50 p-5 rounded-2xl border border-emerald-200/80 space-y-4">
                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider">
                  <TrendingUp size={16} />
                  1. Proyección de Ganancias del Turno
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 pl-1">
                  <div className="flex justify-between">
                    <span>Horas Hábiles (${proyeccion.valorHab.toLocaleString()}/h):</span>
                    <span className="font-mono font-bold text-secondary">${proyeccion.brutoHabiles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horas Inhábiles/Festivas (${proyeccion.valorInh.toLocaleString()}/h):</span>
                    <span className="font-mono font-bold text-secondary">${proyeccion.brutoInhabiles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-emerald-200 font-bold text-secondary text-sm">
                    <span>Monto Bruto Estimado del Turno:</span>
                    <span className="font-mono font-black text-emerald-600">${proyeccion.brutoTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Deductions / Retención SII Box */}
                <div className="pt-3 border-t border-emerald-200/60 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
                    <Receipt size={16} />
                    2. Descuentos Pertinentes (Boleta de Honorarios)
                  </div>

                  <div className="flex justify-between text-xs text-rose-600 font-medium pl-1">
                    <span>Retención Legal SII ({proyeccion.porcentajeRetencion}):</span>
                    <span className="font-mono font-bold">-${proyeccion.retencionSII.toLocaleString()}</span>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-emerald-300 flex justify-between items-center text-xs shadow-sm">
                    <span className="font-extrabold text-secondary uppercase">Monto Neto Estimado a Recibir:</span>
                    <span className="font-mono font-black text-emerald-700 text-lg">${proyeccion.netoEstimado.toLocaleString()}</span>
                  </div>

                  <p className="text-[10px] text-gray-400 italic leading-tight pt-1">
                    * Nota: Descuentos legales aplicables al momento de emisión de la boleta de honorarios mensual.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button 
                  onClick={() => setSelectedShiftToAccept(null)}
                  className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmAcceptTurno}
                  disabled={submitting}
                  className="flex-1 btn-primary py-3.5 text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> Confirmar & Aceptar Turno</>}
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default FuncionarioTurnosView;
