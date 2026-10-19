import { createContext, useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';

interface User {
  id: string;
  id_usuario?: number;
  email: string;
  rol: 'ADMINISTRADOR' | 'PRESTADOR_TECNICO' | 'CLIENTE';
  nombres: string;
  apellidos: string;
  telefono?: string;
  foto_url?: string;
  estado_activo?: number | boolean;
  prestador?: {
    id_prestador?: number;
    especialidad?: string;
    zona_cobertura?: string;
    macrodistrito?: string;
    lat_cobertura?: number;
    lng_cobertura?: number;
    radio_cobertura?: number;
    saldo?: number;
    estado_activo?: number | boolean;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (partialUser: Partial<User>) => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateUser = (partialUser: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updatedUser = { ...prev, ...partialUser };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};
