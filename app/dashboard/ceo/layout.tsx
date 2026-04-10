"use client";
import AccessGuard from "@/components/AccessGuard";
export default function CeoLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="ceo">{children}</AccessGuard>;
}
