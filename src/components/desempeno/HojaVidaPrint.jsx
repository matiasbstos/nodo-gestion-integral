import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  Award, 
  Calendar, 
  FileCheck, 
  CheckCircle2, 
  ShieldCheck, 
  Layers 
} from 'lucide-react';
import DocumentoOficialMelipilla from './DocumentoOficialMelipilla';
import { 
  TIPOS_ANOTACION, 
  getEscalaInfo 
} from '../../services/hojaVidaService';

/**
 * HojaVidaPrint
 * Vista de Impresión y Descarga Oficial (PDF / A4).
 * Permite alternar entre:
 * 1. Formulario Oficial Melipilla (Recreación exacta del estándar Cormumel Ley 19.378 en 3 páginas).
 * 2. Informe General Hoja de Vida (Historial cronológico de anotaciones y méritos).
 */
const HojaVidaPrint = ({
  funcionario,
  anotaciones = [],
  metricas = {},
  evaluacion = null,
  periodo = '2026',
  evaluador = null,
  onClose = null
}) => {
  // Modo por defecto: Si viene una evaluación con factores oficiales, priorizar el Formulario Oficial Estándar
  const [modoVista, setModoVista] = useState(
    evaluacion?.factores || evaluacion ? 'oficial' : 'hoja_vida'
  );

  const escala = evaluacion ? getEscalaInfo(evaluacion.calificacion) : null;

  const handlePrint = () => {
    window.print();
  };

  const fechaHoy = new Date().toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-[150] bg-slate-900/80 backdrop-blur-md overflow-y-auto p-3 md:p-8 flex flex-col items-center">
      
      {/* ── Barra de Controles Flotante (Oculta al imprimir) ──────────────── */}
      <div className="print:hidden w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-4 sm:p-5 mb-6 border border-slate-200 animate-scale-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-bold shrink-0">
              <FileCheck size={22} strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Estándar Cormumel • Ley 19.378
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {funcionario?.rut}
                </span>
              </div>
              <h3 className="font-black text-slate-900 text-sm md:text-base mt-0.5">
                {modoVista === 'oficial' 
                  ? 'Formulario Oficial de Calificación (3 Páginas)' 
                  : 'Informe de Hoja de Vida y Anotaciones'}
              </h3>
              <p className="text-xs text-slate-500">
                {funcionario?.nombre} • {evaluacion?.periodoEvaluacion || `Período ${periodo}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Selector de Modo */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setModoVista('oficial')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  modoVista === 'oficial'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Formato Oficial Cormumel
              </button>
              <button
                type="button"
                onClick={() => setModoVista('hoja_vida')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  modoVista === 'hoja_vida'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Historial Hoja de Vida
              </button>
            </div>

            {/* Botón Imprimir / PDF */}
            <button
              onClick={handlePrint}
              className="btn-primary px-4 py-2 rounded-2xl text-xs font-bold shadow-md shadow-primary/20 flex items-center gap-2"
              title="Abre el diálogo nativo para imprimir en papel o Guardar como PDF"
            >
              <Printer size={16} strokeWidth={1.5} />
              <span>Imprimir / Descargar PDF</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="Cerrar vista previa"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ── Contenedor del Documento Imprimible ────────────────────────────── */}
      <div className="printable-document-area w-full max-w-4xl bg-white shadow-2xl rounded-2xl print:rounded-none print:shadow-none print:m-0 print:p-0 overflow-hidden">
        
        {/* VISTA 1: RECREACIÓN IDÉNTICA DEL FORMULARIO OFICIAL MELIPILLA (3 PÁGINAS) */}
        {modoVista === 'oficial' && (
          <DocumentoOficialMelipilla
            evaluacion={evaluacion}
            funcionario={funcionario}
            evaluador={evaluador}
          />
        )}

        {/* VISTA 2: INFORME RESUMEN HOJA DE VIDA Y EVENTOS REGISTRADOS */}
        {modoVista === 'hoja_vida' && (
          <div className="p-8 md:p-12 text-slate-900 font-sans">
            
            {/* Encabezado Institucional NODO / SAR */}
            <div className="border-b-2 border-slate-800 pb-5 mb-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-900 text-white rounded flex items-center justify-center font-bold text-xs print:bg-black">
                      N
                    </div>
                    <h1 className="font-black text-xl tracking-tight text-slate-900">
                      NODO GESTIÓN INTEGRAL
                    </h1>
                  </div>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                    SERVICIO DE ATENCIÓN PRIMARIA DE URGENCIA (SAR) • RED DE SALUD
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Dirección Técnica • Jefatura de Gestión Clínica y Enfermería
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span className="inline-block px-3 py-1 bg-slate-100 print:bg-slate-200 text-slate-800 text-xs font-bold uppercase tracking-wider rounded">
                    INFORME HISTÓRICO
                  </span>
                  <p className="text-[11px] text-slate-500 font-mono mt-1">
                    EMISIÓN: {fechaHoy}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    FOLIO DES-{funcionario?.rut?.replace(/[^0-9]/g, '').slice(-6) || '000000'}-{periodo}
                  </p>
                </div>
              </div>

              <div className="text-center mt-6">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  INFORME CONSOLIDADO DE HOJA DE VIDA
                </h2>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mt-0.5">
                  PERÍODO: {evaluacion?.periodoEvaluacion || periodo}
                </p>
              </div>
            </div>

            {/* 1. Datos del Funcionario */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider bg-slate-100 print:bg-slate-200 px-3 py-1.5 mb-3 border-l-4 border-slate-800">
                1. IDENTIFICACIÓN DEL FUNCIONARIO
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border border-slate-200 p-4 rounded-lg bg-slate-50/50 print:bg-white">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Nombre Completo</span>
                  <span className="font-bold text-slate-900">{funcionario?.nombre || 'No registrado'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">RUT / Identificador</span>
                  <span className="font-bold text-slate-900 font-mono">{funcionario?.rut || 'Sin RUT'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Cargo / Estamento</span>
                  <span className="font-semibold text-slate-800">{funcionario?.cargo || 'Funcionario'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Establecimiento</span>
                  <span className="font-semibold text-slate-800">SAR Melipilla / Cormumel</span>
                </div>
              </div>
            </div>

            {/* 2. Resumen Cuantitativo */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider bg-slate-100 print:bg-slate-200 px-3 py-1.5 mb-3 border-l-4 border-slate-800">
                2. RESUMEN DE EVENTOS EN EL PERÍODO
              </h3>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="border border-emerald-300 bg-emerald-50/40 p-3 rounded-lg print:border-black">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Felicitaciones</span>
                  <span className="text-2xl font-black text-emerald-700">{metricas.felicitaciones || 0}</span>
                </div>
                <div className="border border-amber-300 bg-amber-50/40 p-3 rounded-lg print:border-black">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Retrasos en Turno</span>
                  <span className="text-2xl font-black text-amber-700">{metricas.retrasos || 0}</span>
                </div>
                <div className="border border-rose-300 bg-rose-50/40 p-3 rounded-lg print:border-black">
                  <span className="text-[10px] font-bold text-rose-800 uppercase block">Faltas de Protocolo</span>
                  <span className="text-2xl font-black text-rose-700">{metricas.faltasProtocolo || 0}</span>
                </div>
                <div className="border border-orange-300 bg-orange-50/40 p-3 rounded-lg print:border-black">
                  <span className="text-[10px] font-bold text-orange-800 uppercase block">Ausencias Injustif.</span>
                  <span className="text-2xl font-black text-orange-700">{metricas.ausencias || 0}</span>
                </div>
              </div>
            </div>

            {/* 3. Detalle de Anotaciones */}
            <div className="mb-8">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider bg-slate-100 print:bg-slate-200 px-3 py-1.5 mb-3 border-l-4 border-slate-800">
                3. REGISTRO CRONOLÓGICO DE ANOTACIONES
              </h3>
              {anotaciones.length === 0 ? (
                <p className="text-xs text-slate-500 italic p-3 text-center border border-slate-200 rounded">
                  El funcionario no registra anotaciones disciplinarias ni méritos en el período indicado.
                </p>
              ) : (
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 print:bg-slate-200 text-slate-800 font-bold uppercase text-[10px]">
                      <th className="border border-slate-300 p-2 text-left w-24">Fecha</th>
                      <th className="border border-slate-300 p-2 text-left w-36">Tipo Anotación</th>
                      <th className="border border-slate-300 p-2 text-left">Detalle / Fundamento del Hecho</th>
                      <th className="border border-slate-300 p-2 text-left w-36">Registrado Por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anotaciones.map((anot, idx) => {
                      const conf = TIPOS_ANOTACION[anot.tipo] || TIPOS_ANOTACION.nota_desempeno;
                      return (
                        <tr key={anot.id || idx} className="hover:bg-slate-50 border-b border-slate-200">
                          <td className="border border-slate-300 p-2 font-mono whitespace-nowrap">
                            {anot.fechaEvento || '-'}
                          </td>
                          <td className="border border-slate-300 p-2 font-semibold">
                            {conf.label}
                          </td>
                          <td className="border border-slate-300 p-2 text-slate-700 leading-snug">
                            {anot.descripcion}
                          </td>
                          <td className="border border-slate-300 p-2 text-[10px] text-slate-600">
                            {anot.autorNombre || 'Jefatura'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* 4. Firmas */}
            <div className="mt-16 pt-8 border-t-2 border-slate-300">
              <div className="grid grid-cols-2 gap-12 text-center text-xs">
                <div className="space-y-1">
                  <div className="h-16 border-b border-dashed border-slate-400 mx-8"></div>
                  <p className="font-bold text-slate-900 mt-2">
                    {evaluador?.nombre || 'Directora Técnica / Enfermero Jefe'}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase">
                    {evaluador?.cargo || 'Jefatura de Servicio SAR'}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">Firma y Timbre Evaluador</p>
                </div>

                <div className="space-y-1">
                  <div className="h-16 border-b border-dashed border-slate-400 mx-8"></div>
                  <p className="font-bold text-slate-900 mt-2">
                    {funcionario?.nombre}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase">
                    RUT: {funcionario?.rut}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">Firma Funcionario (Toma de Conocimiento)</p>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default HojaVidaPrint;
