"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Save, DollarSign, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ConfiguraciÃ³nItem {
  id: string;
  clave: string;
  valor: string;
  descripcion: string;
}

export default function NÃ³minaConfiguraciÃ³nPage() {
  const [ConfiguraciÃ³ns, setConfiguraciÃ³ns] = useState<ConfiguraciÃ³nItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfiguraciÃ³ns();
  }, []);

  async function fetchConfiguraciÃ³ns() {
    const { data, error } = await supabase
      .from("configuracion_nomina")
      .select("*")
      .order("clave");
    if (error) { console.error("Error loading configuracion_nomina:", error.message); setLoading(false); return; }
    if (data) setConfiguraciÃ³ns(data);
    setLoading(false);
  }

  async function handleSave(id: string, valor: string) {
    setSaving(true);
    const { error } = await supabase.from("configuracion_nomina").update({ valor, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { console.error("Error saving configuracion:", error.message); alert("Error: " + error.message); setSaving(false); return; }
    setSaving(false);
  }

  function handleChange(id: string, valor: string) {
    setConfiguraciÃ³ns(ConfiguraciÃ³ns.map(c => c.id === id ? { ...c, valor } : c));
  }

  const ConfiguraciÃ³nLabels: Record<string, string> = {
    salario_minimo: "Salario MÃ­nimo Diario",
    factor_hora_extra_doble: "Factor Hora Extra Doble",
    factor_hora_extra_triple: "Factor Hora Extra Triple",
    tolerancia_retardo_min: "Tolerancia Retardo (minutos)",
    dia_pago_semanal: "DÃ­a de Pago Semanal",
    horas_jornada_diaria: "Horas Jornada Diaria"
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard/configuracion/maestros" className="hover:text-white">Maestros</Link>
        <span>/</span>
        <span className="text-white">ConfiguraciÃ³n NÃ³mina</span>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/dashboard/configuracion/maestros" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="text-emerald-400" />
          ConfiguraciÃ³n de NÃ³mina
        </h1>
        <p className="text-slate-400 text-sm">ParÃ¡metros para cÃ¡lculo de nÃ³mina y asistencias</p>
      </div></div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        {loading ? (
          <p className="text-center text-slate-400 py-8">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ConfiguraciÃ³ns.map((ConfiguraciÃ³n) => (
              <div key={ConfiguraciÃ³n.id} className="space-y-1">
                <label className="block text-sm text-slate-300 font-medium">
                  {ConfiguraciÃ³nLabels[ConfiguraciÃ³n.clave] || ConfiguraciÃ³n.clave}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ConfiguraciÃ³n.valor}
                    onChange={(e) => handleChange(ConfiguraciÃ³n.id, e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                  <button
                    onClick={() => handleSave(ConfiguraciÃ³n.id, ConfiguraciÃ³n.valor)}
                    disabled={saving}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white"
                  >
                    <Save size={16} />
                  </button>
                </div>
                <p className="text-xs text-slate-500">{ConfiguraciÃ³n.descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


