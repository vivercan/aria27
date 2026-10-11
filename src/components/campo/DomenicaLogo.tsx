"use client";
/** Doménica.27 — marca de la app en celular (10-Oct-2026). Toca para ir a Inicio. */
import Link from "next/link";

export default function DomenicaLogo({ grande = false }: { grande?: boolean }) {
  return (
    <Link href="/dashboard/campo" aria-label="Doménica.27 · Inicio" className="inline-flex items-baseline select-none" style={{ textDecoration: "none" }}>
      <span className="dom-wordmark" style={{ fontSize: grande ? 34 : 21 }}>Doménica</span>
      <span className="dom-wordmark-27" style={{ fontSize: grande ? 34 : 21 }}>.27</span>
    </Link>
  );
}
