import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { sendPasswordResetEmail, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { UserCheck, Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle, Sparkles } from 'lucide-react';

const Signup = ({ onBack, onSuccess }) => {
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const normalizeRUT = (rut) => {
    return rut.replace(/[.\-]/g, '').toUpperCase();
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!inputVal) return setError('Por favor, ingresa tu RUT o Correo Institucional.');
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const isEmail = inputVal.includes('@');
      let userDoc = null;
      let cleanRUT = '';
      
      if (isEmail) {
        const q = query(
          collection(db, 'usuarios'), 
          where('correoInstitucional', '==', inputVal.toLowerCase().trim())
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          userDoc = snap.docs[0];
          cleanRUT = userDoc.id;
        }
      } else {
        cleanRUT = normalizeRUT(inputVal);
        const q = query(
          collection(db, 'usuarios'), 
          where('rut', '==', cleanRUT)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          userDoc = snap.docs[0];
        } else {
          const qID = query(
            collection(db, 'usuarios'),
            where('__name__', '==', cleanRUT)
          );
          const snapID = await getDocs(qID);
          if (!snapID.empty) {
            userDoc = snapID.docs[0];
          }
        }
      }
      
      if (!userDoc) {
        throw new Error('No se encontró ningún pre-registro asociado a este RUT o correo. Por favor, comunícate con tu administrador.');
      }
      
      const userData = userDoc.data();
      const email = userData.correoInstitucional;
      
      if (!email) {
        throw new Error('El perfil pre-registrado no tiene un correo institucional válido. Contacta a soporte.');
      }
      
      if (userData.uid) {
        await sendPasswordResetEmail(auth, email);
        setSuccess(`Tu cuenta ya está activa. Hemos enviado un correo de restauración a ${email} para que reestablezcas tu contraseña.`);
        return;
      }
      
      const initialPassword = cleanRUT.substring(0, 6);
      let userUid = '';
      
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, initialPassword);
        userUid = userCredential.user.uid;
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          await sendPasswordResetEmail(auth, email);
          
          const userDocRef = doc(db, 'usuarios', cleanRUT);
          await updateDoc(userDocRef, {
            status: 'activo',
            updatedAt: new Date().toISOString()
          });
          
          setSuccess(`Se ha enviado un correo para configurar tu clave a ${email}. Tu contraseña de acceso inicial corresponde a los primeros 6 dígitos de tu RUT (ej: si tu RUT es 12.345.678-9, tu clave inicial es 123456).`);
          return;
        } else {
          throw authErr;
        }
      }
      
      const userDocRef = doc(db, 'usuarios', cleanRUT);
      await updateDoc(userDocRef, {
        uid: userUid,
        status: 'activo',
        updatedAt: new Date().toISOString()
      });
      
      await sendPasswordResetEmail(auth, email);
      
      setSuccess(`¡Tu cuenta ha sido activada con éxito! Tu contraseña inicial corresponde a los primeros 6 dígitos de tu RUT (ej: 123456). Además, te hemos enviado un correo a ${email} para que configures una contraseña personalizada si lo deseas.`);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al procesar la activación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tertiary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[480px]">
        <div className="text-center mb-8">
          <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 text-primary">
            <Sparkles size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-secondary tracking-tight">Nodo APS</h1>
          <p className="text-gray-500 mt-2 text-sm font-semibold uppercase tracking-wider">Activación de Cuenta</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 space-y-6">
          {success ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-secondary">¡Enlace Enviado!</h3>
                <p className="text-sm text-gray-500 leading-relaxed px-2">
                  {success}
                </p>
              </div>
              <button 
                onClick={onBack}
                className="w-full bg-secondary hover:bg-secondary-dark text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all text-xs"
              >
                Volver al Acceso
              </button>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-secondary">Verificación Institucional</h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Para activar tu cuenta, ingresa tu RUT o tu correo institucional. Debes estar previamente pre-registrado por el administrador de Nodo.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-error/10 border border-error/20 text-error text-xs rounded-2xl flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RUT o Correo Electrónico</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="12345678-9 o usuario@cormumel.cl"
                    className="w-full bg-tertiary border-none rounded-2xl p-4 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20 pr-12"
                    required
                    disabled={loading}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <UserCheck size={18} />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all shadow-lg shadow-primary/20 text-xs flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    <>
                      Activar Cuenta
                      <Sparkles size={14} />
                    </>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={onBack}
                  disabled={loading}
                  className="w-full bg-transparent text-gray-400 hover:text-secondary py-3 text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} />
                  Volver al Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
