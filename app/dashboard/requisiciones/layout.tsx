"use client";
import AccessGuard from "@/components/AccessGuard";
export default function RequisicionesLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="requisiciones">{children}</AccessGuard>;
}
