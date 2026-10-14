/**
 * GET /api/domenica/uso — ¿Quién está usando Doménica? (14-Oct-2026 · JJ)
 * Por persona: último ingreso, días sin entrar, lo que tiene atorado (actividades atrasadas, solicitudes que le tocan,
 * solicitudes viejas sin cerrar, visto bueno pendiente) y si le llegan / lee los WhatsApp.
 * Solo admin, RH y Dirección. Los perfiles de prueba no aparecen.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-api";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { esCorreoPrueba } from "@/lib/modo-prueba";
import { columnaDe, diasAtraso, type Actividad } from "@/lib/actividades";
import { meToca } from "@/lib/requi-stepper";
import { ABIERTAS, COLS_SEG, esViejaSinCerrar, type RequiSeg } from "@/lib/requi-seguimiento";
import { diasDesde, ordenarUso, type FilaUso } from "@/lib/uso";

export const dynamic = "force-dynamic";
const PUEDEN = ["admin", "administrador", "rh", "direccion"];
const ult10 = (s?: string | null) => String(s || "").replace(/\D/g, "").slice(-10);

export async function GET(req: NextRequest) {
  const auth = await requireUser(req); if (!auth.ok) return auth.res;
  if (!PUEDEN.includes(String(auth.role || "").toLowerCase())) return NextResponse.json({ error: "Solo administración, RH y Dirección" }, { status: 403 });
  const db = getSupabaseAdmin();
  const hace30 = new Date(Date.now() - 30 * 864e5).toISOString();
  const [us, ses, emps, tas, rqs, wa] = await Promise.all([
    db.from("users").select("email, name, display_name, role, phone, active"),
    db.from("auth_sessions").select("user_email, last_seen_at, created_at").order("created_at", { ascending: false }).limit(10000),
    db.from("employees").select("id, full_name, usuario_email, email, whatsapp, status"),
    db.from("tareas_asignadas").select("id, titulo, asignado_id, asignado_email, asignado_por_email, asignado_por, estatus, fecha_compromiso, fecha_inicio, avance, motivo_bloqueo, por_aprobar").neq("estatus", "CANCELADA").limit(5000),
    db.from("requisitions").select(`${COLS_SEG}, responsable_email`).in("status", [...ABIERTAS, "PENDIENTE_RESPONSABLE"]).limit(5000),
    db.from("wa_log").select("phone, estado_entrega, estado_at, created_at").gte("created_at", hace30).order("created_at", { ascending: false }).limit(5000),
  ]);
  const err = [us, ses, emps, tas, rqs, wa].find(x => x.error)?.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  // último ingreso por correo
  const ultimo = new Map<string, string>();
  for (const s of (ses.data || []) as { user_email: string | null; last_seen_at: string | null; created_at: string }[]) {
    const k = String(s.user_email || "").toLowerCase(); const t = s.last_seen_at || s.created_at; if (!k || !t) continue;
    if (!ultimo.has(k) || t > ultimo.get(k)!) ultimo.set(k, t);
  }
  // último WhatsApp por teléfono (el más reciente con estado)
  const ultWa = new Map<string, { estado: string | null; at: string | null }>();
  for (const w of (wa.data || []) as { phone: string; estado_entrega: string | null; estado_at: string | null; created_at: string }[]) {
    const k = ult10(w.phone); if (k.length !== 10 || /PRUEBA/.test(w.phone)) continue;
    if (!ultWa.has(k)) ultWa.set(k, { estado: w.estado_entrega, at: w.estado_at || w.created_at });
  }
  const empleados = ((emps.data || []) as { id: string; full_name: string; usuario_email: string | null; email: string | null; whatsapp: string | null; status: string | null }[]).filter(e => e.status !== "BAJA");
  const empPorCorreo = new Map<string, (typeof empleados)[number]>();
  for (const e of empleados) { if (e.usuario_email) empPorCorreo.set(e.usuario_email.toLowerCase(), e); }
  const acts = (tas.data || []) as (Actividad & { por_aprobar?: boolean | null; asignado_por_email?: string | null })[];
  const reqs = (rqs.data || []) as (RequiSeg & { responsable_email?: string | null })[];
  const hoy = new Date();

  const fila = (email: string | null, nombre: string, rol: string, tel: string | null, empId: string | null, soloWhatsApp: boolean): FilaUso => {
    const em = (email || "").toLowerCase();
    const mias = acts.filter(a => columnaDe(a) !== "TERMINADA" && ((empId && a.asignado_id === empId) || (em && (a.asignado_email || "").toLowerCase() === em)));
    return {
      email, nombre, rol, telefono: tel,
      ultimoIngreso: em ? ultimo.get(em) || null : null, diasSinEntrar: em ? diasDesde(ultimo.get(em), hoy) : null,
      actividadesAbiertas: mias.length, actividadesAtrasadas: mias.filter(a => diasAtraso(a, hoy) > 0).length,
      // admin puede mover todo: contarle "le tocan" todas sería ruido; solo cuenta para los demás roles
      leTocanSolicitudes: em && rol !== "admin" && rol !== "administrador" ? reqs.filter(r => meToca(r, rol, em)).length : 0,
      solicitudesViejas: em ? reqs.filter(r => (r.user_email || "").toLowerCase() === em && esViejaSinCerrar(r, hoy)).length : 0,
      porRevisar: em ? acts.filter(a => a.por_aprobar && String(a.asignado_por_email || a.asignado_por || "").toLowerCase() === em).length : 0,
      ultimoWhatsApp: tel ? ultWa.get(ult10(tel)) || null : null, soloWhatsApp,
    };
  };
  const filas: FilaUso[] = [];
  const vistos = new Set<string>();
  for (const u of (us.data || []) as { email: string; name: string | null; display_name: string | null; role: string | null; phone: string | null; active: boolean | null }[]) {
    const em = u.email.toLowerCase(); if (u.active === false || esCorreoPrueba(em)) continue;
    const e = empPorCorreo.get(em); if (e) vistos.add(e.id);
    filas.push(fila(em, e?.full_name || u.display_name || u.name || em, String(u.role || "").toLowerCase(), e?.whatsapp || u.phone || null, e?.id || null, false));
  }
  // gente de obra sin cuenta que sí tiene actividades: solo recibe WhatsApp
  for (const e of empleados) {
    if (vistos.has(e.id)) continue;
    if (!acts.some(a => a.asignado_id === e.id && columnaDe(a) !== "TERMINADA")) continue;
    filas.push(fila(null, e.full_name, "sin cuenta", e.whatsapp, e.id, true));
  }
  return NextResponse.json({ ok: true, generado: hoy.toISOString(), filas: ordenarUso(filas) });
}
