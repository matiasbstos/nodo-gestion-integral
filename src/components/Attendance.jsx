import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Square,
  Settings,
  X,
  Navigation,
  LifeBuoy,
  User,
  Mail,
  ShieldAlert,
  Zap
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  limit, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';

const Attendance = ({ userData, pasoTutorial, setPasoTutorial }) => {
  const [userLocation, setUserLocation] = React.useState(null);
  const [centerLocation, setCenterLocation] = React.useState({ lat: -32.946, lng: -71.548 }); // Default Concón
  const [distance, setDistance] = React.useState(null);
  const [isInsideRadius, setIsInsideRadius] = React.useState(false);
  const [showConfig, setShowConfig] = React.useState(false);
  const [showAbsenceModal, setShowAbsenceModal] = React.useState(false);
  const [absenceReason, setAbsenceReason] = React.useState('');
  const [selectedShiftForAbsence, setSelectedShiftForAbsence] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [currentTime, setCurrentTime] = React.useState(new Date().toLocaleTimeString());
  const [activeTab, setActiveTab] = React.useState('scheduled');
  const [entryTime, setEntryTime] = React.useState(null);
  const [elapsedTime, setElapsedTime] = React.useState('00:00:00');
  const [delayTime, setDelayTime] = React.useState('00:00:00');
  const [isShiftActive, setIsShiftActive] = React.useState(false);
  const [showSupportModal, setShowSupportModal] = React.useState(false);
  const [supportMessage, setSupportMessage] = React.useState('');
  const [adminConfig, setAdminConfig] = React.useState({
    name: 'Nadia Araya Muñoz',
    role: 'Administrador de Plataforma',
    email: 'nadia.araya@cormumel.cl'
  });

  const [todosLosTurnos, setTodosLosTurnos] = React.useState([]);
  const [mockShift, setMockShift] = React.useState(null);

  // MÓDULO: Auto-Scroll y Bloqueo de Pantalla (Tutorial)
  React.useEffect(() => {
    if (pasoTutorial > 0) {
      const targetId = `step-${pasoTutorial}-target`;
      const element = document.getElementById(targetId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [pasoTutorial]);

  React.useEffect(() => {
    if (userData?.modoPruebaActivo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [userData?.modoPruebaActivo]);

  // MÓDULO 1: Inyección de Datos Simulados (Tutorial)
  React.useEffect(() => {
    if (userData?.modoPruebaActivo) {
      setMockShift({ 
        id: 'mock-123', 
        estado: 'pendiente', 
        fechaInicio: Timestamp.now(), 
        fechaFin: Timestamp.fromDate(new Date(Date.now() + 3600000)), 
        centroAsignacion: 'Centro de Capacitación', 
        mock: true 
      });
      setPasoTutorial(1);
      setActiveTab('inbox'); // Inicia en la bandeja de turnos
    } else {
      setMockShift(null);
      setPasoTutorial(0);
    }
  }, [userData?.modoPruebaActivo]);

  // Check roles
  const isAdmin = userData?.role === 'admin_global';
  const isOfficial = userData?.role === 'user' || !userData?.role;

  // Funciones Utilitarias de Fecha
  const isToday = (date) => {
    if (!date) return false;
    const d = date instanceof Date ? date : date.toDate();
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  const isFuture = (date) => {
    if (!date) return false;
    const d = date instanceof Date ? date : date.toDate();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return d > today;
  };

  // Distance calculator (Haversine)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Fetch GPS & All Shifts (Single Source of Truth)
  React.useEffect(() => {
    if (!userData?.rut) return;

    const cleanRut = userData.rut.replace(/[^0-9kK]/g, '');

    // 1. Fetch Global GPS Configuration
    const fetchGps = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'configuracion', 'parametros_gps'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCenterLocation({ 
            lat: data.latitud || -32.946, 
            lng: data.longitud || -71.548,
            radio: data.radio || 50
          });
        }
      } catch (err) {
        console.error("Error fetching GPS config:", err);
      }
    };
    fetchGps();

    // 2. Query Única para TODOS los turnos del usuario (Simplificada para evitar error de índices)
    const q = query(
      collection(db, 'turnos'),
      where('rutFuncionario', '==', cleanRut)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const turnosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // MÓDULO: Sanitización de Datos (Evitar 'Tarjetas Fantasmas')
      const turnosValidos = turnosData.filter(turno => 
        turno.fechaInicio && 
        turno.rutFuncionario && 
        turno.centroAsignacion
      );

      setTodosLosTurnos(turnosValidos);
      setLoading(false);

      // Sincronizar turno activo (en curso)
      const turnoActivo = turnosValidos.find(t => t.estado === 'en_curso');
      if (turnoActivo) {
        setIsShiftActive(true);
        setEntryTime(turnoActivo.entradaReal?.toDate?.() || null);
      } else {
        setIsShiftActive(false);
        setEntryTime(null);
      }
    }, (err) => {
      console.error("Error en onSnapshot principal:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  // Filtros Dinámicos en Memoria (Interceptados por el Tutorial)
  const turnosPendientes = React.useMemo(() => {
    const base = todosLosTurnos.filter(t => t.estado === 'pendiente');
    if (mockShift && mockShift.estado === 'pendiente') return [mockShift, ...base];
    return base;
  }, [todosLosTurnos, mockShift]);

  const turnosHoy = React.useMemo(() => {
    const base = todosLosTurnos.filter(t => (t.estado === 'programado' || t.estado === 'en_curso') && isToday(t.fechaInicio));
    if (mockShift && (mockShift.estado === 'programado' || mockShift.estado === 'en_curso')) return [mockShift, ...base];
    return base;
  }, [todosLosTurnos, mockShift]);

  const turnosProximos = todosLosTurnos.filter(t => t.estado === 'programado' && isFuture(t.fechaInicio));
  const turnosHistorial = todosLosTurnos.filter(t => 
    ['completado', 'completado_manual', 'cancelado_por_usuario', 'ausente'].includes(t.estado)
  );

  // El turno principal para el dashboard es el primero de hoy
  const currentTurnoHoy = turnosHoy[0] || null;

  // MÓDULO: Resumen Semanal (Cálculo dinámico para evitar Crash)
  const weeklySummary = React.useMemo(() => {
    // Calculamos horas de los turnos completados esta semana
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())); // Domingo
    startOfWeek.setHours(0,0,0,0);

    const horasCompletadas = todosLosTurnos
      .filter(t => (t.estado === 'completado' || t.estado === 'completado_manual') && 
              t.fechaInicio?.toDate() >= startOfWeek)
      .reduce((acc, t) => {
        const inicio = t.fechaInicio?.toDate();
        const fin = t.fechaFin?.toDate();
        if (inicio && fin) {
          return acc + ((fin - inicio) / 3600000);
        }
        return acc;
      }, 0);

    return {
      completedHours: Number(horasCompletadas.toFixed(1)),
      totalHours: 44 // Valor estándar APS
    };
  }, [todosLosTurnos]);

  // Geolocation tracking
  React.useEffect(() => {
    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        
        const dist = calculateDistance(latitude, longitude, centerLocation.lat, centerLocation.lng);
        setDistance(dist);
        setIsInsideRadius(dist <= 50); // 50 meters tolerance
      },
      (err) => {
        console.error("Geolocation error:", err.code, err.message);
        if (err.code === 1) {
          alert("Por favor habilita los permisos de ubicación para poder realizar el marcaje.");
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());

      // Active Stopwatch Logic
      if (isShiftActive && entryTime) {
        const diff = now - entryTime;
        setElapsedTime(formatDuration(diff));
      }
      // Delay Logic (only if shift is NOT active and there's a shift today)
      if (!isShiftActive && currentTurnoHoy) {
        const scheduledStartTime = currentTurnoHoy.fechaInicio?.toDate();
        if (scheduledStartTime && now > scheduledStartTime) {
          const diff = now - scheduledStartTime;
          setDelayTime(formatDuration(diff));
        } else {
          setDelayTime('00:00:00');
        }
      } else {
        setDelayTime('00:00:00');
      }
    }, 1000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(timer);
    };
  }, [centerLocation, isShiftActive, entryTime, currentTurnoHoy]);

  const formatDuration = (ms) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  const handleStartShift = async () => {
    // INTERCEPCIÓN TUTORIAL: Cortocircuito temprano para evitar lógica real
    if (userData?.modoPruebaActivo && pasoTutorial === 2) {
      setMockShift(prev => ({ ...prev, estado: 'en_curso', entradaReal: Timestamp.now() }));
      setIsShiftActive(true);
      setEntryTime(new Date());
      setPasoTutorial(3);
      alert("Simulacro: Entrada marcada correctamente. ¡Buen turno!");
      return;
    }

    if (!currentTurnoHoy) return alert("No tienes un turno asignado para hoy.");
    if (!isInsideRadius && !isAdmin) {
      alert("Debes estar en el centro para marcar entrada.");
      return;
    }
    
    try {
      await updateDoc(doc(db, 'turnos', currentTurnoHoy.id), {
        estado: 'en_curso',
        entradaReal: serverTimestamp(),
        ubicacionEntrada: userLocation
      });
      setEntryTime(new Date());
      setIsShiftActive(true);
      alert("Entrada marcada correctamente. ¡Buen turno!");
    } catch (err) {
      console.error(err);
      alert("Error al marcar entrada.");
    }
  };

  const handleEndShift = async () => {
    // INTERCEPCIÓN TUTORIAL: Cortocircuito temprano
    if (userData?.modoPruebaActivo && pasoTutorial === 4) {
      setMockShift(prev => ({ ...prev, estado: 'completado', salidaReal: Timestamp.now() }));
      setIsShiftActive(false);
      setEntryTime(null);
      setElapsedTime('00:00:00');
      setPasoTutorial(6); // SALTO A LA BARRA LATERAL
      alert("¡Marcaje de prueba finalizado! Ahora exploremos el resto de la plataforma.");
      return;
    }

    if (!isShiftActive || !currentTurnoHoy) return;
    
    if (!isInsideRadius && !isAdmin) {
      const confirmForce = window.confirm("Estás fuera del rango del centro. ¿Deseas marcar salida de todos modos? (Quedará registrado para auditoría)");
      if (!confirmForce) return;
    }

    try {
      await updateDoc(doc(db, 'turnos', currentTurnoHoy.id), {
        estado: 'completado',
        salidaReal: serverTimestamp(),
        ubicacionSalida: userLocation,
        duracionRealMs: new Date() - entryTime
      });
      setIsShiftActive(false);
      setEntryTime(null);
      setElapsedTime('00:00:00');
      alert("Turno finalizado correctamente.");
    } catch (err) {
      console.error(err);
      alert("Error al marcar salida.");
    }
  };

  // MÓDULO 3: Guardado Aislado y Auto-apagado (Sandbox)
  const handleSandboxAction = async (tipoAccion) => {
    // INTERCEPCIÓN TUTORIAL: Ausencia (Paso 3)
    if (userData?.modoPruebaActivo && pasoTutorial === 3 && tipoAccion === 'ausencia') {
      setPasoTutorial(4);
      alert("Simulacro: Reporte de ausencia enviado correctamente.");
      return;
    }

    try {
      const { addDoc, collection, serverTimestamp, doc, updateDoc } = await import('firebase/firestore');
      
      // 1. Obtener coordenadas actuales
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        
        // 2. Guardar en colección AISLADA
        await addDoc(collection(db, 'auditoria_gps_pruebas'), {
          rutFuncionario: userData.rut.replace(/[^0-9kK]/g, ''),
          tipoAccion: tipoAccion,
          latitud: latitude,
          longitud: longitude,
          precisionMetros: accuracy,
          timestamp: serverTimestamp()
        });

        // 3. Auto-apagado si es salida o ausencia
        if (tipoAccion === 'salida' || tipoAccion === 'ausencia') {
          if (!pasoTutorial) {
            const userRef = doc(db, 'usuarios', userData.uid || userData.id);
            await updateDoc(userRef, { modoPruebaActivo: false });
            alert('Prueba enviada con éxito. El modo de prueba ha sido desactivado.');
          } else {
            alert(`Simulacro: Registro de ${tipoAccion} enviado correctamente.`);
          }
        } else {
          alert(`Prueba enviada con éxito. Registro de ${tipoAccion} capturado.`);
        }
      }, (err) => {
        alert("Error al capturar ubicación para la prueba: " + err.message);
      }, { enableHighAccuracy: true });

    } catch (err) {
      console.error(err);
      alert("Error en el motor de pruebas.");
    }
  };

  const handleUpdateLocation = async (e) => {
    e.preventDefault();
    const lat = parseFloat(e.target.lat.value);
    const lng = parseFloat(e.target.lng.value);
    
    try {
      await setDoc(doc(db, 'configuracion', 'ubicacion_central'), { lat, lng });
      setCenterLocation({ lat, lng });
      setShowConfig(false);
      alert("Ubicación actualizada correctamente.");
    } catch (err) {
      alert("Error al actualizar la ubicación.");
    }
  };

  const handleAbsenceSubmit = (e) => {
    e.preventDefault();
    console.log("Justificación enviada para turno:", selectedShiftForAbsence, "Razón:", absenceReason);
    setShowAbsenceModal(false);
    setAbsenceReason('');
    setSelectedShiftForAbsence('');
    alert("Ausencia justificada con éxito.");
  };

  const handleAcceptShift = async (shiftId) => {
    try {
      if (shiftId === 'mock-123') {
        setMockShift(prev => ({ ...prev, estado: 'programado' }));
        setActiveTab('scheduled');
        if (pasoTutorial === 1) setPasoTutorial(2);
        alert("Simulacro: Turno aceptado. Se ha integrado a tu agenda de prueba.");
        return;
      }

      await updateDoc(doc(db, 'turnos', shiftId), {
        estado: 'programado'
      });
      alert("Turno aceptado. Se ha integrado a tu calendario.");
    } catch (err) {
      console.error(err);
      alert("Error al aceptar el turno.");
    }
  };

  // MÓDULO 2: Componente Tooltip de Tutorial
  const TooltipTutorial = ({ paso }) => {
    if (!paso) return null;
    
    const content = {
      1: { title: 'Paso 1: Aceptar Turno', text: '¡Bienvenido a la simulación! Para empezar, simulemos que acepta este turno de prueba haciendo clic en ACEPTAR.' },
      2: { title: 'Paso 2: Marcar Entrada', text: '¡Excelente! El turno ahora está en su agenda. Haga clic en INICIAR ENTRADA para que el sistema lea su GPS.' },
      3: { title: 'Paso 3: Registro Activo', text: 'Su marcaje fue exitoso. Vea cómo el cronómetro local empieza a correr. Ahora, pruebe hacer clic en AUSENCIA para ver cómo se reportaría un imprevisto.' },
      4: { title: 'Paso 4: Finalizar', text: 'Finalmente, haga clic en MARCAR SALIDA para detener el cronómetro y finalizar su turno.' }
    };

    if (!content[paso]) return null;

    return (
      <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-bounce-subtle pointer-events-none">
        <div className="bg-primary text-white p-6 rounded-3xl shadow-2xl border-4 border-white/20 backdrop-blur-lg pointer-events-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-xl">
              <Zap size={20} fill="white" />
            </div>
            <p className="font-black uppercase tracking-widest text-[10px]">{content[paso].title}</p>
          </div>
          <p className="text-sm font-medium leading-relaxed">{content[paso].text}</p>
          <div className="mt-4 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest opacity-60">
            <span>Paso {paso} de 4</span>
            <span>Tutorial Interactivo</span>
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className={`p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in ${userData?.modoPruebaActivo ? 'border-4 border-warning/50 rounded-[40px]' : ''}`}>
      {/* MÓDULO: Spotlight Backdrop */}
      {pasoTutorial > 0 && (
        <div className="fixed inset-0 bg-black/70 z-40 transition-opacity animate-fade-in pointer-events-none" />
      )}

      <TooltipTutorial paso={pasoTutorial} />
      {/* Banner de Modo Prueba */}
      {userData?.modoPruebaActivo && (
        <div className="bg-warning text-white p-6 rounded-3xl shadow-lg shadow-warning/20 border border-white/20 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Zap size={28} fill="white" className="animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="font-black uppercase tracking-[1px] text-lg leading-tight mb-1">
                MODO DE PRUEBA DE UBICACIÓN ACTIVO
              </h3>
              <p className="text-sm opacity-90 leading-relaxed font-medium">
                Esta herramienta le permite comprobar si su teléfono está detectando correctamente el GPS del centro de salud. 
                Las marcaciones que haga en este modo son <span className="font-bold underline">simulacros</span> y NO afectarán su asistencia real ni sus honorarios.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Control de Asistencia</h1>
          <p className="text-gray-500 mt-1">Registra tu jornada laboral y revisa tus turnos programados.</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Hora Actual</p>
            <p className="text-xl font-bold text-secondary leading-none">{currentTime}</p>
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowConfig(true)}
              className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary hover:bg-secondary/20 transition-colors"
              title="Configurar Ubicación Central"
            >
              <Settings size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Action - Check In/Out */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card p-8 bg-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary/10 transition-colors duration-500"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <Play size={24} fill="currentColor" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-secondary">Registro de Turno</h2>
                  <p className="text-sm text-gray-400">Presiona para iniciar tu jornada en el centro actual.</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary shadow-sm border border-gray-100">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Ubicación Detectada</p>
                    <p className="text-lg font-bold text-secondary">
                      {isInsideRadius ? 'Dentro del Rango' : 'Fuera de Rango'} 
                      <span className="text-xs font-normal text-gray-400 ml-2">
                        ({distance ? `${Math.round(distance)}m` : 'Buscando...'})
                      </span>
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${isInsideRadius ? 'bg-success/10 text-success border-success/20' : 'bg-error/10 text-error border-error/20'}`}>
                  {isInsideRadius ? 'GPS Validado' : 'Ubicación Requerida'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  id="step-2-target"
                  onClick={handleStartShift}
                  disabled={ (userData?.modoPruebaActivo && pasoTutorial === 2) ? false : ((!isInsideRadius && !isAdmin) || isShiftActive)}
                  className={`flex flex-col items-center justify-center gap-3 p-8 rounded-3xl transition-all shadow-xl active:scale-[0.98] ${
                    isShiftActive && !userData?.modoPruebaActivo
                    ? 'bg-success text-white shadow-success/20'
                    : (isInsideRadius || isAdmin || userData?.modoPruebaActivo
                      ? (userData?.modoPruebaActivo ? 'bg-warning hover:bg-warning-dark' : 'bg-primary hover:bg-primary-dark') + ' text-white shadow-primary/20' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none')
                  } ${pasoTutorial === 2 ? 'relative z-50 ring-8 ring-primary ring-offset-4 ring-offset-black/0 scale-105 shadow-2xl' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isShiftActive || isInsideRadius || isAdmin || userData?.modoPruebaActivo ? 'bg-white/20 backdrop-blur-md' : 'bg-gray-200'}`}>
                    <Play size={28} fill={isShiftActive || isInsideRadius || isAdmin || userData?.modoPruebaActivo ? "white" : "gray"} />
                  </div>
                  <div className="text-center">
                    <span className="text-lg font-bold block">
                      {isShiftActive && !userData?.modoPruebaActivo ? 'Jornada Iniciada' : 'Iniciar Entrada'}
                    </span>
                    {isShiftActive && !userData?.modoPruebaActivo && <span className="text-xs font-mono opacity-80">{elapsedTime}</span>}
                  </div>
                </button>

                <button 
                  id="step-4-target"
                  onClick={handleEndShift}
                  disabled={ (userData?.modoPruebaActivo && pasoTutorial === 4) ? false : !isShiftActive}
                  className={`flex flex-col items-center justify-center gap-3 p-8 rounded-3xl transition-all shadow-xl active:scale-[0.98] ${
                    isShiftActive || userData?.modoPruebaActivo
                    ? 'bg-secondary hover:bg-secondary-dark text-white shadow-secondary/20' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  } ${pasoTutorial === 4 ? 'relative z-50 ring-8 ring-secondary ring-offset-4 ring-offset-black/0 scale-105 shadow-2xl' : ''}`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isShiftActive || userData?.modoPruebaActivo ? 'bg-white/10' : 'bg-gray-200'}`}>
                    <Square size={24} fill={isShiftActive || userData?.modoPruebaActivo ? "white" : "gray"} />
                  </div>
                  <span className="text-lg font-bold">
                    Marcar Salida
                  </span>
                </button>

                <button 
                  id="step-3-target"
                  onClick={userData?.modoPruebaActivo ? () => handleSandboxAction('ausencia') : () => setShowAbsenceModal(true)}
                  disabled={false}
                  className={`flex flex-col items-center justify-center gap-3 p-8 rounded-3xl transition-all shadow-xl active:scale-[0.98] ${
                    userData?.modoPruebaActivo ? 'bg-warning hover:bg-warning-dark' : 'bg-warning hover:bg-warning-dark'
                  } text-white shadow-warning/20 ${pasoTutorial === 3 ? 'relative z-50 ring-8 ring-warning ring-offset-4 ring-offset-black/0 scale-105 shadow-2xl' : ''}`}
                >
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <AlertCircle size={28} />
                  </div>
                  <span className="text-lg font-bold">
                    Ausencia
                  </span>
                </button>
              </div>

              {/* Delay Alert - Dynamic */}
              {!isShiftActive && currentTurnoHoy && delayTime !== '00:00:00' && (
                <div className="mt-8 p-4 bg-error/10 border border-error/20 rounded-2xl flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-error/20 rounded-full flex items-center justify-center text-error">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-error uppercase tracking-wider">Alerta de Retraso</p>
                      <p className="text-sm text-secondary font-bold">
                        Has superado la hora de entrada ({currentTurnoHoy.fechaInicio?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--'})
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-error font-mono">{delayTime}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* New Tabbed Interface */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-gray-100">
              {[
                { id: 'scheduled', label: 'Programados' },
                { id: 'inbox', label: 'Bandeja de Turnos' },
                { id: 'upcoming', label: 'Próximos' },
                { id: 'history', label: 'Historial' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-4 text-sm font-bold transition-all ${
                    activeTab === tab.id 
                    ? 'text-primary border-b-2 border-primary bg-primary/5' 
                    : 'text-gray-400 hover:text-secondary hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="divide-y divide-gray-100">
              {activeTab === 'scheduled' && (
                <div className="p-6 space-y-4">
                  {turnosHoy.length > 0 ? (
                    turnosHoy.map(turno => (
                      <div key={turno.id} className="space-y-4">
                        <div className="flex justify-between items-center text-sm p-3 bg-tertiary rounded-xl border border-gray-100">
                          <span className="text-gray-400">Turno Hoy</span>
                          <span className="font-bold text-secondary">
                            {turno.fechaInicio?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--'} - 
                            {turno.fechaFin?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm p-3 bg-tertiary rounded-xl border border-gray-100">
                          <span className="text-gray-400">Centro</span>
                          <span className="font-bold text-secondary">{turno.centroAsignacion || 'Centro no especificado'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon size={32} className="text-gray-300 mx-auto mb-2 opacity-20" />
                      <p className="text-xs text-gray-400 font-medium">No tienes turnos programados para hoy.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'inbox' && (
                <div className="p-6 space-y-4">
                  {turnosPendientes.length > 0 ? (
                    turnosPendientes.map((shift) => (
                      <div 
                        id={shift.mock && pasoTutorial === 1 ? 'step-1-target' : ''}
                        key={shift.id} 
                        className={`flex items-center justify-between p-4 bg-tertiary rounded-2xl border border-primary/10 hover:border-primary transition-all group ${shift.mock && pasoTutorial === 1 ? 'relative z-50 ring-8 ring-primary ring-offset-4 ring-offset-black/0 scale-105 shadow-2xl bg-white' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex flex-col items-center justify-center border border-gray-100 shadow-sm">
                            <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">
                              {shift.fechaInicio?.toDate?.()?.toLocaleDateString('es-CL', { month: 'short' }) || '---'}
                            </p>
                            <p className="text-sm font-bold text-secondary leading-none mt-1">
                              {shift.fechaInicio?.toDate?.()?.getDate() || '--'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-secondary">
                              {shift.fechaInicio?.toDate?.()?.toLocaleDateString('es-CL', { weekday: 'long' }) || 'Día no especificado'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {shift.centroAsignacion || 'Centro no especificado'} • {shift.fechaInicio?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--'}
                            </p>
                          </div>
                        </div>
                        <button 
                           onClick={() => handleAcceptShift(shift.id)}
                           disabled={false}
                          className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all transform group-hover:scale-105"
                        >
                          Aceptar
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 size={32} className="text-success mx-auto mb-2 opacity-20" />
                      <p className="text-xs text-gray-400 font-medium">No tienes turnos pendientes de aceptación.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'upcoming' && (
                <div className="p-6 space-y-4">
                  {turnosProximos.length > 0 ? (
                    turnosProximos.map((shift) => (
                      <div key={shift.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
                        <div className="w-12 h-12 bg-tertiary rounded-xl flex flex-col items-center justify-center border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase leading-none">
                            {shift.fechaInicio?.toDate?.()?.toLocaleDateString('es-CL', { month: 'short' }) || '---'}
                          </p>
                          <p className="text-sm font-bold text-secondary leading-none mt-1">
                            {shift.fechaInicio?.toDate?.()?.getDate() || '--'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-secondary">
                            {shift.fechaInicio?.toDate?.()?.toLocaleDateString('es-CL', { weekday: 'long' }) || 'Día no especificado'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {shift.centroAsignacion || 'Centro no especificado'} • {shift.fechaInicio?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--'} - {shift.fechaFin?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon size={32} className="text-gray-300 mx-auto mb-2 opacity-20" />
                      <p className="text-xs text-gray-400 font-medium">No tienes turnos próximos programados.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="divide-y divide-gray-100">
                  {turnosHistorial.length > 0 ? (
                    turnosHistorial.map((log) => {
                      const isCompleted = log.estado === 'completado' || log.estado === 'completado_manual';
                      return (
                        <div key={log.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCompleted ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-400'}`}>
                              <CalendarIcon size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-secondary text-sm">
                                {log.fechaInicio?.toDate?.()?.toLocaleDateString('es-CL', { day: '2-digit', month: 'long' }) || 'Fecha no disponible'}
                              </p>
                              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{log.centroAsignacion || 'Centro no especificado'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-center">
                              <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Entrada</p>
                              <p className="text-xs font-bold text-secondary">
                                {log.entradaReal?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '--:--'}
                              </p>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${isCompleted ? 'bg-success/10 text-success border-success/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                              {log.estado || 'Finalizado'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <Clock size={32} className="text-gray-300 mx-auto mb-2 opacity-20" />
                      <p className="text-xs text-gray-400 font-medium">Aún no hay registro de turnos históricos.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel - Turnos & Reglas */}
        <div className="space-y-8">
          <div className="card p-6 border-l-4 border-l-primary">
            <div className="flex items-center gap-2 mb-6">
              <CalendarIcon size={20} className="text-primary" />
              <h2 className="text-lg font-bold text-secondary">Resumen Semanal</h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Horas Cumplidas</span>
                <span className="font-bold text-secondary">{weeklySummary.completedHours} / {weeklySummary.totalHours} hrs</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-1000" 
                  style={{ width: `${(weeklySummary.completedHours / weeklySummary.totalHours) * 100}%` }}
                ></div>
              </div>
              
              <div className="pt-4 mt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-warning">
                  <AlertCircle size={16} />
                  <p className="text-xs font-bold uppercase tracking-tight">Reglas de Marcaje</p>
                </div>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Para que el turno sea validado, el GPS debe detectar tu presencia en un radio de 50m.
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-secondary to-secondary-dark text-white">
            <h2 className="font-bold mb-4">Información de Soporte</h2>
            <p className="text-xs text-gray-400 leading-relaxed mb-6">
              Si tienes problemas con el GPS o el cronómetro, contacta a la mesa de ayuda de Nodo.
            </p>
            <button 
              onClick={() => setShowSupportModal(true)}
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-all border border-white/10"
            >
              Solicitar Soporte
            </button>
          </div>
        </div>
      </div>
      {/* Modals */}
      {showConfig && (
        <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
                <Navigation className="text-primary" size={20} />
                Ubicación del Centro
              </h3>
              <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateLocation} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Latitud</label>
                  <input 
                    name="lat"
                    type="number" 
                    step="any"
                    defaultValue={centerLocation.lat}
                    className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Longitud</label>
                  <input 
                    name="lng"
                    type="number" 
                    step="any"
                    defaultValue={centerLocation.lng}
                    className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed italic">
                * Estas coordenadas definen el punto central para el radio de marcaje de 50 metros.
              </p>
              <button type="submit" className="w-full btn-primary py-4 text-lg">
                Guardar Configuración
              </button>
            </form>
          </div>
        </div>
      )}

      {showAbsenceModal && (
        <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-warning/10">
              <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
                <AlertCircle className="text-warning" size={20} />
                Justificar Ausencia
              </h3>
              <button onClick={() => setShowAbsenceModal(false)} className="text-gray-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAbsenceSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Motivo de la Ausencia</label>
                  <textarea 
                    value={absenceReason}
                    onChange={(e) => setAbsenceReason(e.target.value)}
                    placeholder="Describe el motivo de tu ausencia (Licencia, permiso, etc.)..."
                    className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px] resize-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Seleccionar Turno</label>
                  <select 
                    value={selectedShiftForAbsence}
                    onChange={(e) => setSelectedShiftForAbsence(e.target.value)}
                    className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-secondary"
                    required
                  >
                    <option value="">Selecciona un turno...</option>
                    {currentTurnoHoy && (
                      <option value={currentTurnoHoy.id}>
                        Hoy: {currentTurnoHoy.fechaInicio?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </option>
                    )}
                    {turnosProximos.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.fechaInicio?.toDate().toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}: {s.fechaInicio?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-warning hover:bg-warning-dark text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-warning/20">
                Enviar Justificación
              </button>
            </form>
          </div>
        </div>
      )}

      {showSupportModal && (
        <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5">
              <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
                <LifeBuoy className="text-primary" size={20} />
                Centro de Ayuda y Soporte
              </h3>
              <button onClick={() => setShowSupportModal(false)} className="text-gray-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* SLA Info */}
              <div className="bg-tertiary rounded-2xl p-5 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldAlert size={12} className="text-primary" />
                  Información del Administrador
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary border border-gray-100">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-secondary">{adminConfig.name}</p>
                      <p className="text-[10px] text-gray-400">{adminConfig.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary border border-gray-100">
                      <Mail size={16} />
                    </div>
                    <p className="text-xs font-bold text-secondary">{adminConfig.email}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200/50">
                  <p className="text-[11px] text-secondary font-medium leading-relaxed">
                    <span className="text-primary font-bold">Nota:</span> Se dará una respuesta y solución técnica en un plazo máximo de <span className="font-bold underline text-primary">48 horas hábiles</span>.
                  </p>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                alert('Tu incidencia ha sido reportada con éxito. Recibirás un correo de seguimiento.');
                setShowSupportModal(false);
                setSupportMessage('');
              }} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Descripción del Problema</label>
                  <textarea 
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe detalladamente el inconveniente técnico..."
                    className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all min-h-[120px] resize-none text-sm"
                    required
                  />
                </div>
                <button type="submit" className="w-full btn-primary py-4 text-lg">
                  Reportar Incidencia
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
