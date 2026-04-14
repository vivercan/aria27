"use client";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

/**
 * Wrapper estandarizado de tabla para ARIA27.
 * Incluye: sticky header, loading state, empty state, footer totals.
 */

interface Column {
  label: string;
  align?: "left" | "center" | "right";
  className?: string;
  width?: string;
}

export default function AriaTable({
  columns,
  children,
  loading = false,
  empty = false,
  emptyIcon,
  emptyMessage = "Sin registros",
  emptySubtext,
  footer,
  className = "",
}: {
  columns: (string | Column)[];
  children: ReactNode;
  loading?: boolean;
  empty?: boolean;
  emptyIcon?: ReactNode;
  emptyMessage?: string;
  emptySubtext?: string;
  footer?: ReactNode;
  className?: string;
}) {
  const cols = columns.map((c) =>
    typeof c === "string" ? { label: c, align: "left" as const, className: "", width: "" } : c
  );
  const colCount = cols.length;

  const alignClass = (align?: string) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <div className={`overflow-x-auto rounded-xl border border-white/[0.06] ${className}`}>
      <table className="w-full text-sm border-collapse">
        <thead
          className="sticky top-0 z-10"
          style={{ backgroundColor: "rgba(4,8,16,0.98)" }}
        >
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            {cols.map((col, i) => (
              <th
                key={i}
                className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap ${alignClass(col.align)} ${col.className || ""}`}
                style={{ color: "#4a6080" }}
                title={col.width ? undefined : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={colCount} className="py-16 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: "#22d3ee" }} />
              </td>
            </tr>
          ) : empty ? (
            <tr>
              <td colSpan={colCount} className="py-16 text-center">
                {emptyIcon && <div className="mx-auto mb-3 opacity-20">{emptyIcon}</div>}
                <p className="text-sm font-medium" style={{ color: "#7f93b0" }}>{emptyMessage}</p>
                {emptySubtext && <p className="text-xs mt-1" style={{ color: "#4a6080" }}>{emptySubtext}</p>}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
        {footer && !loading && !empty && (
          <tfoot style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>{footer}</tfoot>
        )}
      </table>
    </div>
  );
}
