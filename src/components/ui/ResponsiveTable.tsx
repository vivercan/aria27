"use client";
import { ReactNode, useState } from "react";
import { ChevronRight } from "lucide-react";
import Modal from "./Modal";

/**
 * ResponsiveTable — Sexta primitiva UI canónica ARIA27 (19-Abr-2026 mobile-f3).
 *
 * Renderiza tabla HTML estándar en desktop (md:+) y lista de cards sub-md.
 * Cada card muestra las columnas marcadas como "primary" con un botón
 * "Ver detalle" que abre Modal con todas las columnas.
 *
 * Desktop (md:+): markup idéntico a una <table> con <thead>/<tbody>/<tr>/<td>,
 * totalmente compatible con el look actual de las tablas del ERP.
 *
 * Sub-md: cada row se convierte en un card legible en 360px con las
 * columnas primarias + botón que dispara Modal (sheetOnMobile=true) con
 * todas las columnas ordenadas verticalmente.
 *
 * Regla de oro: desktop no cambia visualmente respecto a una <table> directa.
 *
 * API mínima:
 *   <ResponsiveTable
 *     columns={[
 *       { key: "folio", label: "Folio", primary: true },
 *       { key: "total", label: "Total", primary: true, align: "right" },
 *       { key: "estado", label: "Estado" },
 *       { key: "obra", label: "Obra" },
 *     ]}
 *     rows={data}
 *     rowKey={(r) => r.id}
 *     render={(r, c) => (c.key === "total" ? fmtMoney(r.total) : r[c.key])}
 *   />
 */

export interface ResponsiveTableColumn<T> {
  /** Clave única de la columna (usada en render, no en DOM). */
  key: string;
  /** Texto del header. */
  label: string;
  /**
   * Si true, la columna se muestra en la card sub-md.
   * Si no hay ninguna columna primary, sub-md muestra las 3 primeras.
   */
  primary?: boolean;
  /** Alineación horizontal del td (y del valor en la card). */
  align?: "left" | "right" | "center";
  /** className extra para el <th> y <td>. */
  className?: string;
  /** Ancho CSS opcional (ej. "w-32" o "100px"). */
  width?: string;
}

export interface ResponsiveTableProps<T> {
  columns: ResponsiveTableColumn<T>[];
  rows: T[];
  /** Identificador único de cada fila. */
  rowKey: (row: T, index: number) => string | number;
  /**
   * Render del valor de una celda para una columna. Se llama tanto en
   * la tabla desktop como en las cards sub-md.
   */
  render: (row: T, column: ResponsiveTableColumn<T>, index: number) => ReactNode;
  /** Texto mostrado en sub-md cuando no hay filas (default: "Sin resultados"). */
  emptyText?: string;
  /** className extra para el <table>. */
  tableClassName?: string;
  /** Título del Modal de detalle sub-md (default: "Detalle"). */
  detailTitle?: string;
  /**
   * Opcional: callback cuando el usuario abre detalle de una fila.
   * Útil para tracking o lógica custom antes de mostrar.
   */
  onDetail?: (row: T) => void;
}

function alignClass(align?: "left" | "right" | "center"): string {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

export default function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  render,
  emptyText = "Sin resultados",
  tableClassName = "",
  detailTitle = "Detalle",
  onDetail,
}: ResponsiveTableProps<T>) {
  const [detailRow, setDetailRow] = useState<T | null>(null);

  // Determinar columnas primarias para la card mobile
  const primaryCols = columns.filter((c) => c.primary);
  const mobileCols = primaryCols.length > 0 ? primaryCols : columns.slice(0, 3);

  const openDetail = (row: T) => {
    if (onDetail) onDetail(row);
    setDetailRow(row);
  };

  return (
    <>
      {/* ── Desktop: tabla HTML estándar ────────────────────────── */}
      <div className={"hidden md:block " + tableClassName}>
        <table className="w-full text-sm">
          <thead className="text-[#7f93b0] border-b border-white/[0.08]">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={[
                    "px-3 py-2 font-medium",
                    alignClass(c.align),
                    c.className || "",
                    c.width || "",
                  ].join(" ")}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-[#7f93b0]"
                >
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className="border-b border-white/[0.04] text-[#c9d8ed] hover:bg-white/[0.02] transition-colors"
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={[
                        "px-3 py-2",
                        alignClass(c.align),
                        c.className || "",
                      ].join(" ")}
                    >
                      {render(row, c, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Sub-md: cards ────────────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-2">
        {rows.length === 0 ? (
          <div className="text-center text-sm text-[#7f93b0] py-8">{emptyText}</div>
        ) : (
          rows.map((row, i) => (
            <button
              key={rowKey(row, i)}
              type="button"
              onClick={() => openDetail(row)}
              className="w-full text-left rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] p-3 flex items-start gap-3 min-h-[44px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-aria-primary/50"
              aria-label={`Ver detalle de fila ${i + 1}`}
            >
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                {mobileCols.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-[10px] uppercase tracking-wide text-[#7f93b0] flex-shrink-0">
                      {c.label}
                    </span>
                    <span
                      className={[
                        "text-[#c9d8ed] truncate",
                        alignClass(c.align),
                      ].join(" ")}
                    >
                      {render(row, c, i)}
                    </span>
                  </div>
                ))}
              </div>
              <ChevronRight
                className="w-4 h-4 text-[#7f93b0] flex-shrink-0 mt-1"
                aria-hidden="true"
              />
            </button>
          ))
        )}
      </div>

      {/* ── Modal detalle sub-md ─────────────────────────────────
          TODO post-Fase 2: agregar prop `sheetOnMobile` cuando PR #6 mergee
          para que el modal aparezca desde bottom en sub-md en vez de centrado. */}
      <Modal
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        title={detailTitle}
        sheetOnMobile
      >
        {detailRow !== null && (
          <dl className="flex flex-col gap-3">
            {columns.map((c, idx) => (
              <div key={c.key} className="flex flex-col gap-0.5">
                <dt className="text-[10px] uppercase tracking-wide text-[#7f93b0]">
                  {c.label}
                </dt>
                <dd className={"text-sm text-[#c9d8ed] " + alignClass(c.align)}>
                  {render(detailRow, c, idx)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Modal>
    </>
  );
}
