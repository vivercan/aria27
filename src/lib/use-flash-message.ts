import { useState, useCallback } from "react";

/**
 * Hook estandarizado para flash messages en ARIA27.
 *
 * Uso:
 *   const { msg, flash } = useFlashMessage();
 *   flash("ok", "Guardado correctamente");
 *   flash("err", "Error: " + (error as {message?: string})?.message || "Error");
 *
 * En JSX:
 *   {msg && <FlashBanner msg={msg} />}
 *
 * O inline:
 *   {msg && (
 *     <div className={`px-4 py-2 rounded-lg text-sm ${
 *       msg.tipo === "ok" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
 *     }`}>{msg.texto}</div>
 *   )}
 */

export interface FlashMsg {
  tipo: "ok" | "err";
  texto: string;
}

export function useFlashMessage(timeout = 3000) {
  const [msg, setMsg] = useState<FlashMsg | null>(null);

  const flash = useCallback(
    (tipo: "ok" | "err", texto: string) => {
      setMsg({ tipo, texto });
      setTimeout(() => setMsg(null), timeout);
    },
    [timeout]
  );

  const clear = useCallback(() => setMsg(null), []);

  return { msg, flash, clear } as const;
}

export default useFlashMessage;
