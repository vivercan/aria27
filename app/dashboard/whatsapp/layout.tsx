"use client";
import AccessGuard from "@/components/AccessGuard";
export default function WhatsappLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="whatsapp">{children}</AccessGuard>;
}
