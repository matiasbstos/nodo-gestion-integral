import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  UserX, 
  Download, 
  RefreshCw,
  Activity,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Lock,
  Building2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

/**
 * AuditoriaView Component
 * Comprehensive audit log module displaying all system movements by admins, funcionarios, and ex-funcionarios.
 */
const AuditoriaView = ({ userData }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch logs from Firestore 'auditoria'
  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'auditoria'), orderBy('timestamp', 'desc'), limit(150));
      const snap = await getDocs(q);
      const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (fetched.length === 0) {
        // Generate initial rich audit logs for demonstration if empty
        const initialLogs = [
          {
            id: 'demo-1',
            timestamp: new Date().toISOString(),
            fechaFormateada: new Date().toLocaleString('es-CL'),
            usuarioNombre: 'Matias Bustos (Administrador Global)',
            usuarioRut: '184877759',
            usuarioRol: 'admin_global',
            accion: 'INFORME_GENERADO_PDF',
            detalles: 'Generación e impresión A4 del Informe de Prestación de Servicios Honorarios',
            targetNombre: 'Nadia Araya Muñoz',
            targetRut: '187785544',
            categoria: 'honorarios'
          },
          {
            id: 'demo-2',
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
            fechaFormateada: new Date(Date.now() - 3600000 * 2).toLocaleString('es-CL'),
            usuarioNombre: 'Natacha Guevara',
            usuarioRut: '264541840',
            usuarioRol: 'funcionario',
            accion: 'MARCAJE_ENTRADA',
            detalles: 'Marcaje de asistencia entrada registrado a las 17:01 hrs (SAR Arpillerista)',
            targetNombre: 'Natacha Guevara',
            targetRut: '264541840',
            categoria: 'asistencia'
          },
          {
            id: 'demo-3',
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            fechaFormateada: new Date(Date.now() - 3600000 * 5).toLocaleString('es-CL'),
            usuarioNombre: 'Matias Bustos (Administrador Global)',
            usuarioRut: '184877759',
            usuarioRol: 'admin_global',
            accion: 'ASIGNACION_TURNO',
            detalles: 'Asignación de Turno 1 (17:00 - 08:00h) en Pauta Mensual de Junio 2026',
            targetNombre: 'Natacha Guevara',
            targetRut: '264541840',
            categoria: 'pauta'
          },
          {
            id: 'demo-4',
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
            fechaFormateada: new Date(Date.now() - 3600000 * 24).toLocaleString('es-CL'),
            usuarioNombre: 'Administrador Local SAR',
            usuarioRut: '154328901',
            usuarioRol: 'admin_local',
            accion: 'REGISTRO_LICENCIA_MEDICA',
            detalles: 'Licencia Médica ingresada (3 días). Liberación automática de puesto VACANTE en Pauta.',
            targetNombre: 'Rodrigo Morales Valenzuela',
            targetRut: '169874562',
            categoria: 'expediente'
          },
          {
            id: 'demo-5',
            timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
            fechaFormateada: new Date(Date.now() - 3600000 * 48).toLocaleString('es-CL'),
            usuarioNombre: 'Ex-Funcionario (Inactivo)',
            usuarioRut: '143219876',
            usuarioRol: 'ex_funcionario',
            accion: 'INACTIVACION_EXPEDIENTE',
            detalles: 'Desactivación de perfil por término de convenio de honorarios',
            targetNombre: 'Camila Pinto Soto',
            targetRut: '143219876',
            categoria: 'expediente'
          }
        ];
        setLogs(initialLogs);
      } else {
        setLogs(fetched);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Filter logic
  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (log.usuarioNombre && log.usuarioNombre.toLowerCase().includes(q)) ||
      (log.usuarioRut && log.usuarioRut.toLowerCase().includes(q)) ||
      (log.accion && log.accion.toLowerCase().includes(q)) ||
      (log.detalles && log.detalles.toLowerCase().includes(q)) ||
      (log.targetNombre && log.targetNombre.toLowerCase().includes(q));

    const matchesRole = roleFilter === 'all' || log.usuarioRol === roleFilter;
    const matchesCategory = categoryFilter === 'all' || log.categoria === categoryFilter;

    return matchesSearch && matchesRole && matchesCategory;
  });

  // Action Badge Styles
  const getActionBadge = (accion = '') => {
    if (accion.includes('TURNO') || accion.includes('PAUTA')) {
      return { label: accion, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (accion.includes('MARCAJE') || accion.includes('ASISTENCIA')) {
      return { label: accion, cls: 'bg-sky-50 text-sky-700 border-sky-200' };
    }
    if (accion.includes('INFORME') || accion.includes('PDF') || accion.includes('HONORARIOS')) {
      return { label: accion, cls: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (accion.includes('INACTIVACION') || accion.includes('ELIMINACION') || accion.includes('LICENCIA')) {
      return { label: accion, cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: accion, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  // Role Badge Styles
  const getRoleBadge = (rol = '') => {
    switch (rol) {
      case 'admin_global':
        return { label: 'Admin Global', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'admin_local':
        return { label: 'Admin Local', cls: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
      case 'ex_funcionario':
        return { label: 'Ex-Funcionario', cls: 'bg-gray-200 text-gray-700 border-gray-300' };
      default:
        return { label: 'Funcionario', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    }
  };

  // Export CSV helper
  const exportCSV = () => {
    const headers = ['Fecha/Hora', 'Usuario', 'RUT', 'Rol', 'Accion', 'Detalles', 'Funcionario Afectado'];
    const rows = filteredLogs.map(l => [
      `"${l.fechaFormateada || l.timestamp}"`,
      `"${l.usuarioNombre || ''}"`,
      `"${l.usuarioRut || ''}"`,
      `"${l.usuarioRol || ''}"`,
      `"${l.accion || ''}"`,
      `"${l.detalles || ''}"`,
      `"${l.targetNombre || ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Auditoria_Nodo_APS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in font-sans">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-secondary text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-secondary tracking-tight">
              Registro de Auditoría & Trazabilidad
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Supervisión completa de movimientos realizados por Administradores Globales, Administradores Locales, Funcionarios y Ex-funcionarios.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchAuditLogs}
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all"
            title="Recargar Auditoría"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button 
            onClick={exportCSV}
            className="btn-primary py-3 px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
          >
            <Download size={16} /> Exportar Reporte CSV
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Movimientos</p>
            <p className="text-2xl font-black text-secondary mt-0.5">{filteredLogs.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pauta & Turnos</p>
            <p className="text-2xl font-black text-secondary mt-0.5">
              {logs.filter(l => l.categoria === 'pauta').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Marcajes de Asistencia</p>
            <p className="text-2xl font-black text-secondary mt-0.5">
              {logs.filter(l => l.categoria === 'asistencia').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informes de Honorarios</p>
            <p className="text-2xl font-black text-secondary mt-0.5">
              {logs.filter(l => l.categoria === 'honorarios').length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por usuario, RUT, acción o descripción..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full input-field pl-12 bg-gray-50/50"
            />
          </div>

          {/* Role Filter */}
          <select 
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="input-field bg-gray-50/50 md:w-56 appearance-none font-bold text-xs"
          >
            <option value="all">Todos los Roles</option>
            <option value="admin_global">Administrador Global</option>
            <option value="admin_local">Administrador Local</option>
            <option value="funcionario">Funcionario Activo</option>
            <option value="ex_funcionario">Ex-Funcionario (Inactivo)</option>
          </select>

          {/* Category Filter */}
          <select 
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="input-field bg-gray-50/50 md:w-56 appearance-none font-bold text-xs"
          >
            <option value="all">Todas las Categorías</option>
            <option value="pauta">Turnos & Pauta Mensual</option>
            <option value="asistencia">Marcajes & Asistencia</option>
            <option value="honorarios">Informes & Honorarios</option>
            <option value="expediente">Expedientes & Incidencias</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="p-4 pl-6">Fecha / Hora</th>
                <th className="p-4">Usuario Ejecutor</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Acción Realizada</th>
                <th className="p-4">Detalles del Evento</th>
                <th className="p-4 pr-6 text-right">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
                    Cargando historial de auditoría...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">
                    No se encontraron registros de auditoría que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const actBadge = getActionBadge(log.accion);
                  const roleBadge = getRoleBadge(log.usuarioRol);

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Timestamp */}
                      <td className="p-4 pl-6 font-mono text-gray-500 whitespace-nowrap">
                        <div className="font-bold text-secondary text-xs">{log.fechaFormateada || log.timestamp}</div>
                      </td>

                      {/* User */}
                      <td className="p-4 font-medium">
                        <div className="font-bold text-secondary">{log.usuarioNombre || 'Sistema'}</div>
                        <div className="text-[10px] font-mono text-gray-400">{log.usuarioRut || 'N/A'}</div>
                      </td>

                      {/* Role */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${roleBadge.cls}`}>
                          {roleBadge.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${actBadge.cls}`}>
                          {actBadge.label}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="p-4 max-w-xs truncate text-gray-600 font-medium">
                        <p title={log.detalles}>{log.detalles}</p>
                        {log.targetNombre && (
                          <span className="text-[10px] text-primary font-bold block mt-0.5">
                            Afecta a: {log.targetNombre} ({log.targetRut})
                          </span>
                        )}
                      </td>

                      {/* Action View */}
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="Ver detalle completo"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 animate-scale-up border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-secondary text-base">Detalle de Registro de Auditoría</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedLog.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-secondary p-1 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase">Fecha y Hora:</span>
                  <span className="font-mono font-bold text-secondary">{selectedLog.fechaFormateada}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase">Ejecutor:</span>
                  <span className="font-bold text-secondary">{selectedLog.usuarioNombre} ({selectedLog.usuarioRut})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold uppercase">Rol del Ejecutor:</span>
                  <span className="font-bold text-primary uppercase">{selectedLog.usuarioRol}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase block mb-1">Acción Realizada:</span>
                <span className="inline-block px-3 py-1 bg-secondary text-white font-bold rounded-xl text-xs uppercase">
                  {selectedLog.accion}
                </span>
              </div>

              <div>
                <span className="text-gray-400 font-bold uppercase block mb-1">Descripción de la Operación:</span>
                <p className="p-3 bg-gray-50 rounded-2xl border border-gray-100 font-medium text-gray-700 leading-relaxed">
                  {selectedLog.detalles}
                </p>
              </div>

              {selectedLog.targetNombre && (
                <div className="p-3 bg-primary/5 rounded-2xl border border-primary/20">
                  <span className="text-primary font-bold block">Funcionario / Entidad Afectada:</span>
                  <p className="text-secondary font-bold text-xs mt-0.5">
                    {selectedLog.targetNombre} (RUT: {selectedLog.targetRut})
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="btn-primary py-2.5 px-6 text-xs font-bold uppercase"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuditoriaView;
