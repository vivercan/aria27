"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, ScrollText, Upload, Loader2, Download,
  Trash2, CheckCircle2, AlertTriangle, Clock, FileText, X
} from "lucide-react";

const OPINIONES = [
  { key: "imss", label: "IMSS", desc: "Opinión de cumplimiento del Instituto Mexicano del Seguro Social.", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { key: "infonavit", label: "Infonavit", desc: "Opinión de cumplimiento de aportaciones patronales.", color: "text-blue-400", bg: "bg-blue-500/10" },
  { key: "sat", label: "SAT (32-D)", desc: "Opinión de cumplimiento de obligaciones fiscales.", color: "text-amber-400", bg: "bg-amber-500/10" },
  { key: "sar", label: "SAR", desc: "Opinión de cumplimiento del Sistema de Ahorro para el Retiro.", color: "text-purple-400", bg: "bg-purple-500/10" },
];

interface OpinionDoc {
  id: string;
  tipo: string;
  nombre: string;
  url: string;
  vigencia: string | null;
  created_at: string;
}

export default function OpinionesPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<OpinionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    try {
      const { data } = await supabase
        .from("expedientes_archivos")
        .select("*")
        .eq("carpeta_id", "opiniones_cumplimiento")
        .order("created_at", { ascending: false });
      setDocs((data || []) as OpinionDoc[]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function triggerUpload(tipo: string) {
    setUploadTarget(tipo);
    fileRef.current?.click();
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    setUploading(uploadTarget);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const filePath = `opiniones/${uploadTarget}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("documentos")
        .upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(filePath);

      const vigencia = new Date();
      vigencia.setDate(vigencia.getDate() + 30);

      const { error: insertErr } = await supabase.from("expedientes_archivos").insert({
        carpeta_id: "opiniones_cumplimiento",
        tipo: uploadTarget,
        nombre: `${OPINIONES.find(o => o.key === uploadTarget)?.label || uploadTarget} - ${file.name}`,
        url: urlData.publicUrl,
        vigencia: vigencia.toISOString().split("T")[0],
      });
      if (insertErr) throw insertErr;

      await loadDocs();
    } catch (err: any) {
      console.error("Error subiendo:", err);
      alert("Error al subir: " + (err?.message || "desconocido"));
    } finally {
      setUploading(null);
      setUploadTarget(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function deleteDoc(doc: OpinionDoc) {
    if (!confirm(`¿Eliminar ${doc.nombre}?`)) return;
    setDeleting(doc.id);
    try {
      await supabase.from("expedientes_archivos").delete().eq("id", doc.id);
      await loadDocs();
    } catch (e) { console.error(e); }
    finally { setDeleting(null); }
  }

  function getDocForType(tipo: string): OpinionDoc | undefined {
    return docs.find(d => d.tipo === tipo);
  }

  function getStatus(doc: OpinionDoc | undefined): { label: string; color: string; icon: any } {
    if (!doc) return { label: "Sin documento", color: "text-red-400", icon: AlertTriangle };
    if (doc.vigencia) {
      const today = new Date();
      const vig = new Date(doc.vigencia);
      if (vig < today) return { label: "Vencida", color: "text-red-400", icon: AlertTriangle };
      const diff = Math.ceil((vig.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 15) return { label: `Vence en ${diff}d`, color: "text-amber-400", icon: Clock };
      return { label: "Vigente", color: "text-emerald-400", icon: CheckCircle2 };
    }
    return { label: "Subido", color: "text-blue-400", icon: FileText };
  }

  return (
    <div className="space-y-6">
      <input type="file" ref={fileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileUpload} />

      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div>
        <h1 className="text-2xl font-bold text-white">Opiniones de Cumplimiento</h1>
        <p className="text-slate-400 text-sm">IMSS, Infonavit, SAT, SAR — sube y controla vigencias</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {OPINIONES.map(op => {
          const doc = getDocForType(op.key);
          const status = getStatus(doc);
          return (
            <div key={op.key} className={`p-3 rounded-xl border ${doc ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-red-500/20 bg-red-500/[0.03]"}`}>
              <div className="flex items-center gap-2">
                <status.icon className={`w-4 h-4 ${status.color}`} />
                <span className="text-sm font-medium text-white">{op.label}</span>
              </div>
              <p className={`text-xs mt-1 ${status.color}`}>{status.label}</p>
            </div>
          );
        })}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {OPINIONES.map(op => {
            const doc = getDocForType(op.key);
            const status = getStatus(doc);
            const isUploading = uploading === op.key;

            return (
              <div key={op.key} className="p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${op.bg}`}>
                      <ScrollText className={`w-5 h-5 ${op.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white">{op.label}</h3>
                      <p className="text-xs text-slate-500 mt-1">{op.desc}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <status.icon className={`w-3 h-3 ${status.color}`} />
                        <span className={`text-xs ${status.color}`}>{status.label}</span>
                      </div>
                      {doc && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] text-slate-500 truncate">{doc.nombre}</p>
                          {doc.vigencia && (
                            <p className="text-[10px] text-slate-500">Vigencia: {new Date(doc.vigencia).toLocaleDateString("es-MX")}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {doc && (
                      <>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <Download className="w-3.5 h-3.5 text-slate-400" />
                        </a>
                        <button onClick={() => deleteDoc(doc)} disabled={deleting === doc.id}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 transition-colors">
                          {deleting === doc.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            : <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />}
                        </button>
                      </>
                    )}
                    <button onClick={() => triggerUpload(op.key)} disabled={isUploading}
                      className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors">
                      {isUploading
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        : <Upload className="w-3.5 h-3.5 text-blue-400" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm text-amber-300 font-medium">Vigencias estimadas</p>
          <p className="text-xs text-amber-400/70">
            Las vigencias se asignan a 30 días por defecto al subir un documento.
            Para ajustar, sube el documento actualizado cuando obtengas la nueva opinión.
          </p>
        </div>
      </div>
    </div>
  );
}
