"use client";
import AccessGuard from "@/components/AccessGuard";
export default function CarpetasLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="carpetas">{children}</AccessGuard>;
}
