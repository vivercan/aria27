"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Save, DollarSign } from "lucide-react";
import Link from "next/link";

interface ConfiguraciónItem {
  id: string;
  clave: string;
  valor: string;
  descripcion: string;
}

export default function NóminaConfiguraciónPage() {
  const [Configuracións, setConfiguracións] = useState<ConfiguraciónItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfiguracións();
  }, []);

  async function fetchConfiguracións() {
    const { data } = await supabase
      .from("configuracion_nomina")
      .select("*")
      .order("clave");
    if (data) setConfiguracións(data);
    setLoading(false);
  }

  async function handleSave(id: string, valor: string) {
    setSaving(true);
    await supabase.from("configuracion_nomina").update({ valor, updated_at: new Date().toISOString() }).eq("id", id);
    setSaving(false);
  }

  function handleChange(id: string, valor: string) {
    setConfiguracións(Configuracións.map(c => c.id === id ? { ...c, valor } : c));
  }

  const ConfiguraciónLabels: Record<string, string> = {
    salario_minimo: "Salario Mínimo Diario",
    factor_hora_extra_doble: "Factor Hora Extra Doble",
    factor_hora_extra_triple: "Factor Hora Extra Triple",
    tolerancia_retardo_min: "Tolerancia Retardo (minutos)",
    dia_pago_semanal: "Día de Pago Semanal",
    horas_jornada_diaria: "Horas Jornada Diaria"
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard/configuracion/maestros" className="hover:text-white">Maestros</Link>
        <span>/</span>
        <span className="text-white">Configuración Nómina</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="text-emerald-400" />
          Configuración de Nómina
        </h1>
        <p className="text-slate-400 text-sm">Parámetros para cálculo de nómina y asistencias</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        {loading ? (
          <p className="text-center text-slate-400 py-8">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Configuracións.map((Configuración) => (
              <div key={Configuración.id} className="space-y-1">
                <label className="block text-sm text-slate-300 font-medium">
                  {ConfiguraciónLabels[Configuración.clave] || Configuración.clave}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={Configuración.valor}
                    onChange={(e) => handleChange(Configuración.id, e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white"
                  />
                  <button
                    onClick={() => handleSave(Configuración.id, Configuración.valor)}
                    disabled={saving}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white"
                  >
                    <Save size={16} />
                  </button>
                </div>
                <p className="text-xs text-slate-500">{Configuración.descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
