"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="import">{children}</AccessGuard>;
}
