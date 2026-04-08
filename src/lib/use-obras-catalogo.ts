"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ObraCatalogo {
  id: string;
  nombre: string;
  estado: string;
}

/**
 * Hook reusable para cargar la fuente única de obras (centros_trabajo).
 * Por defecto excluye CANCELADAS y TERMINADAS para inputs operativos.
 * Pasar { incluirInactivas: true } para incluir todas.
 */
export function useObrasCatalogo(opts: { incluirInactivas?: boolean } = {}) {
  const [obras, setObras] = useState<ObraCatalogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("centros_trabajo")
        .select("id,nombre,estado")
        .order("nombre");
      if (cancel) return;
      const filt = opts.incluirInactivas
        ? (data || [])
        : (data || []).filter((o: any) => o.estado !== "CANCELADA" && o.estado !== "TERMINADA");
      setObras(filt as ObraCatalogo[]);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [opts.incluirInactivas]);

  return { obras, loading, nombres: obras.map(o => o.nombre) };
}
