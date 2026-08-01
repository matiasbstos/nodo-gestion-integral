import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  User, 
  Calendar, 
  CreditCard, 
  Activity, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  Clock, 
  ChevronRight,
  TrendingUp,
  RotateCcw,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import InformeHonorariosPrint from './InformeHonorariosPrint';
import { getInfoRolFuncion } from '../utils/escalaRemuneraciones';
import { logAuditAction } from '../utils/auditLogger';

const ACTIVIDADES_PREDEFINIDAS = [
  'CONTROL DE SIGNOS VITALES.',
  'TOMA DE ELECTROCARDIOGRAMAS.',
  'ADMINISTRACION DE MEDICAMENTOS VIA ORAL, IM, EV.',
  'CURACIONES.',
  'TRASLADOS DE PACIENTES CRITICOS A HOSPITAL SAN JOSE DE MELIPILLA.'
];

const MESES_LETRAS = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
];

const GeneradorManualPrestaciones = ({ userData, selectedFuncIdProp, onClearFuncIdProp }) => {
  // Lista de funcionarios cargados desde la base de datos
  const [funcionarios, setFuncionarios] = useState([]);
  const [loadingFuncs, setLoadingFuncs] = useState(true);
  const [selectedFuncId, setSelectedFuncId] = useState('');

  // Datos principales del informe
  const [nombre, setNombre] = useState('');
  const [rut, setRut] = useState('');
  const [cargo, setCargo] = useState('Médico Cirujano');
  const [lugar, setLugar] = useState('SAR Arpillerista Elsa Romo Aravena');
  const [periodoMes, setPeriodoMes] = useState(new Date().getMonth());
  const [periodoAnio, setPeriodoAnio] = useState(2026); // Por defecto el año actual en simulación

  // Tarifas
  const [valorHoraLuVi, setValorHoraLuVi] = useState(21000);
  const [valorHoraSaDoFest, setValorHoraSaDoFest] = useState(21000);

  // Datos Bancarios
  const [tipoCuenta, setTipoCuenta] = useState('Cuenta Corriente');
  const [banco, setBanco] = useState('Banco de Chile');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  // Actividades
  const [actividades, setActividades] = useState([...ACTIVIDADES_PREDEFINIDAS]);

  // Desglose de Turnos Manuales
  const [turnosManuales, setTurnosManuales] = useState([]);
  
  // Estado para el formulario de nuevo turno
  const [nuevoTurno, setNuevoTurno] = useState({
    fecha: '',
    centro: '',
    tipoJornada: 'Hábil', // 'Hábil' (Lu-Vi) o 'Inhábil' (Sa-Do-Fest)
    horas: 12
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar funcionarios desde Firestore
  useEffect(() => {
    const fetchFuncionarios = async () => {
      setLoadingFuncs(true);
      try {
        const q = query(collection(db, 'usuarios'), where('role', '==', 'user'));
        const snap = await getDocs(q);
        const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFuncionarios(list);
      } catch (err) {
        console.error("Error al cargar funcionarios:", err);
      } finally {
        setLoadingFuncs(false);
      }
    };
    fetchFuncionarios();
  }, []);

  // Escuchar si viene un funcionario preseleccionado
  useEffect(() => {
    if (selectedFuncIdProp && funcionarios.length > 0) {
      handleSelectFuncionario(selectedFuncIdProp);
      if (onClearFuncIdProp) onClearFuncIdProp();
    }
  }, [selectedFuncIdProp, funcionarios]);

  // Al seleccionar un funcionario de la lista
  const handleSelectFuncionario = (id) => {
    setSelectedFuncId(id);
    if (!id) {
      // Limpiar campos para ingreso manual
      setNombre('');
      setRut('');
      setCargo('Médico Cirujano');
      setLugar('SAR Arpillerista Elsa Romo Aravena');
      setValorHoraLuVi(21000);
      setValorHoraSaDoFest(21000);
      setTipoCuenta('Cuenta Corriente');
      setBanco('Banco de Chile');
      setNumeroCuenta('');
      setTelefono('');
      setEmail('');
      setTurnosManuales([]);
      return;
    }

    const func = funcionarios.find(f => f.id === id);
    if (func) {
      setNombre(func.nombre || '');
      setRut(func.rut || func.id || '');
      
      const userCargo = func.tipoPrestador || 'Médico Cirujano';
      setCargo(userCargo);
      
      const userLugar = func.centroAsignado || 'SAR Arpillerista Elsa Romo Aravena';
      setLugar(userLugar);

      // Calcular tarifas sugeridas según su cargo/categoría
      const infoRol = getInfoRolFuncion(userCargo);
      setValorHoraLuVi(func.valorHora || infoRol.valorHoraNormal || 21000);
      setValorHoraSaDoFest(func.valorHoraSaDoFest || infoRol.valorHoraFestivo || 21000);

      // Datos bancarios
      setTipoCuenta(func.tipoCuenta || 'Cuenta Corriente');
      setBanco(func.banco || 'Banco de Chile');
      setNumeroCuenta(func.numeroCuenta || '');
      setTelefono(func.telefono || '');
      setEmail(func.correoInstitucional || func.email || '');

      // Reiniciar lista de turnos y sugerir el centro
      setTurnosManuales([]);
      setNuevoTurno(prev => ({ ...prev, centro: userLugar }));
    }
  };

  // Detectar automáticamente el tipo de día al cambiar la fecha del nuevo turno
  const handleFechaChange = (fechaVal) => {
    if (!fechaVal) {
      setNuevoTurno(prev => ({ ...prev, fecha: '' }));
      return;
    }

    // Calcular día de la semana
    const dateObj = new Date(fechaVal + 'T12:00:00');
    const day = dateObj.getDay(); // 0 = Domingo, 6 = Sábado
    const isWeekend = (day === 0 || day === 6);

    setNuevoTurno(prev => ({
      ...prev,
      fecha: fechaVal,
      tipoJornada: isWeekend ? 'Inhábil' : 'Hábil'
    }));
  };

  // Agregar turno a la bitácora
  const handleAgregarTurno = (e) => {
    e.preventDefault();
    if (!nuevoTurno.fecha) {
      alert("Por favor seleccione una fecha para el turno.");
      return;
    }
    if (nuevoTurno.horas <= 0) {
      alert("Las horas deben ser mayores a cero.");
      return;
    }

    const tNormal = nuevoTurno.tipoJornada === 'Hábil' ? valorHoraLuVi : valorHoraSaDoFest;
    const itemTotal = nuevoTurno.horas * tNormal;

    const item = {
      id: Date.now().toString(),
      fecha: nuevoTurno.fecha,
      centro: nuevoTurno.centro || lugar || 'SAR Arpillerista',
      tipoJornada: nuevoTurno.tipoJornada,
      horas: Number(nuevoTurno.horas),
      tarifa: tNormal,
      total: itemTotal
    };

    setTurnosManuales(prev => {
      const updated = [...prev, item];
      return updated.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    });

    // Resetear formulario manteniendo centro
    setNuevoTurno(prev => ({
      ...prev,
      fecha: '',
      horas: 12
    }));
  };

  // Eliminar turno de la bitácora
  const handleEliminarTurno = (id) => {
    setTurnosManuales(prev => prev.filter(t => t.id !== id));
  };

  // Cambiar una actividad específica (1 a 5)
  const handleActividadChange = (index, value) => {
    setActividades(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  // Vaciar todos los turnos para comenzar de nuevo
  const handleLimpiarTurnos = () => {
    if (window.confirm("¿Está seguro de que desea borrar todos los turnos del desglose?")) {
      setTurnosManuales([]);
    }
  };

  // Cálculos dinámicos globales
  const horasLuVi = turnosManuales
    .filter(t => t.tipoJornada === 'Hábil')
    .reduce((acc, cur) => acc + cur.horas, 0);

  const horasSaDoFest = turnosManuales
    .filter(t => t.tipoJornada === 'Inhábil')
    .reduce((acc, cur) => acc + cur.horas, 0);

  const diasTrabajados = new Set(turnosManuales.map(t => t.fecha)).size;
  const totalMonto = Math.round((horasLuVi * valorHoraLuVi) + (horasSaDoFest * valorHoraSaDoFest));
  const retencionTotal = Math.round(totalMonto * 0.145);
  const totalNeto = totalMonto - retencionTotal;

  // Guardar el informe en la base de datos para registro
  const handleGuardarInforme = async () => {
    if (!nombre || !rut) {
      setErrorMsg("Debe especificar Nombre y RUT del funcionario para guardar el informe.");
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      const periodoStr = `${MESES_LETRAS[periodoMes]} ${periodoAnio}`;
      const payload = {
        funcionarioNombre: nombre,
        funcionarioRut: rut,
        funcionarioCargo: cargo,
        funcionarioLugar: lugar,
        periodo: periodoStr,
        fechaGuardado: new Date().toISOString(),
        resumenHoras: {
          valorHoraLuVi,
          horasLuVi,
          valorHoraSaDoFest,
          horasSaDoFest,
          valorMensual: totalMonto,
          diasTrabajados
        },
        datosBancarios: {
          tipoCuenta,
          banco,
          numeroCuenta,
          telefono,
          email
        },
        actividades,
        turnosDesglose: turnosManuales,
        creadoPor: userData?.nombre || 'Administrador'
      };

      await addDoc(collection(db, 'informes_prestaciones'), payload);

      await logAuditAction('INFORME_PRESTACION_MANUAL_GUARDADO', `Se guardó informe de prestación manual individual para ${nombre} (${periodoStr}) por un monto de $${totalMonto.toLocaleString('es-CL')}`, userData, { nombre, rut }, 'honorarios');

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Error al guardar informe:", err);
      setErrorMsg("Error al guardar en la base de datos: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const periodoNombreStr = `${MESES_LETRAS[periodoMes]} ${periodoAnio}`;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PANEL IZQUIERDO: Formulario de Configuración y Bitácora */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-secondary text-base">1. Datos del Funcionario y Período</h3>
                <p className="text-[11px] text-gray-400">Seleccione un funcionario o complete la ficha a mano.</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Selector de Funcionario */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Funcionario en Sistema</label>
                {loadingFuncs ? (
                  <div className="h-10 bg-gray-50 rounded-xl animate-pulse border border-gray-100" />
                ) : (
                  <select
                    value={selectedFuncId}
                    onChange={e => handleSelectFuncionario(e.target.value)}
                    className="w-full bg-tertiary border-none rounded-xl py-3 px-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">-- [Ingreso Manual / Nuevo Funcionario] --</option>
                    {funcionarios.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.nombre} ({f.rut || f.id}) - {f.tipoPrestador || 'Funcionario'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Ficha editable */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">RUT</label>
                  <input
                    type="text"
                    value={rut}
                    onChange={e => setRut(e.target.value)}
                    placeholder="Ej. 12.345.678-9"
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cargo</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={e => setCargo(e.target.value)}
                    placeholder="Ej. Médico Cirujano"
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Lugar de Prestación</label>
                  <input
                    type="text"
                    value={lugar}
                    onChange={e => setLugar(e.target.value)}
                    placeholder="Ej. SAR Arpillerista"
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {/* Período */}
              <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Mes del Informe</label>
                  <select
                    value={periodoMes}
                    onChange={e => setPeriodoMes(Number(e.target.value))}
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-bold text-secondary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {MESES_LETRAS.map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Año</label>
                  <select
                    value={periodoAnio}
                    onChange={e => setPeriodoAnio(Number(e.target.value))}
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-bold text-secondary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    {[2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tarifas */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor Hora Lu-Vi</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                    <input
                      type="number"
                      value={valorHoraLuVi}
                      onChange={e => setValorHoraLuVi(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-6 pr-3 text-xs font-mono font-bold text-secondary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor Hora Sa-Do-Fest</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                    <input
                      type="number"
                      value={valorHoraSaDoFest}
                      onChange={e => setValorHoraSaDoFest(Number(e.target.value))}
                      className="w-full bg-white border border-gray-200 rounded-xl py-2 pl-6 pr-3 text-xs font-mono font-bold text-secondary focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DATOS BANCARIOS */}
          <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-secondary text-base">2. Datos Bancarios para Transferencia</h3>
                <p className="text-[11px] text-gray-400">Requeridos para el pie de página de cobro.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Banco</label>
                  <input
                    type="text"
                    value={banco}
                    onChange={e => setBanco(e.target.value)}
                    placeholder="Banco Estado, de Chile, etc."
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo Cuenta</label>
                  <input
                    type="text"
                    value={tipoCuenta}
                    onChange={e => setTipoCuenta(e.target.value)}
                    placeholder="Corriente, Vista, RUT"
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Número de Cuenta</label>
                <input
                  type="text"
                  value={numeroCuenta}
                  onChange={e => setNumeroCuenta(e.target.value)}
                  placeholder="Número de cuenta bancaria"
                  className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="+56 9..."
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@servicios.cl"
                    className="w-full bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* DESGLOSE: Agregar Turnos */}
          <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-secondary text-base">3. Desglose de Turnos / Horas</h3>
                  <p className="text-[11px] text-gray-400">Agregue turnos individualmente a la bitácora.</p>
                </div>
              </div>
              {turnosManuales.length > 0 && (
                <button
                  type="button"
                  onClick={handleLimpiarTurnos}
                  className="text-rose-500 hover:text-rose-700 text-xs font-bold transition-colors"
                >
                  Vaciar Todo
                </button>
              )}
            </div>

            {/* Formulario de inserción de turno */}
            <form onSubmit={handleAgregarTurno} className="space-y-4 bg-[#F8FAFC] p-4 rounded-2xl border border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Fecha</label>
                  <input
                    type="date"
                    value={nuevoTurno.fecha}
                    onChange={e => handleFechaChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-secondary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Horas</label>
                  <input
                    type="number"
                    step="0.5"
                    value={nuevoTurno.horas}
                    onChange={e => setNuevoTurno(prev => ({ ...prev, horas: Number(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-secondary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tipo de Día (Auto)</label>
                  <select
                    value={nuevoTurno.tipoJornada}
                    onChange={e => setNuevoTurno(prev => ({ ...prev, tipoJornada: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-bold text-secondary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="Hábil">Hábil (Lu-Vi)</option>
                    <option value="Inhábil">Inhábil / Festivo (Sa-Do-Fest)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Centro/Servicio</label>
                  <input
                    type="text"
                    value={nuevoTurno.centro}
                    onChange={e => setNuevoTurno(prev => ({ ...prev, centro: e.target.value }))}
                    placeholder="Ej. SAR Arpillerista"
                    className="w-full bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs font-medium text-secondary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xs"
              >
                <Plus size={15} /> Agregar Turno al Informe
              </button>
            </form>

            {/* Lista de turnos agregados */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {turnosManuales.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-400 italic bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  Aún no se han agregado turnos al informe de este mes.
                </div>
              ) : (
                turnosManuales.map((turno) => (
                  <div 
                    key={turno.id} 
                    className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-2xl hover:border-gray-200 transition-all text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-bold text-secondary">
                        {new Date(turno.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })}
                      </p>
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px]">
                        <span className={`px-1.5 py-0.5 rounded-md ${
                          turno.tipoJornada === 'Inhábil' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        } font-bold`}>
                          {turno.tipoJornada}
                        </span>
                        <span>•</span>
                        <span>{turno.centro}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-extrabold text-secondary">{turno.horas} hrs</p>
                        <p className="text-[10px] text-gray-400 font-mono">${turno.total.toLocaleString('es-CL')}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEliminarTurno(turno.id)}
                        className="text-gray-300 hover:text-rose-500 p-1 transition-colors"
                        title="Eliminar turno"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ACTIVIDADES REALIZADAS */}
          <div className="bg-white p-6 rounded-3xl shadow-xs border border-gray-100 space-y-4">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-secondary text-base">4. Principales Actividades (Pág 2)</h3>
                <p className="text-[11px] text-gray-400">Enumere hasta 5 tareas para detallar en la prestación.</p>
              </div>
            </div>

            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map(idx => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-4">{idx + 1}.</span>
                  <input
                    type="text"
                    value={actividades[idx] || ''}
                    onChange={e => handleActividadChange(idx, e.target.value)}
                    placeholder={`Actividad ${idx + 1}`}
                    className="flex-1 bg-tertiary border-none rounded-xl py-2 px-3 text-xs font-medium text-secondary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ACCIONES DE GUARDADO */}
          <div className="space-y-3">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            
            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>¡Informe guardado con éxito en el historial! Se registró en auditoría.</span>
              </div>
            )}

            <button
              onClick={handleGuardarInforme}
              disabled={saving}
              className="w-full py-4 bg-secondary hover:bg-secondary-dark text-white rounded-2xl font-bold uppercase tracking-[2px] shadow-lg shadow-secondary/10 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Guardando Informe...' : 'Guardar Informe en Historial'}
            </button>
          </div>
        </div>

        {/* PANEL DERECHO: Previsualización en Tiempo Real */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Tarjeta de Resumen Rápido (Valores Proyectados) */}
          <div className="bg-gradient-to-br from-secondary to-secondary-light p-6 rounded-3xl text-white shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-6 relative overflow-hidden border border-white/5">
            <div className="absolute right-0 bottom-0 p-4 opacity-5 pointer-events-none">
              <TrendingUp size={160} />
            </div>
            
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumen Horas</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black">{horasLuVi + horasSaDoFest}</span>
                <span className="text-xs text-gray-300">hrs totales</span>
              </div>
              <p className="text-[10px] text-gray-300 mt-1 uppercase">
                {horasLuVi}h Hab / {horasSaDoFest}h Inh
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">Boleta de Honorarios (Monto Bruto)</p>
              <p className="text-2xl font-black text-white mt-1">${totalMonto.toLocaleString('es-CL')}</p>
              <p className="text-[10px] text-rose-300 mt-1 uppercase font-mono">
                SII (14.5%): -${retencionTotal.toLocaleString('es-CL')}
              </p>
            </div>

            <div className="sm:border-l border-white/10 sm:pl-6">
              <p className="text-[10px] font-bold text-primary-light uppercase tracking-widest">Líquido Neto a Recibir</p>
              <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">${totalNeto.toLocaleString('es-CL')}</p>
              <p className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md inline-block mt-1 font-bold uppercase tracking-wider">
                {diasTrabajados} días trabajados
              </p>
            </div>
          </div>

          {/* Componente de Impresión/Previsualización */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2 overflow-x-auto min-w-[220mm] md:min-w-0">
            <InformeHonorariosPrint
              funcionario={{
                nombre,
                rut,
                cargo,
                lugar
              }}
              periodo={periodoNombreStr}
              resumenHoras={{
                valorHoraLuVi,
                horasLuVi,
                valorHoraSaDoFest,
                horasSaDoFest,
                valorMensual: totalMonto,
                diasTrabajados
              }}
              datosBancarios={{
                tipoCuenta,
                banco,
                numeroCuenta,
                telefono,
                email
              }}
              actividades={actividades}
              allowEdit={true}
              onSaveData={(formData) => {
                setNombre(formData.funcionarioNombre);
                setRut(formData.funcionarioRut);
                setCargo(formData.funcionarioCargo);
                setLugar(formData.funcionarioLugar);
                setValorHoraLuVi(formData.valorHoraLuVi);
                setHorasLuVi(formData.horasLuVi);
                setValorHoraSaDoFest(formData.valorHoraSaDoFest);
                setHorasSaDoFest(formData.horasSaDoFest);
                setTipoCuenta(formData.tipoCuenta);
                setBanco(formData.banco);
                setNumeroCuenta(formData.numeroCuenta);
                setTelefono(formData.telefono);
                setEmail(formData.email);
                setActividades([
                  formData.actividad1,
                  formData.actividad2,
                  formData.actividad3,
                  formData.actividad4,
                  formData.actividad5
                ]);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneradorManualPrestaciones;
