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
  FileText,
  Upload,
  UserPlus,
  Navigation,
  CheckCircle2,
  FileUp,
  Download,
  Eye,
  Eye,
  Settings,
  Loader2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

const AdminGlobalDashboard = ({ userData }) => {
  const [loading, setLoading] = useState(true);
  const [gpsActivo, setGpsActivo] = useState(false);
  const [activeShiftTab, setActiveShiftTab] = useState('current');
  const [searchQuery, setSearchQuery] = useState('');

  const [kpis, setKpis] = useState([
    { label: 'Gasto Mensual Valorizado', value: '...', change: '0%', icon: DollarSign, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'Tasa de Ausentismo', value: '...', change: '0%', icon: UserX, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: 'Alertas de Retrasos', value: '...', subtext: 'este mes', icon: AlertTriangle, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    { label: 'Tiempo Adicional', value: '...', change: '0%', icon: PlusCircle, color: 'text-success', bgColor: 'bg-success/10' }
  ]);

  const [alerts, setAlerts] = useState([]);
  const [operativos, setOperativos] = useState([]);
  const [reportsStatus, setReportsStatus] = useState([]);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch Alerts
        const qAlerts = query(collection(db, 'alertas'), orderBy('timestamp', 'desc'), limit(5));
        const snapAlerts = await getDocs(qAlerts);
        setAlerts(snapAlerts.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Operational Shifts
        const qTurnos = query(collection(db, 'turnos'), where('estado', '==', 'activo'), limit(10));
        const snapTurnos = await getDocs(qTurnos);
        setOperativos(snapTurnos.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Reports
        const qReports = query(collection(db, 'informes'), orderBy('fechaGeneracion', 'desc'), limit(5));
        const snapReports = await getDocs(qReports);
        setReportsStatus(snapReports.docs.map(d => ({ id: d.id, ...d.data() })));

        // Reset KPIs to zero/defaults
        setKpis(prev => prev.map(k => ({ ...k, value: k.label.includes('Gasto') ? '$0' : '0' })));

      } catch (err) {
        console.warn("Global Dashboard Fetch Error:", err.message);
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
    <div className="p-8 max-w-[1600px] mx-auto space-y-12 animate-fade-in bg-[#F8FAFC]">
      
      {/* SECCIÓN 1: Analítica, Estadísticas y Alertas */}
      <section className="space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">Panel de Control Maestro</h1>
            <p className="text-gray-500 mt-1">Visión consolidada de la red asistencial y financiera.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
              <Calendar size={18} className="text-primary" />
              <select className="bg-transparent border-none text-sm font-bold text-secondary focus:ring-0">
                <option>Abril 2026</option>
                <option>Mayo 2026</option>
              </select>
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

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-50 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className={`p-4 rounded-2xl ${kpi.bgColor} ${kpi.color}`}>
                  <kpi.icon size={24} />
                </div>
                {kpi.change && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${kpi.change.startsWith('+') ? 'text-success bg-success/10' : 'text-warning bg-warning/10'}`}>
                    {kpi.change}
                  </span>
                )}
              </div>
              <div className="mt-6">
                <p className="text-3xl font-bold text-[#1E293B] tracking-tight">{kpi.value}</p>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{kpi.label} {kpi.subtext && <span className="text-amber-500">({kpi.subtext})</span>}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Monitor Consolidado */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-50 overflow-hidden flex flex-col min-h-[400px]">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-bold text-[#1E293B] flex items-center gap-2">
                <Activity size={20} className="text-primary" />
                Gestión de Turnos
              </h2>
              <div className="flex bg-tertiary p-1 rounded-xl">
                {['current', 'upcoming'].map(tab => (
                  <button 
                    key={tab}
                    onClick={() => setActiveShiftTab(tab)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeShiftTab === tab ? 'bg-white text-primary shadow-sm' : 'text-gray-400'}`}
                  >
                    {tab === 'current' ? 'En curso' : 'Próximos'}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-0 flex-1">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Funcionario</th>
                    <th className="px-6 py-4">Ubicación</th>
                    <th className="px-6 py-4">Horario</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {operativos.length > 0 ? (
                    operativos.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-secondary">{f.funcionarioNombre || 'Funcionario'}</td>
                        <td className="px-6 py-4 text-gray-500">{f.centroSalud}</td>
                        <td className="px-6 py-4 text-gray-500">
                          {f.inicio?.split('T')[1]?.substring(0, 5)} - {f.termino?.split('T')[1]?.substring(0, 5)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-success/10 text-success text-[10px] font-bold px-2 py-1 rounded-full uppercase">Activo</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">
                        No hay turnos operativos en este momento.
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
                Centro de Alertas
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
                    <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Gestionar</button>
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
      </section>

      {/* SECCIÓN 2: Gestión Operativa (Turnos y GPS) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generador de Turnos */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50 space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <UserPlus size={20} />
            </div>
            <h2 className="font-bold text-[#1E293B]">Asignación de Turnos</h2>
          </div>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Funcionario</label>
              <select className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20">
                <option>Seleccionar funcionario...</option>
                <option>Dr. Roberto Sánchez</option>
                <option>Enf. María Jose</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Inicio de Turno</label>
              <input type="datetime-local" className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Fin de Turno</label>
              <input type="datetime-local" className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20" />
            </div>
            <button type="button" className="col-span-2 btn-primary py-4 text-sm font-bold uppercase tracking-widest">
              Asignar Turno Operativo
            </button>
          </form>
        </div>

        {/* Configuración GPS SAR */}
        <div className="bg-[#1E293B] p-8 rounded-3xl shadow-xl text-white space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="bg-primary/20 p-2 rounded-xl text-primary">
              <Navigation size={20} />
            </div>
            <h2 className="font-bold">Ubicación GPS Estratégica (SAR)</h2>
          </div>
          <div className="space-y-4 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">Latitud Actual</p>
                <p className="font-mono text-sm font-bold">-32.946123</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                <p className="text-[10px] text-primary font-bold uppercase tracking-widest mb-1">Longitud Actual</p>
                <p className="font-mono text-sm font-bold">-71.548456</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-primary/10 p-4 rounded-2xl border border-primary/20">
              <Settings size={20} className="text-primary shrink-0" />
              <p className="text-xs text-primary-light leading-relaxed">
                El radio de validación biométrica de <span className="font-bold underline">50m</span> se basará en estas coordenadas para todos los marcajes de entrada y salida.
              </p>
            </div>
            <button className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20">
              Actualizar Ubicación GPS
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN 3: Honorarios y Gestión de Informes PDF */}
      <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-50 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-success/10 p-2 rounded-xl text-success">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="font-bold text-[#1E293B]">Honorarios y Trazabilidad Mensual</h2>
              <p className="text-xs text-gray-400 mt-0.5">Auditoría y cierre administrativo de informes.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-3 bg-tertiary hover:bg-gray-100 text-[#1E293B] text-xs font-bold rounded-2xl border border-gray-100 transition-all">
              <FileUp size={18} />
              Cargar Matriz PDF
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary-dark text-white text-xs font-bold rounded-2xl shadow-lg shadow-secondary/10 transition-all">
              <CheckCircle2 size={18} className="text-primary" />
              Subir Firma Digital
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 flex flex-col items-center justify-center p-8 bg-tertiary rounded-3xl border border-gray-100 text-center">
            <div className="relative w-32 h-32 flex items-center justify-center mb-4">
              <svg className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-200" />
                <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-primary" strokeDasharray="364.4" strokeDashoffset="242.9" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-secondary">15/45</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase">Listos</span>
              </div>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Informes Generados</p>
          </div>

          <div className="lg:col-span-3 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Buscar por funcionario o RUT..." className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20" />
            </div>
            
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Funcionario</th>
                    <th className="px-6 py-4">Monto Honorario</th>
                    <th className="px-6 py-4">Fecha Cierre</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reportsStatus.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-secondary">{row.name}</td>
                      <td className="px-6 py-4 text-gray-500">{row.amount}</td>
                      <td className="px-6 py-4 text-gray-500">{row.date}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${row.status === 'Generado' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all">
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminGlobalDashboard;
