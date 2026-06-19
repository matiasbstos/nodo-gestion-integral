import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Download, 
  PenTool, 
  ShieldCheck,
  AlertCircle,
  Calendar,
  DollarSign,
  ArrowRight,
  TrendingUp,
  MapPin,
  Info
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const MisHonorariosView = ({ userData }) => {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [firmaStatus, setFirmaStatus] = useState({
    prestador: false,
    jefe: false,
    direccion: false
  });

  useEffect(() => {
    const fetchHonorarios = async () => {
      if (!userData?.rut) return;
      setLoading(true);
      try {
        const cleanRut = userData.rut.replace(/[^0-9kK]/g, '');
        
        // Query turnos completados
        const q = query(
          collection(db, 'turnos'),
          where('rutFuncionario', '==', cleanRut),
          where('estado', 'in', ['completado', 'completado_manual']),
          orderBy('fechaInicio', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => {
          const data = doc.id ? { id: doc.id, ...doc.data() } : doc.data();
          
          // Cálculo dinámico de horas y montos
          const inicio = data.fechaInicio?.toDate();
          const fin = data.fechaFin?.toDate();
          const horasValidadas = data.horasValidadas || (fin && inicio ? (fin - inicio) / 3600000 : 0);
          const valorHora = data.valorHoraAplicado || userData.valorHora || 0;
          
          return {
            ...data,
            fecha: inicio,
            centro: data.centroAsignacion,
            horasValidadas: Number(horasValidadas.toFixed(1)),
            valorHora: valorHora,
            totalDia: Math.round(horasValidadas * valorHora)
          };
        });

        // Filtrar por mes seleccionado en el frontend para mayor flexibilidad
        const filtered = docs.filter(d => d.fecha && d.fecha.getMonth() === Number(mesSeleccionado));
        setAsistencias(filtered);
      } catch (err) {
        console.error("Error fetching honorarios:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHonorarios();
  }, [userData, mesSeleccionado]);

  // Totales reales basados en la data filtrada
  const totalHoras = asistencias.reduce((acc, curr) => acc + (curr.horasValidadas || 0), 0);
  const totalMonto = asistencias.reduce((acc, curr) => acc + (curr.totalDia || 0), 0);

  const StepperItem = ({ step, label, status, isLast }) => (
    <div className="relative flex gap-4 pb-8">
      {!isLast && <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-100"></div>}
      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
        status === 'completed' 
          ? 'bg-success border-success text-white' 
          : status === 'pending' 
            ? 'bg-white border-primary text-primary animate-pulse'
            : 'bg-white border-gray-200 text-gray-300'
      }`}>
        {status === 'completed' ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{step}</span>}
      </div>
      <div>
        <p className={`text-sm font-bold ${status === 'completed' ? 'text-secondary' : 'text-gray-400'}`}>{label}</p>
        <p className="text-[10px] uppercase font-bold tracking-tighter text-gray-400">
          {status === 'completed' ? 'Documento Firmado' : status === 'pending' ? 'Esperando Acción' : 'Bloqueado'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-secondary tracking-tight">Mis Honorarios y Liquidación</h1>
          <p className="text-gray-500 mt-1">Transparencia financiera y firma de informes mensuales.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <select 
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(e.target.value)}
            className="bg-transparent border-none text-sm font-bold text-secondary focus:ring-0 cursor-pointer"
          >
            <option value={4}>Mayo 2026</option>
            <option value={3}>Abril 2026</option>
          </select>
          <div className="h-6 w-px bg-gray-100"></div>
          <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-secondary-dark transition-all">
            <Download size={14} />
            PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Panel: Stepper & Actions */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-secondary mb-8 flex items-center gap-3">
              <ShieldCheck className="text-primary" />
              Estado de Validación
            </h2>
            
            <div className="px-2">
              <StepperItem 
                step={1} 
                label="Firma del Prestador (Tú)" 
                status={asistencias.length > 0 ? 'pending' : 'locked'} 
              />
              <StepperItem 
                step={2} 
                label="Firma Jefe Directo" 
                status="locked" 
              />
              <StepperItem 
                step={3} 
                label="Firma Dirección Salud" 
                status="locked" 
                isLast={true} 
              />
            </div>

            <div className="mt-8 space-y-3">
              <button className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-[2px] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3">
                <PenTool size={20} />
                Firmar Informe Mayo
              </button>
              <button className="w-full py-4 bg-white text-secondary border border-gray-100 rounded-2xl font-bold uppercase tracking-[2px] hover:bg-gray-50 transition-all flex items-center justify-center gap-3">
                <FileText size={20} />
                Previsualizar Borrador
              </button>
            </div>
            
            <div className="mt-8 p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
              <Info size={18} className="text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500 leading-relaxed italic">
                Al firmar este documento declaras que las horas detalladas en la bitácora son correctas y corresponden a la jornada efectivamente realizada.
              </p>
            </div>
          </div>

          <div className="bg-secondary p-8 rounded-[32px] shadow-xl text-white relative overflow-hidden">
            <div className="absolute bottom-0 right-0 p-4 opacity-10">
              <TrendingUp size={120} />
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Monto Bruto Estimado</p>
            <h3 className="text-4xl font-black mb-2">${totalMonto.toLocaleString('es-CL')}</h3>
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <CheckCircle2 size={14} />
              Cálculo basado en Matriz APS
            </div>
          </div>
        </div>

        {/* Right Panel: Bitácora de Cálculo */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-[#F8FAFC]/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl text-primary">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-secondary text-lg">Bitácora de Honorarios</h3>
                  <p className="text-xs text-gray-400">Detalle diario de turnos validados y montos devengados.</p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
                  <tr>
                    <th className="px-8 py-5">Fecha / Día</th>
                    <th className="px-8 py-5">Centro / Servicio</th>
                    <th className="px-8 py-5">Tipo Jornada</th>
                    <th className="px-8 py-5 text-center">Horas</th>
                    <th className="px-8 py-5 text-right">Valor Hora</th>
                    <th className="px-8 py-5 text-right">Total Día</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-8 py-20 text-center">
                        <Clock className="animate-spin mx-auto text-primary mb-4" size={32} />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Calculando bitácora mensual...</p>
                      </td>
                    </tr>
                  ) : asistencias.length > 0 ? (
                    asistencias.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="font-bold text-secondary">
                              {new Date(item.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">
                              {new Date(item.fecha).toLocaleDateString('es-CL', { weekday: 'short' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-gray-300" />
                            <span className="text-gray-600 font-medium">{item.centro || 'SAR Concón'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                            item.tipoJornada === 'Inhábil' 
                              ? 'bg-warning/10 text-warning border border-warning/20' 
                              : 'bg-success/10 text-success border border-success/20'
                          }`}>
                            {item.tipoJornada || 'Hábil'}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center font-bold text-secondary">
                          {item.horasValidadas || 0} hrs
                        </td>
                        <td className="px-8 py-5 text-right font-mono text-gray-500">
                          ${(item.valorHora || 0).toLocaleString('es-CL')}
                        </td>
                        <td className="px-8 py-5 text-right font-black text-secondary text-base">
                          ${(item.totalDia || 0).toLocaleString('es-CL')}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-8 py-20 text-center">
                        <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
                        <p className="text-gray-400 font-medium">No se registran asistencias validadas para este mes.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[#F8FAFC] border-t border-gray-100">
                  <tr>
                    <td colSpan="3" className="px-8 py-6 text-secondary font-black uppercase tracking-widest text-xs">
                      Consolidado Mensual
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Total Horas</span>
                        <span className="text-lg font-black text-primary">{totalHoras} hrs</span>
                      </div>
                    </td>
                    <td colSpan="2" className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Subtotal Bruto</span>
                        <span className="text-2xl font-black text-secondary">${totalMonto.toLocaleString('es-CL')}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-success/10 rounded-2xl flex items-center justify-center text-success">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Retención Honorarios</p>
                <p className="font-bold text-secondary">13.75% Aplicada</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <ArrowRight size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Próximo Pago</p>
                <p className="font-bold text-secondary">05 de Junio 2026</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MisHonorariosView;
