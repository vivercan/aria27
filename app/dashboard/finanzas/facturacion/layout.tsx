"use client";
import AccessGuard from "@/components/AccessGuard";
export default function FacturacionLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="finanzas" subKey="facturacion">{children}</AccessGuard>;
}
