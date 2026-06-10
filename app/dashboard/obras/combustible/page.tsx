"use client";
import { useEffect, useState } from "react";
import AriaBackButton from "@/components/AriaBackButton";
import { supabase } from "@/lib/supabase";
import { Fuel, Download, Filter, Image as ImageIcon } from "lucide-react";

interface Obra { id: string; nombre: string; codigo?: string }
interface Carga {
  id: string;
  equipo_alias_snapshot: string;
  tipo_combustible: string;
  litros_solicitados: number;
  total_estimado: number | null;
  horometro_lectura: number | null;
  horometro_foto_url: string | null;
  created_at: string;
  requisition: { folio: string; cost_center_name: string; status: string } | null;
}
interface PivoteRow {
  maquina: string;
  tipo: string;
  total_litros: number;
  total_cargas: number;
  meses: Record<string, number>;
}

export default function DashboardCombustiblePage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [filtros, setFiltros] = useState({ obra_id: "", tipo: "", desde: "", hasta: "" });
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [pivote, setPivote] = useState<PivoteRow[]>([]);
  const [resumen, setResumen] = useState({ total_litros: 0, total_monto: 0, total_cargas: 0, maquinas_distintas: 0 });
  const [loading, setLoading] = useState(false);
  const [verDetalle, setVerDetalle] = useState(false);
  const [fotoActiva, setFotoActiva] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("centros_trabajo").select("id, nombre, codigo").eq("activo", true).order("nombre").then(({ data }) => {
      if (data) setObras(data as Obra[]);
    });
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtros.obra_id) params.set("obra_id", filtros.obra_id);
    if (filtros.tipo) params.set("tipo", filtros.tipo);
    if (filtros.desde) params.set("desde", filtros.desde);
    if (filtros.hasta) params.set("hasta", filtros.hasta);
    const r = await fetch(`/api/combustible/historial?${params}`, { cache: "no-store" });
    const d = await r.json();
    setResumen(d.resumen || { total_litros: 0, total_monto: 0, total_cargas: 0, maquinas_distintas: 0 });
    setPivote(d.pivote || []);
    setCargas(d.cargas || []);
    setLoading(false);
  }

  function exportarExcel() {
    // Construir CSV (Excel-compatible)
    const meses = new Set<string>();
    pivote.forEach((p) => Object.keys(p.meses).forEach((m) => meses.add(m)));
    const mesesArr = Array.from(meses).sort();
    const header = ["Maquina", "Tipo", ...mesesArr, "Total Litros", "Total Cargas"];
    const rows = pivote.map((p) => [
      p.maquina, p.tipo,
      ...mesesArr.map((m) => p.meses[m] || 0),
      p.total_litros, p.total_cargas,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `combustible-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const mesesGlobal = Array.from(new Set(pivote.flatMap((p) => Object.keys(p.meses)))).sort();

  return (
    <div className="flex flex-col gap-5 p-6 h-full overflow-y-auto pb-12">
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/obras" />
        <Fuel className="w-7 h-7 text-amber-400" />
        <h1 className="text-2xl font-bold">Control de Combustible</h1>
        <button onClick={exportarExcel} className="ml-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> Excel
        </button>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3 text-xs uppercase text-amber-300 font-bold">
          <Filter className="w-3 h-3" /> Filtros
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-[#7f93b0]">Obra</span>
            <select value={filtros.obra_id} onChange={(e) => setFiltros({ ...filtros, obra_id: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10 text-sm">
              <option value="">Todas</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo}. ${o.nombre}` : o.nombre}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#7f93b0]">Tipo</span>
            <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10 text-sm">
              <option value="">Todos</option>
              <option value="DIESEL">DIESEL</option>
              <option value="MAGNA">MAGNA</option>
              <option value="PREMIUM">PREMIUM</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#7f93b0]">Desde</span>
            <input type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10 text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-[#7f93b0]">Hasta</span>
            <input type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10 text-sm" />
          </label>
          <button onClick={cargar} className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm self-end">
            Aplicar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-4">
          <div className="text-xs uppercase text-amber-200">Total Litros</div>
          <div className="text-2xl font-bold text-white mt-1">{Number(resumen.total_litros).toFixed(1)}</div>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-4">
          <div className="text-xs uppercase text-emerald-200">Total Estimado</div>
          <div className="text-2xl font-bold text-white mt-1">${Number(resumen.total_monto).toFixed(0)}</div>
        </div>
        <div className="rounded-xl bg-cyan-500/10 border border-cyan-400/30 p-4">
          <div className="text-xs uppercase text-cyan-200">Cargas</div>
          <div className="text-2xl font-bold text-white mt-1">{resumen.total_cargas}</div>
        </div>
        <div className="rounded-xl bg-purple-500/10 border border-purple-400/30 p-4">
          <div className="text-xs uppercase text-purple-200">Maquinas</div>
          <div className="text-2xl font-bold text-white mt-1">{resumen.maquinas_distintas}</div>
        </div>
      </div>

      {/* Pivote maquinas x meses */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wider text-amber-300 font-bold">Consumo por máquina / mes (Litros)</h2>
          <button onClick={() => setVerDetalle(!verDetalle)} className="text-xs text-amber-300 hover:underline">
            {verDetalle ? "Ver pivote" : "Ver detalle de cargas"}
          </button>
        </div>
        {loading ? (
          <div className="p-8 text-center text-[#7f93b0]">Cargando...</div>
        ) : verDetalle ? (
          <table className="w-full text-sm">
            <thead className="bg-white/[0.04]">
              <tr className="text-xs uppercase text-[#7f93b0]">
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Folio</th>
                <th className="p-3 text-left">Máquina</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-right">Litros</th>
                <th className="p-3 text-right">Total $</th>
                <th className="p-3 text-center">Horómetro</th>
                <th className="p-3 text-left">Obra</th>
                <th className="p-3 text-center">Foto</th>
              </tr>
            </thead>
            <tbody>
              {cargas.map((c) => (
                <tr key={c.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="p-3 text-[#c9d8ed]">{new Date(c.created_at).toLocaleDateString("es-MX")}</td>
                  <td className="p-3 text-amber-300 font-mono text-xs">{c.requisition?.folio}</td>
                  <td className="p-3 text-white">{c.equipo_alias_snapshot}</td>
                  <td className="p-3"><span className="px-2 py-1 rounded text-xs bg-amber-500/15 text-amber-300">{c.tipo_combustible}</span></td>
                  <td className="p-3 text-right text-white">{Number(c.litros_solicitados).toFixed(1)} L</td>
                  <td className="p-3 text-right text-emerald-300">${Number(c.total_estimado || 0).toFixed(2)}</td>
                  <td className="p-3 text-center text-[#c9d8ed]">{c.horometro_lectura ?? "—"}</td>
                  <td className="p-3 text-[#c9d8ed] text-xs">{c.requisition?.cost_center_name || "—"}</td>
                  <td className="p-3 text-center">
                    {c.horometro_foto_url ? (
                      <button onClick={() => setFotoActiva(c.horometro_foto_url!)} className="text-amber-300 hover:underline">
                        <ImageIcon className="w-4 h-4 inline" />
                      </button>
                    ) : <span className="text-[#7f93b0] text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04]">
                <tr className="text-xs uppercase text-[#7f93b0]">
                  <th className="p-3 text-left">Máquina</th>
                  <th className="p-3 text-center">Tipo</th>
                  {mesesGlobal.map((m) => <th key={m} className="p-3 text-right">{m}</th>)}
                  <th className="p-3 text-right text-amber-300">Total L</th>
                  <th className="p-3 text-right">Cargas</th>
                </tr>
              </thead>
              <tbody>
                {pivote.map((p) => (
                  <tr key={p.maquina} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-medium">{p.maquina}</td>
                    <td className="p-3 text-center"><span className="px-2 py-1 rounded text-xs bg-amber-500/15 text-amber-300">{p.tipo}</span></td>
                    {mesesGlobal.map((m) => <td key={m} className="p-3 text-right text-[#c9d8ed]">{p.meses[m] ? Number(p.meses[m]).toFixed(1) : "—"}</td>)}
                    <td className="p-3 text-right text-amber-300 font-bold">{Number(p.total_litros).toFixed(1)}</td>
                    <td className="p-3 text-right text-[#c9d8ed]">{p.total_cargas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal foto */}
      {fotoActiva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setFotoActiva(null)}>
          <img src={fotoActiva} alt="horometro" className="max-w-full max-h-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
