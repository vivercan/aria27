"use client";
/** Aviso en el celular para pantallas que son de computadora (Doménica 27 · 11-Oct-2026) */
import Link from "next/link";
import { Monitor } from "lucide-react";

const NOMBRES: [string, string][] = [
  ["/dashboard/finanzas", "Finanzas"], ["/dashboard/talento/nomina", "Nómina"], ["/dashboard/talento", "Recursos Humanos"], ["/dashboard/administracion", "Administración"],
  ["/dashboard/configuracion", "Configuración"], ["/dashboard/admin", "Administración del sistema"], ["/dashboard/reportes", "Reportes"], ["/dashboard/clientes", "Clientes"],
  ["/dashboard/activos", "Activos"], ["/dashboard/combustibles", "Combustibles"], ["/dashboard/obras", "Obras (completo)"], ["/dashboard/requisiciones", "Compras"],
  ["/dashboard/plantillas", "Plantillas de documentos"], ["/dashboard/inbox", "Correo"], ["/dashboard/comunicacion", "Comunicación"], ["/dashboard/ceo", "Panel de dirección"],
  ["/dashboard/carpetas", "Carpetas"], ["/dashboard/import", "Importar"], ["/dashboard/whatsapp", "WhatsApp"],
];
export default function PantallaCompu({ ruta }: { ruta: string }) {
  const nombre = NOMBRES.find(([p]) => ruta.startsWith(p))?.[1] || "Esta sección";
  const abrir = () => { const u = new URL(window.location.href); u.searchParams.set("web", "1"); window.location.href = u.toString(); };
  return (
    <div className="aviso-compu dom-page h-full overflow-y-auto">
      <div className="px-5 pt-10 pb-28 max-w-md mx-auto text-center">
        <span className="mx-auto w-20 h-20 rounded-3xl bg-[#0060c7] flex items-center justify-center"><Monitor className="w-10 h-10 text-white" strokeWidth={2} /></span>
        <h1 className="mt-5 text-[22px] font-bold text-[var(--d-text)]">{nombre} se usa en la computadora</h1>
        <p className="mt-2 text-[15px] text-[var(--d-muted)]">Tiene tablas y capturas grandes que en el teléfono se ven apretadas. Ábrela en aria.jjcrm27.com desde tu computadora.</p>
        <Link href="/dashboard/campo" className="mt-7 block w-full rounded-2xl bg-[#0073ea] py-3.5 text-[16px] font-bold text-white">Ir a Inicio</Link>
        <button type="button" onClick={abrir} className="mt-2 w-full py-3 text-[14px] font-semibold text-[var(--d-link)]">Abrirla aquí de todos modos</button>
      </div>
    </div>
  );
}
