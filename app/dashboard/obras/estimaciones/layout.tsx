"use client";
import AccessGuard from "@/components/AccessGuard";
export default function EstimacionesLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="obras" subKey="estimaciones">{children}</AccessGuard>;
}
