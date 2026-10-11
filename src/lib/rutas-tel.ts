/**
 * Qué pantallas existen en el teléfono (Doménica 27) · 11-Oct-2026
 * - RUTAS_TEL: diseñadas para el celular.
 * - EQUIV_TEL: pantallas viejas que en el celular se abren en su equivalente Doménica.
 * - Todo lo demás de /dashboard en el celular muestra "Esta pantalla es de computadora" (con opción de abrirla igual con ?web=1).
 * OJO: app/layout.tsx (script antes de React) usa estas mismas listas vía JSON.stringify.
 */
export const RUTAS_TEL = [
  "/dashboard/campo", "/dashboard/actividades", "/dashboard/domenica", "/dashboard/domingo",
  "/dashboard/requisiciones/requisiciones/nuevo", "/dashboard/requisiciones/requisiciones/estatus", "/dashboard/requisiciones/requisiciones/entrega",
  "/dashboard/talento/usuarios", "/dashboard/talento/personal", "/dashboard/talento/checadas", "/dashboard/requisiciones/proveedores", "/dashboard/requisiciones/productos",
  "/dashboard/obras/catalogo", "/dashboard/obras/tareas", "/dashboard/talento/tareas",
];
export const EQUIV_TEL: Record<string, string> = {
  "/dashboard/obras/bitacora": "/dashboard/domenica/obras",
  "/dashboard/obras/fotos": "/dashboard/domenica/obras",
  "/dashboard/obras/avance": "/dashboard/domenica/obras",
  "/dashboard/obras/panel": "/dashboard/domenica/obras",
  "/dashboard/obras/planos": "/dashboard/domenica/planos",
  "/dashboard/requisiciones/requisiciones/autorizar": "/dashboard/campo/autorizar",
  "/dashboard/requisiciones/requisiciones": "/dashboard/requisiciones/requisiciones/estatus",
  "/dashboard/requisiciones/entregas": "/dashboard/campo/evidencia",
  "/dashboard/talento/checadas/incompletas": "/dashboard/talento/checadas",
};
export const limpiarRuta = (p: string) => (p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p);
export const esRutaTel = (p: string) => { const l = limpiarRuta(p || ""); return RUTAS_TEL.some(r => l === r || l.startsWith(r + "/") || (r.endsWith("/entrega") && l.startsWith(r))); };
/** En el celular y fuera de ?web=1: ¿esta ruta debe mostrar el aviso de "pantalla de computadora"? */
export const esPantallaCompu = (p: string) => { const l = limpiarRuta(p || ""); return l.startsWith("/dashboard") && !esRutaTel(l) && !EQUIV_TEL[l]; };
