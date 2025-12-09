"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Plus, Trash2, Save, X, Shield } from "lucide-react";

type User = {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: any;
  active: boolean;
};

const ROLES = [
  { value: "admin", label: "Administrador", color: "bg-purple-500" },
  { value: "compras", label: "Compras", color: "bg-blue-500" },
  { value: "operacion", label: "Operación", color: "bg-amber-500" },
  { value: "user", label: "Usuario", color: "bg-slate-500" },
];

const MODULES = [
  { id: "talent-hub", name: "Talent Hub", submodules: ["people", "users"] },
  { id: "supply-desk", name: "Supply Desk", submodules: ["requisitions", "inventory"] },
  { id: "build-desk", name: "Build Desk", submodules: ["projects", "progress"] },
  { id: "finance", name: "Finance", submodules: ["invoices", "payments"] },
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "user", permissions: {} as any });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("users").select("*").order("name");
    setUsers((data || []) as User[]);
    setLoading(false);
  };

  const openNew = () => {
    setEditingUser(null);
    setForm({ email: "", name: "", role: "user", permissions: {} });
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ email: user.email, name: user.name, role: user.role, permissions: user.permissions || {} });
    setShowModal(true);
  };

  const togglePermission = (moduleId: string, submodule?: string) => {
    setForm(prev => {
      const perms = { ...prev.permissions };
      if (submodule) {
        if (!perms[moduleId]) perms[moduleId] = [];
        if (perms[moduleId].includes(submodule)) {
          perms[moduleId] = perms[moduleId].filter((s: string) => s !== submodule);
        } else {
          perms[moduleId] = [...perms[moduleId], submodule];
        }
      } else {
        if (perms[moduleId]) {
          delete perms[moduleId];
        } else {
          perms[moduleId] = MODULES.find(m => m.id === moduleId)?.submodules || [];
        }
      }
      return { ...prev, permissions: perms };
    });
  };

  const handleSave = async () => {
    if (!form.email || !form.name) return;
    
    if (editingUser) {
      await supabase.from("users").update({
        name: form.name,
        role: form.role,
        permissions: form.permissions
      }).eq("id", editingUser.id);
    } else {
      await supabase.from("users").insert({
        email: form.email,
        name: form.name,
        role: form.role,
        permissions: form.permissions
      });
    }
    
    setShowModal(false);
    loadUsers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este usuario?")) return;
    await supabase.from("users").delete().eq("id", id);
    loadUsers();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            Usuarios del Sistema
          </h1>
          <p className="text-white/60 text-sm">Gestión de accesos y permisos por módulo.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-full bg-purple-500 px-4 py-2 text-sm font-medium hover:bg-purple-400">
          <Plus className="h-4 w-4" /> Nuevo Usuario
        </button>
      </div>

      <div className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
        {loading ? (
          <div className="text-center py-8 text-white/50">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-8 text-white/50">No hay usuarios registrados.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-white/50">
                  <th className="pb-3 pr-4">Nombre</th>
                  <th className="pb-3 pr-4">Email</th>
                  <th className="pb-3 pr-4">Rol</th>
                  <th className="pb-3 pr-4">Módulos</th>
                  <th className="pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => {
                  const role = ROLES.find(r => r.value === u.role) || ROLES[3];
                  const moduleCount = Object.keys(u.permissions || {}).length;
                  return (
                    <tr key={u.id} className="hover:bg-white/5">
                      <td className="py-3 pr-4 font-medium">{u.name}</td>
                      <td className="py-3 pr-4 text-white/70">{u.email}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${role.color}`}>
                          {role.label}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-white/60 text-xs">{moduleCount} módulos</td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(u)} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">Editar</button>
                          <button onClick={() => handleDelete(u.id)} className="rounded-lg bg-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/30">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-lg rounded-2xl bg-slate-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-full p-1 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/70">Email</label>
                <input
                  type="email"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  disabled={!!editingUser}
                  placeholder="correo@gcuavante.com"
                />
              </div>
              <div>
                <label className="text-xs text-white/70">Nombre</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="text-xs text-white/70">Rol</label>
                <select
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  value={form.role}
                  onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-white/70 mb-2 block">Permisos por Módulo</label>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {MODULES.map(mod => (
                    <div key={mod.id} className="rounded-xl bg-black/20 p-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!form.permissions[mod.id]}
                          onChange={() => togglePermission(mod.id)}
                          className="rounded"
                        />
                        <span className="font-medium">{mod.name}</span>
                      </label>
                      {form.permissions[mod.id] && (
                        <div className="ml-6 mt-2 flex flex-wrap gap-2">
                          {mod.submodules.map(sub => (
                            <label key={sub} className="flex items-center gap-1 text-xs cursor-pointer bg-white/5 rounded px-2 py-1">
                              <input
                                type="checkbox"
                                checked={(form.permissions[mod.id] || []).includes(sub)}
                                onChange={() => togglePermission(mod.id, sub)}
                                className="rounded"
                              />
                              {sub}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-full text-sm hover:bg-white/10">Cancelar</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-full bg-purple-500 px-4 py-2 text-sm font-medium hover:bg-purple-400">
                <Save className="h-4 w-4" /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
