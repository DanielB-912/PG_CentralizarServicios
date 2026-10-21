import { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Wallet, Clock, LogOut, Plus, UploadCloud, X, FileText, Check, UserCircle, MapPin, Send, Loader2, ListTodo, CheckCircle, AlertTriangle, Lock } from 'lucide-react';
import { ProfileModal } from '../components/ProfileModal';
import { GlobalVoiceAssistant } from '../components/GlobalVoiceAssistant';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';


const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
};

const greenIcon = createCustomIcon('#10b981'); // Match
const redIcon = createCustomIcon('#ef4444');   // No Match

const isEspecialidadMatch = (solicitudTipo: string | undefined, tecnicoEspecialidad: string | undefined): boolean => {
  if (!solicitudTipo || !tecnicoEspecialidad) return false;
  const normalize = (str: string) =>
    str.toLowerCase()
       .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar tildes
       .replace(/\b(ing|ing\.|lic|lic\.|tecnico|tecnica|de|en|y)\b/g, '') // Quitar prefijos comunes
       .replace(/[^a-z0-9]/g, ' ')
       .trim();

  const sol = normalize(solicitudTipo);
  const tec = normalize(tecnicoEspecialidad);

  // Coincidencia cruzada o inclusión por raíz
  if (sol.includes(tec) || tec.includes(sol)) return true;

  // Diccionario de equivalencias directas amplio con nuevas categorías
  const roots: Record<string, string[]> = {
    sistemas: ['sistema', 'software', 'computo', 'computacion', 'redes', 'programacion', 'pc', 'soporte tecnico', 'informatica'],
    electronica: ['electronica', 'automatizacion', 'arduino', 'plc', 'robotica'],
    arquitectura: ['arquitectura', 'arquitecto', 'diseno de interiores', 'interiorismo', 'plano', 'maqueta'],
    civil: ['civil', 'construccion', 'supervision de obras', 'estructuras', 'hormigon'],
    plomeria: ['plomero', 'plomeria', 'tuberia', 'gasfiteria', 'fontanero', 'fuga', 'agua', 'gas'],
    electricidad: ['electrico', 'electricista', 'electricidad', 'luz', 'cableado', 'enchufe', 'cortocircuito'],
    albanileria: ['albanil', 'albanileria', 'construccion', 'obra', 'muro', 'ladrillo', 'cemento'],
    pintura: ['pintor', 'pintura', 'acabados', 'barniz', 'pintar'],
    carpinteria: ['carpintero', 'carpinteria', 'muebles', 'madera', 'ropero', 'puerta'],
    cerrajeria: ['cerrajero', 'cerrajeria', 'llave', 'chapa', 'candado'],
    multiservicio: ['multiservicio', 'arreglos generales', 'mantenimiento', 'hogar', 'faztudo', 'manitas'],
    jardineria: ['jardinero', 'jardineria', 'paisajismo', 'pasto', 'plantas', 'poda'],
    climatizacion: ['climatizacion', 'refrigeracion', 'aire acondicionado', 'hvac', 'refrigerador'],
    mecanica: ['mecanico', 'mecanica', 'auxilio vehicular', 'auto', 'motor', 'frenos'],
    limpieza: ['limpieza', 'desinfeccion', 'aseo', 'profunda'],
    contabilidad: ['contabilidad', 'contador', 'auditoria', 'finanzas', 'impuestos', 'balance'],
    legal: ['legal', 'abogado', 'juridica', 'asesoria', 'leyes', 'contrato'],
    diseno: ['diseno grafico', 'marketing digital', 'logo', 'publicidad', 'redes sociales']
  };

  for (const key in roots) {
    const terms = roots[key];
    const matchSol = terms.some(t => sol.includes(t));
    const matchTec = terms.some(t => tec.includes(t));
    if (matchSol && matchTec) return true;
  }
  return false;
  return false;
};

export interface GeoData {
  municipio: string;
  zona: string;
  calle: string;
}

const getDisplayLocation = (g: GeoData | null) => {
  if (!g) return 'Cargando...';
  if (g.calle && g.zona) return `${g.calle}, ${g.zona}`;
  if (g.calle) return `${g.calle}, ${g.municipio}`;
  return `${g.zona ? g.zona + ', ' : ''}${g.municipio}`;
}

const getCleanRef = (refText: string) => {
  if (!refText) return '';
  const r = refText.trim();
  if (r === 'Centro Ciudad' || r === 'Centro ciudad' || r === 'Inmediaciones de campus universitario') return '';
  return r;
}

