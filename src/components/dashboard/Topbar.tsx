"use client";
import { Bell, Search, LogOut, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Topbar() {
  const [userName, setUserName] = useState("Cargando...");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function fetchUser() {
      // Obtener email del localStorage (guardado en login)
      const email = localStorage.getItem("userEmail") || "recursos.humanos@gcuavante.com";
      setUserEmail(email);
      
      // Buscar display_name en la tabla users
      const { data } = await supabase
        .from("users")
        .select("name, display_name")
        .eq("email", email)
        .single();
      
      if (data) {
        // Priorizar display_name, luego name
        setUserName(data.display_name || data.name || email.split("@")[0]);
      } else {
        setUserName(email.split("@")[0]);
      }
    }
    fetchUser();
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#020712]/80 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center justify-between h-full px-6">
        {/* Búsqueda */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-4">
          {/* Notificaciones */}
          <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
            <Bell className="h-5 w-5 text-slate-400" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Usuario */}
          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-white">{userName}</p>
              <p className="text-xs text-slate-500">{userEmail}</p>
            </div>
          </div>

          {/* Logout - CAMBIO 5: Icono más grande */}
          <Link
            href="/"
            className="p-2 rounded-xl hover:bg-red-500/10 transition-colors group"
            title="Cerrar Sesión"
          >
            <LogOut className="h-6 w-6 text-slate-400 group-hover:text-red-400 transition-colors" />
          </Link>
        </div>
      </div>
    </header>
  );
}
