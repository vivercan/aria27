/**
 * @deprecated EX2-1 18-Abr-2026: todos los callsites migraron a `@/hooks/useFlashMessage`.
 * Este archivo se conserva SÓLO como re-export seguro por si queda algo fuera del repo
 * (bibliotecas compartidas, docs, snippets). Eliminar definitivamente en próxima pasada
 * cuando se confirme que no hay referencias externas.
 */
export { useFlashMessage, type FlashMsg, type FlashTipo, type UseFlashMessageReturn } from "@/hooks/useFlashMessage";
export { default } from "@/hooks/useFlashMessage";
