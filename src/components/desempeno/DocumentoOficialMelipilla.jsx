import React from 'react';

/**
 * DocumentoOficialMelipilla
 * Recreación idéntica y estricta del Formulario Oficial de Pre-calificación / Calificación
 * de la Corporación Municipal de Melipilla (Ley 19.378 APS).
 * 
 * Estructura de 3 Páginas Oficiales con saltos de página para impresión/PDF:
 * - Página 1: Identificación del Funcionario y Control de Asistencia.
 * - Página 2: I Factor Competencia (8 ítems).
 * - Página 3: II Factor Conducta Funcionaria (6 ítems) + Cuadro de Firmas.
 */
const DocumentoOficialMelipilla = ({
  evaluacion,
  funcionario,
  evaluador
}) => {
  if (!funcionario && !evaluacion) return null;

  // Extracción y formateo de datos del funcionario y evaluación
  const nombreFuncionario = evaluacion?.funcionarioNombre || funcionario?.nombre || '';
  const rutFuncionario = evaluacion?.funcionarioRut || funcionario?.rut || '';
  const tipoInforme = evaluacion?.tipoInforme || 'Pre-calificación';
  const establecimiento = evaluacion?.establecimiento || 'SAR Arpillerista Elsa Romo Aravena';
  const programaUnidad = evaluacion?.programaUnidad || 'Servicio de Atención Primaria de Urgencia (SAR)';
  
  // Categoría (A, B, C, D, E, F)
  const categoriaSeleccionada = (evaluacion?.categoria || funcionario?.categoria || 'E').toUpperCase();
  const categorias = ['A', 'B', 'C', 'D', 'E', 'F'];

  // Nivel (15 a 1)
  const nivelSeleccionado = evaluacion?.nivel || (funcionario?.grado ? parseInt(funcionario.grado, 10) : 15);
  const niveles = [15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  // Descomposición de Fechas del Período (Día-Mes y Año)
  const parseFecha = (fechaStr, defaultDiaMes, defaultAnio) => {
    if (!fechaStr) return { diaMes: defaultDiaMes, anio: defaultAnio };
    const parts = fechaStr.split('-');
    if (parts.length === 3) {
      return { diaMes: `${parts[2]}-${parts[1]}`, anio: parts[0] };
    }
    return { diaMes: defaultDiaMes, anio: defaultAnio };
  };

  const anioActual = new Date().getFullYear();
  const inicio = parseFecha(evaluacion?.fechaInicioPeriodo, '01-04', `${anioActual}`);
  const fin = parseFecha(evaluacion?.fechaFinPeriodo, '31-08', `${anioActual}`);

  // Control de Asistencia
  const minutosAtraso = evaluacion?.controlAsistencia?.minutosAtraso ?? 0;
  const diasInasistentes = evaluacion?.controlAsistencia?.diasInasistentes ?? 0;

  // Factores y Conceptos
  const conceptos = ['MUY BUENO', 'BUENO', 'REGULAR', 'MALO'];

  const itemsCompetencia = [
    { id: 'preparacion_conocimiento', letra: 'a', label: 'Preparación y conocimiento' },
    { id: 'acogida_usuario',          letra: 'b', label: 'Acogida al usuario' },
    { id: 'satisfaccion_usuaria',     letra: 'c', label: 'Satisfacción usuaria' },
    { id: 'cantidad_calidad_trabajo', letra: 'd', label: 'Cantidad y Calidad del Trabajo.' },
    { id: 'interes_trabajo',          letra: 'e', label: 'Interés en el trabajo' },
    { id: 'iniciativa_trabajo',       letra: 'f', label: 'Iniciativa en el trabajo.' },
    { id: 'responsabilidad',          letra: 'g', label: 'Responsabilidad' },
    { id: 'eficiencia',               letra: 'h', label: 'Eficiencia' }
  ];

  const itemsConducta = [
    { id: 'asistencia',            letra: 'a', label: 'Asistencia' },
    { id: 'puntualidad',           letra: 'b', label: 'Puntualidad' },
    { id: 'cumplimiento_normas',   letra: 'c', label: 'Cumplimiento de normas' },
    { id: 'permanencia',           letra: 'd', label: 'Permanencia' },
    { id: 'comportamiento',        letra: 'e', label: 'Comportamiento' },
    { id: 'presentacion_personal', letra: 'f', label: 'Presentación Personal' }
  ];

  const factoresCompData = evaluacion?.factores?.competencia || {};
  const factoresCondData = evaluacion?.factores?.conducta || {};

  return (
    <div className="font-sans text-black bg-white select-text">
      
      {/* ══════════════════════════════════════════════════════════════════
          PÁGINA 1: ENCABEZADO, IDENTIFICACIÓN Y ASISTENCIA
      ══════════════════════════════════════════════════════════════════ */}
      <div className="official-page min-h-[1050px] p-8 md:p-12 border border-slate-300 print:border-none print:p-0 mb-8 print:mb-0 bg-white">
        
        {/* Cabecera Institucional Melipilla */}
        <div className="flex items-center justify-between pb-4 mb-4">
          {/* Logo Corporación Municipal de Melipilla */}
          <div className="w-36 flex items-center gap-2">
            <div className="text-left font-sans leading-tight">
              <div className="text-xl font-black text-blue-900 tracking-tighter">
                COR<span className="text-red-700">PO</span>
              </div>
              <div className="text-[10px] font-bold text-blue-950 uppercase tracking-tight">
                Municipal
              </div>
              <div className="text-[9px] font-semibold text-slate-700">
                de Melipilla
              </div>
            </div>
          </div>

          {/* Título Principal */}
          <div className="text-center flex-1 pr-12">
            <h1 className="text-base md:text-lg font-bold tracking-tight uppercase text-black">
              CORPORACIÓN MUNICIPAL DE MELIPILLA
            </h1>
            <h2 className="text-sm md:text-base font-bold tracking-wide uppercase text-black mt-1">
              {tipoInforme === 'Calificación Final' 
                ? 'FORMULARIO DE CALIFICACIÓN' 
                : 'FORMULARIO DE PRE-CALIFICACIÓN'}
            </h2>
          </div>
        </div>

        {/* Tabla Oficial de la Página 1 */}
        <table className="w-full border-collapse border border-black text-xs md:text-sm">
          <tbody>
            
            {/* Fila 1: Periodo de Evaluación */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 italic font-medium w-1/3">
                Periodo de Evaluación
              </td>
              <td className="border-r border-black p-2 text-center font-bold w-1/6">
                {inicio.diaMes}
              </td>
              <td className="border-r border-black p-2 text-center font-bold w-1/6">
                {inicio.anio}
              </td>
              <td className="border-r border-black p-2 text-center font-bold w-1/6">
                {fin.diaMes}
              </td>
              <td className="p-2 text-center font-bold w-1/6">
                {fin.anio}
              </td>
            </tr>

            {/* Fila 2: Establecimiento */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 italic font-medium">
                Establecimiento
              </td>
              <td colSpan={4} className="p-2 font-normal">
                {establecimiento}
              </td>
            </tr>

            {/* Fila 3: Separador Identificación del Funcionario */}
            <tr className="border-b border-black">
              <td colSpan={5} className="p-2 text-center italic font-semibold">
                Identificación del Funcionario
              </td>
            </tr>

            {/* Fila 4: Nombre */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-normal">
                Nombre
              </td>
              <td colSpan={4} className="p-2 font-semibold uppercase">
                {nombreFuncionario}
              </td>
            </tr>

            {/* Fila 5: Programa o Unidad de trabajo */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-normal">
                Programa o Unidad de trabajo
              </td>
              <td colSpan={4} className="p-2 font-normal">
                {programaUnidad}
              </td>
            </tr>

            {/* Fila 6: Categoría funcionaria (A, B, C, D, E, F) */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-normal">
                Categoría funcionaria
              </td>
              <td colSpan={4} className="p-0">
                <table className="w-full h-full border-collapse text-center">
                  <tbody>
                    {/* Fila de Letras */}
                    <tr className="border-b border-black">
                      {categorias.map(cat => (
                        <td key={cat} className="border-r border-black last:border-r-0 py-1.5 font-bold w-1/6">
                          {cat}
                        </td>
                      ))}
                    </tr>
                    {/* Fila de Marcas */}
                    <tr>
                      {categorias.map(cat => (
                        <td key={cat} className="border-r border-black last:border-r-0 py-1.5 h-7 font-black text-sm">
                          {categoriaSeleccionada === cat ? 'X' : ''}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Fila 7: Nivel (15 a 1) */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-normal">
                Nivel
              </td>
              <td colSpan={4} className="p-0">
                <table className="w-full h-full border-collapse text-center text-xs">
                  <tbody>
                    {/* Fila de Números 15 a 1 */}
                    <tr className="border-b border-black">
                      {niveles.map(nv => (
                        <td key={nv} className="border-r border-black last:border-r-0 py-1 font-bold">
                          {nv}
                        </td>
                      ))}
                    </tr>
                    {/* Fila de Marcas */}
                    <tr>
                      {niveles.map(nv => (
                        <td key={nv} className="border-r border-black last:border-r-0 py-1 h-7 font-black text-xs">
                          {nivelSeleccionado === nv ? 'X' : ''}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            {/* Fila 8: Separador Control de Asistencia */}
            <tr className="border-b border-black">
              <td colSpan={5} className="p-2 text-center italic font-semibold">
                Control de Asistencia
              </td>
            </tr>

            {/* Fila 9: Puntualidad */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-2 font-normal">
                Puntualidad
              </td>
              <td colSpan={3} className="border-r border-black p-2 font-normal">
                Total minutos de atraso
              </td>
              <td className="p-2 text-center font-bold">
                {minutosAtraso} <span className="font-normal text-xs ml-1">min</span>
              </td>
            </tr>

            {/* Fila 10: Asistencia */}
            <tr>
              <td className="border-r border-black p-2 font-normal">
                Asistencia
              </td>
              <td colSpan={3} className="border-r border-black p-2 font-normal">
                Numero de días inasistentes
              </td>
              <td className="p-2 text-center font-bold">
                {diasInasistentes}
              </td>
            </tr>

          </tbody>
        </table>

        {/* Pie de Página 1 (sutil para orientación) */}
        <div className="mt-8 text-right text-[10px] text-slate-500 font-mono print:hidden">
          Página 1 de 3 • Formulario de {tipoInforme} Ley 19.378
        </div>
      </div>

      {/* Salto de Página para Impresión A4 */}
      <div className="page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}></div>

      {/* ══════════════════════════════════════════════════════════════════
          PÁGINA 2: I FACTOR COMPETENCIA (8 ÍTEMS)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="official-page min-h-[1050px] p-8 md:p-12 border border-slate-300 print:border-none print:p-0 mb-8 print:mb-0 bg-white">
        
        <table className="w-full border-collapse border border-black text-xs md:text-sm">
          <thead>
            {/* Título de la Sección */}
            <tr className="border-b border-black">
              <th colSpan={5} className="p-2 text-left italic font-bold text-sm tracking-wide">
                I Factor competencia
              </th>
            </tr>
          </thead>
          <tbody>
            {itemsCompetencia.map((item, index) => {
              const data = factoresCompData[item.id] || { concepto: 'MUY BUENO', comentario: '' };
              const isLast = index === itemsCompetencia.length - 1;

              return (
                <React.Fragment key={item.id}>
                  {/* Fila Superior del Ítem: Nombre e Indicadores de Concepto */}
                  <tr className="border-t border-black">
                    {/* Celda del Ítem a la izquierda */}
                    <td 
                      rowSpan={2} 
                      className="border-r border-b border-black p-2 font-normal align-top w-2/5"
                    >
                      {item.letra}) {item.label}
                    </td>

                    {/* Cabeceras de Conceptos */}
                    {conceptos.map(c => (
                      <td 
                        key={c} 
                        className="border-r border-b border-black last:border-r-0 p-1 text-center font-bold text-[11px] w-[15%]"
                      >
                        {c}
                      </td>
                    ))}
                  </tr>

                  {/* Fila de Marcas del Ítem */}
                  <tr className="border-b border-black">
                    {conceptos.map(c => (
                      <td 
                        key={c} 
                        className="border-r border-b border-black last:border-r-0 p-1 h-6 text-center font-black text-sm"
                      >
                        {data.concepto === c ? 'X' : ''}
                      </td>
                    ))}
                  </tr>

                  {/* Fila de Comentario */}
                  <tr className={isLast ? '' : 'border-b border-black'}>
                    <td colSpan={5} className="p-2 min-h-[38px] align-top text-xs">
                      <span className="font-medium mr-1">Comentario:</span>
                      <span className="font-normal italic text-slate-800">
                        {data.comentario || ''}
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Pie de Página 2 */}
        <div className="mt-8 text-right text-[10px] text-slate-500 font-mono print:hidden">
          Página 2 de 3 • Factor Competencia
        </div>
      </div>

      {/* Salto de Página para Impresión A4 */}
      <div className="page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}></div>

      {/* ══════════════════════════════════════════════════════════════════
          PÁGINA 3: II FACTOR CONDUCTA FUNCIONARIA Y CUADRO DE FIRMAS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="official-page min-h-[1050px] p-8 md:p-12 border border-slate-300 print:border-none print:p-0 bg-white flex flex-col justify-between">
        
        {/* Tabla Factor II: Conducta Funcionaria */}
        <table className="w-full border-collapse border border-black text-xs md:text-sm">
          <thead>
            {/* Título de la Sección */}
            <tr className="border-b border-black">
              <th colSpan={5} className="p-2 text-left italic font-bold text-sm tracking-wide">
                II Factor Conducta Funcionaria
              </th>
            </tr>
          </thead>
          <tbody>
            {itemsConducta.map((item, index) => {
              const data = factoresCondData[item.id] || { concepto: 'MUY BUENO', comentario: '' };
              const isLast = index === itemsConducta.length - 1;

              return (
                <React.Fragment key={item.id}>
                  {/* Fila Superior del Ítem: Nombre e Indicadores de Concepto */}
                  <tr className="border-t border-black">
                    {/* Celda del Ítem a la izquierda */}
                    <td 
                      rowSpan={2} 
                      className="border-r border-b border-black p-2 font-normal align-top w-2/5"
                    >
                      {item.letra}) {item.label}
                    </td>

                    {/* Cabeceras de Conceptos */}
                    {conceptos.map(c => (
                      <td 
                        key={c} 
                        className="border-r border-b border-black last:border-r-0 p-1 text-center font-bold text-[11px] w-[15%]"
                      >
                        {c}
                      </td>
                    ))}
                  </tr>

                  {/* Fila de Marcas del Ítem */}
                  <tr className="border-b border-black">
                    {conceptos.map(c => (
                      <td 
                        key={c} 
                        className="border-r border-b border-black last:border-r-0 p-1 h-6 text-center font-black text-sm"
                      >
                        {data.concepto === c ? 'X' : ''}
                      </td>
                    ))}
                  </tr>

                  {/* Fila de Comentario */}
                  <tr className={isLast ? '' : 'border-b border-black'}>
                    <td colSpan={5} className="p-2 min-h-[38px] align-top text-xs">
                      <span className="font-medium mr-1">Comentario:</span>
                      <span className="font-normal italic text-slate-800">
                        {data.comentario || ''}
                      </span>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Cuadro Oficial de Firmas (Idéntico a la imagen de referencia) */}
        <div className="mt-12 pt-4">
          <table className="w-full border-collapse border border-black text-xs md:text-sm">
            <tbody>
              
              {/* Fila 1: Jefe Directo */}
              <tr className="border-b border-black">
                <td className="border-r border-black p-3 font-normal w-1/2 align-top h-20">
                  <div className="font-semibold text-black">Jefe Directo</div>
                  <div className="text-xs text-slate-700 mt-1">
                    {evaluacion?.evaluadorNombre || evaluador?.nombre || 'Jefatura Evaluadora'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {evaluacion?.evaluadorCargo || evaluador?.cargo || 'Dirección Técnica / Jefatura SAR'}
                  </div>
                </td>
                <td className="p-3 font-normal w-1/2 align-top">
                  <div className="font-semibold text-black">Firma</div>
                  <div className="h-10"></div>
                </td>
              </tr>

              {/* Fila 2: Funcionario */}
              <tr>
                <td className="border-r border-black p-3 font-normal align-top h-20">
                  <div className="font-semibold text-black">{nombreFuncionario}</div>
                  <div className="text-xs text-slate-600 font-mono mt-0.5">
                    RUT: {rutFuncionario}
                  </div>
                </td>
                <td className="p-3 font-normal align-top">
                  <div className="font-semibold text-black">Firma Funcionario</div>
                  <div className="h-10"></div>
                </td>
              </tr>

            </tbody>
          </table>

          {/* Pie de Página 3 */}
          <div className="mt-4 text-right text-[10px] text-slate-500 font-mono print:hidden">
            Página 3 de 3 • Conducta Funcionaria y Firmas
          </div>
        </div>

      </div>

    </div>
  );
};

export default DocumentoOficialMelipilla;
