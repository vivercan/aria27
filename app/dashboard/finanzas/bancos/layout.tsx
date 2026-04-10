"use client";
import AccessGuard from "@/components/AccessGuard";
export default function BancosLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="finanzas" subKey="bancos">{children}</AccessGuard>;
}
