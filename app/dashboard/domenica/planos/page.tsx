"use client";
/** /dashboard/domenica/planos — Planos de cada obra para marcar pendientes encima (Doménica 27 · 11-Oct-2026) */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Upload, Loader2, ChevronRight, FileText } from "lucide-react";
import { IcoPlano } from "@/components/domenica/IconosObra";
import { DomHeader, Hoja, api, useAviso, useBase, etiqueta, campo, boton } from "@/components/domenica/ui";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { supabase } from "@/lib/supabase";

type Plano = { id: string; obra_nombre: string | null; nombre: string; disciplina: string | null; url: string; tipo_archivo: string | null; abiertas: number };

export default function PlanosPage() {
  const base = useBase(); const { flash, nodo } = useAviso();
  const [lista, setLista] = useState<Plano[] | null>(null); const [obra, setObra] = useState(""); const [subir, setSubir] = useState(false);
  useEffect(() => { try { const q = new URLSearchParams(window.location.search).get("obra"); if (q) setObra(q); } catch { /* */ } }, []);
  const cargar = useCallback(async () => { try { const r = await api<{ planos: Plano[] }>(`/api/planos${obra ? `?obra_id=${obra}` : ""}`); setLista(r.planos); } catch (e) { flash("err", (e as Error).message); setLista([]); } }, [obra, flash]);
  useEffect(() => { cargar(); }, [cargar]);
  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 md:px-6 pt-4 pb-28 md:pb-10 max-w-4xl mx-auto">
        <DomHeader icon={IcoPlano} from="#0073ea" titulo="Planos" desc="Toca un punto del plano para dejar un pendiente, una nota o una foto justo donde está."
          accion={<button onClick={() => setSubir(true)} className={boton}><Upload className="w-4 h-4" />Subir</button>} />
        <select value={obra} onChange={e => setObra(e.target.value)} className={`${campo} mt-4`}><option value="">Todas las obras</option>{base.obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select>
        {lista === null ? <div className="mt-4"><Esqueleto filas={3} alto={84} /></div> : lista.length === 0 ? (
          <div className="mt-5 dom-card rounded-3xl"><Vacio ico={IcoPlano} color="#0073ea" titulo="Aún no hay planos" texto="Sube el plano como foto o PDF y empieza a marcar pendientes encima." accion={{ label: "Subir un plano", onClick: () => setSubir(true) }} /></div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{lista.map((p, i) => (
            <Link key={p.id} href={`/dashboard/domenica/planos/${p.id}`} className="dom-card dom-in rounded-2xl overflow-hidden" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
              <div className="h-32 bg-[var(--d-card-2)] flex items-center justify-center overflow-hidden">{p.tipo_archivo === "PDF" ? <FileText className="w-10 h-10 text-[var(--d-muted)]" /> : <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />}</div>
              <div className="p-3 flex items-center gap-2"><div className="flex-1 min-w-0"><div className="text-[15px] font-bold text-[var(--d-text)] truncate">{p.nombre}</div><div className="text-[12px] text-[var(--d-muted)] truncate">{p.obra_nombre}{p.disciplina ? ` · ${p.disciplina}` : ""}</div></div>
                {p.abiertas > 0 && <span className="shrink-0 rounded-full bg-[#d0304a] px-2.5 py-1 text-[11px] font-bold text-white">{p.abiertas}</span>}<ChevronRight className="w-4 h-4 text-[var(--d-faint)]" /></div>
            </Link>))}</div>)}
      </div>
      {subir && <Subir obras={base.obras} obraInicial={obra} onClose={() => setSubir(false)} onSaved={() => { setSubir(false); cargar(); flash("ok", "Plano listo para marcar"); }} flash={flash} />}
      {nodo}
    </div>
  );
}

function Subir({ obras, obraInicial, onClose, onSaved, flash }: { obras: { id: string; nombre: string }[]; obraInicial: string; onClose: () => void; onSaved: () => void; flash: (t: "ok" | "err", m: string) => void }) {
  const [obra, setObra] = useState(obraInicial); const [nombre, setNombre] = useState(""); const [disc, setDisc] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const guardar = async () => {
    if (!file) { flash("err", "Elige el archivo del plano"); return; }
    if (file.size > 25 * 1024 * 1024) { flash("err", "El archivo pesa más de 25 MB"); return; }
    setBusy(true);
    try {
      const ext = file.type === "application/pdf" ? "pdf" : (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `planos/${obra || "sin-obra"}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("expedientes").upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) throw new Error(error.message);
      const url = supabase.storage.from("expedientes").getPublicUrl(path).data.publicUrl;
      await api("/api/planos", "POST", { obra_id: obra, nombre: nombre || file.name.replace(/\.[^.]+$/, ""), disciplina: disc, url });
      onSaved();
    } catch (e) { flash("err", (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Hoja titulo="Subir plano" onClose={onClose} pie={<button onClick={guardar} disabled={busy} className={`${boton} w-full py-3`}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}Subir</button>}>
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
      <button type="button" onClick={() => ref.current?.click()} className={`w-full rounded-2xl border-2 border-dashed px-4 py-6 text-center ${file ? "border-[#00953f]" : "border-[var(--d-border)]"}`}><div className="flex justify-center"><IcoPlano className="w-9 h-9" color="#0073ea" /></div><div className="mt-1 font-semibold text-[var(--d-text)]">{file ? file.name : "Elige el plano (foto o PDF)"}</div></button>
      <label className="block mt-4"><span className={etiqueta}>Obra</span><select value={obra} onChange={e => setObra(e.target.value)} className={campo}><option value="">Elige…</option>{obras.map(o => <option key={o.id} value={o.id}>{o.nombre}</option>)}</select></label>
      <label className="block mt-3"><span className={etiqueta}>Nombre</span><input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Planta baja arquitectónico" className={campo} /></label>
      <div className="mt-3"><span className={etiqueta}>Tipo (opcional)</span><div className="mt-1 flex flex-wrap gap-2">{["Arquitectónico", "Estructural", "Eléctrico", "Hidráulico", "Sanitario"].map(d => <button key={d} type="button" onClick={() => setDisc(disc === d ? "" : d)} className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${disc === d ? "bg-[#0073ea] text-white" : "bg-[var(--d-card-2)] text-[var(--d-text-2)]"}`}>{d}</button>)}</div></div>
    </Hoja>
  );
}
