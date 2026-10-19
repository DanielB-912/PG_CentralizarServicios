import { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

export class AiController {
  static async handleIntent(req: Request, res: Response) {
    try {
      const prompt = req.body.prompt ? req.body.prompt.toString().trim() : '';
      const userRole = (req as any).user?.rol || req.body.userRole || 'CLIENTE';
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      const MODELOS_CANDIDATOS = [
        'gemini-3.5-flash',
        'gemini-3.0-flash',
        'gemini-3.6-flash',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ];

      const systemInstruction = `Eres el Asistente Semántico y de Navegación por Voz de la Plataforma de Servicios Cochabamba.
Debes realizar clasificación semántica de intenciones (Zero-Shot Intent Classification) comprendiendo el sentido global y flexible de la expresión oral del usuario, sin requerir coincidencias exactas de palabras.
El rol actual del usuario es: "${userRole}".

DIRECTIVAS SEGÚN EL ROL DEL USUARIO:

A) ROL CLIENTE (userRole: "CLIENTE"):
- action: "NAVIGATE_NUEVA_SOLICITUD"
  Aplica para frases sobre: publicar, crear, dictar trabajo, solicitar servicios, pedir ayuda, reparaciones o fallas técnicas en el hogar o negocio (ej. "quiero publicar un trabajo", "se rompió una tubería", "necesito un plomero", "dictar trabajo", "tengo una fuga", "ayuda con una avería").
  Si el usuario describe un problema específico o trabajo a realizar, infiere la "categoriaInferida" (del catálogo oficial) y un "resumenProblema" sintetizado.
- action: "NAVIGATE_HISTORIAL"
  Aplica para frases directas o indirectas sobre: revisar ofertas, cotizaciones recibidas, mis solicitudes, propuestas o trabajos activos (ej. "quisiera ver si recibí alguna respuesta a mi solicitud", "cómo van mis pedidos", "mis cotizaciones recibidas", "revisar ofertas", "ver presupuestos recibidos", "mis solicitudes activas", "qué me respondieron").
- action: "NAVIGATE_DIRECTORIO"
  Aplica para frases sobre: buscar técnicos, ver lista de profesionales o explorar catálogo de prestadores (ej. "buscar técnicos", "ver lista de profesionales", "catálogo de técnicos", "profesionales disponibles").
- action: "ORIENTACION_GENERAL"
  Aplica ante expresiones de desorientación, dudas, saludos o bienvenida (ej. "no sé qué hacer", "¿cómo empiezo?", "estoy perdido", "ayuda general", "hola", "¿qué puedo hacer?"):
  * spokenResponse OBLIGATORIA: "Bienvenido. Puedes dictar una solicitud en el mapa para publicar tu trabajo, o consultar cotizaciones en Historial y revisar técnicos en el Directorio. Di 'nueva solicitud' para comenzar."

B) ROL PRESTADOR TÉCNICO (userRole: "PRESTADOR_TECNICO"):
- action: "NAVIGATE_DEMANDAS"
  Aplica para frases directas o indirectas sobre: buscar trabajos, ver mapa de pedidos, solicitudes disponibles, chambas o cotizar (ej. "buscar chambas", "quiero chambear", "qué servicios necesitan", "ver solicitudes disponibles", "mapa de pedidos", "trabajos en mi zona", "cotizar trabajos", "pedidos de clientes").
- action: "NAVIGATE_COTIZACIONES"
  Aplica para frases sobre: mis ofertas enviadas, cotizaciones activas o presupuestos dados (ej. "ver mis ofertas", "mis cotizaciones activas", "presupuestos que envié", "mis propuestas enviadas").
- action: "NAVIGATE_RESENAS"
  Aplica para frases sobre: ver mi desempeño, reputación, calificaciones, opiniones o qué dicen de mi trabajo (ej. "cómo es mi desempeño", "mis estrellas", "qué opinan de mí", "ver mis reseñas", "mis calificaciones", "cuántas estrellas tengo", "mi reputación").
- action: "NAVIGATE_MONEDERO"
  Aplica para frases sobre: recargar saldo, ver mi monedero, pagar comisiones o saldo disponible (ej. "recargar saldo", "ver mi monedero", "mi billetera", "cuánto saldo tengo", "pagar comisiones").
- action: "ORIENTACION_GENERAL"
  Aplica ante desorientación o dudas de inicio (ej. "no sé qué hacer", "ayuda", "¿cómo empiezo?", "estoy perdido"):
  * spokenResponse OBLIGATORIA: "Hola. Puedes revisar y cotizar trabajos cercanos en el Mapa de Demandas, consultar tus presupuestos enviados en Cotizaciones, o recargar saldo en tu Monedero Virtual."

C) ROL ADMINISTRADOR (userRole: "ADMINISTRADOR"):
- action: "NAVIGATE_ADMIN_METRICAS"
  Aplica para frases sobre: reportes, estadísticas, finanzas, recaudación de comisiones o gráficos de sostenibilidad (ej. "ver métricas", "reportes financieros", "estadísticas", "cuánto recaudamos", "sostenibilidad").
- action: "NAVIGATE_ADMIN_USUARIOS"
  Aplica para frases sobre: gestionar cuentas, ver clientes, lista de usuarios o dar de alta usuarios (ej. "gestión de usuarios", "ver clientes", "lista de cuentas", "usuarios", "administrar personas").
- action: "NAVIGATE_ADMIN_CREDENCIALES"
  Aplica para frases sobre: auditar carnets, validar títulos, revisar documentos o verificar identidades (ej. "auditar credenciales", "revisar títulos", "validar carnets", "documentos pendientes", "verificar técnicos").
- action: "NAVIGATE_ADMIN_CONFIG"
  Aplica para frases sobre: cambiar comisión, parámetros o ajustes del sistema (ej. "ajustes del sistema", "cambiar porcentaje de comisión", "configuración", "parámetros de plataforma").
- action: "ORIENTACION_GENERAL"
  Aplica ante desorientación o dudas de inicio (ej. "ayuda", "no sé cómo empezar", "¿qué opciones tengo?", "panel de administración"):
  * spokenResponse OBLIGATORIA: "Panel de gobernanza activo. Puedes auditar documentos en Credenciales, revisar cuentas en Usuarios, o evaluar recaudación y demanda en Métricas Financieras."

D) CASO NO ENTENDIDO / RUIDO ("UNKNOWN"):
- Si el audio es incoherente, puro ruido, o no guarda relación con la plataforma:
  * action: "UNKNOWN"
  * spokenResponse OBLIGATORIA: "No logré entender la consulta. Por favor, repita su instrucción un poco más despacio."

CATÁLOGO OFICIAL DE CATEGORÍAS (clasifica aquí si el usuario describe un problema técnico o solicita un trabajo):
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

FORMATO DE RESPUESTA:
Devuelve EXCLUSIVAMENTE un JSON plano (sin bloques markdown ni backticks):
{
  "action": "ACTION_NAME",
  "intent": "NAVIGATE | CREAR_SOLICITUD | ORIENTACION | UNKNOWN",
  "categoriaInferida": "string | null",
  "resumenProblema": "string | null",
  "spokenResponse": "Respuesta breve fonética (máximo 2 a 3 oraciones cortas)"
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
          console.log(`[AI Controller] Inferencia exitosa con ${modelo}:`, data.action);
          return res.status(200).json(data);
        } catch (err: any) {
          console.warn(`[AI Controller] Fallo con ${modelo} (${err.status || err.message}). Probando siguiente...`);
          lastError = err;
        }
      }

      console.error("[AI Controller] Todos los modelos fallaron:", lastError);
      
      // Fallback semántico local robusto (Fail-Safe)
      if (prompt) {
        const p = prompt.toLowerCase();

        // 1. Desorientación / Orientación general
        if (p.match(/no s[eé]|c[oó]mo empiezo|perdido|ayuda|hola|qu[eé] hago|opciones/)) {
          if (userRole === 'CLIENTE') {
            return res.json({
              action: "ORIENTACION_GENERAL",
              intent: "ORIENTACION",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Bienvenido. Puedes dictar una solicitud en el mapa para publicar tu trabajo, o consultar cotizaciones en Historial y revisar técnicos en el Directorio. Di 'nueva solicitud' para comenzar."
            });
          } else if (userRole === 'PRESTADOR_TECNICO') {
            return res.json({
              action: "ORIENTACION_GENERAL",
              intent: "ORIENTACION",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Hola. Puedes revisar y cotizar trabajos cercanos en el Mapa de Demandas, consultar tus presupuestos enviados en Cotizaciones, o recargar saldo en tu Monedero Virtual."
            });
          } else if (userRole === 'ADMINISTRADOR') {
            return res.json({
              action: "ORIENTACION_GENERAL",
              intent: "ORIENTACION",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Panel de gobernanza activo. Puedes auditar documentos en Credenciales, revisar cuentas en Usuarios, o evaluar recaudación y demanda en Métricas Financieras."
            });
          }
        }

        // 2. Rol CLIENTE
        if (userRole === 'CLIENTE') {
          if (p.match(/historial|oferta|cotizaci[oó]n|propuesta|mis solicitudes/)) {
            return res.json({
              action: "NAVIGATE_HISTORIAL",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Navegando a tu Historial de Solicitudes y Ofertas recibidas."
            });
          }
          if (p.match(/directorio|buscar t[eé]cnico|profesional|cat[aá]logo/)) {
            return res.json({
              action: "NAVIGATE_DIRECTORIO",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Abriendo el Directorio de Profesionales Verificados."
            });
          }

          // Clasificación de averías o trabajo
          let catAsignada: string | null = null;
          if (p.match(/plomer|agua|fuga|tubo|caño|gasfiter|desag[uü]e/)) catAsignada = "Plomería y Gasfitería";
          else if (p.match(/luz|electric|enchufe|cable|corto|foco|termocupla/)) catAsignada = "Electricidad Residencial e Industrial";
          else if (p.match(/albañil|pared|techo|cemento|ladrillo|constru/)) catAsignada = "Albañilería y Construcción";
          else if (p.match(/pintor|pintura|pintar|color/)) catAsignada = "Pintura y Acabados";
          else if (p.match(/carpinter|madera|mueble|puerta|mesa/)) catAsignada = "Carpintería y Mueblería";
          else if (p.match(/cerrajer|llave|chapa|candado|cerradura/)) catAsignada = "Cerrajería";
          else if (p.match(/limpiez|aseo|desinfecci|lavar/)) catAsignada = "Limpieza Profunda y Desinfección";
          else if (p.match(/computador|pc|redes|sistema|internet|software|laptop/)) catAsignada = "Ingeniería de Sistemas / Soporte Técnico / Redes";
          else if (p.match(/auto|motor|freno|mecanic|llanta|bater[ií]a/)) catAsignada = "Mecánica y Auxilio Vehicular";
          else if (p.match(/jardin|pasto|planta|[aá]rbol|podar/)) catAsignada = "Jardinería y Paisajismo";
          else if (p.match(/aire|refrigerador|frio|calefacci|clima/)) catAsignada = "Climatización y Refrigeración";
          else if (p.match(/contador|impuesto|finanza|balance/)) catAsignada = "Contabilidad, Auditoría y Finanzas";
          else if (p.match(/abogado|legal|ley|contrato|demanda/)) catAsignada = "Asesoría Legal y Jurídica";
          else if (p.match(/solicitud|publicar|crear|trabajo|reparar|arreglar|falla/)) catAsignada = "Multiservicios / Arreglos Generales del Hogar";

          if (catAsignada) {
            return res.json({
              action: "NAVIGATE_NUEVA_SOLICITUD",
              intent: "CREAR_SOLICITUD",
              categoriaInferida: catAsignada,
              resumenProblema: prompt,
              spokenResponse: `Abriendo formulario de solicitud categorizado como ${catAsignada}.`
            });
          }
        }

        // 3. Rol PRESTADOR_TECNICO
        if (userRole === 'PRESTADOR_TECNICO') {
          if (p.match(/demanda|chamba|trabajo|mapa|solicitud/)) {
            return res.json({
              action: "NAVIGATE_DEMANDAS",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Navegando al Mapa de Demandas laborales."
            });
          }
          if (p.match(/cotizaci[oó]n|oferta|presupuesto/)) {
            return res.json({
              action: "NAVIGATE_COTIZACIONES",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Abriendo la sección de tus Cotizaciones."
            });
          }
          if (p.match(/reseña|calificaci[oó]n|opini[oó]n|estrella|desempeño|reputaci[oó]n/)) {
            return res.json({
              action: "NAVIGATE_RESENAS",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Navegando a tus Reseñas y Calificaciones."
            });
          }
          if (p.match(/monedero|saldo|billetera|recarga|comisi[oó]n/)) {
            return res.json({
              action: "NAVIGATE_MONEDERO",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Abriendo tu Monedero Virtual."
            });
          }
        }

        // 4. Rol ADMINISTRADOR
        if (userRole === 'ADMINISTRADOR') {
          if (p.match(/m[eé]trica|reporte|finanza|estad[ií]stica|sostenibilidad|ingreso/)) {
            return res.json({
              action: "NAVIGATE_ADMIN_METRICAS",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Abriendo Métricas Financieras y Sostenibilidad."
            });
          }
          if (p.match(/usuario|cuenta|cliente|t[eé]cnico/)) {
            return res.json({
              action: "NAVIGATE_ADMIN_USUARIOS",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Abriendo Gestión de Usuarios."
            });
          }
          if (p.match(/credencial|carnet|t[ií]tulo|validar|auditar|documento/)) {
            return res.json({
              action: "NAVIGATE_ADMIN_CREDENCIALES",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Abriendo Revisión y Auditoría de Credenciales."
            });
          }
          if (p.match(/configuraci[oó]n|comisi[oó]n|par[aá]metro|ajuste/)) {
            return res.json({
              action: "NAVIGATE_ADMIN_CONFIG",
              intent: "NAVIGATE",
              categoriaInferida: null,
              resumenProblema: null,
              spokenResponse: "Abriendo Configuración del Sistema."
            });
          }
        }

        // 5. Caso no entendido / ruido
        return res.json({
          action: "UNKNOWN",
          intent: "UNKNOWN",
          categoriaInferida: null,
          resumenProblema: null,
          spokenResponse: "No logré entender la consulta. Por favor, repita su instrucción un poco más despacio."
        });
      }

      return res.status(400).json({ error: "Instrucción de voz vacía." });

    } catch (error: any) {
      console.error('Error en AI Controller:', error);
      res.status(500).json({ error: 'Error procesando el comando de voz.' });
    }
  }
}
