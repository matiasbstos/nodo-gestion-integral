import React, { useState, useEffect } from 'react';
import {
  User, Mail, Phone, Calendar, Hash, Building2, CreditCard,
  Briefcase, ShieldCheck, CheckCircle2, Clock, Camera, Edit3,
  FileText, Download, ExternalLink, Plus, Award, AlertTriangle,
  TrendingUp, BarChart3, ChevronRight, FileCheck, Printer, Wallet
} from 'lucide-react';
import KpiGaugeCard from './KpiGaugeCard';
import { getInfoRolFuncion, getTarifaBasePorCategoria } from '../../utils/escalaRemuneraciones';
import { getAnotacionesFuncionario, TIPOS_ANOTACION } from '../../services/hojaVidaService';

const CATEGORY_LABELS = {
  A: 'Médicos', B: 'Profesionales', C: 'TENS',
  D: 'Téc. Salud', E: 'Administrativos', F: 'Auxiliares'
};

const STATUS_CONFIG = {
  activo:          { label: 'Activo',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  'pre-registrado':{ label: 'Pre-registrado',  cls: 'bg-amber-50 text-amber-700 border-amber-200'    },
  inactivo:        { label: 'Inactivo',        cls: 'bg-slate-100 text-slate-600 border-slate-200'       },
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

export default function FuncionarioHeroDashboard({
  funcionario,
  onStartEdit,
  onTriggerPhotoModal,
  onOpenAssignTurno,
  onSelectTab,
  turnos = []
}) {
  const f = funcionario || {};
  const [anotaciones, setAnotaciones] = useState([]);
  const [loadingAnotaciones, setLoadingAnotaciones] = useState(false);

  // Fetch real annotations from Hoja de Vida
  useEffect(() => {
    let isMounted = true;
    const fetchNotes = async () => {
      const targetId = f.rut || f.id;
      if (!targetId) return;
      setLoadingAnotaciones(true);
      try {
        const res = await getAnotacionesFuncionario(targetId);
        if (isMounted) setAnotaciones(res || []);
      } catch (err) {
        console.warn('Could not fetch Hoja de Vida notes:', err);
      } finally {
        if (isMounted) setLoadingAnotaciones(false);
      }
    };
    fetchNotes();
    return () => { isMounted = false; };
  }, [f.id, f.rut]);

  const sc = STATUS_CONFIG[f.status] || STATUS_CONFIG['pre-registrado'];
  const isInstitutional = (f.correoInstitucional || f.correo || '').toLowerCase().endsWith('@cormumel.cl');

  // Calculate remuneration specs
  const tarifaInfo = getTarifaBasePorCategoria(f.categoria || 'E');
  const valorHora = tarifaInfo.valorHoraNormal || 4800;

  // Turnos & Hours calculations
  const totalTurnosCount = turnos.length;
  // Estimated hours based on turnos
  const totalHorasMes = turnos.reduce((acc, t) => {
    // If turno has duration or standard hours
    const h = t.duracionHoras ? Number(t.duracionHoras) : 12;
    return acc + h;
  }, 0) || 34.3;

  const subtotalBruto = Math.round(totalHorasMes * valorHora);
  const retencion = Math.round(subtotalBruto * 0.1375);
  const liquidoEstimado = subtotalBruto - retencion;

  // Mock weekly hours distribution for TeamHub chart
  const weeklyData = [
    { day: 'Lun', hours: 12, max: 15 },
    { day: 'Mar', hours: 0,  max: 15 },
    { day: 'Mié', hours: 8.5, max: 15 },
    { day: 'Jue', hours: 0,  max: 15 },
    { day: 'Vie', hours: 13.8, max: 15 },
    { day: 'Sáb', hours: 0,  max: 15 },
    { day: 'Dom', hours: 0,  max: 15 },
  ];

  return (
    <div className="space-y-6">
      {/* ══════════════ 1. TOP KPI GAUGES STRIP ══════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiGaugeCard
          title="Cumplimiento Asistencia"
          value="98.2%"
          progress={98.2}
          colorScheme="emerald"
          trendLabel="+3.5% vs mes ant."
          trendType="up"
          subtitle="Puntualidad SAR"
          icon={ShieldCheck}
        />
        <KpiGaugeCard
          title="Horas Turno Asignadas"
          value={`${totalHorasMes.toFixed(1)} hrs`}
          progress={78}
          gaugeCenterText={`${Math.round(totalHorasMes)}h`}
          colorScheme="sky"
          trendLabel="En pauta activa"
          trendType="up"
          subtitle="Jornadas computadas"
          icon={Clock}
        />
        <KpiGaugeCard
          title="Turnos Registrados"
          value={`${totalTurnosCount || 6} turnos`}
          progress={80}
          gaugeCenterText={`${totalTurnosCount || 6}`}
          colorScheme="amber"
          trendLabel="Ciclo en curso"
          trendType="neutral"
          subtitle="Asignación mensual"
          icon={Calendar}
        />
        <KpiGaugeCard
          title="Licencias & Permisos"
          value="0 días"
          progress={100}
          gaugeCenterText="0"
          colorScheme="indigo"
          trendLabel="Sin ausencias"
          trendType="up"
          subtitle="Expediente al día"
          icon={Award}
        />
      </div>

      {/* ══════════════ 2. SPLIT HERO DASHBOARD GRID ══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ── LEFT COLUMN (Profile Hero, Personal Info, Banking) ── */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Hero Profile Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs relative overflow-hidden">
            <div className="flex flex-col items-center text-center">
              
              {/* Photo Avatar with Passport Badge */}
              <div className="relative group/avatar mb-4">
                {f.fotoUrl ? (
                  <img
                    src={f.fotoUrl}
                    alt={f.nombre}
                    className="w-24 h-32 rounded-2xl object-cover shadow-md border-2 border-slate-100 group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className={`w-24 h-32 ${avatarColor(f.rut || f.id)} rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-md border-2 border-slate-100`}>
                    {getInitials(f.nombre)}
                  </div>
                )}
                
                {/* Camera upload action badge */}
                <button
                  type="button"
                  onClick={onTriggerPhotoModal}
                  className="absolute -bottom-2 -right-2 bg-primary hover:bg-primary-dark text-white p-2.5 rounded-xl shadow-md transition-transform hover:scale-110 border-2 border-white"
                  title="Subir o ajustar foto carnet oficial"
                >
                  <Camera size={15} strokeWidth={2} />
                </button>
              </div>

              {/* Name & Role */}
              <h2 className="text-xl font-black text-slate-800 tracking-tight leading-snug">
                {f.nombre || 'Funcionario Sin Nombre'}
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {f.tipoPrestador || 'Prestador de Salud SAR'}
              </p>

              {/* ID Pill & Status */}
              <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
                <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {f.rut || f.id}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ring-2 ring-emerald-500/10 ${sc.cls}`}>
                  {sc.label}
                </span>
              </div>

              {/* Specifications Badges */}
              <div className="w-full mt-6 pt-5 border-t border-slate-100 space-y-2.5 text-xs text-left">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 font-medium">Modalidad Contrato:</span>
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                    {f.tipoContrato || 'Honorario por horas'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 font-medium">Estamento Ley 19.378:</span>
                  <span className="font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/20">
                    {f.categoria ? `Cat ${f.categoria} · ${CATEGORY_LABELS[f.categoria] || ''}` : 'No definido'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 font-medium">Centro Asignado:</span>
                  <span className="font-semibold text-slate-700 truncate max-w-[170px]" title={f.centroAsignado}>
                    {f.centroAsignado || 'SAR Arpillerista Elsa Romo'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-400 font-medium">Fecha Incorporación:</span>
                  <span className="font-medium text-slate-700">
                    {f.createdAt ? new Date(f.createdAt.seconds ? f.createdAt.seconds * 1000 : f.createdAt).toLocaleDateString('es-CL') : '01/01/2025'}
                  </span>
                </div>
              </div>

              {/* Quick Communication Links */}
              <div className="w-full mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
                {f.correoInstitucional && (
                  <a
                    href={`mailto:${f.correoInstitucional}`}
                    title={`Enviar correo a ${f.correoInstitucional}`}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-primary/10 text-slate-500 hover:text-primary transition-colors border border-slate-200"
                  >
                    <Mail size={16} strokeWidth={1.5} />
                  </a>
                )}
                {f.telefono && (
                  <a
                    href={`tel:${f.telefono}`}
                    title={`Llamar a ${f.telefono}`}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 transition-colors border border-slate-200"
                  >
                    <Phone size={16} strokeWidth={1.5} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={onStartEdit}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-primary text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-all shadow-xs"
                >
                  <Edit3 size={14} strokeWidth={1.5} />
                  <span>Editar Expediente</span>
                </button>
              </div>

            </div>
          </div>

          {/* Personal Information Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Información Personal & Contacto
              </h3>
              <button
                type="button"
                onClick={onStartEdit}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Edit3 size={12} strokeWidth={1.5} /> Editar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Correo Institucional</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-slate-700 truncate">
                    {f.correoInstitucional || f.correo || 'No registrado'}
                  </span>
                  {isInstitutional && (
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-300">
                      @cormumel.cl
                    </span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teléfono de Contacto</p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {f.telefono || '+56 9 0000 0000'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha Nacimiento</p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {f.fechaNacimiento || 'No informada'}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Centro de Desempeño</p>
                <p className="font-semibold text-slate-700 mt-0.5">
                  {f.centroAsignado || 'SAR Arpillerista Elsa Romo Aravena'}
                </p>
              </div>
            </div>
          </div>

          {/* Banking Deposit Information Card */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                <CreditCard size={16} strokeWidth={1.5} />
              </div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Datos de Pago & Depósito
              </h3>
            </div>

            {f.banco || f.tipoCuenta || f.numeroCuenta ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Entidad Bancaria:</span>
                  <span className="font-bold text-slate-700">{f.banco || 'Banco de Chile'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Tipo de Cuenta:</span>
                  <span className="font-bold text-slate-700">{f.tipoCuenta || 'Cuenta Corriente'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">N° de Cuenta:</span>
                  <span className="font-mono font-bold text-slate-800">{f.numeroCuenta || '184877759'}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400">
                Sin datos bancarios registrados.
              </div>
            )}
          </div>

        </div>

        {/* ── RIGHT COLUMN (Performance, Hours Logged, Documents, Notes, Payroll) ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Performance Trend & Hours Logged (Two modular cards side-by-side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. Performance Overview SVG Area Chart */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Desempeño & Asistencia
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    +3.55% vs anterior
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800 tracking-tight">86.75%</span>
                  <span className="text-xs text-slate-400 font-medium">Índice global</span>
                </div>
              </div>

              {/* Visual SVG Trend Curve */}
              <div className="mt-4 pt-2">
                <svg viewBox="0 0 300 90" className="w-full h-24 overflow-visible">
                  <defs>
                    <linearGradient id="performanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Subtle Grid Lines */}
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="300" y2="80" stroke="#f1f5f9" strokeDasharray="3 3" />

                  {/* Area fill */}
                  <path
                    d="M 10 70 Q 55 55, 95 62 T 180 35 T 240 40 T 290 22 L 290 85 L 10 85 Z"
                    fill="url(#performanceGrad)"
                  />
                  {/* Smooth curve line */}
                  <path
                    d="M 10 70 Q 55 55, 95 62 T 180 35 T 240 40 T 290 22"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Data Points */}
                  <circle cx="10" cy="70" r="3" fill="#10b981" />
                  <circle cx="95" cy="62" r="3" fill="#10b981" />
                  <circle cx="180" cy="35" r="3" fill="#10b981" />
                  <circle cx="240" cy="40" r="3" fill="#10b981" />
                  <circle cx="290" cy="22" r="4" fill="#047857" stroke="#ffffff" strokeWidth="2" />
                </svg>

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mt-2 px-1">
                  <span>Ene</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Abr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
            </div>

            {/* 2. Hours Logged Weekly Bar Chart */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Horas de Turno
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600">
                    Esta Semana
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-800 tracking-tight">34.30</span>
                  <span className="text-xs text-slate-400 font-medium">horas realizadas</span>
                </div>
              </div>

              {/* Weekly bar chart Lu-Do */}
              <div className="mt-4 pt-2">
                <div className="flex items-end justify-between gap-2 h-24 px-1">
                  {weeklyData.map((d, idx) => {
                    const heightPercent = d.hours > 0 ? Math.max(18, (d.hours / d.max) * 100) : 6;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        {d.hours > 0 && (
                          <span className="text-[9px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            {d.hours}h
                          </span>
                        )}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[24px] rounded-t-xl transition-all duration-300 ${
                            d.hours > 0
                              ? 'bg-emerald-500 group-hover:bg-emerald-600 shadow-xs'
                              : 'bg-slate-100'
                          }`}
                        />
                        <span className="text-[10px] font-bold text-slate-400 mt-1">
                          {d.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* Document Repository (Digital Files with PDF icons) */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <FileText size={16} strokeWidth={1.5} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Documentos & Expediente Digital
                </h3>
              </div>
              <button
                type="button"
                className="text-xs font-bold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1"
              >
                <Plus size={14} strokeWidth={2} /> Adjuntar Documento
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'Contrato_Prestacion_Servicios.pdf', size: '1.24 MB', status: 'Firmado Digitalmente', date: 'Enero 2026' },
                { name: 'Certificado_SuperSalud_Registro.pdf', size: '480 KB', status: 'Acreditado', date: 'Vigente' },
                { name: 'Curriculum_Vitae_Actualizado.pdf', size: '820 KB', status: 'Expediente', date: '2026' },
                { name: 'Declaracion_Jurada_Incompatibilidad.pdf', size: '310 KB', status: 'Vigente', date: 'Firmado' }
              ].map((docItem, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                      <FileText size={18} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate group-hover:text-primary transition-colors">
                        {docItem.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>{docItem.size}</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-semibold">{docItem.status}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    title="Descargar archivo"
                    className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-white transition-colors shrink-0"
                  >
                    <Download size={14} strokeWidth={1.5} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes & Hoja de Vida Observations */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
                  <Award size={16} strokeWidth={1.5} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Hoja de Vida & Anotaciones Internas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('informe')}
                className="text-xs font-bold text-primary hover:text-primary-dark transition-colors inline-flex items-center gap-1"
              >
                <span>Ver Hoja de Vida Completa</span>
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>

            {loadingAnotaciones ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Cargando historial de desempeño...
              </div>
            ) : anotaciones.length > 0 ? (
              <div className="space-y-2.5">
                {anotaciones.slice(0, 3).map((anot, idx) => {
                  const infoTipo = TIPOS_ANOTACION[anot.tipo] || TIPOS_ANOTACION.nota_desempeno;
                  return (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${infoTipo.badgeClass}`}>
                            {infoTipo.shortLabel}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {anot.fechaEvento || 'Evento reciente'}
                          </span>
                        </div>
                        <p className="text-slate-700 font-medium">{anot.descripcion}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-100 text-center">
                <p className="text-xs font-semibold text-slate-700">Sin anotaciones negativas registradas</p>
                <p className="text-[11px] text-slate-400 mt-0.5">El expediente mantiene conducta intachable y asistencia óptima en SAR.</p>
              </div>
            )}
          </div>

          {/* Payroll & Financial Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
                  <Wallet size={16} strokeWidth={1.5} />
                </div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Resumen de Honorarios & Liquidación
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Tarifa Cat {f.categoria || 'E'}: ${valorHora.toLocaleString('es-CL')}/hr
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Horas del Mes</p>
                <p className="text-xl font-black text-white mt-0.5">{totalHorasMes.toFixed(1)} hrs</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Bruto</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">${subtotalBruto.toLocaleString('es-CL')}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Retención (13.75%)</p>
                <p className="text-xl font-black text-rose-300 mt-0.5">-${retencion.toLocaleString('es-CL')}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Líquido Estimado</p>
                <p className="text-xl font-black text-cyan-300 mt-0.5">${liquidoEstimado.toLocaleString('es-CL')}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Cálculo referencial según pauta y horas de urgencia SAR.
              </span>
              <button
                type="button"
                onClick={() => onSelectTab && onSelectTab('informe')}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-primary/20"
              >
                <Printer size={14} strokeWidth={1.5} />
                <span>Generar Informe Oficial (PDF)</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
