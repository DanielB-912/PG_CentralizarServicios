# Plataforma Web Centralizada de Servicios Técnicos y Profesionales Cochabamba

Sistema web full-stack diseñado para centralizar, transparentar y optimizar la vinculación entre clientes y prestadores de servicios (técnicos e independientes) en el área metropolitana de Cochabamba, integrando accesibilidad por voz, inferencia semántica con IA y auditoría administrativa financiera.

---

## 🏛️ Arquitectura del Sistema

* **Frontend:** React (TypeScript), Tailwind CSS, Vite, Web Speech API.
* **Backend:** Node.js, Express, TypeScript, arquitectura modular (Controladores, Servicios, Modelos).
* **Base de Datos:** MySQL relacional con migraciones automáticas y persistencia geográfica.
* **Inteligencia Artificial:** SDK de Google AI Studio con inferencia multimodelo en cascada (Gemini 3.5 Flash / 3.6 Flash / 2.0 Flash) para clasificación semántica y navegación asistida.

---

## Módulos y Funcionalidades Principales

### 1. Rol Cliente
* **Solicitud Guiada por Voz y Texto:** Reconocimiento de voz mediante Web Speech API con temporizador anti-cortes.
* **Clasificación Semántica Dinámica:** Categorización automática del problema dictado contra el catálogo oficial de servicios (Plomería, Electricidad, Albañilería, Sistemas, Asesoría Legal, etc.).
* **Mapa de Geolocalización:** Marcado de ubicación geográfica en Cochabamba y consulta de técnicos cercanos.
* **Ofertas y Vinculación:** Recepción de cotizaciones, aceptación inmediata y calificación transparente del servicio con contexto de la labor realizada.

### 2. Rol Prestador / Técnico
* **Mapa de Demandas en Vivo:** Pines con distinción cromática según afinidad de especialidad (Verde para afines, Rojo para no afines).
* **Monedero Virtual y Recargas:** Saldo virtual con simulación de pasarela de pago QR para comisiones de servicio.
* **Gestión Documental y Acreditación:** Carga de Cédula de Identidad (CI), títulos en provisión nacional, certificados y currículum vitae.
* **Pestaña de Desempeño y Reseñas:** Visualización exclusiva de calificaciones y opiniones de clientes con síntesis del trabajo.

### 3. Rol Administrador
* **Panel de Sostenibilidad Financiera:** KPIs en tiempo real (usuarios totales, vinculaciones activas, ingresos por comisión al 8%).
* **Visualización de Datos (BI):** Gráficos de demanda agrupados por Macrodistrito (Centro, Quillacollo, Sud, etc.) e historial auditable de transacciones.
* **Auditoría Documental y Privacidad Estricta:** Validación de credenciales laborales. Encriptación/ocultamiento de la Cédula de Identidad hacia los clientes (mostrando únicamente la insignia de verificación oficial con candado).

---

## ⚙️ Puesta en Marcha Rápida

### Requisitos
* Node.js v18+
* Docker Desktop (para la base de datos MySQL) o servidor MySQL local
* API Key activa en Google AI Studio

### Variables de Entorno

Crea un archivo `.env` dentro de la carpeta `backend/` basándote en `.env.example`:

```bash
cp backend/.env.example backend/.env
Configura tus credenciales locales y tu clave de Google AI Studio:

Code snippet
PORT=3001
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_local
DB_NAME=servicios_cbba
JWT_SECRET=tu_jwt_secret
GEMINI_API_KEY=tu_api_key_aqui
Ejecución
Bash
# 1. Base de datos
docker-compose up -d

# 2. Backend
cd backend
npm install
npm run dev

# 3. Frontend
cd frontend
npm install
npm run dev
