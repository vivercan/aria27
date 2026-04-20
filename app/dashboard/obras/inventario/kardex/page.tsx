"use client";
import { clientLogger } from "@/lib/client-logger";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { History, Loader2, ArrowDown, ArrowUp, Settings, Eye, Download, X } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

interface Movimiento {
  id: string;
  obra_nombre: string;
  producto_nombre: string;
  unidad: string | null;
  tipo: string;
  cantidad: number;
  saldo_post: number | null;
  motivo: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  usuario: string | null;
  foto_url: string | null;
  created_at: string;
}

function KardexContent() {
  const log = clientLogger("KARDEX");
  const sp = useSearchParams();
  const obra = sp.get("obra") || "";
  const producto = sp.get("producto") || "";
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let q = supabase
        .from("inventario_movimientos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (obra) q = q.eq("obra_nombre", obra);
      if (producto) q = q.eq("producto_nombre", producto);
      const { data, error } = await q;
      if (error) log.error((error as {message?: string})?.message || "Error desconocido");
      setMovs(data || []);
      setLoading(false);
    })();
  }, [obra, producto]);

  const totalEntradas = movs.filter(m => m.tipo === "ENTRADA").reduce((s, m) => s + Number(m.cantidad), 0);
  const totalSalidas = movs.filter(m => m.tipo === "SALIDA").reduce((s, m) => s + Number(m.cantidad), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <AriaBackButton href="/dashboard/obras/inventario" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-aria-accent" /> Kardex
          </h1>
          <p className="text-[#7f93b0] text-sm">
            {obra ? <>Obra: <span className="text-white">{obra}</span></> : "Todas las obras"}
            {producto && <> · Producto: <span className="text-white">{producto}</span></>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
          <p className="text-sm text-[#7f93b0]">Movimientos</p>
          <p className="text-2xl font-bold text-white">{movs.length}</p>
        </div>
        <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
          <p className="text-sm text-[#7f93b0]">Entradas (suma)</p>
          <p className="text-2xl font-bold text-emerald-400">+{totalEntradas.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
          <p className="text-sm text-[#7f93b0]">Salidas (suma)</p>
          <p className="text-2xl font-bold text-red-400">-{totalSalidas.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white/[0.04] rounded-xl border border-white/[0.08] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[rgba(4,8,16,0.98)] backdrop-blur sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-[#c9d8ed]">Fecha</th>
              <th className="px-4 py-3 text-center text-[#c9d8ed] w-12">Foto</th>
              <th className="px-4 py-3 text-left text-[#c9d8ed]">Producto</th>
              <th className="px-4 py-3 text-center text-[#c9d8ed]">Tipo</th>
              <th className="px-4 py-3 text-right text-[#c9d8ed]">Cantidad</th>
              <th className="px-4 py-3 text-right text-[#c9d8ed]">Saldo</th>
              <th className="px-4 py-3 text-left text-[#c9d8ed]">Motivo</th>
              <th className="px-4 py-3 text-left text-[#c9d8ed]">Ref</th>
              <th className="px-4 py-3 text-left text-[#c9d8ed]">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr><td colSpan={9} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-aria-accent" /></td></tr>
            )}
            {!loading && movs.map(m => (
              <tr key={m.id} className="hover:bg-white/[0.04]">
                <td className="px-4 py-2 text-[#c9d8ed]">{new Date(m.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-center">
                  {m.foto_url ? (
                    <button onClick={() => setFotoAmpliada(m.foto_url)} className="relative group">
                      <img src={m.foto_url} alt="" className="w-9 h-9 rounded-lg object-cover border border-white/[0.08] mx-auto" />
                      <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Eye className="w-3.5 h-3.5 text-white" />
                      </div>
                    </button>
                  ) : (
                    <span className="text-[#4a6080] text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-white">{m.producto_nombre} <span className="text-xs text-[#7f93b0]">{m.unidad}</span></td>
                <td className="px-4 py-2 text-center">
                  {m.tipo === "ENTRADA" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs"><ArrowDown className="w-3 h-3" />ENTRADA</span>}
                  {m.tipo === "SALIDA" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs"><ArrowUp className="w-3 h-3" />SALIDA</span>}
                  {m.tipo === "AJUSTE" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-xs"><Settings className="w-3 h-3" />AJUSTE</span>}
                </td>
                <td className="px-4 py-2 text-right text-white font-medium">{Number(m.cantidad).toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-[#c9d8ed]">{m.saldo_post !== null ? Number(m.saldo_post).toLocaleString() : "-"}</td>
                <td className="px-4 py-2 text-[#c9d8ed]">{m.motivo || "-"}</td>
                <td className="px-4 py-2 text-[#7f93b0] text-xs">{m.referencia_tipo || "-"}</td>
                <td className="px-4 py-2 text-[#7f93b0] text-xs">{m.usuario || "-"}</td>
              </tr>
            ))}
            {!loading && movs.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-[#7f93b0]">Sin movimientos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal foto ampliada */}
      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setFotoAmpliada(null)}>
          <div className="relative max-w-3xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-3 right-8 flex items-center gap-2 z-10">
              <a href={fotoAmpliada} download target="_blank" rel="noopener noreferrer"
                className="p-2 bg-aria-primary rounded-full border border-white/[0.08] hover:bg-aria-primary-hover transition-colors" title="Descargar"
                onClick={(e) => e.stopPropagation()}>
                <Download className="w-5 h-5 text-white" />
              </a>
              <button onClick={() => setFotoAmpliada(null)} className="p-2 bg-[#0c1d38] rounded-full border border-white/[0.08] hover:bg-[#0f2448]">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <img src={fotoAmpliada} alt="Evidencia" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function KardexPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>}>
      <KardexContent />
    </Suspense>
  );
}
