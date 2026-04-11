"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Hook compartido para cargar centros de trabajo (obras) desde Supabase.
 *
 * Reemplaza las ~28 consultas sueltas a centros_trabajo dispersas por el ERP.
 * Siempre hace JOIN con la tabla base `centros_trabajo`, NUNCA con VIEWs.
 *
 * Uso básico (dropdown):
 *   const { obras, loading } = useObrasCatalogo();
 *
 * Solo activas:
 *   const { obras, loading } = useObrasCatalogo({ soloActivas: true });
 *
 * Columnas extendidas:
 *   const { obras, loading } = useObrasCatalogo({ columns: "*" });
 */

export interface ObraCatalogo {
  id: string;
  nombre: string;
  [key: string]: any; // columnas extra si se piden con columns: "*"
}

interface UseObrasCatalogoOptions {
  /** Si true, filtra solo centros con activo=true (default: false) */
  soloActivas?: boolean;
  /** Columnas a seleccionar (default: "id, nombre") */
  columns?: string;
  /** Si false, no carga automáticamente al montar (default: true) */
  autoLoad?: boolean;
}

export function useObrasCatalogo(options: UseObrasCatalogoOptions = {}) {
  const { soloActivas = false, columns = "id, nombre", autoLoad = true } = options;
  const [obras, setObras] = useState<ObraCatalogo[]>([]);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("centros_trabajo")
      .select(columns)
      .order("nombre");

    if (soloActivas) {
      query = query.eq("activo", true);
    }

    const { data, error: err } = await query;

    if (err) {
      setError(err.message);
      setObras([]);
    } else {
      setObras((data as unknown as ObraCatalogo[]) || []);
    }
    setLoading(false);
  }, [soloActivas, columns]);

  useEffect(() => {
    if (autoLoad) load();
  }, [autoLoad, load]);

  return { obras, loading, error, reload: load } as const;
}

export default useObrasCatalogo;
