import React from 'react';
import { 
  Users, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  MapPin,
  UserPlus,
  Settings2,
  Navigation,
  X,
  Send,
  Loader2,
  Mail
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const Dashboard = ({ userData }) => {
  const [showShiftModal, setShowShiftModal] = React.useState(false);
  const [showParamsModal, setShowParamsModal] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [centerParams, setCenterParams] = React.useState({
    address: 'Av. Borgoño 25000, Concón',
    lat: -32.946,
    lng: -71.548,
    supportEmail: 'soporte@cormumel.cl'
  });

  const [newShift, setNewShift] = React.useState({
    official: '',
    date: '',
    start: '08:00',
    end: '17:00',
    location: 'SAR Concón'
  });

  const stats = [
    { label: 'Funcionarios Activos', value: '42', change: '+5%', trendingUp: true, icon: Users, color: 'primary' },
    { label: 'Turnos en Curso', value: '18', change: '85%', trendingUp: true, icon: Clock, color: 'success' },
    { label: 'Alertas de Retraso', value: '03', change: '-2', trendingUp: false, icon: AlertTriangle, color: 'error' },
    { label: 'Ausencias Hoy', value: '02', change: '+1', trendingUp: true, icon: XCircle, color: 'warning' },
  ];

  const alerts = [
    { id: 1, user: 'Dr. Roberto Sánchez', type: 'Retraso', time: '15 min', status: 'critical', location: 'SAR Concón' },
    { id: 2, user: 'Enf. María Jose', type: 'Ausencia', time: 'Turno Mañana', status: 'warning', location: 'SAPU Reñaca' },
    { id: 3, user: 'TENS Pedro Picapiedra', type: 'Fuera de Rango', time: 'Actual', status: 'info', location: 'Hospital Gustavo Fricke' },
  ];

  const officials = [
    { id: '1', name: 'Dr. Roberto Sánchez' },
    { id: '2', name: 'Enf. María José' },
    { id: '3', name: 'TENS Pedro Picapiedra' }
  ];

  const handleUpdateParams = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!centerParams.supportEmail.endsWith('@cormumel.cl')) {
        alert('El correo de soporte debe pertenecer al dominio @cormumel.cl');
        setLoading(false);
        return;
      }
      await setDoc(doc(db, 'configuracion', 'ubicacion_central'), {
        lat: parseFloat(centerParams.lat),
        lng: parseFloat(centerParams.lng),
        address: centerParams.address,
        supportEmail: centerParams.supportEmail
      });
      alert('Parámetros globales actualizados correctamente.');
      setShowParamsModal(false);
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendShift = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      alert(`Turno enviado a ${newShift.official}. Aparecerá en su bandeja de entrada.`);
      setShowShiftModal(false);
      setLoading(false);
    }, 1500);
  };


  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Panel de Control Global</h1>
          <p className="text-gray-500 mt-1">Supervisión en tiempo real de la red asistencial.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar funcionario..." 
              className="bg-white border-none rounded-2xl py-3 pl-10 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-primary/20 w-64 transition-all"
            />
          </div>
          <button className="bg-white p-3 rounded-2xl shadow-sm text-gray-400 hover:text-secondary transition-colors">
            <Filter size={20} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="card p-6 border-none shadow-sm group hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-2xl bg-${stat.color}/10 text-${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.trendingUp ? 'text-success' : 'text-error'}`}>
                {stat.change}
                {stat.trendingUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-secondary">{stat.value}</p>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-hidden border-none shadow-sm">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white">
              <h2 className="font-bold text-secondary flex items-center gap-2">
                <AlertTriangle size={18} className="text-warning" />
                Alertas Críticas
              </h2>
              <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Ver todas</button>
            </div>
            <div className="divide-y divide-gray-50 bg-white">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-secondary font-bold text-xs">
                      {alert.user.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-secondary group-hover:text-primary transition-colors">{alert.user}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <MapPin size={12} className="text-gray-400" />
                        <p className="text-[11px] text-gray-400">{alert.location}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${
                        alert.status === 'critical' ? 'text-error' : alert.status === 'warning' ? 'text-warning' : 'text-primary'
                      }`}>{alert.type}</p>
                      <p className="text-xs font-bold text-secondary mt-0.5">{alert.time}</p>
                    </div>
                    <button className="p-2 text-gray-300 hover:text-secondary">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map Placeholder or Activity Feed */}
          <div className="card p-8 bg-secondary text-white relative overflow-hidden h-[300px] border-none shadow-lg">
             <div className="absolute inset-0 opacity-10">
                <div className="absolute top-10 left-10 w-4 h-4 bg-primary rounded-full animate-ping"></div>
                <div className="absolute bottom-20 right-40 w-4 h-4 bg-success rounded-full animate-ping"></div>
                <div className="absolute top-40 right-20 w-4 h-4 bg-error rounded-full animate-ping"></div>
             </div>
             <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-bold">Mapa de Cobertura</h2>
                  <p className="text-sm text-gray-400 mt-1">Ubicación en tiempo real de los nodos activos.</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">8 Centros Activos</p>
                        <p className="text-[10px] text-gray-400">Región de Valparaíso</p>
                      </div>
                   </div>
                   <button className="text-xs font-bold text-primary hover:text-white transition-colors">Abrir Mapa Completo</button>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column - Quick Actions & Metrics */}
        <div className="space-y-8">
          <div className="card p-6 border-none shadow-sm">
            <h2 className="font-bold text-secondary mb-6">Acciones Rápidas</h2>
            <div className="space-y-3">
              <button 
                onClick={() => alert('Generando reporte...')}
                className="w-full py-4 bg-primary/5 hover:bg-primary/10 text-primary rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-primary/10"
              >
                Generar Reporte Consolidado
              </button>
              <button 
                onClick={() => setShowShiftModal(true)}
                className="w-full py-4 bg-secondary text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-secondary-dark transition-all flex items-center justify-center gap-2"
              >
                <UserPlus size={16} />
                Asignar Turno Manual
              </button>
              <button 
                onClick={() => setShowParamsModal(true)}
                className="w-full py-4 bg-white border border-gray-100 text-gray-400 rounded-2xl text-xs font-bold uppercase tracking-widest hover:border-secondary hover:text-secondary transition-all flex items-center justify-center gap-2"
              >
                <Settings2 size={16} />
                Configurar Parámetros Globales
              </button>
            </div>
          </div>

          <div className="card p-6 border-none shadow-sm">
            <h2 className="font-bold text-secondary mb-6">Cumplimiento Mensual</h2>
            <div className="space-y-6">
               <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                    <span className="text-gray-400">Puntualidad</span>
                    <span className="text-secondary">92%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-success w-[92%]"></div>
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                    <span className="text-gray-400">Asistencia</span>
                    <span className="text-secondary">88%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[88%]"></div>
                  </div>
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                    <span className="text-gray-400">Informes Generados</span>
                    <span className="text-secondary">45%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-warning w-[45%]"></div>
                  </div>
               </div>
            </div>
            <p className="mt-8 text-[10px] text-gray-400 leading-relaxed italic text-center">
              * Datos calculados en base a los registros de los últimos 30 días.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-secondary/5">
              <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
                <UserPlus className="text-primary" size={20} />
                Nueva Asignación
              </h3>
              <button onClick={() => setShowShiftModal(false)} className="text-gray-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSendShift} className="p-8 space-y-5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Funcionario</label>
                <select 
                  className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-secondary"
                  value={newShift.official}
                  onChange={e => setNewShift({...newShift, official: e.target.value})}
                  required
                >
                  <option value="">Selecciona funcionario...</option>
                  {officials.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Fecha</label>
                  <input 
                    type="date"
                    className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-secondary"
                    onChange={e => setNewShift({...newShift, date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Ubicación</label>
                  <select 
                    className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-secondary"
                    onChange={e => setNewShift({...newShift, location: e.target.value})}
                  >
                    <option>SAR Concón</option>
                    <option>SAPU Reñaca</option>
                    <option>H. Fricke</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Entrada</label>
                  <input type="time" defaultValue="08:00" className="w-full bg-tertiary border-none rounded-2xl p-4 font-bold text-secondary" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Salida</label>
                  <input type="time" defaultValue="17:00" className="w-full bg-tertiary border-none rounded-2xl p-4 font-bold text-secondary" />
                </div>
              </div>
              <button 
                disabled={loading}
                className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                Enviar a Funcionario
              </button>
            </form>
          </div>
        </div>
      )}

      {showParamsModal && (
        <div className="fixed inset-0 bg-secondary/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary/5">
              <h3 className="text-xl font-bold text-secondary flex items-center gap-2">
                <Settings2 className="text-primary" size={20} />
                Parámetros Globales
              </h3>
              <button onClick={() => setShowParamsModal(false)} className="text-gray-400 hover:text-secondary">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleUpdateParams} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Dirección del Centro</label>
                <div className="relative">
                  <Navigation className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    value={centerParams.address}
                    onChange={e => setCenterParams({...centerParams, address: e.target.value})}
                    placeholder="Ej: Av. Borgoño 25000, Concón"
                    className="w-full bg-tertiary border-none rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-secondary"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Latitud</label>
                  <input 
                    type="number" step="any"
                    value={centerParams.lat}
                    onChange={e => setCenterParams({...centerParams, lat: e.target.value})}
                    className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-mono text-secondary"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Longitud</label>
                  <input 
                    type="number" step="any"
                    value={centerParams.lng}
                    onChange={e => setCenterParams({...centerParams, lng: e.target.value})}
                    className="w-full bg-tertiary border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all font-mono text-secondary"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Email de Soporte Técnico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="email"
                    value={centerParams.supportEmail}
                    onChange={e => setCenterParams({...centerParams, supportEmail: e.target.value})}
                    placeholder="soporte@cormumel.cl"
                    className="w-full bg-tertiary border-none rounded-2xl p-4 pl-12 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-secondary"
                    required
                  />
                </div>
              </div>
              <div className="p-4 bg-tertiary rounded-2xl border border-gray-100 flex gap-3">
                <AlertTriangle className="text-warning shrink-0" size={20} />
                <p className="text-[10px] text-gray-400 leading-relaxed italic">
                  Cambiar estos parámetros afectará el radio de marcaje de todos los funcionarios de forma inmediata. Asegúrese de ingresar coordenadas precisas.
                </p>
              </div>
              <button 
                disabled={loading}
                className="w-full btn-primary py-4 text-lg"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Actualizar Configuración'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
