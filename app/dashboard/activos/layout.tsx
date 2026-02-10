"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ActivosLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="activos">{children}</AccessGuard>;
}
