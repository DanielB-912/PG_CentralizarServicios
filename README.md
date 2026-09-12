# Sistema de Gestión y Centralización de Servicios Técnicos y Profesionales en Cochabamba

Plataforma integral diseñada para conectar a clientes con prestadores de servicios técnicos (plomería, electricidad, carpintería, etc.) en Cochabamba, Bolivia.

## Características Principales (Fase 70%)
- **Arquitectura de 3 Capas**: React + Node.js + MySQL.
- **Autenticación Segura**: JWT y Bcrypt nativo.
- **Geolocalización en Tiempo Real**: Integración con Leaflet.js y Reverse Geocoding via Nominatim.
- **Asistente de Voz**: Motor de palabras clave y reconocimiento de voz nativo (SpeechRecognition).
- **Ciclo Transaccional ACID**: Ofertas, Aceptación y Cobro de comisiones con transacciones de base de datos seguras.
- **Roles Definidos**: Cliente, Prestador Técnico, Administrador.
- **Validación de Credenciales**: Sistema de subida y auditoría de documentos de técnicos.

## Estructura del Proyecto
- `/backend`: Servidor Express en TypeScript, Controladores, Servicios, Modelos, Configuración.
- `/frontend`: Aplicación SPA en React JS + Vite + Tailwind CSS.
- `/database`: Scripts SQL de inicialización.
- `docker-compose.yml`: Orquestación de infraestructura.

## Documentación Detallada
- [README_ESTRUCTURA.md](README_ESTRUCTURA.md): Explicación profunda de la arquitectura.
- [README_SISTEMA_70.md](README_SISTEMA_70.md): Detalles de las funciones implementadas al 70%.
- [README_DESPLIEGUE.md](README_DESPLIEGUE.md): Instrucciones completas para arrancar el entorno de desarrollo y Docker.
