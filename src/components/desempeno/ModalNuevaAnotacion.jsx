import React, { useState } from 'react';
import { 
  X, 
  Award, 
  Clock, 
  UserX, 
  AlertTriangle, 
  FileText, 
  Calendar, 
  Send, 
  Loader2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TIPOS_ANOTACION, agregarAnotacion } from '../../services/hojaVidaService';

/**
 * ModalNuevaAnotacion
 * Modal de registro rápido de anotaciones para Hoja de Vida
 */
const ModalNuevaAnotacion = ({
  isOpen,
  onClose,
  funcionarioSeleccionado,
  listaFuncionarios = [],
  currentUser,
  onAnotacionCreada
}) => {
  const [selectedFuncionarioId, setSelectedFuncionarioId] = useState(
    funcionarioSeleccionado?.id || funcionarioSeleccionado?.rut || ''
  );
  const [tipo, setTipo] = useState('felicitacion');
  const [fechaEvento, setFechaEvento] = useState(new Date().toISOString().split('T')[0]);
  const [descripcion, setDescripcion] = useState('');
  const [gravedad, setGravedad] = useState('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Encontrar datos del funcionario
  const funcionarioActual = listaFuncionarios.find(
    f => f.id === selectedFuncionarioId || f.rut === selectedFuncionarioId
  ) || funcionarioSeleccionado;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedFuncionarioId) {
      setError('Por favor seleccione el funcionario al cual registrar la anotación.');
      return;
    }

    if (!descripcion.trim()) {
      setError('Por favor redacte una descripción o detalle del hecho.');
      return;
    }

    if (descripcion.trim().length < 10) {
      setError('La descripción debe contener al menos 10 caracteres con fundamento.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        funcionarioId: selectedFuncionarioId,
        funcionarioNombre: funcionarioActual?.nombre || 'Funcionario',
        funcionarioRut: funcionarioActual?.rut || selectedFuncionarioId,
        tipo,
        fechaEvento,
        descripcion: descripcion.trim(),
        gravedad
      };

      const resultado = await agregarAnotacion(payload, currentUser);
      if (onAnotacionCreada) {
        onAnotacionCreada(resultado);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al guardar la anotación en la base de datos.');
    } finally {
      setLoading(false);
    }
  };

  const setFechaPreset = (diasAtras) => {
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    setFechaEvento(d.toISOString().split('T')[0]);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" 
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden animate-scale-in">
        
        {/* Encabezado */}
        <div className="p-6 pb-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">
                Registrar Anotación en Hoja de Vida
              </h2>
              <p className="text-xs text-slate-500">
                Registro formal de desempeño para la Directora Técnica y Enfermería Jefe
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Funcionario (si no está fijo) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Funcionario Involucrado
            </label>
            {funcionarioSeleccionado ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-slate-800">{funcionarioSeleccionado.nombre}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    RUT: {funcionarioSeleccionado.rut} • {funcionarioSeleccionado.cargo || 'Funcionario SAR'}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                  Fijado
                </span>
              </div>
            ) : (
              <select
                value={selectedFuncionarioId}
                onChange={(e) => setSelectedFuncionarioId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              >
                <option value="">-- Seleccionar Funcionario --</option>
                {listaFuncionarios.map((f) => (
                  <option key={f.id || f.rut} value={f.id || f.rut}>
                    {f.nombre} ({f.rut}) - {f.cargo}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo de Anotación (Pills semánticos interactivos) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tipo de Anotación
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {Object.entries(TIPOS_ANOTACION).map(([key, item]) => {
                const isSelected = tipo === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTipo(key)}
                    className={`flex items-start gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? `${item.badgeClass} ring-2 ring-offset-1 font-bold shadow-sm`
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {key === 'felicitacion' && <Award size={18} strokeWidth={1.5} />}
                      {key === 'retraso' && <Clock size={18} strokeWidth={1.5} />}
                      {key === 'ausencia' && <UserX size={18} strokeWidth={1.5} />}
                      {key === 'falta_protocolo' && <AlertTriangle size={18} strokeWidth={1.5} />}
                      {key === 'nota_desempeno' && <FileText size={18} strokeWidth={1.5} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight truncate">{item.shortLabel}</p>
                      <p className="text-[10px] text-slate-400 font-normal leading-tight mt-0.5 line-clamp-1">
                        {item.impacto}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fecha del Hecho con atajos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Fecha del Evento
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={fechaEvento}
                  onChange={(e) => setFechaEvento(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFechaPreset(0)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold"
                >
                  Hoy
                </button>
                <button
                  type="button"
                  onClick={() => setFechaPreset(1)}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold"
                >
                  Ayer
                </button>
              </div>
            </div>

            {/* Nivel de Gravedad / Impacto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Nivel / Severidad
              </label>
              <select
                value={gravedad}
                onChange={(e) => setGravedad(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="normal">Estándar / Formativa</option>
                <option value="leve">Leve (Amonestación verbal)</option>
                <option value="moderada">Moderada (Amonestación escrita)</option>
                <option value="grave">Grave (Anotación formal de demérito)</option>
              </select>
            </div>
          </div>

          {/* Descripción / Relato */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Descripción Detallada del Evento
              </label>
              <span className="text-[11px] text-slate-400">
                {descripcion.length} caracteres
              </span>
            </div>
            <textarea
              rows={4}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describa los hechos ocurridos de forma objetiva, indicando horario, circunstancias, turno o protocolo asociado..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary leading-relaxed"
              required
            />
          </div>

          {/* Footer / Botones */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Guardar Anotación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalNuevaAnotacion;
