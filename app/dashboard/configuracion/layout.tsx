"use client";
import AccessGuard from "@/components/AccessGuard";
export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="configuracion">{children}</AccessGuard>;
}
