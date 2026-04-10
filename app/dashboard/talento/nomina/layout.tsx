"use client";
import AccessGuard from "@/components/AccessGuard";
export default function NominaLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="talento" subKey="nomina">{children}</AccessGuard>;
}
