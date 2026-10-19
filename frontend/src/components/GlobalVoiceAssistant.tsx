import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface GlobalVoiceAssistantProps {
  onCommand: (intent: string, payload?: any) => void;
  role: 'CLIENTE' | 'PRESTADOR_TECNICO' | 'ADMINISTRADOR';
}

export const GlobalVoiceAssistant = ({ onCommand, role }: GlobalVoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [voiceToastMessage, setVoiceToastMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'es-BO';

      recognitionRef.current.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setIsListening(false);
        toast('Analizando tu solicitud...', { icon: '🤖', duration: 2000 });
        
        try {
          const token = localStorage.getItem('token');
          const res = await axios.post('http://localhost:3001/api/ai/intent', {
            prompt: text,
            userRole: role
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          const { action, categoriaInferida, resumenProblema, spokenResponse } = res.data;
          
          if (spokenResponse) {
            setVoiceToastMessage(spokenResponse);
            try {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(spokenResponse);
              utterance.lang = 'es-BO';

              if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
              voiceTimeoutRef.current = setTimeout(() => {
                setVoiceToastMessage(null);
              }, 6000);

              utterance.onend = () => {
                if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
                setVoiceToastMessage(null);
              };

              utterance.onerror = () => {
                if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
                setVoiceToastMessage(null);
              };

              window.speechSynthesis.speak(utterance);
            } catch (synthErr) {
              console.warn('SpeechSynthesis no disponible:', synthErr);
            }
          }
          
          onCommand(action, { categoriaInferida, resumenProblema });
        } catch (error) {
          toast.error('Error procesando el comando de voz con IA.');
          console.error(error);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz:', event);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [role, onCommand]);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.start();
        setIsListening(true);
        toast('Escuchando...', { icon: '🎤', duration: 2000 });
      } else {
        toast.error('Tu navegador no soporta comandos de voz.');
      }
    }
  };

  return (
    <>
      <button
        onClick={toggleListen}
        className={`h-10 w-10 rounded-full flex items-center justify-center transition-all ${
          isListening
            ? 'bg-primary text-white animate-pulse shadow-[0_0_15px_rgba(79,70,229,0.6)]'
            : 'bg-slate-800 border border-slate-700 text-textSecondary hover:text-white hover:bg-slate-700'
        }`}
        title="Asistente de Voz Global"
      >
        {isListening ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </button>

      {voiceToastMessage && (
        <div className="fixed top-20 right-6 z-[9999] max-w-sm bg-slate-900/95 border border-primary/40 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-start gap-3 transition-all animate-in fade-in slide-in-from-top-2">
          <div className="p-2 rounded-xl bg-primary/20 text-indigo-400 shrink-0 mt-0.5">
            <Volume2 className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 text-sm text-slate-200 leading-relaxed font-medium">
            {voiceToastMessage}
          </div>
          <button
            onClick={() => {
              window.speechSynthesis.cancel();
              setVoiceToastMessage(null);
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
};
