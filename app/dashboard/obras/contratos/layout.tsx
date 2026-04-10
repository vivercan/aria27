"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ContratosLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="obras" subKey="contratos">{children}</AccessGuard>;
}
