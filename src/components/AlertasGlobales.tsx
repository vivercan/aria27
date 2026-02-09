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
  rolesPermitidos: string[]; // Roles que pueden ver esta alerta
}

export default function AlertasGlobales() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [minimizado, setMinimizado] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    // Obtener rol del usuario
    const email = localStorage.getItem("userEmail");
    if (email) {
      obtenerRolUsuario(email);
    }
  }, []);

  async function obtenerRolUsuario(email: string) {
    try {
      const { data } = await supabase
        .from("Users")
        .select("role")
        .eq("email", email)
        .single();
      
      if (data?.role) {
        setUserRole(data.role.toLowerCase());
        cargarAlertas(data.role.toLowerCase());
      }
    } catch (error) {
      console.error("Error obteniendo rol:", error);
      setLoading(false);
    }
  }

  async function cargarAlertas(rol: string) {
    const alertasTemp: Alerta[] = [];

    try {
      // 1. Proveedores sin datos bancarios - SOLO PARA COMPRAS
      if (rol === "compras") {
        const { data: proveedores } = await supabase
          .from("Proveedores")
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
              rolesPermitidos: ["compras"],
            });
          }
        }
      }

      // 2. Requisiciones sin precios - SOLO PARA COMPRAS
      if (rol === "compras") {
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
            rolesPermitidos: ["compras"],
          });
        }
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
        className="fixed bottom-4 left-[200px] z-50 flex items-center gap-2 px-4 py-2 bg-amber-500/90 hover:bg-amber-500 text-white rounded-full shadow-lg transition-all"
      >
        <AlertTriangle className="w-4 h-4" />
        <span className="font-medium">{totalAlertas} Alertas Pendientes</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-[200px] z-50 w-[380px] bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-amber-500/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-amber-500/10 border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <span className="font-semibold text-amber-400">{totalAlertas} Alertas Pendientes</span>
        </div>
        <button
          onClick={() => setMinimizado(true)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Lista de alertas */}
      <div className="max-h-[300px] overflow-y-auto">
        {alertas.map((alerta, idx) => (
          <Link
            key={idx}
            href={alerta.link || "#"}
            className="flex items-start gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 transition-colors"
          >
            <div className="p-2 rounded-lg bg-amber-500/10 mt-0.5">
              {alerta.tipo === "proveedor_incompleto" ? (
                <Building2 className="w-4 h-4 text-amber-400" />
              ) : (
                <FileWarning className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{alerta.titulo}</p>
              <p className="text-xs text-slate-400 mt-0.5">{alerta.descripcion}</p>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              <span className="text-lg font-bold">{alerta.cantidad}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-800/50 text-center">
        <p className="text-[10px] text-slate-500">Las alertas desaparecen al completar la información</p>
      </div>
    </div>
  );
}
