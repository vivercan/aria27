"use client";
import AccessGuard from "@/components/AccessGuard";
export default function PlantillasLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="plantillas">{children}</AccessGuard>;
}
