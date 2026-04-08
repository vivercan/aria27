"use client";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, History, Loader2, ArrowDown, ArrowUp, Settings } from "lucide-react";

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
  created_at: string;
}

function KardexContent() {
  const sp = useSearchParams();
  const obra = sp.get("obra") || "";
  const producto = sp.get("producto") || "";
  const [movs, setMovs] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

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
      if (error) console.error(error.message);
      setMovs(data || []);
      setLoading(false);
    })();
  }, [obra, producto]);

  const totalEntradas = movs.filter(m => m.tipo === "ENTRADA").reduce((s, m) => s + Number(m.cantidad), 0);
  const totalSalidas = movs.filter(m => m.tipo === "SALIDA").reduce((s, m) => s + Number(m.cantidad), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/obras/inventario" className="p-2 hover:bg-white/10 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-purple-400" /> Kardex
          </h1>
          <p className="text-slate-400 text-sm">
            {obra ? <>Obra: <span className="text-white">{obra}</span></> : "Todas las obras"}
            {producto && <> · Producto: <span className="text-white">{producto}</span></>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-slate-400">Movimientos</p>
          <p className="text-2xl font-bold text-white">{movs.length}</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-slate-400">Entradas (suma)</p>
          <p className="text-2xl font-bold text-emerald-400">+{totalEntradas.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
          <p className="text-sm text-slate-400">Salidas (suma)</p>
          <p className="text-2xl font-bold text-red-400">-{totalSalidas.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/95 backdrop-blur sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-slate-300">Fecha</th>
              <th className="px-4 py-3 text-left text-slate-300">Producto</th>
              <th className="px-4 py-3 text-center text-slate-300">Tipo</th>
              <th className="px-4 py-3 text-right text-slate-300">Cantidad</th>
              <th className="px-4 py-3 text-right text-slate-300">Saldo</th>
              <th className="px-4 py-3 text-left text-slate-300">Motivo</th>
              <th className="px-4 py-3 text-left text-slate-300">Ref</th>
              <th className="px-4 py-3 text-left text-slate-300">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading && (
              <tr><td colSpan={8} className="px-4 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></td></tr>
            )}
            {!loading && movs.map(m => (
              <tr key={m.id} className="hover:bg-white/5">
                <td className="px-4 py-2 text-slate-300">{new Date(m.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-white">{m.producto_nombre} <span className="text-xs text-slate-400">{m.unidad}</span></td>
                <td className="px-4 py-2 text-center">
                  {m.tipo === "ENTRADA" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-xs"><ArrowDown className="w-3 h-3" />ENTRADA</span>}
                  {m.tipo === "SALIDA" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs"><ArrowUp className="w-3 h-3" />SALIDA</span>}
                  {m.tipo === "AJUSTE" && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-xs"><Settings className="w-3 h-3" />AJUSTE</span>}
                </td>
                <td className="px-4 py-2 text-right text-white font-medium">{Number(m.cantidad).toLocaleString()}</td>
                <td className="px-4 py-2 text-right text-slate-300">{m.saldo_post !== null ? Number(m.saldo_post).toLocaleString() : "-"}</td>
                <td className="px-4 py-2 text-slate-300">{m.motivo || "-"}</td>
                <td className="px-4 py-2 text-slate-400 text-xs">{m.referencia_tipo || "-"}</td>
                <td className="px-4 py-2 text-slate-400 text-xs">{m.usuario || "-"}</td>
              </tr>
            ))}
            {!loading && movs.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">Sin movimientos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function KardexPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-purple-400" /></div>}>
      <KardexContent />
    </Suspense>
  );
}
