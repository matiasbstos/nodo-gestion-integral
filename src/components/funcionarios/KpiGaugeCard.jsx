import React from 'react';
import { TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

/**
 * KpiGaugeCard
 * Circular Progress Gauge Card inspired directly by TeamHub HRMS Enterprise Dashboard.
 * 100% SVG, Zero Emojis, clean pearl & slate design tokens.
 */
export default function KpiGaugeCard({
  title,
  subtitle,
  value,
  progress = 85, // 0 - 100
  gaugeCenterText,
  colorScheme = 'emerald', // 'emerald', 'sky', 'amber', 'indigo'
  trendLabel,
  trendType = 'up', // 'up', 'down', 'neutral'
  icon: Icon
}) {
  // Color palette definitions
  const schemes = {
    emerald: {
      track: 'stroke-emerald-100',
      bar: 'stroke-emerald-500',
      text: 'text-emerald-700',
      bgPill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      accent: 'text-emerald-600'
    },
    sky: {
      track: 'stroke-sky-100',
      bar: 'stroke-sky-500',
      text: 'text-sky-700',
      bgPill: 'bg-sky-50 text-sky-700 border-sky-200',
      accent: 'text-sky-600'
    },
    amber: {
      track: 'stroke-amber-100',
      bar: 'stroke-amber-500',
      text: 'text-amber-800',
      bgPill: 'bg-amber-50 text-amber-800 border-amber-200',
      accent: 'text-amber-600'
    },
    indigo: {
      track: 'stroke-indigo-100',
      bar: 'stroke-indigo-500',
      text: 'text-indigo-700',
      bgPill: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      accent: 'text-indigo-600'
    }
  };

  const currentTheme = schemes[colorScheme] || schemes.emerald;

  // SVG circular calculations
  const size = 68;
  const strokeWidth = 6.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4">
      {/* Left Info Column */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          {Icon && <Icon size={14} className="text-slate-400 shrink-0" strokeWidth={1.5} />}
          <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase truncate">
            {title}
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-slate-800 tracking-tight">
            {value}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          {trendLabel && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentTheme.bgPill}`}>
              {trendType === 'up' && <TrendingUp size={11} strokeWidth={2} />}
              {trendType === 'down' && <TrendingDown size={11} strokeWidth={2} />}
              {trendType === 'neutral' && <CheckCircle2 size={11} strokeWidth={2} />}
              {trendLabel}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] text-slate-500 truncate font-medium">
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right Circular Gauge */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className={currentTheme.track}
          />
          {/* Foreground progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className={`${currentTheme.bar} transition-all duration-700 ease-out`}
          />
        </svg>

        {/* Center Text inside the Donut */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-[11px] font-black tracking-tight ${currentTheme.text}`}>
            {gaugeCenterText !== undefined ? gaugeCenterText : `${Math.round(clampedProgress)}%`}
          </span>
        </div>
      </div>
    </div>
  );
}
