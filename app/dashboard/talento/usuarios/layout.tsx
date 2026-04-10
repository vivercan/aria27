"use client";
import AccessGuard from "@/components/AccessGuard";
export default function UsuariosLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="talento" subKey="usuarios">{children}</AccessGuard>;
}
