-- ============================================================
--  NeoLend Financial — Inicialización de PostgreSQL (local)
--  Crea 5 bases de datos lógicas (Database per Service) y un
--  usuario por servicio. Se ejecuta una sola vez al crear el
--  volumen de Postgres (docker-entrypoint-initdb.d).
--
--  NOTA: scoring-svc usa Redis, no tiene BD en Postgres.
-- ============================================================

-- ---------- Usuarios por servicio (aislamiento) ----------
CREATE USER gateway_origination WITH PASSWORD 'svc_pw';
CREATE USER credit              WITH PASSWORD 'svc_pw';
CREATE USER servicing           WITH PASSWORD 'svc_pw';
CREATE USER investor            WITH PASSWORD 'svc_pw';
CREATE USER compliance          WITH PASSWORD 'svc_pw';

-- ---------- Bases de datos (una por microservicio) ----------
CREATE DATABASE origination_db OWNER gateway_origination;
CREATE DATABASE credit_db      OWNER credit;
CREATE DATABASE servicing_db   OWNER servicing;
CREATE DATABASE investor_db    OWNER investor;
CREATE DATABASE compliance_db  OWNER compliance;

-- ---------- Extensiones útiles en cada BD ----------
\connect origination_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
GRANT ALL ON SCHEMA public TO gateway_origination;

\connect credit_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT ALL ON SCHEMA public TO credit;

\connect servicing_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT ALL ON SCHEMA public TO servicing;

\connect investor_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT ALL ON SCHEMA public TO investor;

\connect compliance_db
CREATE EXTENSION IF NOT EXISTS pgcrypto;
GRANT ALL ON SCHEMA public TO compliance;

-- Las migraciones de cada servicio (carpeta migrations/) crean los
-- esquemas y tablas detallados en DISENO-BASES-DE-DATOS.md.
