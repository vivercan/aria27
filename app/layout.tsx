import type { Metadata, Viewport } from "next";
import "./globals.css"; // Aquí SÍ funciona la importación
import { Plus_Jakarta_Sans } from "next/font/google";

// Doménica 27 (11-Oct-2026): tipografía propia de la app del celular
const fontDom = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], style: ["normal", "italic"], variable: "--font-dom", display: "swap" });

export const metadata: Metadata = {
  title: "Aria27 ERP",
  description: "Sistema de Gestión Integral con Zoho y Supabase",
  // ARIA27 Campo F4: instalable en iPhone/Android (sin service worker en v1)
  manifest: "/manifest.webmanifest",
  applicationName: "ARIA27",
  appleWebApp: { capable: true, title: "Doménica 27", statusBarStyle: "default" },
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

// Misma regla que src/lib/device.ts (isMobileDevice), dom-tema.ts (esRutaDomenica/Movil) y HUBS_WEB, pero corre antes de React.
const MODO_TELEFONO = `(function(){try{var n=navigator,u=n.userAgent||"",t=n.maxTouchPoints||0,w=innerWidth;
var m=(n.userAgentData&&n.userAgentData.mobile)||/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(u)||(/Macintosh/i.test(u)&&t>1)||(matchMedia("(pointer: coarse)").matches&&t>0&&w<900)||w<600;
var p=location.pathname,d=document.documentElement,b=document.body;if(p.length>1&&p.charAt(p.length-1)==="/")p=p.slice(0,-1);
if(!m){return}
d.classList.add("es-tel");
var hubs=["/dashboard","/dashboard/requisiciones","/dashboard/obras","/dashboard/talento","/dashboard/finanzas","/dashboard/activos","/dashboard/administracion","/dashboard/configuracion","/dashboard/comunicacion","/dashboard/reportes","/dashboard/clientes","/dashboard/admin","/dashboard/plantillas"];
if(hubs.indexOf(p)>=0){location.replace("/dashboard/campo");return}
var pre=["/dashboard/campo","/dashboard/actividades","/dashboard/domenica","/dashboard/domingo","/dashboard/requisiciones/requisiciones/nuevo","/dashboard/requisiciones/requisiciones/estatus","/dashboard/requisiciones/requisiciones/entrega","/dashboard/talento/usuarios","/dashboard/talento/personal","/dashboard/talento/checadas","/dashboard/requisiciones/proveedores","/dashboard/requisiciones/productos","/dashboard/obras/catalogo"],dom=false;if(/[?&]web=1(&|$)/.test(location.search)){d.classList.add("ver-web");pre=pre.slice(0,4)}for(var i=0;i<pre.length;i++){if(p.indexOf(pre[i])===0)dom=true}
if(dom){b.classList.add("dom-ruta");if(localStorage.getItem("dom:tema")==="oscuro")b.classList.add("dom-oscuro")}
}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={fontDom.variable} suppressHydrationWarning>
      <body className="antialiased bg-[#040810] text-white selection:bg-slate-600 selection:text-white" suppressHydrationWarning>
        {/* 11-Oct-2026: antes de pintar nada, el teléfono ya sabe que es teléfono (sin saltos de diseño al entrar ni al cambiar de pantalla) */}
        <script dangerouslySetInnerHTML={{ __html: MODO_TELEFONO }} />
        {children}
      </body>
    </html>
  );
}
