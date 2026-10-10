import React from 'react';
import { 
  Award, 
  Clock, 
  UserX, 
  AlertTriangle, 
  FileText, 
  Trash2, 
  Calendar, 
  User, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { TIPOS_ANOTACION } from '../../services/hojaVidaService';
import EmptyState from '../common/EmptyState';

/**
 * DesempenoTimeline (Enterprise SaaS / Taxonomy Standard)
 * Componente de Línea de Tiempo cronológica (de arriba hacia abajo)
 * Diseñado con íconos SVG de trazo fino (strokeWidth=1.5), bordes sutiles y cero emojis.
 */
const DesempenoTimeline = ({ 
  anotaciones = [], 
  loading = false, 
  onDeleteAnotacion = null,
  esAdmin = false 
}) => {

  const getTipoConfig = (tipo) => {
    return TIPOS_ANOTACION[tipo] || TIPOS_ANOTACION.nota_desempeno;
  };

  const getIcon = (tipo) => {
    switch (tipo) {
      case 'felicitacion':
        return <Award size={18} strokeWidth={1.5} className="text-emerald-600" />;
      case 'retraso':
        return <Clock size={18} strokeWidth={1.5} className="text-amber-600" />;
      case 'ausencia':
        return <UserX size={18} strokeWidth={1.5} className="text-orange-600" />;
      case 'falta_protocolo':
        return <AlertTriangle size={18} strokeWidth={1.5} className="text-rose-600" />;
      case 'nota_desempeno':
      default:
        return <FileText size={18} strokeWidth={1.5} className="text-sky-600" />;
    }
  };

  const getNodeColor = (tipo) => {
    switch (tipo) {
      case 'felicitacion':
        return 'bg-emerald-50 text-emerald-600 border border-emerald-200/80';
      case 'retraso':
        return 'bg-amber-50 text-amber-600 border border-amber-200/80';
      case 'ausencia':
        return 'bg-orange-50 text-orange-600 border border-orange-200/80';
      case 'falta_protocolo':
        return 'bg-rose-50 text-rose-600 border border-rose-200/80';
      case 'nota_desempeno':
      default:
        return 'bg-sky-50 text-sky-600 border border-sky-200/80';
    }
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'Fecha no especificada';
    try {
      const partes = fechaStr.split('-');
      if (partes.length === 3) {
        const d = new Date(partes[0], partes[1] - 1, partes[2]);
        return d.toLocaleDateString('es-CL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }
      return fechaStr;
    } catch {
      return fechaStr;
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Cargando eventos de la Hoja de Vida...
        </p>
      </div>
    );
  }

  if (anotaciones.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Sin Anotaciones Registradas"
        description="No existen registros disciplinarios, felicitaciones o notas de desempeño asociadas a este funcionario en el período seleccionado."
      />
    );
  }

  return (
    <div className="relative pl-6 md:pl-8 space-y-6 my-4">
      {/* Línea vertical conectora sutil */}
      <div className="absolute left-[20px] md:left-[27px] top-3 bottom-3 w-[1.5px] bg-slate-200" />

      {anotaciones.map((item, index) => {
        const tipoInfo = getTipoConfig(item.tipo);
        return (
          <div key={item.id || index} className="relative group">
            {/* Nodo circular con trazo fino */}
            <div className={`absolute -left-[20px] md:-left-[27px] top-1.5 w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs ${getNodeColor(item.tipo)}`}>
              {getIcon(item.tipo)}
            </div>

            {/* Tarjeta de Contenido Corporativa */}
            <div className="ml-5 md:ml-7 rounded-2xl bg-white border border-slate-200/90 p-5 shadow-xs hover:border-slate-300 transition-all">
              {/* Encabezado: Badges y Fecha */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${tipoInfo.badgeClass}`}>
                    {tipoInfo.label}
                  </span>
                  {item.gravedad && item.gravedad !== 'normal' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200/60">
                      Nivel: {item.gravedad}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <Calendar size={13} strokeWidth={1.5} className="text-slate-400" />
                    {formatearFecha(item.fechaEvento)}
                  </span>
                  {esAdmin && onDeleteAnotacion && (
                    <button
                      onClick={() => onDeleteAnotacion(item)}
                      title="Eliminar anotación"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              </div>

              {/* Cuerpo: Descripción de la anotación */}
              <div className="py-3">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                  {item.descripcion}
                </p>
              </div>

              {/* Pie de tarjeta: Autoría y trazabilidad */}
              <div className="mt-1 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-[9px]">
                    {item.autorNombre ? item.autorNombre.charAt(0).toUpperCase() : 'J'}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">{item.autorNombre || 'Jefatura NODO'}</span>
                    {item.autorCargo && (
                      <span className="text-slate-400 ml-1.5 font-normal">({item.autorCargo})</span>
                    )}
                  </div>
                </div>

                {item.fechaCreacionISO && (
                  <span className="text-[10px] text-slate-400 hidden sm:inline">
                    Reg: {new Date(item.fechaCreacionISO).toLocaleDateString('es-CL')}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DesempenoTimeline;
