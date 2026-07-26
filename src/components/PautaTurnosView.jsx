import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Plus, X, User, Check, Loader2, 
  Sparkles, Filter, AlertCircle, Info, Clock, Tag, Trash2, Activity,
  HeartPulse, Truck, UserCheck, Layers, UserX, AlertTriangle, RefreshCw
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { calcularHorasTurno } from '../utils/timeUtils';
import { SHIFT_TYPES_CONFIG, getShiftConfig, SCHEDULE_TEMPLATES } from './GestionFuncionariosView';

const CATEGORY_LABELS = {
  A: 'Médicos', B: 'Profesionales', C: 'TENS',
  D: 'Téc. Salud', E: 'Administrativos', F: 'Auxiliares'
};

const BASE_ROLES = [
  { key: 'jefe', label: 'Enfermero Jefe de Turno', icon: Activity, estamento: 'Enfermero' },
  { key: 'tens_rayos', label: 'TENS Rayos', icon: HeartPulse, estamento: 'TENS' },
  { key: 'tens_vacunas', label: 'TENS Vacunas', icon: HeartPulse, estamento: 'TENS' },
  { key: 'tens_ambulancia', label: 'TENS Ambulancia', icon: HeartPulse, estamento: 'TENS' },
  { key: 'conductor', label: 'Conductor de Ambulancia', icon: Truck, estamento: 'Conductor' },
  { key: 'administrativo', label: 'Administrativo', icon: UserCheck, estamento: 'Administrativo' },
  { key: 'auxiliar', label: 'Auxiliar de Servicio', icon: User, estamento: 'Auxiliar' }
];

