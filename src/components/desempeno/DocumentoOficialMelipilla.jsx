import React from 'react';

/**
 * DocumentoOficialMelipilla
 * Recreación estricta y fiel al 100% del Formulario Oficial de Pre-calificación / Calificación
 * de la Corporación Municipal de Melipilla (Ley 19.378 APS).
 * 
 * Estructura de 3 Páginas Oficiales con saltos de página para impresión/PDF:
 * - Página 1: Encabezado Institucional Cormumel, Identificación del Funcionario y Control de Asistencia.
 * - Página 2: I Factor Competencia (8 ítems: a - h) con columna continua y casillas a la derecha.
 * - Página 3: II Factor Conducta Funcionaria (6 ítems: a - f) y Cuadro de Firmas al pie.
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

  // Conceptos evaluativos oficiales Cormumel
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
    <div className="font-sans text-black bg-white select-text print:bg-white">
      
      {/* ══════════════════════════════════════════════════════════════════
          PÁGINA 1: ENCABEZADO, IDENTIFICACIÓN Y ASISTENCIA
      ══════════════════════════════════════════════════════════════════ */}
      <div className="official-page bg-white p-6 md:p-10 border border-slate-300 print:border-none print:p-0 mb-8 print:mb-0">
        
        {/* Cabecera Institucional Melipilla */}
        <div className="flex items-start justify-between pb-3 mb-2">
          {/* Logo Corporativo Municipal de Melipilla */}
          <div className="w-36 pt-1 flex items-center gap-2">
            <div className="text-left font-sans leading-tight">
              <div className="text-2xl font-black text-blue-900 tracking-tighter">
                COR<span className="text-red-700">PO</span>
              </div>
              <div className="text-[10px] font-bold text-blue-950 uppercase tracking-tight">
                Municipal
              </div>
              <div className="text-[9px] font-semibold text-slate-700">
                de Melipilla
              </div>
              <div className="w-14 h-[2px] bg-blue-900 mt-0.5 flex">
                <div className="w-1/2 h-full bg-red-700"></div>
              </div>
            </div>
          </div>

          {/* Título Principal */}
          <div className="text-center flex-1 pr-16 pt-1">
            <h1 className="text-sm md:text-base font-normal tracking-wide uppercase text-black">
              CORPORACIÓN MUNICIPAL DE MELIPILLA
            </h1>
            <h2 className="text-xs md:text-sm font-normal tracking-wide uppercase text-black mt-1">
              {tipoInforme === 'Calificación Final' 
                ? 'FORMULARIO DE CALIFICACIÓN' 
                : 'FORMULARIO DE PRE-CALIFICACIÓN'}
            </h2>
          </div>
        </div>

        {/* Tabla Oficial de la Página 1 */}
        <table className="w-full border-collapse border border-black text-xs md:text-[13px] table-fixed">
          <tbody>
            
            {/* Fila 1: Periodo de Evaluación */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 italic font-medium w-[30%]">
                Periodo de Evaluación
              </td>
              <td className="border-r border-black p-1.5 text-center font-bold w-[17.5%]">
                {inicio.diaMes}
              </td>
              <td className="border-r border-black p-1.5 text-center font-bold w-[17.5%]">
                {inicio.anio}
              </td>
              <td className="border-r border-black p-1.5 text-center font-bold w-[17.5%]">
                {fin.diaMes}
              </td>
              <td className="p-1.5 text-center font-bold w-[17.5%]">
                {fin.anio}
              </td>
            </tr>

            {/* Fila 2: Establecimiento */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 italic font-medium">
                Establecimiento
              </td>
              <td colSpan={4} className="p-1.5 font-normal">
                {establecimiento}
              </td>
            </tr>

            {/* Fila 3: Separador Identificación del Funcionario */}
            <tr className="border-b border-black">
              <td colSpan={5} className="p-1 text-center italic font-semibold">
                Identificación del Funcionario
              </td>
            </tr>

            {/* Fila 4: Nombre */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-normal">
                Nombre
              </td>
              <td colSpan={4} className="p-1.5 font-bold uppercase">
                {nombreFuncionario}
              </td>
            </tr>

            {/* Fila 5: Programa o Unidad de trabajo */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-normal">
                Programa o Unidad de trabajo
              </td>
              <td colSpan={4} className="p-1.5 font-normal">
                {programaUnidad}
              </td>
            </tr>

            {/* Fila 6: Categoría funcionaria (A, B, C, D, E, F) */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-normal align-middle">
                Categoría funcionaria
              </td>
              <td colSpan={4} className="p-0">
                <table className="w-full h-full border-collapse text-center table-fixed">
                  <tbody>
                    {/* Fila de Letras */}
                    <tr className="border-b border-black">
                      {categorias.map(cat => (
                        <td key={cat} className="border-r border-black last:border-r-0 py-1 font-normal w-1/6">
                          {cat}
                        </td>
                      ))}
                    </tr>
                    {/* Fila de Marcas */}
                    <tr>
                      {categorias.map(cat => (
                        <td key={cat} className="border-r border-black last:border-r-0 py-1 h-6 font-black text-xs">
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
              <td className="border-r border-black p-1.5 font-normal align-middle">
                Nivel
              </td>
              <td colSpan={4} className="p-0">
                <table className="w-full h-full border-collapse text-center text-xs table-fixed">
                  <tbody>
                    {/* Fila de Números 15 a 1 */}
                    <tr className="border-b border-black">
                      {niveles.map(nv => (
                        <td key={nv} className="border-r border-black last:border-r-0 py-1 font-normal">
                          {nv}
                        </td>
                      ))}
                    </tr>
                    {/* Fila de Marcas */}
                    <tr>
                      {niveles.map(nv => (
                        <td key={nv} className="border-r border-black last:border-r-0 py-1 h-6 font-black text-xs">
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
              <td colSpan={5} className="p-1 text-center italic font-semibold">
                Control de Asistencia
              </td>
            </tr>

            {/* Fila 9: Puntualidad */}
            <tr className="border-b border-black">
              <td className="border-r border-black p-1.5 font-normal">
                Puntualidad
              </td>
              <td colSpan={3} className="border-r border-black p-1.5 font-normal">
                Total minutos de atraso
              </td>
              <td className="p-1.5 text-center font-bold">
                {minutosAtraso} <span className="font-normal text-xs ml-1">min</span>
              </td>
            </tr>

            {/* Fila 10: Asistencia */}
            <tr>
              <td className="border-r border-black p-1.5 font-normal">
                Asistencia
              </td>
              <td colSpan={3} className="border-r border-black p-1.5 font-normal">
                Numero de días inasistentes
              </td>
              <td className="p-1.5 text-center font-bold">
                {diasInasistentes}
              </td>
            </tr>

          </tbody>
        </table>

        {/* Indicador de Página para vista en pantalla */}
        <div className="mt-8 text-right text-[10px] text-slate-400 font-mono print:hidden">
          Página 1 de 3 • Formulario de {tipoInforme}
        </div>
      </div>

      {/* Salto de Página A4 */}
      <div className="page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}></div>

      {/* ══════════════════════════════════════════════════════════════════
          PÁGINA 2: I FACTOR COMPETENCIA (8 ÍTEMS)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="official-page bg-white p-6 md:p-10 border border-slate-300 print:border-none print:p-0 mb-8 print:mb-0">
        
        <table className="w-full border-collapse border border-black text-xs md:text-[13px] table-fixed">
          <thead>
            {/* Título de la Sección */}
            <tr className="border-b border-black">
              <th colSpan={5} className="p-1.5 text-left italic font-bold text-xs md:text-sm tracking-wide">
                I Factor competencia
              </th>
            </tr>
          </thead>
          <tbody>
            {itemsCompetencia.map((item) => {
              const data = factoresCompData[item.id] || { concepto: 'MUY BUENO', comentario: '' };

              return (
                <React.Fragment key={item.id}>
                  {/* Fila 1: Nombre del Factor a la izquierda (rowSpan=3) + Cabecera de 4 columnas a la derecha */}
                  <tr className="border-t border-black">
                    <td 
                      rowSpan={3} 
                      className="border-r border-b border-black p-2 font-normal align-top w-[36%]"
                    >
                      {item.letra}) {item.label}
                    </td>

                    {/* Cabeceras de Conceptos (Con salto de línea en MUY BUENO) */}
                    <td className="border-r border-b border-black p-1 text-center font-normal text-[10px] leading-tight w-[16%]">
                      MUY<br />BUENO
                    </td>
                    <td className="border-r border-b border-black p-1 text-center font-normal text-[10px] w-[16%]">
                      BUENO
                    </td>
                    <td className="border-r border-b border-black p-1 text-center font-normal text-[10px] w-[16%]">
                      REGULAR
                    </td>
                    <td className="border-b border-black p-1 text-center font-normal text-[10px] w-[16%]">
                      MALO
                    </td>
                  </tr>

                  {/* Fila 2: Casillas de marcas X */}
                  <tr className="border-b border-black">
                    {conceptos.map((c, i) => (
                      <td 
                        key={c} 
                        className={`border-b border-black p-0.5 h-5 text-center font-bold text-xs ${i < 3 ? 'border-r' : ''}`}
                      >
                        {data.concepto === c ? 'X' : ''}
                      </td>
                    ))}
                  </tr>

                  {/* Fila 3: Fila de Comentario que SOLO abarca las 4 columnas de la derecha */}
                  <tr className="border-b border-black">
                    <td colSpan={4} className="p-1.5 min-h-[30px] h-8 align-top text-xs">
                      <span className="font-normal mr-1">Comentario:</span>
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

        {/* Indicador de Página para vista en pantalla */}
        <div className="mt-8 text-right text-[10px] text-slate-400 font-mono print:hidden">
          Página 2 de 3 • Factor Competencia
        </div>
      </div>

      {/* Salto de Página A4 */}
      <div className="page-break" style={{ pageBreakAfter: 'always', breakAfter: 'page' }}></div>

      {/* ══════════════════════════════════════════════════════════════════
          PÁGINA 3: II FACTOR CONDUCTA FUNCIONARIA Y CUADRO DE FIRMAS
      ══════════════════════════════════════════════════════════════════ */}
      <div className="official-page bg-white p-6 md:p-10 border border-slate-300 print:border-none print:p-0">
        
        {/* Tabla Factor II: Conducta Funcionaria */}
        <table className="w-full border-collapse border border-black text-xs md:text-[13px] table-fixed">
          <thead>
            {/* Título de la Sección */}
            <tr className="border-b border-black">
              <th colSpan={5} className="p-1.5 text-left italic font-bold text-xs md:text-sm tracking-wide">
                II Factor Conducta Funcionaria
              </th>
            </tr>
          </thead>
          <tbody>
            {itemsConducta.map((item) => {
              const data = factoresCondData[item.id] || { concepto: 'MUY BUENO', comentario: '' };

              return (
                <React.Fragment key={item.id}>
                  {/* Fila 1: Nombre del Factor a la izquierda (rowSpan=3) + Cabecera de 4 columnas a la derecha */}
                  <tr className="border-t border-black">
                    <td 
                      rowSpan={3} 
                      className="border-r border-b border-black p-2 font-normal align-top w-[36%]"
                    >
                      {item.letra}) {item.label}
                    </td>

                    {/* Cabeceras de Conceptos (Con salto de línea en MUY BUENO) */}
                    <td className="border-r border-b border-black p-1 text-center font-normal text-[10px] leading-tight w-[16%]">
                      MUY<br />BUENO
                    </td>
                    <td className="border-r border-b border-black p-1 text-center font-normal text-[10px] w-[16%]">
                      BUENO
                    </td>
                    <td className="border-r border-b border-black p-1 text-center font-normal text-[10px] w-[16%]">
                      REGULAR
                    </td>
                    <td className="border-b border-black p-1 text-center font-normal text-[10px] w-[16%]">
                      MALO
                    </td>
                  </tr>

                  {/* Fila 2: Casillas de marcas X */}
                  <tr className="border-b border-black">
                    {conceptos.map((c, i) => (
                      <td 
                        key={c} 
                        className={`border-b border-black p-0.5 h-5 text-center font-bold text-xs ${i < 3 ? 'border-r' : ''}`}
                      >
                        {data.concepto === c ? 'X' : ''}
                      </td>
                    ))}
                  </tr>

                  {/* Fila 3: Fila de Comentario que SOLO abarca las 4 columnas de la derecha */}
                  <tr className="border-b border-black">
                    <td 
                      colSpan={4} 
                      className={`p-1.5 align-top text-xs ${item.letra === 'f' ? 'h-14 min-h-[55px]' : 'h-10 min-h-[40px]'}`}
                    >
                      <span className="font-normal mr-1">Comentario:</span>
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

        {/* Cuadro Oficial de Firmas (Idéntico a la imagen de referencia Cormumel) */}
        <div className="mt-8">
          <table className="w-full border-collapse border border-black text-xs md:text-[13px] table-fixed">
            <tbody>
              
              {/* Fila 1: Jefe Directo / Firma */}
              <tr className="border-b border-black">
                <td className="border-r border-black p-2.5 font-normal w-1/2 align-top h-16">
                  <div className="font-normal text-black">Jefe Directo</div>
                  <div className="text-xs text-slate-800 mt-1">
                    {evaluacion?.evaluadorNombre || evaluador?.nombre || ''}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {evaluacion?.evaluadorCargo || evaluador?.cargo || ''}
                  </div>
                </td>
                <td className="p-2.5 font-normal w-1/2 align-top">
                  <div className="font-normal text-black">Firma</div>
                </td>
              </tr>

              {/* Fila 2: Funcionario / Firma Funcionario */}
              <tr>
                <td className="border-r border-black p-2.5 font-normal w-1/2 align-top h-16">
                  <div className="font-normal text-black">{nombreFuncionario}</div>
                  {rutFuncionario && (
                    <div className="text-xs text-slate-700 font-mono mt-1">
                      RUT: {rutFuncionario}
                    </div>
                  )}
                </td>
                <td className="p-2.5 font-normal w-1/2 align-top">
                  <div className="font-normal text-black">Firma Funcionario</div>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* Indicador de Página para vista en pantalla */}
        <div className="mt-8 text-right text-[10px] text-slate-400 font-mono print:hidden">
          Página 3 de 3 • Conducta Funcionaria y Firmas
        </div>

      </div>

    </div>
  );
};

export default DocumentoOficialMelipilla;
