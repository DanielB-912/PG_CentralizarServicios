import { useState, useRef, useEffect } from 'react';
import { Mic, Volume2, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

interface GlobalVoiceAssistantProps {
  onCommand: (intent: string, payload?: any) => void;
  role: 'CLIENTE' | 'PRESTADOR_TECNICO' | 'ADMINISTRADOR';
}

export const GlobalVoiceAssistant = ({ onCommand, role }: GlobalVoiceAssistantProps) => {
  const [assistantState, setAssistantState] = useState<'inactivo' | 'escuchando' | 'analizando'>('inactivo');
  const assistantStateRef = useRef<'inactivo' | 'escuchando' | 'analizando'>('inactivo');
  const [voiceToastMessage, setVoiceToastMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const voiceTimeoutRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  const updateState = (newState: 'inactivo' | 'escuchando' | 'analizando') => {
    assistantStateRef.current = newState;
    setAssistantState(newState);
  };

  useEffect(() => {
    return () => {
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const processSpeech = async (text: string) => {
    if (!text || text.trim().length === 0) {
      updateState('inactivo');
      return;
    }

    updateState('analizando');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/ai/intent', {
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

          const finishSpeech = () => {
            if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
            setVoiceToastMessage(null);
            updateState('inactivo');
          };

          if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
          voiceTimeoutRef.current = setTimeout(finishSpeech, 7000);

          utterance.onend = finishSpeech;
          utterance.onerror = finishSpeech;

          window.speechSynthesis.speak(utterance);
        } catch (synthErr) {
          console.warn('SpeechSynthesis no disponible:', synthErr);
          updateState('inactivo');
        }
      } else {
        updateState('inactivo');
      }
      
      onCommand(action, { categoriaInferida, resumenProblema });
    } catch (error) {
      toast.error('Error procesando el comando de voz con IA.');
      console.error(error);
      updateState('inactivo');
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-BO';

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        transcriptRef.current = currentTranscript;

        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
          if (assistantStateRef.current === 'escuchando') {
            try {
              recognitionRef.current?.stop();
            } catch {}
            updateState('analizando');
            processSpeech(transcriptRef.current);
          }
        }, 1200);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Error de reconocimiento de voz:', event);
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (assistantStateRef.current !== 'analizando') {
          updateState('inactivo');
        }
      };
      
      recognitionRef.current.onend = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (assistantStateRef.current === 'escuchando') {
          if (transcriptRef.current.trim().length > 0) {
            updateState('analizando');
            processSpeech(transcriptRef.current);
          } else {
            updateState('inactivo');
          }
        }
      };
    }
  }, [role, onCommand]);

  const toggleListen = () => {
    if (assistantState === 'analizando') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Para usar comandos de voz en el móvil, accede mediante HTTPS y acepta los permisos de micrófono.");
      return;
    }

    if (assistantState === 'escuchando') {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      try {
        recognitionRef.current?.stop();
      } catch {}
      if (transcriptRef.current.trim().length > 0) {
        updateState('analizando');
        processSpeech(transcriptRef.current);
      } else {
        updateState('inactivo');
      }
    } else {
      if ('speechSynthesis' in window) {
        try {
          const unlock = new SpeechSynthesisUtterance('');
          window.speechSynthesis.speak(unlock);
        } catch {}
      }

      if (recognitionRef.current) {
        try {
          window.speechSynthesis.cancel();
          setVoiceToastMessage(null);
          transcriptRef.current = '';
          recognitionRef.current.start();
          updateState('escuchando');
        } catch (err) {
          console.error('Error al iniciar reconocimiento de voz:', err);
          updateState('inactivo');
        }
      } else {
        toast.error("Para usar comandos de voz en el móvil, accede mediante HTTPS y acepta los permisos de micrófono.");
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleListen}
        disabled={assistantState === 'analizando'}
        className={`h-10 transition-all flex items-center justify-center gap-2 font-medium text-xs ${
          assistantState === 'escuchando'
            ? 'px-3.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]'
            : assistantState === 'analizando'
            ? 'px-3.5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-wait'
            : 'w-10 rounded-full bg-slate-800 border border-slate-700 text-textSecondary hover:text-white hover:bg-slate-700 shadow-md'
        }`}
        title={
          assistantState === 'escuchando'
            ? 'Escuchando tu comando...'
            : assistantState === 'analizando'
            ? 'Analizando solicitud...'
            : 'Asistente de Voz Global'
        }
      >
        {assistantState === 'escuchando' ? (
          <>
            <span className="h-2 w-2 rounded-full bg-red-400 animate-ping" />
            <Mic className="h-4 w-4 text-red-400" />
            <span>Escuchando...</span>
          </>
        ) : assistantState === 'analizando' ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
            <span>Analizando...</span>
          </>
        ) : (
          <Mic className="h-5 w-5" />
        )}
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
