import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  User, 
  UserCheck, 
  UserX, 
  Clock, 
  AlertTriangle, 
  Activity, 
  Truck, 
  ShieldAlert, 
  UserPlus, 
  FileText, 
  Search, 
  Loader2, 
  Info,
  CalendarDays,
  Layers,
  HeartPulse,
  Heart,
  TrendingUp,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';

const ShiftPlannerView = ({ userData }) => {
  // Navigation & View States
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'daily'
  const [selectedShift, setSelectedShift] = useState('Turno 1'); // 'Turno 1', 'Turno 2', 'Turno 3', 'Refuerzo'
  
  // Data States
  const [turnos, setTurnos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCenter, setSelectedCenter] = useState('SAR Arpillerista Elsa Romo Aravena');

  // Modals & Panels
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignRole, setAssignRole] = useState(''); // e.g. 'Jefe de Turno', 'TENS Rayos', 'Médico', etc.
  const [assignShift, setAssignShift] = useState('Turno 1');
  const [searchFuncionarioQuery, setSearchFuncionarioQuery] = useState('');

  const [showIncidenceModal, setShowIncidenceModal] = useState(null); // The shift object to report incidence
  const [incidenceType, setIncidenceType] = useState('licencia_medica'); // 'licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'
  const [incidenceDetail, setIncidenceDetail] = useState('');
  
  const [showReassignModal, setShowReassignModal] = useState(null); // The shift object to reassign
  const [searchReassignmentQuery, setSearchReassignmentQuery] = useState('');

  const [selectedFuncionarioProfile, setSelectedFuncionarioProfile] = useState(null); // To view detail/history
  const [profileHistory, setProfileHistory] = useState([]);
  const [loadingProfileHistory, setLoadingProfileHistory] = useState(false);
  const [showReinforcementDropdown, setShowReinforcementDropdown] = useState(false);

  const centrosRed = [
    'SAR Arpillerista Elsa Romo Aravena'
  ];

  const shiftTemplates = ['Turno 1', 'Turno 2', 'Turno 3', 'Refuerzo'];

  const baseRoles = [
    { key: 'jefe', label: 'Enfermero Jefe de Turno', icon: Activity, estamento: 'Enfermero' },
    { key: 'tens_rayos', label: 'TENS Rayos', icon: HeartPulse, estamento: 'TENS' },
    { key: 'tens_vacunas', label: 'TENS Vacunas', icon: HeartPulse, estamento: 'TENS' },
    { key: 'tens_ambulancia', label: 'TENS Ambulancia', icon: HeartPulse, estamento: 'TENS' },
    { key: 'conductor', label: 'Conductor de Ambulancia', icon: Truck, estamento: 'Conductor' },
    { key: 'administrativo', label: 'Administrativo', icon: UserCheck, estamento: 'Administrativo' },
    { key: 'auxiliar', label: 'Auxiliar de Servicio', icon: User, estamento: 'Auxiliar' }
  ];

  const reinforcementRoles = [
    { key: 'refuerzo_tens', label: 'Refuerzo TENS', estamento: 'TENS' },
    { key: 'refuerzo_enfermeria', label: 'Refuerzo Enfermería', estamento: 'Enfermero' },
    { key: 'refuerzo_conductor', label: 'Refuerzo Conductor', estamento: 'Conductor' },
    { key: 'refuerzo_administrativo', label: 'Refuerzo Administrativo', estamento: 'Administrativo' },
    { key: 'refuerzo_auxiliar', label: 'Refuerzo Auxiliar', estamento: 'Auxiliar' }
  ];

  // Fetch all data
  useEffect(() => {
    fetchData();
  }, [currentDate, selectedCenter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all system users (to build availability pools)
      const usersQuery = query(collection(db, 'usuarios'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFuncionarios(usersList);

      // 2. Fetch turns for the current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const turnsQuery = query(
        collection(db, 'turnos'),
        where('centroAsignacion', '==', selectedCenter)
      );
      const turnsSnapshot = await getDocs(turnsQuery);
      const turnsList = turnsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          inicio: data.fechaInicio?.toDate() || data.inicio,
          termino: data.fechaFin?.toDate() || data.termino
        };
      });

      // Filter local month range in Javascript for robustness
      const filteredTurns = turnsList.filter(t => {
        if (!t.inicio) return false;
        const turnTime = new Date(t.inicio).getTime();
        return turnTime >= startOfMonth.getTime() && turnTime <= endOfMonth.getTime();
      });

      setTurnos(filteredTurns);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper to fetch history for a selected user profile drawer
  const fetchUserProfileHistory = async (funcionario) => {
    setLoadingProfileHistory(true);
    try {
      const q = query(
        collection(db, 'turnos'),
        where('rutFuncionario', '==', funcionario.rut)
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          inicio: data.fechaInicio?.toDate() || data.inicio,
          termino: data.fechaFin?.toDate() || data.termino
        };
      }).sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
      setProfileHistory(docs);
    } catch (err) {
      console.error("Error loading user profile history:", err);
    } finally {
      setLoadingProfileHistory(false);
    }
  };

  const handleOpenProfileDrawer = (funcionario) => {
    setSelectedFuncionarioProfile(funcionario);
    fetchUserProfileHistory(funcionario);
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate calendar days for the current month view
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday is 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    // Adjust Sunday to 6 (Monday first)
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    
    const days = [];
    
    // Padding from previous month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = adjustedFirstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Padding from next month
    const remainingSlots = 42 - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push({
        day: i,
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  // Check turns on a specific calendar day
  const getTurnsForDay = (date) => {
    return turnos.filter(t => {
      if (!t.inicio) return false;
      const turnDate = new Date(t.inicio);
      return (
        turnDate.getDate() === date.getDate() &&
        turnDate.getMonth() === date.getMonth() &&
        turnDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Action: Add / Assign Shift to a Role
  const handleConfirmAssignment = async (funcionario) => {
    if (!funcionario) return;

    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();

      // Configure time ranges depending on the shift
      let startHours = 8, startMins = 0;
      let endHours = 20, endMins = 0;

      if (assignShift === 'Turno B') {
        startHours = 20;
        endHours = 8; // Next day
      } else if (assignShift === 'Turno C') {
        startHours = 12;
        endHours = 20;
      }

      const inicio = new Date(year, month, day, startHours, startMins);
      const termino = new Date(year, month, day, endHours, endMins);
      if (assignShift === 'Turno B') {
        termino.setDate(termino.getDate() + 1); // Ends next morning
      }

      const { Timestamp } = await import('firebase/firestore');

      const payload = {
        funcionarioId: funcionario.id,
        rutFuncionario: funcionario.rut,
        nombreFuncionario: funcionario.nombre,
        estado: 'programado',
        fechaInicio: Timestamp.fromDate(inicio),
        fechaFin: Timestamp.fromDate(termino),
        centroAsignacion: selectedCenter,
        rolTurno: assignRole,
        tipoTurno: assignShift,
        asignadoPor: userData?.nombre || "Administrador",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'turnos'), payload);
      
      // Update local state
      const newTurn = {
        id: docRef.id,
        ...payload,
        inicio,
        termino
      };
      setTurnos(prev => [...prev, newTurn]);
      setShowAssignModal(false);
      setSearchFuncionarioQuery('');
    } catch (err) {
      console.error("Error creating shift assignment:", err);
      alert("Error al guardar la asignación: " + err.message);
    }
  };

  // Action: Register Inasistencia (Incidence)
  const handleRegisterIncidence = async () => {
    if (!showIncidenceModal) return;

    try {
      const userRef = doc(db, 'turnos', showIncidenceModal.id);
      await updateDoc(userRef, {
        estado: incidenceType,
        motivoIncidencia: incidenceDetail,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setTurnos(prev => prev.map(t => 
        t.id === showIncidenceModal.id 
          ? { ...t, estado: incidenceType, motivoIncidencia: incidenceDetail } 
          : t
      ));

      // Trigger replacement modal directly if we want
      const updatedTurn = { ...showIncidenceModal, estado: incidenceType, motivoIncidencia: incidenceDetail };
      setShowIncidenceModal(null);
      setIncidenceDetail('');
      
      // Suggest replacement
      setShowReassignModal(updatedTurn);
    } catch (err) {
      console.error("Error updating incidence:", err);
      alert("No se pudo registrar la incidencia.");
    }
  };

  // Action: Assign Replacement Worker
  const handleConfirmReplacement = async (replacementFuncionario) => {
    if (!showReassignModal || !replacementFuncionario) return;

    try {
      const { Timestamp } = await import('firebase/firestore');
      
      // 1. Mark original turn as 'reemplazado'
      const originalRef = doc(db, 'turnos', showReassignModal.id);
      await updateDoc(originalRef, {
        estado: 'reemplazado',
        reemplazadoPor: replacementFuncionario.nombre,
        reemplazadoPorRut: replacementFuncionario.rut,
        updatedAt: serverTimestamp()
      });

      // 2. Create the replacement turn
      const replacementPayload = {
        funcionarioId: replacementFuncionario.id,
        rutFuncionario: replacementFuncionario.rut,
        nombreFuncionario: replacementFuncionario.nombre,
        estado: 'programado',
        fechaInicio: Timestamp.fromDate(new Date(showReassignModal.inicio)),
        fechaFin: Timestamp.fromDate(new Date(showReassignModal.termino)),
        centroAsignacion: selectedCenter,
        rolTurno: showReassignModal.rolTurno,
        tipoTurno: showReassignModal.tipoTurno,
        esReemplazo: true,
        reemplazaA: showReassignModal.nombreFuncionario,
        reemplazaARut: showReassignModal.rutFuncionario,
        asignadoPor: userData?.nombre || "Administrador",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'turnos'), replacementPayload);

      // Update local state
      setTurnos(prev => {
        // Update original
        let list = prev.map(t => 
          t.id === showReassignModal.id 
            ? { ...t, estado: 'reemplazado', reemplazadoPor: replacementFuncionario.nombre, reemplazadoPorRut: replacementFuncionario.rut } 
            : t
        );
        // Push replacement
        list.push({
          id: docRef.id,
          ...replacementPayload,
          inicio: new Date(showReassignModal.inicio),
          termino: new Date(showReassignModal.termino)
        });
        return list;
      });

      setShowReassignModal(null);
      setSearchReassignmentQuery('');
      alert(`¡Reemplazo exitoso! ${replacementFuncionario.nombre} ha tomado el turno de ${showReassignModal.nombreFuncionario}.`);
    } catch (err) {
      console.error("Error setting replacement:", err);
      alert("Error al procesar el reemplazo.");
    }
  };

  // Action: Delete/Cancel Shift
  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar permanentemente esta asignación de turno?")) return;

    try {
      await deleteDoc(doc(db, 'turnos', shiftId));
      setTurnos(prev => prev.filter(t => t.id !== shiftId));
    } catch (err) {
      console.error("Error deleting shift:", err);
      alert("No se pudo eliminar el turno.");
    }
  };

  // Filters for available workers (excludes already assigned to prevent double booking)
  const getAvailableFuncionarios = (roleEstamento, date, startTime, endTime) => {
    // Exclude workers already working during this day/range
    const busyRuts = turnos
      .filter(t => {
        // Overlap check
        const tStart = new Date(t.inicio).getTime();
        const tEnd = new Date(t.termino).getTime();
        
        // Use a wide check (same day range) or precise range
        // For simple check: same day and active state (not replaced/canceled)
        const tDay = new Date(t.inicio).toLocaleDateString();
        const checkDay = new Date(date).toLocaleDateString();
        
        return tDay === checkDay && !['reemplazado', 'cancelado_por_usuario', 'licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(t.estado);
      })
      .map(t => t.rutFuncionario);

    return funcionarios.filter(f => {
      // Must match estamento
      const matchEstamento = f.tipoPrestador?.toLowerCase() === roleEstamento?.toLowerCase();
      // Must not be busy
      const isNotBusy = !busyRuts.includes(f.rut);
      // Query filter
      const matchesSearch = f.nombre?.toLowerCase().includes(searchFuncionarioQuery.toLowerCase()) || f.rut?.includes(searchFuncionarioQuery);
      
      return matchEstamento && isNotBusy && matchesSearch;
    });
  };

  const getAvailableReplacements = (date) => {
    const busyRuts = turnos
      .filter(t => {
        const tDay = new Date(t.inicio).toLocaleDateString();
        const checkDay = new Date(date).toLocaleDateString();
        return tDay === checkDay && !['reemplazado', 'cancelado_por_usuario', 'licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(t.estado);
      })
      .map(t => t.rutFuncionario);

    return funcionarios.filter(f => {
      const matchesSearch = f.nombre?.toLowerCase().includes(searchReassignmentQuery.toLowerCase()) || f.rut?.includes(searchReassignmentQuery);
      const isNotBusy = !busyRuts.includes(f.rut);
      return isNotBusy && matchesSearch;
    });
  };

  // Stats calculation for the profile drawer
  const getFuncionarioStats = () => {
    if (!profileHistory || profileHistory.length === 0) return { scheduled: 0, completed: 0, absences: 0, hours: 0 };
    
    // Filter to current month
    const curMonth = currentDate.getMonth();
    const curYear = currentDate.getFullYear();
    const monthTurns = profileHistory.filter(t => {
      const d = new Date(t.inicio);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    });

    const absences = monthTurns.filter(t => ['licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(t.estado)).length;
    const completed = monthTurns.filter(t => ['completado', 'completado_manual'].includes(t.estado)).length;
    const scheduled = monthTurns.filter(t => t.estado === 'programado' || t.estado === 'pendiente').length;

    let totalHours = 0;
    monthTurns.forEach(t => {
      if (['completado', 'completado_manual', 'programado'].includes(t.estado)) {
        const hrs = t.horasValidadas || (new Date(t.termino) - new Date(t.inicio)) / 3600000;
        totalHours += hrs;
      }
    });

    return {
      scheduled,
      completed,
      absences,
      hours: Math.round(totalHours)
    };
  };

  const currentMonthName = currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const selectedDayTurns = getTurnsForDay(selectedDate);

  return (
    <div className="relative text-[#1E293B] bg-[#F8FAFC] min-h-screen w-full">
      {/* Container with fade-in animation */}
      <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#1E293B] tracking-tight flex items-center gap-3">
            <CalendarDays className="text-primary" size={32} />
            Planificador Estratégico de Turnos
          </h1>
          <p className="text-gray-500 mt-1">Planilla y gestión de roles base, refuerzos e inasistencias en tiempo real.</p>
        </div>

        {/* Filters and Controls */}
        <div className="flex flex-wrap items-center gap-4">
          <select 
            value={selectedCenter} 
            onChange={(e) => setSelectedCenter(e.target.value)}
            className="bg-white border border-gray-200 text-sm font-bold text-secondary px-4 py-3 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            {centrosRed.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-1">
            <button 
              onClick={() => setViewMode('monthly')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'monthly' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-secondary'}`}
            >
              Grilla Mensual
            </button>
            <button 
              onClick={() => setViewMode('daily')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'daily' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-secondary'}`}
            >
              Planilla Diaria
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[500px] flex flex-col items-center justify-center gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <Loader2 className="animate-spin text-primary" size={48} />
          <p className="text-gray-500 font-bold text-sm">Cargando planificación y disponibilidad...</p>
        </div>
      ) : (
        <>
          {/* MONTHLY CALENDAR VIEW */}
          {viewMode === 'monthly' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
              
              {/* Calendar Header Navigation */}
              <div className="flex items-center justify-between">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-all border border-gray-100 shadow-sm"
                >
                  <ChevronLeft size={20} className="text-secondary" />
                </button>
                <h2 className="text-xl font-bold text-secondary uppercase tracking-wider">{currentMonthName}</h2>
                <button 
                  onClick={handleNextMonth}
                  className="p-2.5 hover:bg-gray-100 rounded-xl transition-all border border-gray-100 shadow-sm"
                >
                  <ChevronRight size={20} className="text-secondary" />
                </button>
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-7 gap-3 text-center">
                {/* Week days labels */}
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                  <div key={day} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">
                    {day}
                  </div>
                ))}

                {/* Days of month */}
                {getDaysInMonth().map((dayObj, index) => {
                  const dayTurns = getTurnsForDay(dayObj.date);
                  
                  // Compute daily status indicators
                  const activeTurnsCount = dayTurns.filter(t => !['reemplazado', 'cancelado_por_usuario'].includes(t.estado)).length;
                  const incidentCount = dayTurns.filter(t => ['licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(t.estado)).length;
                  
                  // Stylings
                  const isToday = new Date().toDateString() === dayObj.date.toDateString();
                  const isSelected = selectedDate.toDateString() === dayObj.date.toDateString();

                  return (
                    <button 
                      key={index} 
                      onClick={() => {
                        setSelectedDate(dayObj.date);
                        setViewMode('daily');
                      }}
                      className={`min-h-[120px] rounded-2xl p-3 border text-left flex flex-col justify-between transition-all hover:shadow-md group ${
                        dayObj.isCurrentMonth ? 'bg-white' : 'bg-gray-50/50 opacity-60'
                      } ${
                        isSelected 
                          ? 'border-primary ring-2 ring-primary/10 bg-primary/5' 
                          : isToday 
                            ? 'border-success ring-1 ring-success/10 bg-success/5' 
                            : 'border-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${
                          isSelected ? 'text-primary' : isToday ? 'text-success' : 'text-gray-400 group-hover:text-secondary'
                        }`}>{dayObj.day}</span>
                        {activeTurnsCount > 0 && (
                          <span className="text-[9px] bg-secondary/5 text-secondary px-1.5 py-0.5 rounded-lg font-bold">
                            {activeTurnsCount} roles
                          </span>
                        )}
                      </div>

                      {/* Summary turns list */}
                      <div className="space-y-1 w-full my-2 flex-1 flex flex-col justify-end">
                        {dayTurns.slice(0, 3).map(turn => {
                          const isIncident = ['licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(turn.estado);
                          const isReplaced = turn.estado === 'reemplazado';
                          return (
                            <div 
                              key={turn.id} 
                              className={`px-2 py-0.5 rounded text-[9px] font-bold truncate flex items-center justify-between ${
                                isIncident 
                                  ? 'bg-error/10 text-error' 
                                  : isReplaced 
                                    ? 'bg-gray-100 text-gray-400 line-through' 
                                    : 'bg-primary/10 text-primary'
                              }`}
                            >
                              <span>{turn.nombreFuncionario?.split(' ')[0]}</span>
                              <span className="opacity-60 text-[8px] font-medium">{turn.rolTurno?.substring(0, 4)}</span>
                            </div>
                          );
                        })}
                        {dayTurns.length > 3 && (
                          <p className="text-[8px] text-gray-400 font-bold text-right">+{dayTurns.length - 3} más</p>
                        )}
                      </div>

                      {/* Incident Alerts */}
                      {incidentCount > 0 && (
                        <div className="flex items-center gap-1 text-error text-[8px] font-bold uppercase tracking-wider">
                          <AlertTriangle size={10} />
                          {incidentCount} alerta{incidentCount > 1 ? 's' : ''}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* DAILY DETAILED SHIFT PLAN SHEET */}
          {viewMode === 'daily' && (
            <div className="space-y-6">
              
              {/* Daily Navigation bar */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setViewMode('monthly')}
                    className="btn-secondary px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-gray-200"
                  >
                    <ChevronLeft size={16} /> Volver al Mes
                  </button>
                  <div>
                    <h2 className="text-xl font-bold text-secondary">
                      Planilla del {selectedDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h2>
                    <p className="text-xs text-gray-400 font-medium">Asignaciones correspondientes a los tres turnos rotativos.</p>
                  </div>
                </div>

                {/* Shift Selector Buttons */}
                <div className="flex items-center gap-2 bg-tertiary p-1.5 rounded-2xl border border-gray-100 flex-wrap">
                  {shiftTemplates.map(shift => {
                    const isSelected = selectedShift === shift;
                    const shiftBadgeColor = shift === 'Turno 1' ? 'bg-emerald-600 text-white' :
                                            shift === 'Turno 2' ? 'bg-amber-500 text-white' :
                                            shift === 'Turno 3' ? 'bg-sky-600 text-white' :
                                            'bg-purple-600 text-white';
                    return (
                      <button
                        key={shift}
                        onClick={() => setSelectedShift(shift)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                          isSelected ? `${shiftBadgeColor} shadow-md scale-[1.02]` : 'text-gray-500 hover:text-secondary bg-white border border-gray-200'
                        }`}
                      >
                        {shift}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* THREE SHIFTS ROW LAYOUT */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                
                {/* 1. Base Roles Panel */}
                <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-primary/5 text-primary">
                    <h3 className="font-extrabold flex items-center gap-2">
                      <Layers size={18} />
                      Personal Base Fijo ({selectedShift})
                    </h3>
                    <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      7 Roles Requeridos
                    </span>
                  </div>

                  <div className="p-6 space-y-4">
                    {baseRoles.map(role => {
                      // Find if this slot is filled in this day & shift
                      const assignedTurn = selectedDayTurns.find(t => t.rolTurno === role.label && t.tipoTurno === selectedShift);
                      const isIncident = assignedTurn && ['licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(assignedTurn.estado);
                      const isReplaced = assignedTurn && assignedTurn.estado === 'reemplazado';

                      return (
                        <div key={role.key} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border border-gray-100 hover:bg-gray-50/50 transition-all gap-4">
                          
                          {/* Role label & icon */}
                          <div className="flex items-center gap-3 md:w-1/3">
                            <div className="p-2 bg-gray-100 rounded-xl text-gray-500">
                              <role.icon size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-secondary text-sm">{role.label}</p>
                              <span className="text-[10px] bg-gray-200/50 text-gray-500 font-bold px-1.5 py-0.5 rounded uppercase tracking-widest">{role.estamento}</span>
                            </div>
                          </div>

                          {/* Assignment Status Card */}
                          <div className="flex-1">
                            {assignedTurn ? (
                              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                                isIncident 
                                  ? 'bg-error/5 border-error/20 text-error' 
                                  : isReplaced 
                                    ? 'bg-gray-50 border-gray-200 text-gray-400' 
                                    : 'bg-primary/5 border-primary/20 text-primary'
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                    isIncident ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'
                                  }`}>
                                    {assignedTurn.nombreFuncionario?.charAt(0)}
                                  </div>
                                  <div>
                                    <button 
                                      onClick={() => handleOpenProfileDrawer({ rut: assignedTurn.rutFuncionario, nombre: assignedTurn.nombreFuncionario })}
                                      className="font-bold hover:underline text-left text-sm text-secondary"
                                    >
                                      {assignedTurn.nombreFuncionario}
                                    </button>
                                    <p className="text-[9px] opacity-75 font-medium">RUT: {assignedTurn.rutFuncionario} {assignedTurn.esReemplazo && "• Reemplazo"}</p>
                                  </div>
                                </div>

                                {/* Status details / Badges */}
                                <div className="flex items-center gap-3">
                                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                    isIncident 
                                      ? 'bg-error text-white' 
                                      : isReplaced 
                                        ? 'bg-gray-200 text-gray-600' 
                                        : 'bg-primary text-white'
                                  }`}>
                                    {assignedTurn.estado?.replace('_', ' ')}
                                  </span>

                                  {/* Delete shift action */}
                                  <button 
                                    onClick={() => handleDeleteShift(assignedTurn.id)}
                                    className="text-gray-400 hover:text-error transition-all"
                                    title="Eliminar asignación"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                onClick={() => {
                                  setAssignRole(role.label);
                                  setAssignShift(selectedShift);
                                  setShowAssignModal(true);
                                }}
                                className="w-full py-4 border-2 border-dashed border-gray-200 hover:border-primary/50 text-gray-400 hover:text-primary transition-all rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest"
                              >
                                <Plus size={16} /> Asignar {role.label}
                              </button>
                            )}
                          </div>

                          {/* Quick Actions Column */}
                          {assignedTurn && (
                            <div className="flex gap-2 justify-end">
                              {/* Report Incidence if healthy */}
                              {!isIncident && !isReplaced && (
                                <button 
                                  onClick={() => setShowIncidenceModal(assignedTurn)}
                                  className="btn-secondary py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-error border-error/10 hover:bg-error/5 rounded-xl transition-all"
                                >
                                  <UserX size={14} /> Registrar Inasistencia
                                </button>
                              )}
                              {/* Trigger Reassignment if absent */}
                              {isIncident && (
                                <button 
                                  onClick={() => setShowReassignModal(assignedTurn)}
                                  className="btn-primary py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-xl transition-all bg-primary text-white"
                                >
                                  <UserPlus size={14} /> Reasignar Reemplazo
                                </button>
                              )}
                              {isReplaced && (
                                <div className="text-[10px] text-gray-400 font-bold uppercase">
                                  Cubierto por {assignedTurn.reemplazadoPor?.split(' ')[0]}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Doctors & Reinforcements Panel */}
                <div className="space-y-6">
                  
                  {/* Doctors Panel */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-secondary/5 text-secondary">
                      <h3 className="font-extrabold flex items-center gap-2">
                        <Heart size={18} className="text-secondary" />
                        Médicos en Turno
                      </h3>
                      <button 
                        onClick={() => {
                          setAssignRole('Médico');
                          setAssignShift(selectedShift);
                          setShowAssignModal(true);
                        }}
                        className="bg-secondary/10 hover:bg-secondary/20 text-secondary p-1.5 rounded-xl transition-all"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                      {selectedDayTurns.filter(t => t.rolTurno === 'Médico' && t.tipoTurno === selectedShift).length > 0 ? (
                        selectedDayTurns.filter(t => t.rolTurno === 'Médico' && t.tipoTurno === selectedShift).map(docTurn => {
                          const isIncident = ['licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(docTurn.estado);
                          const isReplaced = docTurn.estado === 'reemplazado';
                          return (
                            <div key={docTurn.id} className="p-4 rounded-2xl border border-gray-100 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs">Dr</div>
                                  <div>
                                    <button 
                                      onClick={() => handleOpenProfileDrawer({ rut: docTurn.rutFuncionario, nombre: docTurn.nombreFuncionario })}
                                      className="font-bold text-sm text-secondary hover:underline text-left block"
                                    >
                                      {docTurn.nombreFuncionario}
                                    </button>
                                    <span className="text-[9px] text-gray-400 font-bold uppercase">Estado: {docTurn.estado?.replace('_', ' ')}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteShift(docTurn.id)}
                                  className="text-gray-400 hover:text-error"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <div className="flex gap-2 justify-end">
                                {!isIncident && !isReplaced && (
                                  <button 
                                    onClick={() => setShowIncidenceModal(docTurn)}
                                    className="text-[10px] text-error hover:underline uppercase font-bold tracking-wider"
                                  >
                                    Reportar Inasistencia
                                  </button>
                                )}
                                {isIncident && (
                                  <button 
                                    onClick={() => setShowReassignModal(docTurn)}
                                    className="bg-primary text-white text-[10px] px-3 py-1 rounded-xl uppercase font-bold tracking-wider hover:bg-primary-dark transition-all"
                                  >
                                    Buscar Reemplazo
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-gray-400 italic text-sm">
                          Sin médicos asignados para este turno.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reinforcements Panel */}
                  <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-violet-50 text-violet-700">
                      <h3 className="font-extrabold flex items-center gap-2">
                        <Plus size={18} />
                        Personal de Refuerzo
                      </h3>
                      <div className="relative">
                        <button 
                          onClick={() => setShowReinforcementDropdown(!showReinforcementDropdown)}
                          className="bg-violet-100 hover:bg-violet-200 text-xs font-bold text-violet-700 rounded-xl px-3.5 py-2 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus size={14} />
                          Agregar Refuerzo
                        </button>
                        
                        {showReinforcementDropdown && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setShowReinforcementDropdown(false)} 
                            />
                            
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 animate-scale-in">
                              <div className="px-4 py-2 border-b border-gray-50">
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Seleccionar Especialidad</p>
                              </div>
                              {reinforcementRoles.map(role => (
                                <button
                                  key={role.key}
                                  onClick={() => {
                                    setAssignRole(role.label);
                                    setAssignShift(selectedShift);
                                    setShowAssignModal(true);
                                    setShowReinforcementDropdown(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold text-secondary hover:bg-violet-50 hover:text-violet-700 transition-colors flex items-center justify-between cursor-pointer"
                                >
                                  {role.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                      {selectedDayTurns.filter(t => t.rolTurno?.includes('Refuerzo') && t.tipoTurno === selectedShift).length > 0 ? (
                        selectedDayTurns.filter(t => t.rolTurno?.includes('Refuerzo') && t.tipoTurno === selectedShift).map(refTurn => {
                          return (
                            <div key={refTurn.id} className="p-4 rounded-2xl border border-gray-100 bg-violet-50/20 border-violet-100/50 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-[9px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">{refTurn.rolTurno}</span>
                                  <button 
                                    onClick={() => handleOpenProfileDrawer({ rut: refTurn.rutFuncionario, nombre: refTurn.nombreFuncionario })}
                                    className="font-bold text-sm text-secondary block mt-1 hover:underline text-left"
                                  >
                                    {refTurn.nombreFuncionario}
                                  </button>
                                </div>
                                <button 
                                  onClick={() => handleDeleteShift(refTurn.id)}
                                  className="text-gray-400 hover:text-error"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-gray-400">
                                <span>RUT: {refTurn.rutFuncionario}</span>
                                <span className="font-bold uppercase text-violet-700">{refTurn.estado}</span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-gray-400 italic text-sm">
                          Sin refuerzos asignados.
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}
        </>
      )}
    </div>

      {/* MODAL: QUICK SHIFT ASSIGNMENT */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-secondary/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5 text-primary">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserPlus size={20} />
                Asignar {assignRole}
              </h3>
              <button 
                onClick={() => {
                  setShowAssignModal(false);
                  setSearchFuncionarioQuery('');
                }} 
                className="text-gray-400 hover:text-secondary"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o RUT..."
                  value={searchFuncionarioQuery}
                  onChange={(e) => setSearchFuncionarioQuery(e.target.value)}
                  className="w-full bg-tertiary border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all focus:outline-none"
                />
              </div>

              {/* List of matching available workers */}
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {getAvailableFuncionarios(
                  // Map roles to database estamento
                  assignRole === 'Médico' ? 'Médico' : 
                  assignRole === 'Enfermero Jefe de Turno' ? 'Enfermero' : 
                  assignRole === 'Conductor de Ambulancia' ? 'Conductor' : 
                  assignRole === 'Administrativo' ? 'Administrativo' : 
                  assignRole === 'Auxiliar de Servicio' ? 'Auxiliar' : 
                  assignRole?.includes('Refuerzo TENS') || assignRole?.includes('TENS') ? 'TENS' : 
                  assignRole?.includes('Enfermería') ? 'Enfermero' : 
                  assignRole?.includes('Conductor') ? 'Conductor' :
                  assignRole?.includes('Administrativo') ? 'Administrativo' : 
                  assignRole?.includes('Auxiliar') ? 'Auxiliar' : 'Enfermero',
                  selectedDate, 
                  null, 
                  null
                ).length > 0 ? (
                  getAvailableFuncionarios(
                    assignRole === 'Médico' ? 'Médico' : 
                    assignRole === 'Enfermero Jefe de Turno' ? 'Enfermero' : 
                    assignRole === 'Conductor de Ambulancia' ? 'Conductor' : 
                    assignRole === 'Administrativo' ? 'Administrativo' : 
                    assignRole === 'Auxiliar de Servicio' ? 'Auxiliar' : 
                    assignRole?.includes('Refuerzo TENS') || assignRole?.includes('TENS') ? 'TENS' : 
                    assignRole?.includes('Enfermería') ? 'Enfermero' : 
                    assignRole?.includes('Conductor') ? 'Conductor' :
                    assignRole?.includes('Administrativo') ? 'Administrativo' : 
                    assignRole?.includes('Auxiliar') ? 'Auxiliar' : 'Enfermero',
                    selectedDate, 
                    null, 
                    null
                  ).map(func => (
                    <div 
                      key={func.id} 
                      className="p-3 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-primary/5 hover:border-primary/20 transition-all group"
                    >
                      <div>
                        <p className="font-bold text-secondary text-sm">{func.nombre}</p>
                        <p className="text-[10px] text-gray-400 font-mono">RUT: {func.rut} • {func.tipoPrestador}</p>
                      </div>
                      <button 
                        onClick={() => handleConfirmAssignment(func)}
                        className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Asignar
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 italic text-sm">
                    No hay funcionarios disponibles con el perfil requerido para este día (o ya están agendados).
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPORT INCIDENCE (INASISTENCIA) */}
      {showIncidenceModal && (
        <div className="fixed inset-0 bg-secondary/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-error/5 text-error">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ShieldAlert size={20} />
                Registrar Inasistencia
              </h3>
              <button onClick={() => setShowIncidenceModal(null)} className="text-gray-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-xs text-gray-400 uppercase font-bold">Funcionario</p>
                <p className="font-bold text-secondary">{showIncidenceModal.nombreFuncionario}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Rol: {showIncidenceModal.rolTurno} ({showIncidenceModal.tipoTurno})</p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Motivo de Inasistencia</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'licencia_medica', label: 'Licencia Médica' },
                    { key: 'permiso_administrativo', label: 'Permiso Admin.' },
                    { key: 'vacaciones', label: 'Vacaciones' },
                    { key: 'ausente', label: 'Ausente Injustificado' }
                  ].map(item => (
                    <button
                      key={item.key}
                      onClick={() => setIncidenceType(item.key)}
                      className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                        incidenceType === item.key 
                          ? 'bg-error text-white border-error shadow-md' 
                          : 'bg-white border-gray-200 text-secondary hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Detalles adicionales</label>
                <textarea 
                  value={incidenceDetail}
                  onChange={(e) => setIncidenceDetail(e.target.value)}
                  placeholder="Ej: Licencia médica presentada por 3 días..."
                  className="w-full bg-tertiary border border-gray-200 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 min-h-[80px] focus:outline-none"
                />
              </div>

              <button 
                onClick={handleRegisterIncidence}
                className="w-full bg-error hover:bg-error-dark text-white py-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all shadow-lg shadow-error/20"
              >
                Confirmar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SWAP REASSIGNMENT */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-secondary/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5 text-primary">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserPlus size={20} />
                Reasignar Reemplazo
              </h3>
              <button 
                onClick={() => {
                  setShowReassignModal(null);
                  setSearchReassignmentQuery('');
                }} 
                className="text-gray-400 hover:text-secondary"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="p-4 bg-error/5 border border-error/10 rounded-2xl text-error flex items-start gap-3">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold uppercase">Turno con Alerta de Ausencia</p>
                  <p className="text-sm font-bold text-secondary">{showReassignModal.nombreFuncionario} está con {showReassignModal.estado?.replace('_', ' ')}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Puesto: {showReassignModal.rolTurno} ({showReassignModal.tipoTurno})</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Buscar Funcionario de Reemplazo</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Filtrar por nombre o RUT..."
                    value={searchReassignmentQuery}
                    onChange={(e) => setSearchReassignmentQuery(e.target.value)}
                    className="w-full bg-tertiary border border-gray-200 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all focus:outline-none"
                  />
                </div>
              </div>

              <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2">
                {getAvailableReplacements(selectedDate).length > 0 ? (
                  getAvailableReplacements(selectedDate).map(func => (
                    <div 
                      key={func.id} 
                      className="p-3 rounded-2xl border border-gray-100 flex items-center justify-between hover:bg-success/5 hover:border-success/20 transition-all group"
                    >
                      <div>
                        <p className="font-bold text-secondary text-sm">{func.nombre}</p>
                        <p className="text-[10px] text-gray-400 font-mono">RUT: {func.rut} • Estamento: {func.tipoPrestador}</p>
                      </div>
                      <button 
                        onClick={() => handleConfirmReplacement(func)}
                        className="bg-success/10 text-success group-hover:bg-success group-hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Asignar Reemplazo
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 italic text-sm">
                    No se encontraron funcionarios disponibles para reemplazo hoy.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: USER PROFILE SLIDE-OVER DETAILS */}
      {selectedFuncionarioProfile && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop */}
            <div 
              onClick={() => setSelectedFuncionarioProfile(null)}
              className="absolute inset-0 bg-secondary/40 backdrop-blur-sm transition-opacity" 
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform bg-white shadow-2xl transition-all duration-300 ease-in-out border-l border-gray-100">
                <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                  
                  {/* Drawer Header */}
                  <div className="px-6 border-b border-gray-50 pb-6 flex items-center justify-between bg-primary/5 text-primary -mt-6 pt-12">
                    <div>
                      <h2 className="text-xl font-bold text-secondary">{selectedFuncionarioProfile.nombre}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">RUT: {selectedFuncionarioProfile.rut}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedFuncionarioProfile(null)}
                      className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Drawer Content */}
                  <div className="relative flex-1 py-6 px-6 space-y-8">
                    
                    {/* Stats Widget */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Estadísticas {currentMonthName}</h3>
                      
                      {loadingProfileHistory ? (
                        <Loader2 className="animate-spin text-primary" size={24} />
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-tertiary rounded-2xl border border-gray-50">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Horas Cubiertas</span>
                            <span className="text-2xl font-black text-secondary mt-1 block">
                              {getFuncionarioStats().hours} hrs
                            </span>
                          </div>
                          <div className="p-4 bg-tertiary rounded-2xl border border-gray-50">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Inasistencias</span>
                            <span className="text-2xl font-black text-error mt-1 block">
                              {getFuncionarioStats().absences}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Detailed Turn Log */}
                    <div>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Historial de Turnos</h3>
                      
                      {loadingProfileHistory ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="animate-spin text-primary" size={32} />
                        </div>
                      ) : profileHistory.length > 0 ? (
                        <div className="space-y-3">
                          {profileHistory.map(histTurn => {
                            const isIncident = ['licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(histTurn.estado);
                            const isReplaced = histTurn.estado === 'reemplazado';
                            return (
                              <div key={histTurn.id} className="p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-secondary text-sm">{new Date(histTurn.inicio).toLocaleDateString('es-CL')}</p>
                                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                                    {histTurn.rolTurno} ({histTurn.tipoTurno})
                                  </p>
                                  {histTurn.reemplazaA && (
                                    <p className="text-[9px] text-success font-bold mt-1">Reemplazó a {histTurn.reemplazaA}</p>
                                  )}
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                  isIncident 
                                    ? 'bg-error/10 text-error' 
                                    : isReplaced 
                                      ? 'bg-gray-100 text-gray-400 line-through' 
                                      : 'bg-primary/10 text-primary'
                                }`}>
                                  {histTurn.estado?.replace('_', ' ')}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-center py-12 text-gray-400 italic text-sm">
                          Sin historial de turnos registrados en la plataforma.
                        </p>
                      )}
                    </div>

                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ShiftPlannerView;
