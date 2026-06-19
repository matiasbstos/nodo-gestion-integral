import React from 'react';
import { 
  FileText, 
  Briefcase, 
  FileUp, 
  CheckCircle2, 
  Search, 
  Download, 
  Eye, 
  ShieldCheck,
  TrendingUp,
  Users
} from 'lucide-react';

const AdminHonorariosView = () => {
  const [reportsStatus, setReportsStatus] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    processed: 0,
    total: 0,
    projectedAmount: 0
  });

  React.useEffect(() => {
    const fetchConsolidatedData = async () => {
      setLoading(true);
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const { db } = await import('../firebase');

        // 1. Fetch ALL users (Officials)
        const userSnap = await getDocs(query(collection(db, 'usuarios'), where('role', '==', 'user')));
        const allUsers = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // 2. Fetch ALL completed turns for the current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const turnSnap = await getDocs(query(
          collection(db, 'turnos'),
          where('estado', 'in', ['completado', 'completado_manual']),
          where('fechaInicio', '>=', startOfMonth)
        ));
        const allTurns = turnSnap.docs.map(d => d.data());

        // 3. Aggregate data per user
        const aggregated = allUsers.map(user => {
          const userTurns = allTurns.filter(t => t.rutFuncionario === user.rut?.replace(/[^0-9kK]/g, ''));
          const totalHours = userTurns.reduce((acc, t) => {
            const inicio = t.fechaInicio?.toDate();
            const fin = t.fechaFin?.toDate();
            return acc + (fin && inicio ? (fin - inicio) / 3600000 : 0);
          }, 0);
          
          const valorHora = user.valorHora || 0;
          const totalMonto = Math.round(totalHours * valorHora);

          return {
            id: user.id,
            name: user.nombre || 'Desconocido',
            rut: user.rut,
            amount: `$${totalMonto.toLocaleString('es-CL')}`,
            status: totalMonto > 0 ? 'Generado' : 'Sin Movimiento',
            rawAmount: totalMonto
          };
        });

        setReportsStatus(aggregated);
        
        // 4. Calculate Global Stats
        const totalAmount = aggregated.reduce((acc, row) => acc + row.rawAmount, 0);
        const processedCount = aggregated.filter(row => row.rawAmount > 0).length;

        setStats({
          processed: processedCount,
          total: allUsers.length,
          projectedAmount: totalAmount
        });

      } catch (err) {
        console.error("Error fetching consolidated fees:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConsolidatedData();
  }, []);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[#F8FAFC]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">Honorarios e Informes</h1>
          <p className="text-gray-500 mt-1">Gestión administrativa y auditoría de informes de prestación.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-tertiary hover:bg-gray-100 text-[#1E293B] text-xs font-bold rounded-2xl border border-gray-100 transition-all">
            <FileUp size={18} />
            Cargar Matriz PDF
          </button>
          <button className="flex items-center gap-2 px-6 py-3 bg-secondary hover:bg-secondary-dark text-white text-xs font-bold rounded-2xl shadow-lg shadow-secondary/10 transition-all">
            <ShieldCheck size={18} className="text-primary" />
            Subir Firma Digital
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Estadísticas de Gestión */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Progreso de Informes</p>
            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
              <svg className="w-full h-full -rotate-90">
                <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-100" />
                <circle cx="80" cy="80" r="74" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-primary" strokeDasharray="464.7" strokeDashoffset={464.7 * (1 - (stats.total > 0 ? stats.processed / stats.total : 0))} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-secondary">
                  {stats.processed}/{stats.total}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Listos</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Total Funcionarios</span>
                <span className="font-bold text-secondary">{stats.total}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400">Restantes</span>
                <span className="font-bold text-warning">{stats.total - stats.processed}</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary to-primary-dark p-6 rounded-3xl text-white shadow-xl shadow-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={20} />
              <p className="font-bold text-sm">Resumen de Pagos</p>
            </div>
            <p className="text-2xl font-bold">${stats.projectedAmount.toLocaleString('es-CL')}</p>
            <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">Total Proyectado Mes</p>
          </div>
        </div>

        {/* Tabla de Auditoría */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Buscar por funcionario o RUT..." className="w-full bg-tertiary border-none rounded-xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20" />
            </div>
            <button className="px-6 py-3 bg-tertiary rounded-xl text-xs font-bold text-secondary hover:bg-gray-100 transition-colors">
              Filtrar por Estado
            </button>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                <tr>
                  <th className="px-6 py-4">Funcionario</th>
                  <th className="px-6 py-4">RUT</th>
                  <th className="px-6 py-4">Monto Bruto</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center">
                      <TrendingUp className="animate-bounce mx-auto text-primary mb-4" size={32} />
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Consolidando montos de la red...</p>
                    </td>
                  </tr>
                ) : reportsStatus.length > 0 ? (
                  reportsStatus.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-bold text-secondary">{row.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{row.status === 'Generado' ? 'Informe Listo' : 'Pendiente'}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{row.rut}</td>
                      <td className="px-6 py-4 text-secondary font-bold">{row.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                          row.status === 'Generado' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="p-2 text-gray-400 hover:text-primary transition-colors" title="Ver Informe">
                            <Eye size={18} />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-secondary transition-colors" title="Descargar PDF">
                            <Download size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-8 py-12 text-center text-gray-400 italic">
                      No hay informes de honorarios procesados para este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHonorariosView;
