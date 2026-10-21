import React, { useState, useEffect } from 'react';
import { X, Star, CheckCircle, FileText, MapPin } from 'lucide-react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
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

interface TecnicoPublicProfileModalProps {
  id_prestador: number | null;
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
}

export const TecnicoPublicProfileModal: React.FC<TecnicoPublicProfileModalProps> = ({ id_prestador, isOpen, onClose, token }) => {
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && id_prestador) {
      setLoading(true);
      Promise.all([
        axios.get(`/api/prestadores/${id_prestador}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/prestadores/${id_prestador}/resenas`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      .then(([resProfile, resReviews]) => {
        setProfile(resProfile.data);
        setReviews(resReviews.data);
        setError('');
      })
      .catch(err => {
        console.error(err);
        setError('Error al cargar el perfil del prestador.');
      })
      .finally(() => {
        setLoading(false);
      });
    } else {
      setProfile(null);
      setReviews([]);
    }
  }, [isOpen, id_prestador, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto p-0 md:p-6 my-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-slate-400 hover:text-white bg-slate-800/80 p-2.5 rounded-full transition-all cursor-pointer"
        >
          <X size={20} />
        </button>
        <div className="h-32 bg-gradient-to-r from-primary to-accent relative -mx-0 md:-mx-6 -mt-0 md:-mt-6 rounded-t-2xl md:rounded-t-none">
        </div>
        
        {loading ? (
          <div className="p-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-10 text-center text-red-400">
            {error}
          </div>
        ) : profile ? (
          <div className="px-6 pb-6 -mt-16 relative z-10">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-end mb-6">
              <div className="h-32 w-32 rounded-full bg-slate-800 border-4 border-surface shadow-xl flex items-center justify-center text-4xl font-bold text-primary overflow-hidden shrink-0 relative">
                <span className="absolute inset-0 flex items-center justify-center">
                  {profile.nombres?.charAt(0) || 'T'}
                </span>
                {profile.foto_url && (
                  <img 
                    src={profile.foto_url.startsWith('http') || profile.foto_url.startsWith('/') ? profile.foto_url : `/uploads/${profile.foto_url}`} 
                    alt="avatar" 
                    className="h-full w-full object-cover relative z-10" 
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }} 
                  />
                )}
              </div>
              <div className="text-center sm:text-left flex-1 pb-2">
                <h2 className="text-3xl font-bold text-white mb-1">{profile.nombres} {profile.apellidos}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                  <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium">{profile.especialidad}</span>
                  {parseFloat(profile.calificacion_promedio || '0') > 0 ? (
                    <span className="flex items-center text-amber-400 font-medium">
                      <Star className="h-4 w-4 fill-amber-400 mr-1" />
                      {parseFloat(profile.calificacion_promedio || '0').toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600/50">
                      Nuevo talento
                    </span>
                  )}
                </div>
              </div>
              {/* Botón Contactar ocultado: El modal funciona como visor informativo y de credenciales auditadas */}
              {/* <div className="w-full sm:w-auto flex gap-2 pb-2 shrink-0">
                <button className="flex-1 sm:flex-none btn-primary py-2 px-6 flex items-center justify-center gap-2">
                  <Phone className="h-4 w-4" /> Contactar
                </button>
              </div> */}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-lg font-bold text-white mb-3">Información Profesional</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex flex-col">
                      <span className="text-textSecondary text-xs">Biografía</span>
                      <span className="text-white font-medium">{profile.descripcion_profesional || 'No especificado'}</span>
                    </li>
                    <li className="flex flex-col pt-2 border-t border-slate-700/50">
                      <span className="text-textSecondary text-xs">Disponibilidad Horaria</span>
                      <span className="text-white font-medium">{profile.disponibilidad_horaria || 'No especificado'}</span>
                    </li>
                    <li className="flex flex-col gap-1 pt-2 border-t border-slate-700/50">
                      <span className="text-xs font-medium text-slate-400">Macrodistrito Base</span>
                      <span className="text-sm font-semibold text-white">{profile.macrodistrito}</span>
                    </li>
                    <li className="flex flex-col gap-1 pt-2 border-t border-slate-700/50">
                      <span className="text-xs font-medium text-slate-400">Zona de Cobertura:</span>
                      <span className="text-sm font-semibold text-white break-words">{profile.zona_cobertura || 'Todo el macrodistrito'}</span>
                    </li>
                    <li className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                      <span className="text-textSecondary">Trabajos Realizados</span>
                      {Number(profile.trabajos_realizados) > 0 ? (
                        <span className="text-white font-medium">
                          {profile.trabajos_realizados} {Number(profile.trabajos_realizados) === 1 ? 'servicio' : 'servicios'}
                        </span>
                      ) : (
                        <span className="text-amber-400 text-xs font-medium bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                          Nuevo talento
                        </span>
                      )}
                    </li>
                    <li className="flex justify-between pt-2 border-t border-slate-700/50">
                      <span className="text-textSecondary">Estado</span>
                      <span className="text-emerald-400 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Verificado</span>
                    </li>
                  </ul>
                </div>
                
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  Documentos de Acreditación Validados
                </h3>
                <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
                  {(!profile.documentos || profile.documentos.length === 0) ? (
                    <div className="text-center py-6">
                      <div className="inline-flex h-12 w-12 rounded-full bg-emerald-500/10 items-center justify-center mb-2 text-emerald-500">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <p className="text-sm text-textSecondary max-w-xs mx-auto">
                        <span className="text-emerald-400 font-bold block mb-1">🛡️ Identidad Verificada por la Plataforma</span>
                        La identidad y antecedentes de este técnico han sido validados estrictamente. (Documentos personales protegidos por privacidad).
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {profile.documentos.map((doc: any, i: number) => {
                        const isPrivate = doc.tipo_documento === 'CI_ANVERSO' || doc.tipo_documento === 'CI_REVERSO' || /carnet|ci|identidad|cédula|cedula/i.test(doc.tipo_documento.toLowerCase());
                        
                        return (
                          <div key={i} className="bg-slate-800 p-3 rounded-lg border border-slate-700 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-textSecondary">
                              <FileText className="h-5 w-5 text-primary" />
                              <span className="text-xs uppercase font-medium">{doc.tipo_documento.replace(/_/g, ' ')}</span>
                            </div>
                            {isPrivate ? (
                              <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 rounded-lg text-sm text-emerald-200 mt-1">
                                <span className="font-bold block mb-1">🛡️ Identidad Oficial Verificada</span> 
                                Cédula validada por la administración (oculta por privacidad).
                              </div>
                            ) : (
                              <a 
                                href={doc.documento_url.startsWith('http') ? doc.documento_url : doc.documento_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="w-full text-center bg-slate-700 hover:bg-slate-600 text-white text-sm py-2 rounded transition-colors mt-1 block"
                              >
                                Ver Respaldo / Certificado
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Área de Alcance Geográfico */}
              <div className="mt-6">
                {profile.lat_cobertura && profile.lng_cobertura ? (
                  <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-4">
                    <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Área de Alcance Geográfico</h4>
                    <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-700 relative z-0">
                      <MapContainer 
                        center={[profile.lat_cobertura, profile.lng_cobertura]} 
                        zoom={13} 
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          attribution='&copy; OpenStreetMap'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[profile.lat_cobertura, profile.lng_cobertura]} />
                        <Circle 
                          center={[profile.lat_cobertura, profile.lng_cobertura]} 
                          radius={profile.radio_cobertura || 3000} 
                          pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2 }} 
                        />
                      </MapContainer>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
                    <span className="text-indigo-400 text-xl">ℹ️</span>
                    <p className="text-sm text-indigo-200">
                      El prestador no delimitó un área geográfica específica; atiende en todo su macrodistrito base de manera general.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Reseñas de Clientes (Full Width) */}
            <div className="mt-6 col-span-1 md:col-span-2">
              <h3 className="text-lg font-bold text-white mb-3">Reseñas de Clientes</h3>
              {reviews.length === 0 ? (
                <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50 text-center">
                  <Star className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-textSecondary">Este profesional aún no tiene reseñas.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                  {reviews.map((r, i) => (
                    <div key={i} className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-1 text-amber-400">
                            {[...Array(5)].map((_, j) => (
                              <Star key={j} className={`h-4 w-4 ${j < r.rating ? 'fill-amber-400' : 'text-slate-600'}`} />
                            ))}
                          </div>
                          <span className="text-xs text-slate-500">{new Date(r.fecha).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-300 text-sm italic mb-2">"{r.comentario || 'Sin comentario'}"</p>
                        {r.solicitud_descripcion && (
                          <div className="bg-primary/10 text-primary-light text-xs py-1 px-2 rounded mb-2 inline-block">
                            Trabajo realizado: {r.tipo_servicio} - {r.solicitud_descripcion}
                          </div>
                        )}
                        <p className="text-xs text-slate-400 text-right">- {r.cliente_nombre} {r.cliente_apellido}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
};
