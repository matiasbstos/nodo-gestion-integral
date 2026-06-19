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
  Info
} from 'lucide-react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  writeBatch, 
  orderBy, 
  where,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

const categories = [
  { id: 'A', label: 'Cat A', full: 'Médicos' },
  { id: 'B', label: 'Cat B', full: 'Profesionales' },
  { id: 'C', label: 'Cat C', full: 'TENS' },
  { id: 'D', label: 'Cat D', full: 'Téc. Salud' },
  { id: 'E', label: 'Cat E', full: 'Administrativos' },
  { id: 'F', label: 'Cat F', full: 'Auxiliares' }
];

const MatrizRemuneracionalView = ({ userData }) => {
  const isAdmin = userData?.role === 'admin_global';
  const [activeTab, setActiveTab] = useState('A');
  const [matriz, setMatriz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
      
      if (querySnapshot.empty) {
        // Initialize with 0 values if empty
        const initialData = levels.map(level => ({
          id: `${activeTab}_${level}`,
          categoria: activeTab,
          nivel: level,
          valorHabil: 0,
          valorInhabil: 0
        }));
        setMatriz(initialData);
      } else {
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMatriz(docs);
      }
    } catch (err) {
      console.error("Error fetching matriz:", err);
      
      // FORZAR DATOS POR DEFECTO SI FIREBASE FALLA O LA COLECCIÓN NO EXISTE (Fallback)
      const matrizPorDefecto = levels.map(level => ({
        id: `${activeTab}_${level}`,
        categoria: activeTab,
        nivel: level,
        valorHabil: 0,
        valorInhabil: 0
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
    
    const original = matriz.find(m => m.id === editingId);
    const batch = writeBatch(db);

    try {
      // Acción A: Actualización de Montos
      const matrizRef = doc(db, 'matriz_honorarios', editingId);
      batch.set(matrizRef, {
        ...editData,
        updatedAt: serverTimestamp(),
        updatedBy: userData.email
      }, { merge: true });

      // Acción B: Registro en Historial
      const historyRef = doc(collection(db, 'historial_tarifas_maestras'));
      batch.set(historyRef, {
        fecha_cambio: serverTimestamp(),
        categoria: activeTab,
        nivel: editData.nivel,
        montos_anteriores: {
          habil: original.valorHabil,
          inhabil: original.valorInhabil
        },
        montos_nuevos: {
          habil: Number(editData.valorHabil),
          inhabil: Number(editData.valorInhabil)
        },
        modificado_por: {
          email: userData.email,
          nombre: userData.nombre,
          role: userData.role
        }
      });

      await batch.commit();

      setMatriz(prev => prev.map(m => m.id === editingId ? { ...editData, valorHabil: Number(editData.valorHabil), valorInhabil: Number(editData.valorInhabil) } : m));
      setEditingId(null);
      setEditData(null);
    } catch (err) {
      console.error("Error saving batch:", err);
      alert("Error al procesar la transacción financiera.");
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

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">Motor de Honorarios APS</h1>
          <p className="text-gray-500 mt-1">Configuración matricial basada en Categoría Ley 19.378 y Nivel.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <ShieldCheck size={20} className={isAdmin ? "text-success" : "text-gray-300"} />
          <span className="text-xs font-bold uppercase tracking-widest text-secondary">
            {isAdmin ? "Acceso Administrativo" : "Vista de Lectura"}
          </span>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-tertiary rounded-3xl w-fit">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setActiveTab(cat.id);
              setEditingId(null);
            }}
            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 ${
              activeTab === cat.id 
                ? 'bg-white text-primary shadow-lg shadow-primary/10' 
                : 'text-gray-400 hover:text-secondary'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${activeTab === cat.id ? 'bg-primary' : 'bg-gray-300'}`}></span>
            {cat.label}
            <span className="text-[10px] opacity-60 font-medium">({cat.full})</span>
          </button>
        ))}
      </div>

      {/* Main Matrix Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-[#F8FAFC]/50 flex items-center gap-3">
          <Info size={18} className="text-primary" />
          <p className="text-xs text-gray-500 font-medium">
            Los valores editados impactarán en el cálculo de honorarios para todos los funcionarios de <span className="font-bold text-secondary">{categories.find(c => c.id === activeTab).full}</span>.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-8 py-5">Nivel / Grado</th>
                <th className="px-8 py-5 text-right">Valor Hora Hábil</th>
                <th className="px-8 py-5 text-right">Valor Hora Inhábil</th>
                <th className="px-8 py-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-primary mb-2" size={32} />
                    <p className="text-gray-400 font-medium tracking-wide">Actualizando matriz de datos...</p>
                  </td>
                </tr>
              ) : matriz.map(row => (
                <tr key={row.id} className={`transition-all ${editingId === row.id ? 'bg-primary/5' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border transition-colors ${
                        editingId === row.id ? 'bg-primary text-white border-primary' : 'bg-tertiary text-secondary border-gray-100'
                      }`}>
                        {row.nivel}
                      </div>
                      <div>
                        <p className="font-bold text-secondary">Nivel {row.nivel}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Escala Salarial APS</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-mono font-bold">
                    {editingId === row.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-primary text-xs">$</span>
                        <input 
                          type="number" 
                          value={editData.valorHabil}
                          onChange={(e) => setEditData({...editData, valorHabil: e.target.value})}
                          className="w-32 bg-white border border-gray-200 rounded-xl py-2 px-3 text-right text-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    ) : (
                      <span className="text-secondary text-lg">${row.valorHabil?.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right font-mono font-bold">
                    {editingId === row.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-primary text-xs">$</span>
                        <input 
                          type="number" 
                          value={editData.valorInhabil}
                          onChange={(e) => setEditData({...editData, valorInhabil: e.target.value})}
                          className="w-32 bg-white border border-gray-200 rounded-xl py-2 px-3 text-right text-primary focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    ) : (
                      <span className="text-secondary text-lg">${row.valorInhabil?.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === row.id ? (
                        <>
                          <button 
                            onClick={handleSave}
                            className="p-2.5 bg-success text-white rounded-xl hover:shadow-lg hover:shadow-success/20 transition-all"
                            title="Guardar Cambios"
                          >
                            <Save size={18} />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-2.5 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all"
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
                            className="p-2.5 bg-tertiary text-gray-400 rounded-xl hover:bg-secondary hover:text-white transition-all group"
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

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-secondary/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden animate-scale-up border border-white/20">
            <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#F8FAFC] to-white">
              <div className="flex items-center gap-5">
                <div className="bg-primary w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/30">
                  <Clock size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-secondary tracking-tight">Trazabilidad Financiera</h2>
                  <p className="text-gray-500 flex items-center gap-2 mt-1 font-medium">
                    Categoría <span className="text-primary font-bold">{activeTab}</span> 
                    <ChevronRight size={14} className="text-gray-300" />
                    Nivel <span className="text-primary font-bold">{showHistory}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(null)}
                className="p-4 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-secondary"
              >
                <X size={32} />
              </button>
            </div>
            
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="p-24 text-center">
                  <Loader2 className="animate-spin mx-auto text-primary mb-4" size={48} />
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Sincronizando Bitácora...</p>
                </div>
              ) : historyLogs.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {historyLogs.map((log, idx) => (
                    <div key={log.id} className="p-10 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-secondary/5 border border-secondary/10 flex items-center justify-center text-secondary font-black text-lg">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-bold text-secondary text-lg">{log.modificado_por?.nombre || log.modificado_por?.email}</p>
                            <p className="text-sm text-gray-400 font-medium">
                              {log.fecha_cambio?.toDate().toLocaleString('es-CL', { 
                                dateStyle: 'full', 
                                timeStyle: 'short' 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="px-4 py-1.5 bg-success/10 text-success text-[10px] font-black uppercase tracking-[2px] rounded-full border border-success/20">
                            Validado
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4 p-6 bg-[#F8FAFC] rounded-3xl border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4">Estado Histórico</p>
                          <div className="flex justify-between">
                            <span className="text-gray-500 font-medium">Valor Hábil:</span>
                            <span className="font-bold text-secondary line-through opacity-40">${log.montos_anteriores.habil.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 font-medium">Valor Inhábil:</span>
                            <span className="font-bold text-secondary line-through opacity-40">${log.montos_anteriores.inhabil.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="space-y-4 p-6 bg-primary/5 rounded-3xl border border-primary/10 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <ArrowRight size={80} className="rotate-[-45deg]" />
                          </div>
                          <p className="text-[10px] font-black text-primary uppercase tracking-[2px] mb-4">Nueva Tarifa</p>
                          <div className="flex justify-between relative z-10">
                            <span className="text-gray-500 font-medium">Valor Hábil:</span>
                            <span className="font-black text-primary text-xl">${log.montos_nuevos.habil.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between relative z-10">
                            <span className="text-gray-500 font-medium">Valor Inhábil:</span>
                            <span className="font-black text-primary text-xl">${log.montos_nuevos.inhabil.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-32 text-center">
                  <div className="w-24 h-24 bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
                    <History className="text-gray-300" size={48} />
                  </div>
                  <p className="text-secondary font-bold text-xl">Sin historial registrado</p>
                  <p className="text-gray-400 mt-2">No se han detectado modificaciones para este nivel en la categoría actual.</p>
                </div>
              )}
            </div>
            
            <div className="p-10 bg-[#F8FAFC] border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowHistory(null)}
                className="bg-secondary text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-secondary-dark transition-all shadow-xl shadow-secondary/20"
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
