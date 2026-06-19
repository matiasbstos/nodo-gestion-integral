import React from 'react';
import { 
  BarChart3, 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Users,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Download
} from 'lucide-react';

const Statistics = ({ userData }) => {
  const [selectedOfficial, setSelectedOfficial] = React.useState('Todos');
  const [dateRange, setDateRange] = React.useState('Este Mes');

  const mainMetrics = [
    { label: 'Gasto Mensual', value: '$48.250.000', change: '+12%', trendingUp: true, icon: DollarSign, color: 'primary' },
    { label: 'Tasa Absentismo', value: '8.4%', change: '-2%', trendingUp: false, icon: AlertTriangle, color: 'error' },
    { label: 'Total Retrasos', value: '24', change: '+5', trendingUp: true, icon: Clock, color: 'warning' },
    { label: 'Tiempo Adicional', value: '142h', change: '+18h', trendingUp: true, icon: TrendingUp, color: 'success' },
  ];

  const chartData = [
    { label: 'Semana 1', value: 65, color: 'bg-primary' },
    { label: 'Semana 2', value: 45, color: 'bg-primary/60' },
    { label: 'Semana 3', value: 85, color: 'bg-primary' },
    { label: 'Semana 4', value: 30, color: 'bg-primary/40' },
  ];

  const distributionData = [
    { label: 'Clínica', value: '62%', color: 'bg-primary' },
    { label: 'Administrativa', value: '28%', color: 'bg-secondary' },
    { label: 'SAR / Urgencia', value: '10%', color: 'bg-warning' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Inteligencia de Negocio</h1>
          <p className="text-gray-500 mt-1">Análisis profundo de costos y rendimiento operativo.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 border-r border-gray-100">
            <Users size={16} className="text-gray-400" />
            <select 
              value={selectedOfficial}
              onChange={(e) => setSelectedOfficial(e.target.value)}
              className="text-xs font-bold text-secondary bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              <option>Todos los Funcionarios</option>
              <option>Dr. Roberto Sánchez</option>
              <option>Enf. María José</option>
              <option>TENS Pedro Picapiedra</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 border-r border-gray-100">
            <Calendar size={16} className="text-gray-400" />
            <select 
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="text-xs font-bold text-secondary bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              <option>Este Mes</option>
              <option>Últimos 3 Meses</option>
              <option>Año 2023</option>
              <option>Personalizado</option>
            </select>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 text-primary hover:bg-primary/5 rounded-xl transition-all">
            <Download size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Exportar</span>
          </button>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainMetrics.map((metric, i) => (
          <div key={i} className="card p-6 border-none shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-${metric.color}/10 text-${metric.color}`}>
                <metric.icon size={24} />
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                metric.trendingUp ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
              }`}>
                {metric.change}
                {metric.trendingUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">{metric.value}</p>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">{metric.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart (CSS-based) */}
        <div className="lg:col-span-2 card p-8 border-none shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-secondary">Tendencia de Gastos Mensuales</h2>
              <p className="text-xs text-gray-400">Distribución de presupuesto por semana.</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary/40 rounded-full"></div>
                <span>Proyectado</span>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-4 px-4 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="border-t border-secondary w-full"></div>)}
            </div>
            
            {chartData.map((data, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group relative">
                <div 
                  className={`${data.color} w-full rounded-t-xl transition-all duration-1000 group-hover:brightness-110 relative`}
                  style={{ height: `${data.value}%` }}
                >
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-secondary text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {data.value}%
                  </div>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{data.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="card p-8 border-none shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-secondary mb-2">Distribución de Horas</h2>
            <p className="text-xs text-gray-400 mb-8">Porcentaje por estamento asistencial.</p>
            
            <div className="space-y-6">
              {distributionData.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                    <span className="text-gray-400">{item.label}</span>
                    <span className="text-secondary">{item.value}</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full transition-all duration-1000`} style={{ width: item.value }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 p-4 bg-tertiary rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center text-success">
                <ArrowUpRight size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-secondary">Eficiencia Operativa</p>
                <p className="text-[10px] text-gray-400">Aumentó un 4.2% este periodo.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Insights Table */}
      <div className="card overflow-hidden border-none shadow-sm">
        <div className="p-6 border-b border-gray-50 bg-white">
          <h2 className="font-bold text-secondary">Detalle de Incidencias por Nodo</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Centro / Nodo</th>
                <th className="px-6 py-4">Gasto Acumulado</th>
                <th className="px-6 py-4">Horas Extra</th>
                <th className="px-6 py-4">Ausentismo</th>
                <th className="px-6 py-4">Eficiencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { name: 'SAR Concón', cost: '$12.450.000', extra: '42h', absence: '2.1%', efficiency: '94%' },
                { name: 'SAPU Reñaca', cost: '$8.120.000', extra: '15h', absence: '4.5%', efficiency: '88%' },
                { name: 'Hospital Gustavo Fricke', cost: '$22.680.000', extra: '85h', absence: '3.2%', efficiency: '91%' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-secondary group-hover:text-primary transition-colors">{row.name}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-medium">{row.cost}</td>
                  <td className="px-6 py-4 text-sm text-secondary font-bold">{row.extra}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-error">{row.absence}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-success">{row.efficiency}</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-success h-full" style={{ width: row.efficiency }}></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
