"use client";
import AccessGuard from "@/components/AccessGuard";
export default function AdminSistemaLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="admin_sistema">{children}</AccessGuard>;
}
