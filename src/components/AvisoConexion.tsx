"use client";
/** Aviso cuando el navegador no alcanza la base directo y las consultas van por el servidor (23-Oct-2026). */
import { useEffect, useState } from "react";
import { alCambiarModo, enModoRespaldo } from "@/lib/supabase-respaldo";

export default function AvisoConexion() {
  const [respaldo, setRespaldo] = useState(false);
  useEffect(() => { setRespaldo(enModoRespaldo()); return alCambiarModo(setRespaldo); }, []);
  if (!respaldo) return null;
  return (
    <div role="status" className="fixed left-1/2 -translate-x-1/2 top-2 z-[9999] max-w-[92vw] rounded-xl bg-[#b45309] px-4 py-2 text-[13px] font-semibold text-white shadow-lg">
      Tu red no deja conectar directo con la base. ARIA sigue funcionando por el servidor (un poco más lento). Avísale a sistemas.
    </div>
  );
}
