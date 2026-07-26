import React, { useState } from 'react';
import { Printer, Edit3, Save, Download } from 'lucide-react';

/**
 * InformeHonorariosPrint Component
 * Exact pixel-perfect replica of "INFORME PRESTACIÓN SERVICIOS" (Page 1 and Page 2).
 * Styled with exact typography matching official specs:
 *  - Subtitle: Myriad Pro 14pt (Italic)
 *  - Address: Bookman Old Style 8pt (Italic)
 *  - Main Titles: Segoe UI 20pt (Bold, Underlined)
 *  - Metadata Fields: Calibri 11pt (Labels Bold, Values Regular)
 *  - Signatures & Bank Details: Segoe UI 8pt (Bold / Regular)
 */
const InformeHonorariosPrint = ({
  funcionario = {
    nombre: 'Natacha Guevara',
    rut: '26.454.184-0',
    cargo: 'Médico Cirujano',
    lugar: 'SAR'
  },
  periodo = 'JUNIO 2026',
  resumenHoras = {
    valorHoraLuVi: 21000,
    horasLuVi: 72.5,
    valorHoraSaDoFest: 21000,
    horasSaDoFest: 19.0,
    valorMensual: 0,
    diasTrabajados: 0
  },
  datosBancarios = {
    tipoCuenta: 'Cuenta Corriente',
    banco: 'Banco de Chile',
    numeroCuenta: '00-250-20799-00',
    telefono: '941234243',
    email: 'naty.gueleo28@gmail.com'
  },
  actividades = [
    'CONTROL DE SIGNOS VITALES.',
    'TOMA DE ELECTROCARDIOGRAMAS.',
    'ADMINISTRACION DE MEDICAMENTOS VIA ORAL, IM, EV.',
    'CURACIONES.',
    'TRASLADOS DE PACIENTES CRITICOS A HOSPITAL SAN JOSE DE MELIPILLA.'
  ],
  fechaEmision = '01 de Julio de 2026',
  allowEdit = true,
  onSaveData = null
}) => {
  // Editable local state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    funcionarioNombre: funcionario.nombre || '',
    funcionarioRut: funcionario.rut || '',
    funcionarioCargo: funcionario.cargo || '',
    funcionarioLugar: funcionario.lugar || 'SAR',
    periodo: periodo || 'JUNIO 2026',
    
    // Horas Lu-Vi
    valorHoraLuVi: resumenHoras.valorHoraLuVi || 21000,
    horasLuVi: resumenHoras.horasLuVi || 0,

    // Horas Sa-Do-Fest
    valorHoraSaDoFest: resumenHoras.valorHoraSaDoFest || 21000,
    horasSaDoFest: resumenHoras.horasSaDoFest || 0,

    // Mensual
    valorMensual: resumenHoras.valorMensual || 0,
    diasTrabajados: resumenHoras.diasTrabajados || 0,

    // Datos Bancarios
    tipoCuenta: datosBancarios.tipoCuenta || 'Cuenta Corriente',
    banco: datosBancarios.banco || 'Banco de Chile',
    numeroCuenta: datosBancarios.numeroCuenta || '',
    telefono: datosBancarios.telefono || '',
    email: datosBancarios.email || '',

    // Actividades (array 5 items)
    actividad1: actividades[0] || 'CONTROL DE SIGNOS VITALES.',
    actividad2: actividades[1] || 'TOMA DE ELECTROCARDIOGRAMAS.',
    actividad3: actividades[2] || 'ADMINISTRACION DE MEDICAMENTOS VIA ORAL, IM, EV.',
    actividad4: actividades[3] || 'CURACIONES.',
    actividad5: actividades[4] || 'TRASLADOS DE PACIENTES CRITICOS A HOSPITAL SAN JOSE DE MELIPILLA.',

    // Fecha emision
    fechaDia: '01',
    fechaMes: 'Julio',
    fechaAño: '2026'
  });

  // Calculate totals
  const totalLuVi = Math.round((formData.valorHoraLuVi || 0) * (formData.horasLuVi || 0));
  const totalSaDoFest = Math.round((formData.valorHoraSaDoFest || 0) * (formData.horasSaDoFest || 0));

  const formatCLP = (val) => {
    if (!val && val !== 0) return '';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 })
      .format(val)
      .replace('CLP$', '$')
      .replace('CLP', '$')
      .trim();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Font Stacks
  const FONT_SEGOE = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
  const FONT_MYRIAD = '"Myriad Pro", Myriad, "Segoe UI", sans-serif';
  const FONT_BOOKMAN = '"Bookman Old Style", Bookman, Georgia, serif';
  const FONT_CALIBRI = 'Calibri, Candara, Segoe, "Segoe UI", Optima, sans-serif';

  return (
    <div className="space-y-6">
      {/* Action Control Bar (Hidden when printing) */}
      <div className="print:hidden bg-secondary text-white p-4 rounded-3xl shadow-lg flex flex-wrap items-center justify-between gap-4 border border-secondary-light">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-2xl flex items-center justify-center text-primary-light">
            <Printer size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight text-white">Informe de Prestación de Servicios (Honorarios)</h3>
            <p className="text-xs text-gray-300">Documento oficial formateado en tipografías oficiales (Segoe UI, Calibri, Myriad Pro, Bookman Old Style).</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {allowEdit && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                isEditing 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-400 shadow-md' 
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
            >
              {isEditing ? <Save size={15} /> : <Edit3 size={15} />}
              {isEditing ? 'Modo Edición Activo' : 'Modificar Datos'}
            </button>
          )}

          <button
            onClick={handlePrint}
            className="btn-primary py-2 px-5 text-xs font-bold flex items-center gap-2 shadow-md uppercase tracking-wider"
          >
            <Download size={16} /> Descargar PDF / Imprimir
          </button>
        </div>
      </div>

      {/* Printable Area Wrapper */}
      <div className="printable-document-area bg-gray-200/70 p-4 md:p-8 rounded-3xl print:p-0 print:bg-white print:m-0">
        
        {/* ════════════════════════════════════════════════════════════════════════════
            PÁGINA 1: INFORME PRESTACIÓN SERVICIOS
           ════════════════════════════════════════════════════════════════════════════ */}
        <div className="w-[210mm] min-h-[297mm] bg-white p-8 md:p-12 mx-auto mb-8 shadow-2xl print:shadow-none print:m-0 print:p-8 print:w-full text-black relative flex flex-col justify-between break-after-page">
          <div>
            
            {/* Header: Logo & Letterhead Subtitle */}
            <div className="border-b-2 border-black pb-1 mb-1">
              <div className="flex items-start justify-between">
                <div>
                  <img 
                    src="/img/logo_corporativo.png" 
                    alt="Corporación Municipal de Melipilla" 
                    className="h-16 w-auto object-contain mb-1"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/IMG/logo_corporativo.png";
                    }}
                  />
                </div>
              </div>

              {/* Subtitle: Myriad Pro 14pt (Italic) */}
              <p 
                style={{ fontFamily: FONT_MYRIAD, fontSize: '14pt' }} 
                className="italic text-gray-700 mt-1"
              >
                Corporación Municipal de Melipilla
              </p>
            </div>
            
            {/* Address: Bookman Old Style 8pt (Italic) */}
            <p 
              style={{ fontFamily: FONT_BOOKMAN, fontSize: '8pt' }} 
              className="italic text-gray-500 mb-6 leading-tight"
            >
              Eleuterio Ramírez N°0387<br />
              Población. Manuel Rodríguez<br />
              Melipilla / Fono: 224897900
            </p>

            {/* Main Title: Segoe UI 20pt (Bold, Underlined) */}
            <div className="text-center my-6">
              <h1 
                style={{ fontFamily: FONT_SEGOE, fontSize: '20pt' }} 
                className="font-bold uppercase tracking-tight text-black underline underline-offset-4 decoration-1"
              >
                INFORME PRESTACIÓN SERVICIOS
              </h1>
            </div>

            {/* General Info Fields: Calibri 11pt (Labels Bold 11pt, Values Regular 11pt) */}
            <div 
              style={{ fontFamily: FONT_CALIBRI, fontSize: '11pt' }} 
              className="my-6 space-y-1.5 font-normal"
            >
              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">NOMBRE</span>
                <span className="mr-2 font-bold">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.funcionarioNombre}
                    onChange={e => handleInputChange('funcionarioNombre', e.target.value)}
                    className="border border-amber-400 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold w-72"
                  />
                ) : (
                  <span className="font-normal text-black">{formData.funcionarioNombre}</span>
                )}
              </div>

              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">RUT</span>
                <span className="mr-2 font-bold">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.funcionarioRut}
                    onChange={e => handleInputChange('funcionarioRut', e.target.value)}
                    className="border border-amber-400 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold w-48"
                  />
                ) : (
                  <span className="font-normal text-black">{formData.funcionarioRut}</span>
                )}
              </div>

              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">CARGO</span>
                <span className="mr-2 font-bold">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.funcionarioCargo}
                    onChange={e => handleInputChange('funcionarioCargo', e.target.value)}
                    className="border border-amber-400 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold w-72"
                  />
                ) : (
                  <span className="font-normal text-black">{formData.funcionarioCargo}</span>
                )}
              </div>

              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">LUGAR</span>
                <span className="mr-2 font-bold">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.funcionarioLugar}
                    onChange={e => handleInputChange('funcionarioLugar', e.target.value)}
                    className="border border-amber-400 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold w-48"
                  />
                ) : (
                  <span className="font-normal text-black">{formData.funcionarioLugar}</span>
                )}
              </div>

              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">MES Y AÑO</span>
                <span className="mr-2 font-bold">:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.periodo}
                    onChange={e => handleInputChange('periodo', e.target.value)}
                    className="border border-amber-400 bg-amber-50 px-2 py-0.5 rounded text-xs font-bold w-48"
                  />
                ) : (
                  <span className="font-normal text-black uppercase">{formData.periodo}</span>
                )}
              </div>
            </div>

            {/* Section: Valores del Servicio */}
            <div className="mt-6 mb-4">
              <h3 
                style={{ fontFamily: FONT_SEGOE, fontSize: '11pt' }} 
                className="font-bold text-black underline mb-3"
              >
                Valores del Servicio:
              </h3>

              {/* Side-by-side Tables Grid */}
              <div 
                style={{ fontFamily: FONT_SEGOE }} 
                className="flex flex-col sm:flex-row gap-6 items-start text-xs"
              >
                
                {/* Table 1: Horas (Lu-Vi, Sa-Do-Fest) */}
                <div className="w-full sm:w-[58%] border-2 border-black">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="p-1.5 border-r border-black w-1/4"></th>
                        <th className="p-1.5 border-r border-black font-bold text-center w-1/4">Valor hora</th>
                        <th className="p-1.5 border-r border-black font-bold text-center w-1/4">Horas realizadas</th>
                        <th className="p-1.5 font-bold text-center w-1/4">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black text-center">
                        <td className="p-1.5 border-r border-black font-bold text-left">Lu-Vi</td>
                        <td className="p-1.5 border-r border-black">
                          {isEditing ? (
                            <input
                              type="number"
                              value={formData.valorHoraLuVi}
                              onChange={e => handleInputChange('valorHoraLuVi', Number(e.target.value))}
                              className="w-full text-center border border-amber-400 bg-amber-50"
                            />
                          ) : (
                            formatCLP(formData.valorHoraLuVi)
                          )}
                        </td>
                        <td className="p-1.5 border-r border-black">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.5"
                              value={formData.horasLuVi}
                              onChange={e => handleInputChange('horasLuVi', Number(e.target.value))}
                              className="w-full text-center border border-amber-400 bg-amber-50"
                            />
                          ) : (
                            formData.horasLuVi
                          )}
                        </td>
                        <td className="p-1.5 text-right font-medium">{formatCLP(totalLuVi)}</td>
                      </tr>

                      <tr className="border-b border-black text-center">
                        <td className="p-1.5 border-r border-black font-bold text-left">Sa-Do-Fest</td>
                        <td className="p-1.5 border-r border-black">
                          {isEditing ? (
                            <input
                              type="number"
                              value={formData.valorHoraSaDoFest}
                              onChange={e => handleInputChange('valorHoraSaDoFest', Number(e.target.value))}
                              className="w-full text-center border border-amber-400 bg-amber-50"
                            />
                          ) : (
                            formatCLP(formData.valorHoraSaDoFest)
                          )}
                        </td>
                        <td className="p-1.5 border-r border-black">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.5"
                              value={formData.horasSaDoFest}
                              onChange={e => handleInputChange('horasSaDoFest', Number(e.target.value))}
                              className="w-full text-center border border-amber-400 bg-amber-50"
                            />
                          ) : (
                            formData.horasSaDoFest
                          )}
                        </td>
                        <td className="p-1.5 text-right font-medium">{formatCLP(totalSaDoFest)}</td>
                      </tr>

                      {/* Total Row */}
                      <tr className="font-bold">
                        <td colSpan="3" className="p-1.5 border-r border-black text-center font-extrabold">TOTAL</td>
                        <td className="p-1.5 text-right font-extrabold">{formatCLP(totalLuVi + totalSaDoFest)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Table 2: Valor Mensual / Días Trabajados */}
                <div className="w-full sm:w-[40%] border-2 border-black">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black">
                        <th className="p-1.5 border-r border-black font-bold text-center">Valor Mensual</th>
                        <th className="p-1.5 border-r border-black font-bold text-center">Días trabajados</th>
                        <th className="p-1.5 font-bold text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="h-14 text-center">
                        <td className="p-1.5 border-r border-black">
                          {isEditing ? (
                            <input
                              type="number"
                              value={formData.valorMensual}
                              onChange={e => handleInputChange('valorMensual', Number(e.target.value))}
                              className="w-full text-center border border-amber-400 bg-amber-50"
                            />
                          ) : (
                            formData.valorMensual ? formatCLP(formData.valorMensual) : ''
                          )}
                        </td>
                        <td className="p-1.5 border-r border-black">
                          {isEditing ? (
                            <input
                              type="number"
                              value={formData.diasTrabajados}
                              onChange={e => handleInputChange('diasTrabajados', Number(e.target.value))}
                              className="w-full text-center border border-amber-400 bg-amber-50"
                            />
                          ) : (
                            formData.diasTrabajados || ''
                          )}
                        </td>
                        <td className="p-1.5 text-right">
                          {formData.valorMensual ? formatCLP(formData.valorMensual) : ''}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Firmas Block Page 1: Segoe UI 8pt */}
            <div 
              style={{ fontFamily: FONT_SEGOE, fontSize: '8pt' }} 
              className="mt-16 mb-6 pt-10 flex justify-between items-end text-center font-bold tracking-tight"
            >
              {/* Signature 1 */}
              <div className="w-[30%] space-y-1">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="font-bold uppercase text-[9pt]">PRESTADOR DE SERVICIO</p>
                  <p style={{ fontSize: '8pt' }} className="font-normal text-gray-600 mt-0.5 uppercase">FIRMA</p>
                </div>
              </div>

              {/* Signature 2 */}
              <div className="w-[36%] space-y-1">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="font-bold uppercase text-[9pt]">ENCARGADO DE CENTRO O REFERENTE DE PROGRAMA</p>
                  <p style={{ fontSize: '8pt' }} className="font-normal text-gray-600 mt-0.5 uppercase">NOMBRE Y FIRMA</p>
                </div>
              </div>

              {/* Signature 3 */}
              <div className="w-[30%] space-y-1">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="font-bold uppercase text-[9pt]">DIRECCION DE SALUD</p>
                  <p style={{ fontSize: '8pt' }} className="font-normal text-gray-600 mt-0.5 uppercase">NOMBRE Y FIRMA</p>
                </div>
              </div>
            </div>

            {/* Datos Personales Para Pago Con Transferencia Bancaria: Segoe UI 8pt */}
            <div 
              style={{ fontFamily: FONT_SEGOE, fontSize: '8pt' }} 
              className="my-4 pt-3 border-t border-gray-300 space-y-1"
            >
              <h4 
                style={{ fontFamily: FONT_SEGOE, fontSize: '9pt' }} 
                className="font-bold uppercase text-black underline mb-2"
              >
                DATOS PERSONALES PARA PAGO CON TRANSFERENCIA BANCARIA
              </h4>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
                <div>
                  <span className="font-bold">TIPO DE CUENTA: </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.tipoCuenta}
                      onChange={e => handleInputChange('tipoCuenta', e.target.value)}
                      className="border border-amber-400 bg-amber-50 px-1 text-xs"
                    />
                  ) : (
                    <span className="font-normal">{formData.tipoCuenta}</span>
                  )}
                </div>

                <div>
                  <span className="font-bold">BANCO: </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.banco}
                      onChange={e => handleInputChange('banco', e.target.value)}
                      className="border border-amber-400 bg-amber-50 px-1 text-xs"
                    />
                  ) : (
                    <span className="font-normal">{formData.banco}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
                <div>
                  <span className="font-bold">Nº CUENTA: </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.numeroCuenta}
                      onChange={e => handleInputChange('numeroCuenta', e.target.value)}
                      className="border border-amber-400 bg-amber-50 px-1 text-xs"
                    />
                  ) : (
                    <span className="font-normal">{formData.numeroCuenta}</span>
                  )}
                </div>

                <div>
                  <span className="font-bold">TELEFONO: </span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.telefono}
                      onChange={e => handleInputChange('telefono', e.target.value)}
                      className="border border-amber-400 bg-amber-50 px-1 text-xs"
                    />
                  ) : (
                    <span className="font-normal">{formData.telefono}</span>
                  )}
                </div>
              </div>

              <div>
                <span className="font-bold">E-MAIL DE CONTACTO PARA NOTIFICACION: </span>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    className="border border-amber-400 bg-amber-50 px-1 text-xs w-64"
                  />
                ) : (
                  <span className="font-normal">{formData.email}</span>
                )}
              </div>
            </div>

            {/* Fecha and Disclaimer note */}
            <div 
              style={{ fontFamily: FONT_SEGOE, fontSize: '8pt' }} 
              className="mt-4 space-y-1.5"
            >
              <p className="font-normal text-black">
                FECHA: Día: <span className="font-bold">{formData.fechaDia}</span> Mes: <span className="font-bold">{formData.fechaMes}</span> Año: <span className="font-bold">{formData.fechaAño}</span>
              </p>
              <p className="font-bold text-black leading-tight">
                Se requiere claridad en los datos solicitados, sin enmendaduras, boleta honorarios adjunta, y en los plazos establecidos internamente.
              </p>
            </div>
          </div>

          {/* Footer Page Number */}
          <div 
            style={{ fontFamily: FONT_SEGOE, fontSize: '9pt' }} 
            className="text-right pt-2 font-bold text-black"
          >
            Página 1
          </div>
        </div>


        {/* ════════════════════════════════════════════════════════════════════════════
            PÁGINA 2: DETALLE DE LAS PRESTACIÓNES REALIZADAS
           ════════════════════════════════════════════════════════════════════════════ */}
        <div className="w-[210mm] min-h-[297mm] bg-white p-8 md:p-12 mx-auto shadow-2xl print:shadow-none print:m-0 print:p-8 print:w-full text-black relative flex flex-col justify-between">
          <div>
            
            {/* Header: Logo & Subtitle */}
            <div className="border-b-2 border-black pb-1 mb-1">
              <div className="flex items-start justify-between">
                <div>
                  <img 
                    src="/img/logo_corporativo.png" 
                    alt="Corporación Municipal de Melipilla" 
                    className="h-16 w-auto object-contain mb-1"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/IMG/logo_corporativo.png";
                    }}
                  />
                </div>
              </div>
              <p 
                style={{ fontFamily: FONT_MYRIAD, fontSize: '14pt' }} 
                className="italic text-gray-700 mt-1"
              >
                Corporación Municipal de Melipilla
              </p>
            </div>
            
            <p 
              style={{ fontFamily: FONT_BOOKMAN, fontSize: '8pt' }} 
              className="italic text-gray-500 mb-6 leading-tight"
            >
              Eleuterio Ramírez N°0387<br />
              Población. Manuel Rodríguez<br />
              Melipilla / Fono: 224897900
            </p>

            {/* Page 2 Title: Segoe UI 20pt */}
            <div className="text-center my-6">
              <h1 
                style={{ fontFamily: FONT_SEGOE, fontSize: '20pt' }} 
                className="font-bold uppercase tracking-tight text-black underline underline-offset-4 decoration-1"
              >
                DETALLE DE LAS PRESTACIÓNES REALIZADAS
              </h1>
            </div>

            {/* General Info Fields: Calibri 11pt */}
            <div 
              style={{ fontFamily: FONT_CALIBRI, fontSize: '11pt' }} 
              className="my-6 space-y-1.5 font-normal"
            >
              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">NOMBRE</span>
                <span className="mr-2 font-bold">:</span>
                <span className="font-normal text-black">{formData.funcionarioNombre}</span>
              </div>

              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">RUT</span>
                <span className="mr-2 font-bold">:</span>
                <span className="font-normal text-black">{formData.funcionarioRut}</span>
              </div>

              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">CARGO</span>
                <span className="mr-2 font-bold">:</span>
                <span className="font-normal text-black">{formData.funcionarioCargo}</span>
              </div>

              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">LUGAR</span>
                <span className="mr-2 font-bold">:</span>
                <span className="font-normal text-black">{formData.funcionarioLugar}</span>
              </div>

              <div className="flex items-center">
                <span className="w-28 font-bold text-black uppercase tracking-wider">MES Y AÑO</span>
                <span className="mr-2 font-bold">:</span>
                <span className="font-normal text-black uppercase">{formData.periodo}</span>
              </div>
            </div>

            {/* Activities List Section */}
            <div className="my-8 space-y-4">
              <h3 
                style={{ fontFamily: FONT_SEGOE, fontSize: '10pt' }} 
                className="font-bold uppercase text-black"
              >
                DETALLE PRINCIPALES ACTIVIDADES REALIZADAS (MENCIONAR 4 O 5 MÁS IMPORTANTES):
              </h3>

              <div 
                style={{ fontFamily: FONT_CALIBRI, fontSize: '11pt' }} 
                className="pl-6 space-y-3 font-normal leading-relaxed"
              >
                {[1, 2, 3, 4, 5].map((idx) => {
                  const key = `actividad${idx}`;
                  return (
                    <div key={idx} className="flex items-baseline gap-2">
                      <span className="font-bold min-w-[20px]">{idx}.</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData[key]}
                          onChange={e => handleInputChange(key, e.target.value)}
                          className="w-full border border-amber-400 bg-amber-50 px-2 py-0.5 rounded text-xs"
                        />
                      ) : (
                        <span className="uppercase text-black">{formData[key]}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Firmas Block Page 2: Segoe UI 8pt */}
            <div 
              style={{ fontFamily: FONT_SEGOE, fontSize: '8pt' }} 
              className="mt-28 mb-6 pt-10 flex justify-around items-end text-center font-bold tracking-tight"
            >
              {/* Signature 1 */}
              <div className="w-[38%] space-y-1">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="font-bold uppercase text-[9pt]">PRESTADOR DE SERVICIO</p>
                  <p style={{ fontSize: '8pt' }} className="font-normal text-gray-600 mt-0.5 uppercase">FIRMA</p>
                </div>
              </div>

              {/* Signature 2 */}
              <div className="w-[44%] space-y-1">
                <div className="border-t-2 border-gray-400 pt-2">
                  <p className="font-bold uppercase text-[9pt]">ENCARGADO DE CENTRO O REFERENTE DE PROGRAMA</p>
                  <p style={{ fontSize: '8pt' }} className="font-normal text-gray-600 mt-0.5 uppercase">NOMBRE Y FIRMA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Page Number */}
          <div 
            style={{ fontFamily: FONT_SEGOE, fontSize: '9pt' }} 
            className="text-right pt-2 font-bold text-black"
          >
            Página 2
          </div>
        </div>

      </div>
    </div>
  );
};

export default InformeHonorariosPrint;
