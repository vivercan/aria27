"use client";
/** Usuarios en el teléfono (Doménica 27 · 11-Oct-2026): lista, alta, cambiar puesto/teléfono, dar de baja o reactivar. Permisos finos por módulo: modo completo. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Loader2, ChevronRight } from "lucide-react";
import { IcoEquipo } from "@/components/domenica/IconosObra";
import { Hoja, useAviso, campo, etiqueta } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { supabase } from "@/lib/supabase";
import { colorPersona } from "@/lib/actividades";
import { Encabezado, Buscador, Pestanas, Contacto, iniciales, ModoCompleto, Pagina } from "./base";

type U = { id: string; email: string; name?: string | null; display_name?: string | null; role: string; phone?: string | null; active?: boolean | null };
const ROLES = [["residente", "Residente de obra"], ["validador", "Superintendencia"], ["compras", "Compras"], ["rh", "Recursos Humanos"], ["direccion", "Dirección"], ["usuario", "Ejecutivo de administración"], ["almacen", "Almacén"], ["operador", "Operador"], ["admin", "Administrador"]] as const;
const rol = (r: string) => ROLES.find(x => x[0] === r)?.[1] || r;
const nom = (u: U) => u.display_name || u.name || u.email;

async function api(method: string, body: unknown) {
  const r = await fetch("/api/admin/roles", { method, credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error((j as { error?: string }).error || `Error ${r.status}`); return j;
}

export default function UsuariosMovil() {
  const { flash, nodo } = useAviso();
  const [lista, setLista] = useState<U[] | null>(null); const [q, setQ] = useState(""); const [tab, setTab] = useState<"activos" | "baja">("activos");
  const [ver, setVer] = useState<U | null>(null); const [nuevo, setNuevo] = useState(false);
  const cargar = useCallback(async () => { const { data } = await supabase.from("Users").select("id, email, name, display_name, role, phone, active").order("name"); setLista((data || []) as U[]); }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const vis = useMemo(() => { const t = q.trim().toLowerCase(); return (lista || []).filter(u => (tab === "activos" ? u.active !== false : u.active === false) && (!t || `${nom(u)} ${u.email} ${rol(u.role)}`.toLowerCase().includes(t))); }, [lista, q, tab]);
  const n = (a: boolean) => (lista || []).filter(u => (a ? u.active !== false : u.active === false)).length;

  return (
    <Pagina>
      <Encabezado ico={IcoEquipo} color="#c62f5e" titulo="Usuarios" sub={lista ? `${n(true)} con acceso al sistema` : "Cargando…"}
        accion={<button onClick={() => setNuevo(true)} className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-[#0073ea] px-3 py-2.5 text-[14px] font-bold text-white"><Plus className="w-4 h-4" />Nuevo</button>} />
      <Buscador valor={q} cambiar={setQ} texto="Buscar nombre, correo o puesto" />
      <Pestanas valor={tab} cambiar={setTab} opciones={[{ v: "activos", l: "Activos", n: n(true) }, { v: "baja", l: "De baja", n: n(false) }]} />
      <div className="mt-3 dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
        {lista === null ? <div className="p-3"><Esqueleto filas={5} alto={56} /></div> : vis.length === 0 ? <p className="p-6 text-center text-[var(--d-muted)]">Nadie aquí.</p> : vis.map(u => (
          <button key={u.id} onClick={() => setVer(u)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:bg-[var(--d-hover)]">
            <span className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-[15px]" style={{ background: colorPersona(nom(u)) }}>{iniciales(nom(u))}</span>
            <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-[var(--d-text)] truncate">{nom(u)}</span><span className="block text-[12.5px] text-[var(--d-muted)] truncate">{rol(u.role)} · {u.email}</span></span>
            <ChevronRight className="w-4 h-4 text-[var(--d-faint)]" />
          </button>))}
      </div>
      <ModoCompleto texto="Permisos por módulo: modo completo" />
      {ver && <Editar u={ver} onClose={() => setVer(null)} onOk={m => { setVer(null); flash("ok", m); cargar(); }} flash={flash} />}
      {nuevo && <Nuevo onClose={() => setNuevo(false)} onOk={m => { setNuevo(false); flash("ok", m); cargar(); }} flash={flash} />}
      {nodo}
    </Pagina>
  );
}

function Roles({ v, set }: { v: string; set: (r: string) => void }) {
  return <div className="mt-1 flex flex-wrap gap-2">{ROLES.filter(r => r[0] !== "admin").map(([k, l]) => <button key={k} type="button" onClick={() => set(k)} className={`rounded-full px-3 py-2 text-[13px] font-semibold ${v === k ? "bg-[#0073ea] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{l}</button>)}</div>;
}

function Editar({ u, onClose, onOk, flash }: { u: U; onClose: () => void; onOk: (m: string) => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [role, setRole] = useState(u.role); const [phone, setPhone] = useState(u.phone || ""); const [busy, setBusy] = useState(false);
  const guardar = async () => { setBusy(true); try { await api("PATCH", { id: u.id, role, phone: phone.replace(/\D/g, "") }); onOk("Guardado"); } catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); } };
  const activo = async (a: boolean) => { if (!a && !window.confirm(`¿Dar de baja a ${nom(u)}? Ya no podrá entrar.`)) return; setBusy(true); try { await api("PATCH", { id: u.id, active: a }); onOk(a ? `${nom(u)} reactivado` : `${nom(u)} dado de baja`); } catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); } };
  return (
    <Hoja titulo={nom(u)} onClose={onClose} pie={<button onClick={guardar} disabled={busy} className="w-full rounded-2xl bg-[#0073ea] py-3.5 text-[15px] font-bold text-white disabled:opacity-60 inline-flex items-center justify-center gap-2">{busy && <Loader2 className="w-5 h-5 animate-spin" />}Guardar</button>}>
      <div className="flex items-center gap-3"><div className="flex-1 min-w-0 text-[13px] text-[var(--d-muted)] truncate">{u.email}</div><Contacto tel={u.phone} /></div>
      <div className="mt-4"><span className={etiqueta}>Puesto en el sistema</span><Roles v={role} set={setRole} /></div>
      <label className="block mt-4"><span className={etiqueta}>Teléfono (WhatsApp)</span><input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="10 dígitos" className={campo} /></label>
      {u.active === false
        ? <button onClick={() => activo(true)} disabled={busy} className="mt-5 w-full rounded-2xl bg-[#3cde01] py-3 text-[15px] font-bold text-white sobre-verde">Reactivar acceso</button>
        : <button onClick={() => activo(false)} disabled={busy} className="mt-5 w-full rounded-2xl border-2 border-[#d0304a] py-3 text-[15px] font-bold text-[#d0304a]">Dar de baja</button>}
    </Hoja>
  );
}

function Nuevo({ onClose, onOk, flash }: { onClose: () => void; onOk: (m: string) => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [f, setF] = useState({ name: "", email: "", phone: "", role: "residente" }); const [busy, setBusy] = useState(false);
  const crear = async () => {
    const email = f.email.trim().toLowerCase();
    if (!f.name.trim()) { flash("err", "Escribe el nombre"); return; } if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { flash("err", "Correo inválido"); return; }
    setBusy(true); try { const j = await api("POST", { email, display_name: f.name.trim(), role: f.role, phone: f.phone.replace(/\D/g, "") }) as { mode?: string }; onOk(j.mode === "updated" ? "Ese correo ya existía; se actualizó" : `${f.name.trim()} dado de alta`); } catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Hoja titulo="Nuevo usuario" onClose={onClose} pie={<button onClick={crear} disabled={busy} className="w-full rounded-2xl bg-[#0073ea] py-3.5 text-[15px] font-bold text-white disabled:opacity-60 inline-flex items-center justify-center gap-2">{busy && <Loader2 className="w-5 h-5 animate-spin" />}Dar de alta</button>}>
      <label className="block"><span className={etiqueta}>Nombre</span><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className={campo} /></label>
      <label className="block mt-3"><span className={etiqueta}>Correo @gcuavante.com</span><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} inputMode="email" className={campo} /></label>
      <label className="block mt-3"><span className={etiqueta}>Teléfono (WhatsApp)</span><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} inputMode="tel" placeholder="10 dígitos" className={campo} /></label>
      <div className="mt-4"><span className={etiqueta}>Puesto en el sistema</span><Roles v={f.role} set={r => setF({ ...f, role: r })} /></div>
      <p className="mt-3 text-[12.5px] text-[var(--d-muted)]">Entra con la contraseña de su correo de Zoho.</p>
    </Hoja>
  );
}
