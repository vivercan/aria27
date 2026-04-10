"use client";
import AccessGuard from "@/components/AccessGuard";
export default function CajaLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="finanzas" subKey="caja">{children}</AccessGuard>;
}
