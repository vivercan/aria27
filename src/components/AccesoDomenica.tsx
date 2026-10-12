"use client";
/**
 * Restricciones por usuario iguales en Doménica (teléfono) y en ARIA27 (web) · 12-Oct-2026
 * - GuardaRol: si la herramienta de Doménica no es para tu rol, no se abre aunque escribas la dirección.
 * - useOcultarLigas: dentro de las pantallas no se muestran tarjetas ni ligas a lo que tu usuario no puede abrir.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { getPermissionsFromStorage, type UserPermissions } from "@/lib/permissions";
import { rolPermiteRuta, rutaPermitida } from "@/lib/acceso";

export function useAcceso() {
  const [a, setA] = useState<{ role: string; perms: UserPermissions }>({ role: "", perms: {} });
  useEffect(() => {
    const leer = () => { try { const email = localStorage.getItem("userEmail"); const { role, permissions } = getPermissionsFromStorage(); setA({ role: email ? role : "", perms: permissions }); } catch { /* */ } };
    leer();
    window.addEventListener("aria:perms", leer); window.addEventListener("storage", leer);
    return () => { window.removeEventListener("aria:perms", leer); window.removeEventListener("storage", leer); };
  }, []);
  return a;
}

export function GuardaRol({ ruta, role, children }: { ruta: string; role: string; children: React.ReactNode }) {
  if (!role || rolPermiteRuta(ruta, role)) return <>{children}</>;
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-sm rounded-3xl border border-[var(--d-border,#e2e8f0)] bg-[var(--d-card,#fff)] p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3fb] text-2xl font-black text-[#0073ea]">!</div>
        <h2 className="text-[19px] font-bold text-[var(--d-text,#0f172a)]">Esta herramienta no está en tu rol</h2>
        <p className="mt-2 text-[15px] text-[var(--d-muted,#55657c)]">Si la necesitas, pídela a Administración o RH: se activa en Usuarios.</p>
        <Link href="/dashboard/campo" className="mt-4 inline-flex rounded-2xl bg-[#0073ea] px-5 py-3 text-[15px] font-bold text-white">Ir al inicio</Link>
      </div>
    </div>
  );
}

/** Esconde las ligas internas a pantallas que este usuario no puede abrir (tarjetas de hubs, accesos rápidos, etc.) */
export function useOcultarLigas(selector: string, role: string, perms: UserPermissions, ruta: string) {
  useEffect(() => {
    if (!role) return;
    const raiz = document.querySelector(selector); if (!raiz) return;
    const aplicar = () => {
      raiz.querySelectorAll<HTMLAnchorElement>('a[href^="/dashboard"]').forEach(a => {
        const ok = rutaPermitida(a.getAttribute("href") || "", role, perms);
        if (!ok && a.dataset.sinAcceso !== "1") { a.dataset.sinAcceso = "1"; a.style.display = "none"; a.setAttribute("aria-hidden", "true"); }
        else if (ok && a.dataset.sinAcceso === "1") { delete a.dataset.sinAcceso; a.style.display = ""; a.removeAttribute("aria-hidden"); }
      });
    };
    aplicar();
    const mo = new MutationObserver(() => aplicar());
    mo.observe(raiz, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, [selector, role, perms, ruta]);
}
