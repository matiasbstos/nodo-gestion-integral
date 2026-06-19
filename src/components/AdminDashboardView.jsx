import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  UserX, 
  AlertTriangle, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Calendar,
  Search,
  Bell,
  MoreVertical,
  ChevronRight,
  MapPin,
  Loader2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

const AdminDashboardView = () => {
  const [loading, setLoading] = useState(true);
  const [gpsActivo, setGpsActivo] = useState(false);
  const [activeShiftTab, setActiveShiftTab] = useState('current');
  
  const [kpis, setKpis] = useState([
    { label: 'Gasto Mensual Valorizado', value: '...', change: '0%', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Tasa de Ausentismo', value: '...', change: '0%', icon: UserX, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: 'Alertas de Retrasos', value: '...', subtext: 'este mes', icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { label: 'Tiempo Adicional', value: '...', change: '0%', icon: PlusCircle, color: 'text-success', bgColor: 'bg-success/10' }
  ]);

  const [operativos, setOperativos] = useState([]);
  const [alerts, setAlerts] = useState([]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { Timestamp } = await import('firebase/firestore');
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // MÓDULO 3: Nueva Query Simplificada para Dashboard
        const qTurnos = query(
          collection(db, 'turnos'), 
          where('fechaInicio', '>=', Timestamp.fromDate(startOfToday)),
          orderBy('fechaInicio', 'asc')
        );
        
        const snapTurnos = await getDocs(qTurnos);
        const allFutureTurns = snapTurnos.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          // Convertir Timestamps a Date para facilitar el filtrado
          inicioJS: d.data().fechaInicio?.toDate(),
          terminoJS: d.data().fechaFin?.toDate()
        }));

        // Filtrado Frontend para HOY y PRÓXIMOS 7 DÍAS
        const endOfWeek = new Date(startOfToday);
        endOfWeek.setDate(startOfToday.getDate() + 7);

        const filtered = allFutureTurns.filter(turn => {
          const isRelevantStatus = ['pendiente', 'programado', 'en_curso'].includes(turn.estado);
          const isWithinWeek = turn.inicioJS >= startOfToday && turn.inicioJS <= endOfWeek;
          return isRelevantStatus && isWithinWeek;
        });

        setOperativos(filtered);

        // Fetch Alerts
        const qAlerts = query(collection(db, 'alertas'), orderBy('timestamp', 'desc'), limit(5));
        const snapAlerts = await getDocs(qAlerts);
        setAlerts(snapAlerts.docs.map(d => ({ id: d.id, ...d.data() })));

        // KPI Fallbacks
        setKpis(prev => prev.map(k => ({ ...k, value: k.label.includes('Gasto') ? '$0' : '0' })));

      } catch (err) {
        console.warn("Dashboard Fetch Error:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[#F8FAFC]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">Dashboard de Operaciones</h1>
          <p className="text-gray-500 mt-1">Vista semanal de turnos y cumplimiento de red.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <Calendar size={18} className="text-primary" />
            <span className="text-sm font-bold text-secondary">Semana Actual</span>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar funcionario..." 
              className="bg-white border-gray-100 rounded-2xl py-2.5 pl-12 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-primary/20 w-64"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className={`p-4 rounded-2xl ${kpi.bgColor} ${kpi.color}`}>
                <kpi.icon size={24} />
              </div>
              {kpi.change && (
                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${(kpi.change || '').startsWith('+') ? 'text-success bg-success/10' : 'text-warning bg-warning/10'}`}>
                  {kpi.change}
                </span>
              )}
            </div>
            <div className="mt-6">
              <p className="text-3xl font-bold text-[#1E293B] tracking-tight">{kpi.value}</p>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-[#1E293B] flex items-center gap-2">
              <Activity size={20} className="text-primary" />
              Turnos de la Semana
            </h2>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest sticky top-0">
                <tr>
                  <th className="px-6 py-4">Funcionario</th>
                  <th className="px-6 py-4">Centro</th>
                  <th className="px-6 py-4">Horario</th>
                  <th className="px-6 py-4">Prioridad</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
               <tbody className="divide-y divide-gray-50">
                {operativos.length > 0 ? (
                  operativos.map(turn => {
                    const isToday = turn.inicioJS?.toDateString() === new Date().toDateString();
                    return (
                      <tr key={turn.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-bold text-secondary">{turn.nombreFuncionario || 'Funcionario'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">{turn.rutFuncionario}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-500 font-medium">{turn.centroAsignacion}</td>
                        <td className="px-6 py-4 text-gray-500">
                          <p className="text-xs font-bold">{turn.inicioJS?.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' })}</p>
                          <p className="text-[10px]">{turn.inicioJS?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {turn.terminoJS?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="px-6 py-4">
                          {isToday ? (
                            <span className="bg-error/10 text-error text-[10px] font-black px-2 py-1 rounded-md uppercase animate-pulse">HOY</span>
                          ) : (
                            <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-md uppercase">PRÓXIMO</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                            turn.estado === 'pendiente' ? 'bg-amber-100 text-amber-600' :
                            turn.estado === 'programado' ? 'bg-success/10 text-success' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {turn.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                      No hay turnos programados para esta semana.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-[#1E293B] flex items-center gap-2">
              <Bell size={20} className="text-amber-500" />
              Alertas del Sistema
            </h2>
          </div>
           <div className="divide-y divide-gray-50 flex-1">
            {alerts.length > 0 ? (
              alerts.map(alert => (
                <div key={alert.id} className="p-6 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${alert.priority === 'critical' ? 'bg-error animate-pulse' : 'bg-warning'}`}></div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <p className="text-sm font-bold text-secondary">{alert.user}</p>
                      <span className="text-[10px] text-gray-400">{alert.time || 'Reciente'}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{alert.msg}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-400 italic text-sm">
                No hay alertas recientes en el sistema.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardView;
