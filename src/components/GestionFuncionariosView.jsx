import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Search, Plus, X, ChevronLeft, ChevronRight, User, Calendar,
  AlertTriangle, Wallet, Loader2, Info,
  ShieldCheck, Mail, Stethoscope, Umbrella, Timer, Briefcase,
  Clock, FileText, Building2, Phone, Hash, CreditCard, Edit3, Save, Check,
  Camera, Trash2, Power, ZoomIn, ZoomOut, Upload, Crop,
  CheckCircle2, AlertCircle, XCircle, Clock3, Tag, Sparkles
} from 'lucide-react';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, orderBy,
  doc, setDoc, getDoc, addDoc, deleteDoc, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { calcularHorasTurno } from '../utils/timeUtils';

// ─── Shift & Schedule Definitions ─────────────────────────────────────────────

export const SHIFT_TYPES_CONFIG = {
  'Turno 1': {
    id: 'Turno 1',
    label: 'Turno 1',
    colorName: 'Verde',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badge: 'bg-emerald-500 text-white',
    badgeSoft: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    dot: 'bg-emerald-500',
    border: 'border-emerald-300',
    hex: '#22c55e'
  },
  'Turno 2': {
    id: 'Turno 2',
    label: 'Turno 2',
    colorName: 'Amarillo',
    bg: 'bg-amber-50 text-amber-900 border-amber-200',
    badge: 'bg-amber-500 text-white',
    badgeSoft: 'bg-amber-100 text-amber-900 border border-amber-300',
    dot: 'bg-amber-500',
    border: 'border-amber-300',
    hex: '#eab308'
  },
  'Turno 3': {
    id: 'Turno 3',
    label: 'Turno 3',
    colorName: 'Celeste',
    bg: 'bg-sky-50 text-sky-800 border-sky-200',
    badge: 'bg-sky-500 text-white',
    badgeSoft: 'bg-sky-100 text-sky-800 border border-sky-300',
    dot: 'bg-sky-500',
    border: 'border-sky-300',
    hex: '#0284c7'
  },
  'Refuerzo': {
    id: 'Refuerzo',
    label: 'Refuerzo / Extra',
    colorName: 'Púrpura',
    bg: 'bg-purple-50 text-purple-800 border-purple-200',
    badge: 'bg-purple-600 text-white',
    badgeSoft: 'bg-purple-100 text-purple-800 border border-purple-300',
    dot: 'bg-purple-500',
    border: 'border-purple-300',
    hex: '#9333ea'
  }
};

export const getShiftConfig = (tipo) => {
  if (tipo === 'Turno A') return SHIFT_TYPES_CONFIG['Turno 1'];
  if (tipo === 'Turno B') return SHIFT_TYPES_CONFIG['Turno 2'];
  if (tipo === 'Turno C') return SHIFT_TYPES_CONFIG['Turno 3'];
  return SHIFT_TYPES_CONFIG[tipo] || SHIFT_TYPES_CONFIG['Turno 1'];
};

export const SCHEDULE_TEMPLATES = [
  {
    id: 'semana_largo',
    label: 'Semana largo (17:00 a 08:00 +1)',
    nombreHorario: 'Semana largo',
    diasSemana: 'Lunes a Viernes',
    horaInicio: '17:00',
    horaFin: '08:00',
    cruzaDia: true,
    isManual: false,
    defaultTurno: 'Turno 1'
  },
  {
    id: 'fin_semana_dia',
    label: 'Fin de semana festivo día (08:00 a 20:00)',
    nombreHorario: 'Fin de semana festivo día',
    diasSemana: 'Sábados, Domingos y Festivos',
    horaInicio: '08:00',
    horaFin: '20:00',
    cruzaDia: false,
    isManual: false,
    defaultTurno: 'Turno 2'
  },
  {
    id: 'fin_semana_noche',
    label: 'Fin de semana festivo noche (20:00 a 08:00 +1)',
    nombreHorario: 'Fin de semana festivo noche',
    diasSemana: 'Sábados, Domingos y Festivos',
    horaInicio: '20:00',
    horaFin: '08:00',
    cruzaDia: true,
    isManual: false,
    defaultTurno: 'Turno 3'
  },
  {
    id: 'refuerzo_manual',
    label: 'Refuerzo / Horario Manual (Personalizado)',
    nombreHorario: 'Refuerzo Manual',
    diasSemana: 'Cualquier día',
    horaInicio: '08:00',
    horaFin: '17:00',
    cruzaDia: false,
    isManual: true,
    defaultTurno: 'Refuerzo'
  }
];

// ─── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  A: 'Médicos', B: 'Profesionales', C: 'TENS',
  D: 'Téc. Salud', E: 'Administrativos', F: 'Auxiliares'
};

