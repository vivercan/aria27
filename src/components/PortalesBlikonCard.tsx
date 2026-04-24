"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Eye, EyeOff, Copy, ShieldAlert, Loader2, Check } from "lucide-react";

/**
 * PortalesBlikonCard - Acceso a portales de facturacion CFDI Blikon.
 * 24-Abr-2026. Lee credenciales desde /api/portales-credenciales con audit log.
 */

interface CredencialListItem {
  id: string;
  portal_key: string;
  portal_nombre: string;
  portal_url: string;
  empresa: string;
  rfc: string;
  usuario: string;
  pin: string | null;
  notas: string | null;
  activo: boolean;
}

interface CredencialFull extends CredencialListItem {
  password: string;
}

export default function PortalesBlikonCard() {
  const [lista, setLista] = useState<CredencialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reveladas, setReveladas] = useState<Record<string, CredencialFull>>({});
  const [loadingPass, setLoadingPass] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const getEmail = () => (typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "");

  useEffect(() => {
    (async () => {
      try {
        const email = getEmail();
        const res = await fetch("/api/portales-credenciales?portal=blikon", {
          headers: { "x-user-email": email },
        });
        const j = await res.json();
        if (!res.ok) {
          setError(j?.error || `HTTP ${res.status}`);
        } else {
          setLista(j.credenciales || []);
        }
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const revelarPassword = async (empresa: string) => {
    setLoadingPass(empresa);
    try {
      const email = getEmail();
      const res = await fetch(`/api/portales-credenciales?portal=blikon&empresa=${encodeURIComponent(empresa)}`, {
        headers: { "x-user-email": email },
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j?.error || `HTTP ${res.status}`);
      } else {
        setReveladas(prev => ({ ...prev, [empresa]: j.credencial }));
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoadingPass(null);
    }
  };

  const ocultarPassword = (empresa: string) => {
    setReveladas(prev => {
      const next = { ...prev };
      delete next[empresa];
      return next;
    });
  };

  const copiar = async (texto: string, key: string, credencialId?: string, empresa?: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(key);
      setTimeout(() => setCopiado(null), 1500);
      // Audit
      if (credencialId) {
        const email = getEmail();
        fetch("/api/portales-credenciales", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-email": email },
          body: JSON.stringify({ credencial_id: credencialId, portal_key: "blikon", empresa, accion: "COPY_PASSWORD" }),
        }).catch(() => {});
      }
    } catch {
      setError("No se pudo copiar al portapapeles");
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#2C3D52] via-[#263647] to-[#21303E] border border-[#8CB2E4]/20 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-aria-accent" />
        <span className="text-sm text-[#c9d8ed]">Cargando portales de facturacion...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#C8444A]/15 to-[#A53039]/20 border border-rose-500/30">
        <div className="flex items-center gap-2 text-rose-300 text-sm">
          <ShieldAlert className="w-4 h-4" /> Portales CFDI: {error}
        </div>
      </div>
    );
  }

  if (lista.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-[#7f93b0]">
        No hay portales de facturacion configurados. Ejecutar scripts/portales-credenciales-ddl.sql en Supabase.
      </div>
    );
  }

  const portalUrl = lista[0].portal_url;

  return (
    <div className="p-5 bg-gradient-to-br from-[#2C3D52] via-[#263647] to-[#21303E] border border-[#8CB2E4]/25 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)] space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-xl bg-[#1E3E7A]/30 flex-shrink-0">
            <ExternalLink className="w-5 h-5 text-aria-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white">Portales Facturacion CFDI - Blikon</h3>
            <p className="text-xs text-[#7f93b0] mt-0.5">
              3 empresas del grupo (AVANTE / DENIVEL / TERRACRET). Acceso auditado por user + accion.
            </p>
          </div>
        </div>
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-b from-[#1E3E7A] to-[#163068] border border-[rgba(140,178,228,0.25)] text-white text-sm font-medium hover:from-[#2A4A8E] hover:to-[#1E3E7A] transition-colors shadow-[inset_0_1px_0_rgba(220,235,255,0.10),0_2px_6px_rgba(0,0,0,0.30)]"
        >
          Abrir portal <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {lista.map(cred => {
          const revelada = reveladas[cred.empresa];
          const isLoading = loadingPass === cred.empresa;
          return (
            <div
              key={cred.id}
              className="p-4 rounded-xl bg-[#040810]/50 border border-white/[0.08] space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white tracking-wide">{cred.empresa}</span>
                <span className="text-[10px] text-[#7f93b0] font-mono">{cred.rfc}</span>
              </div>
              <Row label="Usuario" value={cred.usuario} onCopy={() => copiar(cred.usuario, `u-${cred.empresa}`)} copiado={copiado === `u-${cred.empresa}`} />
              <Row label="PIN" value={cred.pin || "-"} onCopy={() => cred.pin && copiar(cred.pin, `pin-${cred.empresa}`)} copiado={copiado === `pin-${cred.empresa}`} />
              <div className="pt-1">
                {revelada ? (
                  <div className="space-y-1.5">
                    <Row
                      label="Contrasena"
                      value={revelada.password}
                      onCopy={() => copiar(revelada.password, `p-${cred.empresa}`, cred.id, cred.empresa)}
                      copiado={copiado === `p-${cred.empresa}`}
                      mono
                    />
                    <button
                      onClick={() => ocultarPassword(cred.empresa)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-[#c9d8ed]"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Ocultar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => revelarPassword(cred.empresa)}
                    disabled={isLoading}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-b from-[#1E3E7A] to-[#163068] border border-[rgba(140,178,228,0.25)] text-xs text-white font-medium hover:from-[#2A4A8E] hover:to-[#1E3E7A] disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    {isLoading ? "Cargando..." : "Ver contrasena"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
        <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Acceso restringido a roles admin / compras / direccion. Cada clic en &quot;Ver&quot; o &quot;Copiar contrasena&quot; queda registrado en <code className="font-mono">portales_accesos_log</code> con tu email + IP + accion.
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, onCopy, copiado, mono = false }: { label: string; value: string; onCopy: () => void; copiado: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="text-[#7f93b0] uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
        <span className={`text-[#EAF2FF] truncate ${mono ? "font-mono" : ""}`} title={value}>{value}</span>
        <button
          onClick={onCopy}
          className="p-1 rounded hover:bg-white/[0.08] text-[#7f93b0] hover:text-[#EAF2FF] flex-shrink-0"
          title="Copiar"
        >
          {copiado ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
