CREATE DATABASE IF NOT EXISTS db_servicios_cbba;
USE db_servicios_cbba;

-- Tablas antiguas (Comentado para preservar datos)
-- DROP TABLE IF EXISTS calificaciones;
-- DROP TABLE IF EXISTS transacciones;
-- DROP TABLE IF EXISTS vinculaciones;
-- DROP TABLE IF EXISTS ofertas;
-- DROP TABLE IF EXISTS solicitudes;
-- DROP TABLE IF EXISTS credenciales;
-- DROP TABLE IF EXISTS prestadores;
-- DROP TABLE IF EXISTS usuarios;
-- DROP TABLE IF EXISTS configuracion_sistema;

CREATE TABLE IF NOT EXISTS usuarios (
   id_usuario INT AUTO_INCREMENT PRIMARY KEY,
   email VARCHAR(100) UNIQUE NOT NULL,
   password_hash VARCHAR(255) NOT NULL,
   nombres VARCHAR(50) NOT NULL,
   apellidos VARCHAR(50) NOT NULL,
   telefono VARCHAR(20) NOT NULL,
   direccion VARCHAR(200) NOT NULL,
   foto_url VARCHAR(255) NULL,
   rol ENUM('CLIENTE', 'PRESTADOR_TECNICO', 'ADMINISTRADOR') NOT NULL,
   estado_activo BOOLEAN DEFAULT TRUE,
   fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prestadores (
   id_prestador INT AUTO_INCREMENT PRIMARY KEY,
   id_usuario INT UNIQUE NOT NULL,
   tipo_perfil ENUM('TECNICO', 'PROFESIONAL') NOT NULL,
   especialidad VARCHAR(100) NOT NULL,
   descripcion_profesional TEXT,
   disponibilidad_horaria VARCHAR(50),
   zona_cobertura VARCHAR(200),
   lat_cobertura DECIMAL(10, 6) NULL,
   lng_cobertura DECIMAL(10, 6) NULL,
   radio_cobertura INT NULL DEFAULT 3000,
   macrodistrito ENUM('Cala Cala', 'Centro', 'Sud', 'Sacaba', 'Quillacollo') NOT NULL,
   saldo DECIMAL(10,2) DEFAULT 0.00,
   estado_activo BOOLEAN DEFAULT TRUE,
   FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credenciales (
   id_credencial INT AUTO_INCREMENT PRIMARY KEY,
   id_usuario INT NOT NULL,
   tipo_documento ENUM('CI_ANVERSO', 'CI_REVERSO', 'TITULO_PROVISION_NACIONAL', 'CERTIFICADO_TECNICO') NOT NULL,
   documento_url VARCHAR(255) NOT NULL,
   estado_validacion ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') DEFAULT 'PENDIENTE',
   observaciones_admin TEXT NULL,
   fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS solicitudes (
   id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
   id_cliente INT NOT NULL,
   tipo_servicio VARCHAR(50) NOT NULL,
   descripcion TEXT NOT NULL,
   presupuesto DECIMAL(10,2) NULL,
   ubicacion_lat DECIMAL(10,6) NOT NULL,
   ubicacion_lng DECIMAL(10,6) NOT NULL,
   macrodistrito VARCHAR(50) NOT NULL,
   estado_solicitud ENUM('PENDIENTE', 'OFERTADA', 'VINCULADA', 'FINALIZADA', 'CANCELADA') DEFAULT 'PENDIENTE',
   fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (id_cliente) REFERENCES usuarios(id_usuario)
);

CREATE TABLE IF NOT EXISTS ofertas (
   id_oferta INT AUTO_INCREMENT PRIMARY KEY,
   id_solicitud INT NOT NULL,
   id_prestador INT NOT NULL,
   monto_ofertado DECIMAL(10,2) NOT NULL,
   mensaje_propuesta TEXT NULL,
   estado_oferta ENUM('ENVIADA', 'RECHAZADA', 'ACEPTADA', 'CONTRAOFERTADA') DEFAULT 'ENVIADA',
   fecha_oferta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud) ON DELETE CASCADE,
   FOREIGN KEY (id_prestador) REFERENCES prestadores(id_prestador)
);

CREATE TABLE IF NOT EXISTS vinculaciones (
   id_vinculacion INT AUTO_INCREMENT PRIMARY KEY,
   id_solicitud INT UNIQUE NOT NULL,
   id_prestador INT NOT NULL,
   valor_acordado DECIMAL(10,2) NOT NULL,
   comision_aplicada DECIMAL(10,2) NOT NULL,
   tasa_porcentaje DECIMAL(5,2) NOT NULL,
   estado_vinculacion ENUM('ACTIVA', 'COMPLETADA', 'CANCELADA') DEFAULT 'ACTIVA',
   fecha_vinculacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (id_solicitud) REFERENCES solicitudes(id_solicitud),
   FOREIGN KEY (id_prestador) REFERENCES prestadores(id_prestador)
);

CREATE TABLE IF NOT EXISTS transacciones (
   id_transaccion INT AUTO_INCREMENT PRIMARY KEY,
   id_vinculacion INT NULL,
   id_prestador INT NOT NULL,
   tipo_transaccion ENUM('DEBITO_COMISION', 'RECARGA_SALDO') NOT NULL,
   monto DECIMAL(10,2) NOT NULL,
   saldo_anterior DECIMAL(10,2) NOT NULL,
   saldo_posterior DECIMAL(10,2) NOT NULL,
   fecha_transaccion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (id_vinculacion) REFERENCES vinculaciones(id_vinculacion),
   FOREIGN KEY (id_prestador) REFERENCES prestadores(id_prestador)
);

CREATE TABLE IF NOT EXISTS calificaciones (
   id_calificacion INT AUTO_INCREMENT PRIMARY KEY,
   id_vinculacion INT UNIQUE NOT NULL,
   puntuacion INT NOT NULL CHECK (puntuacion BETWEEN 1 AND 5),
   comentario TEXT NULL,
   fecha_calificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (id_vinculacion) REFERENCES vinculaciones(id_vinculacion)
);

CREATE TABLE IF NOT EXISTS configuracion_sistema (
   clave VARCHAR(50) PRIMARY KEY,
   valor VARCHAR(100) NOT NULL
);

-- DATOS SEMILLA (SEEDS)
INSERT IGNORE INTO configuracion_sistema (clave, valor) VALUES 
('tasa_comision_porcentaje', '5.00'),
('modo_mantenimiento', 'false');

-- Usuarios
-- Admin123!: $2a$10$uhD6zFFP3XTR12hDjQu91uUFMhEG4Z1WH.s9/iJeqRhGWHiWePKje
-- Cliente123!: $2a$10$h.h0RxKJyisQOf2UvxSqmOAdHj7IRTCH6jXy.icXxEvRiJXf7k0pG
-- Plomero123!: $2a$10$fpCUJIB5LgtcYhN0q4eu0.zUs4aqWj5etXo9gLSFM9eKBI8u4RBou
-- Electricista123!: $2a$10$M.06Ifkcz4AidlrxgQocie/OzX0L0MP1bVfDWZhcjgxlw/uYUqUqG
-- Carpintero123!: $2a$10$JMRGFl.Et8lnA.pO9wqe.uwZ77mxzpiNqrs23BcIgYfzzi.qIj/sK
-- Albanil123!: $2a$10$cx4JWirZcQlO1xRQGq2vsudBKgQ3xpFA8O1PtwdSyawXbxwyWgDL.
-- Gasista123!: $2a$10$JppX8k2sLamO.pNcQ.P.ZOpm.1ys/wnJaORI.NMcFm89eRyP11UBG
-- Sistemas123!: $2a$10$yQ7o.9EfTureuDx.K9Lm9OKkqa.sJSjh8E/Sk9rfLtJitoPm4UUUm
-- Arquitecto123!: $2a$10$ZU.y6AqNKHXOOD52za8zteZKCGSd4Iq6d2FfMfyUCstcGLGjmTEi2
-- Abogado123!: $2a$10$MOWn3zSI5etdOMVHz4IosOHbI.cRunk8mIWuksjE9kynijwjFU6.a

INSERT IGNORE INTO usuarios (id_usuario, email, password_hash, nombres, apellidos, telefono, direccion, rol) VALUES 
(1, 'admin@univalle.edu', '$2a$10$uhD6zFFP3XTR12hDjQu91uUFMhEG4Z1WH.s9/iJeqRhGWHiWePKje', 'Admin', 'Principal', '12345678', 'Av. America', 'ADMINISTRADOR'),
(2, 'cliente@correo.com', '$2a$10$h.h0RxKJyisQOf2UvxSqmOAdHj7IRTCH6jXy.icXxEvRiJXf7k0pG', 'Cliente', 'Prueba', '70000001', 'Centro Ciudad', 'CLIENTE'),
(3, 'plomero@servicios.com', '$2a$10$fpCUJIB5LgtcYhN0q4eu0.zUs4aqWj5etXo9gLSFM9eKBI8u4RBou', 'Juan', 'Perez (Plomero)', '70000002', 'Cala Cala', 'PRESTADOR_TECNICO'),
(4, 'electricista@servicios.com', '$2a$10$M.06Ifkcz4AidlrxgQocie/OzX0L0MP1bVfDWZhcjgxlw/uYUqUqG', 'Carlos', 'Gomez (Electricista)', '70000003', 'Centro', 'PRESTADOR_TECNICO'),
(5, 'carpintero@servicios.com', '$2a$10$JMRGFl.Et8lnA.pO9wqe.uwZ77mxzpiNqrs23BcIgYfzzi.qIj/sK', 'Luis', 'Rojas (Carpintero)', '70000004', 'Sud', 'PRESTADOR_TECNICO'),
(6, 'albanil@servicios.com', '$2a$10$cx4JWirZcQlO1xRQGq2vsudBKgQ3xpFA8O1PtwdSyawXbxwyWgDL.', 'Pedro', 'Mendez (Albanil)', '70000005', 'Quillacollo', 'PRESTADOR_TECNICO'),
(7, 'gasista@servicios.com', '$2a$10$JppX8k2sLamO.pNcQ.P.ZOpm.1ys/wnJaORI.NMcFm89eRyP11UBG', 'Miguel', 'Torres (Gasista)', '70000006', 'Sacaba', 'PRESTADOR_TECNICO'),
(8, 'sistemas@servicios.com', '$2a$10$yQ7o.9EfTureuDx.K9Lm9OKkqa.sJSjh8E/Sk9rfLtJitoPm4UUUm', 'Ana', 'Lopez (Ing)', '70000007', 'Centro', 'PRESTADOR_TECNICO'),
(9, 'arquitecto@servicios.com', '$2a$10$ZU.y6AqNKHXOOD52za8zteZKCGSd4Iq6d2FfMfyUCstcGLGjmTEi2', 'Jorge', 'Vargas (Arq)', '70000008', 'Cala Cala', 'PRESTADOR_TECNICO'),
(10, 'abogado@servicios.com', '$2a$10$MOWn3zSI5etdOMVHz4IosOHbI.cRunk8mIWuksjE9kynijwjFU6.a', 'Maria', 'Suarez (Abogada)', '70000009', 'Centro', 'PRESTADOR_TECNICO');

-- Prestadores
INSERT IGNORE INTO prestadores (id_usuario, tipo_perfil, especialidad, descripcion_profesional, disponibilidad_horaria, zona_cobertura, macrodistrito, saldo, estado_activo) VALUES 
(3, 'TECNICO', 'Plomeria', 'Experto en reparacion de tuberias', '8:00 - 18:00', 'Cala Cala y alrededores', 'Cala Cala', 50.00, TRUE),
(4, 'TECNICO', 'Electricidad', 'Instalaciones electricas seguras', '8:00 - 18:00', 'Centro y alrededores', 'Centro', 40.00, TRUE),
(5, 'TECNICO', 'Carpinteria', 'Muebles a medida', '8:00 - 18:00', 'Zona Sud', 'Sud', 35.00, TRUE),
(6, 'TECNICO', 'Albanileria', 'Construccion y remodelacion', '8:00 - 18:00', 'Todo Quillacollo', 'Quillacollo', 60.00, TRUE),
(7, 'TECNICO', 'Gaseria', 'Instalacion de gas domiciliario', '8:00 - 18:00', 'Sacaba', 'Sacaba', 45.00, TRUE),
(8, 'PROFESIONAL', 'Ing. de Sistemas', 'Desarrollo y soporte tecnico', 'Flexible', 'Cochabamba Centro', 'Centro', 100.00, TRUE),
(9, 'PROFESIONAL', 'Arquitectura', 'Diseno de planos', 'Flexible', 'Cala Cala', 'Cala Cala', 120.00, TRUE),
(10, 'PROFESIONAL', 'Abogacia', 'Asesoria legal civil y penal', 'Oficina', 'Centro', 'Centro', 80.00, TRUE);

-- Credenciales aprobadas para prestadores
INSERT IGNORE INTO credenciales (id_usuario, tipo_documento, documento_url, estado_validacion, observaciones_admin) VALUES 
(3, 'CERTIFICADO_TECNICO', '/uploads/cert_plomero.pdf', 'APROBADO', 'Validado'),
(4, 'CERTIFICADO_TECNICO', '/uploads/cert_elec.pdf', 'APROBADO', 'Validado'),
(5, 'CERTIFICADO_TECNICO', '/uploads/cert_carp.pdf', 'APROBADO', 'Validado'),
(6, 'CERTIFICADO_TECNICO', '/uploads/cert_alba.pdf', 'APROBADO', 'Validado'),
(7, 'CERTIFICADO_TECNICO', '/uploads/cert_gas.pdf', 'APROBADO', 'Validado'),
(8, 'TITULO_PROVISION_NACIONAL', '/uploads/titulo_sistemas.pdf', 'APROBADO', 'Validado'),
(9, 'TITULO_PROVISION_NACIONAL', '/uploads/titulo_arq.pdf', 'APROBADO', 'Validado'),
(10, 'TITULO_PROVISION_NACIONAL', '/uploads/titulo_abog.pdf', 'APROBADO', 'Validado');
