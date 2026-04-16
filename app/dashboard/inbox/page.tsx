"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Trash2, RefreshCw, Loader2, Inbox as InboxIcon,
  PenSquare, Search, X, AlertTriangle, Reply, Star,
  ChevronLeft, CornerUpRight, Printer, Copy, Check,
  BookOpen, Forward,
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

type Vista   = "lista" | "leer";
type Carpeta = "INBOX" | "Sent";
type Filtro  = "todos" | "sinleer" | "destacados";

/* ── helpers ── */
function fechaCorta(s: string) {
  try {
    const d = new Date(s); const hoy = new Date();
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

function emailAddr(raw: string) {
  return raw.match(/<(.+?)>/)?.[1] || raw.trim();
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

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
export default function InboxPage() {
  const { msg, flash } = useFlashMessage();

  const [confirmState, setConfirmState] = useState<{
    open: boolean; msg: string; onOk: () => void;
  }>({ open: false, msg: "", onOk: () => {} });

  /* ── estado core ── */
  const [vista,         setVista]         = useState<Vista>("lista");
  const [carpeta,       setCarpeta]       = useState<Carpeta>("INBOX");
  const [emails,        setEmails]        = useState<EmailHeader[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState("");
  const [lastUpdate,    setLastUpdate]    = useState<Date | null>(null);
  const [busqueda,      setBusqueda]      = useState("");
  const [filtro,        setFiltro]        = useState<Filtro>("todos");
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [starred,       setStarred]       = useState<Set<number>>(new Set());
  const [limite,        setLimite]        = useState(40);
  const [copiedAddr,    setCopiedAddr]    = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── estado leer ── */
  const [emailActual,    setEmailActual]    = useState<EmailHeader | null>(null);
  const [cuerpo,         setCuerpo]         = useState({ body: "", html: "" });
  const [cargandoCuerpo, setCargandoCuerpo] = useState(false);
  const emailListRef = useRef<EmailHeader[]>([]);
  emailListRef.current = emails;

  /* ── estado componer (modal flotante) ── */
  const [composeOpen,   setComposeOpen]   = useState(false);
  const [compMinimized, setCompMinimized] = useState(false);
  const [compTo,        setCompTo]        = useState("");
  const [compSubject,   setCompSubject]   = useState("");
  const [compBody,      setCompBody]      = useState("");
  const [enviando,      setEnviando]      = useState(false);

  /* ─── cargar lista ─── */
  const cargarEmails = useCallback(async (silencioso = false, lim = limite) => {
    if (!silencioso) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const r    = await fetch("/api/mail/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: carpeta, limit: lim }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) {
        setError("Credenciales no configuradas. Verifica ZOHO_EMAIL y ZOHO_PASSWORD en Vercel.");
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
  }, [carpeta, limite]);

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
    // Marcar como leído optimistamente
    setEmails(prev => prev.map(e => e.uid === em.uid ? { ...e, seen: true } : e));
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

  const eliminarEmail = (em: EmailHeader) => {
    setConfirmState({
      open: true, msg: "¿Eliminar este correo?",
      onOk: async () => {
        await fetch("/api/mail/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uids: [em.seqno], folder: carpeta }),
        });
        if (vista === "leer") setVista("lista");
        cargarEmails(false);
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

  /* ─── FEATURE 2: Responder ─── */
  const responder = useCallback(() => {
    if (!emailActual) return;
    setCompTo(emailAddr(emailActual.from));
    setCompSubject(`Re: ${emailActual.subject || ""}`);
    setCompBody(`\n\n--- Mensaje original ---\nDe: ${emailActual.from}\nFecha: ${emailActual.date}\n\n${cuerpo.body || ""}`);
    setComposeOpen(true); setCompMinimized(false);
  }, [emailActual, cuerpo]);

  /* ─── FEATURE 3: Responder a todos ─── */
  const responderATodos = useCallback(() => {
    if (!emailActual) return;
    const fromAddr = emailAddr(emailActual.from);
    const toAddr   = emailActual.to ? emailAddr(emailActual.to) : "";
    const todos    = [fromAddr, toAddr].filter(Boolean).join(", ");
    setCompTo(todos);
    setCompSubject(`Re: ${emailActual.subject || ""}`);
    setCompBody(`\n\n--- Mensaje original ---\nDe: ${emailActual.from}\nPara: ${emailActual.to}\nFecha: ${emailActual.date}\n\n${cuerpo.body || ""}`);
    setComposeOpen(true); setCompMinimized(false);
  }, [emailActual, cuerpo]);

  /* ─── FEATURE 2: Reenviar ─── */
  const reenviar = useCallback(() => {
    if (!emailActual) return;
    setCompTo("");
    setCompSubject(`Fwd: ${emailActual.subject || ""}`);
    setCompBody(`\n\n--- Mensaje reenviado ---\nDe: ${emailActual.from}\nFecha: ${emailActual.date}\nAsunto: ${emailActual.subject || ""}\n\n${cuerpo.body || ""}`);
    setComposeOpen(true); setCompMinimized(false);
  }, [emailActual, cuerpo]);

  /* ─── FEATURE 4: Marcar leído / no leído ─── */
  const toggleLeido = useCallback(() => {
    if (!emailActual) return;
    setEmails(prev => prev.map(e =>
      e.uid === emailActual.uid ? { ...e, seen: !e.seen } : e
    ));
    setEmailActual(prev => prev ? { ...prev, seen: !prev.seen } : prev);
  }, [emailActual]);

  /* ─── FEATURE 7: Imprimir ─── */
  const imprimirEmail = () => window.print();

  /* ─── FEATURE 8: Copiar remitente ─── */
  const copiarRemitente = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddr(addr);
      flash("ok", "Dirección copiada al portapapeles");
      setTimeout(() => setCopiedAddr(""), 2000);
    } catch { /* ok */ }
  };

  /* ─── FEATURE 5: Quick reply desde lista ─── */
  const quickReply = (em: EmailHeader) => {
    setCompTo(emailAddr(em.from));
    setCompSubject(`Re: ${em.subject || ""}`);
    setCompBody("\n\n--- Mensaje original ---\n");
    setComposeOpen(true); setCompMinimized(false);
  };

  /* ─── FEATURE 9: Cargar más ─── */
  const cargarMas = () => {
    const nuevoLimite = limite + 40;
    setLimite(nuevoLimite);
    cargarEmails(false, nuevoLimite);
  };

  /* ─── FEATURE 10: Atajos de teclado ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      switch (e.key) {
        case "c": case "C":
          if (!composeOpen) {
            setCompTo(""); setCompSubject(""); setCompBody("");
            setComposeOpen(true); setCompMinimized(false);
          }
          break;
        case "r": case "R":
          if (vista === "leer" && emailActual) responder();
          break;
        case "Escape":
          if (composeOpen) setComposeOpen(false);
          else if (vista === "leer") { setVista("lista"); setEmailActual(null); }
          break;
        case "j": case "J": {
          if (vista === "lista") {
            // Navegar al siguiente email
          }
          break;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [vista, composeOpen, emailActual, responder]);

  /* ─── filtros y selección ─── */
  const emailsFiltrados = emails.filter(e => {
    const matchSearch = !busqueda.trim() ||
      (e.subject || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (e.from    || "").toLowerCase().includes(busqueda.toLowerCase());
    const matchFiltro =
      filtro === "sinleer"   ? !e.seen :
      filtro === "destacados" ? starred.has(e.seqno) :
      true;
    return matchSearch && matchFiltro;
  });

  const unreadCount        = emails.filter(e => !e.seen).length;
  const starredCount       = starred.size;
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

  /* ── palette: azul medio — más claro que sidebar ARIA27 ── */
  const G = {
    bg:       "#1C2E47",                    // contenido principal — azul medio legible
    sidebar:  "#141E2E",                    // sidebar inbox — más oscuro, se funde con ARIA27
    card:     "#213451",                    // superficies elevadas
    border:   "rgba(145,175,225,0.13)",
    text:     "#DCE9FF",                    // texto principal nítido
    secondary:"#85A8CB",                   // texto secundario
    blue:     "#7BB6FF",                    // accent ARIA27
    hover:    "#243c5a",                    // hover row
    unread:   "#1E3358",                    // fila no leída — azul tintado
    read:     "#1C2E47",                    // fila leída = bg
    selected: "#1D3E6A",
    error:    "rgba(255,80,60,0.12)",
  };

  /* ── shortcut hint ── */
  const shortcuts = [
    { key: "c", desc: "Redactar" },
    { key: "r", desc: "Responder" },
    { key: "Esc", desc: "Volver/Cerrar" },
  ];

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
        style={{ width: 220, background: G.sidebar, borderRight: `1px solid ${G.border}` }}
      >
        {/* Redactar */}
        <div className="px-3 mb-4">
          <button
            onClick={() => { setCompTo(""); setCompSubject(""); setCompBody(""); setComposeOpen(true); setCompMinimized(false); }}
            className="flex items-center gap-3 transition-all w-full"
            style={{
              background: G.card,
              boxShadow: "0 1px 4px rgba(0,0,0,0.30)",
              border: `1px solid ${G.border}`,
              borderRadius: 16,
              padding: "13px 18px",
              color: G.text,
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              textAlign: "left",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = G.hover)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = G.card)}
          >
            <PenSquare style={{ width: 18, height: 18, color: G.blue }} />
            Redactar
            <span style={{ marginLeft: "auto", fontSize: 10, color: G.secondary, fontWeight: 400 }}>c</span>
          </button>
        </div>

        {/* Carpetas */}
        <nav className="flex-1 flex flex-col gap-0.5">
          {([ { key: "INBOX", label: "Recibidos", count: unreadCount }, { key: "Sent", label: "Enviados", count: 0 } ] as { key: Carpeta; label: string; count: number }[]).map(item => (
            <button
              key={item.key}
              onClick={() => { setCarpeta(item.key); setVista("lista"); setBusqueda(""); setFiltro("todos"); }}
              className="flex items-center gap-3 py-2.5 transition-colors"
              style={{
                paddingLeft: 16, paddingRight: 16,
                background: carpeta === item.key ? "rgba(123,182,255,0.15)" : "transparent",
                color: carpeta === item.key ? G.blue : G.secondary,
                fontWeight: carpeta === item.key ? 700 : 400,
                fontSize: 14, cursor: "pointer", border: "none",
                borderRadius: "0 24px 24px 0", textAlign: "left",
              }}
            >
              {item.key === "INBOX"
                ? <InboxIcon style={{ width: 17, height: 17, flexShrink: 0 }} />
                : <Send      style={{ width: 17, height: 17, flexShrink: 0 }} />
              }
              <span className="flex-1">{item.label}</span>
              {item.count > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: G.blue }}>{item.count}</span>}
            </button>
          ))}
        </nav>

        {/* Shortcuts hint */}
        <div className="px-4 pt-3 mt-auto" style={{ borderTop: `1px solid ${G.border}` }}>
          <p style={{ fontSize: 10, color: G.secondary, marginBottom: 6, letterSpacing: "0.06em" }}>ATAJOS</p>
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center gap-2 mb-1.5">
              <span style={{ fontSize: 10, background: G.card, color: G.text, padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", border: `1px solid ${G.border}` }}>{s.key}</span>
              <span style={{ fontSize: 11, color: G.secondary }}>{s.desc}</span>
            </div>
          ))}
          {lastUpdate && (
            <p style={{ fontSize: 10, color: G.secondary, marginTop: 8 }}>
              {lastUpdate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              {refreshing && <span style={{ color: G.blue }}> · …</span>}
            </p>
          )}
        </div>
      </aside>

      {/* ────────────── MAIN ────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <FlashBanner msg={msg} className="px-4 pt-2" />

        {/* ══════ VISTA LEER ══════ */}
        {vista === "leer" && emailActual ? (
          <>
            {/* Toolbar leer */}
            <div
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 border-b"
              style={{ borderColor: G.border, background: G.card }}
            >
              <button
                onClick={() => { setVista("lista"); setEmailActual(null); }}
                className="p-2 rounded-full transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                title="Volver (Esc)"
              >
                <ChevronLeft style={{ width: 20, height: 20, color: G.secondary }} />
              </button>

              {/* Eliminar */}
              <button onClick={() => eliminarEmail(emailActual)}
                className="p-2 rounded-full transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,80,60,0.12)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                title="Eliminar"
              >
                <Trash2 style={{ width: 17, height: 17, color: G.secondary }} />
              </button>

              {/* FEATURE 4: Marcar leído/no leído */}
              <button onClick={toggleLeido}
                className="p-2 rounded-full transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                title={emailActual.seen ? "Marcar como no leído" : "Marcar como leído"}
              >
                <BookOpen style={{ width: 17, height: 17, color: emailActual.seen ? G.secondary : G.blue }} />
              </button>

              {/* FEATURE 7: Imprimir */}
              <button onClick={imprimirEmail}
                className="p-2 rounded-full transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                title="Imprimir"
              >
                <Printer style={{ width: 17, height: 17, color: G.secondary }} />
              </button>

              <div style={{ width: 1, height: 20, background: G.border, margin: "0 4px" }} />

              {/* Responder */}
              <button onClick={responder}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                style={{ background: "rgba(123,182,255,0.12)", color: G.blue, fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(123,182,255,0.22)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(123,182,255,0.12)")}
                title="Responder (r)"
              >
                <Reply style={{ width: 14, height: 14 }} /> Responder
              </button>

              {/* FEATURE 3: Responder a todos */}
              <button onClick={responderATodos}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", color: G.secondary, fontSize: 13, fontWeight: 500, border: `1px solid ${G.border}`, cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
                title="Responder a todos"
              >
                <CornerUpRight style={{ width: 14, height: 14 }} /> A todos
              </button>

              {/* FEATURE 2: Reenviar */}
              <button onClick={reenviar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", color: G.secondary, fontSize: 13, fontWeight: 500, border: `1px solid ${G.border}`, cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
                title="Reenviar"
              >
                <Forward style={{ width: 14, height: 14 }} /> Reenviar
              </button>
            </div>

            {/* Contenido email */}
            <div className="flex-1 overflow-auto px-6 py-5" style={{ background: G.bg }}>
              <h2 style={{ fontSize: 22, fontWeight: 400, color: G.text, marginBottom: 20, lineHeight: 1.3 }}>
                {emailActual.subject || "(sin asunto)"}
              </h2>

              <div className="flex items-start gap-3 mb-5">
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-sm font-semibold"
                  style={{ width: 40, height: 40, background: avatarColor(nombreCorto(emailActual.from)) }}
                >
                  {(nombreCorto(emailActual.from)[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span style={{ fontSize: 14, fontWeight: 600, color: G.text }}>{nombreCorto(emailActual.from)}</span>
                    {/* FEATURE 8: Copiar remitente */}
                    <button
                      onClick={() => copiarRemitente(emailAddr(emailActual.from))}
                      className="flex items-center gap-1 transition-colors"
                      style={{ background: "none", border: "none", cursor: "pointer", color: G.secondary, fontSize: 12 }}
                      title="Copiar dirección"
                    >
                      {copiedAddr === emailAddr(emailActual.from)
                        ? <><Check style={{ width: 12, height: 12, color: "#4CAF50" }} /><span style={{ color: "#4CAF50" }}>copiado</span></>
                        : <><Copy style={{ width: 12, height: 12 }} />&lt;{emailAddr(emailActual.from)}&gt;</>
                      }
                    </button>
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
              <div className="rounded-xl overflow-hidden" style={{ background: G.card, border: `1px solid ${G.border}`, padding: "24px 28px" }}>
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

              {/* Footer acciones */}
              <div className="flex gap-3 mt-6">
                <button onClick={responder}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full border transition-colors"
                  style={{ borderColor: G.border, color: G.text, fontSize: 13, fontWeight: 500, background: "transparent", cursor: "pointer" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = G.hover)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <Reply style={{ width: 15, height: 15 }} /> Responder
                </button>
                <button onClick={reenviar}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full border transition-colors"
                  style={{ borderColor: G.border, color: G.secondary, fontSize: 13, fontWeight: 500, background: "transparent", cursor: "pointer" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = G.hover)}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <Forward style={{ width: 15, height: 15 }} /> Reenviar
                </button>
              </div>
            </div>
          </>

        ) : (
          /* ══════ VISTA LISTA ══════ */
          <>
            {/* Search bar */}
            <div
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2"
              style={{ background: G.bg, borderBottom: `1px solid ${G.border}` }}
            >
              <AriaBackButton href="/dashboard" />
              <div className="flex-1 relative" style={{ maxWidth: 600 }}>
                <Search style={{ width: 17, height: 17, position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: G.secondary }} />
                <input
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar en correos"
                  className="w-full outline-none"
                  style={{
                    background: "rgba(145,175,225,0.10)",
                    border: "none", borderRadius: 24,
                    padding: "9px 44px",
                    fontSize: 14, color: G.text, transition: "background 0.15s",
                  }}
                  onFocus={e => ((e.target as HTMLElement).style.background = "rgba(145,175,225,0.18)")}
                  onBlur={e  => ((e.target as HTMLElement).style.background = "rgba(145,175,225,0.10)")}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda("")}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    <X style={{ width: 15, height: 15, color: G.secondary }} />
                  </button>
                )}
              </div>
              <button
                onClick={() => cargarEmails(false)}
                disabled={loading}
                className="p-2 rounded-full transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                title="Actualizar"
              >
                {loading || refreshing
                  ? <Loader2 style={{ width: 17, height: 17, color: G.secondary }} className="animate-spin" />
                  : <RefreshCw style={{ width: 17, height: 17, color: G.secondary }} />
                }
              </button>
            </div>

            {/* FEATURE 1: Filtros rápidos */}
            <div
              className="flex-shrink-0 flex items-center border-b"
              style={{ background: G.card, borderColor: G.border }}
            >
              {([ { key: "todos", label: "Todos", count: emails.length }, { key: "sinleer", label: "Sin leer", count: unreadCount }, { key: "destacados", label: "Destacados", count: starredCount } ] as { key: Filtro; label: string; count: number }[]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFiltro(f.key)}
                  className="flex items-center gap-1.5 px-5 py-2.5 transition-colors relative"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: filtro === f.key ? G.blue : G.secondary,
                    fontSize: 13,
                    fontWeight: filtro === f.key ? 600 : 400,
                    borderBottom: filtro === f.key ? `2px solid ${G.blue}` : "2px solid transparent",
                  }}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: filtro === f.key ? G.blue : G.secondary, background: "rgba(123,182,255,0.12)", borderRadius: 10, padding: "1px 6px" }}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}

              <div className="flex-1" />

              {/* Select all + delete bulk */}
              <div className="flex items-center gap-3 px-4">
                <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos}
                  style={{ width: 15, height: 15, accentColor: G.blue, cursor: "pointer" }}
                />
                {seleccionados.size > 0 && (
                  <>
                    <span style={{ fontSize: 12, color: G.secondary }}>{seleccionados.size} sel.</span>
                    <button onClick={eliminarSeleccionados}
                      className="p-1.5 rounded transition-colors"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,80,60,0.12)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                    >
                      <Trash2 style={{ width: 15, height: 15, color: G.secondary }} />
                    </button>
                  </>
                )}
                {seleccionados.size === 0 && (
                  <span style={{ fontSize: 12, color: G.secondary }}>
                    {emails.length} correo{emails.length !== 1 ? "s" : ""}
                    {unreadCount > 0 && <span style={{ color: G.blue, fontWeight: 600 }}> · {unreadCount} sin leer</span>}
                  </span>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mx-4 mt-2 flex items-start gap-3 rounded-lg p-3"
                style={{ background: G.error, border: "1px solid rgba(255,80,60,0.30)" }}>
                <AlertTriangle style={{ width: 17, height: 17, color: "#FF6B6B", flexShrink: 0, marginTop: 1 }} />
                <div className="flex-1">
                  <p style={{ fontSize: 13, color: "#FF6B6B", fontWeight: 500 }}>Error de conexión</p>
                  <p style={{ fontSize: 12, color: "#FF8C8C", marginTop: 2 }}>{error}</p>
                </div>
                <button onClick={() => cargarEmails(false)}
                  style={{ fontSize: 12, color: "#FF6B6B", textDecoration: "underline", cursor: "pointer", background: "none", border: "none" }}>
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
                  <InboxIcon style={{ width: 52, height: 52, color: "rgba(145,175,225,0.20)", marginBottom: 12 }} />
                  <p style={{ fontSize: 14, color: G.secondary }}>
                    {busqueda ? "Sin resultados" : filtro === "sinleer" ? "No hay correos sin leer" : filtro === "destacados" ? "No hay correos destacados" : "Bandeja vacía"}
                  </p>
                </div>
              ) : (
                <>
                  {emailsFiltrados.map(em => {
                    const isSelected = seleccionados.has(em.seqno);
                    const isStarred  = starred.has(em.seqno);
                    const name       = carpeta === "INBOX" ? nombreCorto(em.from) : nombreCorto(em.to);

                    return (
                      <div
                        key={em.uid || em.seqno}
                        className="group flex items-center gap-3 px-4 cursor-pointer transition-all border-b"
                        style={{
                          paddingTop: 9, paddingBottom: 9,
                          background: isSelected ? G.selected : em.seen ? G.read : G.unread,
                          borderColor: G.border,
                          /* FEATURE 6: borde izquierdo para no leídos */
                          borderLeft: em.seen ? `3px solid transparent` : `3px solid ${G.blue}`,
                        }}
                        onClick={() => abrirEmail(em)}
                        onMouseEnter={e => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.background = G.hover;
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) (e.currentTarget as HTMLElement).style.background = em.seen ? G.read : G.unread;
                        }}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSel(em.seqno)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: 15, height: 15, accentColor: G.blue, cursor: "pointer", flexShrink: 0, opacity: isSelected ? 1 : 0, transition: "opacity 0.15s" }}
                          className="group-hover:!opacity-100"
                        />

                        {/* Star */}
                        <button
                          onClick={e => toggleStar(em.seqno, e)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0, opacity: isStarred ? 1 : 0, transition: "opacity 0.15s" }}
                          className="group-hover:!opacity-100"
                        >
                          <Star style={{ width: 15, height: 15, color: isStarred ? "#F4B400" : "rgba(145,175,225,0.35)", fill: isStarred ? "#F4B400" : "none" }} />
                        </button>

                        {/* Avatar */}
                        <div className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-xs font-semibold"
                          style={{ width: 30, height: 30, background: avatarColor(name) }}>
                          {(name[0] || "?").toUpperCase()}
                        </div>

                        {/* Sender */}
                        <span className="flex-shrink-0 truncate"
                          style={{ width: 148, fontSize: 13, fontWeight: em.seen ? 400 : 700, color: G.text }}>
                          {name}
                        </span>

                        {/* Subject */}
                        <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13 }}>
                          <span style={{ fontWeight: em.seen ? 400 : 600, color: em.seen ? G.secondary : G.text }}>
                            {em.subject || "(sin asunto)"}
                          </span>
                        </span>

                        {/* FEATURE 5: Quick actions en hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mr-2">
                          <button
                            onClick={e => { e.stopPropagation(); quickReply(em); }}
                            className="p-1.5 rounded transition-colors"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                            onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
                            onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.background = "none")}
                            title="Responder"
                          >
                            <Reply style={{ width: 13, height: 13, color: G.secondary }} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); eliminarEmail(em); }}
                            className="p-1.5 rounded transition-colors"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                            onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.background = "rgba(255,80,60,0.15)")}
                            onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.background = "none")}
                            title="Eliminar"
                          >
                            <Trash2 style={{ width: 13, height: 13, color: G.secondary }} />
                          </button>
                        </div>

                        {/* Date */}
                        <span className="flex-shrink-0"
                          style={{ fontSize: 12, fontWeight: em.seen ? 400 : 700, color: em.seen ? G.secondary : G.text, minWidth: 48, textAlign: "right" }}>
                          {fechaCorta(em.date)}
                        </span>
                      </div>
                    );
                  })}

                  {/* FEATURE 9: Cargar más */}
                  {emailsFiltrados.length >= limite && (
                    <div className="flex justify-center py-4">
                      <button
                        onClick={cargarMas}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 rounded-full transition-colors"
                        style={{ background: G.card, border: `1px solid ${G.border}`, color: G.secondary, fontSize: 13, cursor: "pointer" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = G.hover)}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = G.card)}
                      >
                        {loading ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : null}
                        Cargar más
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* ────────────── COMPOSE MODAL ────────────── */}
      {composeOpen && (
        <div
          className="fixed bottom-0 right-6 z-50 flex flex-col rounded-t-xl overflow-hidden"
          style={{
            width: 520,
            height: compMinimized ? 48 : 480,
            boxShadow: "0 8px 32px rgba(0,0,0,0.40), 0 4px 12px rgba(0,0,0,0.24)",
            background: G.card,
            border: `1px solid ${G.border}`,
            borderBottom: "none",
            transition: "height 0.2s ease",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 flex-shrink-0"
            style={{ height: 48, background: "#0A1929", borderBottom: `1px solid ${G.border}`, cursor: "pointer" }}
            onClick={() => setCompMinimized(p => !p)}
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: G.text, flex: 1 }}>Nuevo mensaje</span>
            <button onClick={e => { e.stopPropagation(); setCompMinimized(p => !p); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: G.secondary, fontSize: 13, borderRadius: 4 }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
            >
              {compMinimized ? "▲" : "▼"}
            </button>
            <button onClick={e => { e.stopPropagation(); setComposeOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: G.secondary, borderRadius: 4 }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
            >
              <X style={{ width: 15, height: 15 }} />
            </button>
          </div>

          {!compMinimized && (
            <>
              <div className="flex items-center border-b px-4" style={{ borderColor: G.border }}>
                <span style={{ fontSize: 13, color: G.secondary, width: 44, flexShrink: 0 }}>Para</span>
                <input value={compTo} onChange={e => setCompTo(e.target.value)} placeholder=""
                  className="flex-1 outline-none"
                  style={{ fontSize: 14, color: G.text, background: "transparent", border: "none", padding: "10px 0" }} />
              </div>
              <div className="flex items-center border-b px-4" style={{ borderColor: G.border }}>
                <input value={compSubject} onChange={e => setCompSubject(e.target.value)} placeholder="Asunto"
                  className="flex-1 outline-none"
                  style={{ fontSize: 14, color: G.text, background: "transparent", border: "none", padding: "10px 0" }} />
              </div>
              <textarea value={compBody} onChange={e => setCompBody(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="flex-1 outline-none resize-none px-4 py-3"
                style={{ fontSize: 14, color: G.text, background: "transparent", border: "none" }} />
              <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ borderTop: `1px solid ${G.border}` }}>
                <button onClick={enviarCorreo}
                  disabled={enviando || !compTo.trim() || !compSubject.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-full disabled:opacity-50"
                  style={{ background: G.blue, color: "#0A1929", fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                >
                  {enviando && <Loader2 style={{ width: 15, height: 15 }} className="animate-spin" />}
                  Enviar
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => setConfirmState({
                    open: true, msg: "¿Descartar este borrador?",
                    onOk: () => { setComposeOpen(false); setCompTo(""); setCompSubject(""); setCompBody(""); },
                  })}
                  className="p-2 rounded-full transition-colors"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,80,60,0.12)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                  title="Descartar borrador"
                >
                  <Trash2 style={{ width: 17, height: 17, color: G.secondary }} />
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
