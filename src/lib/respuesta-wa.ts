/**
 * Respuestas por WhatsApp de quien hace la tarea (albañiles, ayudantes, operadores) · 11-Oct-2026 · tests/respuesta-wa.test.ts
 * Mucha gente de obra casi no lee ni escribe: contestan "ya quedó", "ya mero", "no hay cemento", "👍".
 * Aquí se entiende sin IA lo más común; lo raro lo intenta la IA después.
 * Ojo: "no puedo" NO cancela la tarea (antes sí): es un problema que el jefe debe saber.
 */
export type IntencionWA = "INICIO" | "AVANCE" | "LISTO" | "BLOQUEADO" | "AYUDA" | "STATUS" | "CANCELAR" | "DESCONOCIDO";
export type LecturaWA = { intent: IntencionWA; porcentaje?: number; motivo?: string; tareaIdx?: number };

const EMOJIS: [RegExp, string][] = [[/👍|✅|✔️|☑️|💪|🙌/gu, " listo "], [/👌|🆗/gu, " ok "], [/🛑|⛔|❌|🚫|⚠️/gu, " problema "], [/🙏|🆘|❓/gu, " ayuda "]];
export function normalizarWA(s: string): string {
  let t = String(s || "");
  for (const [re, w] of EMOJIS) t = t.replace(re, w);
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9%#\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function leerRespuestaWA(textRaw: string): LecturaWA {
  const text = normalizarWA(textRaw);
  let tareaIdx: number | undefined; let c = text;
  const idx = text.match(/^(?:tarea\s*#?\s*)?(\d{1,2})\s+(.+)$/);
  if (idx && !/^\d{1,3}\s*%?$/.test(text) && !/^(\d{1,3})\s*(%|por ?ciento)/.test(text)) { tareaIdx = Number(idx[1]); c = idx[2]; }
  const r = (intent: IntencionWA, extra: Partial<LecturaWA> = {}): LecturaWA => ({ intent, tareaIdx, ...extra });
  if (!c) return r("DESCONOCIDO");

  // Consultas
  if (/^(status|estatus|mis tareas|tareas|que tengo|que me toca|que hago hoy|que sigue|pendientes|mis pendientes)$/.test(c)) return r("STATUS");
  if (/^(ayuda|sos|help|necesito ayuda|no entiendo|no le entiendo|como le hago|que hago|no se como)\b/.test(c)) return r("AYUDA");
  if (/^(cancelar|cancela|cancelo|ya no se hace|ya no va)$/.test(c)) return r("CANCELAR");

  // "falta poco" / "ya mero" es avance, no problema
  if (/\b(falta poco|ya mero|ya merito|casi listo|casi acabo|por terminar)\b/.test(c)) return r("AVANCE", { porcentaje: 75 });
  // Problemas (atorada) — en cualquier parte del mensaje
  const prob = c.match(/\b(bloqueado|problema|trabado|atorado|atorada|no puedo|no se puede|no pude|no hay|falta|faltan|se acabo|se acabaron|se rompio|se descompuso|no sirve|no funciona|no llego|no ha llegado|esta lloviendo|llueve|lluvia|no vino|no me dejaron|no tengo)\b/);
  if (prob) {
    const motivo = c.replace(/^(bloqueado|problema|trabado|atorado|atorada|stop)\s*/, "").trim();
    return r("BLOQUEADO", { motivo: motivo || "sin detalle" });
  }

  // Porcentajes: "50", "al 70", "llevo 30%", "70 por ciento"
  const pct = c.match(/^(?:avance|porcentaje|llevo|al|voy en|voy al|como al|como)?\s*(\d{1,3})\s*(?:%|por ?ciento)?$/);
  if (pct) { const n = Math.min(100, Math.max(0, Number(pct[1]))); return n >= 100 ? r("LISTO", { porcentaje: 100 }) : r("AVANCE", { porcentaje: n }); }

  // Terminado
  if (/^(ya )?(listo|lista|terminado|terminada|termine|terminamos|completado|done|finalizado|acabe|acabamos|hecho|ya quedo|quedo|quedo listo|ya esta|ya esta listo|ya esta jefe|ya)( jefe| ingeniero| inge| patron| ya| todo)*$/.test(c)
    || /\b(ya quedo|ya termine|ya terminamos|ya acabe|ya acabamos|ya esta listo|quedo listo|listo jefe)\b/.test(c)) return r("LISTO", { porcentaje: 100 });
  // Casi
  if (/\b(casi|ya mero|ya merito|falta poco|poquito|por terminar|casi listo|casi acabo)\b/.test(c)) return r("AVANCE", { porcentaje: 75 });
  // Mitad
  if (/\b(mitad|a medias|medio|la mitad|vamos a la mitad|voy a la mitad|midway|half)\b/.test(c)) return r("AVANCE", { porcentaje: 50 });
  // Empezó / enterado
  if (/^(inicio|iniciando|empece|empezamos|empiezo|empezando|arranco|arrancando|arranque|on it|ok|okay|enterado|enterada|recibido|va|sale|voy|ahorita voy|ya voy|si|si jefe|de acuerdo|claro|ya empece|ya empezamos|estoy en eso|estamos en eso|en eso estoy|ahi voy)( jefe| ingeniero| inge| patron)*$/.test(c)
    || /\b(ya empece|ya empezamos|estoy en eso|estamos en eso|ya estoy trabajando|ya le estoy|le estoy dando)\b/.test(c)) return r("INICIO", { porcentaje: 25 });

  return r("DESCONOCIDO");
}
