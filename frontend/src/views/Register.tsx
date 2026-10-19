import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, User, Briefcase, Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    email: '',
    contrasena: '',
    rol: 'CLIENTE'
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const isNombresValid = formData.nombres.trim().length > 0 && nameRegex.test(formData.nombres);
  const showNombresError = formData.nombres.length > 0 && !nameRegex.test(formData.nombres);

  const isApellidosValid = formData.apellidos.trim().length > 0 && nameRegex.test(formData.apellidos);
  const showApellidosError = formData.apellidos.length > 0 && !nameRegex.test(formData.apellidos);

  const isEmailValid = emailRegex.test(formData.email.trim());
  const showEmailError = formData.email.length > 0 && !isEmailValid;

  const hasMinLength = formData.contrasena.length >= 8;
  const hasUpperLower = /[A-Z]/.test(formData.contrasena) && /[a-z]/.test(formData.contrasena);
  const hasNumber = /[0-9]/.test(formData.contrasena);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.contrasena);
  const isNotOnlySpaces = formData.contrasena.trim().length > 0;
  const isPasswordValid = hasMinLength && hasUpperLower && hasNumber && hasSpecial && isNotOnlySpaces;

  const isConfirmValid = confirmPassword.length > 0 && confirmPassword === formData.contrasena;
  const showConfirmError = confirmPassword.length > 0 && confirmPassword !== formData.contrasena;

  const isFormValid = isNombresValid && isApellidosValid && isEmailValid && isPasswordValid && isConfirmValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const cleanNombres = formData.nombres.trim();
    const cleanApellidos = formData.apellidos.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanContrasena = formData.contrasena;

    try {
      const sanitizedData = {
        ...formData,
        nombres: cleanNombres,
        apellidos: cleanApellidos,
        email: cleanEmail,
        contrasena: cleanContrasena
      };
      const res = await axios.post('http://localhost:3001/api/auth/register', sanitizedData);
      if (res.status === 201 || res.status === 200) {
        setSuccess('Usuario registrado exitosamente. Redirigiendo al inicio de sesión...');
        setError('');
        setFormData({
          nombres: '',
          apellidos: '',
          email: '',
          contrasena: '',
          rol: 'CLIENTE'
        });
        setConfirmPassword('');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar usuario');
      setSuccess('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070')] bg-cover bg-center py-12">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 glass-panel rounded-2xl mt-10 shadow-2xl border border-slate-700/60">
        {/* Botón de Retorno a Login */}
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="absolute top-6 left-6 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/60 p-2 rounded-full transition-all border border-slate-700/40"
          title="Volver al inicio de sesión"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Crear Cuenta</h1>
          <p className="text-textSecondary">Únete a la plataforma</p>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500/40 text-red-200 px-4 py-3 rounded-xl mb-6 text-sm">{error}</div>}
        {success && <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 px-4 py-3 rounded-xl mb-6 text-sm">{success}</div>}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Nombres</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-textSecondary" />
                </div>
                <input
                  type="text"
                  name="nombres"
                  value={formData.nombres}
                  className={`input-field pl-10 ${showNombresError ? 'border-red-500 focus:border-red-500' : ''}`}
                  onChange={handleChange}
                  placeholder="Juan"
                />
              </div>
              {showNombresError && (
                <p className="text-red-400 text-xs mt-1">Los nombres solo deben contener letras</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Apellidos</label>
              <div className="relative">
                <input
                  type="text"
                  name="apellidos"
                  value={formData.apellidos}
                  className={`input-field px-4 ${showApellidosError ? 'border-red-500 focus:border-red-500' : ''}`}
                  onChange={handleChange}
                  placeholder="Pérez"
                />
              </div>
              {showApellidosError && (
                <p className="text-red-400 text-xs mt-1">Los apellidos solo deben contener letras</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-textSecondary" />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                className={`input-field pl-10 ${showEmailError ? 'border-red-500 focus:border-red-500' : ''}`}
                onChange={handleChange}
                placeholder="usuario@dominio.com"
              />
            </div>
            {showEmailError && (
              <p className="text-red-400 text-xs mt-1">
                Ingrese un formato de correo electrónico válido (ej. usuario@dominio.com)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-textSecondary" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="contrasena"
                value={formData.contrasena}
                className="input-field pl-10 pr-10"
                onChange={handleChange}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-textSecondary hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Checklist Dinámico en Tiempo Real */}
            <div className="mt-2.5 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
              <div className={`flex items-center gap-2 transition-colors ${hasMinLength ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 transition-colors ${hasMinLength ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>Mínimo 8 caracteres</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${hasUpperLower ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 transition-colors ${hasUpperLower ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>Al menos una mayúscula y una minúscula</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${hasNumber ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 transition-colors ${hasNumber ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>Al menos un número</span>
              </div>
              <div className={`flex items-center gap-2 transition-colors ${hasSpecial ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 transition-colors ${hasSpecial ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span>Al menos un carácter especial (!@#$%^&*...)</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Confirmar Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-textSecondary" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className={`input-field pl-10 pr-10 ${showConfirmError ? 'border-red-500 focus:border-red-500' : ''}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-textSecondary hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {showConfirmError && (
              <p className="text-red-400 text-xs mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Rol</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Briefcase className="h-5 w-5 text-textSecondary" />
              </div>
              <select
                name="rol"
                className="input-field pl-10 appearance-none bg-slate-900/50"
                onChange={handleChange}
                value={formData.rol}
              >
                <option value="CLIENTE">Cliente</option>
                <option value="PRESTADOR_TECNICO">Prestador Técnico</option>
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!isFormValid}
            className={`w-full py-3 px-4 rounded-xl font-medium transition-all mt-4 ${
              isFormValid 
                ? 'btn-primary cursor-pointer shadow-lg shadow-indigo-500/25' 
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            Registrarse
          </button>
        </form>

        <p className="mt-6 text-center text-textSecondary">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary hover:text-accent transition-colors font-medium">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
};

