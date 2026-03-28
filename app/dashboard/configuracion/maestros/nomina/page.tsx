"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Save, DollarSign, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

interface ConfigItem {
  id: string;
  clave: string;
  valor: string;
  descripcion: string;
}

export default function NominaConfigPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    const { data, error } = await supabase
      .from("configuracion_nomina")
      .select("*")
      .order("clave");
    if (error) { console.error("Error loading configuracion_nomina:", error.message); setLoading(false); return; }
    if (data) setConfigs(data);
    setLoading(false);
  }

  async function handleSave(id: string, valor: string) {
    setSaving(true);
    const { error } = await supabase.from("configuracion_nomina").update({ valor, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { console.error("Error saving configuracion:", error.message); alert("Error: " + error.message); setSaving(false); return; }
    setSaving(false);
  }

  function handleChange(id: string, valor: string) {
    setConfigs(configs.map(c => c.id === id ? { ...c, valor } : c));
  }

  const configLabels: Record<string, string> = {
    aguinaldo_dias: "D\u00edas de Aguinaldo",
    dia_pago_semanal: "D\u00eda de Pago Semanal",
    factor_hora_extra_doble: "Factor Hora Extra Doble",
    factor_hora_extra_triple: "Factor Hora Extra Triple",
    horario_entrada_default: "Horario Entrada (L-V)",
    horario_sabado_entrada: "Horario Entrada S\u00e1bado",
    horario_sabado_salida: "Horario Salida S\u00e1bado",
    horario_salida_default: "Horario Salida (L-V)",
    horas_jornada_diaria: "Horas Jornada Diaria",
    minimo_tarjeta_default: "M\u00ednimo Pago por Tarjeta",
    modo_nomina: "Modo de N\u00f3mina",
    salario_minimo: `Salario M\u00ednimo Diario ${new Date().getFullYear()}`,
    tolerancia_retardo_min: "Tolerancia Retardo (minutos)",
    vacaciones_anio_1: "Vacaciones Primer A\u00f1o (d\u00edas)"
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard/configuracion/maestros" className="hover:text-white">Maestros</Link>
        <span>/</span>
        <span className="text-white">{"Configuraci\u00f3n N\u00f3mina"}</span>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/dashboard/configuracion/maestros" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="text-emerald-400" />
          {"Configuraci\u00f3n de N\u00f3mina"}
        </h1>
        <p className="text-slate-400 text-sm">{"Par\u00e1metros para c\u00e1lculo de n\u00f3mina y asistencias"}</p>
      </div></div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        {loading ? (
          <p className="text-center text-slate-400 py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configs.map((cfg) => (
              <div key={cfg.id} className="space-y-1">
                <label className="block text-sm text-slate-300 font-medium">
                  {configLabels[cfg.clave] || cfg.clave}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cfg.valor}
                    onChange={(e) => handleChange(cfg.id, e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                  <button
                    onClick={() => handleSave(cfg.id, cfg.valor)}
                    disabled={saving}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white"
                  >
                    <Save size={16} />
                  </button>
                </div>
                <p className="text-xs text-slate-500">{cfg.descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
