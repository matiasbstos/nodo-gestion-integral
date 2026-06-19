import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Calendar,
  Filter,
  DollarSign,
  UserX,
  PlusCircle,
  MoreVertical,
  ChevronRight,
  Activity,
  Bell,
  MapPin,
  Loader2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

const GlobalDashboardView = () => {
  const [loading, setLoading] = useState(true);
  const [gpsActivo, setGpsActivo] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState([
    { label: 'Gasto Mensual Valorizado', value: '...', change: '0%', trendingUp: true, icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Tasa de Ausentismo', value: '...', change: '0%', trendingUp: false, icon: UserX, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: 'Alertas de Retrasos', value: '...', subtext: 'incidentes este mes', change: '+0', trendingUp: true, icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { label: 'Horas Adicionales', value: '...', change: '0%', trendingUp: true, icon: PlusCircle, color: 'text-success', bgColor: 'bg-success/10' }
  ]);

  const [shifts, setShifts] = useState({ current: [], upcoming: [] });
  const [alerts, setAlerts] = useState([]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Current Shifts
        const qCurrent = query(collection(db, 'turnos'), where('estado', '==', 'activo'), limit(10));
        const snapCurrent = await getDocs(qCurrent);
        const currentData = snapCurrent.docs.map(d => ({ id: d.id, ...d.data() }));

        // Fetch Upcoming Shifts
        const todayStr = new Date().toISOString().split('T')[0];
        const qUpcoming = query(collection(db, 'turnos'), where('inicio', '>', todayStr + 'T23:59:59'), limit(10));
        const snapUpcoming = await getDocs(qUpcoming);
        const upcomingData = snapUpcoming.docs.map(d => ({ id: d.id, ...d.data() }));

        setShifts({ current: currentData, upcoming: upcomingData });

        // Fetch Alerts
        const qAlerts = query(collection(db, 'alertas'), orderBy('timestamp', 'desc'), limit(5));
        const snapAlerts = await getDocs(qAlerts);
        setAlerts(snapAlerts.docs.map(d => ({ id: d.id, ...d.data() })));

        // KPI Fallbacks
        setStats(prev => prev.map(s => ({ ...s, value: s.label.includes('Gasto') ? '$0' : '0' })));

      } catch (err) {
        console.warn("Global Dashboard Fetch Error (Graceful Degradation):", err.message);
      } finally {
        setLoading(false);
      }
    };

    const checkGps = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        () => setGpsActivo(true),
        () => setGpsActivo(false)
      );
    };

    fetchData();
    checkGps();
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[#F8FAFC]">
      {/* 1. Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">Dashboard Consolidado</h1>
          <p className="text-gray-500 mt-1">Inteligencia operacional y financiera de la red asistencial.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Calendar size={18} className="text-primary" />
            <select className="bg-transparent border-none text-sm font-bold text-secondary focus:ring-0 cursor-pointer">
              <option>Octubre 2026</option>
              <option>Septiembre 2026</option>
              <option>Agosto 2026</option>
            </select>
          </div>
          
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Filtrar por funcionario..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border-gray-100 rounded-2xl py-2.5 pl-12 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-primary/20 w-64 transition-all"
            />
          </div>
          
          <button className="bg-[#1E293B] text-white p-2.5 rounded-2xl shadow-lg shadow-secondary/20 hover:bg-secondary-dark transition-all">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* 2. KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 group hover:shadow-md transition-all duration-300">
            <div className="flex items-start justify-between">
              <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${stat.trendingUp ? 'text-success bg-success/10' : 'text-error bg-error/10'}`}>
                {stat.change}
                {stat.trendingUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
            </div>
            <div className="mt-6">
              <p className="text-3xl font-bold text-[#1E293B] tracking-tight">{stat.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{stat.label}</p>
                {stat.subtext && <span className="text-[10px] text-amber-500 font-bold">{stat.subtext}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Operational Monitor */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Turnos Operativos */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-xl text-primary">
                <Activity size={20} />
              </div>
              <h2 className="font-bold text-[#1E293B]">Turnos Operativos</h2>
            </div>
            <div className="flex bg-tertiary p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('current')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'current' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-secondary'}`}
              >
                En curso
              </button>
              <button 
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'upcoming' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-secondary'}`}
              >
                Próximos
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-0">
            <div className="divide-y divide-gray-50">
              {shifts[activeTab].length > 0 ? (
                shifts[activeTab].map((shift) => (
                  <div key={shift.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary text-white flex items-center justify-center font-bold text-xs">
                        {(shift.name || shift.funcionarioNombre || 'U').split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-secondary group-hover:text-primary transition-colors">{shift.name || shift.funcionarioNombre}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <MapPin size={12} className="text-gray-400" />
                          <p className="text-[11px] text-gray-400">{shift.location || shift.centroSalud}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-xs font-bold text-secondary">
                          {shift.time || `${shift.inicio?.split('T')[1]?.substring(0, 5)} - ${shift.termino?.split('T')[1]?.substring(0, 5)}`}
                        </p>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          shift.status === 'En curso' || shift.estado === 'activo' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                        }`}>
                          {shift.status || (shift.estado === 'activo' ? 'En curso' : 'Programado')}
                        </span>
                      </div>
                      <button className="p-2 text-gray-300 hover:text-secondary">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-400 italic text-sm">
                  No hay turnos operativos en este momento.
                </div>
              )}
            </div>
          </div>
          <button className="p-4 text-xs font-bold text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2 border-t border-gray-50">
            Ver Monitor de Red Completo <ChevronRight size={14} />
          </button>
        </div>

        {/* Centro de Alertas */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/10 p-2 rounded-xl text-amber-500">
                <Bell size={20} />
              </div>
              <h2 className="font-bold text-[#1E293B]">Centro de Alertas Críticas</h2>
            </div>
            <span className="bg-error/10 text-error text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {alerts.length} nuevas
            </span>
          </div>

          <div className="flex-1 divide-y divide-gray-50">
            {alerts.length > 0 ? (
              alerts.map((alert) => (
                <div key={alert.id} className="p-6 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    alert.priority === 'critical' ? 'bg-error animate-pulse' : 'bg-warning'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-secondary">{alert.user}</p>
                      <span className="text-[10px] text-gray-400 font-medium">{alert.time || 'Reciente'}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{alert.msg}</p>
                    <div className="flex gap-2 mt-3">
                      <button className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline">Contactar</button>
                      <button className="text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-secondary">Ignorar</button>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase ${
                    alert.type === 'delay' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {alert.type === 'delay' ? 'Retraso' : 'Ausencia'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-400 italic text-sm">
                No hay alertas recientes en el sistema.
              </div>
            )}
          </div>
          <button className="p-4 text-xs font-bold text-gray-400 hover:text-secondary hover:bg-gray-50 transition-all border-t border-gray-50">
            Limpiar Notificaciones
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalDashboardView;
