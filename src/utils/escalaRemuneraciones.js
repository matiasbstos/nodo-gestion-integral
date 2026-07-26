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
 * Obtiene la tarifa base por hora estimada según la categoría (A-F)
 */
export const getTarifaBasePorCategoria = (categoria = 'E') => {
  const catKey = (categoria || 'E').toUpperCase().trim();
  return ESCALA_HONORARIOS_SAR[catKey] || ESCALA_HONORARIOS_SAR.E;
};
