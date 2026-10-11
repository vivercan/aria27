/**
 * Doménica 27 · comandos por voz SIN inteligencia artificial (11-Oct-2026, lógica pura · tests/comandos-voz.test.ts)
 * Lo simple se resuelve aquí al instante y gratis: "ayúdame a hacer una requisición" → abre Pedir material,
 * "abre mi agenda" → calendario, "anota pendientes" → modo pendientes, etc.
 * Solo cuando hay que ENTENDER contenido (qué material, cuántos, para quién, qué día) se usa IA.
 */
import { pareceRegunta } from "@/lib/asistente";

export type Comando =
  | { tipo: "ir"; href: string; aviso: string }
  | { tipo: "pendientes"; texto: string }      // anotar pendientes: texto = lo que dijo después del disparador ("" = todavía no dice cuáles)
  | { tipo: "pregunta"; texto: string }
  | { tipo: "ia"; texto: string; pista?: "material" | "actividad" };

const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ").trim();
const tiene = (t: string, re: RegExp) => re.test(t);
/** Quita muletillas del inicio: "oye doménica, ayúdame a…" → "…" */
const sinMuletillas = (t: string) => t.replace(/^(oye |hola |ok |okay |bueno |a ver |este |domenica |doménica |por favor |porfa |ayudame a |ayudame con |quiero |necesito que |me ayudas a |puedes )+/g, "").trim();

const DISP_PEND = /^(anota|anotame|apunta|apuntame|agenda|agendame|recuerdame|recordarme|ponme|pon|guarda|anotar|apuntar|agendar)\b( (un|unos|mis|los|el|la|que|como))*( (pendientes?|recordatorios?|tareas?|notas?|cosas))?\b/;

export function interpretar(original: string): Comando {
  const t0 = n(original); const t = sinMuletillas(t0);
  if (!t) return { tipo: "ia", texto: original };

  // 1) Anotar pendientes (lo que sigue se acomoda en la agenda)
  const mp = t.match(DISP_PEND);
  if (mp || /^(tengo|tengo estos|estos son mis) pendientes\b/.test(t)) {
    const resto = mp ? t.slice(mp[0].length).replace(/^(que|de|:)\s*/, "").trim() : t.replace(/^(tengo|tengo estos|estos son mis) pendientes\s*/, "");
    return { tipo: "pendientes", texto: resto.length >= 6 ? resto : "" };
  }

  // 2) Abrir pantallas (verbo de ver/abrir o la palabra sola)
  const ver = /^(abre|abrir|ver|veme|muestrame|ensename|ir a|vamos a|llevame a|quiero ver|entra a|entrar a)?\s*/;
  const s = t.replace(ver, "");
  const pedirSolo = /^(hacer|haz|crear|crea|levantar|levanta|nueva|una|un|pedir|pide|capturar)?\s*(una |la |nueva )?(requisicion|requi|solicitud de material|solicitud|pedido de material|pedido)$/;
  if (pedirSolo.test(s) || /^(pedir|pide) material$/.test(s)) return { tipo: "ir", href: "/dashboard/requisiciones/requisiciones/nuevo", aviso: "Abriendo Pedir material" };
  if (/^(mi |la )?(agenda|calendario)\b/.test(s)) return { tipo: "ir", href: "/dashboard/campo/calendario", aviso: "Abriendo tu agenda" };
  if (/^(mis |las )?(actividades|tareas|pendientes)( de hoy| que tengo)?$/.test(s)) return { tipo: "ir", href: "/dashboard/actividades?vista=mi", aviso: "Abriendo tus actividades" };
  if (/^(lo |las )?(que tengo |que hay )?(por autorizar|autorizaciones|autorizar)$/.test(s)) return { tipo: "ir", href: "/dashboard/campo/autorizar", aviso: "Abriendo Por autorizar" };
  if (/^(mis |las )?solicitudes$/.test(s) || /^(mis |las )?requisiciones$/.test(s)) return { tipo: "ir", href: "/dashboard/requisiciones/requisiciones/estatus", aviso: "Abriendo Solicitudes" };
  if (/^(registrar|registra|recibir|recibe) (una |la )?(entrega|material)$/.test(s) || /^(llego|ya llego) (el )?material$/.test(s)) return { tipo: "ir", href: "/dashboard/campo/evidencia", aviso: "Abriendo Registrar entrega" };
  if (/^(las |mis )?obras$/.test(s)) return { tipo: "ir", href: "/dashboard/domenica/obras", aviso: "Abriendo tus obras" };
  if (/^(los )?planos$/.test(s)) return { tipo: "ir", href: "/dashboard/domenica/planos", aviso: "Abriendo planos" };
  if (/^(una )?(revision|revisiones|checklist)$/.test(s)) return { tipo: "ir", href: "/dashboard/domenica/revisiones", aviso: "Abriendo revisiones" };
  if (/^(nueva |una |crear (una )?|asignar (una )?)?actividad$/.test(s)) return { tipo: "ir", href: "/dashboard/actividades?nueva=1", aviso: "Nueva actividad" };
  if (/^inicio$/.test(s)) return { tipo: "ir", href: "/dashboard/campo", aviso: "Inicio" };

  // 3) Preguntas → Pregúntale a Doménica
  if (pareceRegunta(original) || pareceRegunta(t)) return { tipo: "pregunta", texto: original };

  // 4) Lo demás lo entiende la IA (material con cantidades, actividad para alguien…)
  if (/\b(requisicion|requi|material|sacos?|bultos?|varilla|cemento|block|arena|grava|pintura|tubo|cable)\b/.test(t)) return { tipo: "ia", texto: original, pista: "material" };
  return { tipo: "ia", texto: original };
}

/** Separa en pendientes sueltos sin IA cuando el dictado es simple ("…, y …, también …"). La IA lo hace mejor; esto es respaldo. */
export function partirPendientes(texto: string): string[] {
  return texto.split(/\s*(?:,|;|\by luego\b|\by despues\b|\btambien\b|\bademas\b|\botro\b|\botra\b|\. )\s*/i).map(x => x.trim()).filter(x => x.length >= 4).slice(0, 15);
}
