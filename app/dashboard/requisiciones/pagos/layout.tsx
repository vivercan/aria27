"use client";
import AccessGuard from "@/components/AccessGuard";
export default function PagosLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="requisiciones" subKey="pagos">{children}</AccessGuard>;
}
