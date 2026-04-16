"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Trash2, RefreshCw, Loader2, Inbox as InboxIcon,
  PenSquare, Search, X, AlertTriangle, Reply, Star,
  ChevronLeft,
} from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import ConfirmModal from "@/components/ConfirmModal";
import { useFlashMessage } from "@/lib/use-flash-message";
import AriaBackButton from "@/components/AriaBackButton";

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

type Vista    = "lista" | "leer";
type Carpeta  = "INBOX" | "Sent";

/* ── helpers ── */
function fechaCorta(s: string) {
  try {
    const d   = new Date(s);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString())
      return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  } catch { return s; }
}

function nombreCorto(raw: string) {
  if (!raw) return "—";
  const m = raw.match(/^"?([^"<]+)"?\s*</);
  return m ? m[1].trim() : raw.replace(/<.*>/, "").trim() || raw;
}

const AVATAR_COLORS = [
  "#1A73E8","#E91E63","#9C27B0","#FF5722",
  "#4CAF50","#FF9800","#00BCD4","#E53935",
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const CACHE_KEY      = (f: Carpeta) => `aria27_inbox_${f}`;
const AUTO_REFRESH_MS = 2 * 60 * 1000;

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function InboxPage() {
  const { msg, flash } = useFlashMessage();

  const [confirmState, setConfirmState] = useState<{
    open: boolean; msg: string; onOk: () => void;
  }>({ open: false, msg: "", onOk: () => {} });

  const [vista,        setVista]        = useState<Vista>("lista");
  const [carpeta,      setCarpeta]      = useState<Carpeta>("INBOX");
  const [emails,       setEmails]       = useState<EmailHeader[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState("");
  const [lastUpdate,   setLastUpdate]   = useState<Date | null>(null);
  const [busqueda,     setBusqueda]     = useState("");
  const [seleccionados,setSeleccionados]= useState<Set<number>>(new Set());
  const [starred,      setStarred]      = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* leer */
  const [emailActual,    setEmailActual]    = useState<EmailHeader | null>(null);
  const [cuerpo,         setCuerpo]         = useState({ body: "", html: "" });
  const [cargandoCuerpo, setCargandoCuerpo] = useState(false);

  /* componer (modal flotante) */
  const [composeOpen,  setComposeOpen]  = useState(false);
  const [compMinimized,setCompMinimized]= useState(false);
  const [compTo,       setCompTo]       = useState("");
  const [compSubject,  setCompSubject]  = useState("");
  const [compBody,     setCompBody]     = useState("");
  const [enviando,     setEnviando]     = useState(false);

  /* ─── cargar lista ─── */
  const cargarEmails = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const r    = await fetch("/api/mail/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: carpeta, limit: 40 }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) {
        setError("Credenciales de correo no configuradas. Verifica ZOHO_EMAIL y ZOHO_PASSWORD en Vercel.");
        if (!silencioso) setLoading(false); else setRefreshing(false);
        return;
      }
      if (!r.ok) throw new Error(data.error || "Error al conectar con Zoho");
      const lista: EmailHeader[] = data.emails || [];
      setEmails(lista);
      setSeleccionados(new Set());
      setLastUpdate(new Date());
      try {
        sessionStorage.setItem(CACHE_KEY(carpeta), JSON.stringify({ emails: lista, at: new Date().toISOString() }));
      } catch { /* ok */ }
    } catch (e: unknown) {
      setError((e as Error).message || "Error de conexión");
    }
    if (!silencioso) setLoading(false); else setRefreshing(false);
  }, [carpeta]);

  /* carga inicial con caché */
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY(carpeta));
      if (cached) {
        const { emails: c } = JSON.parse(cached);
        if (Array.isArray(c) && c.length > 0) { setEmails(c); setLoading(false); }
      }
    } catch { /* ok */ }
    cargarEmails(emails.length > 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carpeta]);

  /* auto-refresh */
  useEffect(() => {
    if (vista !== "lista") return;
    intervalRef.current = setInterval(() => cargarEmails(true), AUTO_REFRESH_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [vista, cargarEmails]);

  useEffect(() => { cargarEmails(false); /* eslint-disable-next-line */ }, []);

  /* ─── abrir email ─── */
  const abrirEmail = async (em: EmailHeader) => {
    setEmailActual(em);
    setVista("leer");
    setCargandoCuerpo(true);
    try {
      const r    = await fetch("/api/mail/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: em.uid, folder: carpeta }),
      });
      const data = await r.json().catch(() => ({}));
      setCuerpo({ body: data.body || "", html: data.html || "" });
    } catch { setCuerpo({ body: "Error al cargar contenido", html: "" }); }
    setCargandoCuerpo(false);
  };

  /* ─── eliminar ─── */
  const eliminarSeleccionados = () => {
    if (seleccionados.size === 0) return;
    setConfirmState({
      open: true,
      msg: `¿Eliminar ${seleccionados.size} correo(s)? Esta acción no se puede deshacer.`,
      onOk: async () => {
        try {
          const uids = emails.filter(e => seleccionados.has(e.seqno)).map(e => e.seqno);
          await fetch("/api/mail/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uids, folder: carpeta }),
          });
          cargarEmails(false);
        } catch (e: unknown) { setError((e as Error).message); }
      },
    });
  };

  /* ─── enviar ─── */
  const enviarCorreo = async () => {
    if (!compTo.trim() || !compSubject.trim()) return;
    setEnviando(true);
    try {
      const r    = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: compTo.trim(), subject: compSubject.trim(), body: compBody }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Error al enviar");
      setCompTo(""); setCompSubject(""); setCompBody("");
      setComposeOpen(false);
      cargarEmails(false);
      flash("ok", "Correo enviado correctamente");
    } catch (e: unknown) { flash("err", "Error: " + (e as Error).message); }
    setEnviando(false);
  };

  /* ─── responder ─── */
  const responder = () => {
    if (!emailActual) return;
    const fromAddr = emailActual.from.match(/<(.+?)>/)?.[1] || emailActual.from;
    setCompTo(fromAddr);
    setCompSubject(`Re: ${emailActual.subject || ""}`);
    setCompBody(`\n\n--- Mensaje original ---\n${cuerpo.body || ""}`);
    setComposeOpen(true);
    setCompMinimized(false);
  };

  /* ─── filtros y selección ─── */
  const emailsFiltrados = busqueda.trim()
    ? emails.filter(e =>
        (e.subject || "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (e.from    || "").toLowerCase().includes(busqueda.toLowerCase())
      )
    : emails;

  const unreadCount       = emails.filter(e => !e.seen).length;
  const todosSeleccionados = emailsFiltrados.length > 0 &&
    emailsFiltrados.every(e => seleccionados.has(e.seqno));

  const toggleTodos = () =>
    todosSeleccionados
      ? setSeleccionados(new Set())
      : setSeleccionados(new Set(emailsFiltrados.map(e => e.seqno)));

  const toggleSel = (seqno: number) =>
    setSeleccionados(prev => {
      const n = new Set(prev);
      n.has(seqno) ? n.delete(seqno) : n.add(seqno);
      return n;
    });

  const toggleStar = (seqno: number, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setStarred(prev => {
      const n = new Set(prev);
      n.has(seqno) ? n.delete(seqno) : n.add(seqno);
      return n;
    });
  };

  /* ── palette: dark navy armónica con ARIA27 ── */
  const G = {
    bg:        "#0D1F38",                      // main content area
    sidebar:   "#08172E",                      // inbox sidebar ≈ ARIA27 nav (transición suave)
    white:     "#112640",                      // superficie elevada (cards, modales)
    border:    "rgba(145,175,225,0.11)",
    text:      "#E8F0FE",                      // texto principal claro
    secondary: "#7B9EC4",                      // texto secundario/muted
    blue:      "#7BB6FF",                      // accent ARIA27
    hover:     "#152E4D",                      // hover row
    unread:    "#112844",                      // fila no leída (ligeramente más clara)
    read:      "#0D1F38",                      // fila leída = mismo bg
    selected:  "#1B3D6A",                      // fila seleccionada
    error:     "rgba(217,48,37,0.12)",
  };

  /* ══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div
      className="h-full flex overflow-hidden"
      style={{ background: G.bg, fontFamily: "system-ui, -apple-system, Arial, sans-serif" }}
    >

      {/* ────────────── SIDEBAR ────────────── */}
      <aside
        className="flex-shrink-0 flex flex-col pt-3 pb-4"
        style={{ width: 220, background: G.sidebar }}
      >
        {/* Compose */}
        <div className="px-3 mb-4">
          <button
            onClick={() => {
              setCompTo(""); setCompSubject(""); setCompBody("");
              setComposeOpen(true); setCompMinimized(false);
            }}
            className="flex items-center gap-3 transition-all"
            style={{
              width: "100%",
              background: G.white,
              boxShadow: "0 1px 3px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.10)",
              border: "none",
              borderRadius: 16,
              padding: "14px 20px",
              color: G.text,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLElement).style.boxShadow =
                "0 2px 8px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)")
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLElement).style.boxShadow =
                "0 1px 3px rgba(0,0,0,0.14), 0 1px 2px rgba(0,0,0,0.10)")
            }
          >
            <PenSquare style={{ width: 20, height: 20, color: G.text }} />
            Redactar
          </button>
        </div>

        {/* Folders */}
        <nav className="flex-1 flex flex-col gap-0.5">
          {([ { key: "INBOX", label: "Recibidos", count: unreadCount }, { key: "Sent", label: "Enviados", count: 0 } ] as { key: Carpeta; label: string; count: number }[]).map(item => (
            <button
              key={item.key}
              onClick={() => { setCarpeta(item.key); setVista("lista"); setBusqueda(""); }}
              className="flex items-center gap-3 py-2 transition-colors"
              style={{
                paddingLeft: 16,
                paddingRight: 16,
                background: carpeta === item.key ? "rgba(123,182,255,0.15)" : "transparent",
                color: carpeta === item.key ? G.blue : G.secondary,
                fontWeight: carpeta === item.key ? 700 : 400,
                fontSize: 14,
                cursor: "pointer",
                border: "none",
                borderRadius: "0 24px 24px 0",
                textAlign: "left",
              }}
            >
              {item.key === "INBOX"
                ? <InboxIcon style={{ width: 18, height: 18, flexShrink: 0 }} />
                : <Send      style={{ width: 18, height: 18, flexShrink: 0 }} />
              }
              <span className="flex-1">{item.label}</span>
              {item.count > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: G.blue }}>{item.count}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Last update */}
        {lastUpdate && (
          <div className="px-4" style={{ fontSize: 11, color: G.secondary }}>
            {lastUpdate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
            {refreshing && <span style={{ color: G.blue }}> · actualizando…</span>}
          </div>
        )}
      </aside>

      {/* ────────────── MAIN ────────────── */}
      <div
        className="flex-1 flex flex-col overflow-hidden"
        style={{ borderLeft: `1px solid ${G.border}` }}
      >
        <FlashBanner msg={msg} className="px-4 pt-2" />

        {/* ══════ VISTA LEER ══════ */}
        {vista === "leer" && emailActual ? (
          <>
            {/* Toolbar leer */}
            <div
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 border-b"
              style={{ borderColor: G.border, background: G.white }}
            >
              <button
                onClick={() => { setVista("lista"); setEmailActual(null); }}
                className="p-2 rounded-full transition-colors"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                title="Volver"
              >
                <ChevronLeft style={{ width: 20, height: 20, color: G.secondary }} />
              </button>
              <button
                onClick={() =>
                  setConfirmState({
                    open: true,
                    msg: "¿Eliminar este correo?",
                    onOk: async () => {
                      await fetch("/api/mail/delete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ uids: [emailActual.seqno], folder: carpeta }),
                      });
                      setVista("lista");
                      cargarEmails(false);
                    },
                  })
                }
                className="p-2 rounded-full transition-colors"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                title="Eliminar"
              >
                <Trash2 style={{ width: 18, height: 18, color: G.secondary }} />
              </button>

              <div className="flex-1" />

              <button
                onClick={responder}
                className="flex items-center gap-2 px-4 py-2 rounded-full transition-colors"
                style={{
                  background: "rgba(123,182,255,0.12)",
                  color: G.blue,
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(123,182,255,0.22)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(123,182,255,0.12)")}
              >
                <Reply style={{ width: 15, height: 15 }} />
                Responder
              </button>
            </div>

            {/* Contenido email */}
            <div className="flex-1 overflow-auto px-6 py-5" style={{ background: G.bg }}>
              <h2 style={{ fontSize: 22, fontWeight: 400, color: G.text, marginBottom: 20, lineHeight: 1.3 }}>
                {emailActual.subject || "(sin asunto)"}
              </h2>

              <div className="flex items-start gap-3 mb-5">
                {/* Avatar */}
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-sm font-semibold"
                  style={{ width: 40, height: 40, background: avatarColor(nombreCorto(emailActual.from)) }}
                >
                  {(nombreCorto(emailActual.from)[0] || "?").toUpperCase()}
                </div>
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span style={{ fontSize: 14, fontWeight: 600, color: G.text }}>
                      {nombreCorto(emailActual.from)}
                    </span>
                    <span style={{ fontSize: 12, color: G.secondary }}>
                      &lt;{emailActual.from.match(/<(.+?)>/)?.[1] || emailActual.from}&gt;
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: G.secondary, marginTop: 2 }}>
                    Para: {emailActual.to || "—"} ·{" "}
                    {new Date(emailActual.date).toLocaleString("es-MX", {
                      day: "numeric", month: "long", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: G.white, border: `1px solid ${G.border}`, padding: "24px 28px" }}
              >
                {cargandoCuerpo ? (
                  <div className="flex justify-center py-10">
                    <Loader2 style={{ width: 24, height: 24, color: G.blue }} className="animate-spin" />
                  </div>
                ) : cuerpo.html ? (
                  <iframe
                    srcDoc={cuerpo.html}
                    className="w-full border-0"
                    style={{ minHeight: 320 }}
                    sandbox="allow-same-origin"
                    title="Email content"
                  />
                ) : (
                  <pre style={{ fontSize: 14, color: G.text, whiteSpace: "pre-wrap", lineHeight: 1.7, fontFamily: "inherit" }}>
                    {cuerpo.body || "Sin contenido"}
                  </pre>
                )}
              </div>

              {/* Reply button footer */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={responder}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full border transition-colors"
                  style={{ borderColor: G.border, color: G.text, fontSize: 13, fontWeight: 500, background: "transparent", cursor: "pointer" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = G.hover)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <Reply style={{ width: 15, height: 15 }} />
                  Responder
                </button>
              </div>
            </div>
          </>

        ) : (
          /* ══════ VISTA LISTA ══════ */
          <>
            {/* Search bar + back */}
            <div
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2"
              style={{ background: G.bg, borderBottom: `1px solid ${G.border}` }}
            >
              <AriaBackButton href="/dashboard" />

              {/* Search */}
              <div className="flex-1 relative" style={{ maxWidth: 600 }}>
                <Search
                  style={{
                    width: 18, height: 18,
                    position: "absolute", left: 14, top: "50%",
                    transform: "translateY(-50%)", color: G.secondary,
                  }}
                />
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar en correos"
                  className="w-full outline-none"
                  style={{
                    background: "rgba(145,175,225,0.10)",
                    border: "none",
                    borderRadius: 24,
                    padding: "9px 44px",
                    fontSize: 14,
                    color: G.text,
                    transition: "background 0.15s",
                  }}
                  onFocus={e  => ((e.target as HTMLElement).style.background = "rgba(145,175,225,0.18)")}
                  onBlur={e   => ((e.target as HTMLElement).style.background = "rgba(145,175,225,0.10)")}
                />
                {busqueda && (
                  <button
                    onClick={() => setBusqueda("")}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    <X style={{ width: 16, height: 16, color: G.secondary }} />
                  </button>
                )}
              </div>

              {/* Refresh */}
              <button
                onClick={() => cargarEmails(false)}
                disabled={loading}
                className="p-2 rounded-full transition-colors"
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                title="Actualizar"
              >
                {loading || refreshing
                  ? <Loader2 style={{ width: 18, height: 18, color: G.secondary }} className="animate-spin" />
                  : <RefreshCw style={{ width: 18, height: 18, color: G.secondary }} />
                }
              </button>
            </div>

            {/* Action bar (select + delete) */}
            <div
              className="flex-shrink-0 flex items-center gap-3 px-4 py-2 border-b"
              style={{ background: G.white, borderColor: G.border }}
            >
              <input
                type="checkbox"
                checked={todosSeleccionados}
                onChange={toggleTodos}
                style={{ width: 16, height: 16, accentColor: G.blue, cursor: "pointer" }}
              />
              {seleccionados.size > 0 ? (
                <>
                  <span style={{ fontSize: 13, color: G.secondary }}>
                    {seleccionados.size} seleccionado{seleccionados.size !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={eliminarSeleccionados}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                    title="Eliminar seleccionados"
                  >
                    <Trash2 style={{ width: 16, height: 16, color: G.secondary }} />
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 13, color: G.secondary }}>
                  {emails.length} correo{emails.length !== 1 ? "s" : ""}
                  {carpeta === "INBOX" && unreadCount > 0 && (
                    <span style={{ color: G.blue, fontWeight: 600 }}> · {unreadCount} sin leer</span>
                  )}
                </span>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                className="mx-4 mt-2 flex items-start gap-3 rounded-lg p-3"
                style={{ background: G.error, border: "1px solid rgba(255,80,60,0.30)" }}
              >
                <AlertTriangle style={{ width: 18, height: 18, color: "#D93025", flexShrink: 0, marginTop: 1 }} />
                <div className="flex-1">
                  <p style={{ fontSize: 13, color: "#FF6B6B", fontWeight: 500 }}>Error de conexión</p>
                  <p style={{ fontSize: 12, color: "#FF8C8C", marginTop: 2 }}>{error}</p>
                </div>
                <button
                  onClick={() => cargarEmails(false)}
                  style={{ fontSize: 12, color: "#FF6B6B", textDecoration: "underline", cursor: "pointer", background: "none", border: "none" }}
                >
                  Reintentar
                </button>
              </div>
            )}

            {/* Lista */}
            <div className="flex-1 overflow-auto" style={{ background: G.bg }}>
              {loading && emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 style={{ width: 32, height: 32, color: G.blue }} className="animate-spin" />
                  <p style={{ fontSize: 14, color: G.secondary }}>Conectando con Zoho Mail…</p>
                </div>
              ) : emailsFiltrados.length === 0 && !error ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <InboxIcon style={{ width: 56, height: 56, color: "rgba(145,175,225,0.25)", marginBottom: 12 }} />
                  <p style={{ fontSize: 14, color: G.secondary }}>
                    {busqueda ? "Sin resultados para esa búsqueda" : "Bandeja vacía"}
                  </p>
                </div>
              ) : (
                emailsFiltrados.map(em => {
                  const isSelected = seleccionados.has(em.seqno);
                  const isStarred  = starred.has(em.seqno);
                  const name       = carpeta === "INBOX" ? nombreCorto(em.from) : nombreCorto(em.to);

                  return (
                    <div
                      key={em.uid || em.seqno}
                      className="group flex items-center gap-3 px-4 cursor-pointer transition-all border-b"
                      style={{
                        paddingTop: 10,
                        paddingBottom: 10,
                        background: isSelected ? G.selected : em.seen ? G.read : G.unread,
                        borderColor: G.border,
                      }}
                      onClick={() => abrirEmail(em)}
                      onMouseEnter={e => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background = G.hover;
                        (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.08)";
                      }}
                      onMouseLeave={e => {
                        if (!isSelected)
                          (e.currentTarget as HTMLElement).style.background = em.seen ? G.read : G.unread;
                        (e.currentTarget as HTMLElement).style.boxShadow = "none";
                      }}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSel(em.seqno)}
                        onClick={e => e.stopPropagation()}
                        style={{
                          width: 16, height: 16,
                          accentColor: G.blue,
                          cursor: "pointer",
                          flexShrink: 0,
                          opacity: isSelected ? 1 : 0,
                          transition: "opacity 0.15s",
                        }}
                        className="group-hover:!opacity-100"
                      />

                      {/* Star */}
                      <button
                        onClick={e => toggleStar(em.seqno, e)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 2,
                          flexShrink: 0,
                          opacity: isStarred ? 1 : 0,
                          transition: "opacity 0.15s",
                        }}
                        className="group-hover:!opacity-100"
                      >
                        <Star
                          style={{
                            width: 16, height: 16,
                            color: isStarred ? "#F4B400" : "rgba(145,175,225,0.35)",
                            fill:  isStarred ? "#F4B400" : "none",
                          }}
                        />
                      </button>

                      {/* Avatar */}
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-xs font-semibold"
                        style={{ width: 32, height: 32, background: avatarColor(name) }}
                      >
                        {(name[0] || "?").toUpperCase()}
                      </div>

                      {/* Sender */}
                      <span
                        className="flex-shrink-0 truncate"
                        style={{
                          width: 156,
                          fontSize: 13,
                          fontWeight: em.seen ? 400 : 700,
                          color: G.text,
                        }}
                      >
                        {name}
                      </span>

                      {/* Subject */}
                      <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, color: G.secondary }}>
                        <span style={{ fontWeight: em.seen ? 400 : 600, color: em.seen ? G.secondary : G.text }}>
                          {em.subject || "(sin asunto)"}
                        </span>
                      </span>

                      {/* Date */}
                      <span
                        className="flex-shrink-0"
                        style={{
                          fontSize: 12,
                          fontWeight: em.seen ? 400 : 700,
                          color: em.seen ? G.secondary : G.text,
                          minWidth: 50,
                          textAlign: "right",
                        }}
                      >
                        {fechaCorta(em.date)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* ────────────── COMPOSE MODAL (flotante Gmail) ────────────── */}
      {composeOpen && (
        <div
          className="fixed bottom-0 right-6 z-50 flex flex-col rounded-t-xl overflow-hidden"
          style={{
            width: 520,
            height: compMinimized ? 48 : 480,
            boxShadow: "0 8px 30px rgba(0,0,0,0.24), 0 4px 12px rgba(0,0,0,0.16)",
            background: G.white,
            transition: "height 0.2s ease",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 flex-shrink-0"
            style={{ height: 48, background: "#0A1929", cursor: "pointer", borderBottom: "1px solid rgba(145,175,225,0.15)" }}
            onClick={() => setCompMinimized(p => !p)}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: "white", flex: 1 }}>Nuevo mensaje</span>
            <button
              onClick={e => { e.stopPropagation(); setCompMinimized(p => !p); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: "rgba(255,255,255,0.8)", fontSize: 13, borderRadius: 4 }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
            >
              {compMinimized ? "▲" : "▼"}
            </button>
            <button
              onClick={e => { e.stopPropagation(); setComposeOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(255,255,255,0.8)", borderRadius: 4 }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>

          {!compMinimized && (
            <>
              {/* Para */}
              <div className="flex items-center border-b px-4" style={{ borderColor: G.border }}>
                <span style={{ fontSize: 13, color: G.secondary, width: 44, flexShrink: 0 }}>Para</span>
                <input
                  value={compTo}
                  onChange={e => setCompTo(e.target.value)}
                  placeholder=""
                  className="flex-1 outline-none"
                  style={{ fontSize: 14, color: G.text, background: "transparent", border: "none", padding: "10px 0" }}
                />
              </div>

              {/* Asunto */}
              <div className="flex items-center border-b px-4" style={{ borderColor: G.border }}>
                <input
                  value={compSubject}
                  onChange={e => setCompSubject(e.target.value)}
                  placeholder="Asunto"
                  className="flex-1 outline-none"
                  style={{ fontSize: 14, color: G.text, background: "transparent", border: "none", padding: "10px 0" }}
                />
              </div>

              {/* Cuerpo */}
              <textarea
                value={compBody}
                onChange={e => setCompBody(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 outline-none resize-none px-4 py-3"
                style={{ fontSize: 14, color: G.text, background: "transparent", border: "none" }}
              />

              {/* Footer */}
              <div
                className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                style={{ borderTop: `1px solid ${G.border}` }}
              >
                <button
                  onClick={enviarCorreo}
                  disabled={enviando || !compTo.trim() || !compSubject.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-full disabled:opacity-50 transition-opacity"
                  style={{ background: G.blue, color: "white", fontSize: 14, fontWeight: 500, cursor: "pointer", border: "none" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#1557B0")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = G.blue)}
                >
                  {enviando && <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />}
                  Enviar
                </button>
                <div className="flex-1" />
                <button
                  onClick={() =>
                    setConfirmState({
                      open: true, msg: "¿Descartar este borrador?",
                      onOk: () => { setComposeOpen(false); setCompTo(""); setCompSubject(""); setCompBody(""); },
                    })
                  }
                  className="p-2 rounded-full transition-colors"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                  title="Descartar borrador"
                >
                  <Trash2 style={{ width: 18, height: 18, color: G.secondary }} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => { confirmState.onOk(); setConfirmState(p => ({ ...p, open: false })); }}
        onCancel={() => setConfirmState(p => ({ ...p, open: false }))}
      />
    </div>
  );
}
