"use client";
import AccessGuard from "@/components/AccessGuard";
export default function FiniquitosLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="talento" subKey="finiquitos">{children}</AccessGuard>;
}