const PautaTurnosView = ({ userData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'daily'
  const [selectedShift, setSelectedShift] = useState('Turno 1');

  const [turnos, setTurnos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [festivos, setFestivos] = useState({}); // { 'YYYY-MM-DD': true }
  const [loading, setLoading] = useState(true);

  // Modal State for Quick Assignment
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedFuncId, setSelectedFuncId] = useState('');
  const [formTipoTurno, setFormTipoTurno] = useState('Turno 1');
  const [formRolTurno, setFormRolTurno] = useState('');
  const [formTipoLiquidacion, setFormTipoLiquidacion] = useState('Horas Extras');
  const [formObservacion, setFormObservacion] = useState('');

  // Incidence & Replacement Modals
  const [showIncidenceModal, setShowIncidenceModal] = useState(null);
  const [incidenceType, setIncidenceType] = useState('licencia_medica');
  const [incidenceDetail, setIncidenceDetail] = useState('');

  const [showReassignModal, setShowReassignModal] = useState(null);
  const [searchReassignmentQuery, setSearchReassignmentQuery] = useState('');

  useEffect(() => {
    fetchMonthData();
  }, [currentDate]);

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      // 1. Fetch funcionarios
      const userSnap = await getDocs(collection(db, 'usuarios'));
      const listFunc = userSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.role !== 'admin_global');
      setFuncionarios(listFunc);

      // 2. Fetch turnos
      const turnSnap = await getDocs(collection(db, 'turnos'));
      const listTurns = turnSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          inicio: data.fechaInicio?.toDate ? data.fechaInicio.toDate() : (data.inicio ? new Date(data.inicio) : null),
          termino: data.fechaFin?.toDate ? data.fechaFin.toDate() : (data.termino ? new Date(data.termino) : null)
        };
      });
      setTurnos(listTurns);
    } catch (err) {
      console.error("Error cargando pauta de turnos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const toggleFestivo = (dateStr) => {
    setFestivos(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // Calendar Days Calculation for Grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const calendarCells = [];
  for (let i = 0; i < adjustedFirstDay; i++) {
    calendarCells.push({ isPadding: true, key: `pad-prev-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isFestivo = !!festivos[dateStr] || isWeekend;

    calendarCells.push({
      isPadding: false,
      day,
      dateObj: d,
      dateStr,
      dayOfWeek,
      isWeekend,
      isFestivo,
      key: `day-${dateStr}`
    });
  }

  // Filter turnos for current month
  const currentMonthTurns = turnos.filter(t => {
    if (!t.fecha && !t.inicio) return false;
    const fStr = t.fecha || (t.inicio ? t.inicio.toISOString().split('T')[0] : '');
    if (!fStr) return false;
    const [y, m] = fStr.split('-').map(Number);
    return y === year && m === (month + 1);
  });

  // Calculate monthly totals per Turno
  const totals = {
    'Turno 1': currentMonthTurns.filter(t => (t.tipoTurno === 'Turno 1' || t.tipoTurno === 'Turno A') && t.estado !== 'reemplazado').length,
    'Turno 2': currentMonthTurns.filter(t => (t.tipoTurno === 'Turno 2' || t.tipoTurno === 'Turno B') && t.estado !== 'reemplazado').length,
    'Turno 3': currentMonthTurns.filter(t => (t.tipoTurno === 'Turno 3' || t.tipoTurno === 'Turno C') && t.estado !== 'reemplazado').length,
    'Turno 4': currentMonthTurns.filter(t => (t.tipoTurno === 'Refuerzo' || t.tipoTurno === 'Turno 4') && t.estado !== 'reemplazado').length
  };

  // Open modal for slot assignment
  const handleOpenAssignModalForSlot = (dateStr, timeSlotLabel, defaultTipoTurno, startH, endH, isNextDay, defaultRole = '') => {
    setSelectedSlot({
      dateStr,
      timeSlotLabel,
      defaultTipoTurno,
      startH,
      endH,
      isNextDay
    });
    setFormTipoTurno(defaultTipoTurno);
    setFormRolTurno(defaultRole);
    setSelectedFuncId('');
    setFormObservacion('');

    // Preselect first func and liquidacion
    if (funcionarios.length > 0) {
      const firstFunc = funcionarios[0];
      setSelectedFuncId(firstFunc.id);
      const isHon = firstFunc.tipoContrato === 'Honorario por horas' || firstFunc.tipoContrato === 'Honorarios';
      setFormTipoLiquidacion(isHon ? 'Honorarios' : 'Horas Extras');
    }
    setShowAssignModal(true);
  };

  const handleFuncChange = (funcId) => {
    setSelectedFuncId(funcId);
    const f = funcionarios.find(u => u.id === funcId);
    if (f) {
      const isHon = f.tipoContrato === 'Honorario por horas' || f.tipoContrato === 'Honorarios';
      setFormTipoLiquidacion(isHon ? 'Honorarios' : 'Horas Extras');
      if (!formRolTurno) {
        setFormRolTurno(f.tipoPrestador || 'Prestador');
      }
    }
  };

  const handleConfirmAssignment = async () => {
    if (!selectedSlot || !selectedFuncId) {
      return alert("Selecciona un funcionario para asignar el turno.");
    }

    const func = funcionarios.find(u => u.id === selectedFuncId);
    if (!func) return alert("Funcionario no encontrado.");

    setSaving(true);
    try {
      const cleanRut = (func.rut || func.id || '').replace(/[^0-9kK]/g, '');

      const fechaInicioStr = selectedSlot.dateStr;
      let fechaFinStr = selectedSlot.dateStr;
      if (selectedSlot.isNextDay) {
        const d = new Date(selectedSlot.dateStr + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        fechaFinStr = d.toISOString().split('T')[0];
      }

      const startDateTime = new Date(`${fechaInicioStr}T${selectedSlot.startH}:00`);
      const endDateTime = new Date(`${fechaFinStr}T${selectedSlot.endH}:00`);

      const calc = calcularHorasTurno(startDateTime, endDateTime);

      let nombreHorario = 'Semana largo';
      if (selectedSlot.timeSlotLabel === '08-20h') nombreHorario = 'Fin de semana festivo día';
      if (selectedSlot.timeSlotLabel === '20-08h') nombreHorario = 'Fin de semana festivo noche';
      if (formTipoTurno === 'Refuerzo') nombreHorario = `Refuerzo (${selectedSlot.startH} - ${selectedSlot.endH})`;

      const payload = {
        rut: cleanRut,
        rutFuncionario: cleanRut,
        funcionarioId: func.id,
        nombreFuncionario: func.nombre,
        tipoContrato: func.tipoContrato || 'Plazo Fijo',
        tipoTurno: formTipoTurno,
        templateId: selectedSlot.timeSlotLabel === '17-08h' ? 'semana_largo' : selectedSlot.timeSlotLabel === '08-20h' ? 'fin_semana_dia' : 'fin_semana_noche',
        nombreHorario,
        fecha: fechaInicioStr,
        horaInicio: selectedSlot.startH,
        horaFin: selectedSlot.endH,
        fechaInicio: Timestamp.fromDate(startDateTime),
        fechaFin: Timestamp.fromDate(endDateTime),
        inicio: startDateTime.toISOString(),
        termino: endDateTime.toISOString(),
        rolTurno: formRolTurno || func.tipoPrestador || 'Prestador',
        categoria: func.categoria || '',
        estamento: func.categoria ? `Cat ${func.categoria}` : '',
        centroAsignacion: 'SAR Arpillerista Elsa Romo Aravena',
        centroSalud: 'SAR Arpillerista Elsa Romo Aravena',
        tipoLiquidacion: formTipoLiquidacion,
        horasHabiles: calc.horasHabiles,
        horasInhabiles: calc.horasInhabiles,
        totalHoras: calc.total,
        observaciones: formObservacion || '',
        estado: 'programado',
        asignadoPor: userData?.nombre || 'Administrador',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'turnos'), payload);

      const newTurn = {
        id: docRef.id,
        ...payload,
        inicio: startDateTime,
        termino: endDateTime
      };

      setTurnos(prev => [newTurn, ...prev]);
      setShowAssignModal(false);
    } catch (err) {
      console.error("Error guardando turno en pauta:", err);
      alert("Error al guardar turno: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Register incidence (inasistencia/licencia)
  const handleRegisterIncidence = async () => {
    if (!showIncidenceModal) return;

    try {
      const turnRef = doc(db, 'turnos', showIncidenceModal.id);
      await updateDoc(turnRef, {
        estado: incidenceType,
        motivoIncidencia: incidenceDetail,
        updatedAt: serverTimestamp()
      });

      setTurnos(prev => prev.map(t => 
        t.id === showIncidenceModal.id 
          ? { ...t, estado: incidenceType, motivoIncidencia: incidenceDetail } 
          : t
      ));

      const updatedTurn = { ...showIncidenceModal, estado: incidenceType, motivoIncidencia: incidenceDetail };
      setShowIncidenceModal(null);
      setIncidenceDetail('');
      setShowReassignModal(updatedTurn);
    } catch (err) {
      console.error("Error al registrar inasistencia:", err);
      alert("No se pudo registrar la inasistencia.");
    }
  };

  // Confirm replacement worker
  const handleConfirmReplacement = async (replacementFunc) => {
    if (!showReassignModal || !replacementFunc) return;

    try {
      // 1. Mark original turn as 'reemplazado'
      const origRef = doc(db, 'turnos', showReassignModal.id);
      await updateDoc(origRef, {
        estado: 'reemplazado',
        reemplazadoPor: replacementFunc.nombre,
        reemplazadoPorRut: replacementFunc.rut,
        updatedAt: serverTimestamp()
      });

      // 2. Create replacement turn
      const cleanRut = (replacementFunc.rut || replacementFunc.id || '').replace(/[^0-9kK]/g, '');
      const isHon = replacementFunc.tipoContrato === 'Honorario por horas' || replacementFunc.tipoContrato === 'Honorarios';

      const payload = {
        funcionarioId: replacementFunc.id,
        rut: cleanRut,
        rutFuncionario: cleanRut,
        nombreFuncionario: replacementFunc.nombre,
        tipoContrato: replacementFunc.tipoContrato || 'Plazo Fijo',
        tipoTurno: showReassignModal.tipoTurno,
        templateId: showReassignModal.templateId || 'semana_largo',
        nombreHorario: showReassignModal.nombreHorario || 'Turno de Reemplazo',
        fecha: showReassignModal.fecha,
        horaInicio: showReassignModal.horaInicio || '17:00',
        horaFin: showReassignModal.horaFin || '08:00',
        fechaInicio: Timestamp.fromDate(new Date(showReassignModal.inicio)),
        fechaFin: Timestamp.fromDate(new Date(showReassignModal.termino)),
        inicio: new Date(showReassignModal.inicio).toISOString(),
        termino: new Date(showReassignModal.termino).toISOString(),
        rolTurno: showReassignModal.rolTurno,
        centroAsignacion: 'SAR Arpillerista Elsa Romo Aravena',
        centroSalud: 'SAR Arpillerista Elsa Romo Aravena',
        tipoLiquidacion: isHon ? 'Honorarios' : 'Horas Extras',
        horasHabiles: showReassignModal.horasHabiles || 0,
        horasInhabiles: showReassignModal.horasInhabiles || 0,
        totalHoras: showReassignModal.totalHoras || 0,
        esReemplazo: true,
        reemplazaA: showReassignModal.nombreFuncionario,
        reemplazaARut: showReassignModal.rutFuncionario,
        estado: 'programado',
        asignadoPor: userData?.nombre || 'Administrador',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'turnos'), payload);

      setTurnos(prev => {
        const list = prev.map(t => t.id === showReassignModal.id ? { ...t, estado: 'reemplazado', reemplazadoPor: replacementFunc.nombre } : t);
        list.push({ id: docRef.id, ...payload, inicio: new Date(showReassignModal.inicio), termino: new Date(showReassignModal.termino) });
        return list;
      });

      setShowReassignModal(null);
      setSearchReassignmentQuery('');
      alert(`¡Reemplazo registrado! ${replacementFunc.nombre} reemplaza a ${showReassignModal.nombreFuncionario}.`);
    } catch (err) {
      console.error("Error al asignar reemplazo:", err);
      alert("Error al procesar el reemplazo.");
    }
  };

  const handleDeleteTurnFromPauta = async (e, turnId) => {
    if (e) e.stopPropagation();
    if (!window.confirm("¿Deseas eliminar este turno asignado en la pauta?")) return;
    try {
      await deleteDoc(doc(db, 'turnos', turnId));
      setTurnos(prev => prev.filter(t => t.id !== turnId));
    } catch (err) {
      console.error("Error al eliminar turno:", err);
      alert("No se pudo eliminar: " + err.message);
    }
  };

  // Helper to filter turnos for selected day in daily plan view
  const selectedDayTurns = turnos.filter(t => {
    if (!t.fecha && !t.inicio) return false;
    const fStr = t.fecha || (t.inicio ? t.inicio.toISOString().split('T')[0] : '');
    const selStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    return fStr === selStr;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Top Header Card with Month Navigator & View Switcher */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
            <Calendar size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-secondary tracking-tight">Pauta de Turnos Mensual</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Planificación integral de turnos rotativos, dotación de roles base y reemplazos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Month Navigator Controls */}
          <div className="flex items-center justify-center gap-4 bg-tertiary px-5 py-2.5 rounded-2xl border border-gray-100">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white rounded-xl transition-colors text-secondary hover:shadow-sm">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-black text-secondary uppercase tracking-wider min-w-[150px] text-center">
              {monthName}
            </span>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-white rounded-xl transition-colors text-secondary hover:shadow-sm">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-4 py-2 rounded-xl transition-all ${
                viewMode === 'monthly' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-secondary'
              }`}
            >
              Grilla Calendario
            </button>
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 rounded-xl transition-all ${
                viewMode === 'daily' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-secondary'
              }`}
            >
              Planilla / Dotación Día
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-gray-400 font-bold text-xs">Cargando pauta de turnos y equipo...</p>
        </div>
      ) : viewMode === 'monthly' ? (
        /* ══════════════ 1. MONTHLY CALENDAR GRID VIEW ══════════════ */
        <div className="space-y-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/70 text-center font-extrabold text-xs tracking-wider">
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, idx) => (
                <div 
                  key={dayName} 
                  className={`py-4 border-r border-gray-100 last:border-r-0 ${
                    idx >= 5 ? 'text-rose-600 bg-rose-50/40' : 'text-gray-600'
                  }`}
                >
                  {dayName}
                </div>
              ))}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-gray-100/30">
              {calendarCells.map((cell) => {
                if (cell.isPadding) {
                  return <div key={cell.key} className="bg-gray-50/40 min-h-[150px]" />;
                }

                const isFestivo = cell.isFestivo;
                const dayTurns = currentMonthTurns.filter(t => t.fecha === cell.dateStr);

                const now = new Date();
                const todayLocalStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isTodayCell = cell.dateStr === todayLocalStr;

                return (
                  <div 
                    key={cell.key} 
                    className={`min-h-[165px] p-2.5 flex flex-col justify-between transition-all ${
                      isTodayCell
                        ? 'bg-amber-50/50 ring-2 ring-amber-400 border-amber-300 shadow-md shadow-amber-400/20 relative z-10'
                        : cell.isWeekend || isFestivo
                        ? 'bg-rose-50/10 hover:bg-rose-50/20'
                        : 'bg-white hover:bg-gray-50/60'
                    }`}
                  >
                    {/* Cell Header */}
                    <div className={`flex items-center justify-between pb-2 border-b ${isTodayCell ? 'border-amber-200' : 'border-gray-100'}`}>
                      {isTodayCell ? (
                        <button
                          onClick={() => {
                            setSelectedDate(cell.dateObj);
                            setViewMode('daily');
                          }}
                          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-0.5 rounded-full text-xs font-black shadow-sm transition-transform hover:scale-105"
                          title="Ver planilla completa de HOY"
                        >
                          <span>{cell.day}</span>
                          <span className="text-[9px] font-extrabold uppercase bg-white/20 px-1 rounded">HOY</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedDate(cell.dateObj);
                            setViewMode('daily');
                          }}
                          className={`text-base font-black hover:underline ${cell.isWeekend ? 'text-rose-600' : 'text-secondary'}`}
                          title="Ver planilla completa del día"
                        >
                          {cell.day}
                        </button>
                      )}
                      
                      <label className="inline-flex items-center gap-1 cursor-pointer select-none text-[10px] font-bold text-rose-500 hover:text-rose-700">
                        <input 
                          type="checkbox"
                          checked={!!festivos[cell.dateStr]}
                          onChange={() => toggleFestivo(cell.dateStr)}
                          className="rounded border-rose-300 text-rose-600 focus:ring-rose-400 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Festivo</span>
                      </label>
                    </div>

                    {/* Slots in Cell */}
                    <div className="space-y-2 mt-2 flex-1">
                      {!isFestivo ? (
                        /* Weekday Slot (17-08h) */
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-gray-400">
                            <span>17-08h</span>
                            <button
                              onClick={() => {
                                setSelectedDate(cell.dateObj);
                                setViewMode('daily');
                              }}
                              className="text-[9px] text-primary hover:underline font-bold"
                            >
                              Planilla
                            </button>
                          </div>
                          
                          {dayTurns.filter(t => (t.horaInicio === '17:00' || t.nombreHorario === 'Semana largo' || t.tipoTurno === 'Turno 1') && t.estado !== 'reemplazado').length > 0 ? (
                            dayTurns.filter(t => (t.horaInicio === '17:00' || t.nombreHorario === 'Semana largo' || t.tipoTurno === 'Turno 1') && t.estado !== 'reemplazado').map(t => {
                              const isVacant = ['licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(t.estado);
                              const cfg = getShiftConfig(t.tipoTurno);

                              if (isVacant) {
                                return (
                                  <div key={t.id} className="p-1.5 rounded-xl border border-rose-300 bg-rose-100 text-rose-900 text-xs flex items-center justify-between shadow-sm">
                                    <div className="truncate">
                                      <p className="font-black text-[10px] text-rose-800 flex items-center gap-1 truncate">
                                        <AlertTriangle size={10} className="text-rose-600 shrink-0" /> VACANTE: {t.nombreFuncionario?.split(' ')[0]}
                                      </p>
                                      <p className="text-[8px] font-bold text-rose-600 uppercase">{t.estado?.replace('_', ' ')}</p>
                                    </div>
                                    <button 
                                      onClick={() => setShowReassignModal(t)}
                                      className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-bold rounded hover:bg-rose-700 ml-1 shrink-0 uppercase"
                                      title="Asignar Reemplazo"
                                    >
                                      + Reemplazar
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div 
                                  key={t.id}
                                  className={`p-2 rounded-xl border text-xs flex items-center justify-between ${cfg.bg} ${cfg.border} shadow-sm group relative`}
                                >
                                  <div className="truncate">
                                    <p className="font-extrabold text-secondary truncate">{t.nombreFuncionario || 'Funcionario'}</p>
                                    <p className="text-[9px] font-semibold opacity-80 flex items-center gap-1">
                                      <span>{cfg.label}</span> • <span>{t.rolTurno || 'Prestador'}</span>
                                    </p>
                                  </div>
                                  <button 
                                    onClick={(e) => handleDeleteTurnFromPauta(e, t.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-rose-600 hover:bg-rose-100 rounded transition-all ml-1"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <button
                              onClick={() => handleOpenAssignModalForSlot(cell.dateStr, '17-08h', 'Turno 1', '17:00', '08:00', true)}
                              className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                            >
                              <Plus size={13} /> Turno 1
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Weekend / Festivo Slots (08-20h & 20-08h) */
                        <div className="space-y-2">
                          {/* Slot 1: Day 08-20h */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-gray-400 block">08-20h</span>
                            {dayTurns.filter(t => t.horaInicio === '08:00' || t.nombreHorario?.includes('día')).length > 0 ? (
                              dayTurns.filter(t => t.horaInicio === '08:00' || t.nombreHorario?.includes('día')).map(t => {
                                const cfg = getShiftConfig(t.tipoTurno);
                                return (
                                  <div key={t.id} className={`p-1.5 rounded-xl border text-xs flex items-center justify-between ${cfg.bg} ${cfg.border} shadow-sm group`}>
                                    <div className="truncate">
                                      <p className="font-extrabold text-secondary truncate text-[11px]">{t.nombreFuncionario}</p>
                                      <p className="text-[8px] font-semibold opacity-80">{cfg.label} • {t.rolTurno}</p>
                                    </div>
                                    <button onClick={(e) => handleDeleteTurnFromPauta(e, t.id)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-600">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <button
                                onClick={() => handleOpenAssignModalForSlot(cell.dateStr, '08-20h', 'Turno 2', '08:00', '20:00', false)}
                                className="w-full py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1"
                              >
                                <Plus size={12} /> Turno 2
                              </button>
                            )}
                          </div>

                          {/* Slot 2: Night 20-08h */}
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-gray-400 block">20-08h</span>
                            {dayTurns.filter(t => t.horaInicio === '20:00' || t.nombreHorario?.includes('noche')).length > 0 ? (
                              dayTurns.filter(t => t.horaInicio === '20:00' || t.nombreHorario?.includes('noche')).map(t => {
                                const cfg = getShiftConfig(t.tipoTurno);
                                return (
                                  <div key={t.id} className={`p-1.5 rounded-xl border text-xs flex items-center justify-between ${cfg.bg} ${cfg.border} shadow-sm group`}>
                                    <div className="truncate">
                                      <p className="font-extrabold text-secondary truncate text-[11px]">{t.nombreFuncionario}</p>
                                      <p className="text-[8px] font-semibold opacity-80">{cfg.label} • {t.rolTurno}</p>
                                    </div>
                                    <button onClick={(e) => handleDeleteTurnFromPauta(e, t.id)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-600">
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <button
                                onClick={() => handleOpenAssignModalForSlot(cell.dateStr, '20-08h', 'Turno 3', '20:00', '08:00', true)}
                                className="w-full py-1 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1"
                              >
                                <Plus size={12} /> Turno 3
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TOTAL DE TURNOS ASIGNADOS Summary Cards Footer */}
          <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 space-y-4">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">
              TOTAL DE TURNOS ASIGNADOS - {monthName}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">Turno 1</span>
                <span className="text-4xl font-black text-emerald-600">{totals['Turno 1']}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Turnos</span>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-amber-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Turno 2</span>
                <span className="text-4xl font-black text-amber-500">{totals['Turno 2']}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Turnos</span>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-sky-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-xs font-extrabold text-sky-800 uppercase tracking-wider">Turno 3</span>
                <span className="text-4xl font-black text-sky-600">{totals['Turno 3']}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Turnos</span>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                <span className="text-xs font-extrabold text-purple-800 uppercase tracking-wider">Turno 4 / Refuerzo</span>
                <span className="text-4xl font-black text-purple-600">{totals['Turno 4']}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Turnos</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════ 2. PLANILLA / DOTACIÓN DE DÍA DETALLADA ══════════════ */
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewMode('monthly')}
                className="px-4 py-2 bg-gray-100 text-secondary hover:bg-gray-200 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                <ChevronLeft size={16} /> Volver al Mes
              </button>
              <div>
                <h2 className="text-xl font-bold text-secondary">
                  Planilla de Dotación — {selectedDate.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </h2>
                <p className="text-xs text-gray-400 font-medium">Asignación de dotación completa (roles base, médicos y refuerzos).</p>
              </div>
            </div>

            {/* Turn Switcher */}
            <div className="flex items-center gap-2 bg-tertiary p-1.5 rounded-2xl border border-gray-100 flex-wrap">
              {['Turno 1', 'Turno 2', 'Turno 3', 'Refuerzo'].map(shift => {
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

          {/* Dotación Base Panel */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-extrabold text-secondary text-base flex items-center gap-2">
                <Layers size={18} className="text-primary" /> Dotación de Roles Base ({selectedShift})
              </h3>
              <span className="text-xs bg-primary/10 text-primary font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                7 Roles Base Requeridos
              </span>
            </div>

            <div className="space-y-3">
              {BASE_ROLES.map(role => {
                const assignedTurns = selectedDayTurns.filter(t => t.rolTurno === role.label && t.tipoTurno === selectedShift);

                return (
                  <div key={role.key} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:w-1/3">
                      <div className="p-2.5 bg-white rounded-xl text-gray-500 shadow-sm border border-gray-100">
                        <role.icon size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-secondary text-sm">{role.label}</p>
                        <span className="text-[10px] bg-gray-200/60 text-gray-600 font-bold px-2 py-0.5 rounded-md uppercase tracking-widest">{role.estamento}</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-2">
                      {assignedTurns.length > 0 ? (
                        assignedTurns.map(t => {
                          const isIncident = ['licencia_medica', 'permiso_administrativo', 'vacaciones', 'ausente'].includes(t.estado);
                          const isReplaced = t.estado === 'reemplazado';

                          if (isIncident) {
                            return (
                              <div key={t.id} className="p-3.5 rounded-2xl border border-rose-300 bg-rose-50 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                                    <AlertTriangle size={20} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-xs uppercase text-rose-700 tracking-wider">⚠️ CARGO VACANTE</span>
                                      <span className="text-[9px] bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                                        {t.estado?.replace('_', ' ')}
                                      </span>
                                    </div>
                                    <p className="text-xs font-semibold text-rose-900 mt-0.5">
                                      Funcionario ausente: <strong className="font-extrabold">{t.nombreFuncionario}</strong> {t.motivoIncidencia ? `(${t.motivoIncidencia})` : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  <button
                                    onClick={() => setShowReassignModal(t)}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 uppercase tracking-wider"
                                  >
                                    <RefreshCw size={14} /> + Asignar Reemplazo
                                  </button>
                                  <button onClick={(e) => handleDeleteTurnFromPauta(e, t.id)} className="p-1.5 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-lg">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={t.id} className={`p-3 rounded-xl border flex items-center justify-between ${
                              isReplaced ? 'bg-gray-100 border-gray-200 text-gray-400' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            }`}>
                              <div>
                                <p className="font-extrabold text-sm">{t.nombreFuncionario}</p>
                                <p className="text-[10px] opacity-75 font-semibold">RUT: {t.rutFuncionario} {t.esReemplazo ? '• (Reemplazo)' : ''}</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                  isReplaced ? 'bg-gray-300 text-gray-700' : 'bg-emerald-600 text-white'
                                }`}>
                                  {t.estado?.replace('_', ' ')}
                                </span>

                                {!isReplaced && (
                                  <button
                                    onClick={() => setShowIncidenceModal(t)}
                                    className="px-2.5 py-1 text-[10px] font-bold uppercase bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg"
                                  >
                                    Inasistencia
                                  </button>
                                )}

                                <button onClick={(e) => handleDeleteTurnFromPauta(e, t.id)} className="p-1 text-gray-400 hover:text-rose-600">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <button
                          onClick={() => {
                            const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
                            handleOpenAssignModalForSlot(dateStr, selectedShift, selectedShift, '17:00', '08:00', true, role.label);
                          }}
                          className="w-full py-3.5 border-2 border-dashed border-gray-200 hover:border-primary/40 text-gray-400 hover:text-primary transition-all rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest"
                        >
                          <Plus size={15} /> Asignar {role.label}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Quick Shift Assignment Modal */}
      {showAssignModal && selectedSlot && (
        <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-scale-up my-auto border border-gray-100">
            <div className="p-6 bg-gradient-to-r from-secondary to-secondary-light text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-md text-white">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Asignar Turno en Pauta</h3>
                  <p className="text-xs text-gray-300">
                    Fecha: <strong className="text-white">{selectedSlot.dateStr}</strong> ({selectedSlot.timeSlotLabel})
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-300 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Selección de Turno</label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.values(SHIFT_TYPES_CONFIG).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormTipoTurno(s.id)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                        formTipoTurno === s.id ? `${s.bg} ${s.border} ring-2 ring-primary/30` : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {s.id}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Rol / Función en Turno</label>
                <input
                  type="text"
                  value={formRolTurno}
                  onChange={e => setFormRolTurno(e.target.value)}
                  placeholder="Ej: Enfermero Jefe, TENS Rayos, Médicos..."
                  className="w-full input-field bg-gray-50 text-xs font-bold text-secondary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Seleccionar Funcionario</label>
                <select
                  value={selectedFuncId}
                  onChange={e => handleFuncChange(e.target.value)}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm appearance-none"
                >
                  <option value="" disabled>Selecciona un funcionario...</option>
                  {funcionarios.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.nombre} — {f.tipoPrestador || 'Prestador'} ({f.categoria ? `Cat ${f.categoria}` : 'Sin Cat'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Liquidación Asociada</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormTipoLiquidacion('Horas Extras')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left ${
                      formTipoLiquidacion === 'Horas Extras' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 ring-2 ring-emerald-400/30' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Horas Extras (Plazo Fijo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormTipoLiquidacion('Honorarios')}
                    className={`p-3 rounded-xl border text-xs font-bold text-left ${
                      formTipoLiquidacion === 'Honorarios' ? 'bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-400/30' : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    Honorarios (Por Horas)
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setShowAssignModal(false)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase">
                Cancelar
              </button>
              <button onClick={handleConfirmAssignment} disabled={saving} className="btn-primary py-2.5 px-5 text-xs font-bold uppercase">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Registering Incidence */}
      {showIncidenceModal && (
        <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-4">
            <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
              <UserX className="text-rose-500" size={20} /> Registrar Inasistencia
            </h3>
            <p className="text-xs text-gray-500">
              Funcionario: <strong className="text-secondary">{showIncidenceModal.nombreFuncionario}</strong> ({showIncidenceModal.rolTurno})
            </p>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tipo de Incidencia</label>
              <select
                value={incidenceType}
                onChange={e => setIncidenceType(e.target.value)}
                className="w-full input-field bg-gray-50 font-bold text-xs text-secondary appearance-none"
              >
                <option value="licencia_medica">Licencia Médica</option>
                <option value="permiso_administrativo">Permiso Administrativo</option>
                <option value="vacaciones">Vacaciones / Feriado Legal</option>
                <option value="ausente">Ausente / Inasistencia</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Detalle (Opcional)</label>
              <input
                type="text"
                value={incidenceDetail}
                onChange={e => setIncidenceDetail(e.target.value)}
                placeholder="Ej: Licencia médica #123456 por 3 días"
                className="w-full input-field bg-gray-50 text-xs font-medium text-secondary"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowIncidenceModal(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs">
                Cancelar
              </button>
              <button onClick={handleRegisterIncidence} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs">
                Guardar e Ir a Reemplazo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Replacement Selection */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-4">
            <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
              <RefreshCw className="text-primary" size={20} /> Asignar Reemplazo
            </h3>
            <p className="text-xs text-gray-500">
              Reemplazo para el turno de <strong className="text-secondary">{showReassignModal.nombreFuncionario}</strong> ({showReassignModal.rolTurno}).
            </p>

            <input
              type="text"
              placeholder="Buscar funcionario disponible por nombre o RUT..."
              value={searchReassignmentQuery}
              onChange={e => setSearchReassignmentQuery(e.target.value)}
              className="w-full input-field bg-gray-50 text-xs font-medium text-secondary"
            />

            <div className="max-h-60 overflow-y-auto space-y-2">
              {funcionarios
                .filter(f => f.nombre?.toLowerCase().includes(searchReassignmentQuery.toLowerCase()))
                .map(f => (
                  <div key={f.id} className="p-3 border border-gray-100 rounded-2xl flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-bold text-xs text-secondary">{f.nombre}</p>
                      <p className="text-[10px] text-gray-400">{f.tipoPrestador} ({f.tipoContrato})</p>
                    </div>
                    <button
                      onClick={() => handleConfirmReplacement(f)}
                      className="btn-primary text-xs py-1.5 px-3 font-bold"
                    >
                      Asignar Reemplazo
                    </button>
                  </div>
                ))}
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setShowReassignModal(null)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs">
                Omitir Reemplazo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PautaTurnosView;
