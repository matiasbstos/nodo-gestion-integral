import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Profile from './components/Profile';
import MisHonorariosView from './components/MisHonorariosView';
import Attendance from './components/Attendance';
import AdminDashboardView from './components/AdminDashboardView';
import AdminOperativaView from './components/AdminOperativaView';
import AdminHonorariosView from './components/AdminHonorariosView';
import MatrizRemuneracionalView from './components/MatrizRemuneracionalView';
import FuncionarioTurnosView from './components/FuncionarioTurnosView';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('attendance');
  const [pasoTutorial, setPasoTutorial] = useState(0);

  // MÓDULO: Final del Recorrido (Paso 9)
  const handleFinalizeTutorial = async () => {
    try {
      // 1. Identificar el ID del documento (Priorizar .id capturado en carga)
      const docId = userData?.id || userData?.uid;
      
      if (docId) {
        const userRef = doc(db, 'usuarios', docId);
        await updateDoc(userRef, { modoPruebaActivo: false });
      }
    } catch (err) {
      console.error("Error al persistir fin de tutorial:", err);
    } finally {
      // SIEMPRE liberar al usuario de la pantalla de bloqueo
      setUserData(prev => ({ ...prev, modoPruebaActivo: false }));
      setPasoTutorial(0);
    }
  };

  useEffect(() => {
    if (userData?.role === 'admin_global') {
      setActiveView('admin-dashboard');
    }
  }, [userData]);

  useEffect(() => {
    console.log("Setting up auth listener...");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // Domain Validation
        if (!firebaseUser.email?.endsWith('@cormumel.cl')) {
          console.error("Unauthorized domain access attempt:", firebaseUser.email);
          alert("Acceso restringido. Debe utilizar su correo institucional @cormumel.cl");
          await signOut(auth);
          setLoading(false);
          return;
        }

        console.log("User authenticated:", firebaseUser.email);
        setUser(firebaseUser);
        
        try {
          // Robust Profile Fetching
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const q = query(collection(db, 'usuarios'), where('correoInstitucional', '==', firebaseUser.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const docSnapshot = querySnapshot.docs[0];
            const data = { 
              id: docSnapshot.id, // <--- CRÍTICO: Capturar el ID del documento
              ...docSnapshot.data() 
            };
            console.log("User profile loaded for:", data.nombre, "Role:", data.role);
            setUserData(data);
          } else {
            console.warn("Profile not found in Firestore for:", firebaseUser.email);
            // Even if profile is missing, we keep the user object but userData will be null
            // This allows the UI to show a "Profile Pending" state if needed
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        console.log("No user session.");
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tertiary flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white text-3xl font-bold">N</span>
          </div>
          <div className="space-y-2 text-center">
            <p className="text-secondary font-bold text-lg">Iniciando Nodo</p>
            <p className="text-gray-400 text-xs uppercase tracking-widest">Cargando credenciales...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => console.log("Login successful")} />;
  }

  const renderView = () => {
    const commonProps = { 
      userData, 
      pasoTutorial, 
      setPasoTutorial 
    };

    switch (activeView) {
      case 'profile':
        return <Profile {...commonProps} />;
      case 'my-shifts':
        return <FuncionarioTurnosView {...commonProps} />;
      case 'fees':
        return <MisHonorariosView {...commonProps} />;
      case 'attendance':
        return <Attendance {...commonProps} />;
      case 'admin-dashboard':
        return <AdminDashboardView {...commonProps} />;
      case 'admin-operativa':
        return <AdminOperativaView {...commonProps} />;
      case 'admin-honorarios':
        return <AdminHonorariosView {...commonProps} />;
      case 'admin-ajustes':
        return <MatrizRemuneracionalView {...commonProps} />;
      case 'reports':
        return (
          <div className="p-8 animate-fade-in">
            <h1 className="text-3xl font-bold text-secondary">Mis Informes</h1>
            <p className="text-gray-500 mt-2">Esta sección está en desarrollo.</p>
          </div>
        );
      default:
        return userData?.role === 'admin_global' ? <AdminDashboardView {...commonProps} /> : <Attendance {...commonProps} />;
    }
  };

  return (
    <>
      <Layout 
        activeView={activeView} 
        setActiveView={setActiveView} 
        onLogout={handleLogout}
        userData={userData}
        pasoTutorial={pasoTutorial}
        setPasoTutorial={setPasoTutorial}
      >
        {renderView()}
      </Layout>

      {/* MÓDULO 4: Modal de Bienvenida (Gran Final) */}
      {pasoTutorial === 9 && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-secondary/95 backdrop-blur-xl animate-fade-in" />
          <div className="relative bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full text-center shadow-2xl animate-scale-in">
            <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center text-success mx-auto mb-8 animate-bounce-subtle">
              <div className="w-16 h-16 bg-success rounded-full flex items-center justify-center text-white shadow-lg shadow-success/20">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            
            <h2 className="text-4xl font-black text-secondary mb-4 leading-tight">
              ¡Felicidades, recorrido completado!
            </h2>
            <p className="text-gray-500 text-lg mb-10">
              Ya conoce todas las herramientas esenciales. Está listo para ser parte oficial del equipo Nodo y comenzar su gestión.
            </p>

            <button
              onClick={handleFinalizeTutorial}
              className="w-full bg-primary hover:bg-primary-dark text-white py-5 rounded-2xl text-xl font-bold transition-all shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Comenzar a usar Nodo
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;


