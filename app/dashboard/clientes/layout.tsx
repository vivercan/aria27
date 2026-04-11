"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ClientesLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="clientes">{children}</AccessGuard>;
}
