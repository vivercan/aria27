"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Mail, Send, Trash2, RefreshCw, Loader2, Inbox, PenSquare,
  ChevronLeft, Search, X, Paperclip, Star, Eye, AlertTriangle
} from "lucide-react";

/* ── tipos ── */
interface EmailHeader {
  seqno: number;
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  seen: boolean;
  flags: string[];
}

type Vista = "lista" | "leer" | "componer";
type Carpeta = "INBOX" | "Sent";

/* ── helpers ── */
function getZohoCreds(): { email: string; password: string } | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("zohoCreds");
  if (!raw) return null;
  try {
    const { e, p } = JSON.parse(atob(raw));
    return { email: e, password: p };
  } catch { return null; }
}

function fechaCorta(s: string) {
  try {
    const d = new Date(s);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString()) return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  } catch { return s; }
}

function nombreCorto(raw: string) {
  if (!raw) return "—";
  const match = raw.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : raw.replace(/<.*>/, "").trim() || raw;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function InboxPage() {
  const [vista, setVista] = useState<Vista>("lista");
  const [carpeta, setCarpeta] = useState<Carpeta>("INBOX");
  const [emails, setEmails] = useState<EmailHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());

  /* ── estado "leer" ── */
  const [emailActual, setEmailActual] = useState<EmailHeader | null>(null);
  const [cuerpo, setCuerpo] = useState({ body: "", html: "" });
  const [cargandoCuerpo, setCargandoCuerpo] = useState(false);

  /* ── estado "componer" ── */
  const [compTo, setCompTo] = useState("");
  const [compSubject, setCompSubject] = useState("");
  const [compBody, setCompBody] = useState("");
  const [enviando, setEnviando] = useState(false);

  const creds = getZohoCreds();
  const sinCreds = !creds;

  /* ── cargar lista ── */
  const cargarEmails = useCallback(async () => {
    if (!creds) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/mail/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: creds.email, password: creds.password, folder: carpeta, limit: 40 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al cargar");
      setEmails(data.emails || []);
      setSeleccionados(new Set());
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  }, [carpeta]);

  useEffect(() => { cargarEmails(); }, [cargarEmails]);

  /* ── abrir email ── */
  const abrirEmail = async (em: EmailHeader) => {
    if (!creds) return;
    setEmailActual(em);
    setVista("leer");
    setCargandoCuerpo(true);
    try {
      const r = await fetch("/api/mail/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: creds.email, password: creds.password, uid: em.uid, folder: carpeta }),
      });
      const data = await r.json();
      setCuerpo({ body: data.body || "", html: data.html || "" });
    } catch { setCuerpo({ body: "Error al cargar contenido", html: "" }); }
    setCargandoCuerpo(false);
  };

  /* ── eliminar seleccionados ── */
  const eliminarSeleccionados = async () => {
    if (!creds || seleccionados.size === 0) return;
    if (!confirm(`¿Eliminar ${seleccionados.size} correo(s)?`)) return;
    try {
      const uids = emails.filter(e => seleccionados.has(e.seqno)).map(e => e.seqno);
      await fetch("/api/mail/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: creds.email, password: creds.password, uids, folder: carpeta }),
      });
      cargarEmails();
    } catch (e: any) { setError(e.message); }
  };

  /* ── enviar ── */
  const enviarCorreo = async () => {
    if (!creds || !compTo.trim() || !compSubject.trim()) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: creds.email, password: creds.password,
          to: compTo.trim(), subject: compSubject.trim(), body: compBody,
          user_email: creds.email,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al enviar");
      setCompTo(""); setCompSubject(""); setCompBody("");
      setVista("lista");
      cargarEmails();
    } catch (e: any) { alert("Error: " + e.message); }
    setEnviando(false);
  };

  /* ── responder ── */
  const responder = () => {
    if (!emailActual) return;
    const fromAddr = emailActual.from.match(/<(.+?)>/)?.[1] || emailActual.from;
    setCompTo(fromAddr);
    setCompSubject(`Re: ${emailActual.subject || ""}`);
    setCompBody(`\n\n--- Mensaje original ---\n${cuerpo.body || ""}`);
    setVista("componer");
  };

  /* ── filtro búsqueda ── */
  const emailsFiltrados = busqueda.trim()
    ? emails.filter(e =>
        (e.subject || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.from || "").toLowerCase().includes(busqueda.toLowerCase())
      )
    : emails;

  const toggleSel = (seqno: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(seqno) ? next.delete(seqno) : next.add(seqno);
      return next;
    });
  };

  /* ═══════════════════════ SIN CREDENCIALES ═══════════════════════ */
  if (sinCreds) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-lg mx-auto text-center py-20">
          <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Sesión de correo no activa</h2>
          <p className="text-slate-400 mb-6">
            Para usar el correo, cierra sesión y vuelve a iniciar con tus credenciales de Zoho Mail.
            Las credenciales se guardan solo en tu sesión de navegador.
          </p>
          <Link href="/dashboard" className="px-4 py-2 bg-sky-500/20 text-sky-300 rounded-lg hover:bg-sky-500/30 transition-colors">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }

  /* ═══════════════════════ VISTA COMPONER ═══════════════════════ */
  if (vista === "componer") {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/10">
          <button onClick={() => setVista("lista")} className="p-2 hover:bg-white/10 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <PenSquare className="w-5 h-5 text-sky-400" />
          <span className="text-white font-semibold">Nuevo correo</span>
          <div className="flex-1" />
          <button
            onClick={enviarCorreo}
            disabled={enviando || !compTo.trim() || !compSubject.trim()}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </div>
        {/* campos */}
        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400 w-16">Para:</label>
            <input value={compTo} onChange={e => setCompTo(e.target.value)} placeholder="correo@ejemplo.com"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-sky-500/50" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-400 w-16">Asunto:</label>
            <input value={compSubject} onChange={e => setCompSubject(e.target.value)} placeholder="Asunto del correo"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-sky-500/50" />
          </div>
          <textarea
            value={compBody} onChange={e => setCompBody(e.target.value)}
            placeholder="Escribe tu mensaje..."
            rows={16}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-sky-500/50 resize-none"
          />
        </div>
      </div>
    );
  }

  /* ═══════════════════════ VISTA LEER ═══════════════════════ */
  if (vista === "leer" && emailActual) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/10">
          <button onClick={() => { setVista("lista"); setEmailActual(null); }} className="p-2 hover:bg-white/10 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{emailActual.subject || "(sin asunto)"}</p>
            <p className="text-xs text-slate-400 truncate">De: {emailActual.from} · {fechaCorta(emailActual.date)}</p>
          </div>
          <button onClick={responder} className="px-3 py-1.5 bg-sky-500/20 text-sky-300 rounded-lg text-sm hover:bg-sky-500/30 transition-colors">
            Responder
          </button>
        </div>
        {/* cuerpo */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {cargandoCuerpo ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-400" /></div>
          ) : cuerpo.html ? (
            <div className="bg-white rounded-lg p-4 text-black">
              <iframe
                srcDoc={cuerpo.html}
                className="w-full min-h-[400px] border-0"
                sandbox="allow-same-origin"
                title="Email content"
              />
            </div>
          ) : (
            <pre className="text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">{cuerpo.body || "Sin contenido"}</pre>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════ VISTA LISTA ═══════════════════════ */
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/10 flex-wrap">
        <Link href="/dashboard" className="p-2 hover:bg-white/10 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <Mail className="w-5 h-5 text-sky-400" />
        <span className="text-white font-semibold">Correo</span>

        {/* tabs carpeta */}
        <div className="flex bg-white/5 rounded-lg p-0.5 ml-2">
          {(["INBOX", "Sent"] as Carpeta[]).map(c => (
            <button key={c} onClick={() => { setCarpeta(c); setSeleccionados(new Set()); }}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${carpeta === c ? "bg-sky-500/30 text-sky-300" : "text-slate-400 hover:text-white"}`}>
              {c === "INBOX" ? "Recibidos" : "Enviados"}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* buscador */}
        <div className="relative w-full md:w-64 order-last md:order-none mt-2 md:mt-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-8 py-1.5 text-sm text-white outline-none focus:border-sky-500/50" />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* acciones */}
        <button onClick={() => setVista("componer")} className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm flex items-center gap-1.5 transition-colors">
          <PenSquare className="w-4 h-4" /> Redactar
        </button>
        <button onClick={cargarEmails} disabled={loading} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 disabled:opacity-40">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
        {seleccionados.size > 0 && (
          <button onClick={eliminarSeleccionados} className="p-2 hover:bg-red-500/20 rounded-lg text-red-400">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* lista */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}
        {loading && emails.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-sky-400" /></div>
        ) : emailsFiltrados.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Inbox className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>{busqueda ? "Sin resultados" : "Bandeja vacía"}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {emailsFiltrados.map(em => (
              <div key={em.uid || em.seqno}
                className={`flex items-center gap-3 px-4 md:px-6 py-3 hover:bg-white/5 cursor-pointer transition-colors ${!em.seen ? "bg-sky-500/5" : ""}`}
              >
                <input type="checkbox" checked={seleccionados.has(em.seqno)}
                  onChange={() => toggleSel(em.seqno)}
                  className="w-4 h-4 rounded border-white/20 accent-sky-500 flex-shrink-0" />
                <div className="flex-1 min-w-0" onClick={() => abrirEmail(em)}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${!em.seen ? "text-white font-semibold" : "text-slate-300"}`}>
                      {carpeta === "INBOX" ? nombreCorto(em.from) : nombreCorto(em.to)}
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0">{fechaCorta(em.date)}</span>
                  </div>
                  <p className={`text-sm truncate ${!em.seen ? "text-slate-200" : "text-slate-500"}`}>
                    {em.subject || "(sin asunto)"}
                  </p>
                </div>
                {!em.seen && <div className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* footer */}
      <div className="px-4 md:px-6 py-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-500">
        <span>{emails.length} correo(s) en {carpeta === "INBOX" ? "Recibidos" : "Enviados"}</span>
        <span>{creds?.email}</span>
      </div>
    </div>
  );
}
