"use client";
import { useState, useEffect } from "react";
import { AlertTriangle, X, ChevronRight, Building2, FileWarning } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Alerta {
  tipo: "proveedor_incompleto" | "requisicion_sin_precio" | "otro";
  titulo: string;
  descripcion: string;
  cantidad: number;
  link?: string;
}

export default function AlertasGlobales() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [minimizado, setMinimizado] = useState(false);

  useEffect(() => {
    cargarAlertas();
  }, []);

  async function cargarAlertas() {
    const alertasTemp: Alerta[] = [];

    try {
      // 1. Proveedores sin datos bancarios completos
      const { data: proveedores } = await supabase
        .from("suppliers")
        .select("id, name, banco, numero_cuenta, clabe, rfc")
        .eq("active", true);

      if (proveedores) {
        const proveedoresIncompletos = proveedores.filter(
          (p) => !p.banco || !p.numero_cuenta || !p.clabe || !p.rfc
        );
        if (proveedoresIncompletos.length > 0) {
          alertasTemp.push({
            tipo: "proveedor_incompleto",
            titulo: "Proveedores con información bancaria incompleta",
            descripcion: `${proveedoresIncompletos.length} proveedor(es) sin datos bancarios completos (banco, cuenta, CLABE o RFC)`,
            cantidad: proveedoresIncompletos.length,
            link: "/dashboard/requisiciones/proveedores",
          });
        }
      }

      // 2. Requisiciones sin precios
      const { data: requisiciones } = await supabase
        .from("Requisiciones")
        .select("id, folio, total")
        .or("total.is.null,total.eq.0")
        .in("status", ["PENDIENTE", "APROBADA", "VALIDADA"]);

      if (requisiciones && requisiciones.length > 0) {
        alertasTemp.push({
          tipo: "requisicion_sin_precio",
          titulo: "Requisiciones sin precios capturados",
          descripcion: `${requisiciones.length} requisición(es) activas sin totales`,
          cantidad: requisiciones.length,
          link: "/dashboard/requisiciones/requisiciones/estatus",
        });
      }

      setAlertas(alertasTemp);
    } catch (error) {
      console.error("Error cargando alertas:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || alertas.length === 0) return null;

  const totalAlertas = alertas.reduce((sum, a) => sum + a.cantidad, 0);

  if (minimizado) {
    return (
      <button
        onClick={() => setMinimizado(false)}
        className="fixed bottom-[560px] left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500 text-white shadow-lg hover:bg-amber-600 transition-all animate-pulse"
      >
        <AlertTriangle className="w-5 h-5" />
        <span className="font-bold">{totalAlertas}</span>
        <span className="text-sm">alertas pendientes</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-[560px] left-4 z-50 w-96 max-h-[400px] overflow-hidden rounded-xl bg-[#0a1628] border border-amber-500/30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-amber-400">
            {totalAlertas} Alerta{totalAlertas !== 1 ? "s" : ""} Pendiente{totalAlertas !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => setMinimizado(true)}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Alertas */}
      <div className="overflow-y-auto max-h-[300px] p-2 space-y-2">
        {alertas.map((alerta, index) => (
          <div
            key={index}
            className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                {alerta.tipo === "proveedor_incompleto" ? (
                  <Building2 className="w-4 h-4 text-amber-400" />
                ) : (
                  <FileWarning className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">{alerta.titulo}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold">
                    {alerta.cantidad}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{alerta.descripcion}</p>
                {alerta.link && (
                  <Link
                    href={alerta.link}
                    className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Ver detalles
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-white/5 border-t border-white/10 text-center">
        <p className="text-xs text-slate-500">
          Las alertas desaparecen al completar la información
        </p>
      </div>
    </div>
  );
}
