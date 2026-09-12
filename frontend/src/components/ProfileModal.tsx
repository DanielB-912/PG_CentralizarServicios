import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { X, Lock, Eye, EyeOff, Save, ShieldCheck, Camera, UserCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const LocationSelector = ({ position, setPosition, setFormData }: any) => {
  const markerRef = useRef<any>(null);

  const fetchNominatim = (lat: number, lng: number) => {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`)
      .then(res => res.json())
      .then(data => {
        const street = data.address?.road || data.address?.pedestrian || data.address?.suburb || data.address?.neighbourhood || data.display_name?.split(',')[0] || 'Ubicación seleccionada';
        const locationStr = JSON.stringify(data.address || {}).toLowerCase();
        let macrodistrito = 'Centro';
        if (locationStr.includes('cala cala') || locationStr.includes('querú querú') || locationStr.includes('aranjuez')) macrodistrito = 'Cala Cala';
        else if (locationStr.includes('sud') || locationStr.includes('jaihuayco') || locationStr.includes('valle hermoso') || locationStr.includes('alalay')) macrodistrito = 'Sud';
        else if (locationStr.includes('sacaba') || locationStr.includes('huayllani') || locationStr.includes('quintanilla')) macrodistrito = 'Sacaba';
        else if (locationStr.includes('quillacollo') || locationStr.includes('colcapirhua') || locationStr.includes('tiquipaya')) macrodistrito = 'Quillacollo';
        
        setFormData((prev: any) => ({
          ...prev, 
          zona_cobertura: street,
          macrodistrito: macrodistrito,
          lat_cobertura: lat,
          lng_cobertura: lng
        }));
      })
      .catch(err => console.error("Error geocodificando:", err));
  };

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      fetchNominatim(e.latlng.lat, e.latlng.lng);
    },
  });

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        setPosition(latlng);
        fetchNominatim(latlng.lat, latlng.lng);
      }
    },
  };

  return position ? (
    <Marker 
      draggable={true}
      eventHandlers={eventHandlers}
      position={position} 
      ref={markerRef}
    />
  ) : null;
};

const MapUpdater = () => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
};

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, token, updateUser } = useContext(AuthContext);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit State
  const [formData, setFormData] = useState({
    nombres: user?.nombres || '',
    apellidos: user?.apellidos || '',
    telefono: user?.telefono || '',
    foto_url: user?.foto_url || '',
    especialidad: user?.prestador?.especialidad || '',
    macrodistrito: user?.prestador?.macrodistrito || '',
    descripcion_profesional: '',
    disponibilidad_horaria: '',
    zona_cobertura: user?.prestador?.zona_cobertura || '',
    lat_cobertura: user?.prestador?.lat_cobertura || null,
    lng_cobertura: user?.prestador?.lng_cobertura || null,
    radio_cobertura: user?.prestador?.radio_cobertura || 3000
  });

  const [selectedPosition, setSelectedPosition] = useState<L.LatLng | null>(
    user?.prestador?.lat_cobertura && user?.prestador?.lng_cobertura
      ? L.latLng(user.prestador.lat_cobertura, user.prestador.lng_cobertura)
      : null
  );
  const [mapCenter] = useState<L.LatLngExpression>(
    user?.prestador?.lat_cobertura && user?.prestador?.lng_cobertura
      ? [user.prestador.lat_cobertura, user.prestador.lng_cobertura]
      : [-17.3895, -66.1568]
  );

  // Eliminado el useEffect asíncrono; la lógica de autocompletado y geocodificación
  // ahora es controlada reactivamente y de forma inmediata por el LocationSelector

  const [hasApproved, setHasApproved] = useState(false);
  const [credenciales, setCredenciales] = useState<any[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        nombres: user?.nombres || '',
        apellidos: user?.apellidos || '',
        telefono: user?.telefono || '',
        foto_url: user?.foto_url || ''
      }));

      if (user?.rol === 'PRESTADOR_TECNICO') {
        axios.get('http://localhost:3001/api/prestadores/me', {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          // Mapeo legacy
          let mappedEspecialidad = res.data.especialidad || '';
          const esLegacy = mappedEspecialidad.toLowerCase();
          if (esLegacy.includes('plom')) mappedEspecialidad = 'Plomería y Gasfitería';
          else if (esLegacy.includes('elec')) mappedEspecialidad = 'Electricidad Residencial e Industrial';
          else if (esLegacy.includes('alba') || esLegacy.includes('cons')) mappedEspecialidad = 'Albañilería y Construcción';
          else if (esLegacy.includes('pint')) mappedEspecialidad = 'Pintura y Acabados';
          else if (esLegacy.includes('carp')) mappedEspecialidad = 'Carpintería y Mueblería';
          else if (esLegacy.includes('limp')) mappedEspecialidad = 'Limpieza Profunda y Desinfección';

          setFormData(prev => ({
            ...prev,
            especialidad: mappedEspecialidad,
            macrodistrito: res.data.macrodistrito || '',
            descripcion_profesional: res.data.descripcion_profesional || '',
            disponibilidad_horaria: res.data.disponibilidad_horaria || '',
            zona_cobertura: res.data.zona_cobertura || '',
            lat_cobertura: res.data.lat_cobertura || null,
            lng_cobertura: res.data.lng_cobertura || null,
            radio_cobertura: res.data.radio_cobertura || 3000
          }));
          if (res.data.lat_cobertura && res.data.lng_cobertura && !selectedPosition) {
            setSelectedPosition(L.latLng(res.data.lat_cobertura, res.data.lng_cobertura));
          }
          setHasApproved(res.data.has_approved_credential === 1);
          if (res.data.credenciales) {
            setCredenciales(res.data.credenciales);
          }
        }).catch(err => console.error(err));
      }
    }
  }, [isOpen, user, token]);

  if (!isOpen) return null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const data = new FormData();
      data.append('avatar', file);

      const res = await axios.post('http://localhost:3001/api/users/me/avatar', data, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setFormData(prev => ({ ...prev, foto_url: res.data.foto_url }));
      setStatus('success');
      toast.success('Foto de perfil actualizada. Reinicia sesión para ver los cambios.');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      toast.error(err.response?.data?.error || 'Error al subir la imagen');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas nuevas no coinciden');
      setStatus('error');
      return;
    }

    try {
      setStatus('loading');
      await axios.put(
        'http://localhost:3001/api/users/me/password',
        {
          contrasenaActual: currentPassword,
          nuevaContrasena: newPassword
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setStatus('success');
      toast.success('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error: any) {
      setStatus('error');
      toast.error(error.response?.data?.error || 'Error al actualizar la contraseña');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setStatus('loading');
      
      const payload = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        telefono: formData.telefono,
        foto_url: formData.foto_url,
        ...(user?.rol === 'PRESTADOR_TECNICO' ? {
          especialidad: formData.especialidad,
          macrodistrito: formData.macrodistrito,
          descripcion_profesional: formData.descripcion_profesional,
          disponibilidad_horaria: formData.disponibilidad_horaria,
          zona_cobertura: formData.zona_cobertura,
          lat_cobertura: formData.lat_cobertura,
          lng_cobertura: formData.lng_cobertura,
          radio_cobertura: formData.radio_cobertura
        } : {})
      };

      const res = await axios.put(
        'http://localhost:3001/api/users/me/profile',
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.user) {
        updateUser(res.data.user);
      }

      setStatus('success');
      toast.success('Perfil actualizado correctamente.');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (error: any) {
      setStatus('error');
      toast.error(error.response?.data?.error || 'Error al actualizar el perfil');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto p-0 md:p-6">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-slate-400 hover:text-white bg-slate-800/80 p-2 rounded-full transition-colors"
        >
          <X size={20} />
        </button>

        <div className="overflow-hidden rounded-2xl">
          {/* Header Background */}
          <div className="h-32 bg-gradient-to-r from-accent to-primary relative"></div>

          <div className="px-6 pb-6 lg:px-8 lg:pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Columna Izquierda: Tarjeta de Identidad */}
            <div className="md:col-span-1 -mt-16 relative">
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl flex flex-col items-center text-center relative">
                
                {/* Avatar with Dual Selector */}
                <div className="relative group mb-4">
                  <div className="h-28 w-28 rounded-full bg-slate-700 border-4 border-surface shadow-lg overflow-hidden flex items-center justify-center text-3xl font-bold text-primary">
                    {formData.foto_url ? (
                      <img src={formData.foto_url} alt="avatar" className="h-full w-full object-cover" />
                    ) : (
                      user?.nombres.charAt(0)
                    )}
                  </div>
                  
                  {/* Avatar Upload Overlay */}
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-4 border-transparent"
                  >
                    <Camera className="h-8 w-8 text-white mb-1" />
                    <span className="text-[10px] text-white font-medium">Cambiar</span>
                  </div>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="user" 
                    ref={fileInputRef} 
                    onChange={handleAvatarUpload} 
                    className="hidden" 
                  />
                  
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-slate-900/80 rounded-full flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-bold text-white mb-1">{formData.nombres} {formData.apellidos}</h2>
                <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-semibold rounded-full uppercase tracking-wider mb-4">
                  {user?.rol.replace('_', ' ')}
                </span>
                
                {user?.rol === 'PRESTADOR_TECNICO' && (
                  <div className="w-full bg-slate-900/50 rounded-xl p-4 mt-2">
                    <h3 className="text-sm font-semibold text-textSecondary text-left mb-3 uppercase tracking-wider">Acreditaciones</h3>
                    
                    {hasApproved ? (
                      <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg text-emerald-400">
                        <ShieldCheck className="h-5 w-5 flex-shrink-0" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Documentos Validados</p>
                          <p className="text-[10px] opacity-80">Por Administración</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 p-2 rounded-lg text-red-400">
                        <X className="h-5 w-5 flex-shrink-0" />
                        <div className="text-left">
                          <p className="text-sm font-medium">Cuenta no validada</p>
                          <p className="text-[10px] opacity-80">Requiere revisión</p>
                        </div>
                      </div>
                    )}
                    
                    {credenciales.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {credenciales.map((cred, idx) => (
                          <div key={idx} className="bg-slate-800 p-2 rounded-lg border border-slate-700 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] text-textSecondary uppercase">{cred.tipo_documento}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                cred.estado_validacion === 'APROBADO' ? 'bg-emerald-500/20 text-emerald-400' :
                                cred.estado_validacion === 'RECHAZADO' ? 'bg-red-500/20 text-red-400' :
                                'bg-amber-500/20 text-amber-400'
                              }`}>
                                {cred.estado_validacion}
                              </span>
                            </div>
                            <a 
                              href={cred.documento_url.startsWith('http') ? cred.documento_url : `http://localhost:3001${cred.documento_url}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-xs text-center bg-slate-700 hover:bg-slate-600 text-white py-1 rounded transition-colors"
                            >
                              Ver / Descargar Documento
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Formularios */}
            <div className="md:col-span-2 pt-6">
              


              {/* Formulario de Perfil Editable */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <UserCircle className="h-5 w-5 text-accent" />
                  Información Personal
                </h3>
                
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Nombres</label>
                      <input required type="text" className="input-field py-2.5" value={formData.nombres} onChange={e => setFormData({...formData, nombres: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Apellidos</label>
                      <input required type="text" className="input-field py-2.5" value={formData.apellidos} onChange={e => setFormData({...formData, apellidos: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Teléfono de Contacto</label>
                      <input required type="text" className="input-field py-2.5" placeholder={user?.telefono || "Ej. 70000000"} value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Correo Electrónico (Solo lectura)</label>
                      <input type="text" className="input-field py-2.5 opacity-50 cursor-not-allowed" disabled value={user?.email || ''} />
                    </div>
                  </div>

                  {user?.rol === 'PRESTADOR_TECNICO' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-700/50 mt-4">
                      <div>
                        <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Especialidad Principal u Oficio</label>
                        <select 
                          required 
                          className="input-field py-2.5 bg-slate-900" 
                          value={formData.especialidad} 
                          onChange={e => setFormData({...formData, especialidad: e.target.value})} 
                        >
                          <option value="">Selecciona tu especialidad...</option>
                          <optgroup label="Oficios Técnicos y Servicios Generales">
                            <option value="Plomería y Gasfitería">Plomería y Gasfitería</option>
                            <option value="Electricidad Residencial e Industrial">Electricidad Residencial e Industrial</option>
                            <option value="Albañilería y Construcción">Albañilería y Construcción</option>
                            <option value="Pintura y Acabados">Pintura y Acabados</option>
                            <option value="Carpintería y Mueblería">Carpintería y Mueblería</option>
                            <option value="Cerrajería">Cerrajería</option>
                            <option value="Multiservicios / Arreglos Generales del Hogar">Multiservicios / Arreglos Generales del Hogar</option>
                            <option value="Jardinería y Paisajismo">Jardinería y Paisajismo</option>
                            <option value="Climatización y Refrigeración">Climatización y Refrigeración</option>
                            <option value="Mecánica y Auxilio Vehicular">Mecánica y Auxilio Vehicular</option>
                            <option value="Limpieza Profunda y Desinfección">Limpieza Profunda y Desinfección</option>
                          </optgroup>
                          <optgroup label="Servicios Profesionales e Ingenierías">
                            <option value="Ingeniería de Sistemas / Soporte Técnico / Redes">Ingeniería de Sistemas / Soporte Técnico / Redes</option>
                            <option value="Ingeniería Electrónica / Automatización">Ingeniería Electrónica / Automatización</option>
                            <option value="Arquitectura y Diseño de Interiores">Arquitectura y Diseño de Interiores</option>
                            <option value="Ingeniería Civil / Supervisión de Obras">Ingeniería Civil / Supervisión de Obras</option>
                            <option value="Contabilidad, Auditoría y Finanzas">Contabilidad, Auditoría y Finanzas</option>
                            <option value="Asesoría Legal y Jurídica">Asesoría Legal y Jurídica</option>
                            <option value="Diseño Gráfico y Marketing Digital">Diseño Gráfico y Marketing Digital</option>
                          </optgroup>
                          {/* Fallback option para legacy seeds si no coinciden */}
                          {formData.especialidad && ![
                            "Plomería y Gasfitería", "Electricidad Residencial e Industrial", "Albañilería y Construcción", 
                            "Pintura y Acabados", "Carpintería y Mueblería", "Cerrajería", "Multiservicios / Arreglos Generales del Hogar", 
                            "Jardinería y Paisajismo", "Climatización y Refrigeración", "Mecánica y Auxilio Vehicular", 
                            "Limpieza Profunda y Desinfección", "Ingeniería de Sistemas / Soporte Técnico / Redes", 
                            "Ingeniería Electrónica / Automatización", "Arquitectura y Diseño de Interiores", 
                            "Ingeniería Civil / Supervisión de Obras", "Contabilidad, Auditoría y Finanzas", 
                            "Asesoría Legal y Jurídica", "Diseño Gráfico y Marketing Digital"
                          ].includes(formData.especialidad) && (
                            <option value={formData.especialidad}>{formData.especialidad} (Legacy)</option>
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Macrodistrito Base</label>
                        <select required className="input-field py-2.5" value={formData.macrodistrito} onChange={e => setFormData({...formData, macrodistrito: e.target.value})}>
                          <option value="">Selecciona...</option>
                          <option value="Centro">Centro</option>
                          <option value="Sud">Sud</option>
                          <option value="Cala Cala">Cala Cala</option>
                          <option value="Sacaba">Sacaba</option>
                          <option value="Quillacollo">Quillacollo</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-slate-700/50 mt-4">
                      <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Biografía y Experiencia Profesional</label>
                      <textarea 
                        className="input-field min-h-[80px] resize-none" 
                        placeholder="Describe tu experiencia, habilidades y lo que te destaca..." 
                        value={formData.descripcion_profesional} 
                        onChange={e => setFormData({...formData, descripcion_profesional: e.target.value})} 
                      ></textarea>
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Disponibilidad Horaria</label>
                        <input 
                          type="text" 
                          className="input-field py-2.5" 
                          placeholder="Ej. Lunes a Viernes 08:00 - 18:00"
                          value={formData.disponibilidad_horaria} 
                          onChange={e => setFormData({...formData, disponibilidad_horaria: e.target.value})} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider flex items-center justify-between">
                          <span>Zona de Cobertura</span>
                          <span className="text-[10px] text-primary normal-case">Toca el mapa para autocompletar</span>
                        </label>
                        <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-700 mb-2 relative z-0">
                          <MapContainer 
                            center={mapCenter as L.LatLngExpression} 
                            zoom={13} 
                            style={{ height: "100%", width: "100%" }}
                          >
                            <TileLayer
                              attribution='&copy; OpenStreetMap'
                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MapUpdater />
                            <LocationSelector position={selectedPosition} setPosition={setSelectedPosition} setFormData={setFormData} />
                            {selectedPosition && (
                              <Circle 
                                center={selectedPosition} 
                                radius={formData.radio_cobertura || 3000} 
                                pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2 }} 
                              />
                            )}
                          </MapContainer>
                        </div>
                        
                        <div className="flex flex-col gap-1 mb-2">
                          <div className="flex justify-between items-center text-xs text-textSecondary">
                            <span>Radio de Cobertura: {((formData.radio_cobertura || 3000)/1000).toFixed(1)} km</span>
                          </div>
                          <input 
                            type="range" 
                            min="1000" 
                            max="10000" 
                            step="500"
                            value={formData.radio_cobertura || 3000} 
                            onChange={(e) => setFormData({...formData, radio_cobertura: parseInt(e.target.value)})}
                            className="w-full accent-primary"
                          />
                        </div>

                        <input 
                          type="text" 
                          className="input-field py-2.5" 
                          placeholder="Ej. Zona Norte, Queru Queru, Av. América"
                          value={formData.zona_cobertura} 
                          onChange={e => setFormData({...formData, zona_cobertura: e.target.value})} 
                        />
                      </div>
                    </div>
                    </>
                  )}

                  <div className="flex justify-end pt-4">
                    <button type="submit" disabled={status === 'loading'} className="btn-primary py-2.5 px-6 font-medium shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2">
                      <Save className="h-4 w-4" /> Guardar Perfil
                    </button>
                  </div>
                </form>
              </div>

              {/* Formulario Colapsable de Contraseña */}
              <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-accent" />
                  Seguridad y Acceso
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Contraseña Actual</label>
                    <div className="relative">
                      <input 
                        required 
                        type={showCurrent ? "text" : "password"} 
                        className="input-field pr-10" 
                        value={currentPassword} 
                        onChange={e => setCurrentPassword(e.target.value)} 
                      />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-[11px] text-textSecondary hover:text-white transition-colors">
                        {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Nueva Contraseña</label>
                      <div className="relative">
                        <input 
                          required 
                          type={showNew ? "text" : "password"} 
                          className="input-field pr-10" 
                          value={newPassword} 
                          onChange={e => setNewPassword(e.target.value)} 
                        />
                        <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-[11px] text-textSecondary hover:text-white transition-colors">
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-textSecondary mb-1.5 uppercase tracking-wider">Confirmar Contraseña</label>
                      <div className="relative">
                        <input 
                          required 
                          type={showConfirm ? "text" : "password"} 
                          className="input-field pr-10" 
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-[11px] text-textSecondary hover:text-white transition-colors">
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="submit" 
                      disabled={status === 'loading'}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 px-6 rounded-xl transition-colors border border-slate-600 flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      Actualizar Contraseña
                    </button>
                  </div>
                </form>
              </div>

            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

