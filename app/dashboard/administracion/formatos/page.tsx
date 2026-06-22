"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AriaBackButton from "@/components/AriaBackButton";
import { FilePlus2, Download, Upload, Trash2, Loader2, FileText } from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface Formato {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  url: string;
  tipo_archivo: string | null;
  activo: boolean;
  created_at: string;
  created_by: string | null;
}

export default function FormatosPage() {
  const [formatos, setFormatos] = useState<Formato[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const { msg, flash } = useFlashMessage(2500);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    setUserEmail(localStorage.getItem("userEmail") || "");
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const { data, error } = await supabase
      .from("formatos_plantillas")
      .select("*")
      .eq("activo", true)
      .order("categoria")
      .order("nombre");
    if (error) flash("err", error.message);
    setFormatos((data || []) as Formato[]);
    setLoading(false);
  }

  async function subirArchivo(id: string, file: File) {
    setUploading(id);
    const path = `formatos/${id}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("expedientes").upload(path, file, { upsert: true });
    if (upErr) {
      alert("Error al subir: " + upErr.message);
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("expedientes").getPublicUrl(path);
    const ext = file.name.split(".").pop()?.toLowerCase() || null;
    const { error: updErr } = await supabase
      .from("formatos_plantillas")
      .update({ url: urlData.publicUrl, tipo_archivo: ext, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updErr) flash("err", updErr.message);
    else flash("ok", "Formato actualizado");
    setUploading(null);
    cargar();
  }

  async function crearNuevo() {
    const nombre = prompt("Nombre del formato:");
    if (!nombre?.trim()) { flash("err","Falta el nombre del formato"); return; }
    const descripcion = prompt("Descripcion breve:") || "";
    const categoria = prompt("Categoria (LABORAL, ADMINISTRATIVO, OBRA, GENERAL):", "LABORAL")?.toUpperCase() || "GENERAL";
    const { error } = await supabase.from("formatos_plantillas").insert({
      nombre: nombre.trim(),
      descripcion: descripcion || null,
      categoria,
      url: "",
      created_by: userEmail || null,
    });
    if (error) flash("err", error.message);
    else { flash("ok", "Formato creado"); cargar(); }
  }

  async function eliminar(id: string, nombre: string) {
    if (!confirm(`Eliminar formato "${nombre}"?`)) return;
    const { error } = await supabase.from("formatos_plantillas").update({ activo: false }).eq("id", id);
    if (error) flash("err", error.message);
    else { flash("ok", "Eliminado"); cargar(); }
  }

  const grupos = formatos.reduce((acc, f) => {
    (acc[f.categoria] = acc[f.categoria] || []).push(f);
    return acc;
  }, {} as Record<string, Formato[]>);

  return (
    <div className="aria-bg-canon h-full overflow-y-auto p-6 pb-12 space-y-5">
      <FlashBanner msg={msg} />
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/administracion" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FilePlus2 className="w-7 h-7 text-aria-accent" /> Formatos Plantilla
          </h1>
          <p className="text-xs text-[#7f93b0]">Plantillas descargables de uso interno (Vacaciones, Permisos, Prestamos, etc.)</p>
        </div>
        <button onClick={crearNuevo} className="px-4 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full text-sm flex items-center gap-2">
          + Nuevo formato
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-aria-accent" /></div>
      ) : Object.keys(grupos).length === 0 ? (
        <div className="text-center py-12 text-[#7f93b0]">No hay formatos. Da de alta el primero.</div>
      ) : (
        Object.entries(grupos).map(([categoria, items]) => (
          <div key={categoria} className="rounded-xl bg-white/[0.04] border border-white/[0.08] p-5">
            <h2 className="text-sm font-bold text-aria-accent uppercase tracking-wider mb-3">{categoria}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map(f => (
                <div key={f.id} className="rounded-lg bg-black/30 border border-white/[0.05] p-4 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <FileText className="w-5 h-5 text-aria-accent flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate" title={f.nombre}>{f.nombre}</h3>
                      {f.descripcion && <p className="text-xs text-[#7f93b0] mt-0.5">{f.descripcion}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noopener noreferrer"
                        className="flex-1 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded text-xs font-medium flex items-center justify-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Descargar {f.tipo_archivo ? `(.${f.tipo_archivo})` : ""}
                      </a>
                    ) : (
                      <span className="flex-1 text-center text-[10px] text-amber-300 italic">Sin archivo (sube uno)</span>
                    )}
                    <label className="px-3 py-1.5 bg-aria-primary-light text-aria-accent rounded text-xs font-medium cursor-pointer hover:bg-aria-primary-hover/30 flex items-center gap-1.5">
                      {uploading === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {uploading === f.id ? "Subiendo..." : (f.url ? "Reemplazar" : "Subir")}
                      <input type="file" accept=".pdf,.docx,.doc,.xlsx,.xls,.txt" className="hidden"
                        onChange={(e) => { const fi = e.target.files?.[0]; if (fi) subirArchivo(f.id, fi); }} />
                    </label>
                    <button onClick={() => eliminar(f.id, f.nombre)} title="Eliminar"
                      className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <div className="rounded-xl bg-aria-accent-bg border border-aria-accent/30 p-4 text-xs text-[#7f93b0]">
        <p className="text-aria-accent font-medium mb-1">Notas</p>
        <p>Los formatos se guardan en el bucket <code className="text-white">expedientes/formatos/</code>. Cualquier usuario con acceso a Administracion puede subir, reemplazar o eliminar (eliminar es soft-delete, queda activo=false).</p>
      </div>
    </div>
  );
}
