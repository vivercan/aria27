"use client";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

/**
 * Wrapper estandarizado de tabla para ARIA27.
 * Incluye: sticky header, loading state, empty state, footer totals.
 *
 * Uso:
 *   <AriaTable
 *     columns={["Nombre", "Monto", "Estatus"]}
 *     loading={loading}
 *     empty={data.length === 0}
 *     emptyIcon={<Wallet className="w-10 h-10 opacity-30" />}
 *     emptyMessage="Sin registros"
 *     footer={<tr>...</tr>}
 *   >
 *     {data.map(item => <tr key={item.id}>...</tr>)}
 *   </AriaTable>
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
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <tr className="border-b border-white/[0.06]">
            {cols.map((col, i) => (
              <th
                key={i}
                className={`px-3 py-2.5 text-xs text-slate-400 font-medium ${alignClass(col.align)} ${col.className || ""}`}
                style={col.width ? { width: col.width } : undefined}
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
                <Loader2 className="w-6 h-6 animate-spin text-blue-400 mx-auto" />
              </td>
            </tr>
          ) : empty ? (
            <tr>
              <td colSpan={colCount} className="py-16 text-center text-slate-500">
                {emptyIcon && <div className="mx-auto mb-3">{emptyIcon}</div>}
                <p>{emptyMessage}</p>
                {emptySubtext && <p className="text-xs mt-1">{emptySubtext}</p>}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
        {footer && !loading && !empty && (
          <tfoot className="border-t border-white/[0.06]">{footer}</tfoot>
        )}
      </table>
    </div>
  );
}
