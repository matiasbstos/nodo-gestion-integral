import React, { useState } from 'react';
import { auth, db, storage } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Mail, Phone, Calendar, Briefcase, CreditCard, PenTool, ArrowRight, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

const Signup = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    // Personal Data
    nombre: '',
    rut: '',
    fechaNacimiento: '',
    firmaDigital: null,
    // Contact
    telefono: '',
    correoInstitucional: '',
    // Contract
    tipoContrato: '',
    subTipoContrato: '', // for 44h/22h
    // Provider
    tipoPrestador: '',
    categoria: '',
    grado: '',
    // Bank
    banco: '',
    tipoCuenta: '',
    numeroCuenta: ''
  });

  const [firmaPreview, setFirmaPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, firmaDigital: file }));
      setFirmaPreview(URL.createObjectURL(file));
    }
  };

  const normalizeRUT = (rut) => {
    return rut.replace(/[.\-]/g, '').toUpperCase();
  };

  const getInitialPassword = (rut) => {
    const cleanRUT = normalizeRUT(rut);
    return cleanRUT.substring(0, 6);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const cleanRUT = normalizeRUT(formData.rut);
      const initialPassword = getInitialPassword(formData.rut);

      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.correoInstitucional, 
        initialPassword
      );
      const user = userCredential.user;

      // 2. Upload Signature if exists
      let firmaUrl = '';
      if (formData.firmaDigital) {
        const storageRef = ref(storage, `firmas/${cleanRUT}`);
        await uploadBytes(storageRef, formData.firmaDigital);
        firmaUrl = await getDownloadURL(storageRef);
      }

      // 3. Save to Firestore
      const userProfile = {
        ...formData,
        rut: cleanRUT,
        firmaDigital: firmaUrl,
        uid: user.uid,
        createdAt: new Date().toISOString(),
        role: 'user',
        mustChangePassword: true
      };
      
      // Delete sensitive/unnecessary local state objects before saving
      delete userProfile.firmaDigitalFile; 

      await setDoc(doc(db, 'usuarios', cleanRUT), userProfile);

      onSuccess();
    } catch (err) {
      console.error(err);
      setError('Error al registrar usuario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const renderStep1 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <User size={20} />
        </div>
        <h2 className="text-xl font-semibold text-secondary">Datos Personales</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Nombre Completo</label>
          <input 
            type="text" name="nombre" value={formData.nombre} onChange={handleChange}
            placeholder="Ej: Juan Pérez" className="input-field" required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">RUT</label>
          <input 
            type="text" name="rut" value={formData.rut} onChange={handleChange}
            placeholder="12.345.678-9" className="input-field" required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Fecha de Nacimiento</label>
          <input 
            type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange}
            className="input-field" required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Carga de Firma Digital</label>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer relative">
            <input 
              type="file" accept="image/*" onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {firmaPreview ? (
              <img src={firmaPreview} alt="Preview" className="h-12 object-contain" />
            ) : (
              <>
                <PenTool className="text-gray-400 mb-2" size={24} />
                <span className="text-xs text-gray-500">Haz clic para subir imagen</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <Mail size={20} />
        </div>
        <h2 className="text-xl font-semibold text-secondary">Contacto y Cargo</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Teléfono</label>
          <input 
            type="tel" name="telefono" value={formData.telefono} onChange={handleChange}
            placeholder="+56 9 1234 5678" className="input-field" required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Correo Institucional</label>
          <input 
            type="email" name="correoInstitucional" value={formData.correoInstitucional} onChange={handleChange}
            placeholder="usuario@centroaps.cl" className="input-field" required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Tipo de Prestador</label>
          <select 
            name="tipoPrestador" value={formData.tipoPrestador} onChange={handleChange}
            className="input-field" required
          >
            <option value="">Seleccione...</option>
            <option value="Médico (A)">Médico (A)</option>
            <option value="Enfermero (A)">Enfermero (A)</option>
            <option value="TENS">TENS</option>
            <option value="Administrativo (A)">Administrativo (A)</option>
            <option value="Auxiliar Aseo">Auxiliar Aseo</option>
            <option value="Conductor (A)">Conductor (A)</option>
            <option value="Kinesiólogo (A)">Kinesiólogo (A)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Categoría</label>
          <select 
            name="categoria" value={formData.categoria} onChange={handleChange}
            className="input-field" required
          >
            <option value="">Seleccione...</option>
            <option value="A">Categoría A (Médicos)</option>
            <option value="B">Categoría B (Profesionales)</option>
            <option value="C">Categoría C (TENS)</option>
            <option value="D">Categoría D (Técnicos Salud)</option>
            <option value="E">Categoría E (Administrativos)</option>
            <option value="F">Categoría F (Auxiliares)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Grado</label>
          <select 
            name="grado" value={formData.grado} onChange={handleChange}
            className="input-field" required
          >
            <option value="">Seleccione...</option>
            {[...Array(15)].map((_, i) => (
              <option key={i + 1} value={i + 1}>Grado {i + 1}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Tipo de Contrato</label>
          <div className="flex gap-4 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" name="tipoContrato" value="Honorario por horas" 
                checked={formData.tipoContrato === 'Honorario por horas'} 
                onChange={handleChange}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm">Por horas</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" name="tipoContrato" value="Honorario por Jornada" 
                checked={formData.tipoContrato === 'Honorario por Jornada'} 
                onChange={handleChange}
                className="text-primary focus:ring-primary"
              />
              <span className="text-sm">Por jornada</span>
            </label>
          </div>
          {formData.tipoContrato === 'Honorario por Jornada' && (
            <select 
              name="subTipoContrato" value={formData.subTipoContrato} onChange={handleChange}
              className="input-field mt-2" required
            >
              <option value="">Seleccione jornada...</option>
              <option value="44 hrs">44 hrs</option>
              <option value="22 hrs">22 hrs</option>
            </select>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          <CreditCard size={20} />
        </div>
        <h2 className="text-xl font-semibold text-secondary">Cuenta Bancaria</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Banco</label>
          <input 
            type="text" name="banco" value={formData.banco} onChange={handleChange}
            placeholder="Ej: Banco Estado" className="input-field" required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Tipo de Cuenta</label>
          <select 
            name="tipoCuenta" value={formData.tipoCuenta} onChange={handleChange}
            className="input-field" required
          >
            <option value="">Seleccione...</option>
            <option value="Cuenta Corriente">Cuenta Corriente</option>
            <option value="Cuenta Vista / RUT">Cuenta Vista / RUT</option>
            <option value="Cuenta Ahorro">Cuenta Ahorro</option>
          </select>
        </div>
        <div className="col-span-1 md:col-span-2 space-y-1">
          <label className="text-sm font-medium text-gray-700">N° de Cuenta</label>
          <input 
            type="text" name="numeroCuenta" value={formData.numeroCuenta} onChange={handleChange}
            placeholder="0000000000" className="input-field" required
          />
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-error/10 border border-error/20 text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 mt-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-primary mt-0.5" size={18} />
          <div>
            <h3 className="text-sm font-semibold text-secondary">Información de Acceso</h3>
            <p className="text-xs text-gray-600 mt-1">
              Tu contraseña inicial serán los <strong>primeros 6 dígitos de tu RUT</strong>. 
              Podrás cambiarla una vez que inicies sesión.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-tertiary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-secondary tracking-tight">Nodo - APS</h1>
          <p className="text-gray-500 mt-2">Registro de Funcionario</p>
        </div>

        <div className="card shadow-xl border-none">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-100 w-full">
            <div 
              className="h-full bg-primary transition-all duration-500" 
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>

          <div className="p-8">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
              {step === 1 ? (
                <button onClick={onBack} className="btn-secondary">
                  Volver al Login
                </button>
              ) : (
                <button onClick={prevStep} className="btn-secondary" disabled={loading}>
                  <ArrowLeft size={18} /> Anterior
                </button>
              )}

              {step < 3 ? (
                <button onClick={nextStep} className="btn-primary">
                  Siguiente <ArrowRight size={18} />
                </button>
              ) : (
                <button onClick={handleSubmit} className="btn-primary min-w-[140px]" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Procesando...
                    </>
                  ) : (
                    'Finalizar Registro'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
