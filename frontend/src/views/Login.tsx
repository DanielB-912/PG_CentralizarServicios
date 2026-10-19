import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Por favor, ingresa un correo electrónico válido');
      return;
    }

    if (!cleanPassword) {
      setError('Por favor, ingresa tu contraseña');
      return;
    }

    try {
      // Purge existing tokens before login to prevent desync
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];

      const res = await axios.post('http://localhost:3001/api/auth/login', {
        email: cleanEmail,
        contrasena: cleanPassword
      });
      login(res.data.token, res.data.user);
      
      switch(res.data.user.rol) {
        case 'ADMINISTRADOR': navigate('/admin'); break;
        case 'PRESTADOR_TECNICO': navigate('/tecnico'); break;
        case 'CLIENTE': navigate('/cliente'); break;
        default: navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=2070')] bg-cover bg-center">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-md p-8 glass-panel rounded-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Bienvenido</h1>
          <p className="text-textSecondary">Sistema de Servicios Cochabamba</p>
        </div>

        {error && <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Correo Electrónico</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-textSecondary" />
              </div>
              <input
                type="email"
                required
                className="input-field pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-textSecondary" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="input-field pl-10 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>

          <button type="submit" className="btn-primary">
            Iniciar Sesión
          </button>
        </form>

        <p className="mt-6 text-center text-textSecondary">
          ¿No tienes una cuenta? <Link to="/register" className="text-primary hover:text-accent transition-colors">Regístrate</Link>
        </p>
      </div>
    </div>
  );
};
