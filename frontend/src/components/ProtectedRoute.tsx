import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated } = useContext(AuthContext);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.rol)) {
    // Redirigir al dashboard correspondiente si no tiene permiso
    switch (user.rol) {
      case 'ADMINISTRADOR':
        return <Navigate to="/dashboard/admin" replace />;
      case 'PRESTADOR_TECNICO':
        return <Navigate to="/dashboard/tecnico" replace />;
      case 'CLIENTE':
        return <Navigate to="/dashboard/cliente" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
};
