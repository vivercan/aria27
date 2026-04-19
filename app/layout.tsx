import type { Metadata, Viewport } from "next";
import "./globals.css"; // Aquí SÍ funciona la importación

export const metadata: Metadata = {
  title: "Aria27 ERP",
  description: "Sistema de Gestión Integral con Zoho y Supabase",
};

// 18-Abr-2026: responsive mobile — viewport-fit cover para Android Chrome y
// safe-area iOS (beneficio gratis aunque Android sea el target primario).
// themeColor refleja --aria-bg (Steel Corporate) en barra URL del navegador.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0a1628",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-[#040810] text-white selection:bg-slate-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
