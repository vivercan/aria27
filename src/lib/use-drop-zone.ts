"use client";
import { useRef, useState, useCallback } from "react";

/* ââ FileSystem API types (non-standard, drag & drop folder support) ââ */
interface FSEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath: string;
}
interface FSFileEntry extends FSEntry {
  file(success: (f: File) => void, error?: () => void): void;
}
interface FSDirEntry extends FSEntry {
  createReader(): FSDirReader;
}
interface FSDirReader {
  readEntries(
    success: (entries: FSEntry[]) => void,
    error?: () => void
  ): void;
}

/* ââ Progress state ââ */
export interface DropProgress {
  phase: "scanning" | "uploading";
  current: number;
  total: number;
}

/* ââ Constantes ââ */
const MAX_TOTAL_BYTES = 500 * 1024 * 1024; // 500 MB mÃ¡ximo por drop
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB por archivo individual

/* ââ Helpers ââ */

/**
 * Recursively read all files from a dropped FileSystemEntry tree.
 * v2: usa recursiÃ³n SECUENCIAL en vez de Promise.all para no crear
 * miles de promesas simultÃ¡neas que revientan el event loop.
 */
async function readEntryRecursive(entry: FSEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      (entry as FSFileEntry).file(
        (f: File) => {
          Object.defineProperty(f, "webkitRelativePath", {
            value: entry.fullPath.replace(/^\//, ""),
            writable: false,
          });
          resolve([f]);
        },
        () => resolve([])
      );
    });
  }

  if (!entry.isDirectory) return [];

  // Leer todas las entradas del directorio (puede venir en lotes)
  const reader = (entry as FSDirEntry).createReader();
  const allChildren: FSEntry[] = [];

  await new Promise<void>((resolve) => {
    const readBatch = () => {
      reader.readEntries(
        (entries) => {
          if (entries.length === 0) {
            resolve();
          } else {
            allChildren.push(...entries);
            readBatch();
          }
        },
        () => resolve()
      );
    };
    readBatch();
  });

  // SECUENCIAL: procesar hijos uno por uno, no todos a la vez
  const results: File[] = [];
  for (const child of allChildren) {
    const files = await readEntryRecursive(child);
    results.push(...files);
  }
  return results;
}

/**
 * useDropZone â hook reutilizable para drag & drop de archivos y carpetas.
 *
 * v2: RecursiÃ³n secuencial + validaciÃ³n de tamaÃ±o + indicador de progreso.
 * Soporta carpetas pesadas (365MB+) sin crashear el navegador.
 *
 * @param onFilesDropped callback que recibe File[] con webkitRelativePath seteado
 */
export function useDropZone(
  onFilesDropped: (files: File[]) => void | Promise<void>
) {
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<DropProgress | null>(null);
  const counter = useRef(0);
  const processing = useRef(false);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counter.current++;
    if (e.dataTransfer.types.includes("Files")) setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    counter.current--;
    if (counter.current === 0) setDragging(false);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      counter.current = 0;

      // Evitar drops concurrentes
      if (processing.current) return;
      processing.current = true;

      try {
        const items = e.dataTransfer.items;
        if (!items || items.length === 0) return;

        // 1. Obtener entries del drop
        const topEntries: FSEntry[] = [];
        for (let i = 0; i < items.length; i++) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const entry = (items[i] as any).webkitGetAsEntry?.();
          if (entry) topEntries.push(entry);
        }
        if (topEntries.length === 0) return;

        // 2. Escanear recursivamente (secuencial, sin Promise.all masivo)
        setProgress({ phase: "scanning", current: 0, total: 0 });

        const allFiles: File[] = [];
        let totalBytes = 0;

        for (const top of topEntries) {
          const files = await readEntryRecursive(top);
          for (const file of files) {
            // Validar tamaÃ±o individual
            if (file.size > MAX_FILE_BYTES) continue;
            // Validar acumulado
            if (totalBytes + file.size > MAX_TOTAL_BYTES) continue;
            totalBytes += file.size;
            allFiles.push(file);
          }
          setProgress({
            phase: "scanning",
            current: allFiles.length,
            total: allFiles.length,
          });
        }

        if (allFiles.length === 0) {
          setProgress(null);
          return;
        }

        // 3. Entregar archivos al callback
        setProgress({
          phase: "uploading",
          current: 0,
          total: allFiles.length,
        });
        await onFilesDropped(allFiles);
      } finally {
        setProgress(null);
        processing.current = false;
      }
    },
    [onFilesDropped]
  );

  return {
    dragging,
    progress,
    dropHandlers: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
}
