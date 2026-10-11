"use client";
/** Aviso de "sin señal" + cuántas cosas esperan para mandarse (Doménica 27 · 11-Oct-2026). Se manda solo al volver la señal. */
import { useEffect, useState } from "react";
import { IcoSinSenal } from "@/components/domenica/IconosObra";
import { EVENTO_COLA, enviarPendientes, pendientes } from "@/lib/cola-offline";

export default function SinSenal() {
  const [enLinea, setEnLinea] = useState(true); const [n, setN] = useState(0); const [mandado, setMandado] = useState(0);
  useEffect(() => {
    const contar = () => { pendientes().then(p => setN(p.length)).catch(() => {}); };
    const alVolver = async () => { setEnLinea(true); const k = await enviarPendientes(); if (k) { setMandado(k); setTimeout(() => setMandado(0), 4000); } contar(); };
    const alPerder = () => setEnLinea(false);
    setEnLinea(navigator.onLine); contar(); if (navigator.onLine) alVolver();
    window.addEventListener("online", alVolver); window.addEventListener("offline", alPerder); window.addEventListener(EVENTO_COLA, contar);
    const t = setInterval(() => { if (navigator.onLine) enviarPendientes().then(contar); }, 60_000);
    return () => { window.removeEventListener("online", alVolver); window.removeEventListener("offline", alPerder); window.removeEventListener(EVENTO_COLA, contar); clearInterval(t); };
  }, []);
  if (enLinea && !n && !mandado) return null;
  const txt = mandado ? `Listo: se mandó lo que guardaste sin señal (${mandado})` : !enLinea ? `Sin señal. Sigue trabajando: ${n ? `${n} guardado${n === 1 ? "" : "s"} en el teléfono` : "lo que hagas se guarda"} y se manda solo.` : `${n} por mandar… en cuanto haya buena señal`;
  return (
    <div className="md:hidden fixed left-3 right-3 z-40 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 text-[13px] font-semibold text-white shadow-lg" style={{ bottom: "calc(4.9rem + env(safe-area-inset-bottom))", background: mandado ? "#3cde01" : "#0f172a" }} role="status">
      <IcoSinSenal className="w-5 h-5 shrink-0" color="#fff" /><span className="flex-1">{txt}</span>
    </div>
  );
}
