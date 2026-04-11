"use client";
import AccessGuard from "@/components/AccessGuard";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="administracion">{children}</AccessGuard>;
}
