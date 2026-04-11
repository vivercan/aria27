"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ReportesLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="reportes">{children}</AccessGuard>;
}
