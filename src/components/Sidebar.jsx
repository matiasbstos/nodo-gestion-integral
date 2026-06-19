import React from 'react';
import { 
  X,
  Activity, 
  MapPin, 
  Briefcase, 
  Clock, 
  User, 
  Wallet, 
  FileText, 
  LogOut,
  ChevronRight,
  Settings,
  Calendar,
  PlayCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Sidebar = ({ activeView, setActiveView, onLogout, userData, isOpen, onClose, pasoTutorial, setPasoTutorial }) => {
  const isAdmin = userData?.role === 'admin_global';

  const menuItems = isAdmin ? [
    { id: 'admin-dashboard', label: 'Dashboard Consolidado', icon: Activity },
    { id: 'admin-operativa', label: 'Gestión Operativa', icon: MapPin },
    { id: 'admin-honorarios', label: 'Honorarios e Informes', icon: Briefcase },
    { id: 'admin-ajustes', label: 'Montos y Ajustes', icon: Settings },
    { type: 'separator', label: 'Mi Área Personal' },
    { id: 'attendance', label: 'Mi Asistencia', icon: Clock },
    { id: 'profile', label: 'Mi Perfil', icon: User },
  ] : [
    // Rol: USER (Funcionario Portal)
    { id: 'attendance', label: 'Mi Asistencia', icon: PlayCircle, step: 0 },
    { id: 'my-shifts', label: 'Mis Turnos', icon: Calendar, step: 6 },
    { id: 'fees', label: 'Mis Honorarios', icon: Wallet, step: 7 },
    { id: 'profile', label: 'Mi Perfil', icon: User, step: 8 },
  ];

  const getTutorialTooltip = (step) => {
    const content = {
      6: { title: 'Mis Turnos', text: '¡Marcaje exitoso! En Mis Turnos podrá consultar su agenda mensual y aceptar o rechazar las asignaciones. Haga clic aquí para continuar.' },
      7: { title: 'Mis Honorarios', text: 'En Mis Honorarios verá el cálculo transparente y en tiempo real de sus pagos por los turnos realizados. Haga clic para continuar.' },
      8: { title: 'Mi Perfil', text: 'Finalmente, en Mi Perfil puede actualizar sus datos y documentos. Haga clic para finalizar el recorrido.' }
    };
    return content[step];
  };

  return (
    <>
      {/* Backdrop para Sidebar Spotlight */}
      {pasoTutorial >= 6 && pasoTutorial <= 8 && (
        <div className="fixed inset-0 bg-black/70 z-[45] animate-fade-in" />
      )}

      <aside className={cn(
        "w-[280px] bg-secondary text-white flex flex-col h-screen fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out lg:sticky lg:translate-x-0 lg:shrink-0",
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        {/* Mobile Close Button ... same code ... */}
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-6 right-4 p-2 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
        {/* Brand */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary w-10 h-10 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xl">N</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Nodo</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Gestión Integral</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 mt-6 px-4 space-y-2",
          (pasoTutorial >= 6 && pasoTutorial <= 8) ? "overflow-visible" : "overflow-y-auto"
        )}>
          {menuItems.map((item, idx) => (
            item.type === 'separator' ? (
              <div key={`sep-${idx}`} className="pt-6 pb-2 px-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[2px]">{item.label}</p>
              </div>
            ) : (
              <div key={item.id} className="relative">
                <button
                  onClick={() => {
                    if (pasoTutorial >= 6 && pasoTutorial <= 8) {
                      if (pasoTutorial === item.step) {
                        setPasoTutorial(pasoTutorial + 1);
                        setActiveView(item.id);
                      }
                      return;
                    }
                    setActiveView(item.id);
                    onClose && onClose();
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group",
                    activeView === item.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "text-gray-400 hover:bg-white/5 hover:text-white",
                    pasoTutorial === item.step && "relative z-[60] ring-4 ring-blue-400 bg-white/10 scale-[1.02] shadow-2xl"
                  )}
                >
                  <item.icon size={20} className={cn(
                    "transition-transform group-hover:scale-110",
                    activeView === item.id ? "text-white" : "text-gray-400 group-hover:text-white"
                  )} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {activeView === item.id && <ChevronRight size={14} className="ml-auto opacity-50" />}
                </button>

                {/* Tutorial Tooltip */}
                {pasoTutorial === item.step && getTutorialTooltip(pasoTutorial) && (
                  <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-[70] w-64 animate-fade-in pointer-events-none">
                    <div className="bg-primary text-white p-4 rounded-2xl shadow-2xl border-2 border-white/20 backdrop-blur-md pointer-events-auto">
                      <div className="flex items-center gap-2 mb-1">
                        <PlayCircle size={16} fill="white" />
                        <p className="font-bold uppercase tracking-widest text-[9px]">{getTutorialTooltip(pasoTutorial).title}</p>
                      </div>
                      <p className="text-xs font-medium leading-relaxed">{getTutorialTooltip(pasoTutorial).text}</p>
                      <div className="mt-2 text-[8px] font-bold uppercase opacity-50">
                        Haga clic para continuar
                      </div>
                    </div>
                    {/* Arrow */}
                    <div className="absolute left-[-6px] top-1/2 -translate-y-1/2 border-y-[6px] border-y-transparent border-r-[6px] border-r-primary" />
                  </div>
                )}
              </div>
            )
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto border-t border-white/5">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut size={20} />
            <span className="font-medium text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
