"use client";
import { usePathname } from "next/navigation";
import AccessGuard from "@/components/AccessGuard";
/** 11-Oct-2026: además del módulo, revisa el submódulo (ej. residentes solo ven Asistencias; Dirección todo menos Asistencias) */
export default function TalentoLayout({ children }: { children: React.ReactNode }) {
  const p = usePathname() || "";
  const sub = p.split("/")[3] || "";
  const subKey = sub && sub !== "tareas" ? sub : undefined;
  return <AccessGuard key={subKey || "talento"} moduleKey="talento" subKey={subKey}>{children}</AccessGuard>;
}
