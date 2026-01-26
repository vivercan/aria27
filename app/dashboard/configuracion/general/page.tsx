"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Palette, Calendar, Check, Lock } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const seasons = [
  { id: "normal", name: "Normal", icon: "🌐", description: "Tema estándar de ARIA", colors: "Cyan/Azul" },
  { id: "valentine", name: "San Valentín", icon: "💕", description: "Del 1 al 14 de Febrero", colors: "Rosa/Rojo" },
  { id: "halloween", name: "Halloween", icon: "🎃", description: "Del 15 al 31 de Octubre", colors: "Naranja/Negro" },
  { id: "diademuertos", name: "Día de Muertos", icon: "💀", description: "Del 1 al 2 de Noviembre", colors: "Morado/Naranja" },
  { id: "christmas", name: "Navidad", icon: "🎄", description: "Del 15 al 31 de Diciembre", colors: "Verde/Rojo" },
];

export default function ConfigGeneralPage() {
  const { theme, season, setTheme, setSeason } = useTheme();
  const [userRole, setUserRole] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (email) {
      // Simular carga de rol - en producción vendría de la BD
      if (email.includes("recursos.humanos") || email.includes("juanviverosv")) {
        setUserRole("admin");
      } else {
        setUserRole("user");
      }
    }
  }, []);

  const canEditSeasons = userRole === "admin";

  const handleSeasonChange = (seasonId: string) => {
    if (!canEditSeasons) return;
    setSeason(seasonId as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/configuracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">General</h1>
          <p className="text-slate-400">Parámetros y apariencia del sistema</p>
        </div>
      </div>

      {/* Modo Claro/Oscuro */}
      <div className="p-6 rounded-xl bg-white/5 border border-white/10">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-cyan-400" />
          Modo de Color
        </h2>
        <p className="text-slate-400 text-sm mb-4">Elige tu preferencia de color. También puedes usar el botón ☀️/🌙 en el header.</p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-xl border-2 transition-all ${theme === "dark" ? "border-cyan-500 bg-cyan-500/10" : "border-white/10 hover:border-white/30"}`}
          >
            <div className="w-full h-20 rounded-lg bg-gradient-to-br from-[#0f172a] to-[#1e3a5a] mb-3"></div>
            <p className="text-white font-medium">Oscuro</p>
            <p className="text-slate-500 text-xs">Tema predeterminado</p>
            {theme === "dark" && <Check className="w-5 h-5 text-cyan-400 mt-2" />}
          </button>
          
          <button
            onClick={() => setTheme("light")}
            className={`p-4 rounded-xl border-2 transition-all ${theme === "light" ? "border-cyan-500 bg-cyan-500/10" : "border-white/10 hover:border-white/30"}`}
          >
            <div className="w-full h-20 rounded-lg bg-gradient-to-br from-slate-50 to-slate-200 mb-3"></div>
            <p className="text-white font-medium">Claro</p>
            <p className="text-slate-500 text-xs">Para ambientes iluminados</p>
            {theme === "light" && <Check className="w-5 h-5 text-cyan-400 mt-2" />}
          </button>
        </div>
      </div>

      {/* Temas de Temporada */}
      <div className="p-6 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Tema de Temporada
          </h2>
          {!canEditSeasons && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Solo RH puede modificar
            </span>
          )}
          {saved && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="w-3 h-3" /> Guardado
            </span>
          )}
        </div>
        <p className="text-slate-400 text-sm mb-4">
          {canEditSeasons 
            ? "Elige el tema de temporada para todo el sistema." 
            : "El tema de temporada es configurado por Recursos Humanos."}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {seasons.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSeasonChange(s.id)}
              disabled={!canEditSeasons}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                season === s.id 
                  ? "border-cyan-500 bg-cyan-500/10" 
                  : canEditSeasons 
                    ? "border-white/10 hover:border-white/30" 
                    : "border-white/10 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <p className="text-white font-medium">{s.name}</p>
                  <p className="text-slate-500 text-xs">{s.colors}</p>
                </div>
                {season === s.id && <Check className="w-5 h-5 text-cyan-400 ml-auto" />}
              </div>
              <p className="text-slate-400 text-xs">{s.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
