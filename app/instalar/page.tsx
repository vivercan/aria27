/**
 * /instalar — página pública para instalar Doménica 27 (16-Nov-2026 · JJ)
 * Una sola liga para mandar por correo o WhatsApp: en Android baja el APK, en iPhone explica los 3 pasos de Safari.
 * No pide sesión: solo instala. Para entrar siguen necesitando su correo y contraseña.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instalar Doménica 27",
  description: "Instala Doménica 27 en tu teléfono: solicitudes, actividades y entregas de Grupo Constructor Urbano Avante.",
};

const paso = (n: number, t: string) => (
  <li key={n} className="flex gap-3 items-start">
    <span className="shrink-0 w-7 h-7 rounded-full bg-white/15 text-white font-bold text-[14px] flex items-center justify-center">{n}</span>
    <span className="text-[15px] leading-snug text-white/90">{t}</span>
  </li>
);

export default function InstalarPage() {
  return (
    <main className="min-h-dvh bg-[#0b1220] text-white px-5 py-10">
      <div className="mx-auto max-w-md">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/domenica-192.png" alt="" width={64} height={64} className="rounded-2xl" />
          <div>
            <h1 className="text-[26px] font-bold leading-tight">Doménica 27</h1>
            <p className="text-[14px] text-white/70">Grupo Constructor Urbano Avante</p>
          </div>
        </div>

        <p className="mt-5 text-[15px] text-white/80">Tus solicitudes, actividades y entregas desde el celular. Instálala una vez y queda con su ícono, como cualquier app.</p>

        <section className="mt-7 rounded-2xl bg-[#0060c7] p-5">
          <h2 className="text-[18px] font-bold">Android</h2>
          <a href="/app/Domenica27.apk" download className="mt-3 block w-full rounded-xl bg-white py-4 text-center text-[16px] font-bold text-[#0060c7]">Descargar e instalar</a>
          <ol className="mt-4 space-y-2.5">
            {paso(1, "Toca el botón de arriba.")}
            {paso(2, "Abre el archivo que se descargó.")}
            {paso(3, "Si pregunta si permites instalar desde aquí, acepta.")}
            {paso(4, "Entra con tu correo y contraseña.")}
          </ol>
        </section>

        <section className="mt-4 rounded-2xl bg-[#1f2a3d] p-5">
          <h2 className="text-[18px] font-bold">iPhone</h2>
          <p className="mt-1 text-[14px] text-white/70">Apple no permite instalar con un archivo. Se agrega desde Safari:</p>
          <ol className="mt-3 space-y-2.5">
            {paso(1, "Abre aria.jjcrm27.com en Safari (no en Chrome).")}
            {paso(2, "Toca el botón de Compartir, el cuadrito con la flecha hacia arriba.")}
            {paso(3, "Baja y elige \"Agregar a pantalla de inicio\".")}
            {paso(4, "Queda el ícono de Doménica. Ábrelo y entra con tu correo.")}
          </ol>
        </section>

        <p className="mt-7 text-center text-[13px] text-white/50">¿Problemas para instalar? Escríbele a sistemas.</p>
      </div>
    </main>
  );
}
