"use client";
import { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import CanonPageHeader from "@/components/ui/CanonPageHeader";

export default function CombTemplatesPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ name: string; status: string; detail?: unknown }>>([]);

  async function disparar() {
    setLoading(true);
    setResults([]);
    try {
      const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
      const r = await fetch("/api/admin/seed-meta-templates-combustibles", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": email },
      });
      const d = await r.json();
      if (d.results) setResults(d.results);
      else setResults([{ name: "error", status: "ERROR", detail: d }]);
    } catch (e) {
      setResults([{ name: "exception", status: "ERROR", detail: String(e) }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#04081A] text-white">
      <CanonPageHeader
        title="Seed Plantillas Meta — Combustibles 2.0"
        subtitle="Crea las 4 plantillas WA restantes via Meta Graph API"
      />
      <div className="p-6 max-w-3xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <h2 className="text-lg font-semibold">Pre-requisito</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-[#a0b3cc]">
            <li>Ve a <code className="text-aria-accent">business.facebook.com/settings/system-users</code></li>
            <li>Crea/usa un System User con permisos <code>whatsapp_business_management</code> y <code>whatsapp_business_messaging</code></li>
            <li>Genera token (sin caducidad)</li>
            <li>Pégalo en Vercel <code>META_ACCESS_TOKEN</code> env var</li>
            <li>Redeploy ARIA</li>
            <li>Vuelve aquí y dale el botón ↓</li>
          </ol>
        </div>

        <button
          onClick={disparar}
          disabled={loading}
          className="flex items-center gap-3 rounded-xl bg-amber-500/30 hover:bg-amber-500/50 disabled:opacity-40 px-6 py-3 text-base font-medium text-amber-200 transition"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          {loading ? "Sometiendo a Meta..." : "Crear las 5 plantillas en Meta"}
        </button>

        {results.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#7f93b0]">Resultado</h3>
            {results.map((r, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03]">
                {r.status === "CREATED" || r.status === "EXISTS" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-mono text-sm">{r.name}</div>
                  <div className="text-xs text-[#7f93b0]">{r.status}</div>
                  {r.detail !== undefined && r.detail !== null && (
                    <pre className="text-[10px] mt-2 text-[#5a708a] overflow-auto max-h-24">{JSON.stringify(r.detail, null, 2)}</pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
