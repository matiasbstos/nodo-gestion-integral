import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ children, activeView, setActiveView, onLogout, userData, pasoTutorial, setPasoTutorial }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const viewTitles = {
    attendance: 'Asistencia',
    profile: 'Configuración de Perfil',
    fees: 'Honorarios y Reportes',
    reports: 'Mis Informes'
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-tertiary relative overflow-x-hidden">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={closeMobileMenu}
        />
      )}

      <Sidebar 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onLogout={onLogout} 
        userData={userData}
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        pasoTutorial={pasoTutorial}
        setPasoTutorial={setPasoTutorial}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar 
          currentViewTitle={viewTitles[activeView] || activeView} 
          userName={userData?.nombre}
          userRole={userData?.tipoPrestador}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          pasoTutorial={pasoTutorial}
          setPasoTutorial={setPasoTutorial}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

