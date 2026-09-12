# Sistema al 80% de Madurez (Robustecido y Refinado)

El sistema ha superado la fase de estabilización arquitectónica, integrando ahora interacciones avanzadas, reportes reales, una UI Premium altamente inmersiva y un sistema reactivo sin fisuras.

## Funcionalidades Críticas Completadas
1. **Autenticación y Hashing Nativo**:
   - Resolución de discrepancias de columnas (`contrasena_sh` vs `password_hash`).
   - Implementación estricta de `bcrypt.compare` y `bcrypt.hash` nativos.
   - Script `seedPasswords.ts` idempotente.

2. **Infraestructura y Persistencia Real (Puerto 3001)**:
   - Base de datos 100% persistente con migraciones no destructivas (`CREATE TABLE IF NOT EXISTS` y `ALTER TABLE` automático para nuevas columnas como `lat_cobertura`, `lng_cobertura` y `radio_cobertura`).
   - El backend corre exclusivamente en el puerto 3001 para aislar los flujos de red y prevenir puertos colgados.
   - Todos los clientes HTTP (Axios) en React han sido migrados a `http://localhost:3001`.

3. **Inteligencia Artificial Avanzada con Gemini 3.6 Flash**:
   - Integración nativa con `@google/genai` procesando PNL avanzado y devolviendo estructuras estrictas en JSON.
   - Autocompletado inteligente de Solicitudes (resumen de problema e inferencia de categoría) a partir del Asistente de Voz y del botón "Dictar Solicitud".
   - Asistente Global de Navegación que interpreta el mapa de rutas según el rol y dirige al usuario a la vista correspondiente de forma natural y libre (eliminando el antiguo y rígido `matchingService` por palabras clave).
   - Text-To-Speech (TTS) natural usando `window.speechSynthesis` para guiar al usuario con voz.

4. **Ciclo de Vinculación y Ofertas (UI Premium & Reactividad)**:
   - **Cliente**: Actualización reactiva (en tiempo real local) de estado `VINCULADA` tras aceptar una cotización. Corrección del error de calificación inmediata permitiendo evaluar directamente en el modal tras vincular.
   - **Técnico**: Monedero Virtual con flujo de recarga de saldo simulada.
   - **Matching Semántico en Mapa de Demandas**: Pines verdes (Alta compatibilidad) y rojos basados en `isEspecialidadMatch` que aplica algoritmos de concordancia de raíz con el catálogo estandarizado.

5. **Auditoría de Credenciales y Perfiles**:
   - Catálogo estandarizado de Profesiones dividido en "Oficios Técnicos" y "Servicios Profesionales e Ingenierías" sin ramas de salud.
   - El Administrador puede reclasificar y enmendar el tipo de documento subido por el técnico antes de validar o rechazar. (Se modificó la base de datos a `VARCHAR(50)` para soportar nuevas clasificaciones como `CURRICULUM` y evitar errores de truncado de ENUM).
   - Privacidad Documental Estricta: Los documentos sensibles (Cédulas de Identidad) se bloquean al público con el candado "🛡️ Identidad Oficial Verificada", mientras que respaldos públicos (Títulos, CV) se mantienen accesibles al cliente.

6. **Perfil Técnico y Gestión de Mis Reseñas**:
   - Pestaña exclusiva de "Mis Reseñas" que compila todos los comentarios obtenidos con etiquetas del tipo de servicio prestado y el comentario real del cliente, consultado dinámicamente en `CalificacionModel`.

7. **Monedero Virtual y Políticas de Saldo Transaccional**:
   - **Gestión de Comisiones**: Al concretar una vinculación, el sistema calcula la comisión a partir de la tasa porcentual dinámica configurada.
   - **Débito Permisivo (Saldo Negativo)**: El débito de comisión procesa incondicionalmente la vinculación incluso si el técnico posee saldo insuficiente (`< comision`). Emite una alerta visual en el Dashboard.

8. **Panel Administrativo (Data Real y Analíticas Visuales)**:
   - Exportación de Reportes Financieros en formato PDF con `jspdf` (descarga instantánea y tabulación de data real).
   - Generación de KPIs reales (total de usuarios, servicios vinculados, ingresos totales) mediante queries SQL fidedignas e indexadas. Resolución del error `ER_BAD_FIELD_ERROR` detectando dinámicamente las columnas de valor económico.
   - Implementación de componentes nativos CSS/SVG estilizados con Tailwind para gráficos de barras y distribución, asegurando un diseño puro sin cajas vacías.

## Siguientes Pasos (Camino al 100%)
- Módulo de chat en tiempo real mediante WebSockets o similar.
- Integración de pasarela de pagos real (ej. Libélula, QR Cbba) para recargar monedero virtual.
# Guía de Despliegue y Flujo de Desarrollo (Actualizado)

## Requisitos Previos
- Node.js (v18+)
- Docker y Docker Compose
- NPM

## Arquitectura de Red y Puertos
- **Base de Datos (MySQL):** `localhost:3307` (o `3306` dependiendo del `docker-compose.yml`)
- **Backend (Node/Express):** `localhost:3001` (Modificado para evitar conflictos de persistencia y puertos zombies)
- **Frontend (Vite/React):** `localhost:5173`

## Flujo de Trabajo Manual

Se ha establecido la siguiente regla de ejecución para garantizar la estabilidad de las conexiones y evitar pérdida de datos:

