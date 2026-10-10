import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Key, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  Eye, 
  Settings, 
  Sparkles, 
  X, 
  Check, 
  ChevronRight, 
  RefreshCw,
  Clock,
  Calendar,
  Briefcase,
  Activity,
  Award,
  Bot,
  MapPin,
  Wallet,
  FlaskConical,
  Crown,
  FileCheck
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ROLES_CONFIG, 
  TODAS_LAS_VISTAS, 
  VISTAS_DEFAULT_POR_ROL, 
  normalizarRol, 
  actualizarRolYPermisos, 
  crearUsuarioConRol,
  obtenerVistasUsuario
} from '../services/permisosService';

const ICON_MAP = {
  Activity,
  Users,
  Award,
  Calendar,
  Bot,
  MapPin,
  ShieldCheck,
  Briefcase,
  Settings,
  FlaskConical,
  Clock,
  Wallet,
  UserCheck
};

export default function GestionUsuariosRolesView({ userData }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroCentro, setFiltroCentro] = useState('todos');

  // Modales
  const [modalPermisosUser, setModalPermisosUser] = useState(null);
  const [modalNuevoUsuarioOpen, setModalNuevoUsuarioOpen] = useState(false);
  const [modalCredencialesUser, setModalCredencialesUser] = useState(null);
  const [savingPermisos, setSavingPermisos] = useState(false);
  const [toast, setToast] = useState(null);

  // Estados temporales del modal de permisos
  const [selectedRol, setSelectedRol] = useState('trabajador');
  const [selectedVistas, setSelectedVistas] = useState([]);

  // Estados de nuevo usuario
  const [nuevoForm, setNuevoForm] = useState({
    nombre: '',
    rut: '',
    correo: '',
    telefono: '',
    cargo: 'Médico Cirujano (Prestador / Refuerzo SAR)',
    tipoPrestador: 'Médico Cirujano',
    centroAsignado: 'SAR Arpillerista Elsa Romo Aravena',
    tipoContrato: 'Honorario por horas',
    categoria: 'A',
    grado: 15,
    role: 'trabajador',
    claveInicial: ''
  });
  const [creandoUser, setCreandoUser] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Cargar usuarios de Firestore
  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      const list = snap.docs.map(d => {
        const data = d.data();
        const cleanRut = (data.rut || d.id || '').replace(/[.\-]/g, '').toUpperCase();
        return {
          id: d.id,
          rut: cleanRut,
          nombre: data.nombre || data.displayName || 'Funcionario ' + cleanRut,
          correo: data.correoInstitucional || data.correo || data.email || 'Sin correo',
          telefono: data.telefono || '',
          cargo: data.cargo || data.tipoPrestador || 'Funcionario de Salud',
          centroAsignado: data.centroAsignado || 'SAR Arpillerista Elsa Romo Aravena',
          tipoContrato: data.tipoContrato || 'Honorario',
          categoria: data.categoria || 'E',
          role: normalizarRol(data.role),
          vistasPermitidas: Array.isArray(data.vistasPermitidas) ? data.vistasPermitidas : null,
          status: data.status || 'activo',
          claveInicial: data.claveInicial || cleanRut.substring(0, 6),
          ...data
        };
      });

      // Ordenar: Admin Global primero, luego Jefes de Turno, luego por nombre
      list.sort((a, b) => {
        if (a.role === 'admin_global' && b.role !== 'admin_global') return -1;
        if (b.role === 'admin_global' && a.role !== 'admin_global') return 1;
        if (a.role === 'jefe_turno' && b.role !== 'jefe_turno') return -1;
        if (b.role === 'jefe_turno' && a.role !== 'jefe_turno') return 1;
        return a.nombre.localeCompare(b.nombre);
      });

      setUsuarios(list);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      showToast('Error al conectar con la base de datos de usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // KPIs
  const stats = useMemo(() => {
    const total = usuarios.length;
    const adminGlobal = usuarios.filter(u => u.role === 'admin_global').length;
    const jefesTurno = usuarios.filter(u => u.role === 'jefe_turno').length;
    const adminLocal = usuarios.filter(u => u.role === 'admin_local').length;
    const trabajadores = usuarios.filter(u => u.role === 'trabajador').length;
    return { total, adminGlobal, jefesTurno, adminLocal, trabajadores };
  }, [usuarios]);

  // Filtrado de usuarios
  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => {
      const q = searchTerm.toLowerCase();
      const matchSearch = (
        (u.nombre || '').toLowerCase().includes(q) ||
        (u.rut || '').toLowerCase().includes(q) ||
        (u.correo || '').toLowerCase().includes(q) ||
        (u.cargo || '').toLowerCase().includes(q)
      );

      const matchRol = filtroRol === 'todos' || u.role === filtroRol;
      const matchCentro = filtroCentro === 'todos' || u.centroAsignado === filtroCentro;

      return matchSearch && matchRol && matchCentro;
    });
  }, [usuarios, searchTerm, filtroRol, filtroCentro]);

  // Abrir Modal de Permisos
  const handleOpenPermisos = (user) => {
    setModalPermisosUser(user);
    setSelectedRol(user.role || 'trabajador');
    // Si ya tiene vistas asignadas, usarlas; de lo contrario cargar las de su rol
    const vistasActuales = obtenerVistasUsuario(user);
    setSelectedVistas(vistasActuales);
  };

  // Cambiar rol en el modal y sugerir vistas por defecto de ese rol
  const handleCambioRolModal = (nuevoRol) => {
    setSelectedRol(nuevoRol);
    const plantillas = VISTAS_DEFAULT_POR_ROL[nuevoRol] || VISTAS_DEFAULT_POR_ROL.trabajador;
    setSelectedVistas(plantillas);
  };

  // Toggle vista individual
  const handleToggleVista = (vistaId) => {
    setSelectedVistas(prev => {
      if (prev.includes(vistaId)) {
        return prev.filter(v => v !== vistaId);
      } else {
        return [...prev, vistaId];
      }
    });
  };

  // Guardar Cambios de Permisos
  const handleGuardarPermisos = async () => {
    if (!modalPermisosUser) return;
    setSavingPermisos(true);
    try {
      await actualizarRolYPermisos(modalPermisosUser, selectedRol, selectedVistas, userData);
      showToast(`Permisos actualizados con éxito para ${modalPermisosUser.nombre}.`, 'success');
      setModalPermisosUser(null);
      fetchUsuarios();
    } catch (err) {
      showToast('Error al guardar permisos: ' + err.message, 'error');
    } finally {
      setSavingPermisos(false);
    }
  };

  // Crear Nuevo Usuario
  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    setCreandoUser(true);
    try {
      await crearUsuarioConRol(nuevoForm, userData);
      showToast(`Usuario ${nuevoForm.nombre} creado correctamente con rol ${ROLES_CONFIG[nuevoForm.role]?.label}.`, 'success');
      setModalNuevoUsuarioOpen(false);
      setNuevoForm({
        nombre: '',
        rut: '',
        correo: '',
        telefono: '',
        cargo: 'Médico Cirujano (Prestador / Refuerzo SAR)',
        tipoPrestador: 'Médico Cirujano',
        centroAsignado: 'SAR Arpillerista Elsa Romo Aravena',
        tipoContrato: 'Honorario por horas',
        categoria: 'A',
        grado: 15,
        role: 'trabajador',
        claveInicial: ''
      });
      fetchUsuarios();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCreandoUser(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border animate-slide-up ${
          toast.type === 'error' ? 'bg-rose-900 text-white border-rose-700' : 'bg-slate-900 text-white border-slate-700'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={16} className="text-rose-400" /> : <CheckCircle2 size={16} className="text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Encabezado Institucional ────────────────────────────────────── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shadow-xs shrink-0">
            <ShieldCheck size={28} strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Gobernanza Institucional
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {userData?.correoInstitucional || 'matias.bustos@cormumel.cl'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Control de Usuarios, Roles & Permisos
            </h1>
            <p className="text-xs text-slate-500 font-medium max-w-2xl mt-0.5">
              Gestión centralizada de credenciales, jerarquías y configuración granular de lo que cada usuario puede visualizar en la plataforma NODO.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsuarios}
            className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl border border-slate-200 transition-all cursor-pointer"
            title="Recargar listado"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModalNuevoUsuarioOpen(true)}
            className="btn-primary px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-md shadow-primary/25 cursor-pointer"
          >
            <Plus size={18} strokeWidth={2} />
            <span>Crear Usuario & Credencial</span>
          </button>
        </div>
      </div>

      {/* ── Métricas y KPIs de Gobernanza ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Usuarios</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-400">registrados</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Users size={13} className="text-slate-400" />
            <span>Red APS & SAR Cormumel</span>
          </div>
        </div>

        <div className="bg-indigo-50/60 p-5 rounded-3xl border border-indigo-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest block">Admin Global</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-indigo-900">{stats.adminGlobal}</span>
            <span className="text-xs font-bold text-indigo-600">Gobernanza</span>
          </div>
          <div className="mt-3 text-[11px] text-indigo-700 flex items-center gap-1.5 font-medium">
            <Crown size={13} className="text-amber-500" />
            <span>Control maestro total</span>
          </div>
        </div>

        <div className="bg-amber-50/60 p-5 rounded-3xl border border-amber-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest block">Jefes de Turno</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-amber-900">{stats.jefesTurno}</span>
            <span className="text-xs font-bold text-amber-600">Notificadores</span>
          </div>
          <div className="mt-3 text-[11px] text-amber-800 flex items-center gap-1.5 font-medium">
            <Award size={13} className="text-amber-600" />
            <span>Pauta, asistencia & méritos</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 p-5 rounded-3xl border border-emerald-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block">Trabajadores</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-emerald-900">{stats.trabajadores}</span>
            <span className="text-xs font-bold text-emerald-600">Prestadores</span>
          </div>
          <div className="mt-3 text-[11px] text-emerald-800 flex items-center gap-1.5 font-medium">
            <UserCheck size={13} className="text-emerald-600" />
            <span>Portal asistencial personal</span>
          </div>
        </div>
      </div>

      {/* ── Filtros y Buscador ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, RUT, correo o cargo..."
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400" />
            <select
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos los Roles</option>
              <option value="admin_global">Administrador Global</option>
              <option value="jefe_turno">Jefe de Turno (Notificador)</option>
              <option value="trabajador">Trabajador / Prestador</option>
              <option value="admin_local">Administrador Local</option>
            </select>
          </div>

          <span className="text-xs text-slate-400 font-semibold">
            {usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'usuario' : 'usuarios'}
          </span>
        </div>
      </div>

      {/* ── Tabla Principal de Usuarios y Roles ────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-4 px-6">Usuario & Datos</th>
                <th className="py-4 px-6">Rol Oficial</th>
                <th className="py-4 px-6">Módulos que Visualiza</th>
                <th className="py-4 px-6">Centro Asignado</th>
                <th className="py-4 px-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {usuariosFiltrados.map((u) => {
                const rolConfig = ROLES_CONFIG[u.role] || ROLES_CONFIG.trabajador;
                const vistasActivas = obtenerVistasUsuario(u);

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* Usuario */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-slate-700 text-xs shrink-0">
                          {u.nombre.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{u.nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-slate-500 font-mono">RUT: {u.rut}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-500">{u.correo}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold">{u.cargo}</span>
                        </div>
                      </div>
                    </td>

                    {/* Rol */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${rolConfig.colorBadge}`}>
                        <span className={`w-2 h-2 rounded-full ${rolConfig.colorDot}`} />
                        <span>{rolConfig.label}</span>
                      </span>
                    </td>

                    {/* Vistas que visualiza */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">
                            {vistasActivas.length}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            de {TODAS_LAS_VISTAS.length} vistas activas
                          </span>
                        </div>
                        
                        {/* Mini preview chips */}
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {vistasActivas.slice(0, 4).map(vId => {
                            const vDef = TODAS_LAS_VISTAS.find(v => v.id === vId);
                            return (
                              <span key={vId} className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {vDef?.label || vId}
                              </span>
                            );
                          })}
                          {vistasActivas.length > 4 && (
                            <span className="text-[9px] font-bold text-primary">
                              +{vistasActivas.length - 4} más
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Centro */}
                    <td className="py-4 px-6">
                      <span className="text-xs text-slate-600 font-semibold">
                        {u.centroAsignado}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModalCredencialesUser(u)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Ver credenciales"
                        >
                          <Key size={14} className="text-slate-400" />
                          <span>Credenciales</span>
                        </button>

                        <button
                          onClick={() => handleOpenPermisos(u)}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Settings size={14} />
                          <span>Editar Rol & Vistas</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL 1: EDICIÓN DE ROL Y MATRIZ GRANULAR DE PERMISOS
      ══════════════════════════════════════════════════════════════════ */}
      {modalPermisosUser && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in my-8 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-800 text-blue-400 border border-slate-700 flex items-center justify-center font-bold">
                  <ShieldCheck size={22} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Configuración de Rol & Vistas Permitidas
                  </h3>
                  <p className="text-xs text-slate-400">
                    {modalPermisosUser.nombre} • RUT: <span className="font-mono">{modalPermisosUser.rut}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalPermisosUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              
              {/* Paso 1: Seleccionar Rol Principal */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  1. Rol Institucional en NODO
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.values(ROLES_CONFIG).map((r) => {
                    const isSelected = selectedRol === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleCambioRolModal(r.id)}
                        className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-slate-50 border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-black text-slate-900">{r.label}</span>
                          <span className={`w-2.5 h-2.5 rounded-full ${r.colorDot}`} />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          {r.descripcion}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 2: Matriz de Visualización Granular */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      2. Módulos que Visualiza en el Menú Lateral
                    </label>
                    <p className="text-xs text-slate-400">
                      Habilite o deshabilite exactamente las vistas que este usuario podrá abrir.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedVistas(VISTAS_DEFAULT_POR_ROL[selectedRol] || [])}
                      className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      Plantilla del Rol
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedVistas(TODAS_LAS_VISTAS.map(v => v.id))}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Marcar Todas
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {TODAS_LAS_VISTAS.map((v) => {
                    const isChecked = selectedVistas.includes(v.id);
                    const IconComponent = ICON_MAP[v.icono] || Activity;

                    return (
                      <label
                        key={v.id}
                        className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-blue-50/40 border-blue-200 ring-1 ring-blue-300/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50/60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleVista(v.id)}
                          className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4 border-slate-300 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <IconComponent size={14} className={isChecked ? 'text-primary' : 'text-slate-400'} />
                            <span className="text-xs font-bold text-slate-900 truncate">{v.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                            {v.descripcion}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-semibold">
                {selectedVistas.length} vistas seleccionadas
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalPermisosUser(null)}
                  disabled={savingPermisos}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarPermisos}
                  disabled={savingPermisos}
                  className="btn-primary px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm"
                >
                  {savingPermisos ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Guardar Rol & Permisos</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL 2: CREAR NUEVO USUARIO Y CREDENCIALES
      ══════════════════════════════════════════════════════════════════ */}
      {modalNuevoUsuarioOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in my-8 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center font-bold">
                  <Plus size={22} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Alta de Nuevo Usuario & Credenciales
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registra un nuevo funcionario con su clave inicial y rol institucional asignado.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevoUsuarioOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleCrearUsuario} className="p-6 space-y-4 overflow-y-auto flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoForm.nombre}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, nombre: e.target.value })}
                    placeholder="Ej: Carolina Andrea Soto Gómez"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    RUT *
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoForm.rut}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, rut: e.target.value })}
                    placeholder="12345678-9"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={nuevoForm.correo}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, correo: e.target.value })}
                    placeholder="usuario@cormumel.cl o gmail.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Rol Institucional *
                  </label>
                  <select
                    value={nuevoForm.role}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="trabajador">Trabajador / Funcionario Prestador</option>
                    <option value="jefe_turno">Jefe de Turno / Notificador</option>
                    <option value="admin_local">Administrador Local</option>
                    <option value="admin_global">Administrador Global</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Especialidad / Cargo *
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevoForm.cargo}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, cargo: e.target.value, tipoPrestador: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1">
                    Centro Asignado *
                  </label>
                  <select
                    value={nuevoForm.centroAsignado}
                    onChange={(e) => setNuevoForm({ ...nuevoForm, centroAsignado: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="SAR Arpillerista Elsa Romo Aravena">SAR Arpillerista Elsa Romo Aravena</option>
                    <option value="CESFAM Florencia">CESFAM Florencia</option>
                    <option value="CESFAM Boris Soler">CESFAM Boris Soler</option>
                    <option value="CESFAM Elgueta">CESFAM Elgueta</option>
                    <option value="Todos los Centros (Red Cormumel)">Todos los Centros (Red Cormumel)</option>
                  </select>
                </div>
              </div>

              {/* Clave inicial sugerida */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                  Clave Inicial de Acceso
                </span>
                <p className="text-xs text-slate-600 font-medium">
                  Por estándar de seguridad, la contraseña temporal inicial corresponde a los primeros 6 dígitos del RUT sin puntos. El usuario podrá cambiarla desde su perfil al iniciar sesión.
                </p>
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalNuevoUsuarioOpen(false)}
                  disabled={creandoUser}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoUser}
                  className="btn-primary px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm"
                >
                  {creandoUser ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Creando Usuario...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Registrar Usuario</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL 3: CREDENCIALES & ACCESO RÁPIDO
      ══════════════════════════════════════════════════════════════════ */}
      {modalCredencialesUser && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Credenciales de Acceso</h3>
                  <p className="text-xs text-slate-400">{modalCredencialesUser.nombre}</p>
                </div>
              </div>
              <button
                onClick={() => setModalCredencialesUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Identificador (RUT)</span>
                <span className="font-mono font-bold text-slate-800 text-sm">{modalCredencialesUser.rut}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Correo Asociado</span>
                <span className="font-semibold text-slate-800">{modalCredencialesUser.correo}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Clave Inicial Sugerida</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block mt-0.5">
                  {modalCredencialesUser.claveInicial || modalCredencialesUser.rut.substring(0, 6)}
                </span>
              </div>
            </div>

            <button
              onClick={() => setModalCredencialesUser(null)}
              className="w-full btn-secondary py-2.5 rounded-xl font-bold text-xs"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
