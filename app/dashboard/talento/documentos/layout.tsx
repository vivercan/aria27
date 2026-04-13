"use client";
import AccessGuard from "@/components/AccessGuard";
export default function DocumentosLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="talento" subKey="documentos">{children}</AccessGuard>;
}
