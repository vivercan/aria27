"use client";
import AccessGuard from "@/components/AccessGuard";
export default function TalentoLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="talento">{children}</AccessGuard>;
}
