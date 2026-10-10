import React from 'react';
import { 
  User, CheckCircle2, AlertCircle, ChevronRight, 
  CalendarPlus, Edit3, Building2, Mail, Hash, ShieldCheck 
} from 'lucide-react';

const CATEGORY_LABELS = {
  A: 'Médicos', B: 'Profesionales', C: 'TENS',
  D: 'Téc. Salud', E: 'Administrativos', F: 'Auxiliares'
};

const STATUS_CONFIG = {
  activo:          { label: 'Activo',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20' },
  'pre-registrado':{ label: 'Pre-registrado',  cls: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20'    },
  inactivo:        { label: 'Inactivo',        cls: 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-500/20'       },
};

const AVATAR_PALETTE = [
  'bg-emerald-600', 'bg-sky-600', 'bg-indigo-600',
  'bg-amber-600', 'bg-violet-600', 'bg-rose-600'
];

const getInitials = (nombre = '') => {
  const parts = nombre.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : nombre.slice(0, 2).toUpperCase();
};

const avatarColor = (rut = '') =>
  AVATAR_PALETTE[(rut.charCodeAt(0) || 0) % AVATAR_PALETTE.length];

export default function FuncionarioTable({
  funcionarios = [],
  onOpenExpediente,
  onOpenAssignTurno,
  onEditFuncionario
}) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <th className="py-4 px-6">Funcionario</th>
              <th className="py-4 px-5">Estamento & Rol</th>
              <th className="py-4 px-5">Modalidad & Centro</th>
              <th className="py-4 px-5 text-center">Estado</th>
              <th className="py-4 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {funcionarios.map((f) => {
              const sc = STATUS_CONFIG[f.status] || STATUS_CONFIG['pre-registrado'];
              const isInstitutional = (f.correoInstitucional || f.correo || '').toLowerCase().endsWith('@cormumel.cl');

              return (
                <tr 
                  key={f.id} 
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onOpenExpediente && onOpenExpediente(f)}
                >
                  {/* Funcionario Identity */}
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3.5">
                      {f.fotoUrl ? (
                        <img 
                          src={f.fotoUrl} 
                          alt={f.nombre}
                          className="w-11 h-13 rounded-xl object-cover shadow-xs border border-slate-200 shrink-0" 
                        />
                      ) : (
                        <div className={`w-11 h-13 ${avatarColor(f.rut || f.id)} rounded-xl flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0`}>
                          {getInitials(f.nombre)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                          <span className="truncate">{f.nombre || 'Sin nombre'}</span>
                          {isInstitutional && (
                            <span title="Correo Institucional Cormumel verificado">
                              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" strokeWidth={2} />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="font-mono">{f.rut || f.id}</span>
                          <span>•</span>
                          <span className="truncate max-w-[200px] text-slate-500">
                            {f.correoInstitucional || f.correo || 'Sin correo registrado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Estamento & Rol */}
                  <td className="py-4 px-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {f.categoria ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            Cat {f.categoria} · {CATEGORY_LABELS[f.categoria] || 'General'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400">Sin estamento</span>
                        )}
                        {f.grado && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Grado {f.grado}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-700 truncate max-w-[220px]">
                        {f.tipoPrestador || 'Prestador de Salud'}
                      </p>
                    </div>
                  </td>

                  {/* Modalidad & Centro */}
                  <td className="py-4 px-5">
                    <div className="space-y-1">
                      <span className="inline-block text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {f.tipoContrato || 'Honorarios por horas'}
                      </span>
                      <p className="text-xs text-slate-400 flex items-center gap-1 truncate max-w-[220px]">
                        <Building2 size={12} className="shrink-0" strokeWidth={1.5} />
                        <span className="truncate">{f.centroAsignado || 'SAR Elsa Romo'}</span>
                      </p>
                    </div>
                  </td>

                  {/* Estado */}
                  <td className="py-4 px-5 text-center">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ring-2 ${sc.cls}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                      {sc.label}
                    </span>
                  </td>

                  {/* Acciones */}
                  <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenAssignTurno && onOpenAssignTurno(f)}
                        title="Asignar Turno Directo"
                        className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                      >
                        <CalendarPlus size={16} strokeWidth={1.5} />
                      </button>

                      <button
                        onClick={() => onEditFuncionario && onEditFuncionario(f)}
                        title="Editar Datos"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      >
                        <Edit3 size={16} strokeWidth={1.5} />
                      </button>

                      <button
                        onClick={() => onOpenExpediente && onOpenExpediente(f)}
                        className="inline-flex items-center gap-1 bg-slate-900 hover:bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs group-hover:bg-primary ml-1"
                      >
                        <span>Expediente</span>
                        <ChevronRight size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer info bar */}
      <div className="py-3 px-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <span>Mostrando <strong className="text-slate-700">{funcionarios.length}</strong> funcionarios en nómina activa</span>
        <span>SAR Arpillerista Elsa Romo Aravena · Cormumel</span>
      </div>
    </div>
  );
}
