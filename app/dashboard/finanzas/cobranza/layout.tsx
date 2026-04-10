"use client";
import AccessGuard from "@/components/AccessGuard";
export default function CobranzaLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="finanzas" subKey="cobranza">{children}</AccessGuard>;
}
