/**
 * Doménica 27 · ¿Qué quiere la persona? (11-Oct-2026 · lógica pura · tests/intenciones.test.ts)
 *
 * La gente no dice el nombre de la herramienta. Dice "ya llegó el camión", "ocupo varilla",
 * "quiero ver lo de ayer", "dile a Miguel que…". Este catálogo junta, por herramienta, las MUCHAS
 * formas en que se pide (de oficina, de obra, con errores del dictado del teléfono) y decide:
 *   - una sola herramienta clara  → se abre
 *   - dos parecidas               → se pregunta "¿Quisiste decir…?" con botones grandes (nunca adivinar)
 *   - nada claro                  → la IA lo intenta, y si tampoco, se ofrece escribirlo
 *
 * Para que el dictado mal escuchado no confunda, todo se compara por "cómo suena":
 * sin acentos, b=v, s=z=c(e/i), y=ll, sin h muda, sin letras dobles.
 */

/** Cómo suena (español de México): "Requisisión", "requicision", "rekisición" → misma clave */
export function suena(s: string): string {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[¿?¡!.,;:"“”()]/g, " ")
    .replace(/\bh(?=[aeiou])/g, "").replace(/(?<=[aeiou ])h/g, "")
    .replace(/qu(?=[ei])/g, "k").replace(/c(?=[aou])/g, "k").replace(/c(?=[ei])/g, "s").replace(/z/g, "s").replace(/x(?=[aeiou])/g, "j")
    .replace(/v/g, "b").replace(/ll/g, "y").replace(/w/g, "u")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/\s+/g, " ").trim();
}

export type IdIntencion =
  | "pedir_material" | "mis_solicitudes" | "autorizar" | "registrar_entrega" | "mis_actividades" | "encargar"
  | "anotar_pendientes" | "calendario" | "obras" | "bitacora" | "fotos" | "planos" | "revisiones" | "asistencia"
  | "personal" | "proveedores" | "productos" | "preguntar" | "ayuda" | "inicio" | "ajustes";

export type Intencion = {
  id: IdIntencion;
  nombre: string;          // como se ve en la app (para "¿Quisiste decir…?")
  explica: string;         // una línea, palabras de casa
  href: string | null;     // null = la decide la pantalla (dictado, preguntar, ayuda)
  claves: string[];        // frases o palabras sueltas; se comparan por cómo suenan
  fuertes?: string[];      // si aparece una de éstas, casi seguro es esta herramienta
};

