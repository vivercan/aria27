"use client";
/**
 * 10-Oct-2026: Tareas se unifico en /dashboard/actividades (tablero tipo Monday sobre tareas_asignadas,
 * la misma fuente que contesta el bot de WhatsApp). Esta ruta solo redirige, conservando ?id= / ?nueva=1
 * (la plantilla de WhatsApp aria_actividad_asignada abre /dashboard/obras/tareas?id=<id>).
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirigeActividades() {
  const router = useRouter();
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const id = sp.get("id") || sp.get("abrir");
    const q = id ? `?abrir=${encodeURIComponent(id)}` : sp.get("nueva") === "1" ? "?nueva=1" : "";
    router.replace(`/dashboard/actividades${q}`);
  }, [router]);
  return <div className="p-8 text-center text-sm text-[#7f93b0]">Abriendo Actividades…</div>;
}
