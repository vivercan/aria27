"use client";
import { useEffect, useState } from "react";
import AriaBackButton from "@/components/AriaBackButton";
import CanonPageHeader from "@/components/ui/CanonPageHeader";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { Loader2, Save, ShieldCheck, ShieldAlert, Search, Crown, User as UserIcon } from "lucide-react";

// MODULES - sincronizado 20-Abr-2026 con rutas reales /dashboard/**
const MODULES: { key: string; label: string; short: string }[] = [
  { key: "obras", label: "Obras", short: "Obras" },
  { key: "talento", label: "Talento", short: "Talento" },
  { key: "requisiciones", label: "Requisiciones", short: "Requis." },
  { key: "finanzas", label: "Finanzas", short: "Finanzas" },
  { key: "activos", label: "Activos", short: "Activos" },
  { key: "clientes", label: "Clientes", short: "Clientes" },
  { key: "administracion", label: "Administración", short: "Admin." },
  { key: "plantillas", label: "Plantillas", short: "Plantillas" },
  { key: "reportes", label: "Reportes", short: "Reportes" },
  { key: "ceo", label: "CEO (Dashboard ejecutivo)", short: "CEO" },
  { key: "inbox", label: "Inbox (Correo)", short: "Inbox" },
  { key: "comunicacion", label: "Comunicación", short: "Comunic." },
  { key: "carpetas", label: "Carpetas (docs globales)", short: "Carpetas" },
  { key: "whatsapp", label: "WhatsApp", short: "WhatsApp" },
  { key: "import", label: "Importar CSV", short: "Importar" },
  { key: "configuracion", label: "Configuración", short: "Config." },
  { key: "admin", label: "Admin (solo sistema)", short: "Admin sys" },
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
  const { msg, flash } = useFlashMessage(2500);

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
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        flash("err", j.error || "Error");
        setAuthorized(true);
        setLoading(false);
        return;
      }
      setAuthorized(true);
      setUsers((j.users as UserRow[]) || []);
    } catch (e: unknown) {
      flash("err", (e as { message?: string })?.message || "Error de red");
      setAuthorized(true);
    }
    setLoading(false);
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
      flash("err", (e as { message?: string })?.message || "Error de red");
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
      <div className="aria-bg-canon h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-aria-accent" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3">
        <ShieldAlert className="w-12 h-12 text-red-400" />
        <h2 className="text-xl font-bold text-white">Acceso restringido</h2>
        <p className="text-sm text-[#7f93b0]">Solo administradores pueden gestionar roles y permisos.</p>
        <AriaBackButton href="/dashboard" />
      </div>
    );
  }

  const initials = (u: UserRow) => {
    const base = (u.display_name || u.email || "?").trim();
    const parts = base.split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return base.slice(0, 2).toUpperCase();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="mb-4 flex-shrink-0">
        <CanonPageHeader
          title="Roles y Permisos"
          subtitle={`${users.length} usuarios · marca los módulos que cada uno puede ver`}
          backHref="/dashboard"
          icon={<ShieldCheck className="w-6 h-6" />}
          right={
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Buscar usuario..."
                className="pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600 w-64"
              />
            </div>
          }
        />
      </div>

      <FlashBanner msg={msg} className="mb-3 flex-shrink-0" />

      <div className="flex-1 overflow-y-auto pr-1">
        {filtrados.length === 0 ? (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-12 text-center text-[#4a6080] text-sm">
            Sin usuarios
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filtrados.map(u => {
              const perms = u.permissions || {};
              const isAdminRow = u.role === "admin" || u.role === "Administrador";
              const activeCount = isAdminRow
                ? MODULES.length
                : MODULES.filter(m => Array.isArray(perms[m.key]) && perms[m.key].length > 0).length;
              return (
                <div
                  key={u.id}
                  className="rounded-2xl bg-[#0c1d38]/55 border border-white/[0.08] p-5 transition hover:border-white/[0.14]"
                >
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold ${
                        isAdminRow
                          ? "bg-gradient-to-br from-amber-400/30 to-amber-600/20 text-amber-200 border border-amber-400/40"
                          : "bg-aria-primary-light text-aria-accent border border-aria-accent/20"
                      }`}
                    >
                      {isAdminRow ? <Crown className="w-5 h-5" /> : initials(u)}
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-white text-sm font-semibold leading-tight">{u.display_name || u.email}</p>
                      <p className="text-[#7f93b0] text-[11px]">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide text-[#7f93b0]">Rol</span>
                      <select
                        value={u.role || "user"}
                        onChange={e => cambiarRol(u, e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs focus:border-aria-primary outline-none"
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-[#c9d8ed]">
                        {activeCount}/{MODULES.length} módulos
                      </span>
                      <button
                        onClick={() => guardar(u)}
                        disabled={guardando === u.id}
                        className="px-3 py-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30 text-xs flex items-center gap-1 disabled:opacity-50 border border-aria-accent/20"
                      >
                        {guardando === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Guardar
                      </button>
                    </div>
                  </div>

                  {isAdminRow ? (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-400/20 p-3 text-amber-200 text-xs flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      Acceso total - los administradores no se toggean por módulo.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                      {MODULES.map(m => {
                        const active = Array.isArray(perms[m.key]) && perms[m.key].length > 0;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => toggleModule(u, m.key)}
                            title={m.label}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition ${
                              active
                                ? "bg-aria-primary-light border-aria-accent/40 text-white"
                                : "bg-white/[0.02] border-white/[0.06] text-[#7f93b0] hover:bg-white/[0.05]"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                active ? "bg-aria-accent" : "bg-[#3a4a66]"
                              }`}
                            />
                            <span className="text-[11px] font-medium truncate">{m.short}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-[#4a6080] flex-shrink-0">
        <UserIcon className="w-3 h-3 inline mr-1" />
        Admin email whitelist: {ADMIN_EMAILS.join(", ")} · Los usuarios con rol "admin" tienen acceso total y no se toggean por módulo.
      </p>
    </div>
  );
}