export const INTENCIONES: Intencion[] = [
  { id: "pedir_material", nombre: "Pedir material", explica: "Cemento, varilla, un servicio…", href: "/dashboard/requisiciones/requisiciones/nuevo",
    fuertes: ["requisicion", "requi", "requis", "pedir material", "pedido de material", "solicitud de material", "hacer un pedido", "levantar pedido", "orden de compra", "solicitud de compra"],
    claves: ["pedir", "pide", "pidan", "ocupo", "ocupamos", "necesito", "necesitamos", "hace falta", "me falta", "nos falta", "se acabo", "se nos acabo", "comprar", "compren", "surtir", "mandar traer", "que traigan", "~material", "~materiales", "cemento", "varilla", "block", "tabique", "arena", "grava", "mortero", "yeso", "pintura", "cable", "tubo", "tuberia", "clavos", "alambre", "cal", "concreto", "bultos", "sacos", "cubetas", "piezas", "servicio", "renta de", "rentar", "destajo", "anticipo", "pago de destajo", "finiquito"] },
  { id: "mis_solicitudes", nombre: "Mis solicitudes", explica: "Cómo va lo que pediste", href: "/dashboard/requisiciones/requisiciones/estatus",
    fuertes: ["mis solicitudes", "mis requisiciones", "mis pedidos", "lo que pedi", "como va mi pedido", "estatus del pedido", "status de la requisicion"],
    claves: ["solicitudes", "requisiciones", "pedidos", "pedido", "estatus", "status", "ya autorizaron", "ya compraron", "en que va", "seguimiento"] },
  { id: "autorizar", nombre: "Autorizar", explica: "Lo que espera tu visto bueno", href: "/dashboard/campo/autorizar",
    fuertes: ["por autorizar", "autorizar", "autorizaciones", "aprobar", "aprobaciones", "visto bueno", "dar el si", "firmar solicitudes", "firmar requisiciones", "firmar pedidos"],
    claves: ["autoriza", "aprueba", "aprobaciones", "pendientes de aprobar", "rechazar", "firmar", "liberar"] },
  { id: "registrar_entrega", nombre: "Registrar una entrega", explica: "Llegó material: foto y quién recibió", href: "/dashboard/campo/evidencia",
    fuertes: ["registrar entrega", "registrar una entrega", "llego el material", "ya llego el material", "llego el camion", "ya llego el camion", "recibir material", "evidencia de entrega", "recibi el material", "recibimos el material", "vino el proveedor", "dejaron el material", "acaban de traer", "ya trajeron", "trajeron el", "descargaron", "ya descargaron", "llego la", "llego el", "llegaron los", "llegaron las", "registrar que llego", "vinieron a dejar", "ya esta el camion", "esta el camion", "llego el proveedor"],
    claves: ["entrega", "entregas", "llego", "llegaron", "ya llego", "recibi", "recibimos", "recibir", "descargar", "descargando", "vino el proveedor", "trajeron", "nota de remision", "remision"] },
  { id: "mis_actividades", nombre: "Mis actividades", explica: "Lo que tienes que hacer", href: "/dashboard/actividades?vista=mi",
    fuertes: ["mis actividades", "mis tareas", "que me toca hacer", "lo que tengo que hacer", "mis pendientes"],
    claves: ["actividades", "tareas", "chamba", "trabajo de hoy", "que hago", "lo mio", "atrasadas", "~pendientes"] },
  { id: "encargar", nombre: "Encargar algo", explica: "Una tarea para alguien", href: "/dashboard/actividades?nueva=1",
    fuertes: ["nueva actividad", "encargar", "asignar una tarea", "asignar actividad", "dile a", "dale a", "mandale a", "encargale a", "que haga", "que revise"],
    claves: ["asignar", "asignale", "encarga", "pedirle a", "que vaya", "que lleve", "que termine", "tarea para", "actividad para"] },
  { id: "anotar_pendientes", nombre: "Anotar mis pendientes", explica: "Lo dictas y se acomoda en tu agenda", href: null,
    fuertes: ["anota", "anotame", "apunta", "apuntame", "recuerdame", "que no se me olvide", "agendame", "ponme un recordatorio"],
    claves: ["recordatorio", "recordar", "agendar", "apuntar", "anotar", "no se me olvide"] },
  { id: "calendario", nombre: "Calendario", explica: "Qué hay cada día", href: "/dashboard/campo/calendario",
    fuertes: ["agenda", "calendario", "mi agenda", "mi calendario"],
    claves: ["que hay manana", "esta semana", "dias", "fechas", "programado"] },
  { id: "obras", nombre: "Mis obras", explica: "Avance y gastos de cada obra", href: "/dashboard/domenica/obras",
    fuertes: ["mis obras", "las obras", "ver las obras", "avance de obra", "avance de la obra"],
    claves: ["~obra", "~obras", "~avance", "gasto", "gastos", "presupuesto", "como va la obra"] },
  { id: "bitacora", nombre: "Bitácora", explica: "Lo que pasó cada día en la obra", href: "/dashboard/domenica/obras",
    fuertes: ["bitacora", "diario de obra", "reporte del dia", "resumen del dia"],
    claves: ["lo de ayer", "que se hizo", "reporte diario", "nota de obra"] },
  { id: "fotos", nombre: "Fotos de avance", explica: "Antes y ahora de la obra", href: "/dashboard/domenica/obras",
    fuertes: ["fotos de avance", "foto de avance", "tomar foto", "subir foto", "subir fotos"],
    claves: ["foto", "fotos", "imagen", "evidencia de avance", "como estaba", "antes y despues"] },
  { id: "planos", nombre: "Planos", explica: "Ver planos y marcar pendientes", href: "/dashboard/domenica/planos",
    fuertes: ["planos", "el plano", "los planos", "ver plano"],
    claves: ["plano", "proyecto", "medidas", "croquis", "marcar en el plano"] },
  { id: "revisiones", nombre: "Revisiones", explica: "Calidad y seguridad con foto y firma", href: "/dashboard/domenica/revisiones",
    fuertes: ["revision", "revisiones", "checklist", "lista de revision", "inspeccion"],
    claves: ["calidad", "seguridad", "supervision", "revisar el area", "entrega de area"] },
  { id: "asistencia", nombre: "Asistencias", explica: "Quién llegó hoy", href: "/dashboard/talento/checadas",
    fuertes: ["asistencia", "asistencias", "checadas", "quien llego", "quien vino", "checar entrada"],
    claves: ["checar", "checador", "entrada", "salida", "faltas", "faltaron", "retardos", "lista de asistencia"] },
  { id: "personal", nombre: "Personal", explica: "Datos de cada empleado", href: "/dashboard/talento/personal",
    fuertes: ["personal", "empleados", "trabajadores", "mi cuadrilla"],
    claves: ["cuadrilla", "gente", "albaniles", "operadores", "telefono del trabajador", "numero del trabajador"] },
  { id: "proveedores", nombre: "Proveedores", explica: "Teléfonos y datos de pago", href: "/dashboard/requisiciones/proveedores",
    fuertes: ["proveedores", "directorio de proveedores", "telefono del proveedor", "numero del proveedor", "datos del proveedor", "telefono de la ferreteria"], claves: ["proveedor", "ferreteria", "contacto del proveedor", "datos bancarios", "cuenta del proveedor"] },
  { id: "productos", nombre: "Productos", explica: "Lista de materiales", href: "/dashboard/requisiciones/productos",
    fuertes: ["productos", "catalogo de materiales", "lista de materiales"], claves: ["catalogo", "precio de", "cuanto cuesta"] },
  { id: "ayuda", nombre: "Cómo se usa", explica: "Una guía corta", href: null,
    fuertes: ["ayuda", "como se usa", "no se usar", "no le entiendo", "como le hago", "enseñame a usar"], claves: ["instrucciones", "tutorial", "guia"] },
  { id: "inicio", nombre: "Inicio", explica: "Lo que te toca hoy", href: "/dashboard/campo",
    fuertes: ["inicio", "pantalla principal", "al principio", "menu principal"], claves: ["regresar al inicio", "home"] },
  { id: "ajustes", nombre: "Ajustes", explica: "Letra grande, colores, huella", href: "/dashboard/campo/mas",
    fuertes: ["letra mas grande", "letra grande", "modo oscuro", "modo claro", "cerrar sesion", "ajustes", "configuracion"], claves: ["no veo", "agrandar", "huella", "notificaciones"] },
];

