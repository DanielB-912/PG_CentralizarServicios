import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, User, Briefcase, Eye, EyeOff } from 'lucide-react';

export const Register = () => {
  const { } = useContext(AuthContext); // Used to be login but not used
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.contrasena !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    try {
      const res = await axios.post('http://localhost:3001/api/auth/register', formData);
      if (res.status === 201 || res.status === 200) {
        setSuccess('Usuario registrado exitosamente. Redirigiendo al login...');
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
        }, 2000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar usuario');
      setSuccess('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070')] bg-cover bg-center py-12">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 glass-panel rounded-2xl mt-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Crear Cuenta</h1>
          <p className="text-textSecondary">Únete a la plataforma</p>
        </div>

        {error && !error.includes('correo') && <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">{error}</div>}
        {success && <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-lg mb-6">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
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
                  required
                  className="input-field pl-10"
                  onChange={handleChange}
                  placeholder="Juan"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-textSecondary mb-1">Apellidos</label>
              <div className="relative">
                <input
                  type="text"
                  name="apellidos"
                  required
                  className="input-field px-4"
                  onChange={handleChange}
                  placeholder="Pérez"
                />
              </div>
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
                required
                className="input-field pl-10"
                onChange={handleChange}
                placeholder="tu@correo.com"
              />
            </div>
            {error && error.includes('correo') && (
              <p className="text-red-400 text-xs mt-1">{error}</p>
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
                required
                className="input-field pl-10 pr-10"
                onChange={handleChange}
                placeholder="Password123!"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-textSecondary hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-textSecondary mt-1">Debe incluir mayúsculas, minúsculas, números y caracteres especiales.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-1">Confirmar Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-textSecondary" />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                className="input-field pl-10 pr-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Password123!"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-textSecondary hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
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

          <button type="submit" className="btn-primary mt-4">
            Registrarse
          </button>
        </form>

        <p className="mt-6 text-center text-textSecondary">
          ¿Ya tienes cuenta? <Link to="/login" className="text-primary hover:text-accent transition-colors">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
};
