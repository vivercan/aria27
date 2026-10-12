/**
 * Doménica 27 · qué hacer con lo que dijo la persona (11-Oct-2026 · lógica pura · tests/comandos-voz.test.ts, tests/intenciones.test.ts)
 * 1) "Anota/recuérdame…"                 → pendientes a la agenda
 * 2) Pregunta ("¿qué…?", "cuánto…")       → Pregúntale a Doménica
 * 3) Pide algo CON contenido               → IA arma el borrador (material con cantidades, encargo para alguien)
 * 4) Nombra una herramienta (de mil formas) → se abre; si suena a dos, se pregunta "¿Quisiste decir…?"
 * 5) Nada claro                            → IA
 */
import { pareceRegunta } from "@/lib/asistente";
import { decidir, suena, tieneFuerte, type Intencion } from "@/lib/intenciones";

export type Comando =
  | { tipo: "ir"; href: string; aviso: string }
  | { tipo: "pendientes"; texto: string }      // texto = lo que dijo después del disparador ("" = todavía no dice cuáles)
  | { tipo: "pregunta"; texto: string }
  | { tipo: "ayuda" }
  | { tipo: "elegir"; opciones: { id: string; nombre: string; explica: string; href: string | null }[]; texto: string }
  | { tipo: "ia"; texto: string; pista?: "material" | "actividad" };

const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[¿?¡!.,;:]/g, " ").replace(/\s+/g, " ").trim();
const sinMuletillas = (t: string) => t.replace(/^(oye |hola |ok |okay |bueno |a ver |este |pues |mira |domenica |doménica |por favor |porfa |ayudame a |ayudame con |quiero |necesito que |me ayudas a |puedes )+/g, "").trim();

const DISP_PEND = /^(pon que|anota|anotame|apunta|apuntame|agenda|agendame|recuerdame|recordarme|ponme|guarda|anotar|apuntar|agendar)\b( (un|unos|mis|los|el|la|que|como))*( (pendientes?|recordatorios?|tareas?|notas?|cosas))?\b/;

/** ¿Trae contenido para armar algo (cantidades, materiales concretos, una persona a quien encargar)? */
const NUM = /\b(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|cincuenta|cien|media|medio)\b/;
const MATERIAL = /\b(sacos?|bultos?|varillas?|cemento|block|blocks|tabiques?|arena|grava|pintura|cubetas?|tubos?|cables?|metros?|m2|m3|piezas?|pzas?|litros?|tramos?|clavos?|alambre|yeso|mortero|concreto|cal|tinacos?|cajas?|rollos?)\b/;
const A_ALGUIEN = /^((dile|dale|mandale|encargale|pidele|avisale|avisa|diganle|encarga) (a |al |a la |a los )?|que )[a-z]+/;

const aOpcion = (i: Intencion) => ({ id: i.id, nombre: i.nombre, explica: i.explica, href: i.href });

export function interpretar(original: string): Comando {
  const t0 = n(original); const t = sinMuletillas(t0);
  if (!t) return { tipo: "ia", texto: original };

  // 1) Anotar pendientes
  const mp = t.match(DISP_PEND);
  if (mp || /^(tengo|tengo estos|estos son mis) pendientes\b/.test(t) || /^(que )?no se me (vaya a )?olvid(e|ar)\b/.test(t)) {
    const resto = mp ? t.slice(mp[0].length).replace(/^(que|de|:)\s*/, "").trim() : t.replace(/^(tengo|tengo estos|estos son mis) pendientes\s*|^(que )?no se me (vaya a )?olvid(e|ar)\s*/, "");
    return { tipo: "pendientes", texto: resto.length >= 6 ? resto : "" };
  }

  // 2) Preguntas
  if (pareceRegunta(original) || pareceRegunta(t)) return { tipo: "pregunta", texto: original };

  // 3a) Herramienta nombrada con todas sus letras ("número del proveedor de block", "ya descargaron el camión de block")
  const d0 = decidir(original);
  const esOrden = A_ALGUIEN.test(t) && t.split(" ").length >= 4;
  if (/^(el |la )?(material|materiales)$/.test(t)) return { tipo: "ir", href: "/dashboard/requisiciones/requisiciones/nuevo", aviso: "Abriendo Pedir material" };
  if (!esOrden && d0.tipo === "clara" && !["pedir_material", "encargar", "anotar_pendientes", "ayuda"].includes(d0.intencion.id) && d0.intencion.href && tieneFuerte(original, d0.intencion))
    return { tipo: "ir", href: d0.intencion.href, aviso: `Abriendo ${d0.intencion.nombre}` };

  // 3) Con contenido → la IA arma el borrador
  if (MATERIAL.test(t) && NUM.test(t)) return { tipo: "ia", texto: original, pista: "material" };
  if (esOrden) return { tipo: "ia", texto: original, pista: "actividad" };
  if (MATERIAL.test(t) && t.split(" ").length >= 4 && !/\b(llego|llegaron|recibi|recibimos|entrega|trajeron|traer|descargaron|descargando)\b/.test(t)) return { tipo: "ia", texto: original, pista: "material" };

  // 4) Herramientas por su nombre (o como la gente le dice)
  const d = d0;
  // Con poca evidencia (una sola palabra suelta como "necesito") no se adivina: lo confirma la IA o la persona
  if (d.tipo === "clara" && d.puntos < 4 && !tieneFuerte(original, d.intencion) && t.split(" ").length >= 4) return { tipo: "elegir", opciones: [aOpcion(d.intencion)], texto: original };
  if (d.tipo === "clara") {
    const i = d.intencion;
    if (i.id === "anotar_pendientes") return { tipo: "pendientes", texto: "" };
    if (i.id === "ayuda") return { tipo: "ayuda" };
    if (i.href) return { tipo: "ir", href: i.href, aviso: `Abriendo ${i.nombre}` };
  }
  if (d.tipo === "dudosa") return { tipo: "elegir", opciones: d.opciones.map(aOpcion), texto: original };

  // 5) Lo demás lo entiende la IA
  if (MATERIAL.test(suena(t)) || /\b(requisicion|requi|material)\b/.test(t)) return { tipo: "ia", texto: original, pista: "material" };
  return { tipo: "ia", texto: original };
}

/** Separa en pendientes sueltos sin IA cuando el dictado es simple ("…, y …, también …"). La IA lo hace mejor; esto es respaldo. */
export function partirPendientes(texto: string): string[] {
  return texto.split(/\s*(?:,|;|\by luego\b|\by despues\b|\btambien\b|\bademas\b|\botro\b|\botra\b|\. )\s*/i).map(x => x.trim()).filter(x => x.length >= 4).slice(0, 15);
}
