"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ComprasLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="requisiciones" subKey="compras">{children}</AccessGuard>;
}
