"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Copy, ShieldAlert, Loader2, Check, LogIn, ArrowRight, X } from "lucide-react";

/**
 * PortalesBlikonCard - Wizard de acceso rapido a portal Blikon CFDI.
 * 24-Abr-2026 v2: flujo "Facturar como {EMPRESA}" con 3 pasos.
 *
 * UX:
 *  1. Click boton "Facturar como AVANTE" en una de las 3 tarjetas.
 *  2. ARIA copia USUARIO al portapapeles automaticamente + abre Blikon en pestana nueva.
 *  3. Modal wizard te guia: PEGA USUARIO -> Copiar contrasena -> PEGA -> Copiar PIN -> PEGA -> Listo.
 *  4. Cada copia dispara audit en portales_accesos_log.
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

type WizardStep = "USER" | "PASS" | "PIN" | "DONE";

interface WizardState {
  empresa: string;
  credencial: CredencialFull;
  step: WizardStep;
  justCopied: boolean;
}

export default function PortalesBlikonCard() {
  const [lista, setLista] = useState<CredencialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizard, setWizard] = useState<WizardState | null>(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState<string | null>(null);
  const [copiadoRow, setCopiadoRow] = useState<string | null>(null);

  const getEmail = () => (typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "");

  useEffect(() => {
    (async () => {
      try {
        const email = getEmail();
        const res = await fetch("/api/portales-credenciales?portal=blikon", {
          headers: { "x-user-email": email },
        });
        const j = await res.json();
        if (!res.ok) setError(j?.error || `HTTP ${res.status}`);
        else setLista(j.credenciales || []);
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const auditCopy = (credencialId: string, empresa: string, campo: string) => {
    const email = getEmail();
    fetch("/api/portales-credenciales", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-email": email },
      body: JSON.stringify({
        credencial_id: credencialId,
        portal_key: "blikon",
        empresa,
        accion: campo === "password" ? "COPY_PASSWORD" : "VIEW_PASSWORD",
      }),
    }).catch(() => {});
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const iniciarFacturacion = async (empresa: string) => {
    setLoadingEmpresa(empresa);
    setError(null);
    try {
      const email = getEmail();
      const res = await fetch(
        `/api/portales-credenciales?portal=blikon&empresa=${encodeURIComponent(empresa)}`,
        { headers: { "x-user-email": email } }
      );
      const j = await res.json();
      if (!res.ok) {
        setError(j?.error || `HTTP ${res.status}`);
        return;
      }
      const credencial = j.credencial as CredencialFull;
      // Copiar usuario al portapapeles
      await copyToClipboard(credencial.usuario);
      // Abrir Blikon en pestana nueva
      window.open(credencial.portal_url, "_blank", "noopener,noreferrer");
      // Abrir wizard
      setWizard({ empresa, credencial, step: "USER", justCopied: true });
      setTimeout(() => setWizard(prev => prev ? { ...prev, justCopied: false } : null), 1200);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoadingEmpresa(null);
    }
  };

  const siguientePaso = async () => {
    if (!wizard) return;
    if (wizard.step === "USER") {
      await copyToClipboard(wizard.credencial.password);
      auditCopy(wizard.credencial.id, wizard.empresa, "password");
      setWizard({ ...wizard, step: "PASS", justCopied: true });
      setTimeout(() => setWizard(prev => prev ? { ...prev, justCopied: false } : null), 1200);
    } else if (wizard.step === "PASS") {
      if (wizard.credencial.pin) {
        await copyToClipboard(wizard.credencial.pin);
        setWizard({ ...wizard, step: "PIN", justCopied: true });
        setTimeout(() => setWizard(prev => prev ? { ...prev, justCopied: false } : null), 1200);
      } else {
        setWizard({ ...wizard, step: "DONE", justCopied: false });
      }
    } else if (wizard.step === "PIN") {
      setWizard({ ...wizard, step: "DONE", justCopied: false });
    }
  };

  const cerrarWizard = () => setWizard(null);

  const copyListRow = async (text: string, key: string) => {
    await copyToClipboard(text);
    setCopiadoRow(key);
    setTimeout(() => setCopiadoRow(null), 1500);
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
        No hay portales configurados. Ejecutar scripts/portales-credenciales-ddl.sql en Supabase.
      </div>
    );
  }

  const portalUrl = lista[0].portal_url;

  return (
    <div className="p-5 bg-gradient-to-br from-[#2C3D52] via-[#263647] to-[#21303E] border border-[#8CB2E4]/25 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)] space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="p-2.5 rounded-xl bg-[#1E3E7A]/30 flex-shrink-0">
            <LogIn className="w-5 h-5 text-aria-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white">Facturar en Portal Blikon CFDI</h3>
            <p className="text-xs text-[#7f93b0] mt-0.5">
              Selecciona una empresa y el sistema te guia: copia usuario, abre Blikon, paso a paso hasta el PIN.
            </p>
          </div>
        </div>
        <a
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#c9d8ed] text-xs hover:bg-white/[0.06]"
        >
          Abrir portal sin wizard <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {lista.map(cred => {
          const isLoading = loadingEmpresa === cred.empresa;
          return (
            <div
              key={cred.id}
              className="p-4 rounded-xl bg-[#040810]/50 border border-white/[0.08] space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white tracking-wide">{cred.empresa}</span>
                <button
                  onClick={() => copyListRow(cred.rfc, `rfc-${cred.empresa}`)}
                  className="flex items-center gap-1 text-[10px] text-[#7f93b0] font-mono hover:text-[#EAF2FF]"
                  title="Copiar RFC"
                >
                  {copiadoRow === `rfc-${cred.empresa}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                  {cred.rfc}
                </button>
              </div>
              <div className="text-[11px] text-[#7f93b0] space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#4a6080] uppercase tracking-wider">user</span>
                  <span className="font-mono text-[#c9d8ed]">{cred.usuario}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#4a6080] uppercase tracking-wider">pin</span>
                  <span className="font-mono text-[#c9d8ed]">{cred.pin || "-"}</span>
                </div>
              </div>
              <button
                onClick={() => iniciarFacturacion(cred.empresa)}
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-b from-[#1E3E7A] to-[#163068] border border-[rgba(140,178,228,0.25)] text-sm text-white font-semibold hover:from-[#2A4A8E] hover:to-[#1E3E7A] disabled:opacity-50 shadow-[inset_0_1px_0_rgba(220,235,255,0.10),0_2px_6px_rgba(0,0,0,0.30)]"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                {isLoading ? "Preparando..." : `Facturar como ${cred.empresa}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
        <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Acceso restringido a roles admin / compras / direccion. Cada copia queda registrada en <code className="font-mono">portales_accesos_log</code>.
        </span>
      </div>

      {/* MODAL WIZARD */}
      {wizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={cerrarWizard}>
          <div
            className="relative w-full max-w-md bg-gradient-to-br from-[#2C3D52] via-[#263647] to-[#21303E] border border-[#8CB2E4]/30 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-6"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={cerrarWizard} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/[0.08] text-[#7f93b0] hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-[#1E3E7A]/40">
                <LogIn className="w-5 h-5 text-aria-accent" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base">Facturando como {wizard.empresa}</h3>
                <p className="text-xs text-[#7f93b0]">{wizard.credencial.rfc} - {wizard.credencial.portal_nombre}</p>
              </div>
            </div>

            <StepIndicator step={wizard.step} hasPin={!!wizard.credencial.pin} />

            <div className="mt-5 space-y-4">
              {wizard.step === "USER" && (
                <WizardStepView
                  numero={1}
                  titulo="Pega el USUARIO en Blikon"
                  valor={wizard.credencial.usuario}
                  tip="Ya copie el usuario al portapapeles. Pega en el campo de usuario en la pestana nueva de Blikon."
                  copiado={wizard.justCopied}
                />
              )}
              {wizard.step === "PASS" && (
                <WizardStepView
                  numero={2}
                  titulo="Pega la CONTRASENA en Blikon"
                  valor={"*".repeat(wizard.credencial.password.length)}
                  tip="Contrasena copiada al portapapeles. Pega en el campo password. Si algo salio mal presiona el boton abajo para copiar de nuevo."
                  copiado={wizard.justCopied}
                />
              )}
              {wizard.step === "PIN" && (
                <WizardStepView
                  numero={3}
                  titulo="Pega el PIN en Blikon"
                  valor={wizard.credencial.pin || "-"}
                  tip="PIN copiado. Si Blikon no pide PIN, ya estas dentro."
                  copiado={wizard.justCopied}
                />
              )}
              {wizard.step === "DONE" && (
                <div className="text-center py-6 space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-white font-semibold">Listo. Ya estas dentro de Blikon como {wizard.empresa}.</p>
                  <p className="text-xs text-[#7f93b0]">Captura tu factura y regresa a ARIA cuando termines.</p>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center gap-2">
              {wizard.step !== "DONE" ? (
                <>
                  <button
                    onClick={async () => {
                      if (wizard.step === "USER") await copyToClipboard(wizard.credencial.usuario);
                      else if (wizard.step === "PASS") await copyToClipboard(wizard.credencial.password);
                      else if (wizard.step === "PIN") await copyToClipboard(wizard.credencial.pin || "");
                      setWizard(prev => prev ? { ...prev, justCopied: true } : null);
                      setTimeout(() => setWizard(prev => prev ? { ...prev, justCopied: false } : null), 1200);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-sm text-[#c9d8ed]"
                  >
                    {wizard.justCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {wizard.justCopied ? "Copiado" : "Copiar de nuevo"}
                  </button>
                  <button
                    onClick={siguientePaso}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-b from-[#1E3E7A] to-[#163068] border border-[rgba(140,178,228,0.25)] text-sm text-white font-semibold hover:from-[#2A4A8E] hover:to-[#1E3E7A]"
                  >
                    Siguiente <ArrowRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={cerrarWizard}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-b from-[#1F8A60] to-[#16704D] border border-emerald-400/30 text-sm text-white font-semibold hover:brightness-110"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step, hasPin }: { step: WizardStep; hasPin: boolean }) {
  const steps: WizardStep[] = hasPin ? ["USER", "PASS", "PIN", "DONE"] : ["USER", "PASS", "DONE"];
  const labels: Record<WizardStep, string> = { USER: "Usuario", PASS: "Contrasena", PIN: "PIN", DONE: "Listo" };
  const currentIdx = steps.indexOf(step);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const active = i === currentIdx;
        const done = i < currentIdx;
        return (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                done ? "bg-emerald-500 text-white" : active ? "bg-[#1E3E7A] text-white ring-2 ring-[#8CB2E4]/40" : "bg-white/[0.06] text-[#7f93b0]"
              }`}
            >
              {done ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-[11px] ${active ? "text-white font-semibold" : "text-[#7f93b0]"}`}>{labels[s]}</span>
            {i < steps.length - 1 && <div className={`flex-1 h-px ${done ? "bg-emerald-500/40" : "bg-white/[0.08]"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function WizardStepView({ numero, titulo, valor, tip, copiado }: { numero: number; titulo: string; valor: string; tip: string; copiado: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#1E3E7A] text-white text-[10px] font-bold">{numero}</span>
        <p className="text-sm font-semibold text-white">{titulo}</p>
      </div>
      <div className="p-3 rounded-lg bg-[#040810]/50 border border-white/[0.08]">
        <p className="text-xs text-[#7f93b0] uppercase tracking-wider mb-1">Valor copiado</p>
        <p className="font-mono text-white text-base break-all">{valor}</p>
      </div>
      <p className="text-[11px] text-[#7f93b0]">{tip}</p>
      {copiado && (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400">
          <Check className="w-3 h-3" /> Copiado al portapapeles
        </div>
      )}
    </div>
  );
}
