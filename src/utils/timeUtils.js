/**
 * Detecta si una fecha cae en fin de semana (Inhábil) o día de semana (Hábil)
 * @param {Date} date 
 * @returns {boolean} true si es Inhábil (Sábado o Domingo)
 */
export const isInhabil = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
};

/**
 * Calcula la distribución de horas entre Hábil e Inhábil para un turno.
 * La frontera de cambio ocurre a la medianoche (00:00).
 * 
 * @param {string|Date} start Input de inicio (Date o ISO String)
 * @param {string|Date} end Input de término (Date o ISO String)
 * @returns {Object} { horasHabiles, horasInhabiles, total }
 */
export const calcularHorasTurno = (start, end) => {
  const dStart = new Date(start);
  const dEnd = new Date(end);
  
  if (dEnd <= dStart) return { horasHabiles: 0, horasInhabiles: 0, total: 0 };

  let horasHabiles = 0;
  let horasInhabiles = 0;

  // Iteramos hora por hora para mayor precisión en turnos mixtos
  let current = new Date(dStart);
  while (current < dEnd) {
    const nextHour = new Date(current);
    nextHour.setHours(current.getHours() + 1);
    
    // Si la siguiente hora se pasa del final, calculamos la fracción
    const limit = nextHour > dEnd ? dEnd : nextHour;
    const fraction = (limit - current) / (1000 * 60 * 60);

    if (isInhabil(current)) {
      horasInhabiles += fraction;
    } else {
      horasHabiles += fraction;
    }
    
    current = limit;
  }

  return {
    horasHabiles: Math.round(horasHabiles * 100) / 100,
    horasInhabiles: Math.round(horasInhabiles * 100) / 100,
    total: Math.round((horasHabiles + horasInhabiles) * 100) / 100
  };
};
