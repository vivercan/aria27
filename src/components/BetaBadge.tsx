"use client";

import React from "react";

type Variant = "fachada" | "beta" | "no-operativo";

interface BetaBadgeProps {
  reason?: string;
  variant?: Variant;
}

const STYLES: Record<Variant, { bg: string; label: string }> = {
  fachada: { bg: "#fde68a", label: "FACHADA - NO OPERATIVO" },
  beta: { bg: "#bfdbfe", label: "BETA" },
  "no-operativo": { bg: "#fecaca", label: "NO OPERATIVO" },
};

export default function BetaBadge({ reason, variant = "fachada" }: BetaBadgeProps) {
  const s = STYLES[variant];
  return (
    <div
      role="alert"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: s.bg,
        color: "#111827",
        padding: "8px 16px",
        fontSize: 13,
        fontWeight: 600,
        borderBottom: "1px solid rgba(0,0,0,0.1)",
        display: "flex",
        gap: 12,
        alignItems: "center",
      }}
    >
      <span style={{ background: "#111827", color: "#fff", padding: "2px 8px", borderRadius: 4 }}>
        {s.label}
      </span>
      {reason && <span style={{ fontWeight: 400 }}>{reason}</span>}
    </div>
  );
}
