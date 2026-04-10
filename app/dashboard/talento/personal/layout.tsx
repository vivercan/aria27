"use client";
import AccessGuard from "@/components/AccessGuard";
export default function PersonalLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="talento" subKey="personal">{children}</AccessGuard>;
}
