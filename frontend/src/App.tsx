import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Login } from './views/Login';
import { Register } from './views/Register';
import { DashboardAdmin } from './views/DashboardAdmin';
import { DashboardTecnico } from './views/DashboardTecnico';
import { DashboardCliente } from './views/DashboardCliente';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff' } }} />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute allowedRoles={['ADMINISTRADOR']} />}>
            <Route path="/admin" element={<DashboardAdmin />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['PRESTADOR_TECNICO']} />}>
            <Route path="/tecnico" element={<DashboardTecnico />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['CLIENTE']} />}>
            <Route path="/cliente" element={<DashboardCliente />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
