"use client";
import { useRef, useState, useCallback } from "react";

/* FileSystem API types (non-standard, used by drag & drop folder support) */
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
  readEntries(success: (entries: FSEntry[]) => void, error?: () => void): void;
}

/** Recursively read all files from a dropped FileSystemEntry tree */
function readEntryRecursive(entry: FSEntry): Promise<File[]> {
  return new Promise((resolve) => {
    if (entry.isFile) {
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
    } else if (entry.isDirectory) {
      const reader = (entry as FSDirEntry).createReader();
      const allEntries: FSEntry[] = [];
      const readBatch = () => {
        reader.readEntries(
          (entries) => {
            if (entries.length === 0) {
              Promise.all(allEntries.map(readEntryRecursive)).then((nested) =>
                resolve(nested.flat())
              );
            } else {
              allEntries.push(...entries);
              readBatch();
            }
          },
          () => resolve([])
        );
      };
      readBatch();
    } else {
      resolve([]);
    }
  });
}

/**
 * useDropZone â hook reutilizable para drag & drop de archivos y carpetas.
 *
 * Retorna:
 * - dragging: boolean â true cuando hay archivos sobre la zona
 * - dropHandlers: props para pasar al contenedor div (onDragEnter, onDragLeave, onDragOver, onDrop)
 *
 * @param onFilesDropped callback que recibe File[] con webkitRelativePath seteado
 */
export function useDropZone(onFilesDropped: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);
  const counter = useRef(0);

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

      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const entries: FSEntry[] = [];
      for (let i = 0; i < items.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entry = (items[i] as any).webkitGetAsEntry?.();
        if (entry) entries.push(entry);
      }

      const nested = await Promise.all(entries.map(readEntryRecursive));
      const allFiles = nested.flat();
      if (allFiles.length > 0) onFilesDropped(allFiles);
    },
    [onFilesDropped]
  );

  return {
    dragging,
    dropHandlers: { onDragEnter, onDragLeave, onDragOver, onDrop },
  };
}