1. **Levantar la Base de Datos con Docker:**
   Abrir una terminal en la raíz del proyecto y ejecutar:
   ```bash
   docker-compose up mysql_db -d
   ```
   Esto levantará únicamente el contenedor `mysql_db`. El script `init.sql` utiliza cláusulas `CREATE TABLE IF NOT EXISTS` para evitar pérdida de datos. Los datos persisten a través del reinicio del contenedor. (Esperar ~10 segundos a que MySQL inicie).
   - Para detener la BD **sin perder datos**: `docker-compose stop mysql_db`
   - Para limpiar la BD y **borrar todo**: `docker-compose down -v`

2. **Levantar el Backend (Express):**
   Abrir una nueva terminal, navegar a `/backend` y ejecutar:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   El backend iniciará en el puerto 3001. El seeding de contraseñas (`seedPasswords.ts`) es no-destructivo e ignora usuarios que ya han sido hasheados, manteniendo tus sesiones locales válidas.

3. **Levantar el Frontend (React + Vite):**
   Abrir otra terminal, navegar a `/frontend` y ejecutar:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   El frontend estará disponible en `http://localhost:5173`. Todos los endpoints de API ahora apuntan a `localhost:3001`.

## Usuarios de Prueba (Semilla)
Al inicializar la base de datos, se crean los siguientes usuarios con contraseña `Admin123!`:
- **Admin Principal:** `admin@univalle.edu`
- **Cliente:** `cliente@correo.com`
- **Plomero:** `plomero@servicios.com`
- **Electricista:** `electricista@servicios.com`
- **Carpintero:** `carpintero@servicios.com`
- **Albañil:** `albanil@servicios.com`
- **Gasista:** `gasista@servicios.com`
- **Ing. Sistemas:** `sistemas@servicios.com`
- **Arquitecto:** `arquitecto@servicios.com`
- **Abogada:** `abogado@servicios.com`
## Solución de Errores Comunes
- **`PROTOCOL_CONNECTION_LOST` en Backend**: Se implementó `pool.getConnection` y manejo adecuado del cierre de conexiones.
- **Pérdida de Sesiones Constante**: Se deshabilitó el borrado de tablas (`DROP TABLE`) en `init.sql` y el reinicio forzado en los seeders.
- **Credenciales Inválidas (`Illegal arguments: string, undefined`)**: La base de datos guarda correctamente los hashes Bcrypt en la columna `password_hash`.

## Recomendaciones
- No utilizar `npm run build` en un flujo de desarrollo continuo.
- Limpieza total: Si requieres borrar los datos, usa `docker-compose down -v` para eliminar el volumen persistente de MySQL de Docker, esto borrará la base de datos por completo y permitirá inicializarla de cero.
# Estructura del Sistema (Versión Actualizada)

## Arquitectura Base
- **Frontend**: React.js + Vite + Tailwind CSS.
- **Backend**: Node.js + Express + TypeScript.
- **Base de Datos**: MySQL 8.0 (InnoDB, 3FN).

## Frontend (`frontend/src/`)
- `components/`: Componentes reutilizables de UI (`ProfileModal.tsx` extendido con edición de perfiles en base a rol).
- `context/`: `AuthContext.tsx` para manejo de sesión y roles.
- `views/`: 
  - `Login.tsx`, `Register.tsx`: Autenticación.
  - `DashboardCliente.tsx`: Búsqueda de técnicos, mapa interactivo, entrada por voz con PNL Heurístico conectado al backend (`/api/matching/analyze`), y el nuevo Directorio de Técnicos Verificados.
  - `DashboardTecnico.tsx`: Feed de solicitudes, monedero virtual, y módulo de subida masiva de credenciales. Mapa y feed bloqueados si no hay credenciales aprobadas.
  - `DashboardAdmin.tsx`: Métricas, CRUD de usuarios, visor de credenciales, configuración de comisiones.

## Backend (`backend/src/`)
- `config/`: Configuración de BD (`db.ts`) y auto-seeding no destructivo de seguridad (`seedPasswords.ts`).
- `controllers/`: 
  - `authController.ts` y `userController.ts` (CRUD y edición de perfiles propios y de terceros).
  - `prestadorController.ts` (Listado de verificados, y edición de perfil técnico).
  - `credencialController.ts` (Multer masivo en `backend/uploads/` y Validación).
  - `solicitudController.ts`, `ofertaController.ts`, `vinculacionController.ts`.
- `middlewares/`: `authMiddleware.ts` (JWT, Roles).
- `models/`: Abstracciones seguras que mapean directamente a la BD.
- `routes/`: Endpoints API mapeados en `apiRoutes.ts`, `userRoutes.ts`, `authRoutes.ts`.
- `services/`: Lógica compleja (`vinculacionService.ts`).

## Base de Datos
- **9 Tablas Normalizadas (3FN)**: `usuarios`, `prestadores`, `credenciales`, `solicitudes`, `ofertas`, `vinculaciones`, `transacciones`, `calificaciones`, `configuracion_sistema`.
- **Claves Primarias (PK)**: `INT AUTO_INCREMENT`.
- **Persistencia No Destructiva**: Creación de tablas condicionales y seeder idempotente.
- **Transacciones ACID**: Bloqueos de registro (`FOR UPDATE`) para saldo de monedero.
- **Auto-Migración y Puertos**: Docker en puerto `3306`, Backend expuesto en el puerto `3001` para resolver conflictos de red.
