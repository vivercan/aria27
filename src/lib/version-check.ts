/** Si ya se publicó una versión nueva, recarga una vez (evita que el teléfono se quede con pantallas viejas) · 11-Oct-2026 */
export async function revisarVersion(): Promise<boolean> {
  const mia = process.env.NEXT_PUBLIC_BUILD || "dev";
  if (mia === "dev" || typeof window === "undefined" || !navigator.onLine) return false;
  try {
    const r = await fetch("/api/version", { cache: "no-store", credentials: "omit" });
    if (!r.ok) return false;
    const { v } = await r.json() as { v?: string };
    if (!v || v === "dev" || v === mia) return false;
    if (sessionStorage.getItem("aria:recargado") === v) return false; // ya lo intentamos: no ciclar
    sessionStorage.setItem("aria:recargado", v);
    window.location.reload();
    return true;
  } catch { return false; }
}
