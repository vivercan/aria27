"use client";
/** Ruta vieja: el modulo ahora se llama ARIA Doménica (/dashboard/domenica). */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Redirige() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/domenica"); }, [router]);
  return null;
}
