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
  Info,
  Printer,
  ChevronLeft,
  Lock
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import InformeHonorariosPrint from './InformeHonorariosPrint';
import { calcularProyeccionTurno } from '../utils/escalaRemuneraciones';
import { logAuditAction } from '../utils/auditLogger';

const MisHonorariosView = ({ userData }) => {
  const [asistencias, setAsistencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [showPrintView, setShowPrintView] = useState(false);
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
        
        // Query turnos del funcionario
        const q = query(
          collection(db, 'turnos'),
          where('rutFuncionario', '==', cleanRut)
        );

        const querySnapshot = await getDocs(q);
        const docs = querySnapshot.docs.map(doc => {
          const data = doc.id ? { id: doc.id, ...doc.data() } : doc.data();
          const proy = calcularProyeccionTurno(data, userData);
          
          const fechaObj = data.fechaInicio?.toDate 
            ? data.fechaInicio.toDate() 
            : data.inicio ? new Date(data.inicio) : new Date(data.fecha || Date.now());
          
          return {
            ...data,
            fecha: fechaObj,
            centro: data.centroAsignacion || data.centroSalud || 'SAR Arpillerista',
            horasValidadas: proy.horasTotales,
            horasHabiles: proy.horasHabiles,
            horasInhabiles: proy.horasInhabiles,
            valorHoraHab: proy.valorHab,
            valorHoraInh: proy.valorInh,
            totalHabiles: proy.brutoHabiles,
            totalInhabiles: proy.brutoInhabiles,
            totalDia: proy.brutoTotal,
            netoDia: proy.netoEstimado,
            retencionDia: proy.retencionSII
          };
        });

        // Filtrar estrictamente por la fecha de corte del contrato (Honorarios: 01 a 28/30/31 vs Plazo Fijo: 21 ant. a 20)
        const esPlazoFijo = (userData?.tipoContrato || '').toLowerCase().includes('plazo') || (userData?.tipoContrato || '').toLowerCase().includes('planta');
        const monthIdx = Number(mesSeleccionado);
        const yearNum = 2026;

        let startDate, endDate;
        if (esPlazoFijo) {
          const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
          const prevYearNum = monthIdx === 0 ? yearNum - 1 : yearNum;
          startDate = new Date(prevYearNum, prevMonthIdx, 21, 0, 0, 0, 0);
          endDate = new Date(yearNum, monthIdx, 20, 23, 59, 59, 999);
        } else {
          startDate = new Date(yearNum, monthIdx, 1, 0, 0, 0, 0);
          const lastDay = new Date(yearNum, monthIdx + 1, 0).getDate();
          endDate = new Date(yearNum, monthIdx, lastDay, 23, 59, 59, 999);
        }

        const filtered = docs.filter(d => {
          if (!d.fecha) return false;
          const t = d.fecha.getTime();
          return t >= startDate.getTime() && t <= endDate.getTime();
        });

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
  const horasLuVi = asistencias.reduce((acc, curr) => acc + (curr.horasHabiles || 0), 0);
  const horasSaDoFest = asistencias.reduce((acc, curr) => acc + (curr.horasInhabiles || 0), 0);
  const totalHoras = horasLuVi + horasSaDoFest;

  const totalBrutoHabiles = asistencias.reduce((acc, curr) => acc + (curr.totalHabiles || 0), 0);
  const totalBrutoInhabiles = asistencias.reduce((acc, curr) => acc + (curr.totalInhabiles || 0), 0);
  const totalMonto = totalBrutoHabiles + totalBrutoInhabiles;

  const retencionTotal = Math.round(totalMonto * 0.145);
  const totalNeto = totalMonto - retencionTotal;

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

  const esPlazoFijo = (userData?.tipoContrato || '').toLowerCase().includes('plazo') || (userData?.tipoContrato || '').toLowerCase().includes('planta');
  const monthIdx = Number(mesSeleccionado);
  const lastDayOfMonth = new Date(2026, monthIdx + 1, 0).getDate();
  const prevMonthName = new Date(2026, monthIdx - 1 < 0 ? 11 : monthIdx - 1, 1).toLocaleDateString('es-CL', { month: 'long' });
  const currentMonthName = new Date(2026, monthIdx, 1).toLocaleDateString('es-CL', { month: 'long' });

  const corteTextoInfo = esPlazoFijo
    ? `Corte Plazo Fijo: 21 de ${prevMonthName} al 20 de ${currentMonthName}`
    : `Corte Honorarios: 01 al ${lastDayOfMonth} de ${currentMonthName}`;

  if (showPrintView) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between print:hidden">
          <button
            onClick={() => setShowPrintView(false)}
            className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-primary transition-colors bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm"
          >
            <ChevronLeft size={18} /> Volver a Mis Honorarios
          </button>
        </div>

        <InformeHonorariosPrint
          funcionario={{
            nombre: userData?.nombre || 'Funcionario',
            rut: userData?.rut || '',
            cargo: userData?.tipoPrestador || 'Médico Cirujano',
            lugar: userData?.centroAsignado || 'SAR Arpillerista Elsa Romo Aravena'
          }}
          periodo={periodoNombreStr}
          resumenHoras={{
            valorHoraLuVi: tarifaNormal,
            horasLuVi: horasLuVi,
            valorHoraSaDoFest: tarifaFestivo,
            horasSaDoFest: horasSaDoFest,
            valorMensual: totalMonto,
            diasTrabajados: asistencias.length
          }}
          datosBancarios={{
            tipoCuenta: userData?.tipoCuenta || 'Cuenta Corriente',
            banco: userData?.banco || 'Banco de Chile',
            numeroCuenta: userData?.numeroCuenta || '',
            telefono: userData?.telefono || '',
            email: userData?.correoInstitucional || userData?.email || ''
          }}
          actividades={[
            'CONTROL DE SIGNOS VITALES.',
            'TOMA DE ELECTROCARDIOGRAMAS.',
            'ADMINISTRACION DE MEDICAMENTOS VIA ORAL, IM, EV.',
            'CURACIONES.',
            'TRASLADOS DE PACIENTES CRITICOS A HOSPITAL SAN JOSE DE MELIPILLA.'
          ]}
          allowEdit={true}
        />
      </div>
    );
  }

  const [locking, setLocking] = useState(false);

  const isClosedAndLocked = asistencias.length > 0 && asistencias.every(a => a.estadoCierreRRHH === 'bloqueado');
  const isAdmin = userData?.role === 'admin_global' || userData?.role === 'admin_local' || (userData?.role || '').toLowerCase().includes('admin');

  const handleLockAndVerifyPeriod = async () => {
    if (asistencias.length === 0) {
      alert("No hay registros en este período para verificar o bloquear.");
      return;
    }

    if (!window.confirm(`🔒 ¿Deseas VALIDAR Y BLOQUEAR el período de corte (${corteTextoInfo}) para este funcionario?\n\nUna vez verificado y cerrado por Recursos Humanos, los turnos no podrán ser modificados a posteriori.`)) return;

    setLocking(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');

      for (const shift of asistencias) {
        if (shift.id) {
          await updateDoc(doc(db, 'turnos', shift.id), {
            estadoCierreRRHH: 'bloqueado',
            fechaCierreRRHH: new Date().toISOString(),
            aprobadoPorRRHH: userData?.nombre || 'Administrador RRHH'
          });
        }
      }

      setFirmaStatus(prev => ({ ...prev, jefe: true }));

      await logAuditAction(db, {
        usuario: userData,
        accion: 'CIERRE_MES_RRHH_APROBADO',
        detalles: `Recursos Humanos validó y bloqueó el período de corte (${corteTextoInfo}): Total Horas Hábiles=${horasLuVi}h, Inhábiles=${horasSaDoFest}h, Monto Bruto=$${totalMonto.toLocaleString('es-CL')}`,
        targetFuncionario: userData,
        categoria: 'honorarios'
      });

      alert("¡El período de corte fue verificado, aprobado y bloqueado con éxito por Recursos Humanos!");
      setAsistencias(prev => prev.map(a => ({ ...a, estadoCierreRRHH: 'bloqueado' })));
    } catch (err) {
      console.error(err);
      alert("Error al cerrar el período: " + err.message);
    } finally {
      setLocking(false);
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-secondary tracking-tight">Mis Honorarios y Liquidación</h1>
          <p className="text-gray-500 mt-1 flex flex-wrap items-center gap-2">
            Transparencia financiera y firma de informes mensuales.
            <span className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5 ml-2">
              <Clock size={13} /> {corteTextoInfo}
            </span>
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <select 
            value={mesSeleccionado}
            onChange={(e) => setMesSeleccionado(Number(e.target.value))}
            className="bg-transparent border-none text-sm font-bold text-secondary focus:ring-0 cursor-pointer capitalize"
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(mIndex => (
              <option key={mIndex} value={mIndex}>
                {new Date(2026, mIndex, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          <div className="h-6 w-px bg-gray-100"></div>
          <button 
            onClick={() => setShowPrintView(true)}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-secondary-dark transition-all"
          >
            <Download size={14} />
            PDF / Informe
          </button>
        </div>
      </div>

      {/* Punto de Verificación y Cierre RRHH */}
      <div className="bg-gradient-to-r from-secondary via-secondary-light to-secondary p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md shrink-0">
            <Lock size={24} className={isClosedAndLocked ? "text-emerald-400" : "text-amber-300"} />
          </div>
          <div>
            <h3 className="font-extrabold text-base md:text-lg text-white flex items-center gap-2">
              Punto de Verificación & Cierre de Corte (Recursos Humanos)
            </h3>
            <p className="text-xs text-gray-300 mt-0.5">
              {corteTextoInfo}. {isClosedAndLocked ? "Este período se encuentra VERIFICADO y BLOQUEADO contra modificaciones a posteriori." : "Verifica los turnos del período. Al aprobar y cerrar, los datos quedarán protegidos contra modificaciones."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isClosedAndLocked ? (
            <span className="px-4 py-2.5 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm">
              <CheckCircle2 size={16} /> Período Verificado y Bloqueado
            </span>
          ) : isAdmin ? (
            <button
              onClick={handleLockAndVerifyPeriod}
              disabled={locking || asistencias.length === 0}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Lock size={16} /> Validar y Cerrar Período de Corte
            </button>
          ) : null}
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
              <button 
                onClick={() => setShowPrintView(true)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-[2px] shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
              >
                <PenTool size={20} />
                Firmar e Imprimir Informe
              </button>
              <button 
                onClick={() => setShowPrintView(true)}
                className="w-full py-4 bg-white text-secondary border border-gray-100 rounded-2xl font-bold uppercase tracking-[2px] hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
              >
                <FileText size={20} />
                Previsualizar Informe (PDF)
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
                    <td colSpan="2" className="px-8 py-6 text-secondary font-black uppercase tracking-widest text-xs">
                      Consolidado Mensual (Desglose Hábiles / Inhábiles)
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col text-xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Hábiles</span>
                        <span className="font-extrabold text-secondary">{horasLuVi} hrs</span>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold">${totalBrutoHabiles.toLocaleString('es-CL')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col text-xs">
                        <span className="text-[10px] font-bold text-amber-500 uppercase">Inhábiles/Festivas</span>
                        <span className="font-extrabold text-secondary">{horasSaDoFest} hrs</span>
                        <span className="text-[10px] font-mono text-emerald-600 font-bold">${totalBrutoInhabiles.toLocaleString('es-CL')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col text-xs">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Total Horas</span>
                        <span className="text-lg font-black text-primary">{totalHoras} hrs</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Monto Bruto Consolidado</span>
                        <span className="text-2xl font-black text-secondary">${totalMonto.toLocaleString('es-CL')}</span>
                        <span className="text-xs font-mono text-rose-500 font-bold">SII (14.5%): -${retencionTotal.toLocaleString('es-CL')}</span>
                        <span className="text-sm font-black text-emerald-700 font-mono mt-0.5">Neto Estimado: ${totalNeto.toLocaleString('es-CL')}</span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-200">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Retención Honorarios SII (14.5%)</p>
                <p className="font-mono font-bold text-rose-600 text-lg">-${retencionTotal.toLocaleString('es-CL')}</p>
              </div>
            </div>
            <div className="bg-emerald-600 text-white p-6 rounded-3xl border border-emerald-500 flex items-center justify-between shadow-lg shadow-emerald-600/20">
              <div>
                <p className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Monto Neto Estimado a Recibir</p>
                <p className="font-mono font-black text-2xl">${totalNeto.toLocaleString('es-CL')}</p>
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Líquido a Pago
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MisHonorariosView;
