import React from 'react';
import { Bell, Settings, X, Info, AlertTriangle, CheckCircle, Menu, FlaskConical, Trash2 } from 'lucide-react';

const Topbar = ({ currentViewTitle, userName, userRole, userData, onOpenMenu }) => {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notifications, setNotifications] = React.useState([
    { id: 1, title: 'Entrada Registrada', message: 'Has marcado entrada correctamente a las 08:02 AM', type: 'success', time: 'Hace 2h' },
    { id: 2, title: 'Alerta de Rango', message: 'Te encuentras fuera del radio de marcaje del centro.', type: 'warning', time: 'Hace 15m' },
    { id: 3, title: 'Nuevo Turno Asignado', message: 'Se ha programado un nuevo turno para el 29 de Abril.', type: 'info', time: 'Hace 1h' },
  ]);

  const isAdmin = userData?.role === 'admin_global' || userData?.role === 'admin_local' || userRole?.toLowerCase().includes('admin');

  const handleToggleModoPrueba = async () => {
    if (!userData?.uid && !userData?.id) return;
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const newStatus = !userData.modoPruebaActivo;
      await updateDoc(doc(db, 'usuarios', userData.uid || userData.id), {
        modoPruebaActivo: newStatus
      });
    } catch (err) {
      console.error("Error toggling modo prueba:", err);
    }
  };

  const handlePurgeAllTestData = async () => {
    if (!window.confirm("🗑️ ¿Estás seguro de que deseas ELIMINAR TODOS LOS DATOS DE PRUEBA del sistema?\n\nEsta acción borrará únicamente turnos y marcajes simulados creados durante la prueba.")) return;

    try {
      const { collection, getDocs, deleteDoc, doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      // Purge test turnos
      const turnosSnap = await getDocs(collection(db, 'turnos'));
      const testDocs = turnosSnap.docs.filter(d => {
        const data = d.data();
        return data.esPrueba || data.modoPrueba || data.esSimulado || data.id === 'mock-123';
      });

      for (const d of testDocs) {
        await deleteDoc(doc(db, 'turnos', d.id));
      }

      // Purge test gps audit
      try {
        const gpsSnap = await getDocs(collection(db, 'auditoria_gps_pruebas'));
        for (const d of gpsSnap.docs) {
          await deleteDoc(doc(db, 'auditoria_gps_pruebas', d.id));
        }
      } catch (e) {}

      // Deactivate test mode
      if (userData?.uid || userData?.id) {
        await updateDoc(doc(db, 'usuarios', userData.uid || userData.id), {
          modoPruebaActivo: false
        });
      }

      alert("¡Todos los datos de prueba fueron eliminados con éxito!");
    } catch (err) {
      console.error(err);
      alert("Error al limpiar datos de prueba: " + err.message);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'success': return <CheckCircle className="text-success" size={16} />;
      case 'warning': return <AlertTriangle className="text-warning" size={16} />;
      case 'info': return <Info className="text-primary" size={16} />;
      default: return <Bell size={16} />;
    }
  };

  return (
    <header className="print:hidden h-[80px] bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {/* Hamburger Menu - Only Mobile/Tablet */}
        <button 
          onClick={onOpenMenu}
          className="lg:hidden p-2 text-gray-400 hover:text-secondary hover:bg-gray-50 rounded-xl transition-all"
        >
          <Menu size={24} />
        </button>
        
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span className="text-primary font-medium hidden xs:inline">Nodo - APS</span>
          <span className="hidden xs:inline">/</span>
          <span className="capitalize font-bold text-secondary">{currentViewTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleModoPrueba}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                userData?.modoPruebaActivo
                  ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-sm animate-pulse'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
              title="Activar / Desactivar Modo Prueba (Exclusivo Administradores)"
            >
              <FlaskConical size={14} className={userData?.modoPruebaActivo ? 'text-purple-600' : 'text-gray-400'} />
              <span className="hidden sm:inline">{userData?.modoPruebaActivo ? 'Modo Prueba: ON' : 'Modo Prueba: OFF'}</span>
            </button>

            <button
              onClick={handlePurgeAllTestData}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all flex items-center gap-1.5"
              title="Eliminar todos los datos y registros de prueba generados"
            >
              <Trash2 size={14} />
              <span className="hidden md:inline">Limpiar Pruebas</span>
            </button>
          </div>
        )}

        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`text-gray-400 hover:text-secondary transition-colors relative p-2 rounded-xl ${showNotifications ? 'bg-gray-100' : ''}`}
          >
            <Bell size={20} />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-secondary text-sm">Notificaciones</h3>
                <button onClick={() => setNotifications([])} className="text-[10px] text-primary font-bold uppercase hover:underline">Limpiar</button>
              </div>
              <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                      <div className="flex gap-3">
                        <div className="mt-0.5">{getIcon(n.type)}</div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-secondary group-hover:text-primary transition-colors">{n.title}</p>
                          <p className="text-[11px] text-gray-400 leading-snug mt-0.5">{n.message}</p>
                          <p className="text-[9px] text-gray-300 mt-1 font-medium">{n.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-xs text-gray-400">No tienes notificaciones pendientes</p>
                  </div>
                )}
              </div>
              <div className="p-3 bg-tertiary text-center border-t border-gray-100">
                <button className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-secondary">Ver todo el historial</button>
              </div>
            </div>
          )}
        </div>
        
        <button className="text-gray-400 hover:text-secondary transition-colors p-2">
          <Settings size={20} />
        </button>

        <div className="h-8 w-px bg-gray-200 mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1.5 justify-end">
              <p className="text-sm font-bold text-secondary leading-tight truncate max-w-[170px]">{userName || 'Cargando...'}</p>
              {userData?.modoPruebaActivo && (
                <span className="px-2 py-0.5 bg-purple-100 text-purple-900 border border-purple-300 rounded-md text-[9px] font-black uppercase tracking-wider shadow-2xs animate-pulse">
                  Modo Prueba: ON
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{userRole || 'Funcionario'}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden border-2 border-purple-200 flex items-center justify-center text-primary font-bold relative shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : '?'}
            {userData?.modoPruebaActivo && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold" title="Modo Prueba Activado">
                🧪
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;

