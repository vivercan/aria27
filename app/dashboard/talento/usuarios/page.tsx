"use client";
import UsuariosMovil from "@/components/movil/UsuariosMovil";
import { useEsTel } from "@/lib/es-tel";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Mail, Phone, Edit2, Save, X, Shield, ChevronDown, ChevronUp, Trash2, AlertTriangle, UserPlus, UserX, UserCheck } from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  active: boolean;
  permissions?: Record<string, string[]>;
}

// MODULOS + submódulos — sincronizado 20-Abr-2026 con rutas reales de /dashboard/**
// Regla: si existe carpeta en app/dashboard/{modulo}/{sub}/ debe estar aquí.
const MODULOS = [
  { id: "obras", nombre: "Obras", subs: ["pipeline", "licitaciones", "presupuestos", "estimaciones", "contratos", "expedientes", "inventario", "control", "avance", "bitacora", "fotos", "planos", "catalogo", "concreto", "siroc", "tareas", "reporte"] },
  { id: "talento", nombre: "Talento", subs: ["personal", "checadas", "nomina", "incidencias", "legales", "matriz", "prestaciones", "finiquitos", "documentos", "tareas", "usuarios"] },
  { id: "requisiciones", nombre: "Requisiciones", subs: ["requisiciones", "productos", "proveedores", "cotizaciones", "pagos", "entregas", "compras", "prospeccion"] },
  { id: "finanzas", nombre: "Finanzas", subs: ["gastos-obra", "costeo", "facturacion", "caja", "bancos", "por-pagar", "cobranza", "ingreso-egresos", "panel", "sua"] },
  { id: "activos", nombre: "Activos", subs: ["catalogo", "vehiculos", "asignacion", "mantenimiento", "estado"] },
  { id: "clientes", nombre: "Clientes", subs: ["cotizaciones"] },
  { id: "administracion", nombre: "Administración", subs: ["empresa", "polizas", "siroc", "sua", "documentacion", "opiniones", "carpetas"] },
  { id: "plantillas", nombre: "Plantillas", subs: ["biblioteca", "documentos", "propuestas", "ordenes"] },
  { id: "reportes", nombre: "Reportes", subs: ["cobranza-mensual", "estado-cuenta-proveedor", "nomina-semanal"] },
  { id: "ceo", nombre: "CEO (Dashboard ejecutivo)", subs: [] },
  { id: "inbox", nombre: "Inbox (Correo)", subs: [] },
  { id: "comunicacion", nombre: "Comunicación", subs: [] },
  { id: "carpetas", nombre: "Carpetas (documentos globales)", subs: [] },
  { id: "whatsapp", nombre: "WhatsApp", subs: ["log"] },
  { id: "import", nombre: "Importar CSV", subs: [] },
  { id: "configuracion", nombre: "Configuración", subs: ["maestros", "general", "alertas", "recordatorios", "correo"] },
  { id: "campo", nombre: "Campo (celular)", subs: ["evidencia", "calendario"] },
  { id: "admin", nombre: "Admin (solo sistema)", subs: ["roles", "auditoria", "restore"] },
];

const ROLES = [
  { v: "residente", l: "Residente de obra" },
  { v: "validador", l: "Superintendencia" },
  { v: "compras", l: "Compras" },
  { v: "rh", l: "Recursos Humanos" },
  { v: "direccion", l: "Dirección" },
  { v: "usuario", l: "Usuario (caja/pagos)" },
  { v: "almacen", l: "Almacén" },
  { v: "operador", l: "Operador" },
  { v: "admin", l: "Administrador" },
];

