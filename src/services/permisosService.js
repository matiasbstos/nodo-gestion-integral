import { doc, updateDoc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { logAuditAction } from '../utils/auditLogger';

/**
 * Catálogo Oficial de Roles Institucionales en NODO
 */
export const ROLES_CONFIG = {
  admin_global: {
    id: 'admin_global',
    label: 'Administrador Global',
    shortLabel: 'Admin Global',
    descripcion: 'Control absoluto del sistema, gestión de usuarios, credenciales, configuración financiera y gobernanza total.',
    colorBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-200/50',
    colorHeader: 'from-indigo-600 to-indigo-800',
    colorDot: 'bg-indigo-600',
    nivelJerarquico: 1
  },
  jefe_turno: {
    id: 'jefe_turno',
    label: 'Jefe de Turno / Notificador',
    shortLabel: 'Jefe de Turno',
    descripcion: 'Supervisión de guardia, control y marcaje de asistencia, registro de méritos/faltas en Hoja de Vida, evaluación de desempeño y pauta.',
    colorBadge: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-200/50',
    colorHeader: 'from-amber-600 to-orange-700',
    colorDot: 'bg-amber-500',
    nivelJerarquico: 2
  },
  admin_local: {
    id: 'admin_local',
    label: 'Administrador Local (Centro)',
    shortLabel: 'Admin Local',
    descripcion: 'Coordinación y gestión operativa del personal asignado a un centro asistencial o dispositivo específico.',
    colorBadge: 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-200/50',
    colorHeader: 'from-sky-600 to-blue-700',
    colorDot: 'bg-sky-500',
    nivelJerarquico: 3
  },
  trabajador: {
    id: 'trabajador',
    label: 'Trabajador / Funcionario Prestador',
    shortLabel: 'Trabajador',
    descripcion: 'Acceso a portal personal: registro de asistencia, visualización de turnos asignados, liquidación de honorarios y perfil.',
    colorBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-200/50',
    colorHeader: 'from-emerald-600 to-teal-700',
    colorDot: 'bg-emerald-500',
    nivelJerarquico: 4
  }
};

/**
 * Catálogo Completo de Vistas y Módulos del Sistema NODO
 */
export const TODAS_LAS_VISTAS = [
  // Criterio 1: Gestión de Jefatura y Turnos
  {
    id: 'admin-dashboard',
    label: 'Resumen Consolidado Operativo',
    categoria: 'gestion',
    descripcion: 'Métricas generales de cobertura, horas programadas y mapa de turnos.',
    icono: 'Activity'
  },
  {
    id: 'admin-funcionarios',
    label: 'Directorio de Funcionarios',
    categoria: 'gestion',
    descripcion: 'Fichas de personal, contratos, expediente y asignación directa.',
    icono: 'Users'
  },
  {
    id: 'admin-desempeno',
    label: 'Hoja de Vida y Desempeño',
    categoria: 'gestion',
    descripcion: 'Línea de tiempo de méritos, deméritos y formulario oficial Ley 19.378.',
    icono: 'Award'
  },
  {
    id: 'pauta-turnos',
    label: 'Pauta de Turnos',
    categoria: 'gestion',
    descripcion: 'Planificación mensual interactiva, turnos de guardia y reemplazos.',
    icono: 'Calendar'
  },
  {
    id: 'agente-auditor',
    label: 'Agente Auditor de Pauta',
    categoria: 'gestion',
    descripcion: 'Detección automática de solapamientos, turnos huérfanos y colisiones.',
    icono: 'Bot'
  },
  {
    id: 'admin-operativa',
    label: 'Gestión Operativa',
    categoria: 'gestion',
    descripcion: 'Supervisión en tiempo real de turnos y presencia física.',
    icono: 'MapPin'
  },

  // Criterio 2: Finanzas, Seguridad y Gobernanza
  {
    id: 'admin-usuarios',
    label: 'Control de Usuarios y Roles',
    categoria: 'gobernanza',
    descripcion: 'Administración de credenciales, asignación de roles y permisos de visualización.',
    icono: 'ShieldCheck',
    exclusivoAdminGlobal: true
  },
  {
    id: 'admin-honorarios',
    label: 'Honorarios e Informes',
    categoria: 'finanzas',
    descripcion: 'Consolidación de boletas, cálculo de horas y generación de informes de pago.',
    icono: 'Briefcase'
  },
  {
    id: 'admin-ajustes',
    label: 'Montos y Ajustes',
    categoria: 'finanzas',
    descripcion: 'Matriz remuneracional, tarifas base y reglas financieras.',
    icono: 'Settings'
  },
  {
    id: 'auditoria',
    label: 'Registro de Auditoría',
    categoria: 'seguridad',
    descripcion: 'Bitácora legal de accesos, modificaciones y trazabilidad.',
    icono: 'ShieldCheck'
  },
  {
    id: 'simulador',
    label: 'Simulador de Pruebas',
    categoria: 'seguridad',
    descripcion: 'Laboratorio de pruebas sin afectar la base de datos oficial.',
    icono: 'FlaskConical'
  },

  // Criterio 3: Mi Área Personal (Trabajador)
  {
    id: 'attendance',
    label: 'Mi Asistencia',
    categoria: 'personal',
    descripcion: 'Marcaje oficial de entrada/salida y geolocalización de turnos.',
    icono: 'Clock'
  },
  {
    id: 'my-shifts',
    label: 'Mis Turnos',
    categoria: 'personal',
    descripcion: 'Calendario de turnos programados del funcionario.',
    icono: 'Calendar'
  },
  {
    id: 'fees',
    label: 'Mis Honorarios',
    categoria: 'personal',
    descripcion: 'Visualización y cálculo de pagos por turnos realizados.',
    icono: 'Wallet'
  },
  {
    id: 'profile',
    label: 'Mi Perfil',
    categoria: 'personal',
    descripcion: 'Datos personales, documentación y antecedentes del usuario.',
    icono: 'User'
  }
];

/**
 * Plantillas de Vistas Predeterminadas por Rol
 */
export const VISTAS_DEFAULT_POR_ROL = {
  admin_global: [
    'admin-dashboard',
    'admin-funcionarios',
    'admin-desempeno',
    'pauta-turnos',
    'agente-auditor',
    'simulador',
    'auditoria',
    'admin-operativa',
    'admin-honorarios',
    'admin-ajustes',
    'admin-usuarios',
    'attendance',
    'my-shifts',
    'fees',
    'profile'
  ],
  jefe_turno: [
    'admin-dashboard',
    'admin-funcionarios',
    'admin-desempeno',
    'pauta-turnos',
    'agente-auditor',
    'admin-operativa',
    'attendance',
    'my-shifts',
    'profile'
  ],
  admin_local: [
    'admin-dashboard',
    'admin-funcionarios',
    'pauta-turnos',
    'admin-operativa',
    'attendance',
    'my-shifts',
    'profile'
  ],
  trabajador: [
    'attendance',
    'my-shifts',
    'fees',
    'profile'
  ]
};

/**
 * Normaliza y homologa el rol de un usuario
 */
export const normalizarRol = (role = '') => {
  const r = (role || '').toLowerCase().trim();
  if (r === 'admin_global' || r === 'superadmin' || r === 'director') return 'admin_global';
  if (r === 'jefe_turno' || r === 'notificador' || r === 'supervisor' || r === 'jefatura') return 'jefe_turno';
  if (r === 'admin_local' || r === 'coordinador') return 'admin_local';
  return 'trabajador';
};

/**
 * Determina si un usuario tiene permiso para visualizar una vista específica
 */
export const usuarioTienePermiso = (userData, vistaId) => {
  if (!userData) return false;
  
  // Matias Bustos siempre tiene acceso total
  if (userData?.correoInstitucional === 'matias.bustos@cormumel.cl' || 
      userData?.correo === 'matias.bustos@cormumel.cl' ||
      userData?.email === 'matias.bustos@cormumel.cl' ||
      userData?.rut === '184877759' ||
      userData?.role === 'admin_global') {
    return true;
  }

  // La vista de administración de usuarios es estrictamente para admin_global
  if (vistaId === 'admin-usuarios') {
    return userData.role === 'admin_global';
  }

  // Si tiene lista personalizada de vistasPermitidas definida en su ficha
  if (Array.isArray(userData.vistasPermitidas) && userData.vistasPermitidas.length > 0) {
    return userData.vistasPermitidas.includes(vistaId);
  }

  // Fallback por plantilla del rol
  const rolNormalizado = normalizarRol(userData.role);
  const permitidas = VISTAS_DEFAULT_POR_ROL[rolNormalizado] || VISTAS_DEFAULT_POR_ROL.trabajador;
  return permitidas.includes(vistaId);
};

/**
 * Obtiene el arreglo consolidado de IDs de vistas para un usuario
 */
export const obtenerVistasUsuario = (userData) => {
  if (!userData) return VISTAS_DEFAULT_POR_ROL.trabajador;

  if (userData.role === 'admin_global' || 
      userData?.correoInstitucional === 'matias.bustos@cormumel.cl' || 
      userData?.correo === 'matias.bustos@cormumel.cl') {
    return VISTAS_DEFAULT_POR_ROL.admin_global;
  }

  if (Array.isArray(userData.vistasPermitidas) && userData.vistasPermitidas.length > 0) {
    return userData.vistasPermitidas;
  }

  const rol = normalizarRol(userData.role);
  return VISTAS_DEFAULT_POR_ROL[rol] || VISTAS_DEFAULT_POR_ROL.trabajador;
};

/**
 * Actualiza el Rol y los Permisos de Visualización de un usuario en Firestore
 */
export const actualizarRolYPermisos = async (usuarioTarget, nuevoRol, vistasPermitidas, currentUser) => {
  try {
    const rutClean = (usuarioTarget.rut || usuarioTarget.id || '').replace(/[.\-]/g, '').toUpperCase();
    if (!rutClean) throw new Error('RUT de usuario no válido');

    const userRef = doc(db, 'usuarios', rutClean);
    const payload = {
      role: nuevoRol,
      vistasPermitidas: Array.isArray(vistasPermitidas) ? vistasPermitidas : VISTAS_DEFAULT_POR_ROL[nuevoRol] || [],
      fechaActualizacionRol: new Date().toISOString(),
      actualizadoPor: currentUser?.nombre || currentUser?.email || 'admin_global'
    };

    await updateDoc(userRef, payload);

    await logAuditAction(db, {
      accion: 'ACTUALIZACION_ROL_PERMISOS',
      detalles: `Se asignó el rol "${ROLES_CONFIG[nuevoRol]?.label || nuevoRol}" y ${payload.vistasPermitidas.length} vistas habilitadas a ${usuarioTarget.nombre || rutClean}`,
      usuario: currentUser,
      targetFuncionario: {
        nombre: usuarioTarget.nombre,
        rut: rutClean
      },
      categoria: 'seguridad'
    });

    return { success: true, ...payload };
  } catch (error) {
    console.error('Error al actualizar rol y permisos:', error);
    throw error;
  }
};

/**
 * Crea un nuevo usuario con credenciales, rol y vistas asignadas
 */
export const crearUsuarioConRol = async (datosNuevoUsuario, currentUser) => {
  try {
    const rutClean = (datosNuevoUsuario.rut || '').replace(/[.\-]/g, '').toUpperCase();
    if (!rutClean) throw new Error('El RUT es obligatorio.');
    if (!datosNuevoUsuario.nombre) throw new Error('El Nombre es obligatorio.');
    if (!datosNuevoUsuario.correo) throw new Error('El Correo es obligatorio.');

    const cleanEmail = datosNuevoUsuario.correo.toLowerCase().trim();
    const rol = datosNuevoUsuario.role || 'trabajador';
    const vistas = datosNuevoUsuario.vistasPermitidas && datosNuevoUsuario.vistasPermitidas.length > 0
      ? datosNuevoUsuario.vistasPermitidas
      : VISTAS_DEFAULT_POR_ROL[rol] || VISTAS_DEFAULT_POR_ROL.trabajador;

    const userDocRef = doc(db, 'usuarios', rutClean);
    const existingSnap = await getDoc(userDocRef);

    if (existingSnap.exists()) {
      throw new Error(`El RUT ${rutClean} ya se encuentra registrado en el sistema.`);
    }

    const payload = {
      nombre: datosNuevoUsuario.nombre.trim(),
      rut: rutClean,
      correoInstitucional: cleanEmail,
      correo: cleanEmail,
      email: cleanEmail,
      telefono: datosNuevoUsuario.telefono || '',
      cargo: datosNuevoUsuario.cargo || datosNuevoUsuario.tipoPrestador || 'Funcionario de Salud',
      tipoPrestador: datosNuevoUsuario.tipoPrestador || datosNuevoUsuario.cargo || 'Funcionario de Salud',
      centroAsignado: datosNuevoUsuario.centroAsignado || 'SAR Arpillerista Elsa Romo Aravena',
      tipoContrato: datosNuevoUsuario.tipoContrato || 'Honorario por horas',
      categoria: datosNuevoUsuario.categoria || 'E',
      grado: datosNuevoUsuario.grado || 15,
      role: rol,
      vistasPermitidas: vistas,
      status: 'activo',
      claveInicial: datosNuevoUsuario.claveInicial || rutClean.substring(0, 6),
      fechaCreacion: new Date().toISOString(),
      creadoPor: currentUser?.nombre || currentUser?.email || 'admin_global'
    };

    await setDoc(userDocRef, payload);

    await logAuditAction(db, {
      accion: 'ALTA_USUARIO_Y_CREDENCIALES',
      detalles: `Usuario creado (${payload.nombre}, RUT: ${rutClean}) con rol "${ROLES_CONFIG[rol]?.label || rol}" y clave inicial configurada.`,
      usuario: currentUser,
      targetFuncionario: {
        nombre: payload.nombre,
        rut: rutClean
      },
      categoria: 'seguridad'
    });

    return { success: true, ...payload };
  } catch (error) {
    console.error('Error al crear usuario con rol:', error);
    throw error;
  }
};