const geocodeCache: Record<string, GeoData> = {};
const getAddress = async (lat: number, lng: number): Promise<GeoData> => {
  const key = `${lat},${lng}`;
  if (geocodeCache[key]) return geocodeCache[key];
  const fallback = { municipio: 'Cochabamba', zona: '', calle: '' };
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
    const data = await res.json();
    const address = data.address;
    if (address) {
       const calle = address.road || address.pedestrian || address.street || address.footway || '';
       const zona = address.suburb || address.neighbourhood || address.residential || '';
       const municipio = address.city || address.town || address.village || address.municipality || 'Cochabamba';
       const result = { municipio, zona, calle };
       geocodeCache[key] = result;
       return result;
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
};

const GeoPopupContent = ({ sol, isSelected }: { sol: any, isSelected: boolean }) => {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  useEffect(() => {
    if (isSelected) {
      getAddress(sol.ubicacion_lat, sol.ubicacion_lng).then(setGeoData);
    }
  }, [sol, isSelected]);
  
  const ref = getCleanRef(sol.direccion_referencia || sol.direccion || sol.macrodistrito);
  
  return (
    <>
      <strong className="text-sm text-slate-800">Profesional Requerido: {sol.tipo_servicio}</strong><br/>
      <span className="text-xs text-slate-600">Cliente: {sol.cliente_nombres} {sol.cliente_apellidos}</span><br/>
      {isSelected ? (
        <>
           <span className="text-xs text-slate-500">📍 Ubicación: {getDisplayLocation(geoData)}</span><br/>
           {ref && <><span className="text-xs text-slate-500">🏠 Ref: {ref}</span><br/></>}
        </>
      ) : (
        <>
           <span className="text-xs text-slate-500">📍 Zona: {sol.macrodistrito}</span><br/>
        </>
      )}
      <span className="text-xs text-slate-400">(Lat: {sol.ubicacion_lat}, Lng: {sol.ubicacion_lng})</span><br/>
      {sol.presupuesto && (
         <strong className="text-emerald-700 mt-1 block">Presupuesto Sugerido: Bs. {sol.presupuesto}</strong>
      )}
    </>
  );
};

const GeoTargetPopup = ({ targetMarker }: { targetMarker: any }) => {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  useEffect(() => {
    getAddress(targetMarker.latitud, targetMarker.longitud).then(setGeoData);
  }, [targetMarker]);
  
  const ref = getCleanRef(targetMarker.direccion);
  const locStr = geoData ? (geoData.calle || geoData.zona ? `${geoData.calle || geoData.zona}, ${geoData.municipio}` : geoData.municipio) : 'Cargando...';

  return (
    <>
      <strong className="text-emerald-700">📍 Trabajo Aceptado</strong><br/>
      {ref && <span>🏠 Ref: {ref}<br/></span>}
      <span className="text-xs text-slate-600">📍 Ubicación: {locStr}</span><br/>
      <span className="text-xs text-slate-400">(Lat: {targetMarker.latitud}, Lng: {targetMarker.longitud})</span>
    </>
  );
};

const GeoQuoteAddress = ({ lat, lng, fallback }: { lat: number, lng: number, fallback: string }) => {
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  useEffect(() => {
    if (lat && lng) getAddress(lat, lng).then(setGeoData);
  }, [lat, lng]);
  
  const ref = getCleanRef(fallback);

  return (
    <>
      <p>📍 Ubicación: {getDisplayLocation(geoData)}</p>
      {ref && <p>🏠 Referencia: {ref}</p>}
    </>
  );
};

export const DashboardTecnico = () => {
  const { user, token, logout } = useContext(AuthContext);

  // Profile
  const [prestadorProfile, setPrestadorProfile] = useState<any>(null);

  const isSuspended = user?.estado_activo === 0 || user?.estado_activo === false || 
                      user?.prestador?.estado_activo === 0 || user?.prestador?.estado_activo === false ||
                      prestadorProfile?.estado_activo === 0 || prestadorProfile?.estado_activo === false;

  // Wallet state
  const [balance, setBalance] = useState(0);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  // Credentials state
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'review'>('idle');
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Feed State
  const [feed, setFeed] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [ofertaMonto, setOfertaMonto] = useState('');
  const [ofertaMensaje, setOfertaMensaje] = useState('');
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<number | null>(null);

  // Profile modal & dropdown
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const [activeTab, setActiveTab] = useState<'feed' | 'cotizaciones' | 'resenas'>('feed');
  const [misCotizaciones, setMisCotizaciones] = useState<any[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-17.3895, -66.1568]);
  const [targetMarker, setTargetMarker] = useState<any>(null);

  const ChangeView = ({ center }: { center: [number, number] }) => {
    const map = useMap();
    map.setView(center, 15);
    return null;
  };

  const handleGetLocation = () => {
    if (!window.isSecureContext) {
      toast.error("Para activar el GPS en dispositivos móviles, ingresa usando HTTPS.");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta geolocalización.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const latlng: [number, number] = [latitude, longitude];
        setMapCenter(latlng);
        toast.success("Ubicación actual detectada.");
      },
      (err) => {
        if (err.code === 1) {
          toast.error("Ubicación bloqueada. Toca 'aA' en la barra de Safari > Ajustes del sitio web > Ubicación: Permitir.");
        } else {
          toast.error("No se pudo obtener la señal GPS.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const [recotizarForm, setRecotizarForm] = useState<{ofertaId: number | null, monto: string, mensaje: string}>({ofertaId: null, monto: '', mensaje: ''});

  const [hasUnseenUpdates, setHasUnseenUpdates] = useState(false);

  useEffect(() => {
    fetchSaldo();
    fetchFeed();
    fetchPrestadorProfile();
    fetchMisCotizaciones();
  }, []);

  useEffect(() => {
    if (activeTab === 'cotizaciones') {
      fetchMisCotizaciones();
      setHasUnseenUpdates(false);
    }
  }, [activeTab]);

  const fetchMisCotizaciones = async () => {
    try {
      const res = await axios.get('/api/ofertas/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMisCotizaciones(res.data);
      if (activeTab !== 'cotizaciones') {
        const unseen = res.data.some((c: any) => c.estado_oferta === 'CONTRAOFERTADA' || c.estado_oferta === 'ACEPTADA');
        setHasUnseenUpdates(unseen);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPrestadorProfile = async () => {
    try {
      const res = await fetch('/api/prestadores/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPrestadorProfile(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSaldo = async () => {
    try {
      const res = await fetch('/api/monedero/saldo', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.saldo !== undefined) setBalance(data.saldo);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFeed = async () => {
    if (isSuspended) {
      setLoadingFeed(false);
      setFeed([]);
      return;
    }
    setLoadingFeed(true);
    try {
      const res = await fetch('/api/solicitudes/feed', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setFeed(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFeed(false);
    }
  };

  const [resenas, setResenas] = useState<any[]>([]);
  const fetchResenas = async () => {
    if (!(user?.prestador as any)?.id_prestador) return;
    try {
      const res = await fetch(`/api/prestadores/${(user?.prestador as any).id_prestador}/resenas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setResenas(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'resenas') {
      fetchResenas();
    }
  }, [activeTab]);

  const [rechargeStep, setRechargeStep] = useState<1 | 2 | 3>(1);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const handleSelectAmount = (amount: number) => {
    setSelectedAmount(amount);
    setRechargeStep(2);
  };

  const handleCustomRechargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(customAmount);
    if (amount > 0) {
      handleSelectAmount(amount);
    } else {
      toast.error('Ingrese un monto válido');
    }
  };

  const simulateQRScan = () => {
    setRechargeStep(3); // Spinner step
    setTimeout(async () => {
      try {
        const res = await fetch('/api/monedero/recargar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ monto: selectedAmount })
        });
        const data = await res.json();
        if (res.ok) {
          await fetchSaldo();
          setShowWalletModal(false);
          setRechargeStep(1);
          setCustomAmount('');
          setSelectedAmount(null);
          toast.success(`¡Pago verificado! Se acreditaron Bs. ${selectedAmount} a tu monedero virtual.`);
        } else {
          toast.error(data.error || 'Error en la recarga');
          setRechargeStep(1);
        }
      } catch (e) {
        console.error(e);
        toast.error('Error de conexión');
        setRechargeStep(1);
      }
    }, 2000); // 2 seconds delay
  };

  const [filePreviews, setFilePreviews] = useState<{file: File, preview: string}[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setUploadStatus('review');
      
      const newPreviews: {file: File, preview: string}[] = [];
      
      filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push({ file, preview: reader.result as string });
          if (newPreviews.length === filesArray.length) {
            setFilePreviews(newPreviews);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const confirmUpload = async () => {
    if (filePreviews.length === 0) return;
    setUploadStatus('uploading');
    setProgress(10);

    let uploadedCount = 0;
    for (const item of filePreviews) {
      const formData = new FormData();
      formData.append('documento', item.file);
      formData.append('tipo_documento', 'CERTIFICADO_TECNICO'); // Default for now

      try {
        await fetch('/api/prestador/credenciales', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        uploadedCount++;
        setProgress(10 + (90 * uploadedCount / filePreviews.length));
      } catch (err) {
        console.error("Error uploading", item.file.name, err);
      }
    }


    setFilePreviews([]);
    setUploadStatus('idle');
    toast.success(`Se subieron ${uploadedCount} documento(s) exitosamente.`);
  };

  const enviarOferta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuspended) {
      toast.error('Cuenta suspendida temporalmente por la administración. No puedes enviar cotizaciones.');
      return;
    }
    if (!solicitudSeleccionada) return;
    try {
      const res = await fetch('/api/ofertas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id_solicitud: solicitudSeleccionada,
          monto_ofertado: parseFloat(ofertaMonto),
          mensaje_propuesta: ofertaMensaje
        })
      });
      if (res.ok) {
        toast.success("¡Cotización enviada con éxito! Esperando respuesta del cliente.");
        setSolicitudSeleccionada(null);
        setOfertaMonto('');
        setOfertaMensaje('');
        fetchFeed(); // Refresh feed
        setActiveTab('cotizaciones');
        fetchMisCotizaciones();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || "Error al enviar la oferta");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error al enviar la oferta");
    }
  };

  const handleAceptarContraoferta = async (id_solicitud: number, monto_ofertado: number) => {
    if (isSuspended) {
      toast.error('Cuenta suspendida temporalmente por la administración.');
      return;
    }
    try {
      const res = await axios.post('/api/vinculaciones/aceptar', {
        id_solicitud,
        id_prestador: prestadorProfile?.id_prestador,
        monto_ofertado
      }, { headers: { Authorization: `Bearer ${token}` }});
      if (res.data.success) {
        toast.success(`¡Vinculación concretada! Contacta al cliente al teléfono: +591 ${res.data.cliente_telefono}. Coordina la visita técnica.`, { duration: 8000 });
        setSolicitudSeleccionada(null);
        fetchMisCotizaciones();
        fetchFeed();
      }

    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al aceptar la contraoferta');
    }
  };

  const handleRecotizarOferta = async (id_oferta: number) => {
    if (isSuspended) {
      toast.error('Cuenta suspendida temporalmente por la administración.');
      return;
    }
    if (!recotizarForm.monto) {
      toast.error('Ingresa un monto válido');
      return;
    }
    try {
      await axios.put(`/api/ofertas/${id_oferta}/recotizar`, {
        monto_ofertado: recotizarForm.monto,
        mensaje_propuesta: recotizarForm.mensaje
      }, { headers: { Authorization: `Bearer ${token}` }});
      toast.success('¡Re-cotización enviada con éxito!');
      setRecotizarForm({ofertaId: null, monto: '', mensaje: ''});
      fetchMisCotizaciones();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Error al enviar re-cotización');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Navbar */}
      <header className="h-16 bg-surface border-b border-slate-700 flex items-center justify-between px-6">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-lg font-medium text-white hidden md:block">Técnico Especialista</h1>
        </div>
        <div className="flex items-center space-x-6 relative">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.nombres} {user?.apellidos}</p>
            <p className="text-xs text-textSecondary">{user?.prestador ? `${user.prestador.especialidad} • ${user.prestador.macrodistrito}` : user?.rol}</p>
          </div>

          {!isSuspended && (
            <GlobalVoiceAssistant 
              role="PRESTADOR_TECNICO"
              onCommand={(action, _payload) => {
                if (action === 'FOCUS_CREDENCIALES') {
                  const credencialesPanel = document.getElementById('credenciales-panel');
                  if (credencialesPanel) {
                    credencialesPanel.scrollIntoView({ behavior: 'smooth' });
                    credencialesPanel.classList.add('ring-4', 'ring-primary', 'animate-pulse');
                    setTimeout(() => credencialesPanel.classList.remove('ring-4', 'ring-primary', 'animate-pulse'), 3000);
                  } else {
                    setShowProfileModal(true);
                  }
                } else if (action === 'NAVIGATE_DEMANDAS' || action === 'NAVIGATE_MAPA_DEMANDAS') {
                  setActiveTab('feed');
                } else if (action === 'NAVIGATE_COTIZACIONES') {
                  setActiveTab('cotizaciones');
                } else if (action === 'NAVIGATE_RESENAS') {
                  setActiveTab('resenas');
                } else if (action === 'NAVIGATE_MONEDERO' || action === 'OPEN_WALLET') {
                  setShowWalletModal(true);
                }
              }}
            />
          )}

          <button onClick={() => setShowDropdown(!showDropdown)} className="focus:outline-none">
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-accent to-primary flex items-center justify-center text-white font-bold shadow-lg overflow-hidden border-2 border-indigo-500 relative">
              <span className="absolute inset-0 flex items-center justify-center">
                {user?.nombres?.charAt(0) || 'T'}
              </span>
              {user?.foto_url && (
                <img 
                  src={user.foto_url.startsWith('http') || user.foto_url.startsWith('/') ? user.foto_url : `/uploads/${user.foto_url}`} 
                  alt="Avatar" 
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

      {isSuspended && (
        <div className="bg-red-950/80 border-b border-red-500/40 px-6 py-3.5 flex items-center justify-between gap-4 text-red-200 shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-red-500/20 text-red-400 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium">
              Cuenta suspendida temporalmente por la administración. Comuníquese con soporte para regularizar su cuenta o saldar comisiones pendientes.
            </p>
          </div>
          <button
            onClick={() => setShowWalletModal(true)}
            className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3.5 py-1.5 rounded-lg transition-colors font-semibold shrink-0"
          >
            Regularizar en Monedero
          </button>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Panel Izquierdo: Monedero y Credenciales */}
            <div className="lg:col-span-1 space-y-6">
              {/* Monedero Virtual */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 bg-accent/20 rounded-full blur-3xl group-hover:bg-accent/30 transition-colors"></div>

                <div className="flex items-center justify-between mb-4 relative z-10">
                  <h3 className="text-textSecondary font-medium flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-accent" /> Monedero Virtual
                  </h3>
                </div>

                <div className="mb-6 relative z-10">
                  <span className="text-4xl font-bold text-white transition-all">Bs. {(balance ?? 0).toFixed(2)}</span>
                  <span className="text-textSecondary ml-2 text-sm">Disponible</span>
                </div>

                <button
                  onClick={() => setShowWalletModal(true)}
                  className="w-full bg-accent hover:bg-violet-600 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 relative z-10"
                >
                  <Plus className="h-5 w-5" />
                  Recargar Saldo
                </button>
                <p className="text-xs text-textSecondary text-center mt-3 relative z-10">
                  Se deducirá comisión por cada servicio conectado.
                </p>
              </div>

              {/* Validación de Credenciales */}
              <div id="credenciales-panel" className="glass-panel rounded-2xl p-6 transition-all duration-300">
                <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Validación de Credenciales
                </h3>

                {uploadStatus === 'idle' && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-600 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/50 hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                      <UploadCloud className="h-6 w-6 text-textSecondary group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm text-white font-medium mb-1">Subir Documentos</p>
                    <p className="text-xs text-textSecondary">CI (Anverso/Reverso) o Certificados</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*,.pdf"
                      multiple
                    />
                  </div>
                )}

                {uploadStatus === 'uploading' && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-textSecondary">Subiendo archivos...</span>
                      <span className="text-white font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}

                {uploadStatus === 'review' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {filePreviews.map((item, idx) => (
                        <div key={idx} className="bg-slate-800 p-2 rounded-xl flex justify-center items-center">
                          {item.file.type.startsWith('image/') ? (
                            <img src={item.preview} alt="Preview" className="max-h-24 rounded-lg object-contain" />
                          ) : (
                            <div className="flex flex-col items-center py-2 text-textSecondary text-center">
                              <FileText className="h-8 w-8 text-primary mb-1" />
                              <span className="text-[10px] line-clamp-1" title={item.file.name}>{item.file.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={confirmUpload}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <UploadCloud className="h-4 w-4" /> Confirmar Subida
                    </button>
                    
                    <button
                      onClick={() => { setUploadStatus('idle'); setFilePreviews([]); }}
                      className="w-full py-2 border border-slate-600 rounded-xl text-sm font-medium text-textSecondary hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="h-4 w-4" /> Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Mapa de Demanda y Historial / Trabajos */}
            <div className="lg:col-span-2 space-y-6 relative">
              
              {prestadorProfile && (!user?.telefono || !user?.prestador?.especialidad) && (
                <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-start gap-3 text-amber-500 mb-2 animate-pulse">
                  <div className="mt-0.5">⚠️</div>
                  <div>
                    <h4 className="font-bold">Paso 1: Completa tu información profesional en Mi Perfil</h4>
                    <p className="text-sm">Asegúrate de configurar tu teléfono y especialidad para poder ofertar.</p>
                  </div>
                </div>
              )}

              {prestadorProfile && user?.telefono && user?.prestador?.especialidad && prestadorProfile.has_approved_credential !== 1 && (
                <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-xl flex items-start gap-3 text-blue-400 mb-2">
                  <div className="mt-0.5">ℹ️</div>
                  <div>
                    <h4 className="font-bold">Paso 2: Sube tu CI o acreditación para validación del Administrador</h4>
                    <p className="text-sm">Utiliza el panel de "Validación de Credenciales" para subir tus documentos y ser habilitado.</p>
                  </div>
                </div>
              )}

              {isSuspended && (
                <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-8 text-center border border-red-500/40 shadow-2xl">
                  <div className="bg-red-500/20 p-4 rounded-full mb-4 ring-4 ring-red-500/10">
                    <Lock className="h-10 w-10 text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">Cuenta Suspendida Temporalmente</h2>
                  <p className="text-textSecondary max-w-md mb-6 leading-relaxed">
                    Cuenta suspendida temporalmente por la administración. Comuníquese con soporte para regularizar su cuenta o saldar comisiones pendientes.
                  </p>
                  <button
                    onClick={() => setShowWalletModal(true)}
                    className="bg-accent hover:bg-violet-600 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-accent/25 flex items-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Regularizar Saldo en Monedero
                  </button>
                </div>
              )}

              {prestadorProfile && prestadorProfile.has_approved_credential !== 1 && (
                <div className="absolute inset-0 z-40 bg-background/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-red-500/30">
                  <div className="bg-red-500/20 p-4 rounded-full mb-4">
                    <LogOut className="h-10 w-10 text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">⚠️ Funcionalidad Bloqueada</h2>
                  <p className="text-textSecondary max-w-md">
                    Tu cuenta se encuentra en revisión. Una vez aprobada tu credencial, se habilitará el mapa y podrás enviar cotizaciones.
                  </p>
                </div>
              )}

              <div className={`space-y-6 ${prestadorProfile && prestadorProfile.has_approved_credential === 0 ? 'pointer-events-none blur-sm opacity-50' : ''}`}>
                {balance < 0 && (
                  <div className="bg-rose-900/40 border-l-4 border-rose-500 p-4 rounded-r-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_15px_rgba(244,63,94,0.1)] mb-2">
                    <div className="flex items-center gap-3 text-rose-200">
                      <span className="text-2xl animate-pulse">⚠️</span>
                      <p className="text-sm">
                        <strong className="text-rose-400">Tienes una comisión pendiente de regularizar (Saldo actual: Bs. {balance}).</strong><br/>
                        Recarga tu monedero virtual para mantener tu cuenta completamente operativa.
                      </p>
                    </div>
                    <button onClick={() => setShowWalletModal(true)} className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-all whitespace-nowrap">
                      💳 Recargar Saldo
                    </button>
                  </div>
                )}
                <div className="flex gap-2 bg-slate-900/50 p-1.5 rounded-2xl border border-slate-700/50 w-fit">
                  <button 
                    onClick={() => setActiveTab('feed')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'feed' ? 'bg-primary text-white shadow-lg' : 'text-textSecondary hover:text-white'}`}
                  >
                    <MapPin className="h-4 w-4" /> Mapa de Demandas
                  </button>
                  <button 
                    onClick={() => setActiveTab('cotizaciones')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 relative ${activeTab === 'cotizaciones' ? 'bg-primary text-white shadow-lg' : 'text-textSecondary hover:text-white'}`}
                  >
                    <ListTodo className="h-4 w-4" /> Mis Cotizaciones
                    {hasUnseenUpdates && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]">!</span>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('resenas')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'resenas' ? 'bg-primary text-white shadow-lg' : 'text-textSecondary hover:text-white'}`}
                  >
                    <span className="text-yellow-400">★</span> Mis Reseñas
                  </button>
                </div>

                {activeTab === 'feed' && (
                  <>
                    <div className="glass-panel rounded-2xl p-6 h-[400px] flex flex-col relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                  <MapContainer 
                    center={mapCenter} 
                    zoom={13} 
                    style={{ height: "100%", width: "100%" }}
                  >
                    <ChangeView center={mapCenter} />
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {targetMarker && (
                      <Marker 
                        position={[targetMarker.latitud, targetMarker.longitud]} 
                        icon={greenIcon}
                      >
                        <Popup>
                          <GeoTargetPopup targetMarker={targetMarker} />
                        </Popup>
                      </Marker>
                    )}
                    {feed.map(sol => (
                      sol.ubicacion_lat && sol.ubicacion_lng && (
                        <Marker 
                          key={`map-${sol.id_solicitud}`} 
                          position={[sol.ubicacion_lat, sol.ubicacion_lng]}
                          icon={isEspecialidadMatch(sol.tipo_servicio, user?.prestador?.especialidad) ? greenIcon : redIcon}
                          eventHandlers={{
                            click: () => {
                              setSolicitudSeleccionada(sol.id_solicitud);
                            }
                          }}
                        >
                          <Popup>
                            <GeoPopupContent sol={sol} isSelected={solicitudSeleccionada === sol.id_solicitud} />
                            <button 
                              onClick={() => setSolicitudSeleccionada(sol.id_solicitud)}
                              className="mt-2 w-full bg-primary hover:bg-primary/90 text-white rounded py-1 text-xs font-medium"
                            >
                              Cotizar
                            </button>
                          </Popup>
                        </Marker>
                      )
                    ))}
                  </MapContainer>
                </div>
                {targetMarker && (
                  <div className="absolute top-4 left-4 z-[400]">
                    <button 
                      onClick={() => {
                        setTargetMarker(null);
                        setActiveTab('cotizaciones');
                      }}
                      className="bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all hover:scale-105"
                    >
                      ← Volver a Mis Cotizaciones
                    </button>
                  </div>
                )}
                <div className="relative z-10 pointer-events-none flex justify-between items-start">
                  <h2 className={`text-xl font-bold bg-surface/80 backdrop-blur-md px-4 py-2 rounded-xl text-white pointer-events-auto shadow-lg border border-slate-700/50 ${targetMarker ? 'ml-auto' : ''}`}>
                    {targetMarker ? 'Ubicación del Servicio' : 'Mapa de Demanda'}
                  </h2>
                </div>
                <button 
                  onClick={handleGetLocation}
                  className="absolute bottom-4 right-4 z-[400] bg-primary hover:bg-indigo-600 text-white rounded-full p-3 shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all hover:scale-110 flex items-center justify-center pointer-events-auto"
                  title="Mi Ubicación Actual"
                >
                  <MapPin className="h-5 w-5" />
                </button>
              </div>

              <div className="glass-panel rounded-2xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Solicitudes Recientes en tu Zona</h2>
                  <button onClick={fetchFeed} className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full border border-primary/30 flex items-center gap-2 hover:bg-primary/30 transition">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Actualizar
                  </button>
                </div>

                <div className="flex-1 flex flex-col space-y-4">
                  {loadingFeed ? (
                    <div className="flex-1 flex items-center justify-center">
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                    </div>
                  ) : (feed && feed.length > 0) ? (
                    feed.map(sol => (
                      <div key={sol.id_solicitud} className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700 hover:border-primary/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-white font-medium text-lg">Profesional Requerido: {sol.tipo_servicio}</h3>
                            <p className="text-xs text-slate-400">Cliente: {sol.cliente_nombres} {sol.cliente_apellidos}</p>
                          </div>
                          <span className="bg-slate-700 text-textSecondary text-xs px-2 py-1 rounded-md">{sol.fecha_solicitud?.substring(0, 10) || 'Hoy'}</span>
                        </div>
                        <p className="text-textSecondary text-sm mb-4 line-clamp-2">{sol.descripcion}</p>

                        <div className="flex items-center justify-between mb-4 text-sm">
                          <div className="flex items-center gap-2 text-slate-300">
                            <MapPin className="h-4 w-4 text-accent" />
                            {sol.macrodistrito}
                          </div>
                          {sol.presupuesto && (
                           <div className="text-emerald-400 font-medium">
                              Presupuesto: Bs. {sol.presupuesto}
                            </div>
                          )}
                        </div>

                        {solicitudSeleccionada === sol.id_solicitud ? (
                          <form onSubmit={enviarOferta} className="bg-slate-900 p-4 rounded-xl space-y-3">
                            <div className="flex gap-3">
                              <input 
                                type="number" 
                                step="any" 
                                min="1" 
                                onKeyDown={(e) => {
                                  if (['e', 'E', '+', '-'].includes(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                placeholder="Monto en Bs. (ej. 150)" 
                                value={ofertaMonto} 
                                onChange={(e) => setOfertaMonto(e.target.value)} 
                                className="w-full bg-slate-800 text-white rounded-lg p-2 border border-slate-700 focus:border-indigo-500 outline-none"
                              />
                              <button type="submit" className="btn-primary px-6 flex items-center gap-2">
                                <Send className="h-4 w-4" /> Enviar
                              </button>
                            </div>
                            <input type="text" placeholder="Mensaje opcional..." className="input-field w-full" value={ofertaMensaje} onChange={e => setOfertaMensaje(e.target.value)} />
                            <button type="button" onClick={() => setSolicitudSeleccionada(null)} className="text-sm text-textSecondary hover:text-white w-full text-center">Cancelar</button>
                          </form>
                        ) : (
                          <button onClick={() => setSolicitudSeleccionada(sol.id_solicitud)} className="w-full btn-primary py-2 rounded-xl flex items-center justify-center gap-2">
                            Enviar Cotización
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                      <div className="text-primary/50 mb-4">
                        <Clock className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      </div>
                      <p className="text-textSecondary text-center max-w-sm">
                        No hay solicitudes activas cercanas. Mantente en línea para recibir notificaciones cuando un cliente necesite tus servicios.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {activeTab === 'cotizaciones' && (
              <div className="glass-panel rounded-2xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white">Mis Cotizaciones Activas</h2>
                  <button onClick={fetchMisCotizaciones} className="bg-primary/20 text-primary text-xs px-3 py-1 rounded-full border border-primary/30 flex items-center gap-2 hover:bg-primary/30 transition">
                    <Loader2 className="h-3 w-3" /> Actualizar
                  </button>
                </div>

                <div className="flex-1 flex flex-col space-y-4">
                  {misCotizaciones.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 bg-slate-800/20 rounded-xl border border-slate-700/50">
                      <ListTodo className="h-10 w-10 text-slate-500 mb-3" />
                      <p className="text-textSecondary">No tienes cotizaciones activas.</p>
                    </div>
                  ) : (
                    misCotizaciones.map(cotizacion => (
                      <div key={cotizacion.id_oferta} className="bg-surface p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between gap-4 hover:border-primary/50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              cotizacion.estado_oferta === 'ACEPTADA' ? 'bg-emerald-500/20 text-emerald-400' :
                              cotizacion.estado_oferta === 'RECHAZADA' ? 'bg-red-500/20 text-red-400' :
                              cotizacion.estado_oferta === 'CONTRAOFERTADA' ? 'bg-amber-500/20 text-amber-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {cotizacion.estado_oferta}
                            </span>
                          </div>
                          {cotizacion.estado_oferta === 'ACEPTADA' && (
                            <div className="mt-4 p-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-900/10 flex flex-col gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                <CheckCircle className="h-5 w-5" /> Vinculación Confirmada
                              </div>
                              <div className="text-sm text-emerald-100/80 space-y-1 ml-7">
                                <p>🔧 Trabajo / Problema: {cotizacion.descripcion || 'Servicio Solicitado'}</p>
                                <GeoQuoteAddress lat={cotizacion.latitud} lng={cotizacion.longitud} fallback={cotizacion.direccion || 'No especificada'} />
                                <p>👤 Cliente: {cotizacion.cliente_nombres} {cotizacion.cliente_apellidos}</p>
                                <p>📞 Teléfono: +591 {cotizacion.cliente_telefono}</p>
                              </div>
                              {cotizacion.latitud && cotizacion.longitud && (
                                <button 
                                  onClick={() => {
                                    setMapCenter([parseFloat(cotizacion.latitud), parseFloat(cotizacion.longitud)]);
                                    setTargetMarker({
                                      latitud: parseFloat(cotizacion.latitud),
                                      longitud: parseFloat(cotizacion.longitud),
                                      direccion: cotizacion.direccion
                                    });
                                    setActiveTab('feed');
                                  }}
                                  className="mt-2 ml-7 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-1.5 px-3 text-xs font-medium w-max transition-colors flex items-center gap-1"
                                >
                                  🗺️ Ver Ubicación en el Mapa
                                </button>
                              )}
                            </div>
                          )}
                          <p className="text-white font-medium mb-1">Monto Ofertado: Bs. {cotizacion.monto_ofertado}</p>
                          <p className="text-sm text-textSecondary italic">"{cotizacion.mensaje_propuesta}"</p>
                        </div>
                        
                        {cotizacion.estado_oferta === 'CONTRAOFERTADA' && (
                          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm flex flex-col md:max-w-[300px] gap-2">
                            <div className="text-amber-400">
                              <strong>¡El cliente hizo una contraoferta!</strong>
                              <p className="text-xs mt-1 text-amber-500/80">Nueva propuesta del cliente: Bs. {cotizacion.monto_ofertado}</p>
                            </div>
                            
                            {recotizarForm.ofertaId === cotizacion.id_oferta ? (
                              <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 w-full flex flex-col gap-2 mt-1">
                                <input 
                                  type="number" 
                                  step="any"
                                  min="1"
                                  onKeyDown={(e) => {
                                    if (['e', 'E', '+', '-'].includes(e.key)) {
                                      e.preventDefault();
                                    }
                                  }}
                                  placeholder="Nuevo Monto Bs." 
                                  className="input-field py-1 px-2 text-xs"
                                  value={recotizarForm.monto}
                                  onChange={(e) => setRecotizarForm({...recotizarForm, monto: e.target.value})}
                                />
                                <input 
                                  type="text" 
                                  placeholder="Mensaje (opcional)" 
                                  className="input-field py-1 px-2 text-xs"
                                  value={recotizarForm.mensaje}
                                  onChange={(e) => setRecotizarForm({...recotizarForm, mensaje: e.target.value})}
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => setRecotizarForm({ofertaId: null, monto: '', mensaje: ''})} className="btn-secondary py-1 px-2 flex-1 text-[10px]">Cancelar</button>
                                  <button onClick={() => handleRecotizarOferta(cotizacion.id_oferta)} className="bg-amber-500 hover:bg-amber-600 text-white rounded font-medium py-1 px-2 flex-1 text-[10px] transition-colors"><Send size={10} className="inline mr-1"/> Enviar</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() => setRecotizarForm({ ofertaId: cotizacion.id_oferta, monto: '', mensaje: '' })}
                                  className="btn-secondary py-1.5 px-3 text-xs flex-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/20"
                                >
                                  Re-cotizar
                                </button>
                                <button
                                  onClick={() => handleAceptarContraoferta(cotizacion.id_solicitud, cotizacion.monto_ofertado)}
                                  className="btn-primary py-1.5 px-3 text-xs flex-1 bg-emerald-500 hover:bg-emerald-600 border-none"
                                >
                                  Aceptar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'resenas' && (
              <div className="glass-panel rounded-2xl p-6 relative h-[600px] flex flex-col border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Mis Reseñas y Calificaciones</h3>
                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                  {resenas.length === 0 ? (
                    <div className="text-center text-textSecondary py-10">
                      <p>Aún no tienes calificaciones.</p>
                      <p className="text-sm mt-2">¡Completa trabajos exitosamente para construir tu reputación!</p>
                    </div>
                  ) : (
                    resenas.map((resena: any, index: number) => (
                      <div key={index} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-white">{resena.cliente_nombre} {resena.cliente_apellido}</p>
                            <div className="flex text-yellow-400 mt-1 text-sm">
                              {[...Array(5)].map((_, i) => (
                                <span key={i} className={i < resena.rating ? "opacity-100" : "opacity-30"}>★</span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-textSecondary">
                            {new Date(resena.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        {resena.solicitud_descripcion && (
                          <div className="bg-primary/10 text-primary-light text-xs py-1 px-2 rounded mt-2 mb-3 inline-block">
                            Trabajo realizado: {resena.tipo_servicio} - {resena.solicitud_descripcion}
                          </div>
                        )}
                        <p className="text-sm text-slate-300 italic">"{resena.comentario || 'Sin comentarios adicionales.'}"</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
              </div>
            </div>
          </div>
        </div>
      </main>
      

      {/* Modals */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Modal Recarga de Saldo */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface border border-slate-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setShowWalletModal(false);
                setRechargeStep(1);
                setCustomAmount('');
                setSelectedAmount(null);
              }}
              className="absolute top-4 right-4 text-textSecondary hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {rechargeStep === 1 && (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Recargar Fondos</h2>
                <p className="text-sm text-textSecondary mb-6">Selecciona o ingresa el monto en Bolivianos.</p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[20, 50, 100].map(amt => (
                    <button
                      key={amt}
                      onClick={() => handleSelectAmount(amt)}
                      className="bg-slate-800 hover:bg-primary hover:text-white border border-slate-700 text-textSecondary font-medium py-3 rounded-xl transition-colors"
                    >
                      Bs. {amt}
                    </button>
                  ))}
                </div>

                <div className="relative flex items-center py-4">
                  <div className="flex-grow border-t border-slate-700"></div>
                  <span className="flex-shrink-0 mx-4 text-textSecondary text-sm">O ingresa otro monto</span>
                  <div className="flex-grow border-t border-slate-700"></div>
                </div>

                <form onSubmit={handleCustomRechargeSubmit} className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-textSecondary font-medium">Bs.</span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      onKeyDown={(e) => {
                        if (['e', 'E', '+', '-'].includes(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="0.00"
                      className="input-field pl-12 text-lg font-medium"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="w-full btn-primary flex justify-center gap-2">
                    <Check className="h-5 w-5" />
                    Continuar
                  </button>
                </form>
              </>
            )}

            {rechargeStep === 2 && (
              <div className="text-center flex flex-col items-center">
                <h2 className="text-xl font-bold text-white mb-2">Código QR Simple</h2>
                <p className="text-sm text-textSecondary mb-6">Escanea el código para pagar Bs. {selectedAmount}</p>
                <div className="bg-white p-4 rounded-xl border-4 border-slate-200 mb-6 w-48 h-48 flex items-center justify-center">
                  <div className="w-full h-full bg-[url('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg')] bg-contain bg-no-repeat bg-center opacity-80" />
                </div>
                <button onClick={simulateQRScan} className="w-full btn-primary flex justify-center gap-2">
                  <Check className="h-5 w-5" />
                  Simular Pago Completado
                </button>
                <button onClick={() => setRechargeStep(1)} className="mt-4 text-sm text-textSecondary hover:text-white transition-colors">
                  Cancelar
                </button>
              </div>
            )}

            {rechargeStep === 3 && (
              <div className="text-center py-10">
                <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
                <h2 className="text-lg font-bold text-white">Verificando transacción...</h2>
                <p className="text-sm text-textSecondary mt-2">Por favor, espera unos segundos.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
