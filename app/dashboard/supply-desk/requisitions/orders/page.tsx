"use client";

import { ClipboardList } from "lucide-react";

export default function OrdersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ClipboardList className="h-6 w-6 text-cyan-400" />
        Órdenes de Compra
      </h1>
      <p className="text-white/60 text-sm mb-8">Órdenes de compra autorizadas.</p>
      <div className="rounded-2xl bg-white/5 p-12 text-center text-white/50">
        No hay órdenes de compra generadas aún.
      </div>
    </div>
  );
}
