import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Users, BarChart3, Settings, LogOut, Search, Plus, Edit2, Trash2, X, Briefcase, Mail, Lock, Eye, EyeOff, UserCircle, FileText, Check, XCircle, Download } from 'lucide-react';
import axios from 'axios';
import { ProfileModal } from '../components/ProfileModal';
import { GlobalVoiceAssistant } from '../components/GlobalVoiceAssistant';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Removed recharts
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface Usuario {
  id: string;
  id_usuario?: number;
  nombres: string;
  apellidos: string;
  email: string;
  rol: string;
  estado_activo: number;
  fechaRegistro: string;
  telefono?: string;
  direccion?: string;
}

interface Credencial {
  id_credencial: number;
  id_usuario: number;
  tipo_documento: string;
  documento_url: string;
  fecha_subida: string;
  estado_validacion: string;
  nombres?: string;
  apellidos?: string;
  email?: string;
}

export const DashboardAdmin = () => {
  const { user, token, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'metricas' | 'usuarios' | 'credenciales' | 'configuracion'>('metricas');
  
  // Perfil global
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Estado para Usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('TODOS');
  
  // Estado para Credenciales
  const [credenciales, setCredenciales] = useState<Credencial[]>([]);
  const [documentViewer, setDocumentViewer] = useState<{ isOpen: boolean; url: string; type: string }>({ isOpen: false, url: '', type: '' });

  // Estado para Crear Usuario
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ nombres: '', apellidos: '', email: '', contrasena: '', rol: 'ADMINISTRADOR' });

  // Estado para Editar Usuario
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<Usuario>>({});

  // Estado para Configuración
  const [comision, setComision] = useState(5);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [reportes, setReportes] = useState<any>({ 
    usuariosTotales: 0, 
    serviciosVinculados: 0, 
    ingresosTotales: 0, 
    tasaComision: 8, 
    macrodistritos: [], 
    transacciones: [] 
  });

  useEffect(() => {
    fetchUsers();
    fetchConfig();
    fetchCredenciales();
    fetchReportes();
  }, []);

  const fetchReportes = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/admin/reportes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Datos Reportes Admin recibidos:", response.data);
      setReportes(response.data?.data || response.data);
    } catch (error) {
      console.error('Error al obtener reportes:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/admin/configuracion/comision', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.comision) {
        setComision(response.data.comision);
      }
    } catch (error) {
      console.error('Error al obtener config:', error);
    }
  };

  const saveConfig = async () => {
    try {
      await axios.put('http://localhost:3001/api/admin/configuracion/comision', { comision }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar config:', error);
    }
  };

  const fetchCredenciales = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/admin/credenciales/pendientes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCredenciales(response.data);
    } catch (error) {
      console.error('Error al obtener credenciales:', error);
    }
  };

  const handleValidarCredencial = async (id: number, estado: string, tipoDocumentoActualizado?: string) => {
    try {
      await axios.put(`http://localhost:3001/api/admin/credenciales/${id}/validar`, {
        estado_validacion: estado,
        observaciones_admin: '',
        tipo_documento: tipoDocumentoActualizado
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCredenciales();
    } catch (error) {
      console.error('Error al validar credencial:', error);
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3001/api/auth/register', {
        ...newAdmin
      });
      setShowModal(false);
      setNewAdmin({ nombres: '', apellidos: '', email: '', contrasena: '', rol: 'ADMINISTRADOR' });
      fetchUsers();
    } catch (error) {
      console.error('Error al registrar usuario:', error);
    }
  };

  const handleDeleteUser = async (id: string | number) => {
    if (confirm('¿Está seguro de que desea eliminar/desactivar este usuario?')) {
      try {
        await axios.delete(`http://localhost:3001/api/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchUsers();
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
      }
    }
  };

  const handleEditUser = (userToEdit: Usuario) => {
    setEditingUser(userToEdit);
    setShowEditModal(true);
  };

  const submitEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:3001/api/users/${editingUser.id_usuario}`, {
        nombres: editingUser.nombres,
        apellidos: editingUser.apellidos,
        telefono: editingUser.telefono,
        direccion: editingUser.direccion,
        rol: editingUser.rol
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowEditModal(false);
      fetchUsers();
    } catch (error) {
      console.error('Error al editar usuario:', error);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Reporte de Sostenibilidad Financiera', 14, 22);
    
    doc.setFontSize(12);
    const m = reportes.metricas;
    doc.text(`Total Usuarios: ${m.totalUsuarios || 0}`, 14, 32);
    doc.text(`Total Vinculaciones: ${m.totalVinculaciones || 0}`, 14, 40);
    doc.text(`Ingresos Totales (Comisiones): Bs. ${m.totalRecaudado || 0}`, 14, 48);

    doc.setFontSize(14);
    doc.text('Historial de Transacciones (Comisiones)', 14, 60);

    const tableData = (reportes.transacciones || []).map((t: any) => [
      t.id,
      new Date(t.fecha).toLocaleDateString(),
      `${t.prestador}`,
      `Bs. ${t.monto}`
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['ID', 'Fecha', 'Prestador', 'Monto']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('reporte_sostenibilidad.pdf');
  };

  const filteredUsers = usuarios.filter(u => {
    const matchesSearch = u.nombres?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.apellidos?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'TODOS' || u.rol === roleFilter;
    return matchesSearch && matchesRole;
  });

  const renderTabContent = () => {
    switch (activeTab) {
      case 'metricas':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Reportes y Sostenibilidad Financiera</h2>
              <button 
                onClick={handleExportPDF}
                className="btn-primary py-2 px-4 flex items-center gap-2"
              >
                <Download className="h-5 w-5" /> Exportar a PDF
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors">
                <h3 className="text-textSecondary text-sm font-medium">Usuarios Totales</h3>
                <p className="text-3xl font-bold text-white mt-2">{reportes.usuariosTotales || 0}</p>
                <p className="text-xs text-emerald-400 mt-2">Clientes y Técnicos</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors">
                <h3 className="text-textSecondary text-sm font-medium">Servicios (Vinculaciones)</h3>
                <p className="text-3xl font-bold text-white mt-2">{reportes.serviciosVinculados || 0}</p>
                <p className="text-xs text-emerald-400 mt-2">Totales históricos</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors">
                <h3 className="text-textSecondary text-sm font-medium">Ingresos Totales (Comisiones)</h3>
                <p className="text-3xl font-bold text-primary mt-2">Bs. {reportes.ingresosTotales || 0}</p>
                <p className="text-xs text-emerald-400 mt-2">Generado por la plataforma</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors">
                <h3 className="text-textSecondary text-sm font-medium">Tasa de Comisión</h3>
                <p className="text-3xl font-bold text-accent mt-2">{comision}%</p>
                <p className="text-xs text-emerald-400 mt-2">Configuración Actual</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="glass-panel rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-6">Ingresos por Comisiones (Últimos Días)</h3>
                <div className="h-72 w-full flex items-end justify-around pb-4 pt-10 border-b border-l border-slate-700 relative">
                  {(!reportes.transacciones || reportes.transacciones.length === 0) ? (
                    <div className="absolute inset-0 flex items-center justify-center text-textSecondary">Sin datos suficientes</div>
                  ) : (
                    reportes.transacciones.slice(0, 7).map((d: any, i: number) => {
                      const maxMonto = Math.max(...reportes.transacciones.slice(0, 7).map((x:any) => parseFloat(x.monto)));
                      const heightPercent = maxMonto > 0 ? (parseFloat(d.monto) / maxMonto) * 100 : 0;
                      return (
                        <div key={i} className="flex flex-col items-center group relative w-1/6">
                          <div className="absolute -top-8 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                            Bs. {d.monto}
                          </div>
                          <div 
                            className="w-full max-w-[40px] bg-indigo-500 rounded-t-md hover:bg-indigo-400 transition-colors" 
                            style={{ height: `${heightPercent}%`, minHeight: heightPercent > 0 ? '4px' : '0' }}
                          ></div>
                          <span className="text-xs text-slate-400 mt-2 truncate w-full text-center">{new Date(d.fecha).toLocaleDateString()}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="glass-panel rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-6">Demanda por Macrodistrito</h3>
                <div className="h-72 w-full flex flex-col justify-center gap-4">
                  {(!reportes.macrodistritos || reportes.macrodistritos.length === 0) ? (
                    <div className="flex-1 flex items-center justify-center text-textSecondary">Sin datos suficientes</div>
                  ) : (
                    reportes.macrodistritos.map((d: any, i: number) => {
                      const total = reportes.macrodistritos.reduce((acc: number, x: any) => acc + parseInt(x.cantidad), 0);
                      const widthPercent = total > 0 ? (parseInt(d.cantidad) / total) * 100 : 0;
                      return (
                        <div key={i} className="w-full">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-slate-300">{d.macrodistrito}</span>
                            <span className="text-white font-medium">{widthPercent.toFixed(1)}% ({d.cantidad})</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2.5">
                            <div className="h-2.5 rounded-full" style={{ width: `${widthPercent}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden border border-slate-700 mt-6">
              <h3 className="text-lg font-bold text-white p-4 border-b border-slate-700">Historial de Transacciones (Últimas 100)</h3>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 text-textSecondary text-sm border-b border-slate-700 sticky top-0 z-10">
                      <th className="p-4 font-medium">ID</th>
                      <th className="p-4 font-medium">Fecha</th>
                      <th className="p-4 font-medium">Prestador</th>
                      <th className="p-4 font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {(reportes.transacciones || []).map((t: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 text-textSecondary text-xs">{t.id}</td>
                        <td className="p-4 text-textSecondary text-xs">{new Date(t.fecha).toLocaleString()}</td>
                        <td className="p-4 text-white font-medium">{t.prestador}</td>
                        <td className="p-4 text-emerald-400 font-bold">Bs. {t.monto}</td>
                      </tr>
                    ))}
                    {reportes.transacciones.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-textSecondary">
                          No hay transacciones registradas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'usuarios':
        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex flex-1 gap-4 w-full">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-textSecondary" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre, email..." 
                    className="input-field pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select 
                  className="input-field w-48 appearance-none bg-slate-900"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="TODOS">Todos los roles</option>
                  <option value="CLIENTE">Cliente</option>
                  <option value="PRESTADOR_TECNICO">Prestador</option>
                  <option value="ADMINISTRADOR">Admin</option>
                </select>
              </div>
              <button 
                onClick={() => setShowModal(true)}
                className="btn-primary flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="h-5 w-5" />
                Registrar Usuario
              </button>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden border border-slate-700">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/50 text-textSecondary text-sm border-b border-slate-700">
                      <th className="p-4 font-medium">ID</th>
                      <th className="p-4 font-medium">Nombre Completo</th>
                      <th className="p-4 font-medium">Correo</th>
                      <th className="p-4 font-medium">Rol</th>
                      <th className="p-4 font-medium">Estado</th>
                      <th className="p-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredUsers.map((u) => (
                      <tr key={u.id_usuario || u.id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="p-4 text-textSecondary text-xs">{u.id_usuario || u.id}</td>
                        <td className="p-4 text-white font-medium">{u.nombres} {u.apellidos}</td>
                        <td className="p-4 text-textSecondary">{u.email}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                            u.rol === 'ADMINISTRADOR' ? 'bg-purple-500/20 text-purple-300' :
                            u.rol === 'PRESTADOR_TECNICO' ? 'bg-amber-500/20 text-amber-300' :
                            'bg-blue-500/20 text-blue-300'
                          }`}>
                            {u.rol}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1.5 text-sm ${u.estado_activo ? 'text-emerald-400' : 'text-red-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${u.estado_activo ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                            {u.estado_activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleEditUser(u)} className="text-textSecondary hover:text-primary transition-colors">
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteUser(u.id_usuario || u.id)} className="text-textSecondary hover:text-red-400 transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-textSecondary">
                          No se encontraron usuarios.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      case 'credenciales':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">Revisión de Credenciales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {credenciales.length === 0 && (
                <div className="col-span-full text-center text-textSecondary p-10 border border-slate-700 rounded-xl bg-slate-800/20">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  No hay credenciales pendientes de validación.
                </div>
              )}
              {credenciales.map(cred => (
                <div key={cred.id_credencial} className="glass-panel p-5 rounded-2xl border border-slate-700">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded-md font-medium">
                      PENDIENTE
                    </span>
                    <span className="text-xs text-textSecondary">{new Date(cred.fecha_subida).toLocaleDateString()}</span>
                  </div>
                  <h3 className="text-white font-medium text-lg">{cred.nombres} {cred.apellidos}</h3>
                  <p className="text-xs text-textSecondary mb-2">{cred.email}</p>
                  <select
                    className="w-full bg-slate-900 border border-slate-700 text-sm text-white rounded-xl py-2 px-3 mb-4 focus:outline-none focus:border-primary"
                    value={cred.tipo_documento}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setCredenciales(prev => prev.map(c => c.id_credencial === cred.id_credencial ? { ...c, tipo_documento: newType } : c));
                    }}
                  >
                    <option value="CI_ANVERSO">CI Anverso</option>
                    <option value="CI_REVERSO">CI Reverso</option>
                    <option value="TITULO_PROVISION">Título en Provisión Nacional</option>
                    <option value="CERTIFICADO_TECNICO">Certificado Técnico / Egresado</option>
                    <option value="CURRICULUM">Curriculum Vitae (CV)</option>
                  </select>
                  
                  <button 
                    onClick={() => setDocumentViewer({ isOpen: true, url: `http://localhost:3001${cred.documento_url}`, type: cred.documento_url.endsWith('.pdf') ? 'pdf' : 'image' })}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl mb-4 transition-colors text-sm font-medium border border-slate-600/50"
                  >
                    <Eye className="h-4 w-4" /> Visualizar Documento
                  </button>

                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => handleValidarCredencial(cred.id_credencial, 'APROBADO', cred.tipo_documento)} className="flex-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1 transition-colors">
                      <Check className="h-4 w-4" /> Aprobar
                    </button>
                    <button onClick={() => handleValidarCredencial(cred.id_credencial, 'RECHAZADO', cred.tipo_documento)} className="flex-1 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1 transition-colors">
                      <XCircle className="h-4 w-4" /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'configuracion':
        return (
          <div className="space-y-6 max-w-3xl">
            <div className="glass-panel p-6 rounded-xl border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-4">Parámetros del Sistema</h3>
              
              <div className="space-y-8">
                {/* Comisión */}
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-white font-medium block">Tasa de Comisión Variable</span>
                      <span className="text-sm text-textSecondary">Porcentaje deducido por cada trabajo completado.</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">{comision}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="5" 
                    max="10" 
                    step="1"
                    value={comision}
                    onChange={(e) => setComision(Number(e.target.value))}
                    className="w-full accent-primary h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-textSecondary mt-2">
                    <span>5% (Mínimo)</span>
                    <span>10% (Máximo)</span>
                  </div>
                </div>

                <hr className="border-slate-700" />

                {/* Toggles */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-medium block">Modo Mantenimiento</span>
                    <span className="text-sm text-textSecondary">Deshabilita el acceso a usuarios regulares temporalmente.</span>
                  </div>
                  <button 
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${maintenanceMode ? 'bg-primary' : 'bg-slate-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-medium block">Registro Automático de Técnicos</span>
                    <span className="text-sm text-textSecondary">Aprobar automáticamente cuentas de técnicos nuevos.</span>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-600 transition-colors">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1 transition-transform" />
                  </button>
                </div>
                
                <div className="pt-4">
                  <button onClick={saveConfig} className="btn-primary">Guardar Cambios</button>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-surface border-r border-slate-700 hidden md:flex flex-col z-20 shadow-xl">
        <div className="p-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent tracking-tight">
            Admin Panel
          </h2>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setActiveTab('metricas')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'metricas' ? 'bg-primary/10 text-primary font-medium' : 'text-textSecondary hover:bg-surface hover:text-white'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span>Métricas Financieras</span>
          </button>
          <button 
            onClick={() => setActiveTab('usuarios')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'usuarios' ? 'bg-primary/10 text-primary font-medium' : 'text-textSecondary hover:bg-surface hover:text-white'
            }`}
          >
            <Users className="h-5 w-5" />
            <span>Gestión de Usuarios</span>
          </button>
          <button 
            onClick={() => setActiveTab('credenciales')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'credenciales' ? 'bg-primary/10 text-primary font-medium' : 'text-textSecondary hover:bg-surface hover:text-white'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span>Credenciales</span>
          </button>
          <button 
            onClick={() => setActiveTab('configuracion')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
              activeTab === 'configuracion' ? 'bg-primary/10 text-primary font-medium' : 'text-textSecondary hover:bg-surface hover:text-white'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Configuración</span>
          </button>
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button onClick={logout} className="flex items-center justify-center space-x-2 text-textSecondary hover:text-red-400 w-full px-4 py-3 rounded-xl hover:bg-red-400/10 transition-colors">
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Navbar */}
        <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-6 sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-white capitalize">
            {activeTab === 'metricas' ? 'Dashboard Principal' : activeTab}
          </h1>
          <div className="flex items-center space-x-4 relative">
            <GlobalVoiceAssistant 
              role="ADMINISTRADOR"
            onCommand={(action, _payload) => {
              if (action === 'NAVIGATE_ADMIN_USUARIOS') {
                setActiveTab('usuarios');
              } else if (action === 'NAVIGATE_ADMIN_METRICAS') {
                setActiveTab('metricas');
              } else if (action === 'NAVIGATE_ADMIN_CREDENCIALES') {
                setActiveTab('credenciales');
              } else if (action === 'NAVIGATE_ADMIN_CONFIG') {
                setActiveTab('configuracion');
              }
            }}
            />
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.nombres} {user?.apellidos}</p>
              <p className="text-xs text-primary">{user?.rol}</p>
            </div>
            
            <button onClick={() => setShowDropdown(!showDropdown)} className="focus:outline-none">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                {user?.nombres?.charAt(0) || 'A'}
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-12 mt-2 w-48 bg-surface border border-slate-700 rounded-xl shadow-2xl py-1 z-50">
                <button onClick={() => { setShowDropdown(false); setShowProfileModal(true); }} className="w-full text-left px-4 py-2 text-sm text-textSecondary hover:bg-slate-800 hover:text-white flex items-center gap-2">
                  <UserCircle className="h-4 w-4" /> Mi Perfil
                </button>
                <div className="h-px bg-slate-700 my-1"></div>
                <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 flex items-center gap-2">
                  <LogOut className="h-4 w-4" /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {renderTabContent()}
        </div>
      </main>

      {/* Modals */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Modal Registrar Usuario */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-textSecondary hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <h2 className="text-2xl font-bold text-white mb-6">Nuevo Usuario</h2>
            
            <form onSubmit={handleRegisterAdmin} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-textSecondary mb-1">Nombres</label>
                  <input required type="text" className="input-field" value={newAdmin.nombres} onChange={e => setNewAdmin({...newAdmin, nombres: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-textSecondary mb-1">Apellidos</label>
                  <input required type="text" className="input-field" value={newAdmin.apellidos} onChange={e => setNewAdmin({...newAdmin, apellidos: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-textSecondary mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-textSecondary" />
                  <input required type="email" className="input-field pl-10" value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="block text-sm text-textSecondary mb-1">Contraseña Provisoria</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-textSecondary" />
                  <input required type={showPassword ? "text" : "password"} className="input-field pl-10 pr-10" value={newAdmin.contrasena} onChange={e => setNewAdmin({...newAdmin, contrasena: e.target.value})} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-textSecondary hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-textSecondary mb-1">Rol de Acceso</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-5 w-5 text-textSecondary" />
                  <select className="input-field pl-10 appearance-none bg-slate-900" value={newAdmin.rol} onChange={e => setNewAdmin({...newAdmin, rol: e.target.value})}>
                    <option value="ADMINISTRADOR">Administrador</option>
                    <option value="PRESTADOR_TECNICO">Técnico</option>
                    <option value="CLIENTE">Cliente</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 px-4 rounded-xl font-medium text-textSecondary hover:bg-slate-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowEditModal(false)} className="absolute top-4 right-4 text-textSecondary hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Editar Usuario</h2>
            
            <form onSubmit={submitEditUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-textSecondary mb-1">Nombres</label>
                  <input required type="text" className="input-field" value={editingUser.nombres || ''} onChange={e => setEditingUser({...editingUser, nombres: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm text-textSecondary mb-1">Apellidos</label>
                  <input required type="text" className="input-field" value={editingUser.apellidos || ''} onChange={e => setEditingUser({...editingUser, apellidos: e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-textSecondary mb-1">Teléfono</label>
                <input type="text" className="input-field" value={editingUser.telefono || ''} onChange={e => setEditingUser({...editingUser, telefono: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm text-textSecondary mb-1">Dirección</label>
                <input type="text" className="input-field" value={editingUser.direccion || ''} onChange={e => setEditingUser({...editingUser, direccion: e.target.value})} />
              </div>

              <div>
                <label className="block text-sm text-textSecondary mb-1">Rol</label>
                <select className="input-field appearance-none bg-slate-900" value={editingUser.rol || 'CLIENTE'} onChange={e => setEditingUser({...editingUser, rol: e.target.value})}>
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="PRESTADOR_TECNICO">Técnico</option>
                  <option value="CLIENTE">Cliente</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 px-4 rounded-xl font-medium text-textSecondary hover:bg-slate-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Visor de Documentos */}
      {documentViewer.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
          <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Visor de Documento
              </h2>
              <button onClick={() => setDocumentViewer({ isOpen: false, url: '', type: '' })} className="text-textSecondary hover:text-white transition-colors bg-slate-800 p-2 rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 p-4 bg-slate-900/50 flex items-center justify-center overflow-auto">
              {documentViewer.type === 'pdf' ? (
                <iframe 
                  src={documentViewer.url} 
                  className="w-full h-full rounded-xl border border-slate-700"
                  title="Visor PDF"
                />
              ) : (
                <img 
                  src={documentViewer.url} 
                  alt="Documento Credencial" 
                  className="max-w-full max-h-full rounded-xl object-contain shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
