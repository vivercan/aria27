-- 10 al 12-Oct-2026 · Doménica 27 · cambios ya APLICADOS en producción (yhylkvpynzyorqortbkk).
-- Este archivo es el respaldo en el repositorio. Es idempotente: se puede volver a correr sin daño.

-- Perfiles de prueba de JJ (entrar como cada rol; avisos redirigidos a JJ)
alter table users add column if not exists usuario_prueba text;
alter table users add column if not exists prueba_hash text;
alter table users add column if not exists prueba_avisos_email text;
alter table users add column if not exists prueba_avisos_tel text;

-- Actividades: visto bueno del dueño (se aprueba sola a los 3 días)
alter table tareas_asignadas add column if not exists por_aprobar boolean;
alter table tareas_asignadas add column if not exists aprobada_por text;
alter table tareas_asignadas add column if not exists aprobada_at timestamptz;

-- Un solo folio consecutivo para requisiciones, pagos de servicio y tareas (secuencia 'requisitions')
alter table tareas_asignadas add column if not exists folio text;
create unique index if not exists tareas_asignadas_folio_uq on tareas_asignadas(folio) where folio is not null;
-- Las 18 tareas existentes recibieron TAR-2026-00785 … TAR-2026-00802 el 12-Oct-2026:
-- do $$ declare r record; n int; begin for r in select id, created_at from tareas_asignadas where folio is null order by created_at loop
--   n := increment_sequence('requisitions'); update tareas_asignadas set folio = 'TAR-' || extract(year from r.created_at)::int || '-' || lpad(n::text,5,'0') where id = r.id; end loop; end $$;

-- Obras: eliminar con historial = mandar a "Eliminadas" (recuperable)
alter table centros_trabajo add column if not exists eliminada_at timestamptz;
alter table centros_trabajo add column if not exists eliminada_por text;

-- Vista Personal: agrega usuario_email (la pantalla Personal del teléfono la pedía y fallaba con 400)
create or replace view "Personal" as
select id, employee_number, full_name, "position", project_site, department, salary_monthly, email, status, expediente_status, whatsapp,
       salario_diario, tipo_nomina, hora_entrada, hora_salida, dias_laborales, centro_trabajo_id, banco, clabe, numero_cuenta, fecha_ingreso,
       fecha_baja, nss, curp, rfc, empresa_id, motivo_baja, salario_semanal, minimo_tarjeta, usuario_email
from employees;
-- (Cerrado el mismo día: ver el bloque de abajo.)

-- 12-Oct-2026 (tarde) · Datos sensibles del personal cerrados a la llave pública (decisión de JJ).
-- La llave pública (anon/authenticated) solo ve datos de directorio; NSS, CURP, RFC, cuentas y salarios
-- se leen y escriben únicamente por /api/personal (sesión + permiso de Talento).
revoke all on table employees from anon, authenticated;
grant select (id, employee_number, full_name, "position", project_site, department, email, status, expediente_status, whatsapp, tipo_nomina,
  hora_entrada, hora_salida, dias_laborales, centro_trabajo_id, fecha_ingreso, fecha_baja, empresa_id, geocerca_libre, last_seen,
  status_message, whatsapp_phone, usuario_email, tipo_contrato) on table employees to anon, authenticated;
revoke all on table "Personal" from anon, authenticated;
grant select (id, employee_number, full_name, "position", project_site, department, email, status, expediente_status, whatsapp, tipo_nomina,
  hora_entrada, hora_salida, dias_laborales, centro_trabajo_id, fecha_ingreso, fecha_baja, empresa_id, usuario_email) on table "Personal" to anon, authenticated;
-- REQ-2026-00587 cancelada por indicación de JJ (estaba Pendiente y en $0.00):
-- update requisitions set status='CANCELADA' where folio='REQ-2026-00587';

-- 14-Oct-2026 · reintentos de aviso por WhatsApp de actividades
alter table tareas_asignadas add column if not exists wa_reintentos int not null default 0;

-- 14-Oct-2026 · ¿Ya llegó? (seguimiento de solicitudes viejas)
alter table requisitions add column if not exists seg_preguntado_at timestamptz, add column if not exists seg_preguntas int not null default 0, add column if not exists seg_respuesta text, add column if not exists seg_respuesta_at timestamptz;

-- 16-Oct-2026 · firmas digitales en el PDF de requisición
create table if not exists firmas_usuarios (email text primary key, nombre text not null, png_base64 text not null, activa boolean not null default true, updated_at timestamptz not null default now());
alter table firmas_usuarios enable row level security; revoke all on firmas_usuarios from anon, authenticated;

-- 20-Oct-2026 · Bóveda e.firma (FIEL): archivos en bytea con RLS, contraseña cifrada (pgp_sym), bitácora de accesos
create table if not exists fiel_registros (id uuid primary key default gen_random_uuid(), tipo text not null check (tipo in ('EMPRESA','REPRESENTANTE')), nombre text not null, rfc text not null, empresa text, representante text, vigencia_desde date, vigencia_hasta date, serie text, correo_sat text, password_enc bytea, notas text, activo boolean not null default true, created_by text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists fiel_archivos (id uuid primary key default gen_random_uuid(), fiel_id uuid not null references fiel_registros(id) on delete cascade, nombre text not null, tipo text not null, tamano int not null, contenido bytea not null, created_at timestamptz not null default now());
create table if not exists fiel_accesos_log (id uuid primary key default gen_random_uuid(), fiel_id uuid, user_email text not null, accion text not null, archivo text, ip text, user_agent text, created_at timestamptz not null default now());
alter table fiel_registros enable row level security; alter table fiel_archivos enable row level security; alter table fiel_accesos_log enable row level security;
revoke all on fiel_registros, fiel_archivos, fiel_accesos_log from anon, authenticated;
-- funciones fiel_set_password(uuid,text,text) y fiel_get_password(uuid,text): pgp_sym_encrypt/decrypt, security definer, sin acceso para anon/authenticated

-- 29-Oct-2026 · renombrar obra en todas las tablas donde está copiado el nombre
-- function renombrar_obra(p_id uuid, p_nuevo text) returns jsonb (security definer; sin acceso anon/authenticated). Actualiza centros_trabajo.nombre y toda columna cost_center_name/obra/obra_nombre en public; registra OBRA_RENOMBRADA en event_log.
