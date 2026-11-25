/**
 * traer-todo.ts — 24-Nov-2026
 *
 * CAUSA RAIZ que arregla: PostgREST corta cualquier consulta en 1000 filas
 * (db-max-rows), sin avisar y sin error. `.limit(2000)` o `.range(0,1999)`
 * NO lo evitan: el servidor devuelve 1000 y ya.
 *
 * Sintoma real reportado (Deya Viveros, 24-Nov-2026):
 *   "doy de alta el proveedor y no me aparece despues, aparte de F5 de que
 *    otra manera se actualiza"
 * Habia 1,236 proveedores ACTIVO y la pantalla solo recibia los primeros
 * 1,000 ordenados por nombre: los 236 restantes (de "Sabas Herrajes..."
 * en adelante) eran invisibles para siempre, con F5 o sin F5.
 *
 * Uso:
 *   const filas = await traerTodo<Fila>(desde =>
 *     supabase.from("suppliers").select("id,name").order("name").range(desde, desde + 999)
 *   );
 */

const PAGINA = 1000;
const MAX_PAGINAS = 50; // techo de seguridad: 50,000 filas

type Respuesta<T> = { data: T[] | null; error: { message: string } | null };

export async function traerTodo<T>(
  pagina: (desde: number) => PromiseLike<Respuesta<T>>
): Promise<T[]> {
  const todo: T[] = [];
  for (let i = 0; i < MAX_PAGINAS; i++) {
    const { data, error } = await pagina(i * PAGINA);
    if (error) throw new Error(error.message);
    const lote = data || [];
    todo.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return todo;
}