/** Muletillas que no cambian el sentido */
const MULETILLAS = /^(oye|hola|ok|okay|bueno|a ver|este|pues|mira|fijate|domenica|dominika|dominica|por fabor|porfa|ayudame a|ayudame con|me ayudas a|kiero|necesito que|puedes|podrias|kisiera|me gustaria|jefa|jefe|señorita)( |$)/;

export function limpiar(texto: string): string {
  let t = suena(texto); let antes = "";
  while (t !== antes) { antes = t; t = t.replace(MULETILLAS, "").trim(); }
  return t;
}

const contiene = (t: string, frase: string) => { const f = suena(frase); return f.length > 0 && (` ${t} `).includes(` ${f} `); };
/** Para palabras largas que el dictado parte en dos ("re quisición") */
const contienePegado = (t: string, frase: string) => { const f = suena(frase).replace(/ /g, ""); return f.length >= 8 && t.replace(/ /g, "").includes(f); };

export type Lectura = { id: IdIntencion; puntos: number };

/** Puntúa cada herramienta. fuertes = 6, claves = 2 (+1 si es frase de varias palabras). */
export function leer(texto: string): Lectura[] {
  const t = limpiar(texto); if (!t) return [];
  const out: Lectura[] = [];
  for (const it of INTENCIONES) {
    let p = 0;
    for (const f of it.fuertes || []) if (contiene(t, f) || contienePegado(t, f)) p += 6;
    for (const c0 of it.claves) { const debil = c0.startsWith("~"); const c = debil ? c0.slice(1) : c0; if (contiene(t, c)) p += debil ? 1 : c.includes(" ") ? 3 : 2; }
    if (p > 0) out.push({ id: it.id, puntos: p });
  }
  return out.sort((a, b) => b.puntos - a.puntos);
}

export type Decision =
  | { tipo: "clara"; intencion: Intencion; puntos: number }
  | { tipo: "dudosa"; opciones: Intencion[] }
  | { tipo: "ninguna" };

/** Clara si gana con ventaja; dudosa si hay empate o casi; ninguna si nada suena. */
export function decidir(texto: string): Decision {
  const l = leer(texto);
  if (!l.length) return { tipo: "ninguna" };
  const [a, b] = l;
  const it = (id: IdIntencion) => INTENCIONES.find(x => x.id === id)!;
  if (a.puntos >= 6 && (!b || a.puntos - b.puntos >= 3)) return { tipo: "clara", intencion: it(a.id), puntos: a.puntos };
  if (a.puntos >= 4 && (!b || a.puntos - b.puntos >= 2)) return { tipo: "clara", intencion: it(a.id), puntos: a.puntos };
  if (a.puntos >= 2 && (!b || a.puntos >= 2 * b.puntos)) return { tipo: "clara", intencion: it(a.id), puntos: a.puntos };
  const opciones = l.filter(x => x.puntos >= Math.max(2, a.puntos - 3)).slice(0, 3).map(x => it(x.id));
  return opciones.length ? { tipo: "dudosa", opciones } : { tipo: "ninguna" };
}

export const intencionPorId = (id: string) => INTENCIONES.find(x => x.id === id) || null;

/** ¿Lo dicho trae una frase "fuerte" de esta herramienta? (se respeta aunque mencione materiales u obras) */
export function tieneFuerte(texto: string, i: Intencion): boolean { const t = limpiar(texto); return (i.fuertes || []).some(f => contiene(t, f) || contienePegado(t, f)); }
