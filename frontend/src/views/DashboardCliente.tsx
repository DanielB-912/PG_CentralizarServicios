import { useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LogOut, Search, MapPin, Map as MapIcon, History, Star, X, Loader2, Send, CheckCircle, UserCircle, Mic, Check, Users } from 'lucide-react';
import { ProfileModal } from '../components/ProfileModal';
import { TecnicoPublicProfileModal } from '../components/TecnicoPublicProfileModal';
import { GlobalVoiceAssistant } from '../components/GlobalVoiceAssistant';
import axios from 'axios';

import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para los iconos de leaflet en react
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Componente para manejar clics en el mapa
const LocationSelector = ({ position, setPosition, setRequestForm, setMacrodistrito }: any) => {
  const markerRef = useRef<any>(null);

  const fetchNominatim = (lat: number, lng: number) => {
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`)
      .then(res => res.json())
      .then(data => {
        const street = data.address?.road || data.address?.pedestrian || data.address?.suburb || data.address?.neighbourhood || data.display_name?.split(',')[0] || 'Ubicación seleccionada';
        setRequestForm((prev: any) => ({ ...prev, direccion: street }));
        
        const locationStr = JSON.stringify(data.address || {}).toLowerCase();
        if (locationStr.includes('cala cala') || locationStr.includes('querú querú') || locationStr.includes('aranjuez')) setMacrodistrito('Cala Cala');
        else if (locationStr.includes('sud') || locationStr.includes('jaihuayco') || locationStr.includes('valle hermoso') || locationStr.includes('alalay')) setMacrodistrito('Sud');
        else if (locationStr.includes('sacaba') || locationStr.includes('huayllani') || locationStr.includes('quintanilla')) setMacrodistrito('Sacaba');
        else if (locationStr.includes('quillacollo') || locationStr.includes('colcapirhua') || locationStr.includes('tiquipaya')) setMacrodistrito('Quillacollo');
        else setMacrodistrito('Centro');
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

export const DashboardCliente = () => {
  const { user, logout } = useContext(AuthContext);
  
  const [activeTab, setActiveTab] = useState<'mapa' | 'historial' | 'directorio'>('mapa');
  
  // Perfil global
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTechnicianModalId, setSelectedTechnicianModalId] = useState<number | null>(null);

  // Map Request Flow
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<'idle' | 'searching' | 'found'>('idle');
  const [requestForm, setRequestForm] = useState({ descripcion: '', presupuesto: '', direccion: '' });
  const [showNewRequestForm, setShowNewRequestForm] = useState<'hidden' | 'minimized' | 'expanded'>('hidden');
  
  // Localizacion Leaflet
  const [selectedPosition, setSelectedPosition] = useState<L.LatLng | null>(null);
  const [mapCenter, setMapCenter] = useState<L.LatLngExpression>([-17.3895, -66.1568]);
  const [macrodistrito, setMacrodistrito] = useState('Centro'); // Deducido
  const mapRef = useRef<L.Map | null>(null);

  // Client Requests and Offers
  const [misSolicitudes, setMisSolicitudes] = useState<any[]>([]);
  const [badgeDismissed, setBadgeDismissed] = useState(false);
  const [viewingOfertasFor, setViewingOfertasFor] = useState<number | null>(null);
  const [ofertasActuales, setOfertasActuales] = useState<any[]>([]);
  const [contraofertaForm, setContraofertaForm] = useState<{ofertaId: number | null, monto: string, mensaje: string}>({ofertaId: null, monto: '', mensaje: ''});

  const [verificados, setVerificados] = useState<any[]>([]);
  const [cercanos, setCercanos] = useState<any[]>([]);
  const [showMobileSuggestedDrawer, setShowMobileSuggestedDrawer] = useState(false);

  // Rating Modal
  const [ratingModal, setRatingModal] = useState<{ isOpen: boolean; idVinculacion: number | null; prestadorName: string }>({ isOpen: false, idVinculacion: null, prestadorName: '' });
  const [ratingForm, setRatingForm] = useState({ score: 5, comment: '' });

  useEffect(() => {
    fetchMisSolicitudes();
  }, []);

  useEffect(() => {
    if (activeTab === 'historial') {
      fetchMisSolicitudes();
    } else if (activeTab === 'directorio') {
      fetchVerificados();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'mapa' && macrodistrito) {
      fetchCercanos();
    }
  }, [activeTab, macrodistrito, selectedCategory]);

  const fetchCercanos = async () => {
    try {
      const token = localStorage.getItem('token');
      const query = new URLSearchParams({ macrodistrito });
      if (selectedCategory) query.append('especialidad', selectedCategory);
      
      const res = await axios.get(`/api/prestadores/cercanos?${query.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCercanos(res.data);
    } catch (err) {
      console.error("Error fetching cercanos", err);
    }
  };

  const fetchVerificados = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/prestadores/verificados', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVerificados(res.data);
    } catch (err) {
      console.error("Error fetching verificados", err);
    }
  };

  const fetchMisSolicitudes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/solicitudes/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMisSolicitudes(res.data);
    } catch (err) {
      console.error("Error fetching solicitudes", err);
    }
  };

  const fetchOfertas = async (id_solicitud: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/ofertas/${id_solicitud}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOfertasActuales(res.data);
      setViewingOfertasFor(id_solicitud);
      setBadgeDismissed(true);
    } catch (err) {
      console.error("Error fetching ofertas", err);
    }
  };

  const handleAceptarOferta = async (id_solicitud: number, id_prestador: number, monto_ofertado: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/vinculaciones/aceptar', {
        id_solicitud,
        id_prestador,
        monto_ofertado
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`¡Oferta aceptada con éxito! Teléfono del técnico: +591 ${res.data.telefono_prestador}. Recuerda calificar el servicio al concluir el trabajo.`, { duration: 6000 });
      setViewingOfertasFor(null);
      // Reactive local update
      setMisSolicitudes(prev => prev.map(sol => 
        sol.id_solicitud === id_solicitud ? { 
          ...sol, 
          estado_solicitud: 'VINCULADA',
          id_vinculacion: res.data.id_vinculacion,
          prestador_telefono: res.data.telefono_prestador
        } : sol
      ));
      // Background fetch to ensure consistency
      fetchMisSolicitudes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al aceptar la oferta');
    }
  };

  const handleContraofertar = async (id_oferta: number) => {
    if (!contraofertaForm.monto) {
      toast.error('Por favor, ingresa un monto válido');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/ofertas/${id_oferta}/contraoferta`, {
        monto_ofertado: contraofertaForm.monto,
        mensaje_propuesta: contraofertaForm.mensaje
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('¡Contraoferta enviada con éxito!');
      setContraofertaForm({ ofertaId: null, monto: '', mensaje: '' });
      if (viewingOfertasFor) fetchOfertas(viewingOfertasFor);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al enviar contraoferta');
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingModal.idVinculacion) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/calificaciones', {
        id_vinculacion: ratingModal.idVinculacion,
        puntuacion: ratingForm.score,
        comentario: ratingForm.comment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('¡Gracias por tu calificación!');
      setMisSolicitudes(prev => prev.map(sol => {
        if (sol.id_vinculacion === ratingModal.idVinculacion || sol.id_solicitud === ratingModal.idVinculacion) {
          return { ...sol, calificado: true, id_calificacion: 1 };
        }
        return sol;
      }));
      setRatingModal({ isOpen: false, idVinculacion: null, prestadorName: '' });
      setRatingForm({ score: 5, comment: '' });
      fetchMisSolicitudes();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al enviar calificación');
    }
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
        const latlng = L.latLng(latitude, longitude);
        setSelectedPosition(latlng);
        setMapCenter(latlng);
        if (mapRef.current) {
          mapRef.current.flyTo(latlng, 16, { duration: 1.5 });
        }
        toast.success("Ubicación actual detectada.");

        fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=es`)
          .then(res => res.json())
          .then(data => {
            const calle = data.address?.road || data.address?.pedestrian || data.address?.suburb || data.display_name?.split(',')[0];
            if (calle) {
              setRequestForm(prev => ({ ...prev, direccion: calle }));
            }
          })
          .catch(err => console.error("Error geocodificando GPS:", err));
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
  const [dictadoState, setDictadoState] = useState<'inactivo' | 'escuchando' | 'analizando'>('inactivo');
  const dictadoStateRef = useRef<'inactivo' | 'escuchando' | 'analizando'>('inactivo');
  const transcriptDictadoRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const analyzeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateDictadoState = (s: 'inactivo' | 'escuchando' | 'analizando') => {
    dictadoStateRef.current = s;
    setDictadoState(s);
  };

  const procesarInferenciaSemantica = async (texto: string) => {
    if (!texto || texto.trim().length < 4) {
      updateDictadoState('inactivo');
      return;
    }
    updateDictadoState('analizando');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/ai/intent', { prompt: texto, userRole: 'CLIENTE' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        const { categoriaInferida, resumenProblema } = res.data;

        // Abrir modal si no está abierto
        setShowNewRequestForm('expanded');

        // Si la IA sintetizó una categoría válida del catálogo, REEMPLAZARla de inmediato
        if (categoriaInferida) {
          setSelectedCategory(categoriaInferida);
        }

        // Si viene de dictado por voz, actualizar descripción
        if (resumenProblema) {
          setRequestForm(prev => ({ ...prev, descripcion: resumenProblema }));
        }
      }
    } catch (e) {
      console.error("Error al procesar inferencia:", e);
    } finally {
      transcriptDictadoRef.current = '';
      updateDictadoState('inactivo');
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setRequestForm(prev => ({ ...prev, descripcion: text }));
    
    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    
    analyzeTimeoutRef.current = setTimeout(() => {
      procesarInferenciaSemantica(text);
    }, 700);
  };

  // Map Technician Interaction
  const [selectedTechnician, setSelectedTechnician] = useState<any | null>(null);
  const [hoveredTecnico, setHoveredTecnico] = useState<any | null>(null);

  const mockReviews = [
    { rating: 5, comentario: 'Excelente trabajo, llegó a tiempo y resolvió el problema rápido.', fecha: '2026-05-19' },
    { rating: 4, comentario: 'Muy buen servicio, todo quedó impecable.', fecha: '2026-04-23' }
  ];

  useEffect(() => {
    // Configurar SpeechRecognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-BO';

      recognitionRef.current.onresult = async (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setRequestForm(prev => ({ ...prev, descripcion: finalTranscript }));
          transcriptDictadoRef.current = finalTranscript;
          
          if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = setTimeout(async () => {
            if (dictadoStateRef.current === 'escuchando') {
              try {
                recognitionRef.current?.stop();
              } catch {}
              updateDictadoState('analizando');
              await procesarInferenciaSemantica(finalTranscript);
            }
          }, 1200); // 1.2 segundos de pausa natural antes de procesar y detener
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz', event);
        if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
        if (dictadoStateRef.current !== 'analizando') {
          updateDictadoState('inactivo');
        }
      };
      
      recognitionRef.current.onend = async () => {
        if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
        if (dictadoStateRef.current === 'escuchando') {
          const textToProcess = transcriptDictadoRef.current.trim() || requestForm.descripcion.trim();
          if (textToProcess.length >= 4) {
            updateDictadoState('analizando');
            await procesarInferenciaSemantica(textToProcess);
          } else {
            updateDictadoState('inactivo');
          }
        }
      };
    }
  }, [selectedCategory, requestForm.descripcion]);

  const toggleListen = () => {
    if (dictadoState === 'analizando') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Para usar comandos de voz en el móvil, accede mediante HTTPS y acepta los permisos de micrófono.");
      return;
    }

    if (dictadoState === 'escuchando') {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {}
      const textToProcess = transcriptDictadoRef.current.trim() || requestForm.descripcion.trim();
      if (textToProcess.length >= 4) {
        updateDictadoState('analizando');
        procesarInferenciaSemantica(textToProcess);
      } else {
        updateDictadoState('inactivo');
      }
    } else {
      if (recognitionRef.current) {
        try {
          transcriptDictadoRef.current = '';
          recognitionRef.current.start();
          updateDictadoState('escuchando');
        } catch (err) {
          console.error("Error al iniciar reconocimiento de voz:", err);
          updateDictadoState('inactivo');
        }
      } else {
        toast.error("Para usar comandos de voz en el móvil, accede mediante HTTPS y acepta los permisos de micrófono.");
      }
    }
  };


  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPosition) {
      toast.error("Por favor selecciona una ubicación en el mapa haciendo clic o usa tu ubicación actual.");
      return;
    }

    setRequestStatus('searching');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/solicitudes', {
        tipo_servicio: selectedCategory,
        descripcion: requestForm.descripcion,
        presupuesto: parseFloat(requestForm.presupuesto) || null,
        ubicacion_lat: selectedPosition.lat,
        ubicacion_lng: selectedPosition.lng,
        macrodistrito: macrodistrito
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequestForm({
        descripcion: '',
        presupuesto: '',
        direccion: ''
      });
      toast.success('Solicitud publicada con éxito');
      setShowNewRequestForm('hidden');
      setActiveTab('historial');
      setRequestStatus('found');
      fetchMisSolicitudes();
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Error al publicar la solicitud');
      setRequestStatus('idle');
    }
  };

  const tecnicosSugeridos = cercanos;

  const totalPendingOffers = misSolicitudes.reduce((acc: number, sol: any) => {
    const pending = Number(sol.ofertas_pendientes) || 0;
    const isVinculada = sol.estado_solicitud === 'VINCULADA' ? 1 : 0;
    return acc + pending + isVinculada;
  }, 0);

  const showBadge = totalPendingOffers > 0 && !badgeDismissed;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'mapa':
        return (
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden relative">
            {/* Panel Buscador: en móvil tarjeta flotante compacta arriba, en desktop panel lateral w-96 */}
            <div className="absolute top-3 left-3 right-3 z-20 bg-surface/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700 shadow-xl sm:relative sm:inset-auto sm:w-96 sm:max-h-none sm:p-6 sm:rounded-none sm:border-r sm:border-t-0 sm:border-l-0 sm:border-b-0 sm:bg-surface sm:shadow-2xl sm:flex sm:flex-col sm:shrink-0 sm:overflow-y-auto">
              <div className="flex items-center justify-between mb-2 sm:mb-6">
                <h2 className="text-base sm:text-2xl font-bold text-white">¿Qué necesitas hoy?</h2>
                <button
                  type="button"
                  onClick={() => setShowMobileSuggestedDrawer(true)}
                  className="sm:hidden flex items-center gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 px-2.5 py-1 rounded-xl text-xs font-semibold shadow-sm transition-all"
                  title="Ver técnicos sugeridos"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Sugeridos ({tecnicosSugeridos.length})</span>
                </button>
              </div>
              
              <div className="relative mb-2 sm:mb-4">
                <Search className="absolute left-3 top-2.5 sm:top-3.5 h-4 w-4 sm:h-5 sm:w-5 text-textSecondary" />
                <input 
                  type="text" 
                  placeholder="Ej. Plomero, Electricista..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 sm:py-3 pl-9 sm:pl-10 pr-4 text-sm sm:text-base text-white focus:outline-none focus:border-primary transition-colors"
                  value={requestForm.descripcion}
                  onChange={(e) => setRequestForm({...requestForm, descripcion: e.target.value})}
                />
              </div>

              <div className="mb-0 sm:mb-6 flex gap-2">
                <button
                  onClick={toggleListen}
                  disabled={dictadoState === 'analizando'}
                  className={`flex-1 py-2 sm:py-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    dictadoState === 'escuchando'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse ring-2 ring-red-500/20'
                      : dictadoState === 'analizando'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 cursor-not-allowed opacity-90'
                      : 'bg-primary hover:bg-indigo-600 text-white'
                  }`}
                >
                  {dictadoState === 'escuchando' ? (
                    <>
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                      <span>Escuchando...</span>
                    </>
                  ) : dictadoState === 'analizando' ? (
                    <>
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-indigo-300" />
                      <span>Analizando...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Dictar Solicitud</span>
                    </>
                  )}
                </button>
              </div>

              <div className="hidden sm:block space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-sm font-bold text-textSecondary uppercase tracking-wider mb-2">Técnicos Sugeridos en tu Zona (Top {tecnicosSugeridos.length})</h3>
                {tecnicosSugeridos.length > 0 ? tecnicosSugeridos.map((tech, i) => (
                  <div 
                    key={i} 
                    className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 rounded-xl p-4 transition-all hover:scale-[1.02] relative overflow-hidden group"
                    onMouseEnter={() => setHoveredTecnico(tech)}
                    onMouseLeave={() => setHoveredTecnico(null)}
                  >
                    <div className="flex items-center gap-4 relative z-10">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden relative">
                        <span className="absolute inset-0 flex items-center justify-center">
                          {tech.nombres.charAt(0)}
                        </span>
                        {tech.foto_url && (
                          <img 
                            src={tech.foto_url.startsWith('http') || tech.foto_url.startsWith('/') ? tech.foto_url : `/uploads/${tech.foto_url}`} 
                            alt="avatar" 
                            className="w-full h-full object-cover relative z-10" 
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }} 
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium">{tech.nombres} {tech.apellidos}</h3>
                        <p className="text-textSecondary text-xs">{tech.especialidad}</p>
                        {parseFloat(tech.calificacion_promedio || '0') > 0 ? (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                            <span className="text-amber-400 text-xs font-medium">{parseFloat(tech.calificacion_promedio || '0').toFixed(1)}</span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600/50 inline-block">
                              Nuevo talento
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedTechnicianModalId(tech.id_prestador)}
                      className="mt-3 w-full py-1.5 bg-slate-700/50 hover:bg-primary/80 text-white rounded-lg text-xs font-medium transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2"
                    >
                      <UserCircle className="h-4 w-4" /> Ver Perfil Profesional
                    </button>
                  </div>
                )) : (
                  <p className="text-sm text-textSecondary text-center py-4">No hay técnicos sugeridos en tu zona actual.</p>
                )}
              </div>
            </div>

            {/* Área del Mapa Real Leaflet: en móvil full-screen ocupando el fondo, en desktop flex-1 al lado del panel */}
            <div className="absolute inset-0 z-0 h-full w-full sm:relative sm:inset-auto sm:flex-1 sm:h-full bg-[#1a202c] overflow-hidden flex flex-col items-center justify-center sm:z-10">
              <MapContainer 
                center={mapCenter as L.LatLngExpression} 
                zoom={14} 
                style={{ height: "100%", width: "100%" }}
                className="z-0"
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationSelector 
                  position={selectedPosition} 
                  setPosition={setSelectedPosition} 
                  setRequestForm={setRequestForm}
                  setMacrodistrito={setMacrodistrito}
                />
                {hoveredTecnico?.lat_cobertura && hoveredTecnico?.lng_cobertura && (
                  <Circle 
                    center={[hoveredTecnico.lat_cobertura, hoveredTecnico.lng_cobertura]} 
                    radius={hoveredTecnico.radio_cobertura || 3000} 
                    pathOptions={{ color: '#6366f1', dashArray: '6', fillColor: '#6366f1', fillOpacity: 0.2 }} 
                  />
                )}
              </MapContainer>

              <button 
                onClick={handleGetLocation}
                className="absolute bottom-20 right-4 sm:bottom-8 sm:right-8 z-20 bg-primary hover:bg-indigo-600 text-white rounded-full p-3.5 sm:p-4 shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all hover:scale-110 flex items-center justify-center"
                title="Mi Ubicación Actual"
              >
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>

              {/* Marcadores Simulados de Técnicos (solo UI por encima) */}
              {!selectedCategory && !selectedTechnician && (
                <div className="hidden sm:block absolute z-20 top-8 text-center bg-surface/90 backdrop-blur-md px-8 py-5 rounded-3xl border border-slate-700 shadow-2xl pointer-events-none">
                  <h3 className="text-2xl font-medium text-white mb-2">Cochabamba y Alrededores</h3>
                  <p className="text-textSecondary max-w-sm mx-auto">
                    Busca lo que necesitas, dicta tu problema o explora los técnicos sugeridos en tu zona.
                  </p>
                </div>
              )}

              {/* Tarjeta Flotante Lateral de Perfil Técnico */}
              {selectedTechnician && (
                <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-surface/95 backdrop-blur-xl border-l border-slate-700 p-6 flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Perfil del Prestador</h3>
                    <button onClick={() => setSelectedTechnician(null)} className="text-textSecondary hover:text-white transition-colors">
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className={`h-16 w-16 rounded-full bg-${selectedTechnician.color}-500/20 border border-${selectedTechnician.color}-500 flex items-center justify-center overflow-hidden relative`}>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <UserCircle className={`h-10 w-10 text-${selectedTechnician.color}-400`} />
                      </span>
                      {selectedTechnician.foto_url && (
                        <img 
                          src={selectedTechnician.foto_url.startsWith('http') || selectedTechnician.foto_url.startsWith('/') ? selectedTechnician.foto_url : `/uploads/${selectedTechnician.foto_url}`} 
                          alt="avatar" 
                          className="w-full h-full object-cover relative z-10" 
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }} 
                        />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-white">{selectedTechnician.name}</h4>
                      <p className={`text-${selectedTechnician.color}-400 font-medium`}>{selectedTechnician.specialty}</p>
                      {parseFloat(selectedTechnician.rating || selectedTechnician.calificacion_promedio || '0') > 0 ? (
                        <div className="flex items-center text-amber-400 text-xs font-medium mt-1">
                          <Star className="h-3 w-3 fill-amber-400 mr-1" />
                          {parseFloat(selectedTechnician.rating || selectedTechnician.calificacion_promedio || '0').toFixed(1)}
                        </div>
                      ) : (
                        <div className="mt-1">
                          <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600/50 inline-block">
                            Nuevo talento
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                    {/* Botón contactar ocultado para no exponer datos antes de concretar la vinculación laboral */}
                    {/* <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl border border-slate-600 transition-colors flex items-center justify-center gap-2">
                      <Phone className="h-4 w-4" /> Contactar
                    </button> */}
                    <button onClick={() => setShowNewRequestForm('expanded')} className="flex-1 btn-primary py-2 flex items-center justify-center gap-2">
                      <Send className="h-4 w-4" /> Solicitar Servicio
                    </button>
                  </div>

                  <h5 className="text-sm font-bold text-textSecondary uppercase tracking-wider mb-4 border-b border-slate-700 pb-2">Reseñas ({mockReviews.length})</h5>
                  
                  <div className="space-y-4 overflow-y-auto flex-1 custom-scrollbar pr-2">
                    {mockReviews.map((r, i) => (
                      <div key={i} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-1 text-amber-400">
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} className={`h-3 w-3 ${j < r.rating ? 'fill-amber-400' : 'text-slate-600'}`} />
                            ))}
                          </div>
                          <span className="text-[10px] text-textSecondary">{r.fecha}</span>
                        </div>
                        <p className="text-white/80 text-sm italic">"{r.comentario}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* FAB Nueva Solicitud: en móvil accesible al pulgar en bottom-6 right-4 */}
              {showNewRequestForm === 'hidden' && (
                <button 
                  onClick={() => setShowNewRequestForm('expanded')}
                  className="absolute bottom-6 right-4 sm:bottom-24 sm:right-8 z-20 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-4 py-3 sm:px-6 sm:py-4 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-105 flex items-center justify-center gap-2 font-bold text-sm sm:text-lg"
                >
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" /> + Nueva Solicitud
                </button>
              )}

              {/* Minimizado Flotante */}
              {showNewRequestForm === 'minimized' && (
                <button 
                  onClick={() => setShowNewRequestForm('expanded')}
                  className="absolute bottom-6 right-4 sm:bottom-24 sm:right-8 z-20 bg-surface border border-primary/50 text-white rounded-full px-4 py-2.5 sm:px-6 sm:py-3 shadow-2xl transition-all hover:scale-105 flex items-center justify-center gap-2.5 sm:gap-3 text-xs sm:text-sm font-medium"
                >
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
                  Continuar Solicitud...
                </button>
              )}

              {/* Flujo de Solicitud (Formulario Flotante: estilo bottom-sheet en móvil con scroll interno) */}
              {showNewRequestForm === 'expanded' && requestStatus === 'idle' && (
                <div className="absolute z-30 bottom-0 left-0 right-0 rounded-t-3xl sm:rounded-3xl sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-md bg-surface/95 backdrop-blur-xl border border-primary/30 p-6 pb-8 sm:pb-6 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Nueva Solicitud</h3>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowNewRequestForm('minimized')} className="text-textSecondary hover:text-white transition-colors p-1" title="Minimizar para explorar mapa">
                        <div className="h-1 w-4 bg-current rounded"></div>
                      </button>
                      <button onClick={() => setShowNewRequestForm('hidden')} className="text-textSecondary hover:text-white transition-colors p-1" title="Cerrar">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  
                  {!selectedPosition && (
                    <div className="bg-amber-500/20 border border-amber-500/50 rounded-xl p-3 mb-4 text-amber-200 text-sm">
                      Haz clic en el mapa o minimiza esta ventana para explorar y marcar la ubicación del servicio.
                    </div>
                  )}

                  <form onSubmit={handleSendRequest} className="space-y-4">
                    <div>
                      <label className="block text-sm text-textSecondary mb-1">Categoría del Servicio</label>
                      <input 
                        required 
                        type="text" 
                        list="categorias-list"
                        className="input-field" 
                        value={selectedCategory || ''} 
                        onChange={e => setSelectedCategory(e.target.value)} 
                        placeholder="Ej. Plomería, Sistemas..."
                      />
                      <datalist id="categorias-list">
                        <option value="Plomería" />
                        <option value="Electricidad" />
                        <option value="Limpieza" />
                        <option value="Carpintería" />
                        <option value="Albañilería" />
                        <option value="Gasista" />
                        <option value="Sistemas" />
                        <option value="Pintor" />
                      </datalist>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm text-textSecondary">Descripción del problema</label>
                        <button 
                          type="button" 
                          onClick={toggleListen} 
                          disabled={dictadoState === 'analizando'}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                            dictadoState === 'escuchando'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse ring-2 ring-red-500/20'
                              : dictadoState === 'analizando'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 cursor-not-allowed opacity-90'
                              : 'bg-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-600/50'
                          }`}
                          title={
                            dictadoState === 'escuchando'
                              ? 'Escuchando tu voz...'
                              : dictadoState === 'analizando'
                              ? 'Analizando...'
                              : 'Dictar descripción por voz'
                          }
                        >
                          {dictadoState === 'escuchando' ? (
                            <>
                              <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                              <Mic className="h-3.5 w-3.5 text-red-400" />
                              <span>Escuchando...</span>
                            </>
                          ) : dictadoState === 'analizando' ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                              <span>Analizando...</span>
                            </>
                          ) : (
                            <>
                              <Mic className="h-3.5 w-3.5 text-slate-400" />
                              <span>Dictar</span>
                            </>
                          )}
                        </button>
                      </div>
                      <textarea required className="input-field min-h-[80px] resize-none" placeholder={`Habla o escribe aquí...`} value={requestForm.descripcion} onChange={handleTextChange}></textarea>
                    </div>
                    <div>
                      <label className="block text-sm text-textSecondary mb-1">Presupuesto Estimado (Bs.)</label>
                      <input 
                        required 
                        type="number" 
                        min="1" 
                        step="any"
                        onKeyDown={(e) => {
                          if (['e', 'E', '+', '-'].includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        className="input-field" 
                        placeholder="100.00" 
                        value={requestForm.presupuesto} 
                        onChange={e => setRequestForm({...requestForm, presupuesto: e.target.value})} 
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-textSecondary mb-1">Dirección / Referencia</label>
                      <input required type="text" className="input-field" placeholder="Av. Heroínas esq. Ayacucho" value={requestForm.direccion} onChange={e => setRequestForm({...requestForm, direccion: e.target.value})} />
                    </div>
                    <button type="submit" disabled={!selectedPosition || !selectedCategory} className={`w-full flex items-center justify-center gap-2 mt-2 py-3 rounded-xl ${selectedPosition && selectedCategory ? 'btn-primary' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>
                      <Send className="h-5 w-5" /> Emitir Solicitud
                    </button>
                  </form>
                </div>
              )}

              {requestStatus === 'searching' && (
                <div className="absolute z-20 flex flex-col items-center bg-surface/90 backdrop-blur-xl p-8 rounded-3xl border border-primary/30 shadow-[0_0_40px_rgba(79,70,229,0.3)] animate-in zoom-in-95 duration-300">
                  <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">Buscando técnicos...</h3>
                  <p className="text-textSecondary text-center max-w-xs">Localizando prestadores calificados de {selectedCategory} cerca de tu zona con nuestro motor inteligente.</p>
                </div>
              )}

              {requestStatus === 'found' && (
                <div className="absolute z-20 flex flex-col items-center bg-emerald-900/40 backdrop-blur-xl p-8 rounded-3xl border border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] animate-in zoom-in-95 duration-300">
                  <div className="h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/50">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">¡Solicitud Emitida!</h3>
                  <p className="text-textSecondary text-center max-w-xs mb-6">Hemos notificado a los técnicos cercanos. Recibirás propuestas en breve.</p>
                  <button 
                    onClick={() => {
                      setRequestStatus('idle');
                      setShowNewRequestForm('hidden');
                      setSelectedCategory(null);
                    }} 
                    className="btn-primary bg-emerald-500 hover:bg-emerald-600 text-white w-full border-none"
                  >
                    Volver al Mapa
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      case 'historial':
        return (
          <div className="p-6 md:p-8 flex-1 overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Mis Solicitudes y Ofertas</h2>
            <div className="space-y-4 max-w-4xl mx-auto">
              {misSolicitudes.length === 0 ? (
                <div className="text-center p-10 bg-slate-800/30 rounded-2xl border border-slate-700">
                  <p className="text-textSecondary">Aún no tienes solicitudes.</p>
                </div>
              ) : (
                misSolicitudes.map((sol: any) => (
                  <div key={sol.id_solicitud} className="glass-panel p-5 rounded-2xl border border-slate-700 group hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-white font-medium text-lg">{sol.tipo_servicio}</h3>
                        <p className="text-textSecondary text-sm">{sol.descripcion} • {sol.fecha_solicitud.substring(0, 10)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                          sol.estado_solicitud === 'PENDIENTE' ? 'bg-amber-500/20 text-amber-300' :
                          sol.estado_solicitud === 'VINCULADA' ? 'bg-emerald-500/20 text-emerald-300' :
                          sol.estado_solicitud === 'FINALIZADA' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-slate-700 text-slate-300'
                        }`}>
                          {sol.estado_solicitud}
                        </span>
                      </div>
                    </div>

                    {sol.estado_solicitud === 'PENDIENTE' && (
                      <button
                        onClick={() => fetchOfertas(sol.id_solicitud)}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors text-sm font-medium mb-4 flex items-center justify-center gap-2"
                      >
                        <Search className="h-4 w-4" /> Ver Ofertas Recibidas
                        {sol.ofertas_pendientes > 0 && <span className="h-5 w-5 bg-red-500 rounded-full text-xs flex items-center justify-center animate-pulse">{sol.ofertas_pendientes}</span>}
                      </button>
                    )}

                    {sol.estado_solicitud === 'VINCULADA' && (
                      <div className="mt-4 p-4 rounded-xl border-2 border-emerald-500/50 bg-emerald-900/10 flex flex-col gap-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-bold text-sm md:text-base">✅ Solicitud Vinculada con {sol.prestador_nombres} {sol.prestador_apellidos} (+591 {sol.prestador_telefono})</span>
                        </div>
                        <p className="text-sm text-emerald-200/70 ml-7 italic mb-2">
                          {sol.calificado || sol.id_calificacion ? 'Servicio concluido y calificado exitosamente.' : 'Al finalizar el servicio, califica al técnico en la plataforma.'}
                        </p>
                        
                        {sol.calificado || sol.id_calificacion ? (
                          <button 
                            disabled 
                            className="ml-7 bg-slate-800/80 text-emerald-400 border border-emerald-500/30 rounded-lg py-2 px-4 text-sm font-medium w-max flex items-center gap-2 cursor-default"
                          >
                            <Check className="h-4 w-4 text-emerald-400"/> Servicio Calificado
                          </button>
                        ) : (
                          <button 
                            onClick={() => setRatingModal({ isOpen: true, idVinculacion: sol.id_vinculacion || sol.id_solicitud, prestadorName: `${sol.prestador_nombres} ${sol.prestador_apellidos}` })}
                            className="ml-7 bg-amber-500 hover:bg-amber-600 text-white rounded-lg py-2 px-4 text-sm font-bold w-max transition-colors flex items-center gap-2"
                          >
                            <Star className="h-4 w-4 fill-white" /> Calificar Servicio
                          </button>
                        )}
                      </div>
                    )}

                    {viewingOfertasFor === sol.id_solicitud && (
                      <div className="mt-4 space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 animate-in fade-in slide-in-from-top-4 duration-200">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                          Ofertas ({ofertasActuales.length})
                          <button onClick={() => setViewingOfertasFor(null)} className="ml-auto text-textSecondary hover:text-white"><X className="h-4 w-4"/></button>
                        </h4>
                        
                        {ofertasActuales.length === 0 ? (
                          <p className="text-xs text-textSecondary text-center py-2">No hay ofertas aún para esta solicitud.</p>
                        ) : (
                          ofertasActuales.map((oferta: any) => (
                            <div key={oferta.id_oferta} className="bg-surface p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold relative overflow-hidden">
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    {oferta.nombres?.charAt(0) || 'P'}
                                  </span>
                                  {oferta.foto_url && (
                                    <img 
                                      src={oferta.foto_url.startsWith('http') || oferta.foto_url.startsWith('/') ? oferta.foto_url : `/uploads/${oferta.foto_url}`} 
                                      alt="avatar" 
                                      className="w-full h-full object-cover relative z-10" 
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }} 
                                    />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm">{oferta.nombres} {oferta.apellidos}</p>
                                  <div className="flex items-center gap-2 text-xs text-textSecondary">
                                    <span>{oferta.especialidad}</span>
                                    <span>•</span>
                                    {parseFloat(oferta.calificacion_promedio || '0') > 0 ? (
                                      <span className="flex items-center text-amber-400"><Star className="h-3 w-3 fill-amber-400 mr-1"/> {parseFloat(oferta.calificacion_promedio || '0').toFixed(1)}</span>
                                    ) : (
                                      <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600/50">Nuevo talento</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex-1 text-sm text-textSecondary px-2 py-2 md:py-0 italic border-l border-slate-700/50">
                                <p>"{oferta.mensaje_propuesta}"</p>
                                {oferta.estado_oferta === 'CONTRAOFERTADA' && (
                                  <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] rounded border border-amber-500/30">Has enviado una contraoferta</span>
                                )}
                              </div>
                              <div className="flex flex-col items-center justify-between gap-2 md:items-end w-full md:w-auto">
                                <span className="text-lg font-bold text-white">Bs. {oferta.monto_ofertado}</span>
                                
                                {contraofertaForm.ofertaId === oferta.id_oferta ? (
                                  <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 w-full flex flex-col gap-2 mt-2">
                                    <input 
                                      type="number" 
                                      min="1"
                                      step="any"
                                      onKeyDown={(e) => {
                                        if (['e', 'E', '+', '-'].includes(e.key)) {
                                          e.preventDefault();
                                        }
                                      }}
                                      placeholder="Monto Bs." 
                                      className="input-field py-1 px-2 text-sm"
                                      value={contraofertaForm.monto}
                                      onChange={(e) => setContraofertaForm({...contraofertaForm, monto: e.target.value})}
                                    />
                                    <input 
                                      type="text" 
                                      placeholder="Mensaje (opcional)" 
                                      className="input-field py-1 px-2 text-sm"
                                      value={contraofertaForm.mensaje}
                                      onChange={(e) => setContraofertaForm({...contraofertaForm, mensaje: e.target.value})}
                                    />
                                    <div className="flex gap-2">
                                      <button onClick={() => setContraofertaForm({ofertaId: null, monto: '', mensaje: ''})} className="btn-secondary py-1 px-2 flex-1 text-xs">Cancelar</button>
                                      <button onClick={() => handleContraofertar(oferta.id_oferta)} className="bg-amber-500 hover:bg-amber-600 text-white rounded font-medium py-1 px-2 flex-1 text-xs transition-colors flex items-center justify-center gap-1"><Send size={12}/> Enviar</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-2 w-full">
                                    <div className="flex gap-2 w-full">
                                      <button
                                        onClick={() => setContraofertaForm({ ofertaId: oferta.id_oferta, monto: '', mensaje: '' })}
                                        className="btn-secondary py-1.5 px-3 text-xs flex-1"
                                        disabled={oferta.estado_oferta === 'CONTRAOFERTADA'}
                                      >
                                        Contraofertar
                                      </button>
                                      {oferta.estado_oferta !== 'CONTRAOFERTADA' ? (
                                        <button
                                          onClick={() => handleAceptarOferta(sol.id_solicitud, oferta.id_prestador, oferta.monto_ofertado)}
                                          className="btn-primary py-1.5 px-3 text-xs flex-1"
                                        >
                                          Aceptar
                                        </button>
                                      ) : (
                                        <div className="flex-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] rounded flex items-center justify-center text-center leading-tight">
                                          ⏳ Esperando respuesta del técnico a tu contraoferta de Bs. {oferta.monto_ofertado}
                                        </div>
                                      )}
                                    </div>
                                    <button 
                                      onClick={() => setSelectedTechnicianModalId(oferta.id_prestador)}
                                      className="w-full text-xs text-primary hover:text-primary-light transition-colors py-1 flex items-center justify-center gap-1"
                                    >
                                      <UserCircle className="h-3 w-3" /> Ver Perfil Profesional
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'directorio':
        return (
          <div className="p-6 md:p-8 flex-1 overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Directorio de Técnicos Verificados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verificados.length === 0 ? (
                <div className="col-span-full text-center p-10 bg-slate-800/30 rounded-2xl border border-slate-700">
                  <p className="text-textSecondary">No hay técnicos verificados por el momento.</p>
                </div>
              ) : (
                verificados.map((tech: any) => (
                  <div key={tech.id_prestador} className="glass-panel p-5 rounded-2xl border border-slate-700 hover:border-primary/50 transition-colors flex flex-col">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl relative overflow-hidden">
                        <span className="absolute inset-0 flex items-center justify-center">
                          {tech.nombres.charAt(0)}
                        </span>
                        {tech.foto_url && (
                          <img 
                            src={tech.foto_url.startsWith('http') || tech.foto_url.startsWith('/') ? tech.foto_url : `/uploads/${tech.foto_url}`} 
                            alt="avatar" 
                            className="h-full w-full rounded-full object-cover relative z-10" 
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }} 
                          />
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{tech.nombres} {tech.apellidos}</h3>
                        <p className="text-primary text-sm">{tech.especialidad}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs">
                          {parseFloat(tech.calificacion_promedio || '0') > 0 ? (
                            <span className="flex items-center text-amber-400">
                              <Star className="h-3 w-3 fill-amber-400 mr-1" />
                              <span>{parseFloat(tech.calificacion_promedio || '0').toFixed(1)}</span>
                            </span>
                          ) : (
                            <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600/50">
                              Nuevo talento
                            </span>
                          )}
                          <span className="text-textSecondary ml-2">• {tech.macrodistrito}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedTechnicianModalId(tech.id_prestador);
                      }}
                      className="mt-auto w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm transition-colors border border-slate-600 flex items-center justify-center gap-2"
                    >
                      <UserCircle className="h-4 w-4" /> Ver Perfil Profesional
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Navbar Superior */}
      <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight hidden sm:block">Servicios Cbba</h1>
        </div>

        {/* Desktop Tabs */}
        <nav className="hidden md:flex gap-2">
          <button onClick={() => setActiveTab('mapa')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'mapa' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-white/5 hover:text-white'}`}>
            <MapIcon className="h-4 w-4 inline-block mr-2 mb-0.5" /> Explorar Mapa
          </button>
          <button 
            onClick={() => { setActiveTab('historial'); if (misSolicitudes.every(s => s.ofertas_pendientes === 0)) setBadgeDismissed(true); }} 
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 relative ${activeTab === 'historial' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-white/5 hover:text-white'}`}
          >
            <History className="h-4 w-4" />
            Historial y Ofertas
            {showBadge && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]">!</span>
            )}
          </button>
          <button onClick={() => setActiveTab('directorio')} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'directorio' ? 'bg-primary/20 text-primary' : 'text-textSecondary hover:bg-white/5 hover:text-white'}`}>
            <UserCircle className="h-4 w-4 inline-block mr-2 mb-0.5" /> Directorio
          </button>
        </nav>

        <div className="flex items-center space-x-4 relative">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.nombres} {user?.apellidos}</p>
            <p className="text-xs text-textSecondary">{user?.rol}</p>
          </div>
          
          {showNewRequestForm !== 'expanded' && (
            <GlobalVoiceAssistant 
              role="CLIENTE" 
              onCommand={(action, payload) => {
                if (action === 'OPEN_SOLICITUD_MODAL' || action === 'NAVIGATE_NUEVA_SOLICITUD') {
                  setActiveTab('mapa');
                  setShowNewRequestForm('expanded');
                  if (payload?.categoriaInferida) {
                    setSelectedCategory(payload.categoriaInferida);
                  }
                  if (payload?.resumenProblema) {
                    setRequestForm(prev => ({ ...prev, descripcion: payload.resumenProblema }));
                  } else {
                    setRequestForm(prev => ({ ...prev, descripcion: '' }));
                  }
                } else if (action === 'NAVIGATE_HISTORIAL') {
                  setActiveTab('historial');
                } else if (action === 'NAVIGATE_MAPA') {
                  setActiveTab('mapa');
                } else if (action === 'NAVIGATE_DIRECTORIO') {
                  setActiveTab('directorio');
                }
              }} 
            />
          )}

          <button onClick={() => setShowDropdown(!showDropdown)} className="focus:outline-none">
              <div className="h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center font-bold shadow-lg overflow-hidden border-2 border-indigo-500 relative">
                <span className="absolute inset-0 flex items-center justify-center">
                  {user?.nombres?.charAt(0) || 'C'}
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

      {/* Mobile Tabs */}
      <div className="md:hidden flex bg-surface border-b border-slate-700 p-2 gap-2 overflow-x-auto">
        <button onClick={() => setActiveTab('mapa')} className={`flex-1 py-2 rounded-lg text-sm font-medium whitespace-nowrap px-4 ${activeTab === 'mapa' ? 'bg-primary text-white' : 'text-textSecondary'}`}>Mapa</button>
        <button onClick={() => { setActiveTab('historial'); if (misSolicitudes.every(s => s.ofertas_pendientes === 0)) setBadgeDismissed(true); }} className={`flex-1 py-2 rounded-lg text-sm font-medium whitespace-nowrap px-4 relative flex items-center justify-center ${activeTab === 'historial' ? 'bg-primary text-white' : 'text-textSecondary'}`}>
          Historial
          {showBadge && (
            <span className="absolute top-0.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]">!</span>
          )}
        </button>
        <button onClick={() => setActiveTab('directorio')} className={`flex-1 py-2 rounded-lg text-sm font-medium whitespace-nowrap px-4 ${activeTab === 'directorio' ? 'bg-primary text-white' : 'text-textSecondary'}`}>Directorio</button>
      </div>

      {/* Contenido Principal */}
      {renderTabContent()}
      
      {/* Profile Modal */}
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Modal de Perfil Profesional Completo (Global) */}
      <TecnicoPublicProfileModal 
        isOpen={selectedTechnicianModalId !== null} 
        onClose={() => setSelectedTechnicianModalId(null)} 
        id_prestador={selectedTechnicianModalId} 
        token={localStorage.getItem('token')}
      />

      {/* Rating Modal */}
      {ratingModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Calificar Servicio</h3>
              <button onClick={() => setRatingModal({ isOpen: false, idVinculacion: null, prestadorName: '' })} className="text-textSecondary hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <p className="text-sm text-textSecondary mb-4">¿Cómo calificarías el trabajo de <strong className="text-white">{ratingModal.prestadorName}</strong>?</p>
            
            <form onSubmit={handleSubmitRating} className="space-y-4">
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingForm(prev => ({ ...prev, score: star }))}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star className={`h-10 w-10 ${star <= ratingForm.score ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                  </button>
                ))}
              </div>
              
              <div>
                <label className="block text-sm text-textSecondary mb-1">Reseña (opcional)</label>
                <textarea 
                  className="input-field min-h-[100px] resize-none"
                  placeholder="Describe tu experiencia con el servicio..."
                  value={ratingForm.comment}
                  onChange={(e) => setRatingForm(prev => ({ ...prev, comment: e.target.value }))}
                />
              </div>
              
              <button type="submit" className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                <Star className="h-5 w-5 fill-white" /> Enviar Calificación
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Drawer Móvil de Técnicos Sugeridos */}
      {showMobileSuggestedDrawer && (
        <div className="fixed inset-0 z-50 sm:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowMobileSuggestedDrawer(false)}
          />
          
          {/* Drawer content */}
          <div className="relative w-80 max-w-[85vw] bg-surface/98 backdrop-blur-md h-full z-10 p-4 shadow-2xl border-r border-slate-700 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex justify-between items-center pb-3 border-b border-slate-700/60 mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-white text-base">Técnicos Sugeridos</h3>
              </div>
              <button 
                onClick={() => setShowMobileSuggestedDrawer(false)}
                className="text-textSecondary hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-textSecondary mb-3">
              Profesionales verificados disponibles en tu zona ({tecnicosSugeridos.length}):
            </p>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {tecnicosSugeridos.length > 0 ? (
                tecnicosSugeridos.map((tech: any, i: number) => (
                  <div 
                    key={i} 
                    className="bg-slate-800/60 border border-slate-700 rounded-xl p-3.5 transition-all space-y-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden relative shrink-0">
                        <span className="absolute inset-0 flex items-center justify-center">
                          {tech.nombres.charAt(0)}
                        </span>
                        {tech.foto_url && (
                          <img 
                            src={tech.foto_url.startsWith('http') || tech.foto_url.startsWith('/') ? tech.foto_url : `/uploads/${tech.foto_url}`} 
                            alt="avatar" 
                            className="w-full h-full object-cover relative z-10" 
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }} 
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-medium text-sm truncate">{tech.nombres} {tech.apellidos}</h4>
                        <p className="text-primary text-xs truncate">{tech.especialidad}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {parseFloat(tech.calificacion_promedio || '0') > 0 ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                              <span className="text-amber-400 text-xs font-semibold">{parseFloat(tech.calificacion_promedio || '0').toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] bg-slate-700/60 text-slate-300 px-1.5 py-0.5 rounded-full border border-slate-600/50">
                              Nuevo talento
                            </span>
                          )}
                          <span className="text-[10px] text-textSecondary">• {tech.macrodistrito}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-slate-700/50">
                      {tech.lat_cobertura && tech.lng_cobertura && (
                        <button
                          type="button"
                          onClick={() => {
                            setHoveredTecnico(tech);
                            if (mapRef.current) {
                              mapRef.current.flyTo([tech.lat_cobertura, tech.lng_cobertura], 14);
                            }
                            setShowMobileSuggestedDrawer(false);
                            toast.success(`Cobertura de ${tech.nombres} centrada en el mapa`);
                          }}
                          className="flex-1 py-1.5 px-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                          <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Cobertura
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTechnicianModalId(tech.id_prestador);
                          setShowMobileSuggestedDrawer(false);
                        }}
                        className="flex-1 py-1.5 px-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                      >
                        <UserCircle className="h-3.5 w-3.5 text-slate-300" /> Ver Perfil
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-textSecondary text-center py-6">
                  No hay técnicos sugeridos en tu zona actual.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
