/**
 * Diccionario de Valores Base (Mock Data / Tarifas Referenciales Ley 19.378 APS)
 * Modelo de honorarios para turnos de urgencia SAR.
 * Incluye variación de $1.000 para horas inhábiles/festivas entre categorías B a F.
 */
export const ESCALA_HONORARIOS_SAR = {
  A: { descripcion: 'Médicos, Odontólogos', valorHoraNormal: 21000, valorHoraFestivo: 21000 },
  B: { descripcion: 'Enfermeras, Kinesiólogos, Matronas', valorHoraNormal: 12500, valorHoraFestivo: 13500 },
  C: { descripcion: 'Técnicos de Nivel Superior (TENS)', valorHoraNormal: 6800, valorHoraFestivo: 7800 },
  D: { descripcion: 'Técnicos de Salud', valorHoraNormal: 5500, valorHoraFestivo: 6500 },
  E: { descripcion: 'Administrativos', valorHoraNormal: 4800, valorHoraFestivo: 5800 },
  F: { descripcion: 'Auxiliares, Choferes', valorHoraNormal: 4200, valorHoraFestivo: 5200 },
};

/**
 * Lista Maestra de Roles y Funciones en Turnos SAR
 * Vincula cada rol con su Categoría Ley 19.378 (A-F) para asignación automática de costos.
 */
export const ROLES_FUNCION_TURNO = [
  { id: 'Medico', label: 'Médico Cirujano', categoria: 'A' },
  { id: 'Odontologo', label: 'Odontólogo / Cirujano Dentista', categoria: 'A' },
  { id: 'Enfermero', label: 'Enfermero / Enfermera (Jefe / Turno)', categoria: 'B' },
  { id: 'Kinesiologo', label: 'Kinesiólogo / Kinesióloga', categoria: 'B' },
  { id: 'Matron', label: 'Matrón / Matrona', categoria: 'B' },
  { id: 'Nutricionista', label: 'Nutricionista', categoria: 'B' },
  { id: 'TrabajadorSocial', label: 'Trabajador / Trabajadora Social', categoria: 'B' },
  { id: 'TENS', label: 'TENS (Técnico Nivel Superior)', categoria: 'C' },
  { id: 'TecnicoSalud', label: 'Técnico de Salud / Paramédico', categoria: 'D' },
  { id: 'Administrativo', label: 'Administrativo de Admisión / SAPU', categoria: 'E' },
  { id: 'Auxiliar', label: 'Auxiliar de Servicio', categoria: 'F' },
  { id: 'Chofer', label: 'Chofer / Conductor de Urgencias', categoria: 'F' },
  { id: 'RefuerzoUrgencia', label: 'Refuerzo de Urgencia (SAR)', categoria: 'B' }
];

/**
 * Obtiene la tarifa base por hora estimada según la categoría (A-F)
 */
export const getTarifaBasePorCategoria = (categoria = 'E') => {
  const catKey = (categoria || 'E').toUpperCase().trim();
  return ESCALA_HONORARIOS_SAR[catKey] || ESCALA_HONORARIOS_SAR.E;
};

/**
 * Obtiene la categoría y tarifas de un rol/función seleccionado
 */
export const getInfoRolFuncion = (rolLabel = '') => {
  const found = ROLES_FUNCION_TURNO.find(r => 
    r.label.toLowerCase() === rolLabel.toLowerCase() ||
    rolLabel.toLowerCase().includes(r.id.toLowerCase())
  );

  const catKey = found ? found.categoria : 'E';
  const tarifas = ESCALA_HONORARIOS_SAR[catKey] || ESCALA_HONORARIOS_SAR.E;

  return {
    rolLabel: found ? found.label : (rolLabel || 'Administrativo'),
    categoria: catKey,
    ...tarifas
  };
};
