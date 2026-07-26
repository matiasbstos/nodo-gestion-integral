import React, { useState, useEffect } from 'react';
import { 
  FlaskConical, 
  User, 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  FileText, 
  RefreshCw,
  Sliders,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  Trash2,
  HelpCircle,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import InformeHonorariosPrint from './InformeHonorariosPrint';
import { logAuditAction } from '../utils/auditLogger';

/**
 * SimuladorPruebasView Component
 * Interactive Testing Sandbox for Admins to test shift assignments, clocking simulations,
 * and immediate A4 PDF report generation for any selected official.
 */
const SimuladorPruebasView = ({ userData }) => {
  const isAdmin = userData?.role === 'admin_global' || userData?.role === 'admin_local' || userData?.tipoPrestador?.toLowerCase().includes('admin');

  const [funcionarios, setFuncionarios] = useState([]);
  const [selectedFuncId, setSelectedFuncId] = useState('');
  const [selectedFunc, setSelectedFunc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  if (!isAdmin) {
    return (
      <div className="p-12 max-w-2xl mx-auto text-center space-y-6 animate-fade-in font-sans">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto border border-rose-200 shadow-lg shadow-rose-100">
          <ShieldAlert size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-secondary">Acceso Restringido</h2>
          <p className="text-sm text-gray-500 font-semibold leading-relaxed">
            El <strong>Simulador de Pruebas</strong> y la gestión del <strong>Modo Prueba</strong> están reservados exclusivamente para los <strong>Administradores Locales y Globales</strong> del sistema NODO.
          </p>
        </div>
        <p className="text-xs text-gray-400 italic">
          Si requieres acceso de prueba para validar tu pauta o perfil, solicita la habilitación al Administrador Global.
        </p>
      </div>
    );
  }

  // Turn Simulation Form State
  const [shiftDate, setShiftDate] = useState('2026-06-15');
  const [shiftType, setShiftType] = useState('turno1'); // turno1, turno2, turno3, refuerzo
  const [shiftLiquidacion, setShiftLiquidacion] = useState('Honorario por horas');
  const [shiftHoras, setShiftHoras] = useState(15);
  const [isAssigning, setIsAssigning] = useState(false);

  // Clocking Simulation Form State
  const [clockDate, setClockDate] = useState('2026-06-15');
  const [clockTime, setClockTime] = useState('17:00');
  const [clockType, setClockType] = useState('entrada'); // entrada, salida
  const [isClocking, setIsClocking] = useState(false);

  // Calculated hours for Selected Official
  const [resumenHoras, setResumenHoras] = useState({
    valorHoraLuVi: 21000,
    horasLuVi: 45.0,
    valorHoraSaDoFest: 21000,
    horasSaDoFest: 24.0,
    valorMensual: 0,
    diasTrabajados: 0
  });

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Officials List
  const fetchFuncionarios = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      let list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Explicit profile for Matias Bustos (Admin Global + Funcionario Prestador)
      const matiasProfile = {
        id: userData?.rut || userData?.id || '184877759',
        nombre: userData?.nombre || userData?.displayName || 'Matias Eduardo Bustos Huerta',
        rut: userData?.rut || '18.487.775-9',
        correoInstitucional: userData?.correoInstitucional || userData?.correo || 'matias.bustos@cormumel.cl',
        tipoPrestador: 'Médico Cirujano (Prestador / Refuerzo SAR)',
        centroAsignado: 'SAR Arpillerista Elsa Romo Aravena',
        tipoContrato: 'Honorario por horas',
        categoria: 'A',
        status: 'activo',
        role: 'admin_global',
        bancoData: {
          tipoCuenta: 'Cuenta Corriente',
          banco: 'Banco de Chile',
          numeroCuenta: '00-184-87775-9',
          telefono: '987654321',
          email: userData?.correoInstitucional || userData?.correo || 'matias.bustos@cormumel.cl'
        }
      };

      const hasMatias = list.some(f => 
        (f.rut && f.rut.includes('18487775')) || 
        (f.id && f.id.includes('18487775')) || 
        (f.nombre && f.nombre.toLowerCase().includes('matias'))
      );

      if (!hasMatias) {
        list = [matiasProfile, ...list];
        try {
          await setDoc(doc(db, 'usuarios', matiasProfile.id), matiasProfile, { merge: true });
        } catch (e) {
          console.warn("Could not sync Matias profile to Firestore:", e);
        }
      }

      setFuncionarios(list);
      
      // Default selection to Matias Bustos
      const matiasInList = list.find(f => 
        (f.nombre && f.nombre.toLowerCase().includes('matias')) || 
        f.id === matiasProfile.id
      ) || list[0];

      if (matiasInList) {
        setSelectedFuncId(matiasInList.id);
        setSelectedFunc(matiasInList);
      }
    } catch (error) {
      console.error("Error fetching funcionarios for simulation:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  // Update selected official object when dropdown changes
  const handleSelectOfficial = (e) => {
    const id = e.target.value;
    setSelectedFuncId(id);
    const found = funcionarios.find(f => f.id === id);
    if (found) {
      setSelectedFunc(found);
    }
  };

  // 1. Simular Asignación de Turno
  const handleAssignShiftSimulated = async (e) => {
    e.preventDefault();
    if (!selectedFunc) return;

    setIsAssigning(true);
    try {
      const isWeekendOrFestivo = new Date(shiftDate).getDay() === 0 || new Date(shiftDate).getDay() === 6;
      const hoursToAdd = Number(shiftHoras) || 15;

      const newShift = {
        funcionarioId: selectedFunc.id,
        funcionarioNombre: selectedFunc.nombre,
        funcionarioRut: selectedFunc.rut || selectedFunc.id,
        fecha: shiftDate,
        tipoTurno: shiftType,
        modalidadLiquidacion: shiftLiquidacion,
        horas: hoursToAdd,
        esFestivo: isWeekendOrFestivo,
        createdAt: new Date().toISOString()
      };

      // Write to Firestore 'turnos'
      await addDoc(collection(db, 'turnos'), newShift);

      // Log to Audit Log
      await logAuditAction(db, {
        usuario: userData,
        accion: 'ASIGNACION_TURNO_SIMULADO',
        detalles: `Turno de prueba asignado para el ${shiftDate} (${shiftType}, ${hoursToAdd} hrs, modalidad: ${shiftLiquidacion})`,
        targetFuncionario: selectedFunc,
        categoria: 'pauta'
      });

      // Update hours in state
      setResumenHoras(prev => {
        if (isWeekendOrFestivo) {
          return { ...prev, horasSaDoFest: prev.horasSaDoFest + hoursToAdd };
        } else {
          return { ...prev, horasLuVi: prev.horasLuVi + hoursToAdd };
        }
      });

      showToast(`¡Turno asignado con éxito a ${selectedFunc.nombre}! Horas sumadas al informe.`);
    } catch (error) {
      console.error("Error assigning simulated shift:", error);
      showToast("Error al asignar el turno de prueba.", "error");
    } finally {
      setIsAssigning(false);
    }
  };

  // 2. Simular Marcaje (Entrada / Salida)
  const handleClockSimulated = async (e) => {
    e.preventDefault();
    if (!selectedFunc) return;

    setIsClocking(true);
    try {
      const newClock = {
        funcionarioId: selectedFunc.id,
        funcionarioNombre: selectedFunc.nombre,
        funcionarioRut: selectedFunc.rut || selectedFunc.id,
        fecha: clockDate,
        hora: clockTime,
        tipo: clockType, // entrada / salida
        simulado: true,
        createdAt: new Date().toISOString()
      };

      // Write to Firestore 'asistencias'
      await addDoc(collection(db, 'asistencias'), newClock);

      // Log to Audit Log
      await logAuditAction(db, {
        usuario: userData,
        accion: clockType === 'entrada' ? 'MARCAJE_ENTRADA_SIMULADO' : 'MARCAJE_SALIDA_SIMULADO',
        detalles: `Marcaje simulado de ${clockType.toUpperCase()} a las ${clockTime} hrs del ${clockDate}`,
        targetFuncionario: selectedFunc,
        categoria: 'asistencia'
      });

      showToast(`Marcaje de ${clockType.toUpperCase()} registrado para ${selectedFunc.nombre} a las ${clockTime} hrs.`);
    } catch (error) {
      console.error("Error creating clocking simulation:", error);
      showToast("Error al registrar el marcaje simulado.", "error");
    } finally {
      setIsClocking(false);
    }
  };

  // 3. Limpiar / Resetear Datos de Prueba de Firebase
  const handleCleanTestData = async () => {
    if (!window.confirm("🗑️ ¿Deseas eliminar todos los turnos y marcajes simulados creados durante las pruebas?\n\nEsta acción eliminará únicamente los datos generados durante las pruebas.")) return;

    setLoading(true);
    try {
      const turnosSnap = await getDocs(collection(db, 'turnos'));
      const deletePromises = [];

      turnosSnap.docs.forEach(d => {
        if (d.data()?.simulado || d.data()?.modalidadLiquidacion === 'Honorario por horas') {
          deletePromises.push(deleteDoc(doc(db, 'turnos', d.id)));
        }
      });

      const asistenciasSnap = await getDocs(collection(db, 'asistencias'));
      asistenciasSnap.docs.forEach(d => {
        if (d.data()?.simulado) {
          deletePromises.push(deleteDoc(doc(db, 'asistencias', d.id)));
        }
      });

      await Promise.all(deletePromises);

      await logAuditAction(db, {
        usuario: userData,
        accion: 'LIMPIEZA_DATOS_PRUEBA',
        detalles: 'Eliminación masiva de turnos y marcajes simulados de prueba de Firebase',
        categoria: 'general'
      });

      setResumenHoras({
        valorHoraLuVi: 21000,
        horasLuVi: 0,
        valorHoraSaDoFest: 21000,
        horasSaDoFest: 0,
        valorMensual: 0,
        diasTrabajados: 0
      });

      showToast("¡Los datos de prueba fueron eliminados de Firebase con éxito!");
    } catch (error) {
      console.error("Error cleaning test data:", error);
      showToast("Error al limpiar datos de prueba: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-[120] px-5 py-3.5 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2 border animate-bounce ${
          toastMessage.type === 'error' ? 'bg-rose-500 text-white border-rose-600' : 'bg-emerald-500 text-white border-emerald-600'
        }`}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {toastMessage.msg}
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <FlaskConical size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold text-secondary tracking-tight">
                Simulador & Laboratorio de Pruebas
              </h1>
              <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-3 py-1 rounded-full uppercase tracking-wider">
                Sólo Administrador
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Selecciona cualquier funcionario para simular asignación de turnos, marcajes de asistencia y previsualizar la generación inmediata de su informe de honorarios en PDF.
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-1">
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
              Seleccionar Funcionario de Prueba:
            </label>
            <select
              value={selectedFuncId}
              onChange={handleSelectOfficial}
              className="input-field bg-white font-bold text-sm text-secondary min-w-[260px] appearance-none"
            >
              {funcionarios.map(f => (
                <option key={f.id} value={f.id}>
                  {f.nombre} ({f.rut || f.id}) — {f.tipoPrestador || 'Prestador'}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleCleanTestData}
            className="p-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
            title="Eliminar todos los turnos y marcajes simulados creados durante las pruebas"
          >
            <Trash2 size={18} className="text-rose-600" />
            Limpiar Datos de Prueba
          </button>
        </div>
      </div>

      {/* Guidance Box: Clarificaciones del Modo Prueba */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white p-6 rounded-3xl border border-amber-200/80 shadow-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold shrink-0 shadow-md">
            <HelpCircle size={20} />
          </div>
          <div>
            <h3 className="font-extrabold text-secondary text-sm">
              ¿Cómo funciona el Modo de Prueba y Simulación?
            </h3>
            <p className="text-xs text-gray-500">Respuestas rápidas a las dudas frecuentes sobre las pruebas:</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-amber-200/50">
          <div className="p-3 bg-white/80 rounded-2xl border border-amber-100 space-y-1">
            <span className="font-bold text-amber-900 block">1. ¿Se pueden eliminar los datos?</span>
            <p className="text-gray-600 text-[11px] leading-relaxed">
              Sí. Puedes desactivar el modo de prueba o presionar el botón <strong>"Limpiar Datos de Prueba"</strong> arriba para borrar de Firebase todos los registros simulados al terminar.
            </p>
          </div>

          <div className="p-3 bg-white/80 rounded-2xl border border-amber-100 space-y-1">
            <span className="font-bold text-amber-900 block">2. ¿Geolocalización en Computadora?</span>
            <p className="text-gray-600 text-[11px] leading-relaxed">
              En modo prueba (y cuando se prueba desde PC), el sistema simula la posición dentro del centro de salud automáticamente, omitiendo errores de GPS.
            </p>
          </div>

          <div className="p-3 bg-white/80 rounded-2xl border border-amber-100 space-y-1">
            <span className="font-bold text-amber-900 block">3. ¿Finalizar turno de inmediato?</span>
            <p className="text-gray-600 text-[11px] leading-relaxed">
              Puedes presionar <strong>"Finalizar Turno"</strong> en cualquier momento sin esperar las 8/12/15 horas reales. El sistema acreditará automáticamente la totalidad de horas al informe PDF.
            </p>
          </div>
        </div>
      </div>

      {/* Simulation Controls Grid (2 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Card 1: Simular Asignación de Turno */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-secondary text-base">1. Simular Asignación de Turno</h3>
              <p className="text-xs text-gray-400">Asigna un turno de prueba al funcionario seleccionado.</p>
            </div>
          </div>

          <form onSubmit={handleAssignShiftSimulated} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-gray-500 uppercase block mb-1">Fecha del Turno *</label>
                <input 
                  type="date"
                  value={shiftDate}
                  onChange={e => setShiftDate(e.target.value)}
                  className="w-full input-field font-bold text-secondary"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-500 uppercase block mb-1">Tipo de Turno *</label>
                <select 
                  value={shiftType}
                  onChange={e => {
                    setShiftType(e.target.value);
                    if (e.target.value === 'turno1') setShiftHoras(15);
                    else if (e.target.value === 'turno2') setShiftHoras(12);
                    else if (e.target.value === 'turno3') setShiftHoras(12);
                  }}
                  className="w-full input-field font-bold text-secondary appearance-none"
                >
                  <option value="turno1">Turno 1 (Verde - 17:00 a 08:00h)</option>
                  <option value="turno2">Turno 2 (Amarillo - 08:00 a 20:00h)</option>
                  <option value="turno3">Turno 3 (Celeste - 20:00 a 08:00h)</option>
                  <option value="refuerzo">Turno 4 / Refuerzo (Púrpura - Horas custom)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-gray-500 uppercase block mb-1">Modalidad Liquidación *</label>
                <select 
                  value={shiftLiquidacion}
                  onChange={e => setShiftLiquidacion(e.target.value)}
                  className="w-full input-field font-bold text-secondary appearance-none"
                >
                  <option value="Honorario por horas">Honorario por horas</option>
                  <option value="Horas Extras (Plazo Fijo / Planta)">Horas Extras (Plazo Fijo / Planta)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-500 uppercase block mb-1">Horas a Computar *</label>
                <input 
                  type="number"
                  step="0.5"
                  value={shiftHoras}
                  onChange={e => setShiftHoras(e.target.value)}
                  className="w-full input-field font-bold text-secondary"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isAssigning}
              className="w-full btn-primary py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-primary/20"
            >
              {isAssigning ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
              + Asignar Turno de Prueba & Sumar Horas
            </button>
          </form>
        </div>

        {/* Card 2: Probar Flujo Real por Fuera */}
        <div className="bg-gradient-to-br from-primary/5 via-white to-primary/10 p-6 md:p-8 rounded-3xl border border-primary/20 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-primary/10 pb-4">
              <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center font-bold">
                <ArrowRight size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-secondary text-base">2. Probar Flujo Real por Fuera</h3>
                <p className="text-xs text-gray-500">Ejecuta las acciones directamente en las vistas reales del sistema.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 font-medium leading-relaxed">
              En este laboratorio asignas los turnos de prueba. Para verificar el funcionamiento real de cada categoría y función, realiza las acciones por fuera:
            </p>

            <ul className="space-y-2 text-xs font-bold text-secondary">
              <li className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-100 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>1. Confirmar turno:</span> <span className="text-gray-500 font-normal">Ve a <strong>"Mis Turnos"</strong> para confirmar y ver la pauta.</span>
              </li>
              <li className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-100 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                <span>2. Marcar asistencia:</span> <span className="text-gray-500 font-normal">Ve a <strong>"Mi Asistencia"</strong> para marcar Entrada o Salida.</span>
              </li>
              <li className="flex items-center gap-2 p-2 bg-white rounded-xl border border-gray-100 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>3. Verificar montos y PDF:</span> <span className="text-gray-500 font-normal">Ve a <strong>"Mis Honorarios"</strong> para ver el desglose en vivo.</span>
              </li>
            </ul>
          </div>

          <div className="p-3 bg-purple-100/70 border border-purple-300 rounded-2xl text-[11px] font-bold text-purple-900 flex items-center gap-2">
            <FlaskConical size={16} className="text-purple-600 shrink-0" />
            <span>Al estar el Modo Prueba activo (ON), todas las pantallas mostrarán el distintivo de simulación.</span>
          </div>
        </div>
      </div>

      {/* Section 3: Live Previsualización e Inclusión del Informe de Prestación */}
      {selectedFunc && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-secondary tracking-tight">
                3. Previsualización & Generación del Informe de Prestación de Servicios
              </h2>
              <p className="text-xs text-gray-500">
                Documento A4 en tiempo real para <strong>{selectedFunc.nombre}</strong> ({selectedFunc.rut}). Reacciona a los turnos y marcajes simulados.
              </p>
            </div>
          </div>

          {/* Component <InformeHonorariosPrint /> */}
          <InformeHonorariosPrint 
            funcionario={{
              nombre: selectedFunc.nombre,
              rut: selectedFunc.rut || selectedFunc.id,
              cargo: selectedFunc.tipoPrestador || 'Médico Cirujano',
              lugar: selectedFunc.centroAsignado || 'SAR Arpillerista Elsa Romo Aravena'
            }}
            periodo="JUNIO 2026"
            resumenHoras={resumenHoras}
            datosBancarios={selectedFunc.bancoData || {
              tipoCuenta: 'Cuenta Corriente',
              banco: 'Banco de Chile',
              numeroCuenta: '00-250-20799-00',
              telefono: '941234243',
              email: selectedFunc.correoInstitucional || 'correo@ejemplo.cl'
            }}
            allowEdit={true}
          />
        </div>
      )}

    </div>
  );
};

export default SimuladorPruebasView;
