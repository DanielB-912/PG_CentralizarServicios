import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export class AiController {
  static async handleIntent(req: Request, res: Response) {
    try {
      const { prompt, userRole, contextoActual } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      const MODELOS_CANDIDATOS = [
        'gemini-3.5-flash',
        'gemini-3.0-flash',
        'gemini-3.6-flash',
        'gemini-2.0-flash'
      ];

      const systemInstruction = `Eres el asistente de navegación y accesibilidad de la plataforma de servicios técnicos y profesionales de Cochabamba.
Tu objetivo es guiar al usuario en la plataforma según su rol actual (\${userRole}), y también clasificar solicitudes de servicio.
La plataforma cuenta con las siguientes vistas y acciones:

ROL CLIENTE:
- Vista Mapa (Explorar mapa interactivo y técnicos cercanos) -> action: "NAVIGATE_MAPA"
- Formulario de Solicitud (Crear nuevo requerimiento) -> action: "OPEN_SOLICITUD_MODAL" (IMPORTANTE: solo abrir modal, NO rellenar la descripción a menos que el usuario esté describiendo explícitamente su problema)
- Pestaña "Historial y Ofertas" (Ver presupuestos recibidos, solicitudes activas o concluidas) -> action: "NAVIGATE_HISTORIAL"
- Pestaña "Directorio" (Lista de profesionales y filtros) -> action: "NAVIGATE_DIRECTORIO"

ROL TECNICO:
- Pestaña "Mapa de Demandas" (Ver trabajos solicitados en Cochabamba) -> action: "NAVIGATE_MAPA_DEMANDAS"
- Pestaña "Mis Cotizaciones" (Ver ofertas enviadas, contraofertas y trabajos ganados) -> action: "NAVIGATE_COTIZACIONES"
- Pestaña "Mis Reseñas" (Ver calificaciones recibidas y comentarios de clientes) -> action: "NAVIGATE_RESENAS"
- Billetera / Recargar Saldo (Abrir modal de monedero virtual o pago QR) -> action: "OPEN_WALLET"
- Subir Credenciales (Acreditar CI o títulos profesionales) -> action: "FOCUS_CREDENCIALES"

ROL ADMINISTRADOR:
- Pestaña "Métricas Financieras / Sostenibilidad" -> action: "NAVIGATE_ADMIN_METRICAS"
- Pestaña "Gestión de Usuarios" -> action: "NAVIGATE_ADMIN_USUARIOS"
- Pestaña "Credenciales" -> action: "NAVIGATE_ADMIN_CREDENCIALES"
- Pestaña "Configuración" -> action: "NAVIGATE_ADMIN_CONFIG"

Si el usuario está pidiendo un trabajo o describiendo un problema, clasifícalo OBLIGATORIAMENTE en una de las siguientes categorías oficiales:
- Plomería y Gasfitería
- Electricidad Residencial e Industrial
- Albañilería y Construcción
- Pintura y Acabados
- Carpintería y Mueblería
- Cerrajería
- Multiservicios / Arreglos Generales del Hogar
- Jardinería y Paisajismo
- Climatización y Refrigeración
- Mecánica y Auxilio Vehicular
- Limpieza Profunda y Desinfección
- Ingeniería de Sistemas / Soporte Técnico / Redes
- Ingeniería Electrónica / Automatización
- Arquitectura y Diseño de Interiores
- Ingeniería Civil / Supervisión de Obras
- Contabilidad, Auditoría y Finanzas
- Asesoría Legal y Jurídica
- Diseño Gráfico y Marketing Digital

Devuelve EXCLUSIVAMENTE un JSON plano (sin bloques markdown):
{
  "action": "ACTION_NAME | UNKNOWN",
  "intent": "CREAR_SOLICITUD | BUSCAR_SERVICIO | AYUDA_GENERAL",
  "categoriaInferida": "string | null",
  "resumenProblema": "string | null",
  "spokenResponse": "Respuesta breve, amable y natural en español (máx 15 palabras) orientando al usuario"
}`;

      let lastError: any = null;
      for (const modelo of MODELOS_CANDIDATOS) {
        try {
          const response = await ai.models.generateContent({
            model: modelo,
            contents: prompt,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              temperature: 0.2
            }
          });

          let responseText = response.text || '';
          responseText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
          const data = JSON.parse(responseText);
          console.log(`[AI Controller] Inferencia exitosa con ${modelo}:`, data.categoriaInferida);
          return res.json(data);
        } catch (err: any) {
          console.warn(`[AI Controller] Fallo con ${modelo} (${err.status || err.message}). Probando siguiente...`);
          lastError = err;
        }
      }

      console.error("[AI Controller] Todos los modelos fallaron:", lastError);
      return res.status(503).json({ success: false, message: "Servicio de IA temporalmente saturado, reintente en unos segundos." });


    } catch (error: any) {
      console.error('Error en AI Controller:', error);
      res.status(500).json({ error: 'Error procesando el comando de voz.' });
    }
  }
}
