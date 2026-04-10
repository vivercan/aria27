"use client";
import AccessGuard from "@/components/AccessGuard";
export default function PresupuestosLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="obras" subKey="presupuestos">{children}</AccessGuard>;
}
