import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Info, X, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

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

  const [showCancelModal, setShowCancelModal] = useState(null); // ID del turno a cancelar
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCancelTurno = async () => {
    if (!cancelReason) return alert('Debes ingresar una justificación');
    setSubmitting(true);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'turnos', showCancelModal), {
        estado: 'cancelado_por_usuario',
        motivoCancelacion: cancelReason,
        fechaCancelacion: serverTimestamp()
      });
      setTurnos(prev => prev.map(t => t.id === showCancelModal ? { ...t, estado: 'cancelado_por_usuario' } : t));
      setShowCancelModal(null);
      setCancelReason('');
      alert('Turno rechazado/cancelado correctamente.');
    } catch (err) {
      console.error(err);
      alert('Error al procesar la solicitud: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptTurno = async (turnoId) => {
    setSubmitting(true);
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      await updateDoc(doc(db, 'turnos', turnoId), {
        estado: 'programado', // O 'confirmado' según lógica de negocio
        fechaAceptacion: serverTimestamp()
      });
      setTurnos(prev => prev.map(t => t.id === turnoId ? { ...t, estado: 'programado' } : t));
      alert('Turno aceptado con éxito. ¡Buen turno!');
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
              const esFuturo = new Date(turno.inicio) > new Date();
              const estaCancelado = turno.estado === 'cancelado_por_usuario';
              const estaPendiente = turno.estado === 'pendiente';

              return (
                <div key={turno.id} className={`p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors ${estaPendiente ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border shadow-sm ${estaPendiente ? 'bg-primary border-primary text-white' : 'bg-tertiary border-gray-100 text-secondary'}`}>
                      <span className={`text-[10px] font-bold uppercase leading-none ${estaPendiente ? 'text-white/70' : 'text-gray-400'}`}>
                        {new Date(turno.inicio).toLocaleDateString('es-CL', { month: 'short' }).toUpperCase()}
                      </span>
                      <span className="text-2xl font-black leading-none mt-1">
                        {new Date(turno.inicio).getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-secondary text-lg">
                          {new Date(turno.inicio).toLocaleDateString('es-CL', { weekday: 'long' }).charAt(0).toUpperCase() + 
                           new Date(turno.inicio).toLocaleDateString('es-CL', { weekday: 'long' }).slice(1)}
                        </p>
                        {estaPendiente && (
                          <span className="px-2 py-0.5 bg-primary text-white text-[8px] font-black uppercase rounded-md animate-pulse">
                            Nuevo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1"><MapPin size={14} /> {turno.centroSalud}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {new Date(turno.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(turno.termino).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {estaPendiente ? (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowCancelModal(turno.id)}
                          className="px-4 py-2 bg-white border border-error text-error text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-error/5 transition-all"
                        >
                          Rechazar
                        </button>
                        <button 
                          onClick={() => handleAcceptTurno(turno.id)}
                          disabled={submitting}
                          className="px-4 py-2 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-primary-dark transition-all shadow-md shadow-primary/20"
                        >
                          Aceptar Turno
                        </button>
                      </div>
                    ) : estaCancelado ? (
                      <span className="px-4 py-2 bg-error/10 text-error text-[10px] font-bold uppercase tracking-widest rounded-full border border-error/20">
                        Cancelado
                      </span>
                    ) : (
                      <>
                        <span className="px-4 py-2 bg-success/10 text-success text-[10px] font-bold uppercase tracking-widest rounded-full border border-success/20">
                          {turno.estado === 'programado' ? 'Confirmado' : turno.estado.toUpperCase()}
                        </span>
                        {esFuturo && (
                          <button 
                            onClick={() => setShowCancelModal(turno.id)}
                            className="text-xs font-bold text-error hover:underline uppercase tracking-wider"
                          >
                            Cancelar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-20 text-center space-y-4">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <CalendarIcon size={40} />
              </div>
              <p className="text-gray-400 font-medium">No tienes turnos asignados para este periodo.</p>
            </div>
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
                Justificar Cancelación
              </h3>
              <button onClick={() => setShowCancelModal(null)} className="text-gray-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Motivo de la cancelación (Obligatorio)</label>
                <textarea 
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ej: Problemas de salud, Permiso administrativo, etc."
                  className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-medium text-secondary focus:ring-2 focus:ring-error/20 min-h-[120px] resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCancelModal(null)}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  Volver
                </button>
                <button 
                  onClick={handleCancelTurno}
                  disabled={submitting}
                  className="flex-1 py-4 bg-error text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-error-dark transition-all flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuncionarioTurnosView;
