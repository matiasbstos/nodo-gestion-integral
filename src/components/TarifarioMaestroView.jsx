import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  Save, 
  Edit2, 
  X, 
  History, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldAlert
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
  serverTimestamp 
} from 'firebase/firestore';

const TarifarioMaestroView = ({ userData }) => {
  const [tarifas, setTarifas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [showHistory, setShowHistory] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const mockData = [
    { id: 't1', cargo: 'Médico', categoria: 'A', grado: '1', valorHabil: 25000, valorInhabil: 32000 },
    { id: 't2', cargo: 'Enfermero (A)', categoria: 'B', grado: '5', valorHabil: 18000, valorInhabil: 24000 },
    { id: 't3', cargo: 'TENS', categoria: 'C', grado: '10', valorHabil: 12000, valorInhabil: 16000 },
    { id: 't4', cargo: 'Kinesiólogo (A)', categoria: 'B', grado: '3', valorHabil: 17500, valorInhabil: 23000 },
  ];

  useEffect(() => {
    fetchTarifas();
  }, []);

  const fetchTarifas = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'tarifario'), orderBy('cargo', 'asc'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setTarifas(mockData);
      } else {
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTarifas(docs);
      }
    } catch (err) {
      console.error("Error fetching tarifas:", err);
      setTarifas(mockData);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tarifa) => {
    setEditingId(tarifa.id);
    setEditData({ ...tarifa });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData(null);
  };

  const handleSave = async () => {
    if (!editData) return;
    
    const original = tarifas.find(t => t.id === editingId);
    const batch = writeBatch(db);

    try {
      // A: Update main doc
      const tarifaRef = doc(db, 'tarifario', editingId);
      batch.update(tarifaRef, {
        categoria: editData.categoria,
        grado: editData.grado,
        valorHabil: Number(editData.valorHabil),
        valorInhabil: Number(editData.valorInhabil),
        updatedAt: serverTimestamp()
      });

      // B: Create history log
      const historyRef = doc(collection(db, 'historial_tarifas'));
      batch.set(historyRef, {
        fecha_modificacion: serverTimestamp(),
        cargo_modificado: original.cargo,
        tarifa_id: editingId,
        valores_anteriores: {
          categoria: original.categoria,
          grado: original.grado,
          valorHabil: original.valorHabil,
          valorInhabil: original.valorInhabil
        },
        valores_nuevos: {
          categoria: editData.categoria,
          grado: editData.grado,
          valorHabil: Number(editData.valorHabil),
          valorInhabil: Number(editData.valorInhabil)
        },
        modificado_por: userData?.nombre || userData?.email || 'Admin'
      });

      await batch.commit();

      // Update local state
      setTarifas(prev => prev.map(t => t.id === editingId ? { ...editData, valorHabil: Number(editData.valorHabil), valorInhabil: Number(editData.valorInhabil) } : t));
      setEditingId(null);
      setEditData(null);
    } catch (err) {
      console.error("Error saving tarifa:", err);
      alert("Error al guardar los cambios.");
    }
  };

  const fetchHistory = async (tarifaId) => {
    setShowHistory(tarifaId);
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'historial_tarifas'), 
        where('tarifa_id', '==', tarifaId),
        orderBy('fecha_modificacion', 'desc')
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

  const filteredTarifas = tarifas.filter(t => 
    t.cargo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">Tarifario Maestro</h1>
          <p className="text-gray-500 mt-1">Definición global de honorarios por estamento y jornada.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cargo..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-gray-100 rounded-2xl py-3 pl-12 pr-4 text-sm font-medium shadow-sm focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-8 py-5">Cargo / Estamento</th>
                <th className="px-8 py-5 text-center">Categoría</th>
                <th className="px-8 py-5 text-center">Grado</th>
                <th className="px-8 py-5 text-right">Valor Hábiles (L-V)</th>
                <th className="px-8 py-5 text-right">Valor Inhábiles (S-D-F)</th>
                <th className="px-8 py-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-8 py-20 text-center">
                    <Loader2 className="animate-spin mx-auto text-primary mb-2" size={32} />
                    <p className="text-gray-400 font-medium">Cargando tarifario...</p>
                  </td>
                </tr>
              ) : filteredTarifas.map(t => (
                <tr key={t.id} className={`transition-colors ${editingId === t.id ? 'bg-primary/5' : 'hover:bg-gray-50/50'}`}>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-secondary/5 text-secondary flex items-center justify-center">
                        <DollarSign size={16} />
                      </div>
                      <span className="font-bold text-secondary">{t.cargo}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    {editingId === t.id ? (
                      <input 
                        type="text" 
                        value={editData.categoria}
                        onChange={(e) => setEditData({...editData, categoria: e.target.value.toUpperCase()})}
                        className="w-16 mx-auto text-center bg-white border border-gray-200 rounded-lg py-1 font-bold text-primary focus:ring-2 focus:ring-primary/20"
                      />
                    ) : (
                      <span className="bg-tertiary px-3 py-1 rounded-full font-bold text-gray-600">{t.categoria}</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-center">
                    {editingId === t.id ? (
                      <input 
                        type="number" 
                        value={editData.grado}
                        onChange={(e) => setEditData({...editData, grado: e.target.value})}
                        className="w-16 mx-auto text-center bg-white border border-gray-200 rounded-lg py-1 font-bold text-primary focus:ring-2 focus:ring-primary/20"
                      />
                    ) : (
                      <span className="font-bold text-secondary">{t.grado}</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right font-mono font-bold">
                    {editingId === t.id ? (
                      <input 
                        type="number" 
                        value={editData.valorHabil}
                        onChange={(e) => setEditData({...editData, valorHabil: e.target.value})}
                        className="w-32 ml-auto text-right bg-white border border-gray-200 rounded-lg py-1 px-2 font-bold text-primary focus:ring-2 focus:ring-primary/20"
                      />
                    ) : (
                      <span className="text-secondary">${t.valorHabil?.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-8 py-5 text-right font-mono font-bold">
                    {editingId === t.id ? (
                      <input 
                        type="number" 
                        value={editData.valorInhabil}
                        onChange={(e) => setEditData({...editData, valorInhabil: e.target.value})}
                        className="w-32 ml-auto text-right bg-white border border-gray-200 rounded-lg py-1 px-2 font-bold text-primary focus:ring-2 focus:ring-primary/20"
                      />
                    ) : (
                      <span className="text-secondary">${t.valorInhabil?.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2">
                      {editingId === t.id ? (
                        <>
                          <button 
                            onClick={handleSave}
                            className="p-2 bg-success text-white rounded-lg hover:bg-success-dark transition-all"
                            title="Guardar"
                          >
                            <Save size={18} />
                          </button>
                          <button 
                            onClick={handleCancel}
                            className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-all"
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleEdit(t)}
                            className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => fetchHistory(t.id)}
                            className="p-2 bg-tertiary text-gray-400 rounded-lg hover:bg-secondary hover:text-white transition-all"
                            title="Historial"
                          >
                            <History size={18} />
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
        <div className="fixed inset-0 bg-[#1E293B]/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-4">
                <div className="bg-secondary p-3 rounded-2xl text-white">
                  <Clock size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-secondary">Historial de Cambios</h2>
                  <p className="text-sm text-gray-500">Trazabilidad para: <span className="font-bold text-primary">{tarifas.find(t => t.id === showHistory)?.cargo}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistory(null)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            
            <div className="p-0 max-h-[60vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="p-20 text-center">
                  <Loader2 className="animate-spin mx-auto text-primary mb-2" size={32} />
                  <p className="text-gray-400">Consultando bitácora de auditoría...</p>
                </div>
              ) : historyLogs.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {historyLogs.map(log => (
                    <div key={log.id} className="p-8 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {log.modificado_por?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-secondary">{log.modificado_por}</p>
                            <p className="text-xs text-gray-400">{log.fecha_modificacion?.toDate().toLocaleString() || 'Recientemente'}</p>
                          </div>
                        </div>
                        <span className="px-4 py-1.5 bg-success/10 text-success text-[10px] font-bold uppercase tracking-widest rounded-full">Actualización Atómica</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-tertiary/30 p-6 rounded-2xl border border-gray-100">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Estado Anterior</p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Cat / Grado:</span>
                              <span className="font-bold text-secondary">{log.valores_anteriores.categoria} | {log.valores_anteriores.grado}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Valor Hábiles:</span>
                              <span className="font-bold text-secondary">${log.valores_anteriores.valorHabil.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Valor Inhábiles:</span>
                              <span className="font-bold text-secondary">${log.valores_anteriores.valorInhabil.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2 hidden md:block">
                            <ArrowRight className="text-primary/30" size={20} />
                          </div>
                          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-4">Estado Nuevo</p>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Cat / Grado:</span>
                              <span className="font-bold text-primary">{log.valores_nuevos.categoria} | {log.valores_nuevos.grado}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Valor Hábiles:</span>
                              <span className="font-bold text-primary">${log.valores_nuevos.valorHabil.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-500">Valor Inhábiles:</span>
                              <span className="font-bold text-primary">${log.valores_nuevos.valorInhabil.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center">
                  <ShieldAlert className="mx-auto text-gray-200 mb-4" size={64} />
                  <p className="text-gray-400 font-medium">No existen registros previos para este cargo.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-tertiary border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowHistory(null)}
                className="btn-secondary py-3 px-8 text-sm font-bold"
              >
                Cerrar Auditoría
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TarifarioMaestroView;
