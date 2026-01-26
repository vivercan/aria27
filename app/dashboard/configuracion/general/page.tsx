"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Palette, Calendar, Check, Lock, RotateCcw } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

const seasons = [
  { id: "normal", name: "Normal", icon: "🌐", description: "Tema estándar de ARIA", colors: "Cyan/Azul", isDefault: true },
  { id: "valentine", name: "San Valentín", icon: "💕", description: "Del 1 al 14 de Febrero", colors: "Rosa/Rojo" },
  { id: "halloween", name: "Halloween", icon: "🎃", description: "Del 15 al 31 de Octubre", colors: "Naranja/Negro" },
  { id: "diademuertos", name: "Día de Muertos", icon: "💀", description: "Del 1 al 2 de Noviembre", colors: "Morado/Naranja" },
  { id: "christmas", name: "Navidad", icon: "🎄", description: "Del 15 al 31 de Diciembre", colors: "Verde/Rojo" },
];

export default function ConfigGeneralPage() {
  const { theme, season, setTheme, setSeason, colors } = useTheme();
  const [userRole, setUserRole] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (email) {
      if (email.includes("recursos.humanos") || email.includes("juanviverosv") || email.includes("timonfx")) {
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
    showSaved();
  };

  const handleReset = () => {
    setTheme("dark");
    setSeason("normal");
    showSaved();
  };

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isDark = theme === "dark";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/configuracion" className="p-2 rounded-lg hover:opacity-80" style={{ backgroundColor: colors.accentBg }}>
            <ArrowLeft className="w-5 h-5" style={{ color: colors.accent }} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: colors.text }}>General</h1>
            <p style={{ color: colors.textMuted }}>Parámetros y apariencia del sistema</p>
          </div>
        </div>
        
        {/* Botón Restablecer */}
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all hover:opacity-80"
          style={{ backgroundColor: colors.accentBg, color: colors.accent }}
        >
          <RotateCcw className="w-4 h-4" />
          Restablecer Original
        </button>
      </div>

      {saved && (
        <div className="p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: "rgba(34,197,94,0.2)", color: "#22c55e" }}>
          <Check className="w-4 h-4" />
          <span className="text-sm">Cambios guardados</span>
        </div>
      )}

      {/* Modo Claro/Oscuro */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
          <Palette className="w-5 h-5" style={{ color: colors.accent }} />
          Modo de Color
        </h2>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          Elige tu preferencia. También usa el botón ☀️/🌙 en el header.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => { setTheme("dark"); showSaved(); }}
            className="p-4 rounded-xl border-2 transition-all"
            style={{ 
              borderColor: isDark ? colors.accent : colors.cardBorder,
              backgroundColor: isDark ? colors.accentBg : "transparent"
            }}
          >
            <div className="w-full h-16 rounded-lg bg-gradient-to-br from-[#0f172a] to-[#1e3a5a] mb-3 border border-white/20"></div>
            <p className="font-medium" style={{ color: colors.text }}>Oscuro</p>
            <p className="text-xs" style={{ color: colors.textMuted }}>Tema predeterminado</p>
            {isDark && <Check className="w-5 h-5 mt-2" style={{ color: colors.accent }} />}
          </button>
          
          <button
            onClick={() => { setTheme("light"); showSaved(); }}
            className="p-4 rounded-xl border-2 transition-all"
            style={{ 
              borderColor: !isDark ? colors.accent : colors.cardBorder,
              backgroundColor: !isDark ? colors.accentBg : "transparent"
            }}
          >
            <div className="w-full h-16 rounded-lg bg-gradient-to-br from-slate-100 to-slate-300 mb-3 border border-slate-300"></div>
            <p className="font-medium" style={{ color: colors.text }}>Claro</p>
            <p className="text-xs" style={{ color: colors.textMuted }}>Ambientes iluminados</p>
            {!isDark && <Check className="w-5 h-5 mt-2" style={{ color: colors.accent }} />}
          </button>
        </div>
      </div>

      {/* Temas de Temporada */}
      <div className="p-6 rounded-xl" style={{ backgroundColor: colors.card, border: `1px solid ${colors.cardBorder}` }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: colors.text }}>
            <Calendar className="w-5 h-5" style={{ color: colors.accent }} />
            Tema de Temporada
          </h2>
          {!canEditSeasons && (
            <span className="text-xs flex items-center gap-1" style={{ color: "#f59e0b" }}>
              <Lock className="w-3 h-3" /> Solo RH puede modificar
            </span>
          )}
        </div>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          {canEditSeasons 
            ? "Elige el tema de temporada para todo el sistema." 
            : "El tema es configurado por Recursos Humanos."}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {seasons.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSeasonChange(s.id)}
              disabled={!canEditSeasons}
              className="p-4 rounded-xl border-2 text-left transition-all"
              style={{ 
                borderColor: season === s.id ? colors.accent : colors.cardBorder,
                backgroundColor: season === s.id ? colors.accentBg : "transparent",
                opacity: canEditSeasons ? 1 : 0.6,
                cursor: canEditSeasons ? "pointer" : "not-allowed"
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{s.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium" style={{ color: colors.text }}>{s.name}</p>
                    {s.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.accentBg, color: colors.accent }}>
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: colors.textMuted }}>{s.colors}</p>
                </div>
                {season === s.id && <Check className="w-5 h-5" style={{ color: colors.accent }} />}
              </div>
              <p className="text-xs" style={{ color: colors.textMuted }}>{s.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
