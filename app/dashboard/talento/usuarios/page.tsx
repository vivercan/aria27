"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Mail, Phone } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  active: boolean;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    const { data } = await supabase.from("users").select("*").order("name");
    if (data) setUsers(data);
    setLoading(false);
  };

  const getRoleColor = (role: string) => {
    switch(role) {
      case "admin": return "bg-purple-500/20 text-purple-400";
      case "validador": return "bg-blue-500/20 text-blue-400";
      case "compras": return "bg-emerald-500/20 text-emerald-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Users className="w-7 h-7 text-purple-400" />
          Usuarios del Sistema
        </h1>
        <p className="text-slate-400 mt-1">{users.length} usuarios registrados</p>
      </div>

      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div></div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No hay usuarios registrados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Teléfono</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Rol</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-slate-300"><Mail className="w-4 h-4 text-slate-500 inline mr-2" />{u.email}</td>
                    <td className="px-4 py-3 text-slate-300"><Phone className="w-4 h-4 text-slate-500 inline mr-2" />{u.phone || "-"}</td>
                    <td className="px-4 py-3 text-center"><span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(u.role)}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${u.active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                        {u.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
