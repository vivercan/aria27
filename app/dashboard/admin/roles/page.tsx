"use client";
import { useEffect, useState } from "react";
import BackButton from "@/components/BackButton";
import { Loader2, Save, ShieldCheck, ShieldAlert, Search } from "lucide-react";

const MODULES = [
  { key: "obras", label: "Obras" },
  { key: "talento", label: "Talento" },
  { key: "requisiciones", label: "Requisiciones" },
  { key: "finanzas", label: "Finanzas" },
  { key: "activos", label: "Activos" },
  { key: "plantillas", label: "Plantillas" },
  { key: "administracion", label: "Administración" },
  { key: "configuracion", label: "Configuración" },
];

const ROLES = ["admin", "Administrador", "rh", "compras", "almacen", "operador", "residente", "direccion", "user"];
const ADMIN_EMAILS = ["juanviverosv@gmail.com"];

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: string | null;
  permissions: Record<string, string[]> | null;
}

export default function RolesAdminPage() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  const authEmail = () => (typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "");

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/roles", { headers: { "x-user-email": authEmail() } });
      if (r.status === 401 || r.status === 403) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      const j = await r.json();
      if (!r.ok) {
        setMsg({ tipo: "err", texto: j.error || "Error" });
        setAuthorized(true);
        setLoading(false);
        return;
      }
      setAuthorized(true);
      setUsers((j.users as UserRow[]) || []);
    } catch (e: unknown) {
      setMsg({ tipo: "err", texto: ((e as Error)?.message) || "Error de red" });
      setAuthorized(true);
    }
    setLoading(false);
  };

  const flash = (tipo: "ok" | "err", texto: string) => {
    setMsg({ tipo, texto });
    setTimeout(() => setMsg(null), 2500);
  };

  const toggleModule = (u: UserRow, moduleKey: string) => {
    const perms = { ...(u.permissions || {}) } as Record<string, string[]>;
    if (perms[moduleKey] && perms[moduleKey].length > 0) delete perms[moduleKey];
    else perms[moduleKey] = ["*"];
    setUsers(users.map(x => (x.id === u.id ? { ...x, permissions: perms } : x)));
  };

  const cambiarRol = (u: UserRow, nuevo: string) => {
    setUsers(users.map(x => (x.id === u.id ? { ...x, role: nuevo } : x)));
  };

  const guardar = async (u: UserRow) => {
    setGuardando(u.id);
    try {
      const r = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-email": authEmail() },
        body: JSON.stringify({ id: u.id, role: u.role, permissions: u.permissions || {} }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) flash("err", j.error || "Error");
      else flash("ok", `Permisos actualizados para ${u.email}`);
    } catch (e: unknown) {
      flash("err", ((e as Error)?.message) || "Error de red");
    }
    setGuardando(null);
  };

  const filtrados = users.filter(u => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      (u.display_name || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  if (authorized === null || loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <ShieldAlert className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-white">Acceso restringido</h2>
        <p className="text-sm text-slate-400">Solo administradores pueden gestionar roles y permisos.</p>
        <BackButton href="/dashboard" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <BackButton href="/dashboard" />
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Roles y Permisos
            </h1>
            <p className="text-xs text-slate-400">{users.length} usuarios · marca los modulos que cada uno puede ver</p>
          </div>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Buscar usuario..."
            className="pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600 w-64"
          />
        </div>
      </div>

      {msg && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${msg.tipo === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
          {msg.texto}
        </div>
      )}

      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
            <tr className="border-b border-white/10">
              <th className="text-left p-3 text-slate-400 font-medium text-xs">Usuario</th>
              <th className="text-left p-3 text-slate-400 font-medium text-xs">Rol</th>
              {MODULES.map(m => (
                <th key={m.key} className="text-center p-2 text-slate-400 font-medium text-[10px]" title={m.label}>
                  {m.label.slice(0, 6)}
                </th>
              ))}
              <th className="text-center p-3 text-slate-400 font-medium text-xs">Acc</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={MODULES.length + 3} className="p-8 text-center text-slate-500 text-sm">Sin usuarios</td></tr>
            ) : filtrados.map(u => {
              const perms = u.permissions || {};
              const isAdminRow = u.role === "admin" || u.role === "Administrador";
              return (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3">
                    <p className="text-white text-sm font-medium">{u.display_name || u.email}</p>
                    <p className="text-slate-500 text-xs">{u.email}</p>
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role || "user"}
                      onChange={e => cambiarRol(u, e.target.value)}
                      className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white text-xs"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  {MODULES.map(m => {
                    const active = isAdminRow || (Array.isArray(perms[m.key]) && perms[m.key].length > 0);
                    return (
                      <td key={m.key} className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={active}
                          disabled={isAdminRow}
                          onChange={() => toggleModule(u, m.key)}
                          className="w-4 h-4 accent-blue-500 disabled:opacity-50"
                          title={isAdminRow ? "Admin tiene acceso total" : m.label}
                        />
                      </td>
                    );
                  })}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => guardar(u)}
                      disabled={guardando === u.id}
                      className="px-3 py-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 text-xs flex items-center gap-1 mx-auto disabled:opacity-50"
                    >
                      {guardando === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Guardar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px] text-slate-500 flex-shrink-0">
        Admin email whitelist: {ADMIN_EMAILS.join(", ")} · Los usuarios con rol "admin" tienen acceso total y no se pueden toquear por modulo.
      </p>
    </div>
  );
}
