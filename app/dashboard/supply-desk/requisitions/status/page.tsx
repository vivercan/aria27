"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Clock, CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react";

type Requisition = {
  id: number;
  folio: string;
  cost_center_name: string;
  required_date: string;
  status: string;
  created_at: string;
  created_by: string;
};

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  PENDIENTE: { color: "text-amber-400 bg-amber-500/20", icon: Clock, label: "Pendiente" },
  APROBADA: { color: "text-emerald-400 bg-emerald-500/20", icon: CheckCircle, label: "Aprobada" },
  RECHAZADA: { color: "text-red-400 bg-red-500/20", icon: XCircle, label: "Rechazada" },
  REVISION: { color: "text-blue-400 bg-blue-500/20", icon: AlertCircle, label: "En Revisión" },
};

export default function RequisitionsStatusPage() {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("requisitions")
        .select("*")
        .order("created_at", { ascending: false });
      setRequisitions((data || []) as Requisition[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Estatus de Requisiciones</h1>
        <p className="text-white/60 text-sm">Monitor de todas las solicitudes de materiales.</p>
      </div>

      <div className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
        {loading ? (
          <div className="text-center py-8 text-white/50">Cargando requisiciones...</div>
        ) : requisitions.length === 0 ? (
          <div className="text-center py-8 text-white/50">No hay requisiciones registradas.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-white/50">
                  <th className="pb-3 pr-4">Folio</th>
                  <th className="pb-3 pr-4">Centro de Costo</th>
                  <th className="pb-3 pr-4">Fecha Requerida</th>
                  <th className="pb-3 pr-4">Creada</th>
                  <th className="pb-3 pr-4">Estado</th>
                  <th className="pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {requisitions.map((r) => {
                  const st = statusConfig[r.status] || statusConfig.PENDIENTE;
                  return (
                    <tr key={r.id} className="hover:bg-white/5">
                      <td className="py-3 pr-4 font-mono text-xs">{r.folio}</td>
                      <td className="py-3 pr-4">{r.cost_center_name}</td>
                      <td className="py-3 pr-4">{new Date(r.required_date).toLocaleDateString("es-MX")}</td>
                      <td className="py-3 pr-4 text-white/60">{new Date(r.created_at).toLocaleDateString("es-MX")}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${st.color}`}>
                          <st.icon className="h-3 w-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20 inline-flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
