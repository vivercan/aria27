"use client";
import { clientLogger } from "@/lib/client-logger";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Save, DollarSign, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/lib/use-flash-message";

interface ConfigItem {
  id: string;
  clave: string;
  valor: string;
  descripcion: string;
}

export default function NominaConfigPage() {
  const log = clientLogger("NOMINA");
  const { msg, flash, clear } = useFlashMessage();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    const { data, error } = await supabase
      .from("configuracion_nomina")
      .select("*")
      .order("clave");
    if (error) { log.error("Error loading configuracion_nomina:", { error: error?.message }); setLoading(false); return; }
    if (data) setConfigs(data);
    setLoading(false);
  }

  function validar(valor: string, clave: string): boolean {
    const errors: Record<string, string> = {};
    if (!valor?.trim()) errors[clave] = "El valor es requerido";
    if (clave.includes("horas") || clave.includes("factor") || clave.includes("aguinaldo") || clave.includes("salario") || clave.includes("minimo")) {
      if (isNaN(parseFloat(valor)) || parseFloat(valor) < 0) {
        errors[clave] = "Debe ser un número >= 0";
      }
    }
    if (clave.includes("tolerancia")) {
      if (isNaN(parseInt(valor)) || parseInt(valor) < 0) {
        errors[clave] = "Debe ser un número >= 0";
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave(id: string, valor: string, clave: string) {
    if (!validar(valor, clave)) return;
    setSaving(true);
    const { error } = await supabase.from("configuracion_nomina").update({ valor, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { log.error("Error saving configuracion:", { error: error?.message }); flash("err", "Error: " + error?.message); setSaving(false); return; }
    setFormErrors({});
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
      <FlashBanner msg={msg} className="mx-6" />
      <div className="flex items-center gap-2 text-sm text-[#7f93b0]">
        <Link href="/dashboard/configuracion/maestros" className="hover:text-white">Maestros</Link>
        <span>/</span>
        <span className="text-white">{"Configuraci\u00f3n N\u00f3mina"}</span>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/dashboard/configuracion/maestros" className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.06] transition-colors">
          <ArrowLeft className="w-5 h-5 text-[#7f93b0]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <DollarSign className="text-emerald-400" />
          {"Configuraci\u00f3n de N\u00f3mina"}
        </h1>
        <p className="text-[#7f93b0] text-sm">{"Par\u00e1metros para c\u00e1lculo de n\u00f3mina y asistencias"}</p>
      </div></div>

      <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 ">
        {loading ? (
          <p className="text-center text-[#7f93b0] py-8"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {configs.map((cfg) => (
              <div key={cfg.id} className="space-y-1">
                <label className="block text-sm text-[#c9d8ed] font-medium">
                  {configLabels[cfg.clave] || cfg.clave}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cfg.valor}
                    onChange={(e) => handleChange(cfg.id, e.target.value)}
                    className="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-white"
                  />
                  <button
                    onClick={() => handleSave(cfg.id, cfg.valor, cfg.clave)}
                    disabled={saving}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white"
                  >
                    <Save size={16} />
                  </button>
                </div>
                {formErrors[cfg.clave] && <p className="text-red-400 text-xs mt-1">{formErrors[cfg.clave]}</p>}
                <p className="text-xs text-[#4a6080]">{cfg.descripcion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
