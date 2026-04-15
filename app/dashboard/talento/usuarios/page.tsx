"use client";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Mail, Phone, Edit2, Save, X, Shield, ChevronDown, ChevronUp, Trash2, AlertTriangle } from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";
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

const MODULOS = [
  { id: "obras", nombre: "Obras", subs: ["pipeline", "licitaciones", "presupuestos", "expedientes", "contratos", "siroc"] },
  { id: "talento", nombre: "Talento", subs: ["personal", "checadas", "nomina", "incidencias", "legales", "matriz", "prestaciones"] },
  { id: "requisiciones", nombre: "Requisiciones", subs: ["productos", "proveedores", "nueva", "estatus", "tramite", "autorizar", "ordenes", "compras"] },
  { id: "finanzas", nombre: "Finanzas", subs: ["gastos-obra", "costeo", "facturacion", "caja", "bancos", "por-pagar", "cobranza"] },
  { id: "activos", nombre: "Activos", subs: ["catalogo", "asignacion", "mantenimiento", "estado"] },
  { id: "plantillas", nombre: "Plantillas", subs: ["biblioteca", "documentos", "propuestas", "ordenes"] },
  { id: "configuracion", nombre: "Configuración", subs: ["maestros", "accesos", "alertas", "correo", "integraciones"] },
];

export default function UsuariosPage() {
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

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("Users").select("*").order("name");
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
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": userEmail || (typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : ""),
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
    if (deleteConfirmText !== "delete" || !deletingUser) return;
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
      case "admin": return "bg-purple-500/20 text-purple-400";
      case "validador": return "bg-aria-primary-light text-aria-accent";
      case "compras": return "bg-emerald-500/20 text-emerald-400";
      case "operador": return "bg-orange-500/20 text-orange-400";
      default: return "bg-slate-500/20 text-[#7f93b0]";
    }
  };

  const countPermissions = (perms?: Record<string, string[]>) => {
    if (!perms) return 0;
    return Object.values(perms).reduce((acc, subs) => acc + subs.length, 0);
  };

  return (
    <div className="space-y-6">
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
              Para confirmar, escribe <span className="text-red-400 font-mono font-bold">delete</span> en minúsculas:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Escribe delete para confirmar"
              className="w-full px-4 py-2 bg-[#0a1628] border border-white/[0.08] rounded-lg text-white placeholder-[#4a6080] focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={closeDeleteModal} className="flex-1 px-4 py-2 rounded-lg bg-[#0f2448] text-white hover:bg-[#162040] transition-colors">
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== "delete"}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${deleteConfirmText === "delete" ? "bg-red-500 text-white hover:bg-red-600" : "bg-[#0f2448] text-[#4a6080] cursor-not-allowed"}`}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <AriaBackButton href="/dashboard/talento" />
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="w-7 h-7 text-purple-400" />
            Usuarios del Sistema
          </h1>
          <p className="text-[#7f93b0] mt-1">{users.length} usuarios registrados</p>
        </div>
      </div>

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
                            <option value="admin">admin</option>
                            <option value="validador">validador</option>
                            <option value="compras">compras</option>
                            <option value="operador">operador</option>
                            <option value="viewer">viewer</option>
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
                        <span className={`px-2 py-1 rounded text-xs ${u.active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                          {u.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {editingId === u.id ? (
                          <div className="flex justify-center gap-2">
                            <button onClick={() => saveUser(u.id)} className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" title="Guardar">
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
                              <Shield className="w-4 h-4 text-purple-400" />
                              Permisos por Módulo
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
