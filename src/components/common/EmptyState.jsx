import React from 'react';
import { FolderOpen } from 'lucide-react';

/**
 * EmptyState (Enterprise SaaS / Taxonomy Standard)
 * Componente reutilizable para estados vacíos sin emojis.
 * Diseñado con íconos finos SVG de Lucide (strokeWidth=1.5), tipografía estructurada y colores neutros.
 */
const EmptyState = ({
  icon: Icon = FolderOpen,
  title = "No hay registros disponibles",
  description = "No se encontraron datos para mostrar en este momento con los filtros seleccionados.",
  action = null,
  actionLabel = null,
  className = ""
}) => {
  return (
    <div className={`rounded-2xl border border-dashed border-slate-200 bg-white/80 p-10 md:p-12 text-center animate-fade-in ${className}`}>
      {/* Contenedor del ícono SVG con trazo fino */}
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-xs">
        <Icon size={26} strokeWidth={1.5} className="text-slate-400" />
      </div>

      {/* Título semibold con tracking ajustado */}
      <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
        {title}
      </h3>

      {/* Subtítulo explicativo con contraste equilibrado */}
      {description && (
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed font-normal">
          {description}
        </p>
      )}

      {/* Acción opcional */}
      {action && actionLabel && (
        <div className="mt-5">
          <button
            type="button"
            onClick={action}
            className="btn-secondary px-4 py-2 text-xs font-semibold mx-auto"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
