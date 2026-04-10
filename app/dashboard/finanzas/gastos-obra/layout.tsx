"use client";
import AccessGuard from "@/components/AccessGuard";
export default function GastosObraLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="finanzas" subKey="gastos-obra">{children}</AccessGuard>;
}
