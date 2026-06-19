import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ArrowLeft, Mail, Loader2, CheckCircle2, User } from 'lucide-react';

const ForgotPassword = ({ onBack }) => {
  const [rut, setRut] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const normalizeRUT = (rut) => {
    return rut.replace(/[.\-]/g, '').toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanRUT = normalizeRUT(rut);
      const userDoc = await getDoc(doc(db, 'usuarios', cleanRUT));

      if (!userDoc.exists()) {
        throw new Error('El RUT ingresado no está registrado en el sistema.');
      }

      const email = userDoc.data().correoInstitucional;
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-tertiary flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <div className="card shadow-xl overflow-hidden animate-fade-in">
          <div className="bg-secondary p-8 flex flex-col items-center justify-center text-center">
            <h1 className="text-white text-2xl font-bold">Recuperar Clave</h1>
            <p className="text-primary-light text-sm mt-1">Se enviará un correo a tu cuenta institucional</p>
          </div>

          <div className="p-8">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="mx-auto w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 size={32} />
                </div>
                <h2 className="text-xl font-semibold text-secondary">¡Correo Enviado!</h2>
                <p className="text-gray-500 text-sm">
                  Hemos enviado las instrucciones para restablecer tu contraseña a tu correo institucional.
                </p>
                <button onClick={onBack} className="btn-primary w-full mt-4">
                  Volver al Inicio
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 block">Ingresa tu RUT</label>
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

                {error && (
                  <div className="text-error text-xs bg-error/10 p-3 rounded-lg border border-error/20">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn-primary w-full py-3"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Enviar Instrucciones'
                  )}
                </button>

                <button 
                  type="button"
                  onClick={onBack}
                  className="text-gray-500 text-sm hover:text-secondary flex items-center justify-center gap-2 w-full transition-colors"
                >
                  <ArrowLeft size={16} /> Volver al Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
