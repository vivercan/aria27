"use client";
/**
 * "Por revisar" (11-Oct-2026 · JJ): lo que encargaste y ya te contestaron (terminada esperando tu visto bueno, o atorada).
 * Se ve en la app (Inicio, Actividades y un numerito en el menú), en lugar de llegarte por WhatsApp.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type PorRevisar = { id: string; titulo: string; asignado_nombre: string | null; obra: string | null; por_aprobar: boolean | null; motivo_bloqueo: string | null; estatus: string; updated_at: string | null };

export async function cargarPorRevisar(email: string): Promise<PorRevisar[]> {
  const em = String(email || "").toLowerCase(); if (!em) return [];
  const [{ data: a }, { data: b }] = await Promise.all([
    supabase.from("tareas_asignadas").select("id, titulo, asignado_nombre, obra, por_aprobar, motivo_bloqueo, estatus, updated_at").eq("por_aprobar", true).ilike("asignado_por_email", em),
    supabase.from("tareas_asignadas").select("id, titulo, asignado_nombre, obra, por_aprobar, motivo_bloqueo, estatus, updated_at").eq("estatus", "EN_PROGRESO").not("motivo_bloqueo", "is", null).ilike("asignado_por_email", em),
  ]);
  const m = new Map<string, PorRevisar>(); for (const x of [...(a || []), ...(b || [])] as PorRevisar[]) m.set(x.id, x);
  return [...m.values()].sort((x, y) => String(y.updated_at || "").localeCompare(String(x.updated_at || "")));
}

/** Cuántas tienes por revisar; se actualiza sola cada minuto (solo con la pantalla visible) */
export function usePorRevisar(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    const leer = async () => { if (document.visibilityState !== "visible") return; let em = ""; try { em = localStorage.getItem("userEmail") || ""; } catch { /* */ } if (!em) return; const l = await cargarPorRevisar(em).catch(() => []); if (vivo) setN(l.length); };
    leer(); const iv = setInterval(leer, 60_000); const f = () => leer(); window.addEventListener("focus", f); window.addEventListener("dom:revisar", f);
    return () => { vivo = false; clearInterval(iv); window.removeEventListener("focus", f); window.removeEventListener("dom:revisar", f); };
  }, []);
  return n;
}
