"use client";
/**
 * /dashboard/domenica/planos/[id]/comparar?con=otro — Qué cambió entre dos versiones del plano (Doménica 27 · 11-Oct-2026)
 * Deslizar o encimar (transparencia) la versión anterior sobre la vigente.
 */
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Comparar from "@/components/domenica/Comparar";
import { api } from "@/components/domenica/ui";
import { pdfAImagen } from "@/lib/pdf-imagen";

type Ver = { id: string; revision: number; url: string; tipo_archivo: string | null; actual: boolean; fecha: string };
const imagen = async (v: Ver) => (v.tipo_archivo === "PDF" || v.url.toLowerCase().split("?")[0].endsWith(".pdf")) ? await pdfAImagen(v.url) : v.url;

export default function CompararPlanosPage() { return <Suspense fallback={null}><CompararPlanos /></Suspense>; }

function CompararPlanos() {
  const { id } = useParams<{ id: string }>(); const con = useSearchParams().get("con") || "";
  const [par, setPar] = useState<{ a: { url: string; label: string }; b: { url: string; label: string } } | null>(null); const [err, setErr] = useState("");
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const { versiones } = await api<{ versiones: Ver[] }>(`/api/planos/${id}/version`);
        const x = versiones.find(v => v.id === id); const y = versiones.find(v => v.id === con);
        if (!x || !y) throw new Error("No encontré las dos versiones");
        const [viejo, nuevo] = x.revision < y.revision ? [x, y] : [y, x];
        const [ia, ib] = await Promise.all([imagen(viejo), imagen(nuevo)]);
        if (vivo) setPar({ a: { url: ia, label: `Rev ${viejo.revision}` }, b: { url: ib, label: `Rev ${nuevo.revision}` } });
      } catch (e) { if (vivo) setErr((e as Error).message); }
    })();
    return () => { vivo = false; };
  }, [id, con]);
  return (
    <div className="dom-page h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-28 max-w-3xl mx-auto">
        <Link href={`/dashboard/domenica/planos/${id}`} className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--d-link)]"><ArrowLeft className="w-4 h-4" />Plano</Link>
        <h1 className="mt-2 text-[22px] font-bold text-[var(--d-text)]">¿Qué cambió?</h1>
        <p className="text-[13px] text-[var(--d-muted)] mb-4">Desliza la barra o usa “Encimar” para ver las diferencias entre versiones.</p>
        {err ? <div className="dom-card rounded-2xl p-5 text-center text-[var(--d-muted)]">{err}</div> : !par ? <div className="py-16 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--d-muted)]" /></div>
          : <Comparar antes={par.a} ahora={par.b} />}
      </div>
    </div>
  );
}
