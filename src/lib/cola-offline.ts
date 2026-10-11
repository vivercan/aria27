/**
 * Doménica 27 · trabajar sin señal (11-Oct-2026)
 * Lo que se captura en obra sin internet (entregas con foto, fotos de avance) se guarda en el teléfono (IndexedDB,
 * con la foto incluida) y se manda solo cuando vuelve la señal. Sin librerías.
 */
import { supabase } from "@/lib/supabase";

export type Pendiente = {
  id: string; creado: number; titulo: string;
  tipo: "entrega" | "foto-avance";
  /** endpoint y cuerpo JSON; "__FOTO__" se reemplaza por la URL pública de la foto ya subida */
  url: string; body: Record<string, unknown>;
  foto?: { blob: Blob; path: string; campo: string };
};

const DB = "dom-cola"; const ST = "pend"; const EVT = "dom:cola";
function abrir(): Promise<IDBDatabase> {
  return new Promise((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: "id" }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
}
async function tx<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise((res, rej) => { const t = db.transaction(ST, modo); const q = fn(t.objectStore(ST)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
const avisar = () => { try { window.dispatchEvent(new Event(EVT)); } catch { /* */ } };

/** ¿El error fue por falta de señal (y no un error real del servidor)? */
export const esSinSenal = (e: unknown) => (typeof navigator !== "undefined" && navigator.onLine === false) || e instanceof TypeError || /failed to fetch|network|load failed/i.test(String((e as Error)?.message || ""));

export async function guardarPendiente(p: Omit<Pendiente, "id" | "creado">) {
  await tx("readwrite", s => s.put({ ...p, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, creado: Date.now() }));
  avisar();
}
export async function pendientes(): Promise<Pendiente[]> { try { return await tx("readonly", s => s.getAll() as IDBRequest<Pendiente[]>); } catch { return []; } }

let enviando = false;
/** Manda lo pendiente (en orden). Lo que falle por servidor se deja para revisar; lo que falle por señal se reintenta luego. */
export async function enviarPendientes(): Promise<number> {
  if (enviando || (typeof navigator !== "undefined" && navigator.onLine === false)) return 0;
  enviando = true; let ok = 0;
  try {
    for (const p of (await pendientes()).sort((a, b) => a.creado - b.creado)) {
      try {
        const body = { ...p.body };
        if (p.foto) {
          const { error } = await supabase.storage.from("expedientes").upload(p.foto.path, p.foto.blob, { contentType: p.foto.blob.type || "image/jpeg", upsert: true });
          if (error && !/exists/i.test(error.message)) throw new TypeError(error.message);
          body[p.foto.campo] = supabase.storage.from("expedientes").getPublicUrl(p.foto.path).data.publicUrl;
        }
        const r = await fetch(p.url, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (r.status >= 500) throw new TypeError(`servidor ${r.status}`);
        // 2xx o 4xx (ya registrado / inválido): se quita de la cola para no repetir
        await tx("readwrite", s => s.delete(p.id)); ok++;
      } catch (e) { if (esSinSenal(e)) break; }
    }
  } finally { enviando = false; avisar(); }
  return ok;
}
export const EVENTO_COLA = EVT;
