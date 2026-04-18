/**
 * useFlashMessage — Hook canónico de flash messages para ARIA27.
 * PL34 17-Abr-2026: consolidación. Antes existían dos hooks con el mismo nombre
 * y APIs distintas ("success"/"error" en src/hooks vs "ok"/"err" en src/lib).
 * La API "ok"/"err" era la dominante (48 archivos vs 4), por lo que queda canónica.
 *
 * Uso:
 *   import { useFlashMessage } from "@/hooks/useFlashMessage";
 *   const { msg, flash, clear } = useFlashMessage();
 *   flash("ok", "Guardado correctamente");
 *   flash("err", "Error: " + e.message);
 *
 *   {msg && <FlashBanner msg={msg} />}
 */
"use client";
import { useState, useCallback, useRef, useEffect } from "react";

export type FlashTipo = "ok" | "err";

export interface FlashMsg {
  tipo: FlashTipo;
  texto: string;
}

export interface UseFlashMessageReturn {
  msg: FlashMsg | null;
  flash: (tipo: FlashTipo, texto: string) => void;
  clear: () => void;
}

export function useFlashMessage(timeout = 3000): UseFlashMessageReturn {
  const [msg, setMsg] = useState<FlashMsg | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMsg(null);
  }, []);

  const flash = useCallback(
    (tipo: FlashTipo, texto: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMsg({ tipo, texto });
      timerRef.current = setTimeout(() => {
        setMsg(null);
        timerRef.current = null;
      }, timeout);
    },
    [timeout]
  );

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { msg, flash, clear };
}

export default useFlashMessage;
