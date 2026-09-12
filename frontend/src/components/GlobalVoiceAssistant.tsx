import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'react-hot-toast';

import axios from 'axios';

interface GlobalVoiceAssistantProps {
  onCommand: (intent: string, payload?: any) => void;
  role: 'CLIENTE' | 'PRESTADOR_TECNICO' | 'ADMINISTRADOR';
}

export const GlobalVoiceAssistant = ({ onCommand, role }: GlobalVoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

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
            const utterance = new SpeechSynthesisUtterance(spokenResponse);
            utterance.lang = 'es-BO';
            window.speechSynthesis.speak(utterance);
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
  );
};
