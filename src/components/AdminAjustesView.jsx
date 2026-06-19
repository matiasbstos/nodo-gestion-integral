import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Search, 
  Save, 
  Users, 
  Loader2, 
  AlertCircle,
  TrendingUp,
  History
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

const AdminAjustesView = () => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null); // ID of the user being updated
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  const fetchFuncionarios = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'usuarios'), 
        where('role', '==', 'user')
      );
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Temporary state for editing
        editValorHora: doc.data().valorHora || ''
      }));
      setFuncionarios(docs);
    } catch (err) {
      console.error("Error fetching funcionarios:", err);
      setError("Error al cargar la lista de funcionarios.");
    } finally {
      setLoading(false);
    }
  };

  const handleValueChange = (id, value) => {
    setFuncionarios(prev => prev.map(f => 
      f.id === id ? { ...f, editValorHora: value } : f
    ));
  };

  const saveValorHora = async (funcionario) => {
    setUpdating(funcionario.id);
    try {
      const userRef = doc(db, 'usuarios', funcionario.id);
      await updateDoc(userRef, {
        valorHora: Number(funcionario.editValorHora),
        updatedAt: new Date().toISOString()
      });
      // Update local state to reflect success
      setFuncionarios(prev => prev.map(f => 
        f.id === funcionario.id ? { ...f, valorHora: Number(f.editValorHora) } : f
      ));
    } catch (err) {
      console.error("Error updating valor hora:", err);
      alert("No se pudo actualizar el valor hora.");
    } finally {
      setUpdating(null);
    }
  };

  const filteredFuncionarios = funcionarios.filter(f => 
    f.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.rut?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1E293B] tracking-tight">Montos y Ajustes</h1>
          <p className="text-gray-500 mt-1">Configuración financiera y valores base por prestación.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <TrendingUp size={20} className="text-success" />
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Promedio Red</p>
              <p className="text-sm font-bold text-secondary">$14.500 / hr</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <DollarSign size={20} />
            </div>
            <div>
              <h2 className="font-bold text-[#1E293B]">Gestión de Valor Hora</h2>
              <p className="text-xs text-gray-400 mt-0.5">Asigna el valor por hora individual para cada funcionario.</p>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o RUT..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-tertiary border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-bold tracking-widest">
              <tr>
                <th className="px-8 py-5">Funcionario</th>
                <th className="px-8 py-5">RUT</th>
                <th className="px-8 py-5 text-center">Valor Actual</th>
                <th className="px-8 py-5 text-center">Nuevo Valor / Hora</th>
                <th className="px-8 py-5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20">
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <Loader2 className="animate-spin" size={32} />
                      <p className="text-sm font-medium">Cargando base de datos...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredFuncionarios.length > 0 ? (
                filteredFuncionarios.map(func => (
                  <tr key={func.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/5 text-secondary flex items-center justify-center font-bold text-sm border border-secondary/10">
                          {func.nombre?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-secondary">{func.nombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{func.tipoPrestador || 'No asignado'}</span>
                            {func.categoria && (
                              <span className="text-[10px] bg-primary/5 text-primary px-1.5 rounded font-bold">Cat {func.categoria}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-gray-500 font-mono text-xs">{func.rut}</td>
                    <td className="px-8 py-5 text-center">
                      <span className="font-bold text-secondary">
                        {func.valorHora ? `$${func.valorHora.toLocaleString()}` : '$0'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center">
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                          <input 
                            type="number" 
                            value={func.editValorHora}
                            onChange={(e) => handleValueChange(func.id, e.target.value)}
                            placeholder="0"
                            className="w-full bg-tertiary border-none rounded-xl py-2 pl-7 pr-3 text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 text-right"
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                        onClick={() => saveValorHora(func)}
                        disabled={updating === func.id || !func.editValorHora}
                        className={`p-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ml-auto ${
                          updating === func.id 
                            ? 'bg-gray-100 text-gray-400' 
                            : 'bg-primary/10 text-primary hover:bg-primary hover:text-white shadow-sm hover:shadow-md'
                        }`}
                        title="Guardar cambios"
                      >
                        {updating === func.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            <Save size={18} />
                            <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">Actualizar</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-8 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <AlertCircle size={32} />
                      <p className="text-sm font-medium">No se encontraron funcionarios que coincidan con la búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-secondary p-8 rounded-3xl shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex gap-4">
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
              <History size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Historial de Ajustes</h3>
              <p className="text-sm text-gray-400 mt-1 max-w-md">
                Todos los cambios realizados en los valores hora quedan registrados para la trazabilidad de los informes mensuales de honorarios.
              </p>
            </div>
          </div>
          <button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all border border-white/10">
            Ver Log de Auditoría
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAjustesView;
