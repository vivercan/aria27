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
-- PENDIENTE (decisión de JJ): esta vista concede todo al rol anon e incluye NSS, CURP y CLABE.