const STATUS_CONFIG = {
  activo:          { label: 'Activo',          cls: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  'pre-registrado':{ label: 'Pre-registrado',  cls: 'bg-amber-50 text-amber-600 border border-amber-200'    },
  inactivo:        { label: 'Inactivo',        cls: 'bg-rose-50 text-rose-600 border border-rose-200'       },
};

const TABS = [
  { id: 'perfil',        label: 'Perfil Personal', icon: User          },
  { id: 'turnos',        label: 'Turnos Asignados', icon: Calendar     },
  { id: 'marcaje',       label: 'Marcaje / Asistencia', icon: Timer    },
  { id: 'licencias',     label: 'Licencias Médicas', icon: Stethoscope },
  { id: 'vacaciones',    label: 'Vacaciones & Permisos', icon: Umbrella },
  { id: 'inasistencias', label: 'Inasistencias',   icon: AlertTriangle },
  { id: 'honorarios',    label: 'Honorarios & Pagos', icon: Wallet     },
];

const AVATAR_PALETTE = [
  'bg-primary', 'bg-violet-600', 'bg-cyan-600',
  'bg-amber-600', 'bg-emerald-600', 'bg-rose-600'
];

const getInitials = (nombre = '') => {
  const parts = nombre.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase();
};

const avatarColor = (rut = '') =>
  AVATAR_PALETTE[(rut.charCodeAt(0) || 0) % AVATAR_PALETTE.length];

// ─── Helpers: RUT & Email formatting ──────────────────────────────────────────

const formatRutInput = (value = '') => {
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
};

const isValidEmailDomain = (email = '') => {
  const clean = email.toLowerCase().trim();
  return clean.endsWith('@cormumel.cl');
};

// ─── Novedad type map ───────────────────────────────────────────────────────────
const NOVEDAD_TIPO = {
  licencias:     'licencia_medica',
  vacaciones:    'vacacion',
  inasistencias: 'inasistencia',
  marcaje:       'marcaje',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
const GestionFuncionariosView = ({ userData }) => {

  // ── List state ─────────────────────────────────────────────────────────────
  const [funcionarios,  setFuncionarios]  = useState([]);
  const [loadingList,   setLoadingList]   = useState(true);

  // ── Filter state ───────────────────────────────────────────────────────────
  const [searchQuery,     setSearchQuery]     = useState('');
  const [filterStatus,    setFilterStatus]    = useState('all');
  const [filterEstamento, setFilterEstamento] = useState('all');

  // ── Expediente state ───────────────────────────────────────────────────────
  const [selectedFunc, setSelectedFunc] = useState(null);
  const [activeTab,    setActiveTab]    = useState('perfil');
  const [tabData,      setTabData]      = useState({});
  const [tabLoading,   setTabLoading]   = useState(false);

  // ── Profile edit state ─────────────────────────────────────────────────────
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData,  setEditProfileData]  = useState({});
  const [savingProfile,    setSavingProfile]    = useState(false);

  // ── Photo Cropper state ────────────────────────────────────────────────────
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [rawImageSrc,    setRawImageSrc]    = useState(null);
  const [photoZoom,      setPhotoZoom]      = useState(1);
  const [photoOffset,    setPhotoOffset]    = useState({ x: 0, y: 0 });
  const [isDragging,     setIsDragging]     = useState(false);
  const [dragStart,      setDragStart]      = useState({ x: 0, y: 0 });
  const [savingPhoto,    setSavingPhoto]    = useState(false);

  // ── Add-novedad form ───────────────────────────────────────────────────────
  const [savingNovedad, setSavingNovedad] = useState(false);
  const [novedadForm,   setNovedadForm]   = useState({ fechaInicio: '', fechaFin: '', observacion: '' });

  // ── Turn Assignment Modal & View State ─────────────────────────────────────
  const [turnoViewMode, setTurnoViewMode] = useState('calendar');
  const [funcCalendarDate, setFuncCalendarDate] = useState(new Date());
  const [showAssignTurnoModal, setShowAssignTurnoModal] = useState(false);
  const [savingTurno, setSavingTurno] = useState(false);
  const [turnoForm, setTurnoForm] = useState({
    tipoTurno: 'Turno 1',
    templateId: 'semana_largo',
    fechaInicio: new Date().toISOString().split('T')[0],
    horaInicio: '17:00',
    fechaFin: new Date().toISOString().split('T')[0],
    horaFin: '08:00',
    rolTurno: '',
    centroAsignado: 'SAR Arpillerista Elsa Romo Aravena',
    observaciones: ''
  });

  // ── Pre-registration modal ─────────────────────────────────────────────────
  const [showPreRegModal, setShowPreRegModal] = useState(false);
  const [regNombre,       setRegNombre]       = useState('');
  const [regRut,          setRegRut]          = useState('');
  const [regCorreo,       setRegCorreo]       = useState('');
  const [regTipoPrestador,setRegTipoPrestador]= useState('');
  const [regCentroAsignado,setRegCentroAsignado]= useState('SAR Arpillerista Elsa Romo Aravena');
  const [regTipoContrato, setRegTipoContrato] = useState('Honorario por horas');
  const [regGrado,        setRegGrado]        = useState('');
  const [regCategoria,    setRegCategoria]    = useState('');
  const [isRegistering,   setIsRegistering]   = useState(false);

  // ── Success modal & Toast state ─────────────────────────────────────────────
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredUser,   setRegisteredUser]   = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // ═══════════ Effects ════════════════════════════════════════════════════════

  useEffect(() => { fetchFuncionarios(); }, []);

  useEffect(() => {
    if (selectedFunc && activeTab !== 'perfil') {
      loadTabData(activeTab);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedFunc]);

  // ═══════════ Fetchers ════════════════════════════════════════════════════════

  const fetchFuncionarios = async () => {
    setLoadingList(true);
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.role !== 'admin_global');
      setFuncionarios(list);
    } catch (err) {
      console.error('Error fetching funcionarios:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const loadTabData = async (tab) => {
    if (tabData[tab] !== undefined) return; // cache
    const rawRut = selectedFunc?.rut || selectedFunc?.id;
    if (!rawRut) return;

    setTabLoading(true);
    try {
      let items = [];

      if (tab === 'turnos') {
        try {
          const cleanRut = (rawRut || '').replace(/[^0-9kK]/g, '');
          const snap = await getDocs(collection(db, 'turnos'));
          items = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(t => {
              const tRut = (t.rut || t.rutFuncionario || '').replace(/[^0-9kK]/g, '');
              return tRut === cleanRut || t.funcionarioId === selectedFunc?.id;
            })
            .sort((a, b) => {
              const getMs = (val) => {
                if (!val) return 0;
                if (val.toDate) return val.toDate().getTime();
                return new Date(val).getTime() || 0;
              };
              return getMs(b.fechaInicio || b.inicio) - getMs(a.fechaInicio || a.inicio);
            });
        } catch (e) {
          console.error("Error fetching turnos:", e);
          items = [];
        }

      } else if (tab === 'honorarios') {
        try {
          const q = query(collection(db, 'honorarios'), where('rut', '==', rawRut), orderBy('fecha', 'desc'));
          const snap = await getDocs(q);
          items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch { items = []; }

      } else {
        const tipo = NOVEDAD_TIPO[tab];
        try {
          const q = query(
            collection(db, 'novedades'),
            where('rut', '==', rawRut),
            where('tipo', '==', tipo),
            orderBy('fechaInicio', 'desc')
          );
          const snap = await getDocs(q);
          items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch { items = []; }
      }

      setTabData(prev => ({ ...prev, [tab]: items }));
    } catch (err) {
      console.error(`Error loading ${tab}:`, err);
      setTabData(prev => ({ ...prev, [tab]: [] }));
    } finally {
      setTabLoading(false);
    }
  };

  // ═══════════ Actions: Asignar Turno / Refuerzo Directo ═════════════════════

  const handleOpenAssignTurnoModal = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultRole = selectedFunc?.tipoPrestador || (selectedFunc?.categoria ? CATEGORY_LABELS[selectedFunc.categoria] : 'Administrativo');
    const tmpl = SCHEDULE_TEMPLATES[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const defaultLiquidacion = (selectedFunc?.tipoContrato === 'Honorario por horas' || selectedFunc?.tipoContrato === 'Honorarios')
      ? 'Honorarios'
      : 'Horas Extras';

    setTurnoForm({
      tipoTurno: tmpl.defaultTurno || 'Turno 1',
      templateId: tmpl.id,
      fechaInicio: todayStr,
      horaInicio: tmpl.horaInicio,
      fechaFin: tmpl.cruzaDia ? tomorrowStr : todayStr,
      horaFin: tmpl.horaFin,
      rolTurno: defaultRole,
      centroAsignado: selectedFunc?.centroAsignado || 'SAR Arpillerista Elsa Romo Aravena',
      tipoLiquidacion: defaultLiquidacion,
      observaciones: ''
    });
    setShowAssignTurnoModal(true);
  };

  const handleTemplateChange = (templateId) => {
    const tmpl = SCHEDULE_TEMPLATES.find(t => t.id === templateId) || SCHEDULE_TEMPLATES[0];
    setTurnoForm(prev => {
      let newFechaFin = prev.fechaInicio;
      if (tmpl.cruzaDia && prev.fechaInicio) {
        const d = new Date(prev.fechaInicio + 'T00:00:00');
        d.setDate(d.getDate() + 1);
        newFechaFin = d.toISOString().split('T')[0];
      }
      return {
        ...prev,
        templateId: tmpl.id,
        tipoTurno: tmpl.isManual ? 'Refuerzo' : (tmpl.defaultTurno || prev.tipoTurno),
        horaInicio: tmpl.horaInicio,
        horaFin: tmpl.horaFin,
        fechaFin: tmpl.cruzaDia ? newFechaFin : prev.fechaInicio
      };
    });
  };

  const handleSaveTurnoDirecto = async () => {
    if (!turnoForm.fechaInicio || !turnoForm.horaInicio || !turnoForm.fechaFin || !turnoForm.horaFin) {
      return showToast('Por favor completa las fechas y horas de inicio y término.', 'warning');
    }

    setSavingTurno(true);
    try {
      const cleanRut = (selectedFunc.rut || selectedFunc.id || '').replace(/[^0-9kK]/g, '');
      const tmpl = SCHEDULE_TEMPLATES.find(t => t.id === turnoForm.templateId) || SCHEDULE_TEMPLATES[0];

      const startDateTime = new Date(`${turnoForm.fechaInicio}T${turnoForm.horaInicio}:00`);
      const endDateTime = new Date(`${turnoForm.fechaFin}T${turnoForm.horaFin}:00`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return showToast('Formato de fecha u hora inválido.', 'error');
      }

      if (endDateTime <= startDateTime) {
        return showToast('La fecha/hora de término debe ser posterior a la de inicio.', 'warning');
      }

      const horasCalc = calcularHorasTurno(startDateTime, endDateTime);

      const defaultLiquidacion = (selectedFunc.tipoContrato === 'Honorario por horas' || selectedFunc.tipoContrato === 'Honorarios') ? 'Honorarios' : 'Horas Extras';
      const tipoLiquidacion = turnoForm.tipoLiquidacion || defaultLiquidacion;

      const payload = {
        rut: cleanRut,
        rutFuncionario: cleanRut,
        funcionarioId: selectedFunc.id,
        nombreFuncionario: selectedFunc.nombre,
        tipoContrato: selectedFunc.tipoContrato || 'Plazo Fijo',
        tipoTurno: turnoForm.tipoTurno,
        templateId: turnoForm.templateId,
        nombreHorario: tmpl.isManual ? `Refuerzo Manual (${turnoForm.horaInicio} - ${turnoForm.horaFin})` : tmpl.nombreHorario,
        fecha: turnoForm.fechaInicio,
        horaInicio: turnoForm.horaInicio,
        horaFin: turnoForm.horaFin,
        fechaInicio: Timestamp.fromDate(startDateTime),
        fechaFin: Timestamp.fromDate(endDateTime),
        inicio: startDateTime.toISOString(),
        termino: endDateTime.toISOString(),
        rolTurno: turnoForm.rolTurno || selectedFunc.tipoPrestador || 'Prestador',
        centroAsignacion: turnoForm.centroAsignado,
        centroSalud: turnoForm.centroAsignado,
        tipoLiquidacion,
        horasHabiles: horasCalc.horasHabiles,
        horasInhabiles: horasCalc.horasInhabiles,
        totalHoras: horasCalc.total,
        observaciones: turnoForm.observaciones || '',
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

      setTabData(prev => ({
        ...prev,
        turnos: [newTurn, ...(prev.turnos || [])]
      }));

      setShowAssignTurnoModal(false);
      showToast(`¡Turno asignado a ${selectedFunc.nombre} con éxito!`, 'success');
    } catch (err) {
      console.error("Error al guardar turno directo:", err);
      showToast("Error al guardar turno: " + err.message, "error");
    } finally {
      setSavingTurno(false);
    }
  };

  const handleDeleteTurnoDirecto = async (turnoId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar la asignación de este turno?")) return;

    try {
      await deleteDoc(doc(db, 'turnos', turnoId));
      setTabData(prev => ({
        ...prev,
        turnos: (prev.turnos || []).filter(t => t.id !== turnoId)
      }));
      showToast("Asignación de turno eliminada.", "success");
    } catch (err) {
      console.error("Error al eliminar turno:", err);
      showToast("No se pudo eliminar el turno: " + err.message, "error");
    }
  };

  const renderAssignTurnoModal = () => {
    if (!showAssignTurnoModal || !selectedFunc) return null;

    const tmpl = SCHEDULE_TEMPLATES.find(t => t.id === turnoForm.templateId) || SCHEDULE_TEMPLATES[0];
    const isManual = tmpl.isManual;

    let liveHabiles = 0;
    let liveInhabiles = 0;
    let liveTotal = 0;
    let validDates = false;

    try {
      const start = new Date(`${turnoForm.fechaInicio}T${turnoForm.horaInicio}:00`);
      const end = new Date(`${turnoForm.fechaFin}T${turnoForm.horaFin}:00`);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
        const calc = calcularHorasTurno(start, end);
        liveHabiles = calc.horasHabiles;
        liveInhabiles = calc.horasInhabiles;
        liveTotal = calc.total;
        validDates = true;
      }
    } catch {}

    const esHonorario = selectedFunc.tipoContrato === 'Honorario por horas' || selectedFunc.tipoContrato === 'Honorarios';
    const tipoLiquidacion = esHonorario ? 'Honorarios' : 'Horas Extras';

    return (
      <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up my-auto border border-gray-100">
          
          {/* Header */}
          <div className="p-6 bg-gradient-to-r from-secondary to-secondary-light text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md text-white">
                <Sparkles size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Asignación Directa de Turno</h3>
                <p className="text-xs text-gray-300 mt-0.5">
                  Funcionario: <strong className="text-white font-bold">{selectedFunc.nombre}</strong> ({selectedFunc.tipoContrato || 'Plazo Fijo'})
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAssignTurnoModal(false)}
              className="text-gray-300 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* 1. Tipo de Turno / Colores */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                1. Selección de Tipo de Turno & Color
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {Object.values(SHIFT_TYPES_CONFIG).map(shift => {
                  const isSelected = turnoForm.tipoTurno === shift.id;
                  return (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setTurnoForm(prev => ({ ...prev, tipoTurno: shift.id }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? `${shift.bg} ${shift.border} ring-2 ring-offset-1 ring-primary/40 font-bold shadow-sm`
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-black">{shift.label}</span>
                        <span className={`w-3 h-3 rounded-full ${shift.dot}`} />
                      </div>
                      <span className="text-[10px] font-semibold opacity-70 mt-1">Color: {shift.colorName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Plantilla de Horario */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">
                2. Plantilla de Horario
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SCHEDULE_TEMPLATES.map(t => {
                  const isSelected = turnoForm.templateId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTemplateChange(t.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-primary/5 border-primary text-secondary ring-2 ring-primary/20 font-bold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-secondary">{t.nombreHorario}</p>
                        {t.isManual && <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-bold uppercase">Manual</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium mt-1">
                        {t.horaInicio} → {t.horaFin} {t.cruzaDia ? '(Día Siguiente)' : ''}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{t.diasSemana}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Fechas y Horas */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock3 size={15} className="text-primary" />
                  {isManual ? 'Configuración Manual de Horas (Refuerzo)' : 'Definición de Fechas & Horas'}
                </span>
                {isManual && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">
                    Modo Refuerzo Libre
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Inicio */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Fecha & Hora Inicio</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={turnoForm.fechaInicio}
                      onChange={e => {
                        const newFecha = e.target.value;
                        setTurnoForm(prev => {
                          let newFin = prev.fechaFin;
                          if (tmpl.cruzaDia && newFecha) {
                            const d = new Date(newFecha + 'T00:00:00');
                            d.setDate(d.getDate() + 1);
                            newFin = d.toISOString().split('T')[0];
                          } else if (!isManual) {
                            newFin = newFecha;
                          }
                          return { ...prev, fechaInicio: newFecha, fechaFin: newFin };
                        });
                      }}
                      className="input-field bg-white text-xs font-bold text-secondary"
                    />
                    <input
                      type="time"
                      value={turnoForm.horaInicio}
                      onChange={e => setTurnoForm(prev => ({ ...prev, horaInicio: e.target.value }))}
                      className="input-field bg-white text-xs font-bold text-secondary"
                      disabled={!isManual}
                    />
                  </div>
                </div>

                {/* Término */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Fecha & Hora Término</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={turnoForm.fechaFin}
                      onChange={e => setTurnoForm(prev => ({ ...prev, fechaFin: e.target.value }))}
                      className="input-field bg-white text-xs font-bold text-secondary"
                      disabled={!isManual && !tmpl.cruzaDia}
                    />
                    <input
                      type="time"
                      value={turnoForm.horaFin}
                      onChange={e => setTurnoForm(prev => ({ ...prev, horaFin: e.target.value }))}
                      className="input-field bg-white text-xs font-bold text-secondary"
                      disabled={!isManual}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Rol y Centro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Rol / Función en el Turno</label>
                <input
                  type="text"
                  value={turnoForm.rolTurno}
                  onChange={e => setTurnoForm(prev => ({ ...prev, rolTurno: e.target.value }))}
                  placeholder="Ej: Enfermero Jefe, Refuerzo TENS, etc."
                  className="w-full input-field bg-gray-50 text-xs font-bold text-secondary"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Centro de Salud</label>
                <select
                  value={turnoForm.centroAsignado}
                  onChange={e => setTurnoForm(prev => ({ ...prev, centroAsignado: e.target.value }))}
                  className="w-full input-field bg-gray-50 text-xs font-bold text-secondary appearance-none"
                >
                  <option>SAR Arpillerista Elsa Romo Aravena</option>
                </select>
              </div>
            </div>

            {/* 5. Selección de Liquidación Asociada & Desglose de Horas */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    5. Liquidación Asociada al Turno
                  </span>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Contrato del funcionario: <strong className="text-secondary">{selectedFunc.tipoContrato || 'Plazo Fijo'}</strong>. Puedes modificar la modalidad si corresponde:
                  </p>
                </div>
                {validDates && (
                  <div className="text-left sm:text-right bg-white p-3 rounded-xl border border-gray-100 shadow-sm shrink-0">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Desglose Calculado</span>
                    <p className="text-base font-black text-secondary">
                      {liveTotal} hrs Totales
                    </p>
                    <p className="text-[10px] text-gray-500 font-semibold">
                      Hábiles: <span className="text-emerald-600 font-bold">{liveHabiles}h</span> | Inhábiles: <span className="text-amber-600 font-bold">{liveInhabiles}h</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Botones de Selección de Liquidación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTurnoForm(prev => ({ ...prev, tipoLiquidacion: 'Horas Extras' }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    (turnoForm.tipoLiquidacion || 'Horas Extras') === 'Horas Extras'
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/30 text-emerald-900 font-bold shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-black block">Horas Extras</span>
                    <span className="text-[10px] text-gray-400 font-medium">Asociado a Plazo Fijo / Nómina</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    (turnoForm.tipoLiquidacion || 'Horas Extras') === 'Horas Extras' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-300'
                  }`}>
                    {(turnoForm.tipoLiquidacion || 'Horas Extras') === 'Horas Extras' && <Check size={12} />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTurnoForm(prev => ({ ...prev, tipoLiquidacion: 'Honorarios' }))}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    turnoForm.tipoLiquidacion === 'Honorarios'
                      ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/30 text-blue-900 font-bold shadow-sm'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div>
                    <span className="text-xs font-black block">Honorarios</span>
                    <span className="text-[10px] text-gray-400 font-medium">Asociado a Pago por Horas</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    turnoForm.tipoLiquidacion === 'Honorarios' ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
                  }`}>
                    {turnoForm.tipoLiquidacion === 'Honorarios' && <Check size={12} />}
                  </div>
                </button>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Observaciones (Opcional)</label>
              <textarea
                value={turnoForm.observaciones}
                onChange={e => setTurnoForm(prev => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Ej: Turno de refuerzo por contingencia o reemplazo."
                rows={2}
                className="w-full input-field bg-gray-50 text-xs font-medium text-secondary resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
            <button
              onClick={() => setShowAssignTurnoModal(false)}
              className="px-5 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveTurnoDirecto}
              disabled={savingTurno}
              className="btn-primary py-3 px-6 flex items-center gap-2 text-xs font-bold uppercase tracking-wider shadow-lg shadow-primary/20"
            >
              {savingTurno ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Confirmar Asignación
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════ Derived ═════════════════════════════════════════════════════════

  const filtered = funcionarios.filter(f => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q ||
      f.nombre?.toLowerCase().includes(q) ||
      (f.rut || f.id)?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || f.status === filterStatus;
    const matchEst = filterEstamento === 'all' || f.categoria === filterEstamento;
    return matchSearch && matchStatus && matchEst;
  });

  // ═══════════ Actions: Expediente & Profile ══════════════════════════════════

  const openExpediente = (f) => {
    setSelectedFunc(f);
    setActiveTab('perfil');
    setIsEditingProfile(false);
    setTabData({});
    setNovedadForm({ fechaInicio: '', fechaFin: '', observacion: '' });
  };

  const closeExpediente = () => {
    setSelectedFunc(null);
    setIsEditingProfile(false);
  };

  const startEditProfile = () => {
    if (!selectedFunc) return;
    setEditProfileData({
      nombre: selectedFunc.nombre || '',
      rut: selectedFunc.rut || selectedFunc.id || '',
      correoInstitucional: selectedFunc.correoInstitucional || '',
      telefono: selectedFunc.telefono || '',
      fechaNacimiento: selectedFunc.fechaNacimiento || '',
      tipoPrestador: selectedFunc.tipoPrestador || 'Administrativo',
      centroAsignado: selectedFunc.centroAsignado || 'SAR Arpillerista Elsa Romo Aravena',
      categoria: selectedFunc.categoria || 'E',
      grado: selectedFunc.grado || '15',
      tipoContrato: selectedFunc.tipoContrato || 'Honorario por horas',
      banco: selectedFunc.banco || '',
      tipoCuenta: selectedFunc.tipoCuenta || '',
      numeroCuenta: selectedFunc.numeroCuenta || '',
      status: selectedFunc.status || 'activo'
    });
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!editProfileData.nombre || !editProfileData.rut || !editProfileData.correoInstitucional) {
      return showToast('Completa Nombre, RUT y Correo Institucional.', 'warning');
    }

    if (!isValidEmailDomain(editProfileData.correoInstitucional)) {
      return showToast('El correo institucional debe pertenecer al dominio @cormumel.cl', 'error');
    }

    setSavingProfile(true);
    try {
      const docId = selectedFunc.id || selectedFunc.rut;
      const userRef = doc(db, 'usuarios', docId);
      
      const payload = {
        ...editProfileData,
        correoInstitucional: editProfileData.correoInstitucional.toLowerCase().trim(),
        rut: editProfileData.rut.replace(/[.\-]/g, '').toUpperCase(),
        grado: editProfileData.grado || '',
        nivel: Number(editProfileData.grado) || 0,
        categoria: editProfileData.categoria || '',
        updatedAt: new Date().toISOString()
      };

      await setDoc(userRef, payload, { merge: true });

      const updatedFunc = { ...selectedFunc, ...payload };
      setSelectedFunc(updatedFunc);
      setFuncionarios(prev => prev.map(u => (u.id === docId || u.rut === updatedFunc.rut) ? updatedFunc : u));
      setIsEditingProfile(false);
      showToast('¡Información del funcionario actualizada con éxito!', 'success');
    } catch (err) {
      console.error('Error al guardar perfil:', err);
      showToast('Error al guardar datos: ' + err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // ═══════════ Actions: Inactivar & Eliminar Funcionario ════════════════════════

  const handleToggleStatus = async () => {
    if (!selectedFunc) return;
    const isCurrentlyInactive = selectedFunc.status === 'inactivo';
    const newStatus = isCurrentlyInactive ? 'activo' : 'inactivo';
    const actionLabel = isCurrentlyInactive ? 'activar' : 'inactivar';

    if (!window.confirm(`¿Estás seguro de que deseas ${actionLabel} a ${selectedFunc.nombre}?`)) return;

    try {
      const docId = selectedFunc.id || selectedFunc.rut;
      const userRef = doc(db, 'usuarios', docId);
      await setDoc(userRef, { status: newStatus, updatedAt: new Date().toISOString() }, { merge: true });

      const updated = { ...selectedFunc, status: newStatus };
      setSelectedFunc(updated);
      setFuncionarios(prev => prev.map(u => (u.id === docId || u.rut === updated.rut) ? updated : u));
      showToast(`El funcionario ahora se encuentra en estado: ${newStatus.toUpperCase()}`, 'success');
    } catch (err) {
      showToast('Error al actualizar estado: ' + err.message, 'error');
    }
  };

  const handleDeleteFuncionario = async () => {
    if (!selectedFunc) return;
    if (!window.confirm(`⚠️ ¿ELIMINAR FUNCIONARIO?\n\n¿Estás completamente seguro de eliminar a ${selectedFunc.nombre} (${selectedFunc.rut}) del sistema?\nEsta acción es permanente.`)) return;

    try {
      const docId = selectedFunc.id || selectedFunc.rut;
      await deleteDoc(doc(db, 'usuarios', docId));

      setFuncionarios(prev => prev.filter(u => u.id !== docId && u.rut !== selectedFunc.rut));
      setSelectedFunc(null);
      showToast('Funcionario eliminado correctamente del sistema.', 'success');
    } catch (err) {
      showToast('Error al eliminar funcionario: ' + err.message, 'error');
    }
  };

  // ═══════════ Actions: Photo Upload & Cropping ═════════════════════════════════

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('Por favor selecciona un archivo de imagen válido.', 'warning');

    const reader = new FileReader();
    reader.onload = (evt) => {
      setRawImageSrc(evt.target.result);
      setPhotoZoom(1);
      setPhotoOffset({ x: 0, y: 0 });
      setShowPhotoModal(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCroppedPhoto = async () => {
    if (!rawImageSrc || !selectedFunc) return;
    setSavingPhoto(true);
    try {
      const img = new Image();
      img.src = rawImageSrc;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Canvas setup: 300x375 (4:5 Passport ratio)
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 375;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 300, 375);

      // Match 240x300 interactive UI preview to 300x375 Canvas (1.25x scale factor)
      const previewFitScale = Math.min(240 / img.width, 300 / img.height);
      const canvasFitScale = previewFitScale * 1.25;
      const currentScale = canvasFitScale * photoZoom;
      const drawWidth = img.width * currentScale;
      const drawHeight = img.height * currentScale;

      const drawX = (300 - drawWidth) / 2 + (photoOffset.x * 1.25);
      const drawY = (375 - drawHeight) / 2 + (photoOffset.y * 1.25);

      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      const base64Data = canvas.toDataURL('image/jpeg', 0.85);

      const docId = selectedFunc.id || selectedFunc.rut;
      const userRef = doc(db, 'usuarios', docId);
      await setDoc(userRef, { fotoUrl: base64Data, updatedAt: new Date().toISOString() }, { merge: true });

      const updated = { ...selectedFunc, fotoUrl: base64Data };
      setSelectedFunc(updated);
      setFuncionarios(prev => prev.map(u => (u.id === docId || u.rut === updated.rut) ? updated : u));

      setShowPhotoModal(false);
      setRawImageSrc(null);
      showToast('¡Fotografía tamaño carnet guardada exitosamente!', 'success');
    } catch (err) {
      console.error('Error al procesar foto:', err);
      showToast('Error al procesar la imagen: ' + err.message, 'error');
    } finally {
      setSavingPhoto(false);
    }
  };

  // ═══════════ Actions: Novedades & Pre-Reg ════════════════════════════════════

  const handleAddNovedad = async () => {
    if (!novedadForm.fechaInicio) return showToast('Selecciona la fecha de inicio.', 'warning');
    const rut = selectedFunc?.rut || selectedFunc?.id;
    const tipo = NOVEDAD_TIPO[activeTab];
    setSavingNovedad(true);
    try {
      await addDoc(collection(db, 'novedades'), {
        rut,
        nombreFuncionario: selectedFunc.nombre,
        tipo,
        fechaInicio: novedadForm.fechaInicio,
        fechaFin: novedadForm.fechaFin || novedadForm.fechaInicio,
        observacion: novedadForm.observacion || '',
        estado: 'registrado',
        creadoPor: userData?.rut || userData?.id || '',
        createdAt: new Date().toISOString()
      });
      setNovedadForm({ fechaInicio: '', fechaFin: '', observacion: '' });
      setTabData(prev => { const n = { ...prev }; delete n[activeTab]; return n; });
      showToast('Novedad registrada con éxito.', 'success');
    } catch (err) {
      showToast('Error al registrar: ' + err.message, 'error');
    } finally {
      setSavingNovedad(false);
    }
  };

  const handlePreRegSubmit = async (e) => {
    e.preventDefault();
    if (!regNombre || !regRut || !regCorreo || !regTipoPrestador || !regTipoContrato || !regCategoria || !regGrado) {
      return showToast('Completa todos los campos obligatorios.', 'warning');
    }
    const cleanRUT = regRut.replace(/[.\-]/g, '').toUpperCase();
    if (cleanRUT.length < 7) return showToast('RUT inválido.', 'error');
    
    if (!isValidEmailDomain(regCorreo)) {
      return showToast('El correo institucional debe terminar en @cormumel.cl', 'error');
    }

    setIsRegistering(true);
    try {
      const userDocRef = doc(db, 'usuarios', cleanRUT);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) { setIsRegistering(false); return showToast('Este RUT ya está registrado.', 'warning'); }

      await setDoc(userDocRef, {
        nombre: regNombre,
        rut: cleanRUT,
        correoInstitucional: regCorreo.toLowerCase().trim(),
        tipoPrestador: regTipoPrestador,
        centroAsignado: regCentroAsignado,
        tipoContrato: regTipoContrato,
        grado: regGrado || '',
        nivel: Number(regGrado) || 0,
        categoria: regCategoria || '',
        role: 'user',
        status: 'pre-registrado',
        mustChangePassword: true,
        createdAt: new Date().toISOString()
      });

      setRegisteredUser({ nombre: regNombre, rut: cleanRUT, correo: regCorreo.toLowerCase().trim(), claveInicial: cleanRUT.substring(0, 6) });
      setShowSuccessModal(true);
      setShowPreRegModal(false);
      setRegNombre(''); setRegRut(''); setRegCorreo(''); setRegTipoPrestador('');
      setRegGrado(''); setRegCategoria('');
      fetchFuncionarios();
    } catch (err) {
      alert('Error al registrar: ' + err.message);
    } finally {
      setIsRegistering(false);
    }
  };

  // ═══════════ Shared UI Components ════════════════════════════════════════════

  const InfoCell = ({ label, value, icon: Icon }) => (
    <div className="bg-[#F8FAFC] border border-gray-100 rounded-2xl p-5 hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon size={16} className="text-gray-400" />}
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-base font-bold text-secondary">{value || '—'}</p>
    </div>
  );

  const EmptyTabState = ({ icon: Icon, label }) => (
    <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center text-gray-400">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon size={28} className="opacity-40" />
      </div>
      <p className="font-bold text-base text-secondary">Sin registros de {label}</p>
      <p className="text-xs text-gray-400 mt-1">Los datos ingresados aparecerán detallados en esta sección.</p>
    </div>
  );

  const NovDeadForm = ({ label }) => (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
      <h4 className="text-sm font-bold text-secondary uppercase tracking-wider">Registrar {label}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Fecha Inicio *</label>
          <input type="date" value={novedadForm.fechaInicio}
            onChange={e => setNovedadForm(f => ({ ...f, fechaInicio: e.target.value }))}
            className="w-full input-field bg-gray-50 text-sm" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Fecha Término</label>
          <input type="date" value={novedadForm.fechaFin}
            onChange={e => setNovedadForm(f => ({ ...f, fechaFin: e.target.value }))}
            className="w-full input-field bg-gray-50 text-sm" />
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Observación</label>
        <input type="text" placeholder="Ej: Licencia médica presentada en jefatura..." value={novedadForm.observacion}
          onChange={e => setNovedadForm(f => ({ ...f, observacion: e.target.value }))}
          className="w-full input-field bg-gray-50 text-sm" />
      </div>
      <div className="flex justify-end">
        <button onClick={handleAddNovedad} disabled={savingNovedad}
          className="btn-primary text-xs py-3 px-6 flex items-center justify-center gap-2">
          {savingNovedad ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Guardar {label}
        </button>
      </div>
    </div>
  );

  const NovList = ({ tab, emptyIcon, label }) => {
    const data = tabData[tab];
    if (tabLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>;
    if (!data || data.length === 0) return <EmptyTabState icon={emptyIcon} label={label} />;
    return (
      <div className="space-y-3">
        {data.map(item => (
          <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-base font-bold text-secondary">{item.fechaInicio}{item.fechaFin && item.fechaFin !== item.fechaInicio ? ` → ${item.fechaFin}` : ''}</p>
              {item.observacion && <p className="text-xs text-gray-500 mt-1">{item.observacion}</p>}
            </div>
            <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {item.estado || 'registrado'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ═══════════ Tab Renderers for Full View ═════════════════════════════════════

  const renderTabContent = () => {
    const f = selectedFunc;
    if (!f) return null;

    if (activeTab === 'perfil') {
      // IF EDITING PROFILE
      if (isEditingProfile) {
        return (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-secondary flex items-center gap-2">
                <Edit3 size={20} className="text-primary" /> Editar Expediente del Funcionario
              </h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">
                  Cancelar
                </button>
                <button onClick={handleSaveProfile} disabled={savingProfile}
                  className="btn-primary text-xs py-2.5 px-6 flex items-center gap-2">
                  {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar Cambios
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nombre Completo *</label>
                <input type="text" value={editProfileData.nombre || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, nombre: e.target.value }))}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">RUT *</label>
                <input type="text" value={editProfileData.rut || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, rut: formatRutInput(e.target.value) }))}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Correo Institucional *</label>
                <input type="email" value={editProfileData.correoInstitucional || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, correoInstitucional: e.target.value }))}
                  placeholder="usuario@cormumel.cl"
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Teléfono</label>
                <input type="text" value={editProfileData.telefono || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, telefono: e.target.value }))}
                  placeholder="+56 9 1234 5678"
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Fecha de Nacimiento</label>
                <input type="date" value={editProfileData.fechaNacimiento || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, fechaNacimiento: e.target.value }))}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Especialidad / Prestador</label>
                <select value={editProfileData.tipoPrestador || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, tipoPrestador: e.target.value }))}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm appearance-none">
                  {['Médico','Enfermero','TENS','Conductor','Administrativo','Auxiliar'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Estamento (Ley 19.378) *</label>
                <select value={editProfileData.categoria || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, categoria: e.target.value }))}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm appearance-none">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>Cat {k} — {v}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nivel / Grado *</label>
                <select value={editProfileData.grado || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, grado: e.target.value }))}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm appearance-none">
                  {Array.from({ length: 15 }, (_, i) => 15 - i).map(l => <option key={l} value={l}>Nivel {l}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tipo de Contrato</label>
                <select value={editProfileData.tipoContrato || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, tipoContrato: e.target.value }))}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm appearance-none">
                  <option value="Honorario por horas">Honorario por horas</option>
                  <option value="Contrata Plazo Fijo">Contrata Plazo Fijo</option>
                  <option value="Planta">Planta</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Centro Asignado</label>
                <select value={editProfileData.centroAsignado || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, centroAsignado: e.target.value }))}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm appearance-none">
                  <option>SAR Arpillerista Elsa Romo Aravena</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Estado en Sistema</label>
                <select value={editProfileData.status || ''}
                  onChange={e => setEditProfileData(d => ({ ...d, status: e.target.value }))}
                  className="w-full input-field bg-gray-50 font-bold text-secondary text-sm appearance-none">
                  <option value="activo">Activo</option>
                  <option value="pre-registrado">Pre-registrado</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6 space-y-4">
              <h4 className="text-sm font-bold text-secondary uppercase tracking-wider">Datos Bancarios para Depósito</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Banco</label>
                  <input type="text" value={editProfileData.banco || ''} placeholder="Ej: Banco Estado"
                    onChange={e => setEditProfileData(d => ({ ...d, banco: e.target.value }))}
                    className="w-full input-field bg-gray-50 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tipo de Cuenta</label>
                  <input type="text" value={editProfileData.tipoCuenta || ''} placeholder="Ej: CuentaRUT / Corriente"
                    onChange={e => setEditProfileData(d => ({ ...d, tipoCuenta: e.target.value }))}
                    className="w-full input-field bg-gray-50 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Número de Cuenta</label>
                  <input type="text" value={editProfileData.numeroCuenta || ''} placeholder="Ej: 18778854"
                    onChange={e => setEditProfileData(d => ({ ...d, numeroCuenta: e.target.value }))}
                    className="w-full input-field bg-gray-50 text-sm" />
                </div>
              </div>
            </div>
          </div>
        );
      }

      // DISPLAY PROFILE
      return (
        <div className="space-y-8">
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-secondary tracking-tight">Información Laboral & Personal</h3>
              <button onClick={startEditProfile}
                className="btn-primary text-xs py-2 px-4 flex items-center gap-2">
                <Edit3 size={15} /> Editar Datos
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <InfoCell label="Nombre Completo"   value={f.nombre} icon={User} />
              <InfoCell label="RUT"               value={f.rut || f.id} icon={Hash} />
              <InfoCell label="Correo Institucional" value={f.correoInstitucional} icon={Mail} />
              <InfoCell label="Teléfono de Contacto" value={f.telefono} icon={Phone} />
              <InfoCell label="Fecha Nacimiento"  value={f.fechaNacimiento} icon={Calendar} />
              <InfoCell label="Centro Asignado"   value={f.centroAsignado} icon={Building2} />
              <InfoCell label="Especialidad / Cargo" value={f.tipoPrestador} icon={Briefcase} />
              <InfoCell label="Estamento (Ley 19.378)" value={f.categoria ? `Cat ${f.categoria} — ${CATEGORY_LABELS[f.categoria]}` : null} icon={FileText} />
              <InfoCell label="Nivel / Grado"     value={f.grado ? `Nivel ${f.grado}` : null} icon={FileText} />
              <InfoCell label="Tipo de Contrato"  value={f.tipoContrato} icon={FileText} />
              <InfoCell label="Estado en Sistema" value={(STATUS_CONFIG[f.status] || STATUS_CONFIG['pre-registrado']).label} icon={ShieldCheck} />
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2.5 rounded-xl text-primary"><CreditCard size={20} /></div>
              <h3 className="text-lg font-bold text-secondary tracking-tight">Datos para Depósitos Bancarios</h3>
            </div>
            {f.banco || f.tipoCuenta || f.numeroCuenta ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <InfoCell label="Banco"          value={f.banco} />
                <InfoCell label="Tipo de Cuenta" value={f.tipoCuenta} />
                <InfoCell label="Número de Cuenta" value={f.numeroCuenta} />
              </div>
            ) : (
              <div className="p-6 bg-gray-50 rounded-2xl text-center text-gray-400 text-sm">
                El funcionario aún no ha registrado sus datos bancarios en su perfil.
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'turnos') {
      const data = tabData.turnos || [];
      const esHonorario = f.tipoContrato === 'Honorario por horas' || f.tipoContrato === 'Honorarios';

      // Calendar Calculations
      const calYear = funcCalendarDate.getFullYear();
      const calMonth = funcCalendarDate.getMonth();
      const calMonthName = funcCalendarDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase();

      const daysInM = new Date(calYear, calMonth + 1, 0).getDate();
      const firstDayIdx = new Date(calYear, calMonth, 1).getDay();
      const adjFirstDay = firstDayIdx === 0 ? 6 : firstDayIdx - 1;

      const funcCalCells = [];
      for (let i = 0; i < adjFirstDay; i++) {
        funcCalCells.push({ isPadding: true, key: `pad-${i}` });
      }
      for (let d = 1; d <= daysInM; d++) {
        const dateObj = new Date(calYear, calMonth, d);
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        funcCalCells.push({
          isPadding: false,
          day: d,
          dateStr,
          isWeekend,
          key: `day-${dateStr}`
        });
      }

      // Turnos for selected month
      const monthTurns = data.filter(t => {
        const fStr = t.fecha || (t.inicio ? t.inicio.split('T')[0] : '');
        if (!fStr) return false;
        const [y, m] = fStr.split('-').map(Number);
        return y === calYear && m === (calMonth + 1);
      });

      // Monthly totals
      const totalsFunc = {
        'Turno 1': monthTurns.filter(t => t.tipoTurno === 'Turno 1' || t.tipoTurno === 'Turno A').length,
        'Turno 2': monthTurns.filter(t => t.tipoTurno === 'Turno 2' || t.tipoTurno === 'Turno B').length,
        'Turno 3': monthTurns.filter(t => t.tipoTurno === 'Turno 3' || t.tipoTurno === 'Turno C').length,
        'Turno 4': monthTurns.filter(t => t.tipoTurno === 'Refuerzo' || t.tipoTurno === 'Turno 4').length
      };

      return (
        <div className="space-y-6 animate-fade-in">
          {/* Header Controls */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-secondary">Turnos & Refuerzos Asignados</h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    esHonorario ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {esHonorario ? 'Modalidad Honorarios' : 'Modalidad Horas Extras / Plazo Fijo'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Visualización en grilla de calendario de turnos asignados a {f.nombre}.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* View Switcher */}
              <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 text-xs font-bold">
                <button
                  onClick={() => setTurnoViewMode('calendar')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    turnoViewMode === 'calendar' ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-secondary'
                  }`}
                >
                  Grilla Calendario
                </button>
                <button
                  onClick={() => setTurnoViewMode('cards')}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    turnoViewMode === 'cards' ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-secondary'
                  }`}
                >
                  Lista Tarjetas ({data.length})
                </button>
              </div>

              {/* Assign Button */}
              <button
                onClick={handleOpenAssignTurnoModal}
                className="btn-primary text-xs py-2.5 px-4 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0"
              >
                <Plus size={16} /> + Asignar Turno / Refuerzo
              </button>
            </div>
          </div>

          {tabLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : turnoViewMode === 'calendar' ? (
            /* CALENDAR GRID VIEW */
            <div className="space-y-6">
              {/* Month Navigator Header */}
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest pl-2">
                  Pauta de {f.nombre}
                </span>

                <div className="flex items-center gap-4 bg-tertiary px-5 py-2 rounded-2xl border border-gray-100">
                  <button
                    onClick={() => setFuncCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                    className="p-1.5 hover:bg-white rounded-xl text-secondary transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-black text-secondary uppercase tracking-wider min-w-[140px] text-center">
                    {calMonthName}
                  </span>
                  <button
                    onClick={() => setFuncCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                    className="p-1.5 hover:bg-white rounded-xl text-secondary transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* 7-Column Calendar Grid */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/70 text-center font-extrabold text-xs tracking-wider">
                  {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dayName, idx) => (
                    <div 
                      key={dayName} 
                      className={`py-3.5 border-r border-gray-100 last:border-r-0 ${
                        idx >= 5 ? 'text-rose-600 bg-rose-50/30' : 'text-gray-600'
                      }`}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-gray-100/20">
                  {funcCalCells.map(cell => {
                    if (cell.isPadding) {
                      return <div key={cell.key} className="bg-gray-50/40 min-h-[120px]" />;
                    }

                    const dayTurns = monthTurns.filter(t => t.fecha === cell.dateStr);

                    return (
                      <div
                        key={cell.key}
                        className={`min-h-[130px] p-2 flex flex-col justify-between transition-colors bg-white hover:bg-gray-50/50 ${
                          cell.isWeekend ? 'bg-rose-50/10' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                          <span className={`text-sm font-black ${cell.isWeekend ? 'text-rose-600' : 'text-secondary'}`}>
                            {cell.day}
                          </span>
                          {dayTurns.length === 0 && (
                            <button
                              onClick={() => {
                                setTurnoForm(prev => ({ ...prev, fechaInicio: cell.dateStr, fechaFin: cell.dateStr }));
                                setShowAssignTurnoModal(true);
                              }}
                              className="text-[10px] text-gray-300 hover:text-primary font-bold transition-colors"
                              title="Asignar turno este día"
                            >
                              + Turno
                            </button>
                          )}
                        </div>

                        <div className="space-y-1.5 mt-1.5 flex-1">
                          {dayTurns.map(t => {
                            const cfg = getShiftConfig(t.tipoTurno);
                            return (
                              <div
                                key={t.id}
                                className={`p-2 rounded-xl border text-xs flex flex-col justify-between ${cfg.bg} ${cfg.border} shadow-sm group relative`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-black text-secondary text-[11px] truncate">
                                    {cfg.label}
                                  </span>
                                  <button
                                    onClick={() => handleDeleteTurnoDirecto(t.id)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-rose-600 hover:bg-rose-100 rounded transition-all"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                                <p className="text-[10px] text-gray-600 font-medium truncate mt-0.5">
                                  {t.horaInicio} - {t.horaFin}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TOTAL DE TURNOS ASIGNADOS Summary Cards Footer */}
              <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 space-y-4">
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  TOTAL DE TURNOS ASIGNADOS - {calMonthName}
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="bg-white rounded-3xl p-6 border border-emerald-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider">Turno 1</span>
                    <span className="text-4xl font-black text-emerald-600">{totalsFunc['Turno 1']}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Turnos</span>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-amber-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wider">Turno 2</span>
                    <span className="text-4xl font-black text-amber-500">{totalsFunc['Turno 2']}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Turnos</span>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-sky-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-xs font-extrabold text-sky-800 uppercase tracking-wider">Turno 3</span>
                    <span className="text-4xl font-black text-sky-600">{totalsFunc['Turno 3']}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Turnos</span>
                  </div>

                  <div className="bg-white rounded-3xl p-6 border border-purple-200 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-xs font-extrabold text-purple-800 uppercase tracking-wider">Turno 4 / Refuerzo</span>
                    <span className="text-4xl font-black text-purple-600">{totalsFunc['Turno 4']}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Turnos</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* CARDS LIST VIEW */
            data.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                  <Calendar size={32} />
                </div>
                <div>
                  <p className="text-base font-bold text-secondary">Sin turnos asignados</p>
                  <p className="text-xs text-gray-400 mt-1">Este funcionario aún no posee asignaciones registradas.</p>
                </div>
                <button
                  onClick={handleOpenAssignTurnoModal}
                  className="btn-primary text-xs py-2.5 px-5 inline-flex items-center gap-2"
                >
                  <Plus size={15} /> Asignar Primer Turno
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.map(t => {
                  const config = getShiftConfig(t.tipoTurno || t.turno || t.tipo);
                  const fechaDisplay = t.fecha || (t.inicio ? new Date(t.inicio).toLocaleDateString('es-CL') : 'Fecha n/d');
                  const horaInicioStr = t.horaInicio || (t.inicio ? new Date(t.inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
                  const horaFinStr = t.horaFin || (t.termino ? new Date(t.termino).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
                  const totalH = t.totalHoras || (t.horasHabiles !== undefined ? (t.horasHabiles + t.horasInhabiles) : null);

                  return (
                    <div key={t.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all relative group flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${config.badgeSoft}`}>
                            {config.label} ({config.colorName})
                          </span>
                          <div className="flex items-center gap-1">
                            <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              t.tipoLiquidacion === 'Honorarios' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            }`}>
                              {t.tipoLiquidacion || (esHonorario ? 'Honorarios' : 'Horas Extras')}
                            </span>
                            <button
                              onClick={() => handleDeleteTurnoDirecto(t.id)}
                              className="p-1 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Eliminar asignación"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div>
                          <p className="text-base font-extrabold text-secondary tracking-tight">
                            {t.nombreHorario || 'Turno Asignado'}
                          </p>
                          <p className="text-xs text-gray-500 font-semibold mt-0.5 flex items-center gap-1.5">
                            <Calendar size={13} className="text-primary" /> {fechaDisplay}
                          </p>
                        </div>

                        <div className="bg-gray-50/80 rounded-2xl p-3.5 space-y-2 border border-gray-100 text-xs">
                          <div className="flex items-center justify-between text-gray-600 font-medium">
                            <span className="flex items-center gap-1"><Clock3 size={13} className="text-gray-400" /> Horario:</span>
                            <span className="font-bold text-secondary">{horaInicioStr} → {horaFinStr}</span>
                          </div>
                          {totalH !== null && totalH !== undefined && (
                            <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                              <span className="text-gray-400 font-medium">Duración:</span>
                              <span className="font-bold text-secondary">{totalH} hrs</span>
                            </div>
                          )}
                          {(t.horasHabiles !== undefined || t.horasInhabiles !== undefined) && (
                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                              <span>Hábil: <strong className="text-secondary">{t.horasHabiles || 0}h</strong></span>
                              <span>Inhábil/Festivo: <strong className="text-secondary">{t.horasInhabiles || 0}h</strong></span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                        <span className="font-semibold text-secondary flex items-center gap-1">
                          <Tag size={12} className="text-gray-400" /> {t.rolTurno || t.rol || 'Prestador'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-md">
                          {t.estado || 'Programado'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      );
    }

    if (activeTab === 'marcaje') {
      return (
        <div className="space-y-6">
          <NovDeadForm label="Marcaje Manual" />
          <NovList tab="marcaje" emptyIcon={Clock} label="marcajes" />
        </div>
      );
    }

    if (activeTab === 'licencias') {
      return (
        <div className="space-y-6">
          <NovDeadForm label="Licencia Médica" />
          <NovList tab="licencias" emptyIcon={Stethoscope} label="licencias médicas" />
        </div>
      );
    }

    if (activeTab === 'vacaciones') {
      return (
        <div className="space-y-6">
          <NovDeadForm label="Vacaciones / Permiso" />
          <NovList tab="vacaciones" emptyIcon={Umbrella} label="vacaciones o permisos" />
        </div>
      );
    }

    if (activeTab === 'inasistencias') {
      return (
        <div className="space-y-6">
          <NovDeadForm label="Inasistencia" />
          <NovList tab="inasistencias" emptyIcon={AlertTriangle} label="inasistencias" />
        </div>
      );
    }

    if (activeTab === 'honorarios') {
      const esHonorario = f.tipoContrato === 'Honorario por horas';
      if (!esHonorario) {
        return (
          <div className="bg-white border border-gray-100 rounded-3xl p-12 text-center text-gray-400">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase size={28} className="opacity-40" />
            </div>
            <p className="font-bold text-base text-secondary">Sin honorarios variables por horas</p>
            <p className="text-sm mt-1 text-gray-500">Tipo de Contrato: <strong className="text-secondary">{f.tipoContrato}</strong></p>
            <p className="text-xs text-gray-400 mt-1">Este funcionario percibe remuneración mediante nómina mensual fija según su Ley 19.378.</p>
          </div>
        );
      }
      const data = tabData.honorarios;
      const total = (data || []).reduce((s, h) => s + (Number(h.montoTotal) || 0), 0);
      return (
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Cálculo de Honorarios Dinámicos Ley 19.378</p>
              <p className="text-sm font-semibold text-secondary">
                Estamento <strong className="text-primary">Cat {f.categoria || 'E'}</strong> • Nivel <strong className="text-primary">{f.grado || '15'}</strong>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">La tarifa varía según horas hábiles e inhábiles/festivas asociadas al turno.</p>
            </div>
            <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Acumulado</p>
              <p className="text-3xl font-black text-secondary">${total.toLocaleString('es-CL')}</p>
            </div>
          </div>

          {tabLoading
            ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={28} /></div>
            : !data || data.length === 0
              ? <EmptyTabState icon={Wallet} label="registros de honorarios" />
              : <div className="space-y-3">
                  {data.map(h => (
                    <div key={h.id} className="bg-white border border-gray-100 rounded-2xl p-5 flex justify-between items-center shadow-sm">
                      <div>
                        <p className="text-base font-bold text-secondary">{h.fecha || h.periodo}</p>
                        <p className="text-xs text-gray-400 font-semibold">{h.horasTrabajadas || 0} horas prestadas ({h.tipoHora || 'hábiles/inhábiles'})</p>
                      </div>
                      <p className="text-2xl font-black text-primary">${Number(h.montoTotal || 0).toLocaleString('es-CL')}</p>
                    </div>
                  ))}
                </div>
          }
        </div>
      );
    }

    return null;
  };

  // ── Toast UI Renderer ───────────────────────────────────────────────────────
  const renderToast = () => {
    if (!toast) return null;
    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] animate-bounce-subtle pointer-events-auto">
        <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-bold backdrop-blur-xl ${
          toast.type === 'error'
            ? 'bg-rose-900/90 text-white border-rose-700/50'
            : toast.type === 'warning'
            ? 'bg-amber-900/90 text-white border-amber-700/50'
            : 'bg-secondary/95 text-white border-secondary-light/30 shadow-primary/20'
        }`}>
          {toast.type === 'error' ? (
            <XCircle className="text-rose-400 shrink-0" size={20} />
          ) : toast.type === 'warning' ? (
            <AlertCircle className="text-amber-400 shrink-0" size={20} />
          ) : (
            <CheckCircle2 className="text-emerald-400 shrink-0" size={20} />
          )}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  };

  // ═══════════ Main Layout Router ══════════════════════════════════════════════

  // IF PRE-REGISTRATION IS OPEN: RENDER FULL PAGE PRE-REGISTRATION VIEW
  if (showPreRegModal) {
    return (
      <>
        {renderToast()}
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => setShowPreRegModal(false)}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm">
            <ChevronLeft size={18} />
            Volver a la lista de funcionarios
          </button>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-8">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
            <div className="bg-primary/10 p-3.5 rounded-2xl text-primary"><Users size={28} /></div>
            <div>
              <h1 className="text-2xl font-bold text-secondary tracking-tight">Pre-registro de Funcionario</h1>
              <p className="text-sm text-gray-500 mt-0.5">Ingresa la información personal y laboral para autorizar el acceso del funcionario en Nodo APS.</p>
            </div>
          </div>

          <form onSubmit={handlePreRegSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Nombre Completo *</label>
                <input type="text" value={regNombre} onChange={e => setRegNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez González"
                  className="w-full input-field bg-gray-50/50 font-medium text-sm" required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">RUT *</label>
                <input type="text" value={regRut}
                  onChange={e => setRegRut(formatRutInput(e.target.value))}
                  placeholder="12345678-9"
                  className="w-full input-field bg-gray-50/50 font-bold text-sm" required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Correo Institucional *</label>
                <input type="email" value={regCorreo} onChange={e => setRegCorreo(e.target.value)}
                  placeholder="usuario@cormumel.cl"
                  className="w-full input-field bg-gray-50/50 font-medium text-sm" required />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Especialidad / Prestador *</label>
                <select value={regTipoPrestador} onChange={e => setRegTipoPrestador(e.target.value)}
                  className="w-full input-field bg-gray-50/50 appearance-none font-medium text-sm" required>
                  <option value="">Seleccionar especialidad...</option>
                  {['Médico','Enfermero','TENS','Conductor','Administrativo','Auxiliar'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Estamento (Cat. Ley 19.378) *</label>
                <select value={regCategoria} onChange={e => setRegCategoria(e.target.value)}
                  className="w-full input-field bg-gray-50/50 appearance-none font-semibold text-secondary text-sm" required>
                  <option value="">Seleccionar estamento...</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>Cat {k} — {v}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Nivel / Grado *</label>
                <select value={regGrado} onChange={e => setRegGrado(e.target.value)}
                  className="w-full input-field bg-gray-50/50 appearance-none font-semibold text-secondary text-sm" required>
                  <option value="">Seleccionar nivel...</option>
                  {Array.from({ length: 15 }, (_, i) => 15 - i).map(l => <option key={l} value={l}>Nivel {l}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Tipo de Contrato *</label>
                <select value={regTipoContrato} onChange={e => setRegTipoContrato(e.target.value)}
                  className="w-full input-field bg-gray-50/50 appearance-none font-semibold text-secondary text-sm" required>
                  <option value="Honorario por horas">Honorario por horas</option>
                  <option value="Contrata Plazo Fijo">Contrata Plazo Fijo</option>
                  <option value="Planta">Planta</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Centro Asignado</label>
                <select value={regCentroAsignado} onChange={e => setRegCentroAsignado(e.target.value)}
                  className="w-full input-field bg-gray-50/50 appearance-none font-medium text-sm">
                  <option>SAR Arpillerista Elsa Romo Aravena</option>
                </select>
              </div>
            </div>

            <div className="p-5 bg-primary/5 rounded-2xl border border-primary/15 flex items-start gap-3 text-xs text-gray-600">
              <Info size={20} className="text-primary shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                El valor por hora se calculará dinámicamente según la <strong className="text-secondary font-bold">Matriz Ley 19.378</strong> (distinguiendo horas hábiles e inhábiles/festivas) al programar los turnos del funcionario en el sistema.
              </p>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-gray-100 pt-6">
              <button type="button" onClick={() => setShowPreRegModal(false)}
                className="px-6 py-3.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-2xl transition-all uppercase tracking-wider">
                Cancelar
              </button>
              <button type="submit" disabled={isRegistering}
                className="btn-primary py-3.5 px-8 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider disabled:opacity-60">
                {isRegistering ? <><Loader2 size={18} className="animate-spin" />Registrando...</> : <><Users size={18} />Completar Pre-registro</>}
              </button>
            </div>
          </form>
        </div>
      </div>
      </>
    );
  }

  // IF PRE-REGISTRATION SUCCESS VIEW IS OPEN: RENDER FULL PAGE SUCCESS RECEIPT
  if (showSuccessModal && registeredUser) {
    return (
      <>
        {renderToast()}
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
          <div className="flex items-center justify-between gap-4">
            <button onClick={() => { setShowSuccessModal(false); setRegisteredUser(null); }}
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm">
              <ChevronLeft size={18} />
              Volver a la lista de funcionarios
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-6 bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 text-white p-3.5 rounded-2xl shadow-md"><ShieldCheck size={32} /></div>
                <div>
                  <h1 className="text-2xl font-bold text-secondary tracking-tight">¡Pre-registro Realizado con Éxito!</h1>
                  <p className="text-sm text-gray-600 mt-0.5">El funcionario ha sido registrado en el sistema. Se generaron sus credenciales de acceso inicial.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="bg-[#f8fafc] border border-gray-100 rounded-3xl p-8 space-y-6">
                <h3 className="text-base font-bold text-secondary uppercase tracking-wider">Resumen de Credenciales de Acceso</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                    <span className="text-gray-400 font-medium">Nombre Completo:</span>
                    <span className="font-bold text-secondary text-base">{registeredUser.nombre}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                    <span className="text-gray-400 font-medium">RUT / Documento:</span>
                    <span className="font-mono font-bold text-secondary">{registeredUser.rut}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200/60">
                    <span className="text-gray-400 font-medium">Correo Institucional:</span>
                    <span className="font-semibold text-secondary">{registeredUser.correo}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Contraseña Temporal:</span>
                    <span className="text-primary font-mono font-black text-xl tracking-wider">{registeredUser.claveInicial}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/15 flex items-start gap-4">
                  <Info size={24} className="text-primary shrink-0 mt-0.5" />
                  <div className="space-y-2 text-xs text-gray-600 leading-relaxed">
                    <p className="font-bold text-secondary text-sm">Instrucciones de Activación</p>
                    <p>La clave de acceso inicial corresponde automáticamente a los <strong>primeros 6 dígitos del RUT</strong> del funcionario.</p>
                    <p>El funcionario debe ingresar a <strong>/signup</strong> en la plataforma para realizar la primera activación e ingresar su nueva contraseña personal.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button onClick={() => { setShowSuccessModal(false); setRegisteredUser(null); }}
                    className="w-full sm:w-1/2 bg-gray-100 hover:bg-gray-200 text-secondary py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all">
                    Volver al Listado
                  </button>
                  <button onClick={() => {
                      const subject = encodeURIComponent('Activación de Cuenta — Nodo APS');
                      const body = encodeURIComponent(
                        `Hola ${registeredUser.nombre},\n\n` +
                        `Tu perfil en la plataforma Nodo APS ha sido registrado.\n\n` +
                        `Credenciales de acceso inicial:\n` +
                        `  · RUT: ${registeredUser.rut}\n` +
                        `  · Contraseña: ${registeredUser.claveInicial} (primeros 6 dígitos de tu RUT)\n\n` +
                        `Activa tu cuenta en: ${window.location.origin}/signup\n\n` +
                        `Una vez dentro, completa tus datos de contacto y cuenta bancaria.\n\n` +
                        `Atentamente,\nAdministración Nodo APS`
                      );
                      window.open(`mailto:${registeredUser.correo}?subject=${subject}&body=${body}`, '_blank');
                    }}
                    className="w-full sm:w-1/2 bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                    <Mail size={16} />Enviar Correo de Invitación
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // IF FUNCIONARIO IS SELECTED: RENDER FULL EXPEDIENTE VIEW
  if (selectedFunc) {
    const sc = STATUS_CONFIG[selectedFunc.status] || STATUS_CONFIG['pre-registrado'];
    const isInactive = selectedFunc.status === 'inactivo';

    return (
      <>
        {renderToast()}
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
          {/* Top Action Bar */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button onClick={closeExpediente}
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm">
              <ChevronLeft size={18} />
              Volver a la lista de funcionarios
            </button>

            <div className="flex items-center gap-3">
              <button onClick={handleToggleStatus}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm border ${
                  isInactive
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                }`}>
                <Power size={15} />
                {isInactive ? 'Activar Funcionario' : 'Inactivar Funcionario'}
              </button>

              <button onClick={handleDeleteFuncionario}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all flex items-center gap-2 shadow-sm">
                <Trash2 size={15} />
                Eliminar Funcionario
              </button>
            </div>
          </div>

          {/* Banner Header Card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              
              {/* Passport Photo Avatar with Crop Badge */}
              <div className="relative group/avatar shrink-0">
                {selectedFunc.fotoUrl ? (
                  <img src={selectedFunc.fotoUrl} alt={selectedFunc.nombre}
                    className="w-20 h-24 rounded-2xl object-cover shadow-lg border border-gray-100" />
                ) : (
                  <div className={`w-20 h-24 ${avatarColor(selectedFunc.rut || selectedFunc.id)} rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg`}>
                    {getInitials(selectedFunc.nombre)}
                  </div>
                )}
                <label className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-md cursor-pointer hover:scale-110 transition-transform flex items-center justify-center border-2 border-white"
                  title="Subir / Ajustar Fotografía Tamaño Carnet">
                  <Camera size={14} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>

              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-black text-secondary">{selectedFunc.nombre}</h1>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${sc.cls}`}>
                    {sc.label}
                  </span>
                </div>
                <p className="text-sm font-mono text-gray-400 mt-1">{selectedFunc.rut}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-xl font-bold">{selectedFunc.tipoPrestador || 'Prestador'}</span>
                  {selectedFunc.categoria && (
                    <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-xl font-bold">Estamento Cat {selectedFunc.categoria}</span>
                  )}
                  {selectedFunc.grado && (
                    <span className="text-xs bg-violet-50 text-violet-600 px-3 py-1 rounded-xl font-bold">Nivel {selectedFunc.grado}</span>
                  )}
                  {selectedFunc.tipoContrato && (
                    <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-xl font-bold">{selectedFunc.tipoContrato}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch md:self-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-gray-100">
              <button onClick={startEditProfile}
                className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2">
                <Edit3 size={16} /> Editar Expediente
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white border border-gray-100 rounded-3xl p-3 shadow-sm">
            <div className="flex flex-wrap gap-2.5">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                      : 'text-gray-400 hover:text-secondary hover:bg-gray-50 border border-transparent hover:border-gray-100'
                  }`}>
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Main Content */}
          <div className="min-h-[400px]">
            {renderTabContent()}
          </div>
        </div>

        {/* Modal de Asignación Directa de Turno */}
        {renderAssignTurnoModal()}
      </>
    );
  }

  // DEFAULT VIEW: LIST OF OFFICIALS
  return (
    <>
      {renderToast()}
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Funcionarios</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Gestión del expediente administrativo del personal.
            {!loadingList && <span className="font-semibold text-secondary ml-1">{funcionarios.length} registros.</span>}
          </p>
        </div>
        <button onClick={() => setShowPreRegModal(true)} className="btn-primary shrink-0">
          <Plus size={18} />
          Pre-registrar Funcionario
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" placeholder="Buscar por nombre o RUT..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full input-field pl-12 bg-white" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="input-field bg-white md:w-52 appearance-none">
          <option value="all">Todos los estados</option>
          <option value="activo">Activos</option>
          <option value="pre-registrado">Pre-registrados</option>
          <option value="inactivo">Inactivos</option>
        </select>
        <select value={filterEstamento} onChange={e => setFilterEstamento(e.target.value)}
          className="input-field bg-white md:w-60 appearance-none">
          <option value="all">Todos los estamentos</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>Cat {k} — {v}</option>
          ))}
        </select>
      </div>

      {/* Officials Grid */}
      {loadingList ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white border border-gray-100 rounded-3xl">
          <Users size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-bold text-lg text-secondary">No se encontraron funcionarios</p>
          <p className="text-sm mt-1">Prueba cambiando los filtros o pre-registra el primer funcionario.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(f => {
            const sc = STATUS_CONFIG[f.status] || STATUS_CONFIG['pre-registrado'];
            return (
              <button key={f.id} onClick={() => openExpediente(f)}
                className="bg-white border border-gray-100 rounded-3xl p-6 text-left hover:shadow-xl hover:border-primary/20 hover:-translate-y-1 transition-all duration-200 group flex flex-col justify-between">
                <div className="flex items-start gap-4 w-full">
                  {f.fotoUrl ? (
                    <img src={f.fotoUrl} alt={f.nombre}
                      className="w-14 h-16 rounded-2xl object-cover shadow-md shrink-0 group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className={`w-14 h-16 ${avatarColor(f.rut || f.id)} rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 group-hover:scale-105 transition-transform shadow-md`}>
                      {getInitials(f.nombre)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-secondary text-base truncate leading-snug">{f.nombre || 'Sin nombre'}</p>
                      <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0 ${sc.cls}`}>
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1 font-mono">{f.rut || f.id}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {f.tipoPrestador && (
                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-lg font-bold">{f.tipoPrestador}</span>
                      )}
                      {f.categoria && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg font-bold">Cat {f.categoria}</span>
                      )}
                      {f.tipoContrato && (
                        <span className="text-[10px] bg-violet-50 text-violet-600 px-2.5 py-0.5 rounded-lg font-bold truncate max-w-[130px]">{f.tipoContrato}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs w-full">
                  <span className="text-gray-400 font-medium">Expediente completo</span>
                  <span className="text-primary font-bold inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    Ver Expediente <ChevronRight size={14} />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ══════════════ MODAL: Ajustador de Foto Tamaño Carnet ═════════════════ */}
      {showPhotoModal && rawImageSrc && (
        <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 pt-20 overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-scale-up my-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2.5 rounded-xl text-primary"><Crop size={20} /></div>
                <h3 className="text-lg font-bold text-secondary">Ajustar Fotografía Carnet</h3>
              </div>
              <button onClick={() => setShowPhotoModal(false)} className="text-gray-400 hover:text-secondary p-1 rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex flex-col items-center">
              <p className="text-xs text-gray-500 text-center leading-relaxed">
                Arrastra la imagen para reubicarla y utiliza el deslizador para hacer zoom hasta encajar en el marco tamaño carnet.
              </p>

              {/* Viewport Frame (3:4 ratio passport frame) */}
              <div className="relative w-[240px] h-[300px] bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-primary/30 cursor-move select-none"
                onMouseDown={e => {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - photoOffset.x, y: e.clientY - photoOffset.y });
                }}
                onMouseMove={e => {
                  if (!isDragging) return;
                  setPhotoOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                }}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}>

                <img src={rawImageSrc} alt="Preview"
                  style={{
                    transform: `translate(${photoOffset.x}px, ${photoOffset.y}px) scale(${photoZoom})`,
                    transformOrigin: 'center center'
                  }}
                  className="w-full h-full object-contain pointer-events-none transition-transform duration-75" />

                {/* Passport Frame Guide Grid Overlay */}
                <div className="absolute inset-0 border border-white/20 rounded-3xl pointer-events-none flex items-center justify-center">
                  <div className="w-[140px] h-[180px] border border-dashed border-white/40 rounded-full" />
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                  <span className="flex items-center gap-1"><ZoomOut size={14} /> Zoom</span>
                  <span>{Math.round(photoZoom * 100)}%</span>
                </div>
                <input type="range" min="1" max="3" step="0.05" value={photoZoom}
                  onChange={e => setPhotoZoom(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer" />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center gap-3">
              <button onClick={() => setShowPhotoModal(false)}
                className="w-1/2 bg-gray-100 hover:bg-gray-200 text-secondary py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveCroppedPhoto} disabled={savingPhoto}
                className="w-1/2 btn-primary py-3.5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                {savingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Guardar Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: Asignación Directa de Turno / Refuerzo ═════════════════ */}
      {renderAssignTurnoModal()}

    </div>
    </>
  );
};

export default GestionFuncionariosView;
