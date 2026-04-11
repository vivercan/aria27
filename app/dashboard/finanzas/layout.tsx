"use client";
import AccessGuard from "@/components/AccessGuard";
export default function FinanzasLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="finanzas">{children}</AccessGuard>;
}
