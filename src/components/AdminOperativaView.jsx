import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Navigation, 
  Settings, 
  MapPin, 
  Clock, 
  ShieldCheck,
  Search,
  Calendar,
  ArrowRight,
  Loader2,
  Users,
  Mail,
  Briefcase,
  ShieldAlert,
  Play,
  Database
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy, limit, addDoc } from 'firebase/firestore';

const AdminOperativaView = ({ userData }) => {
  const isAdminGlobal = userData?.role === 'admin_global';
  const isAdminLocal = userData?.role === 'admin_local';
  
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [supportEmail, setSupportEmail] = useState('');
  
  // New States for Module 2 & 3
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedTurns, setAssignedTurns] = useState([]);
  const [showManualValidation, setShowManualValidation] = useState(null); // Turn object to validate
  const [validationJustification, setValidationJustification] = useState('');
  const [validating, setValidating] = useState(false);
  const [gpsConfig, setGpsConfig] = useState({ lat: '', lng: '' });
  const [isLoadingGPS, setIsLoadingGPS] = useState(false);
  
  // Form State
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [inicioTurno, setInicioTurno] = useState('');
  const [terminoTurno, setTerminoTurno] = useState('');
  const [centroAsignacion, setCentroAsignacion] = useState('');
  const [selectedFuncionarioSandbox, setSelectedFuncionarioSandbox] = useState('');
  
  useEffect(() => {
    if (userData?.centroAsignado && !centroAsignacion) {
      setCentroAsignacion(userData.centroAsignado);
    }
  }, [userData]);

  const centrosRed = [
    'SAR Arpillerista Elsa Romo Aravena'
  ];

  useEffect(() => {
    const fetchFuncionarios = async () => {
      setLoading(true);
      try {
        let q;
        if (isAdminGlobal) {
          // Global admin sees everyone (except other globals for security)
          q = query(
            collection(db, 'usuarios'), 
            where('role', 'in', ['user', 'admin_local'])
          );
        } else {
          // Local admin sees only their center's users
          q = query(
            collection(db, 'usuarios'), 
            where('centroAsignado', '==', userData.centroAsignado),
            where('role', '==', 'user')
          );
        }
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFuncionarios(docs);
      } catch (err) {
        console.error("Error fetching funcionarios:", err);
        setError("Error al cargar funcionarios. Verifica permisos de Firestore.");
      } finally {
        setLoading(false);
      }
    };

    const fetchSupportEmail = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'configuracion', 'soporte'));
        if (docSnap.exists()) {
          setSupportEmail(docSnap.data().correo);
        }
      } catch (err) {
        console.error("Error fetching support email:", err);
      }
    };

    const fetchAssignedTurns = async () => {
      try {
        const q = query(collection(db, 'turnos'), orderBy('fechaInicio', 'desc'), limit(50));
        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            inicio: data.fechaInicio?.toDate() || data.inicio,
            termino: data.fechaFin?.toDate() || data.termino,
            funcionarioRut: data.rutFuncionario || data.funcionarioRut,
            centroSalud: data.centroAsignacion || data.centroSalud
          };
        });
        setAssignedTurns(docs || []);
      } catch (err) {
        console.error("Error fetching turns:", err);
      }
    };

    const fetchGpsConfig = async () => {
      try {
        const { getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'configuracion', 'parametros_gps'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setGpsConfig({ 
            lat: data?.latitud?.toString() || '', 
            lng: data?.longitud?.toString() || '' 
          });
        }
      } catch (err) {
        console.error("Error fetching GPS config:", err);
      }
    };

    fetchFuncionarios();
    fetchSupportEmail();
    fetchAssignedTurns();
    fetchGpsConfig();
  }, [userData, isAdminGlobal]);

  const handleObtenerUbicacion = () => {
    if (!navigator.geolocation) {
      return alert("Tu navegador no soporta geolocalización.");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsConfig({
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString()
        });
      },
      (error) => {
        let msg = "Error al obtener ubicación.";
        if (error.code === 1) msg = "Permiso de ubicación denegado. Por favor, actívelo en su navegador.";
        alert(msg);
      }
    );
  };

  const handleActualizarGPS = async () => {
    if (!gpsConfig.lat || !gpsConfig.lng) {
      return alert('Por favor ingresa coordenadas válidas');
    }

    setIsLoadingGPS(true);
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'configuracion', 'parametros_gps'), { 
        latitud: parseFloat(gpsConfig.lat), 
        longitud: parseFloat(gpsConfig.lng),
        radio: 50,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert('Georeferencia actualizada correctamente');
    } catch (err) {
      console.error(err);
      alert('Error al guardar la ubicación en Firestore');
    } finally {
      setIsLoadingGPS(false);
    }
  };

  const handleManualValidation = async () => {
    if (!validationJustification) return alert('Debe ingresar una justificación');
    setValidating(true);
    try {
      await updateDoc(doc(db, 'turnos', showManualValidation.id), {
        estado: 'completado_manual',
        justificacionManual: validationJustification,
        validadoPor: userData.email,
        fechaValidacionManual: serverTimestamp()
      });
      setAssignedTurns(prev => prev.map(t => t.id === showManualValidation.id ? { ...t, estado: 'completado_manual' } : t));
      setShowManualValidation(null);
      setValidationJustification('');
      alert('Validación manual completada.');
    } catch (err) {
      console.error(err);
      alert('Error al validar manualmente.');
    } finally {
      setValidating(false);
    }
  };

  const filteredTurns = (assignedTurns || []).filter(turn => {
    const funcionario = (funcionarios || []).find(f => f.rut === turn.funcionarioRut);
    const search = (searchQuery || '').toLowerCase();
    return (
      funcionario?.nombre?.toLowerCase().includes(search) ||
      turn.funcionarioRut?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[#F8FAFC]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">Gestión Operativa</h1>
        <p className="text-gray-500 mt-1">Configuración de turnos y parámetros de geolocalización.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generador de Turnos */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50 space-y-6 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <UserPlus size={20} />
            </div>
            <h2 className="font-bold text-[#1E293B]">Asignación Masiva de Turnos</h2>
          </div>
          
          <form className="space-y-6 flex-1">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Funcionario / Prestador</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select 
                    className="w-full bg-tertiary border-none rounded-2xl p-4 pl-12 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20 appearance-none disabled:opacity-50"
                    disabled={loading}
                    value={selectedFuncionario}
                    onChange={(e) => setSelectedFuncionario(e.target.value)}
                  >
                    <option value="">Seleccionar funcionario...</option>
                    {loading ? (
                      <option disabled>Cargando funcionarios...</option>
                    ) : (funcionarios || []).map(func => (
                      <option key={func.id} value={func.rut}>
                        {func.nombre} {isAdminGlobal && `(${func.centroAsignado || 'Sin Centro'})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Inicio del Turno</label>
                  <input 
                    type="datetime-local" 
                    value={inicioTurno}
                    onChange={(e) => setInicioTurno(e.target.value)}
                    className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Término del Turno</label>
                  <input 
                    type="datetime-local" 
                    value={terminoTurno}
                    onChange={(e) => setTerminoTurno(e.target.value)}
                    className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Centro de Asignación</label>
                {isAdminGlobal ? (
                  <select 
                    value={centroAsignacion}
                    onChange={(e) => setCentroAsignacion(e.target.value)}
                    className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20 appearance-none"
                  >
                    <option value="">Seleccionar centro...</option>
                    {(centrosRed || []).map(centro => (
                      <option key={centro} value={centro}>{centro}</option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full bg-gray-100 border-none rounded-2xl p-4 text-sm font-bold text-gray-500 cursor-not-allowed">
                    {userData?.centroAsignado || 'Centro no definido'}
                  </div>
                )}
              </div>
            </div>

            <button 
              type="button" 
              className="w-full btn-primary py-4 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 mt-auto"
              onClick={async () => {
                // Validación Detallada para Debug y UX
                if (!selectedFuncionario) return alert('Error: Debe seleccionar un funcionario.');
                if (!inicioTurno) return alert('Error: Debe definir la fecha y hora de inicio.');
                if (!terminoTurno) return alert('Error: Debe definir la fecha y hora de término.');
                if (!centroAsignacion) {
                   // Intento de recuperación si el estado falló
                   const finalCentro = userData?.centroAsignado || '';
                   if (!finalCentro) return alert('Error: No se ha definido un Centro de Asignación.');
                   setCentroAsignacion(finalCentro);
                }

                try {
                  // Obtener datos completos del funcionario para el payload
                  const funcionario = (funcionarios || []).find(f => f.rut === selectedFuncionario);

                  // Payload con todos los campos requeridos para la Bandeja de Turnos
                  const { Timestamp } = await import('firebase/firestore');
                  
                  const turnPayload = {
                    funcionarioId: funcionario?.id || '',
                    rutFuncionario: selectedFuncionario,
                    nombreFuncionario: funcionario?.nombre || 'Funcionario Desconocido',
                    estado: 'pendiente', 
                    fechaInicio: Timestamp.fromDate(new Date(inicioTurno)),
                    fechaFin: Timestamp.fromDate(new Date(terminoTurno)),
                    centroAsignacion: centroAsignacion || userData?.centroAsignado || "Centro no definido",
                    asignadoPor: userData?.nombre || userData?.email || "Administrador del Sistema",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                  };

                  const docRef = await addDoc(collection(db, 'turnos'), turnPayload);
                  console.log("Turno creado con ID:", docRef.id);
                  
                  alert('Turno asignado correctamente');
                  setSelectedFuncionario('');
                  setInicioTurno('');
                  setTerminoTurno('');
                } catch (err) {
                  console.error("Error al asignar turno:", err);
                  alert('Error al asignar turno: ' + (err.message || 'Error desconocido'));
                }
              }}
            >
              Confirmar Asignación
              <ArrowRight size={18} />
            </button>
          </form>
        </div>

        {/* Configuración GPS */}
        <div className="bg-[#1E293B] p-8 rounded-3xl shadow-xl text-white space-y-6 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-primary/20 p-2 rounded-xl text-primary">
              <Navigation size={20} />
            </div>
            <h2 className="font-bold">Parámetros GPS Estratégicos</h2>
          </div>

          <div className="space-y-8 relative z-10 flex-1">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">Latitud de Validación</p>
                  <input 
                    type="text" 
                    value={gpsConfig.lat}
                    onChange={(e) => setGpsConfig(prev => ({ ...prev, lat: e.target.value }))}
                    placeholder="-32.946..."
                    className="w-full bg-transparent border-b border-white/10 py-2 font-mono font-bold text-lg focus:border-primary transition-colors focus:ring-0" 
                  />
                </div>
                <div>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">Longitud de Validación</p>
                  <input 
                    type="text" 
                    value={gpsConfig.lng}
                    onChange={(e) => setGpsConfig(prev => ({ ...prev, lng: e.target.value }))}
                    placeholder="-71.548..."
                    className="w-full bg-transparent border-b border-white/10 py-2 font-mono font-bold text-lg focus:border-primary transition-colors focus:ring-0" 
                  />
                </div>
              </div>
              
              <div className="flex items-start gap-4 pt-4 border-t border-white/5">
                <div className="p-2 bg-success/10 rounded-lg text-success">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white uppercase tracking-tight mb-1">Cerca Geográfica Activa</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    La validación biométrica se activa en un radio de <span className="text-white font-bold">50 metros</span> desde este punto central.
                  </p>
                </div>
              </div>
            </div>

            <div 
              onClick={handleObtenerUbicacion}
              className="bg-white/5 p-6 rounded-2xl border border-white/10 flex items-center gap-4 group cursor-pointer hover:bg-white/10 transition-all"
            >
              <div className="bg-white/10 p-3 rounded-xl group-hover:bg-primary transition-colors">
                <MapPin size={24} />
              </div>
              <div>
                <p className="font-bold text-sm">Obtener ubicación actual</p>
                <p className="text-xs text-gray-400 mt-0.5">Utilizar coordenadas del dispositivo administrativo.</p>
              </div>
            </div>

            <button 
              onClick={handleActualizarGPS}
              disabled={isLoadingGPS}
              className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 mt-auto flex items-center justify-center gap-2"
            >
              {isLoadingGPS ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Guardando...
                </>
              ) : 'Actualizar Georeferencia'}
            </button>
          </div>
        </div>
      </div>

      {/* MÓDULO 3: Upgrade Dashboard de Asignación */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="font-bold text-[#1E293B]">Dashboard de Asignaciones</h2>
              <p className="text-xs text-gray-400 mt-0.5">Control de cobertura y estados de cumplimiento.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-tertiary p-1.5 rounded-2xl">
            <button 
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
            >
              Vista Lista
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
            >
              Vista Calendario
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="p-0">
            <div className="p-6 bg-gray-50/50 border-b border-gray-100">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="search" 
                  placeholder="Filtrar por RUT o Nombre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Funcionario</th>
                    <th className="px-8 py-5">Fecha / Hora</th>
                    <th className="px-8 py-5">Centro</th>
                    <th className="px-8 py-5">Estado</th>
                    <th className="px-8 py-5 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredTurns.length > 0 ? (
                    filteredTurns.map(turn => {
                      const func = (funcionarios || []).find(f => f.rut === turn.funcionarioRut);
                      return (
                        <tr key={turn.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                {func?.nombre?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-secondary">{func?.nombre || 'Funcionario Desconocido'}</p>
                                <p className="text-[10px] text-gray-400 font-mono">{turn.funcionarioRut}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <p className="font-medium text-secondary">{new Date(turn.inicio).toLocaleDateString('es-CL')}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">
                              {new Date(turn.inicio).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                              {new Date(turn.termino).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </p>
                          </td>
                          <td className="px-8 py-5">
                            <span className="text-gray-600 font-medium">{turn.centroSalud}</span>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                              turn.estado === 'completado' || turn.estado === 'completado_manual' ? 'bg-success/10 text-success border-success/20' :
                              turn.estado === 'cancelado_por_usuario' ? 'bg-error/10 text-error border-error/20' :
                              'bg-primary/10 text-primary border-primary/20'
                            }`}>
                              {turn.estado || 'Programado'}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex justify-center">
                              {(turn.estado === 'Ausente' || !turn.estado) && (
                                <button 
                                  onClick={() => setShowManualValidation(turn)}
                                  className="text-xs font-bold text-primary hover:underline uppercase tracking-wider"
                                >
                                  Validación Manual
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-8 py-12 text-center text-gray-400 italic">
                        No hay turnos programados o asignados actualmente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8">
            <div className="grid grid-cols-7 gap-4">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-4">
                  {day}
                </div>
              ))}
              {/* Simple Calendar Grid Mockup */}
              {Array.from({ length: 31 }, (_, i) => (
                <div key={i} className="min-h-[120px] bg-tertiary rounded-2xl p-3 border border-gray-100 flex flex-col gap-2">
                  <span className="text-xs font-bold text-gray-400">{i + 1}</span>
                  {(filteredTurns || []).filter(t => new Date(t.inicio).getDate() === (i + 1)).slice(0, 2).map(t => (
                    <div key={t.id} className={`p-1.5 rounded-lg text-[9px] font-bold truncate ${
                      t.estado === 'completado_manual' ? 'bg-success text-white' : 
                      t.estado === 'cancelado_por_usuario' ? 'bg-error text-white' : 
                      'bg-primary text-white'
                    }`}>
                      {t.funcionarioRut}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Validación Manual */}
      {showManualValidation && (
        <div className="fixed inset-0 bg-secondary/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5 text-primary">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShieldCheck size={20} />
                Validación Manual
              </h3>
              <button onClick={() => setShowManualValidation(null)} className="text-gray-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <p className="text-sm text-gray-500 leading-relaxed">
                Estás forzando el estado del turno a <span className="font-bold text-secondary">Completado Manual</span>. Esto permitirá que el funcionario reciba sus honorarios por este turno.
              </p>
              <div className="space-y-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block">Justificación de la Validación</label>
                <textarea 
                  value={validationJustification}
                  onChange={(e) => setValidationJustification(e.target.value)}
                  placeholder="Ej: Falla masiva de GPS, validado por registro SOME físico..."
                  className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-medium text-secondary focus:ring-2 focus:ring-primary/20 min-h-[120px] resize-none"
                />
              </div>
              <button 
                onClick={handleManualValidation}
                disabled={validating}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-primary-dark transition-all flex items-center justify-center"
              >
                {validating ? <Loader2 className="animate-spin" /> : 'Confirmar Validación'}
              </button>
            </div>
          </div>
        </div>
      )}

        {/* MÓDULO 1: Auditoría y Pruebas GPS (Sandbox) */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6 flex flex-col">
          <div className="flex items-center gap-3">
            <div className="bg-warning/10 p-2 rounded-xl text-warning">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-secondary">Auditoría GPS (Sandbox)</h2>
              <p className="text-xs text-gray-400">Habilita el modo de calibración para un funcionario.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Seleccionar Funcionario</label>
              <select 
                value={selectedFuncionarioSandbox}
                onChange={(e) => setSelectedFuncionarioSandbox(e.target.value)}
                className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Buscar prestador...</option>
                {funcionarios.map(f => (
                  <option key={f.id} value={f.id}>{f.nombre} ({f.rut})</option>
                ))}
              </select>
            </div>
            <button 
              disabled={!selectedFuncionarioSandbox}
              onClick={async () => {
                try {
                  const userRef = doc(db, 'usuarios', selectedFuncionarioSandbox);
                  await updateDoc(userRef, { modoPruebaActivo: true });
                  alert('Modo Sandbox habilitado para el funcionario. Podrá realizar marcajes de prueba sin afectar producción.');
                  setSelectedFuncionarioSandbox('');
                } catch (err) {
                  alert('Error al habilitar modo prueba: ' + err.message);
                }
              }}
              className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                selectedFuncionarioSandbox 
                ? 'bg-warning text-white shadow-lg shadow-warning/20 hover:scale-[1.02]' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Play size={18} fill="currentColor" />
              Habilitar Prueba en Dispositivo
            </button>
            <p className="text-[10px] text-gray-400 italic text-center">
              * El modo sandbox se desactivará automáticamente al marcar salida.
            </p>
          </div>
        </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-secondary/10 p-2 rounded-xl text-secondary">
              <Users size={20} />
            </div>
            <div>
              <h2 className="font-bold text-[#1E293B]">Directorio de Funcionarios</h2>
              <p className="text-xs text-gray-400 mt-0.5">Listado completo de personal asistencial registrado.</p>
            </div>
          </div>
          {loading && <Loader2 className="animate-spin text-primary" size={20} />}
          {error && <span className="text-xs font-bold text-error bg-error/10 px-3 py-1 rounded-full uppercase">{error}</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-8 py-5">Nombre</th>
                <th className="px-8 py-5">RUT</th>
                <th className="px-8 py-5">Estamento / Cargo</th>
                <th className="px-8 py-5 text-center">Cat / Grado</th>
                {isAdminGlobal && <th className="px-8 py-5">Centro</th>}
                <th className="px-8 py-5">Correo Institucional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-8 py-12 text-center text-gray-400 italic">
                    Cargando directorio de funcionarios...
                  </td>
                </tr>
              ) : (funcionarios || []).length > 0 ? (
                (funcionarios || []).map(func => (
                  <tr key={func.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {func.nombre?.charAt(0)}
                        </div>
                        <span className="font-bold text-secondary group-hover:text-primary transition-colors">{func.nombre}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-gray-500 font-mono text-xs">{func.rut}</td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Briefcase size={14} className="text-gray-400" />
                        <span className="text-gray-600">{func.tipoPrestador || 'No definido'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="inline-flex items-center gap-2 bg-tertiary px-3 py-1 rounded-full border border-gray-100">
                        <span className="font-bold text-primary text-xs">{func.categoria || '-'}</span>
                        <span className="text-gray-300">|</span>
                        <span className="font-bold text-secondary text-xs">{func.grado || '-'}</span>
                      </div>
                    </td>
                    {isAdminGlobal && (
                      <td className="px-8 py-5">
                        <span className="text-xs font-bold text-secondary bg-gray-100 px-2 py-1 rounded-lg">
                          {func.centroAsignado || 'Sin Centro'}
                        </span>
                      </td>
                    )}
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        <span className="text-gray-600">{func.correoInstitucional}</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-8 py-12 text-center text-gray-400 italic">
                    No hay funcionarios registrados en el sistema para este centro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nuevo Apartado: Soporte Técnico */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-600">
              <Mail size={24} />
            </div>
            <div>
              <h2 className="font-bold text-[#1E293B]">Correo de Soporte Institucional</h2>
              <p className="text-xs text-gray-400 mt-0.5">Define el destinatario para consultas técnicas de los funcionarios.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="email" 
                placeholder="soporte@cormumel.cl"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full bg-tertiary border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button 
              onClick={async () => {
                if (!supportEmail) return alert('Por favor ingresa un correo válido');
                try {
                  const { doc, setDoc } = await import('firebase/firestore');
                  await setDoc(doc(db, 'configuracion', 'soporte'), { correo: supportEmail }, { merge: true });
                  alert('Correo de soporte actualizado correctamente');
                } catch (err) {
                  console.error(err);
                  alert('Error al actualizar el correo');
                }
              }}
              className="bg-secondary hover:bg-secondary-dark text-white px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-secondary/10"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOperativaView;
