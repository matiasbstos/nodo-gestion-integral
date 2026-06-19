import React from 'react';
import { 
  Calendar, 
  Clock, 
  Wallet, 
  FileText, 
  ChevronRight, 
  Download, 
  Upload, 
  Filter, 
  Search, 
  Eye, 
  CheckCircle2, 
  Circle, 
  Lock,
  MoreHorizontal,
  Info,
  Users
} from 'lucide-react';

const Fees = ({ userData }) => {
  const isAdmin = userData?.rol === 'Administrador global';
  const [uploadingMatrix, setUploadingMatrix] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  const officialsCount = 42;
  const reportsGenerated = 19;

  const handleUploadMatrix = () => {
    setUploadingMatrix(true);
    setTimeout(() => {
      setUploadingMatrix(false);
      alert('Matriz cargada y autocompletada con los datos de los funcionarios.');
    }, 2000);
  };

  const tableData = [
    { date: '23 Oct, 2023', type: 'Administrativa', hours: '8.0 hrs', rate: '$32.500', total: '$260.000', status: 'success' },
    { date: '24 Oct, 2023', type: 'Clínica SAR', hours: '12.0 hrs', rate: '$45.000', total: '$540.000', status: 'success' },
    { date: '25 Oct, 2023', type: 'Administrativa', hours: '8.0 hrs', rate: '$32.500', total: '$260.000', status: 'success' },
    { date: '26 Oct, 2023', type: 'Festivo/Turno', hours: '6.5 hrs', rate: '$52.000', total: '$338.000', status: 'warning' },
    { date: '27 Oct, 2023', type: 'Administrativa', hours: '8.0 hrs', rate: '$32.500', total: '$260.000', status: 'success' },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary">Honorarios y Reportes</h1>
          <p className="text-gray-500 mt-1">Gestión de valorización, firmas y reportes mensuales.</p>
        </div>
        <div className="flex gap-3">
          {isAdmin ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar funcionario..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border-none rounded-2xl py-3 pl-10 pr-4 shadow-sm text-sm focus:ring-2 focus:ring-primary/20 w-64 transition-all"
                />
              </div>
              <button 
                onClick={handleUploadMatrix}
                disabled={uploadingMatrix}
                className="btn-primary"
              >
                {uploadingMatrix ? <Clock className="animate-spin" size={18} /> : <Upload size={18} />}
                Cargar Matriz de Informe
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary">
                <Upload size={18} />
                Cargar Firma Digital
              </button>
              <button className="btn-primary">
                <Download size={18} />
                Descargar Matriz
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6 flex items-start justify-between">
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isAdmin ? 'Funcionarios Totales' : 'Horas Semanales'}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-secondary">{isAdmin ? officialsCount : '44,5'}</span>
              {!isAdmin && <span className="text-lg font-medium text-gray-400">Hrs</span>}
            </div>
            <p className="text-xs text-gray-400 font-medium">
              {isAdmin ? `${reportsGenerated} informes generados este mes.` : 'Cumplimiento del 100% de la jornada base.'}
            </p>
          </div>
          <div className="bg-primary/10 p-3 rounded-xl text-primary">
            {isAdmin ? <Users size={24} /> : <Clock size={24} />}
          </div>
        </div>

        <div className="card p-6 flex items-start justify-between">
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isAdmin ? 'Informes Pendientes' : 'Horas Inhábiles'}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-secondary">{isAdmin ? officialsCount - reportsGenerated : '12,0'}</span>
              {!isAdmin && <span className="text-lg font-medium text-gray-400">Hrs</span>}
            </div>
            <p className="text-xs text-gray-400 font-medium">
              {isAdmin ? 'Requieren revisión del Jefe Directo.' : 'Incluye turnos SAR y festivos.'}
            </p>
          </div>
          <div className="bg-warning/10 p-3 rounded-xl text-warning">
            {isAdmin ? <FileText size={24} /> : <Calendar size={24} />}
          </div>
        </div>

        <div className="card bg-secondary p-6 text-white flex items-start justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="space-y-4 relative z-10">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{isAdmin ? 'Monto Total Estimado' : 'Valorización Total'}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{isAdmin ? '$48.250.000' : '$2.450.800'}</span>
            </div>
            <p className="text-xs text-gray-400 font-medium">Periodo: Octubre 2023</p>
          </div>
          <div className="bg-primary p-3 rounded-xl shadow-lg shadow-primary/20 relative z-10">
            <Wallet size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left - PDF Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 h-full flex flex-col">
            <h2 className="text-lg font-bold text-secondary mb-8">Estado de Reporte PDF</h2>
            
            <div className="space-y-8 relative flex-1">
              {/* Vertical line connector */}
              <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-gray-100"></div>

              {/* Step 1 */}
              <div className="flex gap-4 relative z-10">
                <div className="w-7 h-7 rounded-full bg-success flex items-center justify-center text-white shrink-0 mt-1">
                  <CheckCircle2 size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-secondary">Firma Prestador</p>
                    <span className="bg-success/10 text-success text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Listo</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Firmado el 02/11/2023 - 09:15</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 relative z-10">
                <div className="w-7 h-7 rounded-full bg-warning flex items-center justify-center text-white shrink-0 mt-1">
                  <MoreHorizontal size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-secondary">Firma Jefe Directo</p>
                    <span className="bg-warning/10 text-warning text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Espera</span>
                  </div>
                  <p className="text-[11px] text-gray-400">Pendiente de revisión</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 relative z-10 opacity-40">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 shrink-0 mt-1">
                  <Lock size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-secondary">Firma Dirección</p>
                  </div>
                  <p className="text-[11px] text-gray-400">Bloqueado hasta firma superior</p>
                </div>
              </div>

              <div className="mt-10 pt-10 space-y-3">
                <button className="w-full btn-secondary py-3">
                  <Eye size={18} />
                  Previsualizar Informe
                </button>
                {isAdmin && (
                  <button className="w-full bg-secondary hover:bg-secondary-dark text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-secondary/10">
                    <CheckCircle2 size={18} className="text-primary" />
                    Firma Jefe Directo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5 bg-primary/5 border-primary/10 flex gap-4">
            <div className="text-primary mt-0.5 shrink-0">
              <Info size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-secondary mb-1">Nota del Sistema</p>
              <p className="text-xs text-primary/80 leading-relaxed font-medium">Los cálculos de honorarios se cierran el último día hábil de cada mes. Asegúrese de cargar su firma digital antes de la fecha límite.</p>
            </div>
          </div>
        </div>

        {/* Right - Bitácora */}
        <div className="lg:col-span-3">
          <div className="card overflow-visible">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10 rounded-t-xl">
              <h2 className="text-lg font-bold text-secondary">Bitácora de Cálculo y Jornada</h2>
              <div className="flex gap-2">
                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                  <Filter size={20} />
                </button>
                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                  <Search size={20} />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Tipo Jornada</th>
                    <th className="px-6 py-4">Horas</th>
                    <th className="px-6 py-4">Valor Hora</th>
                    <th className="px-6 py-4">Total Día</th>
                    <th className="px-6 py-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tableData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-secondary">{row.date}</p>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-500 font-medium">{row.type}</td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-secondary">{row.hours.split(' ')[0]}</span>
                          <span className="text-[11px] text-gray-400 font-medium">hrs</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm text-gray-500 font-medium">{row.rate}</td>
                      <td className="px-6 py-5 text-sm font-bold text-secondary">{row.total}</td>
                      <td className="px-6 py-5">
                        <div className={`w-2.5 h-2.5 rounded-full ${row.status === 'success' ? 'bg-success' : 'bg-warning'} ring-4 ${row.status === 'success' ? 'ring-success/10' : 'ring-warning/10'}`}></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-gray-50/30 rounded-b-xl border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400 font-medium">Mostrando 5 de 22 registros este mes</p>
              <div className="flex gap-1">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white hover:shadow-sm disabled:opacity-30" disabled>&lt;</button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary text-white font-bold text-xs shadow-sm shadow-primary/20">1</button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 font-bold text-xs hover:bg-white hover:shadow-sm">2</button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 font-bold text-xs hover:bg-white hover:shadow-sm">3</button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white hover:shadow-sm">&gt;</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Fees;
