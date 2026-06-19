import React, { useState } from 'react';
import { LogIn, User, Lock, Loader2, AlertCircle } from 'lucide-react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Signup from './Signup';
import ForgotPassword from './ForgotPassword';

const Login = ({ onLogin }) => {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('login'); // login, signup, forgot

  const normalizeRUT = (rut) => {
    return rut.replace(/[.\-]/g, '').toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rut || !password) return;
    
    setLoading(true);
    setError(null);
    console.log("Attempting login for RUT:", rut);
    
    try {
      const cleanRUT = normalizeRUT(rut);
      console.log("Clean RUT:", cleanRUT);
      
      // 1. Get email associated with RUT from Firestore
      // We use a shorter timeout for this check
      const userDocPromise = getDoc(doc(db, 'usuarios', cleanRUT));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tiempo de espera agotado al consultar el RUT. Verifica tu conexión.')), 10000)
      );
      
      const userDoc = await Promise.race([userDocPromise, timeoutPromise]);
      
      if (!userDoc.exists()) {
        console.warn("RUT not found in 'usuarios' collection");
        throw new Error('El RUT no está registrado en el sistema. Por favor, regístrate primero.');
      }

      const email = userDoc.data().correoInstitucional;
      console.log("Email found for RUT:", email);

      // 2. Authenticate with Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase Auth success");
      onLogin();
    } catch (err) {
      console.error("Login process error:", err);
      
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('RUT o contraseña incorrectos.');
      } else if (err.code === 'permission-denied') {
        setError('Error de permisos al consultar el RUT. Contacta al administrador o verifica las reglas de Firestore.');
      } else {
        setError(err.message || 'Error al intentar ingresar. Por favor, intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };


  if (view === 'signup') {
    return <Signup onBack={() => setView('login')} onSuccess={() => {
      setView('login');
      setError('¡Registro exitoso! Por favor, inicia sesión con tu RUT y los primeros 6 dígitos como clave.');
    }} />;
  }

  if (view === 'forgot') {
    return <ForgotPassword onBack={() => setView('login')} />;
  }

  return (
    <div className="min-h-screen bg-tertiary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in border border-gray-100">
        {/* Header Section */}
        <div className="bg-secondary p-10 flex flex-col items-center justify-center text-center">
          <div className="bg-primary w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <span className="text-white text-3xl font-bold">N</span>
          </div>
          <h1 className="text-white text-3xl font-bold tracking-tight">Nodo</h1>
          <p className="text-primary text-xs font-semibold tracking-widest uppercase mt-1">Gestión Integral APS</p>
        </div>

        {/* Form Section */}
        <div className="p-8 pb-10">
          <h2 className="text-xl font-semibold text-secondary text-center mb-8">Acceso a Funcionarios</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className={`p-3 rounded-lg flex items-start gap-2 text-xs border ${error.includes('exitoso') ? 'bg-success/10 border-success/20 text-success' : 'bg-error/10 border-error/20 text-error'}`}>
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">RUT Funcionario</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="12.345.678-9"
                  className="input-field pl-10"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contraseña</label>
                <button 
                  type="button" 
                  onClick={() => setView('forgot')}
                  className="text-[10px] font-bold text-primary hover:text-primary-dark transition-colors uppercase tracking-tighter"
                >
                  ¿Olvidó su clave?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  placeholder="******"
                  className="input-field pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1 px-1">
                * Clave inicial: Primeros 6 dígitos del RUT
              </p>
            </div>

            <button 
              type="submit" 
              className="btn-primary w-full py-3.5 text-base shadow-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Ingresar al Portal
                  <LogIn size={18} />
                </>
              )}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">¿Eres nuevo?</span></div>
            </div>

            <button 
              type="button"
              onClick={() => setView('signup')}
              className="w-full text-secondary font-semibold text-sm py-2 hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              Crea tu cuenta aquí
            </button>
          </form>
        </div>
      </div>
      
      <footer className="mt-8 text-gray-400 text-[10px] text-center tracking-widest uppercase">
        Sistema de Gestión de Recursos Humanos • Nodo APS 2026
      </footer>
    </div>
  );
};

export default Login;

