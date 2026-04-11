"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ObrasLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="obras">{children}</AccessGuard>;
}
