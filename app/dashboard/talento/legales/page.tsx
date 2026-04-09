"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, FileText, Search, Download, User, Edit2, Save, X, Loader2 } from "lucide-react";
import Link from "next/link";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  department: string;
  status: string;
  fecha_ingreso: string;
  tipo_contrato: string;
  empresa: string;
  rfc: string;
  curp: string;
  nss: string;
}

export default function LegalesPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ rfc: "", curp: "", nss: "", tipo_contrato: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("Personal").select("*").order("employee_number");
      if (error) { console.error("Error loading empleados:", error?.message); setLoading(false); return; }
      setEmpleados(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = empleados.filter(e =>
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_number?.toLowerCase().includes(search.toLowerCase())
  );

  const getDocsStatus = (e: Empleado) => {
    let count = 0;
    if (e.rfc) count++;
    if (e.curp) count++;
    if (e.nss) count++;
    if (e.fecha_ingreso) count++;
    return count;
  };


  const startEdit = (e: any) => {
    setEditingId(e.id);
    setEditForm({ rfc: e.rfc || "", curp: e.curp || "", nss: e.nss || "", tipo_contrato: e.tipo_contrato || "" });
  };
  const handleSaveLegal = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await supabase.from("employees").update({
      rfc: editForm.rfc || null,
      curp: editForm.curp || null,
      nss: editForm.nss || null,
      tipo_contrato: editForm.tipo_contrato || null
    }).eq("id", editingId);
    if (error) { console.error("Error saving legal info:", error?.message); alert("Error: " + error?.message); setSaving(false); return; }
    setSaving(false);
    setEditingId(null);
    window.location.reload();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-shrink-0 mb-6">
        <Link href="/dashboard/talento" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Talento
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Documentos Legales</h1>
            <p className="text-slate-400 text-sm mt-1">Expedientes y documentación de colaboradores</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar empleado..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm w-64" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-800 z-10">
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Contrato</th>
              <th className="px-4 py-3 font-medium">Ingreso</th>
              <th className="px-4 py-3 font-medium">RFC</th>
              <th className="px-4 py-3 font-medium">CURP</th>
              <th className="px-4 py-3 font-medium">NSS</th>
              <th className="px-4 py-3 font-medium text-center">Docs</th>
                <th className="text-center p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Sin resultados</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-blue-400 font-mono text-xs">{e.employee_number}</td>
                <td className="px-4 py-3 text-white font-medium">{e.full_name}</td>
                <td className="px-4 py-3 text-slate-300">{e.empresa || "-"}</td>
                <td className="px-4 py-3 text-slate-300">{e.tipo_contrato || "Indefinido"}</td>
                <td className="px-4 py-3 text-slate-300">{e.fecha_ingreso ? new Date(e.fecha_ingreso).toLocaleDateString("es-MX") : "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.rfc ? <span className="text-emerald-400">{e.rfc}</span> : <span className="text-red-400">Falta</span>}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.curp ? <span className="text-emerald-400">Sí</span> : <span className="text-red-400">Falta</span>}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.nss ? <span className="text-emerald-400">{e.nss}</span> : <span className="text-red-400">Falta</span>}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getDocsStatus(e) >= 3 ? "bg-emerald-500/20 text-emerald-400" : getDocsStatus(e) >= 1 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                    {getDocsStatus(e)}/4
                  </span>
                </td>
                  <td className="p-3 text-center">
                    {editingId === e.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={handleSaveLegal} disabled={saving} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs hover:bg-emerald-500/30">
                          {saving ? "..." : "Guardar"}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-xs hover:bg-slate-500/30">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(e)} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs hover:bg-blue-500/30">
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
