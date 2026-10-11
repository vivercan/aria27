import type { Metadata, Viewport } from "next";
import "./globals.css"; // Aquí SÍ funciona la importación

export const metadata: Metadata = {
  title: "Aria27 ERP",
  description: "Sistema de Gestión Integral con Zoho y Supabase",
  // ARIA27 Campo F4: instalable en iPhone/Android (sin service worker en v1)
  manifest: "/manifest.webmanifest",
  applicationName: "ARIA27",
  appleWebApp: { capable: true, title: "Doménica.27", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }], apple: "/icons/domenica-apple-180.png" },
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
