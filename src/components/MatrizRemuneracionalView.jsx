import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Save, 
  Edit2, 
  X, 
  History, 
  Loader2, 
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Info,
  CheckCircle2,
  Check,
  Sparkles,
  Zap,
  RefreshCw
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  writeBatch, 
  orderBy, 
  where
} from 'firebase/firestore';
import { logAuditAction } from '../utils/auditLogger';
import { ESCALA_HONORARIOS_SAR } from '../utils/escalaRemuneraciones';

const categories = [
  { id: 'A', label: 'Cat A', full: 'Médicos, Odontólogos' },
  { id: 'B', label: 'Cat B', full: 'Enfermeras, Kinesiólogos, Matronas' },
  { id: 'C', label: 'Cat C', full: 'TENS (Téc. Nivel Superior)' },
  { id: 'D', label: 'Cat D', full: 'Técnicos de Salud' },
  { id: 'E', label: 'Cat E', full: 'Administrativos' },
  { id: 'F', label: 'Cat F', full: 'Auxiliares, Choferes' }
];

const MatrizRemuneracionalView = ({ userData }) => {
  const isAdmin = userData?.role === 'admin_global';
  const [activeTab, setActiveTab] = useState('A');
  const [matriz, setMatriz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);

  // History modal state
  const [showHistory, setShowHistory] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Centered Saved Notification Modal State
  const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
  const [savedDetails, setSavedDetails] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Generate Levels 15 to 1
  const levels = Array.from({ length: 15 }, (_, i) => 15 - i);

  useEffect(() => {
    fetchMatriz();
  }, [activeTab]);

  const fetchMatriz = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'matriz_honorarios'), 
        where('categoria', '==', activeTab),
        orderBy('nivel', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const baseRates = ESCALA_HONORARIOS_SAR[activeTab] || ESCALA_HONORARIOS_SAR.A;

      if (querySnapshot.empty) {
        // Auto-populate default base rates if empty
        const initialData = levels.map(level => ({
          id: `${activeTab}_${level}`,
          categoria: activeTab,
          nivel: level,
          valorHabil: baseRates.valorHoraNormal,
          valorInhabil: baseRates.valorHoraFestivo
        }));
        setMatriz(initialData);
      } else {
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // If all docs currently have $0, fill with base rates for testing
        const allZero = docs.every(d => !d.valorHabil && !d.valorInhabil);
        if (allZero) {
          const filledData = docs.map(d => ({
            ...d,
            valorHabil: d.valorHabil || baseRates.valorHoraNormal,
            valorInhabil: d.valorInhabil || baseRates.valorHoraFestivo
          }));
          setMatriz(filledData);
        } else {
          setMatriz(docs);
        }
      }
    } catch (err) {
      console.error("Error fetching matriz:", err);
      
      const baseRates = ESCALA_HONORARIOS_SAR[activeTab] || ESCALA_HONORARIOS_SAR.A;
      const matrizPorDefecto = levels.map(level => ({
        id: `${activeTab}_${level}`,
        categoria: activeTab,
        nivel: level,
        valorHabil: baseRates.valorHoraNormal,
        valorInhabil: baseRates.valorHoraFestivo
      }));
      
      setMatriz(matrizPorDefecto);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row) => {
    if (!isAdmin) return;
    setEditingId(row.id);
    setEditData({ ...row });
  };

  const handleSave = async () => {
    if (!isAdmin || !editData) return;
    
    setSaving(true);
    setErrorMessage(null);

    const original = matriz.find(m => m.id === editingId) || {};
    const batch = writeBatch(db);

    try {
      const userEmail = userData?.correoInstitucional || userData?.correo || userData?.email || 'admin@nodo.cl';
      const userName = userData?.nombre || userData?.displayName || 'Administrador Global';
      const userRole = userData?.role || 'admin_global';

      const habilVal = Number(editData.valorHabil) || 0;
      const inhabilVal = Number(editData.valorInhabil) || 0;

      // Update matriz_honorarios
      const matrizRef = doc(db, 'matriz_honorarios', editingId);
      batch.set(matrizRef, {
        id: editingId,
        categoria: activeTab,
        nivel: Number(editData.nivel),
        valorHabil: habilVal,
        valorInhabil: inhabilVal,
        updatedAt: new Date().toISOString(),
        updatedBy: userEmail
      }, { merge: true });

      // Add to history log
      const historyRef = doc(collection(db, 'historial_tarifas_maestras'));
      batch.set(historyRef, {
        fecha_cambio: new Date().toISOString(),
        categoria: activeTab,
        nivel: Number(editData.nivel),
        montos_anteriores: {
          habil: Number(original.valorHabil) || 0,
          inhabil: Number(original.valorInhabil) || 0
        },
        montos_nuevos: {
          habil: habilVal,
          inhabil: inhabilVal
        },
        modificado_por: {
          email: userEmail,
          nombre: userName,
          role: userRole
        }
      });

      await batch.commit();

      // Log to Audit Logger
      await logAuditAction(db, {
        usuario: userData,
        accion: 'MODIFICACION_MATRIZ_HONORARIOS',
        detalles: `Tarifa actualizada para Categoría ${activeTab} (Nivel ${editData.nivel}): Hora Hábil $${habilVal.toLocaleString()}, Hora Inhábil $${inhabilVal.toLocaleString()}`,
        categoria: 'honorarios'
      });

      // Update local state
      setMatriz(prev => prev.map(m => m.id === editingId ? { 
        ...editData, 
        valorHabil: habilVal, 
        valorInhabil: inhabilVal 
      } : m));

      setSavedDetails({
        categoria: activeTab,
        categoriaFull: categories.find(c => c.id === activeTab)?.full || activeTab,
        nivel: editData.nivel,
        valorHabil: habilVal,
        valorInhabil: inhabilVal
      });
      setShowSaveSuccessModal(true);

      setEditingId(null);
      setEditData(null);
    } catch (err) {
      console.error("Error saving batch:", err);
      setErrorMessage(err.message || "Ocurrió un error al guardar las tarifas en la base de datos.");
    } finally {
      setSaving(false);
    }
  };

  // Auto-Fill Base Rates for Current Category
  const handleAutoFillCategory = async () => {
    if (!isAdmin) return;
    const baseRates = ESCALA_HONORARIOS_SAR[activeTab] || ESCALA_HONORARIOS_SAR.A;
    const userEmail = userData?.correoInstitucional || userData?.correo || userData?.email || 'admin@nodo.cl';

    setSaving(true);
    setErrorMessage(null);
    try {
      const batch = writeBatch(db);
      const updatedRows = levels.map(level => {
        const docId = `${activeTab}_${level}`;
        const rowRef = doc(db, 'matriz_honorarios', docId);
        const rowData = {
          id: docId,
          categoria: activeTab,
          nivel: level,
          valorHabil: baseRates.valorHoraNormal,
          valorInhabil: baseRates.valorHoraFestivo,
          updatedAt: new Date().toISOString(),
          updatedBy: userEmail
        };
        batch.set(rowRef, rowData, { merge: true });
        return rowData;
      });

      await batch.commit();

      await logAuditAction(db, {
        usuario: userData,
        accion: 'AUTORRELLENADO_TARIFAS_BASE',
        detalles: `Autorrellenado de tarifas Ley 19.378 para Cat ${activeTab} (${baseRates.descripcion}): Hábil $${baseRates.valorHoraNormal.toLocaleString()}, Inhábil $${baseRates.valorHoraFestivo.toLocaleString()}`,
        categoria: 'honorarios'
      });

      setMatriz(updatedRows);

      setSavedDetails({
        categoria: activeTab,
        categoriaFull: baseRates.descripcion,
        nivel: 'Niveles 15 al 1 (Todas las escalas)',
        valorHabil: baseRates.valorHoraNormal,
        valorInhabil: baseRates.valorHoraFestivo
      });
      setShowSaveSuccessModal(true);
    } catch (err) {
      console.error("Error autofilling category:", err);
      setErrorMessage("Error al autorrellenar la categoría: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Auto-Fill ALL Categories (A to F)
  const handleAutoFillAllCategories = async () => {
    if (!isAdmin) return;
    if (!window.confirm("¿Estás seguro de que deseas autorrellenar TODAS las categorías (de la A a la F) con la escala referencial Ley 19.378?")) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      const batch = writeBatch(db);
      const userEmail = userData?.correoInstitucional || userData?.correo || userData?.email || 'admin@nodo.cl';

      Object.keys(ESCALA_HONORARIOS_SAR).forEach(catKey => {
        const baseRates = ESCALA_HONORARIOS_SAR[catKey];
        levels.forEach(level => {
          const docId = `${catKey}_${level}`;
          const rowRef = doc(db, 'matriz_honorarios', docId);
          batch.set(rowRef, {
            id: docId,
            categoria: catKey,
            nivel: level,
            valorHabil: baseRates.valorHoraNormal,
            valorInhabil: baseRates.valorHoraFestivo,
            updatedAt: new Date().toISOString(),
            updatedBy: userEmail
          }, { merge: true });
        });
      });

      await batch.commit();

      await logAuditAction(db, {
        usuario: userData,
        accion: 'AUTORRELLENADO_COMPLETO_MATRIZ',
        detalles: 'Autorrellenado global de todas las categorías (A a F) con tarifas Ley 19.378',
        categoria: 'honorarios'
      });

      await fetchMatriz();

      const currentBase = ESCALA_HONORARIOS_SAR[activeTab];
      setSavedDetails({
        categoria: 'TODAS (A a F)',
        categoriaFull: 'Médicos, Profesionales, TENS, Téc. Salud, Administrativos, Auxiliares',
        nivel: '15 al 1 (Todas las escalas)',
        valorHabil: currentBase.valorHoraNormal,
        valorInhabil: currentBase.valorHoraFestivo
      });
      setShowSaveSuccessModal(true);
    } catch (err) {
      console.error("Error autofilling all categories:", err);
      setErrorMessage("Error al autorrellenar la matriz global: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const fetchHistory = async (nivel) => {
    setShowHistory(nivel);
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'historial_tarifas_maestras'), 
        where('categoria', '==', activeTab),
        where('nivel', '==', nivel),
        orderBy('fecha_cambio', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistoryLogs(logs);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const currentCatInfo = ESCALA_HONORARIOS_SAR[activeTab] || ESCALA_HONORARIOS_SAR.A;

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[#F8FAFC] font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#1E293B] tracking-tight">Motor de Honorarios APS</h1>
            <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-wider">
              Ley 19.378
            </span>
          </div>
          <p className="text-gray-500 mt-1 text-sm">Configuración matricial basada en Categoría Ley 19.378 y Nivel para Turnos SAR.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <>
              <button 
                onClick={handleAutoFillCategory}
                disabled={saving}
                className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                title="Rellenar niveles de esta categoría con tarifa base Ley 19.378"
              >
                <Zap size={16} className="text-amber-600 fill-amber-500" />
                Autorrellenar Cat {activeTab} (${currentCatInfo.valorHoraNormal.toLocaleString()}/hr)
              </button>

              <button 
                onClick={handleAutoFillAllCategories}
                disabled={saving}
                className="btn-primary py-2.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-md shadow-primary/20"
                title="Rellenar todas las categorías A-F con la escala estimada"
              >
                <Sparkles size={16} />
                Autorrellenar Matriz Global (A a F)
              </button>
            </>
          )}

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-2xl border border-gray-100 shrink-0">
            <ShieldCheck size={18} className={isAdmin ? "text-emerald-500" : "text-gray-300"} />
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              {isAdmin ? "Admin Habilitado" : "Vista Lectura"}
            </span>
          </div>
        </div>
      </div>

      {/* Error Alert Message */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center justify-between font-medium text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 font-bold hover:underline">
            Desestimar
          </button>
        </div>
      )}

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100/70 rounded-3xl w-fit">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveTab(cat.id);
              setEditingId(null);
            }}
            className={`px-6 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-2.5 ${
              activeTab === cat.id 
                ? 'bg-white text-primary shadow-md shadow-primary/10 scale-[1.02]' 
                : 'text-gray-500 hover:text-secondary'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === cat.id ? 'bg-primary' : 'bg-gray-300'}`}></span>
            {cat.label}
            <span className="text-[10px] opacity-60 font-medium">({cat.full})</span>
          </button>
        ))}
      </div>

      {/* Info Banner for Selected Category */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center font-bold text-lg">
            {activeTab}
          </div>
          <div>
            <h3 className="font-bold text-secondary text-sm">
              Categoría {activeTab} — {currentCatInfo.descripcion}
            </h3>
            <p className="text-xs text-gray-500">
              Tarifa estimada referencial SAR: <strong className="text-emerald-600 font-mono font-bold">${currentCatInfo.valorHoraNormal.toLocaleString()} / hr</strong> (Hora Hábil e Inhábil).
            </p>
          </div>
        </div>

        {isAdmin && (
          <button 
            onClick={handleAutoFillCategory}
            className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1 self-start md:self-auto"
          >
            <Zap size={14} className="text-amber-500 fill-amber-400" />
            Rellenar Nivel 15 al 1 con ${currentCatInfo.valorHoraNormal.toLocaleString()}
          </button>
        )}
      </div>

      {/* Main Matrix Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-8 py-5">Nivel / Grado</th>
                <th className="px-8 py-5 text-right">Valor Hora Hábil</th>
                <th className="px-8 py-5 text-right">Valor Hora Inhábil / Festivo</th>
                <th className="px-8 py-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-primary mb-2" size={32} />
                    <p className="text-gray-400 font-medium tracking-wide">Cargando matriz de tarifas...</p>
                  </td>
                </tr>
              ) : matriz.map(row => (
                <tr key={row.id} className={`transition-all ${editingId === row.id ? 'bg-primary/5' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold border transition-colors ${
                        editingId === row.id ? 'bg-primary text-white border-primary shadow-md' : 'bg-gray-50 text-secondary border-gray-200'
                      }`}>
                        {row.nivel}
                      </div>
                      <div>
                        <p className="font-bold text-secondary text-sm">Nivel {row.nivel}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Escala Salarial APS</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-8 py-5 text-right font-mono font-bold">
                    {editingId === row.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-primary text-xs font-bold">$</span>
                        <input 
                          type="number" 
                          value={editData.valorHabil}
                          onChange={(e) => setEditData({...editData, valorHabil: e.target.value})}
                          className="w-36 bg-white border-2 border-primary/40 rounded-xl py-2 px-3 text-right text-primary font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-secondary text-base font-bold">
                        ${(row.valorHabil || currentCatInfo.valorHoraNormal)?.toLocaleString()}
                      </span>
                    )}
                  </td>

                  <td className="px-8 py-5 text-right font-mono font-bold">
                    {editingId === row.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-primary text-xs font-bold">$</span>
                        <input 
                          type="number" 
                          value={editData.valorInhabil}
                          onChange={(e) => setEditData({...editData, valorInhabil: e.target.value})}
                          className="w-36 bg-white border-2 border-primary/40 rounded-xl py-2 px-3 text-right text-primary font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-secondary text-base font-bold">
                        ${(row.valorInhabil || currentCatInfo.valorHoraFestivo)?.toLocaleString()}
                      </span>
                    )}
                  </td>

                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === row.id ? (
                        <>
                          <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md transition-all flex items-center justify-center disabled:opacity-50"
                            title="Guardar Cambios"
                          >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            disabled={saving}
                            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl transition-all"
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          {isAdmin && (
                            <button 
                              onClick={() => handleEdit(row)}
                              className="p-2.5 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all group"
                              title="Editar Nivel"
                            >
                              <Edit2 size={18} className="transition-transform group-hover:scale-110" />
                            </button>
                          )}
                          <button 
                            onClick={() => fetchHistory(row.nivel)}
                            className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-secondary hover:text-white transition-all group"
                            title="Ver Historial"
                          >
                            <History size={18} className="transition-transform group-hover:rotate-[-45deg]" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════
          CENTERED SAVED NOTIFICATION MODAL (Identidad Visual de la Plataforma)
         ════════════════════════════════════════════════════════════════════════════ */}
      {showSaveSuccessModal && savedDetails && (
        <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[36px] shadow-2xl p-8 text-center border border-gray-100 animate-scale-up space-y-6">
            
            {/* Animated Glowing Checkmark Icon */}
            <div className="w-20 h-20 bg-emerald-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
              <CheckCircle2 size={40} />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-secondary tracking-tight">
                ¡Matriz de Tarifas Actualizada!
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Las nuevas tarifas referenciales Ley 19.378 se guardaron exitosamente en la base de datos y fueron auditadas.
              </p>
            </div>

            {/* Change Summary Box */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs space-y-2 font-medium">
              <div className="flex justify-between items-center text-gray-500">
                <span>Categoría Afectada:</span>
                <span className="font-bold text-secondary">
                  Cat {savedDetails.categoria} ({savedDetails.categoriaFull})
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Escala de Niveles:</span>
                <span className="font-bold text-secondary">{savedDetails.nivel}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500 pt-1 border-t border-gray-200/60">
                <span>Valor Hora Hábil:</span>
                <span className="font-black text-emerald-600 font-mono text-sm">${savedDetails.valorHabil.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-gray-500">
                <span>Valor Hora Inhábil:</span>
                <span className="font-black text-emerald-600 font-mono text-sm">${savedDetails.valorInhabil.toLocaleString()}</span>
              </div>
            </div>

            {/* Action Confirm Button */}
            <button
              onClick={() => setShowSaveSuccessModal(false)}
              className="w-full btn-primary py-4 text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Entendido / Continuar
            </button>

          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-scale-up border border-white/20">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30">
                  <Clock size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-secondary tracking-tight">Trazabilidad Financiera</h2>
                  <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5 font-semibold">
                    Categoría <span className="text-primary font-bold">{activeTab}</span> 
                    <ChevronRight size={14} className="text-gray-300" />
                    Nivel <span className="text-primary font-bold">{showHistory}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(null)}
                className="p-3 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-secondary"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="p-16 text-center">
                  <Loader2 className="animate-spin mx-auto text-primary mb-3" size={36} />
                  <p className="text-gray-400 font-bold uppercase tracking-wider text-xs">Sincronizando Bitácora...</p>
                </div>
              ) : historyLogs.length > 0 ? (
                <div className="divide-y divide-gray-100 text-xs">
                  {historyLogs.map((log, idx) => (
                    <div key={log.id} className="p-6 md:p-8 hover:bg-gray-50/50 transition-colors space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary/5 border border-secondary/10 flex items-center justify-center text-secondary font-black text-sm">
                            #{idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-secondary text-sm">{log.modificado_por?.nombre || log.modificado_por?.email || 'Administrador'}</p>
                            <p className="text-xs text-gray-400 font-mono">
                              {log.fecha_cambio ? new Date(log.fecha_cambio).toLocaleString('es-CL') : 'Fecha no especificada'}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold uppercase tracking-wider rounded-full">
                          Validado
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Estado Histórico Anterior</p>
                          <div className="flex justify-between">
                            <span className="text-gray-500 font-medium">Valor Hábil:</span>
                            <span className="font-bold text-secondary line-through opacity-50">${log.montos_anteriores?.habil?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 font-medium">Valor Inhábil:</span>
                            <span className="font-bold text-secondary line-through opacity-50">${log.montos_anteriores?.inhabil?.toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="space-y-2 p-4 bg-primary/5 rounded-2xl border border-primary/15 relative overflow-hidden">
                          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Nueva Tarifa Registrada</p>
                          <div className="flex justify-between relative z-10">
                            <span className="text-gray-500 font-medium">Valor Hábil:</span>
                            <span className="font-black text-primary text-base">${log.montos_nuevos?.habil?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between relative z-10">
                            <span className="text-gray-500 font-medium">Valor Inhábil:</span>
                            <span className="font-black text-primary text-base">${log.montos_nuevos?.inhabil?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <History size={32} />
                  </div>
                  <p className="text-secondary font-bold text-base">Sin historial registrado</p>
                  <p className="text-gray-400 text-xs mt-1">No se han detectado modificaciones previas para este nivel.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowHistory(null)}
                className="btn-primary py-3 px-8 text-xs uppercase font-bold"
              >
                Cerrar Bitácora
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MatrizRemuneracionalView;
