/**
 * src/lib/email-templates.ts
 *
 * Helpers centralizados para el branding de todos los emails transaccionales
 * de ARIA27. Devuelven HTML listo para inyectar como header/footer.
 *
 * 22-Abr-2026: nuevo branding pedido por JJ.
 * - Titulo ARIA en gris claro gradient sobre navy oscuro (look Infinity Loop)
 * - Slogan: infinity INFINITY LOOP + OPERATIONS OS
 * - Linea final: GRUPO CONSTRUCTOR URBANO AVANTE
 * - Header compacto (padding reducido)
 * - max-width del email subio a 780px (mas ancho en web, mobile sigue OK)
 *
 * NOTA: email clients (Outlook, Gmail) son restrictivos. No usamos
 * background-clip, SVG ni webfonts. Solo color solido + gradient basico.
 */

/**
 * Header canonico ARIA para TODOS los emails transaccionales.
 *
 * @param subtitle - texto gris abajo del logo (ej. "ARIA27 ERP", "Nueva Requisicion")
 */
export function ariaEmailHeader(subtitle: string = "ARIA27 ERP"): string {
  return `<div style="background:linear-gradient(155deg,#2C3E50 0%,#34495E 100%);padding:22px 20px 18px;text-align:center;border-bottom:3px solid #1E3E7A">
  <div style="font-size:44px;font-weight:900;letter-spacing:8px;color:#E0E0E0;line-height:1;text-shadow:0 1px 2px rgba(0,0,0,0.3)">ARIA</div>
  <div style="font-size:9px;color:#B0BEC5;letter-spacing:2.5px;margin-top:6px;font-weight:500">&infin; INFINITY LOOP &middot; OPERATIONS OS</div>
  <div style="font-size:10px;color:#90A4AE;letter-spacing:1.2px;margin-top:4px;text-transform:uppercase;font-weight:500">Grupo Constructor Urbano Avante</div>
  ${subtitle ? `<div style="font-size:12px;color:#CFD8DC;margin-top:10px;opacity:0.9">${subtitle}</div>` : ""}
</div>`;
}

/**
 * Footer canonico ARIA.
 * @param extraLine - linea adicional opcional (ej fecha de generacion).
 */
export function ariaEmailFooter(extraLine?: string): string {
  return `<div style="background:#0a1628;padding:14px 20px;text-align:center;border-top:1px solid #334155">
  <div style="color:#64748b;font-size:11px;letter-spacing:0.5px">ARIA27 ERP &middot; Grupo Constructor Urbano Avante</div>
  ${extraLine ? `<div style="color:#475569;font-size:10px;margin-top:4px">${extraLine}</div>` : ""}
</div>`;
}

/**
 * Wrapper exterior del email.
 * max-width 780px (antes 650px). En mobile se ajusta automaticamente al ancho.
 */
export function ariaEmailWrapper(innerHtml: string): string {
  return `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:780px;margin:0 auto;border-radius:6px;overflow:hidden;background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.08)">${innerHtml}</div>`;
}
