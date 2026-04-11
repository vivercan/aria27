"use client";
import AccessGuard from "@/components/AccessGuard";
export default function InboxLayout({ children }: { children: React.ReactNode }) {
  return <AccessGuard moduleKey="inbox">{children}</AccessGuard>;
}
