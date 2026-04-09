import type { Metadata } from "next";
import "./globals.css"; // Aquí SÍ funciona la importación

export const metadata: Metadata = {
  title: "Aria27 ERP",
  description: "Sistema de Gestión Integral con Zoho y Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-950 text-slate-100 selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