function UsuariosPageWeb() {
  const [users, setUsers] = useState<User[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPermissions, setEditPermissions] = useState<Record<string, string[]>>({});
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const { msg, flash, clear } = useFlashMessage();
  // 10-Oct-2026: alta y baja de usuarios desde aqui (antes no habia pantalla; los creaba soporte por base de datos)
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({ name: "", email: "", role: "residente", phone: "" });
  const [savingNuevo, setSavingNuevo] = useState(false);
  const crearUsuario = async () => {
    const email = nuevo.email.trim().toLowerCase();
    if (!nuevo.name.trim()) { flash("err", "Escribe el nombre"); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { flash("err", "Correo inválido"); return; }
    setSavingNuevo(true);
    try {
      const r = await fetch("/api/admin/roles", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, display_name: nuevo.name.trim(), role: nuevo.role, phone: nuevo.phone.replace(/\D/g, "") }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { flash("err", "No se pudo dar de alta: " + (j.error || r.status)); return; }
      flash("ok", j.mode === "updated" ? "Ese correo ya existía; se actualizaron sus datos" : `Usuario ${email} dado de alta`);
      setNuevo({ name: "", email: "", role: "residente", phone: "" }); setShowNuevo(false); loadUsers();
    } catch (e: unknown) { flash("err", "Error de red: " + ((e as { message?: string })?.message || "")); }
    finally { setSavingNuevo(false); }
  };
  const cambiarActivo = async (u: User, active: boolean) => {
    try {
      const r = await fetch("/api/admin/roles", { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, active }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { flash("err", (active ? "No se pudo reactivar: " : "No se pudo dar de baja: ") + (j.error || r.status)); return; }
      flash("ok", active ? `${u.name || u.email} reactivado` : `${u.name || u.email} dado de baja (ya no puede entrar)`);
      loadUsers();
    } catch (e: unknown) { flash("err", "Error de red: " + ((e as { message?: string })?.message || "")); }
  };

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase.from("Users").select("*").order("name");
    if (error) console.error("Error Users:", error);
    if (data) setUsers(data);
    setLoading(false);
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditRole(user.role);
    setEditEmail(user.email);
    setEditPhone(user.phone || "");
    setEditPermissions(user.permissions || {});
    setExpandedModules([]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditRole("");
    setEditEmail("");
    setEditPhone("");
    setEditPermissions({});
    setExpandedModules([]);
  };

  const saveUser = async (id: string) => {
    // Hardening: role/permissions/email/phone se escriben server-side via /api/admin/roles
    // (whitelist + verificacion de rol admin en BD, service role key).
    try {
      const r = await fetch("/api/admin/roles", {
        credentials: "include", method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          role: editRole,
          permissions: editPermissions,
          email: editEmail,
          phone: editPhone,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        flash("err", "No se pudo guardar el usuario: " + (j.error || "error desconocido"));
        return;
      }
    } catch (e: unknown) {
      flash("err", "Error de red: " + ((e as {message?: string})?.message || "desconocido"));
      return;
    }
    setEditingId(null);
    loadUsers();
  };

  const openDeleteModal = (user: User) => {
    setDeletingUser(user);
    setDeleteConfirmText("");
  };

  const closeDeleteModal = () => {
    setDeletingUser(null);
    setDeleteConfirmText("");
  };

  const confirmDelete = async () => {
    if (deleteConfirmText !== "Eliminar" || !deletingUser) return;
    await backupAndDelete({ table: "Users", id: deletingUser.id, userEmail });
    // await supabase.from("Users").delete().eq("id", deletingUser.id);
    closeDeleteModal();
    loadUsers();
  };

  const toggleModule = (modId: string) => {
    setExpandedModules(prev =>
      prev.includes(modId) ? prev.filter(m => m !== modId) : [...prev, modId]
    );
  };

  const toggleModulePermission = (modId: string) => {
    const mod = MODULOS.find(m => m.id === modId);
    if (!mod) return;
    const currentSubs = editPermissions[modId] || [];
    if (currentSubs.length === mod.subs.length) {
      const newPerms = { ...editPermissions };
      delete newPerms[modId];
      setEditPermissions(newPerms);
    } else {
      setEditPermissions({ ...editPermissions, [modId]: [...mod.subs] });
    }
  };

  const toggleSubPermission = (modId: string, subId: string) => {
    const currentSubs = editPermissions[modId] || [];
    if (currentSubs.includes(subId)) {
      const newSubs = currentSubs.filter(s => s !== subId);
      if (newSubs.length === 0) {
        const newPerms = { ...editPermissions };
        delete newPerms[modId];
        setEditPermissions(newPerms);
      } else {
        setEditPermissions({ ...editPermissions, [modId]: newSubs });
      }
    } else {
      setEditPermissions({ ...editPermissions, [modId]: [...currentSubs, subId] });
    }
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case "admin": return "bg-aria-primary-light text-aria-accent";
      case "validador": return "bg-aria-primary-light text-aria-accent";
      case "compras": return "bg-emerald-500/20 text-aria-accent";
      case "operador": return "bg-orange-500/20 text-orange-400";
      default: return "bg-slate-500/20 text-[#7f93b0]";
    }
  };

  const countPermissions = (perms?: Record<string, string[]>) => {
    if (!perms) return 0;
    return Object.values(perms).reduce((acc, subs) => acc + subs.length, 0);
  };

  return (
    <div className="aria-page-canon">
      {/* Modal de confirmación de borrado */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50">
          <div className="bg-[#0c1d38] rounded-xl p-6 max-w-md w-full mx-4 border border-white/[0.08]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-full bg-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Eliminar Usuario</h3>
                <p className="text-sm text-[#7f93b0]">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="bg-[#0a1628]/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-[#c9d8ed] mb-1">Usuario a eliminar:</p>
              <p className="text-white font-medium">{deletingUser.name}</p>
              <p className="text-[#7f93b0] text-sm">{deletingUser.email}</p>
            </div>
            <p className="text-sm text-[#c9d8ed] mb-3">
              Para confirmar, escribe <span className="text-red-400 font-mono font-bold">Eliminar</span>:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Eliminar"
              className="w-full px-4 py-2 bg-[#0a1628] border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={closeDeleteModal} className="flex-1 px-4 py-2 rounded-lg bg-[#0f2448] text-white hover:bg-[#162040] transition-colors">
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== "Eliminar"}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${deleteConfirmText === "Eliminar" ? "bg-red-500 text-white hover:bg-red-600" : "bg-[#0f2448] text-[#4a6080] cursor-not-allowed"}`}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <AriaBackButton href="/dashboard/talento" />
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-aria-accent" />
            Usuarios del Sistema
          </h1>
          <p className="text-[#7f93b0] mt-1">{users.length} usuarios registrados</p>
        </div>
        <button onClick={() => setShowNuevo(v => !v)} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-aria-primary text-white text-sm hover:bg-aria-primary-hover">
          <UserPlus className="w-4 h-4" /> {showNuevo ? "Cancelar" : "Nuevo usuario"}
        </button>
      </div>

      {showNuevo && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="md:col-span-1"><label className="text-xs text-[#7f93b0] mb-1 block">Nombre *</label><input value={nuevo.name} onChange={e => setNuevo({ ...nuevo, name: e.target.value })} placeholder="Nombre y apellido" className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm" /></div>
          <div className="md:col-span-1"><label className="text-xs text-[#7f93b0] mb-1 block">Correo (Zoho) *</label><input type="email" value={nuevo.email} onChange={e => setNuevo({ ...nuevo, email: e.target.value })} placeholder="nombre@gcuavante.com" className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm" /></div>
          <div><label className="text-xs text-[#7f93b0] mb-1 block">Rol</label><select value={nuevo.role} onChange={e => setNuevo({ ...nuevo, role: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm">{ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}</select></div>
          <div><label className="text-xs text-[#7f93b0] mb-1 block">Celular (WhatsApp)</label><input type="tel" inputMode="numeric" value={nuevo.phone} onChange={e => setNuevo({ ...nuevo, phone: e.target.value })} placeholder="10 dígitos" className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm" /></div>
          <button onClick={crearUsuario} disabled={savingNuevo} className="px-4 py-2 rounded-lg bg-aria-accent/90 hover:bg-aria-accent text-slate-900 text-sm font-semibold disabled:opacity-60">{savingNuevo ? "Guardando…" : "Dar de alta"}</button>
          <p className="md:col-span-5 text-xs text-[#7f93b0]">Recibe los mismos accesos que otro usuario de su rol (los ajustas con Editar). Para entrar necesita su buzón Zoho activo.</p>
        </div>
      )}

      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-aria-bg z-10 border-b border-white/[0.08]">
                <tr className="bg-white/[0.02]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7f93b0] uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7f93b0] uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[#7f93b0] uppercase">Teléfono</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#7f93b0] uppercase">Rol</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#7f93b0] uppercase">Permisos</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#7f93b0] uppercase">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-[#7f93b0] uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u) => (
                  <>
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-[#c9d8ed] text-sm">
                        {editingId === u.id ? (
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="bg-[#0f2448] text-white text-sm rounded px-2 py-1 w-full max-w-[200px]"
                          />
                        ) : (
                          <><Mail className="w-4 h-4 text-[#4a6080] inline mr-2" />{u.email}</>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#c9d8ed] text-sm">
                        {editingId === u.id ? (
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="bg-[#0f2448] text-white text-sm rounded px-2 py-1 w-full max-w-[140px]"
                            placeholder="10 dígitos"
                          />
                        ) : (
                          <><Phone className="w-4 h-4 text-[#4a6080] inline mr-2" />{u.phone || "-"}</>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === u.id ? (
                          <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="bg-[#0f2448] text-white text-xs rounded px-2 py-1">
                            {ROLES.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
                          </select>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(u.role)}`}>{u.role}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 rounded bg-slate-500/20 text-[#7f93b0] text-xs">
                          <Shield className="w-3 h-3 inline mr-1" />{countPermissions(u.permissions)} accesos
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${u.active ? "bg-emerald-500/20 text-aria-accent" : "bg-red-500/20 text-red-400"}`}>
                          {u.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === u.id ? (
                          <div className="flex justify-center gap-2">
                            <button onClick={() => saveUser(u.id)} className="p-1.5 rounded bg-emerald-500/20 text-aria-accent hover:bg-aria-primary/30" title="Guardar">
                              <Save className="w-4 h-4" />
                            </button>
                            <button onClick={cancelEdit} className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30" title="Cancelar">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-2">
                            <button onClick={() => startEdit(u)} className="p-1.5 rounded hover:bg-white/[0.06] text-[#7f93b0] hover:text-white" title="Editar">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {u.active ? (
                              <button onClick={() => cambiarActivo(u, false)} className="p-1.5 rounded hover:bg-amber-500/20 text-[#7f93b0] hover:text-amber-300" title="Dar de baja"><UserX className="w-4 h-4" /></button>
                            ) : (
                              <button onClick={() => cambiarActivo(u, true)} className="p-1.5 rounded hover:bg-emerald-500/20 text-[#7f93b0] hover:text-emerald-300" title="Reactivar"><UserCheck className="w-4 h-4" /></button>
                            )}
                            {canDelete && (<button onClick={() => openDeleteModal(u)} className="p-1.5 rounded hover:bg-red-500/20 text-[#7f93b0] hover:text-red-400" title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>)}
                          </div>
                        )}
                      </td>
                    </tr>
                    {editingId === u.id && (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 bg-[#0a1628]/50">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-white">
                              <Shield className="w-4 h-4 text-aria-accent" />
                              Permisos por Módulo
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {MODULOS.map(mod => {
                                const currentSubs = editPermissions[mod.id] || [];
                                const allSelected = currentSubs.length === mod.subs.length;
                                const someSelected = currentSubs.length > 0 && !allSelected;
                                const isExpanded = expandedModules.includes(mod.id);
                                return (
                                  <div key={mod.id} className="rounded-lg bg-white/[0.03] border border-white/[0.08] overflow-hidden">
                                    <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-white/[0.05]" onClick={() => toggleModule(mod.id)}>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected; }} onChange={() => toggleModulePermission(mod.id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 rounded border-white/[0.07] bg-[#0f2448] text-purple-500 focus:ring-purple-500" />
                                        <span className="text-sm text-white font-medium">{mod.nombre}</span>
                                      </label>
                                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#7f93b0]" /> : <ChevronDown className="w-4 h-4 text-[#7f93b0]" />}
                                    </div>
                                    {isExpanded && (
                                      <div className="px-2 pb-2 space-y-1 border-t border-white/[0.06] pt-2">
                                        {mod.subs.map(sub => (
                                          <label key={sub} className="flex items-center gap-2 cursor-pointer hover:bg-white/[0.03] p-1 rounded">
                                            <input type="checkbox" checked={currentSubs.includes(sub)} onChange={() => toggleSubPermission(mod.id, sub)} className="w-3 h-3 rounded border-white/[0.07] bg-[#0f2448] text-purple-500 focus:ring-purple-500" />
                                            <span className="text-xs text-[#c9d8ed] capitalize">{sub.replace("-", " ")}</span>
                                          </label>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


/** 11-Oct-2026: en teléfono se ve la versión Doménica; "?web=1" muestra la completa */
export default function UsuariosPage() { const tel = useEsTel(); return tel ? <UsuariosMovil /> : <div className="contents vista-web"><UsuariosPageWeb /></div>; }
