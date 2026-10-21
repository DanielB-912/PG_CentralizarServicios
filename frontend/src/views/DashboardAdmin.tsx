import { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Users, BarChart3, Settings, LogOut, Search, Plus, Edit2, Trash2, X, Briefcase, Mail, Lock, Eye, EyeOff, UserCircle, FileText, Check, XCircle, Download, Clock, RotateCcw } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ProfileModal } from '../components/ProfileModal';
import { GlobalVoiceAssistant } from '../components/GlobalVoiceAssistant';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
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
  fecha_registro?: string;
  fechaRegistro?: string;
  telefono?: string;
  direccion?: string;
  foto_url?: string;
  id_prestador?: number;
  especialidad?: string;
  descripcion_profesional?: string;
  disponibilidad_horaria?: string;
  zona_cobertura?: string;
  macrodistrito?: string;
  lat_cobertura?: number;
  lng_cobertura?: number;
  radio_cobertura?: number;
  saldo?: number;
  total_credenciales?: number;
  credenciales_aprobadas?: number;
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

  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const isNewAdminNombresValid = newAdmin.nombres.trim().length > 0 && nameRegex.test(newAdmin.nombres);
  const showNewAdminNombresError = newAdmin.nombres.length > 0 && !nameRegex.test(newAdmin.nombres);

  const isNewAdminApellidosValid = newAdmin.apellidos.trim().length > 0 && nameRegex.test(newAdmin.apellidos);
  const showNewAdminApellidosError = newAdmin.apellidos.length > 0 && !nameRegex.test(newAdmin.apellidos);

  const isNewAdminEmailValid = emailRegex.test(newAdmin.email.trim());
  const showNewAdminEmailError = newAdmin.email.length > 0 && !isNewAdminEmailValid;

  const hasNewAdminMinLength = newAdmin.contrasena.length >= 8;
  const hasNewAdminUpperLower = /[A-Z]/.test(newAdmin.contrasena) && /[a-z]/.test(newAdmin.contrasena);
  const hasNewAdminNumber = /[0-9]/.test(newAdmin.contrasena);
  const hasNewAdminSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newAdmin.contrasena);
  const isNewAdminPasswordValid = hasNewAdminMinLength && hasNewAdminUpperLower && hasNewAdminNumber && hasNewAdminSpecial && newAdmin.contrasena.trim().length > 0;

  const isNewAdminFormValid = isNewAdminNombresValid && isNewAdminApellidosValid && isNewAdminEmailValid && isNewAdminPasswordValid;

  // Estado para Editar Usuario
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<Usuario>>({});
  const [inspectingUser, setInspectingUser] = useState<Usuario | null>(null);

  // Estado para Modal de Confirmación Personalizado
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string | number | null;
    nuevoEstado: number;
    accion: 'desactivar' | 'reactivar';
    nombreUsuario: string;
  }>({ isOpen: false, userId: null, nuevoEstado: 0, accion: 'desactivar', nombreUsuario: '' });

  // Estado para Configuración
  const [comision, setComision] = useState(5);

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
      const response = await axios.get('/api/admin/reportes', {
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
      const response = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await axios.get('/api/admin/configuracion/comision', {
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
      await axios.put('/api/admin/configuracion/comision', { comision }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar config:', error);
      toast.error('Error al guardar la configuración');
    }
  };

  const fetchCredenciales = async () => {
    try {
      const response = await axios.get('/api/admin/credenciales/pendientes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCredenciales(response.data);
    } catch (error) {
      console.error('Error al obtener credenciales:', error);
    }
  };

  const handleValidarCredencial = async (id: number, estado: string, tipoDocumentoActualizado?: string) => {
    try {
      await axios.put(`/api/admin/credenciales/${id}/validar`, {
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
    if (!isNewAdminFormValid) return;

    const cleanEmail = newAdmin.email.trim().toLowerCase();
    const cleanPassword = newAdmin.contrasena;
    const cleanNombres = newAdmin.nombres.trim();
    const cleanApellidos = newAdmin.apellidos.trim();

    try {
      await axios.post('/api/auth/register', {
        ...newAdmin,
        email: cleanEmail,
        contrasena: cleanPassword,
        nombres: cleanNombres,
        apellidos: cleanApellidos
      });
      setShowModal(false);
      setNewAdmin({ nombres: '', apellidos: '', email: '', contrasena: '', rol: 'ADMINISTRADOR' });
      toast.success('Administrador registrado exitosamente');
      fetchUsers();
    } catch (error: any) {
      console.error('Error al registrar usuario:', error);
      toast.error(error.response?.data?.error || 'Error al registrar usuario');
    }
  };

  const handleToggleUser = (userTarget: Usuario) => {
    const userId = userTarget.id_usuario || userTarget.id;
    const currentEstado = Number(userTarget.estado_activo);
    const accion = currentEstado === 1 ? 'desactivar' : 'reactivar';
    const nuevoEstado = currentEstado === 1 ? 0 : 1;
    const nombreUsuario = `${userTarget.nombres} ${userTarget.apellidos}`.trim();

    setConfirmModal({
      isOpen: true,
      userId,
      nuevoEstado,
      accion,
      nombreUsuario
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal.userId) return;
    try {
      await axios.patch(`/api/users/${confirmModal.userId}/estado`, {
        estado_activo: confirmModal.nuevoEstado
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Usuario ${confirmModal.accion === 'desactivar' ? 'desactivado' : 'reactivado'} correctamente`);

      // Si estaba abierto el modal de inspección, actualizar su estado reactivamente sin cerrarlo abruptamente
      if (inspectingUser && (inspectingUser.id_usuario === confirmModal.userId || inspectingUser.id === confirmModal.userId)) {
        setInspectingUser(prev => prev ? ({ ...prev, estado_activo: confirmModal.nuevoEstado }) : null);
      }

      setConfirmModal(prev => ({ ...prev, isOpen: false }));
      fetchUsers();
    } catch (error) {
      console.error(`Error al ${confirmModal.accion} usuario:`, error);
      toast.error(`Error al ${confirmModal.accion} usuario`);
    }
  };



  const handleEditUser = (userToEdit: Usuario) => {
    setEditingUser(userToEdit);
    setShowEditModal(true);
  };

  const submitEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(`/api/users/${editingUser.id_usuario}`, {
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
    
    // Header Banner
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text('SISTEMA DE GESTIÓN Y CENTRALIZACIÓN', 105, 15, { align: 'center' });
    doc.text('DE SERVICIOS COCHABAMBA', 105, 22, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 200, 200);
    doc.text('Reporte de Rendimiento y Sostenibilidad Financiera', 105, 30, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Emisión: ${new Date().toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}`, 105, 36, { align: 'center' });

    // Reset styles
    doc.setTextColor(0, 0, 0);

    // KPI Cards (4 columns)
    const m = reportes;
    const ticketPromedio = m.serviciosVinculados > 0 ? (m.ingresosTotales / m.serviciosVinculados).toFixed(2) : '0.00';
    
    const kpis = [
      { title: 'Usuarios', value: m.usuariosTotales || '0' },
      { title: 'Concretados', value: m.serviciosVinculados || '0' },
      { title: 'Total Bs.', value: m.ingresosTotales || '0' },
      { title: 'Com. Prom', value: `Bs. ${ticketPromedio}` }
    ];

    let startX = 14;
    kpis.forEach(kpi => {
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(startX, 45, 42, 20, 2, 2, 'FD');
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.title, startX + 21, 52, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(kpi.value.toString(), startX + 21, 60, { align: 'center' });
      
      startX += 46;
    });

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.text('Demanda por Macrodistrito', 14, 76);

    const macroData = (reportes.macrodistritos || []).map((mac: any) => {
      const total = reportes.macrodistritos.reduce((acc: number, x: any) => acc + parseInt(x.cantidad), 0);
      const widthPercent = total > 0 ? (parseInt(mac.cantidad) / total) * 100 : 0;
      return [mac.macrodistrito, mac.cantidad, `${widthPercent.toFixed(1)}%`];
    });

    autoTable(doc, {
      startY: 81,
      head: [['Macrodistrito', 'Cantidad de Solicitudes', 'Porcentaje']],
      body: macroData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.text('Historial de Transacciones (Comisiones)', 14, finalY + 12);

    let sumaComisiones = 0;
    const tableData = (reportes.transacciones || []).map((t: any, idx: number) => {
      const comision = parseFloat(t.monto) * 0.08;
      sumaComisiones += comision;
      return [
        (idx + 1).toString(),
        new Date(t.fecha).toLocaleString('es-BO', { timeZone: 'America/La_Paz' }),
        `${t.prestador}`,
        `${t.prestador_especialidad || 'Especialista'}`,
        `Bs. ${t.monto}`,
        `Bs. ${comision.toFixed(2)}`
      ];
    });

    tableData.push([
      '', '', '', '', 'TOTAL COMISIONES', `Bs. ${sumaComisiones.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: finalY + 17,
      head: [['#', 'Fecha y Hora', 'Prestador', 'Especialidad', 'Monto Servicio', 'Comisión (8%)']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59] },
      didParseCell: function (data: any) {
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    });

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Documento oficial generado por la Plataforma Centralizada de Servicios Cochabamba - Validez Administrativa Interna - Página ${i} de ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

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
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors">
                <h3 className="text-textSecondary text-sm font-medium">Usuarios Totales</h3>
                <p className="text-3xl font-bold text-white mt-2">{reportes.usuariosTotales || 0}</p>
                <p className="text-xs text-emerald-400 mt-2">Clientes y Técnicos</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors">
                <h3 className="text-textSecondary text-sm font-medium">Vinculaciones</h3>
                <p className="text-3xl font-bold text-white mt-2">{reportes.serviciosVinculados || 0}</p>
                <p className="text-xs text-emerald-400 mt-2">Totales históricos</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors">
                <h3 className="text-textSecondary text-sm font-medium">Ingresos Totales</h3>
                <p className="text-3xl font-bold text-primary mt-2">Bs. {reportes.ingresosTotales || 0}</p>
                <p className="text-xs text-emerald-400 mt-2">Generado por comisiones</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors">
                <h3 className="text-textSecondary text-sm font-medium">Tasa de Comisión</h3>
                <p className="text-3xl font-bold text-accent mt-2">{comision}%</p>
                <p className="text-xs text-emerald-400 mt-2">Configuración Actual</p>
              </div>
              <div className="glass-panel p-6 rounded-xl border border-primary/20 hover:border-primary/50 transition-colors">
                <h3 className="text-textSecondary text-sm font-medium">Comisión Promedio por Servicio</h3>
                <p className="text-3xl font-bold text-amber-400 mt-2">Bs. {reportes.serviciosVinculados > 0 ? (reportes.ingresosTotales / reportes.serviciosVinculados).toFixed(2) : '0.00'}</p>
                <p className="text-xs text-emerald-400 mt-2">Comisión / Vinculación</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="glass-panel rounded-xl border border-slate-700 p-6">
                <h3 className="text-lg font-bold text-white mb-6">Ingresos por Comisiones (Últimos Días)</h3>
                <div className="h-72 w-full flex items-end justify-around pb-4 pt-10 border-b border-l border-slate-700 relative">
                  {(!reportes.ingresosDiarios || reportes.ingresosDiarios.length === 0) ? (
                    <div className="absolute inset-0 flex items-center justify-center text-textSecondary">Sin datos suficientes</div>
                  ) : (
                    [...reportes.ingresosDiarios].reverse().map((d: any, i: number) => {
                      const maxMonto = Math.max(...reportes.ingresosDiarios.map((x:any) => parseFloat(x.total_comision)), 1);
                      const heightPercent = Math.max(Math.round((parseFloat(d.total_comision) / maxMonto) * 100), 8);
                      return (
                        <div key={i} className="flex flex-col items-center group relative w-1/6 h-full justify-end">
                          <div className="absolute -top-10 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap shadow-lg">
                            Bs. {parseFloat(d.total_comision).toFixed(2)} - {d.total_vinculaciones} Vinculaciones
                          </div>
                          <div 
                            className="w-full max-w-[40px] bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-t-md hover:opacity-80 transition-opacity" 
                            style={{ height: `${heightPercent}%`, minHeight: '8px' }}
                          ></div>
                          <span className="text-xs text-slate-400 mt-2 truncate w-full text-center">{new Date(d.fecha).toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: '2-digit', month: '2-digit' })}</span>
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
                      <th className="p-4 font-medium">#</th>
                      <th className="p-4 font-medium">Fecha</th>
                      <th className="p-4 font-medium">Prestador</th>
                      <th className="p-4 font-medium">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {(reportes.transacciones || []).map((t: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 text-textSecondary text-xs">{idx + 1}</td>
                        <td className="p-4 text-textSecondary text-xs">{new Date(t.fecha).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</td>
                        <td className="p-4 text-white font-medium">
                          {t.prestador}
                          <div className="text-xs text-textSecondary font-normal">{t.prestador_especialidad}</div>
                        </td>
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
                      <tr key={u.id_usuario || u.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-4 text-slate-400 font-mono text-sm font-semibold">#{u.id_usuario || u.id}</td>
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
                          <span className={`flex items-center gap-1.5 text-sm ${Number(u.estado_activo) === 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${Number(u.estado_activo) === 1 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                            {Number(u.estado_activo) === 1 ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setInspectingUser(u)} 
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Inspeccionar perfil y antecedentes"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleEditUser(u)} 
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-800 rounded-lg transition-colors" 
                              title="Editar usuario"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleToggleUser(u)} 
                              className={`p-1.5 rounded-lg transition-colors ${
                                Number(u.estado_activo) === 1 
                                  ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' 
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                              }`} 
                              title={Number(u.estado_activo) === 1 ? "Desactivar usuario" : "Reactivar usuario"}
                            >
                              {Number(u.estado_activo) === 1 ? <Trash2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
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
                    onClick={() => setDocumentViewer({ isOpen: true, url: cred.documento_url.startsWith('http') ? cred.documento_url : cred.documento_url, type: cred.documento_url.endsWith('.pdf') ? 'pdf' : 'image' })}
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
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-medium">Modo Mantenimiento</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                        Próximamente (Fase 2)
                      </span>
                    </div>
                    <span className="text-xs text-textSecondary block">Deshabilita el acceso a usuarios regulares temporalmente.</span>
                    <span className="text-[11px] text-amber-400/80 italic mt-0.5 block">
                      Parámetro reservado para futuras implementaciones
                    </span>
                  </div>
                  <button 
                    type="button"
                    disabled
                    title="Parámetro reservado para futuras implementaciones"
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-700/60 opacity-60 cursor-not-allowed transition-colors shrink-0"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-medium">Registro Automático de Técnicos</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                        Próximamente (Fase 2)
                      </span>
                    </div>
                    <span className="text-xs text-textSecondary block">Aprobar automáticamente cuentas de técnicos nuevos.</span>
                    <span className="text-[11px] text-amber-400/80 italic mt-0.5 block">
                      Parámetro reservado para futuras implementaciones
                    </span>
                  </div>
                  <button 
                    type="button"
                    disabled
                    title="Parámetro reservado para futuras implementaciones"
                    className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-700/60 opacity-60 cursor-not-allowed transition-colors shrink-0"
                  >
                    <span className="inline-block h-4 w-4 transform rounded-full bg-slate-400 translate-x-1 transition-transform" />
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
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-primary/20 hover:ring-primary/50 transition-all overflow-hidden relative">
                <span className="absolute inset-0 flex items-center justify-center">
                  {user?.nombres?.charAt(0) || 'A'}
                </span>
                {user?.foto_url && (
                  <img 
                    src={user.foto_url.startsWith('http') || user.foto_url.startsWith('/') ? user.foto_url : `/uploads/${user.foto_url}`} 
                    alt="avatar" 
                    className="w-full h-full object-cover relative z-10" 
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }} 
                  />
                )}
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

        {/* Selector de Pestañas Móvil para Administrador */}
        <div className="md:hidden flex bg-surface border-b border-slate-700 p-2 gap-2 overflow-x-auto shrink-0 custom-scrollbar">
          <button 
            onClick={() => setActiveTab('metricas')} 
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === 'metricas' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-slate-800'}`}
          >
            Métricas
          </button>
          <button 
            onClick={() => setActiveTab('usuarios')} 
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === 'usuarios' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-slate-800'}`}
          >
            Usuarios
          </button>
          <button 
            onClick={() => setActiveTab('credenciales')} 
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === 'credenciales' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-slate-800'}`}
          >
            Credenciales
          </button>
          <button 
            onClick={() => setActiveTab('configuracion')} 
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeTab === 'configuracion' ? 'bg-primary text-white shadow-md' : 'text-textSecondary hover:bg-slate-800'}`}
          >
            Configuración
          </button>
        </div>

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
            
            <form onSubmit={handleRegisterAdmin} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-textSecondary mb-1">Nombres</label>
                  <input 
                    type="text" 
                    className={`input-field ${showNewAdminNombresError ? 'border-red-500 focus:border-red-500' : ''}`}
                    value={newAdmin.nombres} 
                    onChange={e => setNewAdmin({...newAdmin, nombres: e.target.value})} 
                    placeholder="Juan"
                  />
                  {showNewAdminNombresError && (
                    <p className="text-red-400 text-xs mt-1">Los nombres solo deben contener letras</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-textSecondary mb-1">Apellidos</label>
                  <input 
                    type="text" 
                    className={`input-field ${showNewAdminApellidosError ? 'border-red-500 focus:border-red-500' : ''}`}
                    value={newAdmin.apellidos} 
                    onChange={e => setNewAdmin({...newAdmin, apellidos: e.target.value})} 
                    placeholder="Pérez"
                  />
                  {showNewAdminApellidosError && (
                    <p className="text-red-400 text-xs mt-1">Los apellidos solo deben contener letras</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-textSecondary mb-1">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-textSecondary" />
                  <input 
                    type="email" 
                    className={`input-field pl-10 ${showNewAdminEmailError ? 'border-red-500 focus:border-red-500' : ''}`}
                    value={newAdmin.email} 
                    onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} 
                    placeholder="usuario@dominio.com"
                  />
                </div>
                {showNewAdminEmailError && (
                  <p className="text-red-400 text-xs mt-1">
                    Ingrese un formato de correo electrónico válido (ej. usuario@dominio.com)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm text-textSecondary mb-1">Contraseña Provisoria</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-textSecondary" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="input-field pl-10 pr-10" 
                    value={newAdmin.contrasena} 
                    onChange={e => setNewAdmin({...newAdmin, contrasena: e.target.value})} 
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-textSecondary hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Checklist Dinámico */}
                <div className="mt-2.5 bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className={`flex items-center gap-2 transition-colors ${hasNewAdminMinLength ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <Check className={`w-3.5 h-3.5 transition-colors ${hasNewAdminMinLength ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-2 transition-colors ${hasNewAdminUpperLower ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <Check className={`w-3.5 h-3.5 transition-colors ${hasNewAdminUpperLower ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Al menos una mayúscula y una minúscula</span>
                  </div>
                  <div className={`flex items-center gap-2 transition-colors ${hasNewAdminNumber ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <Check className={`w-3.5 h-3.5 transition-colors ${hasNewAdminNumber ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Al menos un número</span>
                  </div>
                  <div className={`flex items-center gap-2 transition-colors ${hasNewAdminSpecial ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                    <Check className={`w-3.5 h-3.5 transition-colors ${hasNewAdminSpecial ? 'text-emerald-400' : 'text-slate-600'}`} />
                    <span>Al menos un carácter especial (!@#$%^&*...)</span>
                  </div>
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
                <button 
                  type="submit" 
                  disabled={!isNewAdminFormValid}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                    isNewAdminFormValid 
                      ? 'btn-primary cursor-pointer' 
                      : 'bg-slate-700/50 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
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

      {/* Modal de Inspección de Usuario (Auditoría Administrativa) */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface border border-slate-700 rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setInspectingUser(null)} 
              className="absolute top-5 right-5 text-textSecondary hover:text-white transition-colors bg-slate-800 p-2 rounded-xl border border-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-start gap-4 mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0 overflow-hidden border border-indigo-500/40 relative">
                <span className="absolute inset-0 flex items-center justify-center">
                  {inspectingUser.nombres?.charAt(0) || 'U'}
                </span>
                {inspectingUser.foto_url && (
                  <img 
                    src={inspectingUser.foto_url.startsWith('http') || inspectingUser.foto_url.startsWith('/') ? inspectingUser.foto_url : `/uploads/${inspectingUser.foto_url}`} 
                    alt="avatar" 
                    className="w-full h-full object-cover relative z-10" 
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }} 
                  />
                )}
              </div>
              <div className="flex-1 min-w-0 pr-8">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-white truncate">{inspectingUser.nombres} {inspectingUser.apellidos}</h2>
                  <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${
                    inspectingUser.rol === 'ADMINISTRADOR' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                    inspectingUser.rol === 'PRESTADOR_TECNICO' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  }`}>
                    {inspectingUser.rol}
                  </span>
                  <span className={`flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${Number(inspectingUser.estado_activo) === 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${Number(inspectingUser.estado_activo) === 1 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                    {Number(inspectingUser.estado_activo) === 1 ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <p className="text-sm text-textSecondary truncate">{inspectingUser.email}</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Información Personal y Contacto */}
              <div className="bg-slate-900/60 rounded-2xl p-5 border border-slate-800">
                <h3 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-4">Datos de Cuenta y Contacto</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-textSecondary text-xs block mb-0.5">Correo Electrónico</span>
                    <span className="text-white font-medium break-all">{inspectingUser.email}</span>
                  </div>
                  <div>
                    <span className="text-textSecondary text-xs block mb-0.5">Teléfono de Contacto</span>
                    <span className="text-white font-medium">{inspectingUser.telefono || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-textSecondary text-xs block mb-0.5">Dirección Domiciliaria</span>
                    <span className="text-white font-medium">{inspectingUser.direccion || 'No especificada'}</span>
                  </div>
                  <div>
                    <span className="text-textSecondary text-xs block mb-0.5">Fecha de Registro</span>
                    <span className="text-white font-medium">
                      {inspectingUser.fecha_registro 
                        ? new Date(inspectingUser.fecha_registro).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Reciente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Si es PRESTADOR_TECNICO: Antecedentes, Credenciales y Cobertura */}
              {inspectingUser.rol === 'PRESTADOR_TECNICO' && (
                <div className="bg-slate-900/60 rounded-2xl p-5 border border-amber-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Perfil Profesional y Credenciales</h3>
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full font-medium">
                      {inspectingUser.especialidad || 'Especialista'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-textSecondary text-xs block mb-0.5">Macrodistrito Base</span>
                      <span className="text-white font-medium">{inspectingUser.macrodistrito || 'Cochabamba Centro'}</span>
                    </div>
                    <div>
                      <span className="text-textSecondary text-xs block mb-0.5">Disponibilidad Horaria</span>
                      <span className="text-white font-medium">{inspectingUser.disponibilidad_horaria || 'A convenir'}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-textSecondary text-xs block mb-0.5">Saldo en Monedero</span>
                      {parseFloat(inspectingUser.saldo?.toString() || '0') < 0 ? (
                        <div>
                          <span className="text-red-400 font-bold block text-base">Bs. {parseFloat(inspectingUser.saldo?.toString() || '0').toFixed(2)}</span>
                          <span className="text-xs text-red-400 font-medium flex items-center gap-1 mt-0.5">
                            ⚠️ Saldo deudor (Pendiente de regularización)
                          </span>
                        </div>
                      ) : (
                        <span className="text-emerald-400 font-bold text-base">Bs. {parseFloat(inspectingUser.saldo?.toString() || '0').toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Minimapa de Cobertura */}
                  {inspectingUser.lat_cobertura !== undefined && 
                   inspectingUser.lat_cobertura !== null && 
                   inspectingUser.lng_cobertura !== undefined && 
                   inspectingUser.lng_cobertura !== null && 
                   !isNaN(Number(inspectingUser.lat_cobertura)) && 
                   !isNaN(Number(inspectingUser.lng_cobertura)) && 
                   Number(inspectingUser.lat_cobertura) !== 0 && 
                   Number(inspectingUser.lng_cobertura) !== 0 ? (
                    <div className="mb-4">
                      <span className="text-textSecondary text-xs block mb-1">Delimitación Geográfica de Cobertura</span>
                      <div className="h-44 w-full rounded-xl overflow-hidden border border-slate-700 mt-2 z-0 relative">
                        <MapContainer 
                          center={[Number(inspectingUser.lat_cobertura), Number(inspectingUser.lng_cobertura)]} 
                          zoom={13} 
                          dragging={false} 
                          scrollWheelZoom={false} 
                          className="h-full w-full"
                        >
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                          <Marker position={[Number(inspectingUser.lat_cobertura), Number(inspectingUser.lng_cobertura)]}/>
                          <Circle 
                            center={[Number(inspectingUser.lat_cobertura), Number(inspectingUser.lng_cobertura)]} 
                            radius={Number(inspectingUser.radio_cobertura) || 3000} 
                            pathOptions={{ color: '#6366f1', fillColor: '#6366f1', fillOpacity: 0.2 }}
                          />
                        </MapContainer>
                      </div>
                      <p className="text-xs text-slate-300 mt-2 font-medium bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                        📍 Radio de cobertura: {inspectingUser.radio_cobertura ? `${(Number(inspectingUser.radio_cobertura) / 1000).toFixed(1)} km` : '3 km'} a la redonda ({inspectingUser.zona_cobertura || inspectingUser.macrodistrito})
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4 bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 text-xs text-textSecondary">
                      El prestador no delimitó un área geográfica específica; atiende en todo su macrodistrito base ({inspectingUser.macrodistrito || 'Cochabamba Centro'}).
                    </div>
                  )}

                  <div className="border-t border-slate-800 pt-3">
                    <span className="text-textSecondary text-xs block mb-1">Descripción / Biografía</span>
                    <p className="text-white/90 text-sm italic bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                      "{inspectingUser.descripcion_profesional || 'Sin descripción registrada aún.'}"
                    </p>
                  </div>

                  <div className="border-t border-slate-800 pt-4 mt-4 flex items-center justify-between">
                    <div>
                      <span className="text-textSecondary text-xs block">Auditoría de Documentos / CI</span>
                      <span className="text-white font-medium text-sm">
                        {inspectingUser.credenciales_aprobadas || 0} aprobadas de {inspectingUser.total_credenciales || 0} registradas
                      </span>
                    </div>
                    {(inspectingUser.credenciales_aprobadas || 0) > 0 ? (
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs rounded-full font-medium flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5" /> Antecedentes Verificados
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs rounded-full font-medium flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Pendiente de Acreditación
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Botones de Acción para Administrador */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => setInspectingUser(null)} 
                  className="flex-1 py-3 px-4 rounded-xl font-medium text-textSecondary hover:bg-slate-800 transition-colors border border-slate-700"
                >
                  Cerrar
                </button>
                <button 
                  onClick={() => {
                    const target = inspectingUser;
                    setInspectingUser(null);
                    handleEditUser(target);
                  }} 
                  className="flex-1 py-3 px-4 rounded-xl font-medium btn-primary flex items-center justify-center gap-2"
                >
                  <Edit2 className="h-4 w-4" /> Editar Usuario
                </button>
                <button 
                  onClick={() => handleToggleUser(inspectingUser)} 
                  className={`py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 border ${
                    Number(inspectingUser.estado_activo) === 1 
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/40' 
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {Number(inspectingUser.estado_activo) === 1 ? (
                    <>
                      <Trash2 className="h-4 w-4" /> Desactivar Usuario
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Reactivar Usuario
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación Personalizado (Dark Mode) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">¿Confirmar acción?</h3>
            <p className="text-sm text-textSecondary mb-6 leading-relaxed">
              ¿Está seguro de que desea <strong className={confirmModal.accion === 'desactivar' ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>{confirmModal.accion}</strong> al usuario <strong className="text-white">{confirmModal.nombreUsuario}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="py-2.5 px-4 rounded-xl font-medium text-textSecondary hover:bg-slate-800 transition-colors border border-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`py-2.5 px-5 rounded-xl font-medium transition-all ${
                  confirmModal.accion === 'desactivar'
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
