"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, Search, Download, User, Edit2, Save, X, Loader2 } from "lucide-react";
import Link from "next/link";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";

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
  const log = clientLogger("LEGALES");
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ rfc: "", curp: "", nss: "", tipo_contrato: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { msg, flash } = useFlashMessage();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("Personal").select("*").order("employee_number");
      if (error) { log.error("Error loading empleados:", { error: error?.message }); setLoading(false); return; }
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


  const startEdit = (e: Record<string, unknown>) => {
    setEditingId((e.id as string) || "");
    setEditForm({ rfc: (e.rfc as string) || "", curp: (e.curp as string) || "", nss: (e.nss as string) || "", tipo_contrato: (e.tipo_contrato as string) || "" });
  };
  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (editForm.rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(editForm.rfc)) errors.rfc = "RFC inválido";
    if (editForm.curp && !/^[A-ZÑ]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(editForm.curp)) errors.curp = "CURP inválido";
    if (editForm.nss && !/^\d{11}$/.test(editForm.nss)) errors.nss = "NSS debe tener 11 dígitos";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveLegal = async () => {
    if (!editingId) return;
    if (!validar()) return;
    setSaving(true);
    const { error } = await supabase.from("employees").update({
      rfc: editForm.rfc || null,
      curp: editForm.curp || null,
      nss: editForm.nss || null,
      tipo_contrato: editForm.tipo_contrato || null
    }).eq("id", editingId);
    if (error) { log.error("Error saving legal info:", { error: error?.message }); flash("err", "Error: " + error?.message); setSaving(false); return; }
    setSaving(false);
    setEditingId(null);
    window.location.reload();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {msg && <FlashBanner msg={msg} className="mx-6 mt-3" />}
      <div className="flex-shrink-0 mb-6">
        <AriaBackButton href="/dashboard/talento" />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Documentos Legales</h1>
            <p className="text-[#7f93b0] text-sm mt-1">Expedientes y documentación de colaboradores</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
            <input type="text" placeholder="Buscar empleado..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm w-64" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0c1d38] z-10">
            <tr className="text-left text-[#7f93b0] border-b border-white/[0.08]">
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
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#7f93b0]"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-[#7f93b0]">Sin resultados</td></tr>
            ) : filtered.map(e => (
              <tr key={e.id} className="border-b border-white/[0.05] hover:bg-white/[0.04]">
                <td className="px-4 py-3 text-aria-accent font-mono text-xs">{e.employee_number}</td>
                <td className="px-4 py-3 text-white font-medium">{e.full_name}</td>
                <td className="px-4 py-3 text-[#c9d8ed]">{e.empresa || "-"}</td>
                <td className="px-4 py-3 text-[#c9d8ed]">{e.tipo_contrato || "Indefinido"}</td>
                <td className="px-4 py-3 text-[#c9d8ed]">{e.fecha_ingreso ? new Date(e.fecha_ingreso).toLocaleDateString("es-MX") : "-"}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.rfc ? <span className="text-aria-accent">{e.rfc}</span> : <span className="text-red-400">Falta</span>}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.curp ? <span className="text-aria-accent">Sí</span> : <span className="text-red-400">Falta</span>}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.nss ? <span className="text-aria-accent">{e.nss}</span> : <span className="text-red-400">Falta</span>}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getDocsStatus(e) >= 3 ? "bg-emerald-500/20 text-aria-accent" : getDocsStatus(e) >= 1 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>
                    {getDocsStatus(e)}/4
                  </span>
                </td>
                  <td className="p-3 text-center">
                    {editingId === e.id ? (
                      <div>
                        {Object.keys(formErrors).length > 0 && (
                          <div className="mb-2 p-2 rounded bg-red-500/20 border border-red-500/30">
                            {Object.entries(formErrors).map(([k, v]) => <p key={k} className="text-red-400 text-[10px]">{v}</p>)}
                          </div>
                        )}
                        <div className="flex items-center gap-1 justify-center">
                          <button onClick={handleSaveLegal} disabled={saving} className="px-2 py-1 bg-emerald-500/20 text-aria-accent rounded text-xs hover:bg-aria-primary/30">
                            {saving ? "..." : "Guardar"}
                          </button>
                          <button onClick={() => { setEditingId(null); setFormErrors({}); }} className="px-2 py-1 bg-slate-500/20 text-[#7f93b0] rounded text-xs hover:bg-slate-500/30">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(e as unknown as Record<string, unknown>)} className="px-2 py-1 bg-aria-primary-light text-aria-accent rounded text-xs hover:bg-aria-primary-hover/30">
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
