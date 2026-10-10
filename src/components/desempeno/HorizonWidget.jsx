import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * HorizonWidget (Estándar Taxonomy / Enterprise HRMS)
 * Tarjeta de métrica ejecutiva con bordes sutiles, micro-sombras y trazo fino SVG (strokeWidth=1.5).
 */
const HorizonWidget = ({
  icon: Icon,
  title,
  subtitle,
  extra,
  trend,
  color = 'sky',
  onClick
}) => {
  // Paletas sobrias basadas en Tailwind Slate & Semántica Healthcare
  const colorSchemes = {
    sky: {
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
      borderHover: 'hover:border-sky-300',
      badgeBg: 'bg-sky-50 text-sky-700 border border-sky-200/60'
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      borderHover: 'hover:border-emerald-300',
      badgeBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      borderHover: 'hover:border-amber-300',
      badgeBg: 'bg-amber-50 text-amber-700 border border-amber-200/60'
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      borderHover: 'hover:border-rose-300',
      badgeBg: 'bg-rose-50 text-rose-700 border border-rose-200/60'
    },
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      borderHover: 'hover:border-indigo-300',
      badgeBg: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.sky;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative flex items-center rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs transition-all duration-200 hover:shadow-subtle hover:border-slate-300",
        scheme.borderHover,
        onClick && "cursor-pointer active:scale-[0.99]",
        extra
      )}
    >
      {/* Contenedor del ícono SVG con trazo fino 1.5 */}
      <div className={cn(
        "flex h-12 w-12 items-center justify-center rounded-xl shrink-0 transition-transform duration-200",
        scheme.iconBg
      )}>
        {Icon && <Icon size={22} strokeWidth={1.5} />}
      </div>

      {/* Contenido Numérico y Jerarquía */}
      <div className="ml-4 flex flex-col justify-center min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </p>
        <div className="flex items-baseline gap-2 mt-1">
          <h4 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
            {subtitle}
          </h4>
          {trend && (
            <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0", scheme.badgeBg)}>
              {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default HorizonWidget;
