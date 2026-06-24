"use client";

import { useEffect, useState } from "react";
import { Mail, Save, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";

interface ConfigState { configured: boolean; zoho_email: string | null; updated_at: string | null; }

export default function InboxCredsPage() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<ConfigState>({ configured: false, zoho_email: null, updated_at: null });
  const [zohoEmail, setZohoEmail] = useState("");
  const [zohoPassword, setZohoPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const e = (typeof window !== "undefined" ? localStorage.getItem("userEmail") : "") || "";
    setUserEmail(e);
    if (!e) { setLoading(false); return; }
    fetch("/api/mail/save-zoho-creds", { credentials: "include", })
      .then(r => r.json())
      .then((d: ConfigState) => { setState(d); if (d.zoho_email) setZohoEmail(d.zoho_email); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flash = (type: "ok" | "err", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleSave = async () => {
    if (!userEmail) { flash("err", "No se pudo identificar al usuario logueado. Cierra sesion y vuelve a entrar."); return; }
    if (!zohoEmail.trim() || !zohoPassword.trim()) { flash("err", "Debes ingresar email y contraseña"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(zohoEmail)) { flash("err", "Email invalido"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/mail/save-zoho-creds", {
        credentials: "include", method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ zoho_email: zohoEmail.trim(), zoho_password: zohoPassword }),
      });
      const data = await r.json();
      if (!r.ok) { flash("err", data.error || "Error al guardar"); return; }
      flash("ok", "Credenciales guardadas. Tu inbox ahora muestra: " + zohoEmail);
      setZohoPassword("");
      setState({ configured: true, zoho_email: zohoEmail, updated_at: new Date().toISOString() });
    } catch (e: unknown) {
      flash("err", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="aria-bg-canon min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <AriaBackButton href="/dashboard/configuracion" />
          <div>
            <h1 className="text-2xl font-bold text-white">Configuracion de Inbox personal</h1>
            <p className="text-xs text-[#7f93b0]">Tus credenciales Zoho — cifradas con pgcrypto en BD</p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-aria-accent" />
            <h2 className="text-white font-semibold">Cuenta de correo Zoho</h2>
          </div>

          {loading ? (
            <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></div>
          ) : (
            <>
              <div className="text-xs text-[#7f93b0] bg-black/20 p-3 rounded-lg border border-white/[0.04]">
                <p>Usuario logueado en ARIA: <span className="text-white font-medium">{userEmail || "(no detectado)"}</span></p>
                {state.configured ? (
                  <p className="mt-1 text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Inbox configurado: <span className="font-medium">{state.zoho_email}</span></p>
                ) : (
                  <p className="mt-1 text-amber-300 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Inbox NO configurado — ingresa tus credenciales abajo</p>
                )}
              </div>

              <div>
                <label className="text-[#7f93b0] text-xs block mb-1">Email Zoho *</label>
                <input type="email" value={zohoEmail} onChange={(e) => setZohoEmail(e.target.value)} placeholder="tu.correo@gcuavante.com"
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm focus:border-aria-accent outline-none" />
              </div>

              <div>
                <label className="text-[#7f93b0] text-xs block mb-1">Contraseña de aplicacion Zoho *</label>
                <div className="flex gap-2">
                  <input type={showPassword ? "text" : "password"} value={zohoPassword} onChange={(e) => setZohoPassword(e.target.value)}
                    placeholder="App password (no tu contraseña principal)"
                    className="flex-1 px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm focus:border-aria-accent outline-none" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-[#7f93b0] text-xs">
                    {showPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
                <p className="text-[10px] text-[#4a6080] mt-1">Genera tu app password en Zoho Mail Settings - Mail Accounts - IMAP Access - App Specific Password.</p>
              </div>

              {msg && (
                <div className={`p-3 rounded-lg text-xs ${msg.type === "ok" ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-red-500/15 text-red-300 border border-red-500/30"}`}>
                  {msg.text}
                </div>
              )}

              <button onClick={handleSave} disabled={saving}
                className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-aria-accent to-aria-primary text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Guardando..." : "Guardar credenciales"}
              </button>
            </>
          )}
        </div>

        <div className="p-4 rounded-xl bg-aria-accent-bg border border-aria-accent/30 text-xs text-[#7f93b0] space-y-1">
          <p className="text-aria-accent font-medium">Por que pedimos esto</p>
          <p>Cada usuario tiene su propio buzon Zoho. Antes el sistema usaba una cuenta compartida (env vars) y todos veian el mismo inbox. Ahora tu password se cifra en BD con pgcrypto y solo tu cuenta accede a tu inbox.</p>
          <p className="text-amber-300/80 mt-2">Tu password no se guarda en texto plano. Se cifra con la misma key que usamos para portales de facturacion.</p>
        </div>
      </div>
    </div>
  );
}
