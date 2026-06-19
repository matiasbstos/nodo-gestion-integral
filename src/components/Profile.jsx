import React, { useState } from 'react';
import { User, Phone, Mail, Building2, Calendar, CreditCard, CheckCircle2, ChevronRight, ExternalLink, Plus, Shield, Lock, Loader2, X, Trash2, Star, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

const Profile = ({ userData }) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showAccountNumber, setShowAccountNumber] = useState(false);
  
  // Local state for personal data
  const [personalData, setPersonalData] = useState({
    nombre: userData?.nombre || '',
    fechaNacimiento: userData?.fechaNacimiento || '',
    telefono: userData?.telefono || ''
  });

  const handleSaveChanges = async () => {
    setSaveLoading(true);
    try {
      if (userData?.uid) {
        const userDocRef = doc(db, 'usuarios', userData.rut); // Using RUT as ID as per previous context
        await updateDoc(userDocRef, personalData);
        alert('Cambios guardados con éxito.');
      }
    } catch (error) {
      console.error(error);
      alert('Error al guardar cambios: ' + error.message);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      await updatePassword(auth.currentUser, newPassword);
      setMessage({ type: 'success', text: 'Contraseña actualizada con éxito.' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowPasswordModal(false), 2000);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Error al cambiar la contraseña.' });
    } finally {
      setLoading(false);
    }
  };


  const isAdmin = userData?.role === 'admin_global';
  const isOfficial = userData?.role === 'user' || !userData?.role;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Mi Perfil Profesional</h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? 'Gestiona la información de red y tu perfil administrativo.' : 'Visualiza tu información laboral y de seguimiento.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowPasswordModal(true)}
            className="btn-secondary"
          >
            <Shield size={18} />
            Seguridad
          </button>
          {isAdmin && (
            <button 
              onClick={handleSaveChanges}
              disabled={saveLoading}
              className="btn-primary"
            >
              {saveLoading ? <Loader2 className="animate-spin" size={18} /> : 'Guardar Cambios'}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* Datos Personales */}
          <div className="card p-6 border-none shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <User size={20} className="stroke-[2.5px]" />
              <h2 className="text-lg font-bold text-secondary">Datos Personales</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nombres Completos</label>
                <input 
                  type="text" 
                  value={personalData.nombre} 
                  onChange={(e) => setPersonalData({...personalData, nombre: e.target.value})}
                  className={`input-field ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-gray-50/50'}`}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  RUT <Lock size={10} className="text-gray-300" />
                </label>
                <input type="text" defaultValue={userData?.rut || ''} className="input-field bg-gray-100 cursor-not-allowed text-gray-400" disabled />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fecha de Nacimiento</label>
                <input 
                  type="date" 
                  value={personalData.fechaNacimiento} 
                  onChange={(e) => setPersonalData({...personalData, fechaNacimiento: e.target.value})}
                  className={`input-field ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-gray-50/50'}`}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teléfono</label>
                <input 
                  type="tel" 
                  value={personalData.telefono} 
                  onChange={(e) => setPersonalData({...personalData, telefono: e.target.value})}
                  className={`input-field ${!isAdmin ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-gray-50/50'}`}
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>

          {/* Información del Prestador */}
          <div className="card bg-secondary p-8 text-white relative overflow-hidden border-none shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="flex items-center gap-2 mb-8">
              <div className="bg-primary/20 p-2 rounded-xl text-primary">
                <Building2 size={20} />
              </div>
              <h2 className="text-lg font-bold">Información del Prestador</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-y-8">
              <div>
                <p className="text-[10px] text-primary-light uppercase tracking-widest font-bold mb-1">Tipo de Contrato</p>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-success rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                  <p className="font-semibold">{userData?.tipoContrato} {userData?.subTipoContrato ? `(${userData.subTipoContrato})` : ''}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-primary-light uppercase tracking-widest font-bold mb-1">Cargo / Estamento</p>
                <p className="font-semibold">{userData?.tipoPrestador || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-[10px] text-primary-light uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
                  Email Institucional <Lock size={10} className="opacity-50" />
                </p>
                <p className="font-semibold text-sm truncate opacity-70 cursor-not-allowed">{userData?.correoInstitucional}</p>
              </div>
              <div>
                <p className="text-[10px] text-primary-light uppercase tracking-widest font-bold mb-1">ID Funcionario</p>
                <p className="font-semibold font-mono tracking-tighter">ID-{userData?.rut?.substring(0, 4)}-{Math.floor(Math.random() * 900) + 100}</p>
              </div>
            </div>

            <div className="mt-10 flex items-center justify-between text-xs pt-6 border-t border-white/10">
              <span className="text-gray-400 italic">Estado: Perfil Verificado</span>
              {userData?.firmaDigital && (
                <a href={userData.firmaDigital} target="_blank" rel="noreferrer" className="text-primary hover:text-white transition-colors flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  Ver Firma Digital <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Banking & Security Info */}
        <div className="space-y-8">
          {/* Información Bancaria */}
          <div className="card p-6 border-none shadow-sm">
            <div className="flex items-center gap-2 mb-6 text-primary">
              <CreditCard size={20} className="stroke-[2.5px]" />
              <h2 className="text-lg font-bold text-secondary">Cuenta Bancaria</h2>
            </div>
            
            <div className="bg-tertiary rounded-xl p-5 border border-gray-100 mb-6 group relative">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-primary group-hover:scale-110 transition-transform">
                  <Building2 size={24} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-bold text-secondary leading-none truncate">{userData?.banco || 'Pendiente'}</p>
                    <div className="flex items-center gap-2">
                      <Star size={12} className="fill-primary text-primary" />
                      <span className="bg-success/10 text-success text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Principal</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 truncate">{userData?.tipoCuenta} • **** {userData?.numeroCuenta?.slice(-4)}</p>
                </div>
              </div>
              
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-error transition-colors" title="Eliminar cuenta">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Información de Seguridad</label>
                <div className="relative group">
                  <input 
                    type={showAccountNumber ? "text" : "password"} 
                    value={userData?.numeroCuenta || ''} 
                    className="input-field bg-gray-50/50 text-sm tracking-wider font-mono pr-12" 
                    readOnly 
                  />
                  <button 
                    onClick={() => setShowAccountNumber(!showAccountNumber)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-primary transition-colors"
                  >
                    {showAccountNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 bg-tertiary hover:bg-gray-100 rounded-xl text-[10px] font-bold text-secondary uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-gray-100">
                  <Plus size={14} />
                  Añadir
                </button>
                <button className="py-3 bg-primary/10 hover:bg-primary/20 rounded-xl text-[10px] font-bold text-primary uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-primary/10">
                  Actualizar
                </button>
              </div>
            </div>
          </div>

          {/* Verification Status */}
          <div className="card p-6 bg-primary/5 border-primary/10">
            <h3 className="text-sm font-bold text-secondary mb-4 flex items-center gap-2">
              <CheckCircle2 size={16} className="text-primary" />
              Verificación
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Documentos RRHH</span>
                <span className="text-success font-bold">VALIVADO</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">SuperSalud</span>
                <span className="text-success font-bold">ACTIVO</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500">Firma Digital</span>
                <span className="text-success font-bold">{userData?.firmaDigital ? 'CARGADA' : 'PENDIENTE'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-secondary p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Lock size={20} className="text-primary" />
                <h3 className="text-xl font-bold">Cambiar Contraseña</h3>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="hover:bg-white/10 p-1 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nueva Contraseña</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                    placeholder="Min. 6 caracteres"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Confirmar Contraseña</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    placeholder="Repite la contraseña"
                    required
                  />
                </div>
              </div>

              {message.text && (
                <div className={`p-3 rounded-lg text-xs font-medium border ${message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-error/10 border-error/20 text-error'}`}>
                  {message.text}
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary w-full py-4 text-sm font-bold uppercase tracking-widest"
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

