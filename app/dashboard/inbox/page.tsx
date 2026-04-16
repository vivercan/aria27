"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Send, Trash2, RefreshCw, Loader2, Inbox as InboxIcon,
  PenSquare, Search, X, AlertTriangle, Reply, Star,
  ChevronLeft, CornerUpRight, Printer, Copy, Check,
  BookOpen, Forward, Paperclip, Flag, Tag, Layout,
  ChevronDown, ChevronUp, ZoomIn, ZoomOut, AlignLeft,
  Bold, Italic, Underline, List, Bell, Filter, Settings2,
  FolderPlus, ShieldOff, SplitSquareHorizontal, ChevronsUpDown,
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
  size?: number;          /* tamaño en bytes, si el servidor lo devuelve */
  hasAttach?: boolean;    /* adjunto detectado por el servidor */
}

type Vista   = "lista" | "leer";
type Carpeta = "INBOX" | "Sent" | string;
type Filtro  = "todos" | "sinleer" | "destacados" | "flagged";
type SortBy  = "date" | "from" | "subject";
type SortDir = "asc" | "desc";
type Category = { label: string; color: string };

const CATEGORIES: Category[] = [
  { label: "Trabajo",   color: "#E53935" },
  { label: "Personal",  color: "#1E88E5" },
  { label: "Urgente",   color: "#FB8C00" },
  { label: "Factura",   color: "#43A047" },
  { label: "Proyecto",  color: "#8E24AA" },
];

/* ── helpers ── */
function fechaCorta(s: string) {
  try {
    const d   = new Date(s);
    const hoy = new Date();
    const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === hoy.toDateString()) return hora;
    const fecha = d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    return `${fecha} · ${hora}`;
  } catch { return s; }
}

function pesoLegible(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fechaLarga(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) +
      " " + d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
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

function hasAttachment(em: EmailHeader) {
  return em.hasAttach === true ||
    (em.flags || []).some(f => f.toLowerCase().includes("attach")) ||
    (em.subject || "").toLowerCase().includes("[adj") ||
    (em.subject || "").toLowerCase().includes("adjunto");
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

const CACHE_KEY       = (f: string) => `aria27_inbox_${f}`;
const AUTO_REFRESH_MS = 2 * 60 * 1000;

const QUICK_TEMPLATES = [
  { label: "Confirmado ✓",   text: "Confirmado, muchas gracias." },
  { label: "En proceso…",    text: "Recibido, lo atendemos a la brevedad." },
  { label: "Necesito info",  text: "¿Podrías proporcionarme más información al respecto?" },
  { label: "Agendado",       text: "Perfecto, queda agendado. ¡Hasta entonces!" },
];

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
  const [flagged,       setFlagged]       = useState<Set<number>>(new Set());
  const [limite,        setLimite]        = useState(40);
  const [copiedAddr,    setCopiedAddr]    = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── ordenamiento columnas ── */
  const [sortBy,  setSortBy]  = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* ── panel lateral (split view) ── */
  const [splitView, setSplitView] = useState(false);

  /* ── modo compacto ── */
  const [compacto, setCompacto] = useState(false);

  /* ── búsqueda avanzada ── */
  const [advSearch, setAdvSearch] = useState(false);
  const [advDe,     setAdvDe]     = useState("");
  const [advPara,   setAdvPara]   = useState("");
  const [advAsunto, setAdvAsunto] = useState("");
  const [advFecha,  setAdvFecha]  = useState("");

  /* ── categorías ── */
  const [emailCats, setEmailCats] = useState<Record<number, string>>({});
  const [catMenuUid, setCatMenuUid] = useState<number | null>(null);

  /* ── carpetas personalizadas ── */
  const [carpetasCustom, setCarpetasCustom] = useState<string[]>([]);
  const [newCarpetaName, setNewCarpetaName] = useState("");
  const [showNewCarpeta, setShowNewCarpeta] = useState(false);

  /* ── firma ── */
  const [firma, setFirma] = useState("");
  const [showFirmaConfig, setShowFirmaConfig] = useState(false);
  const [firmaEdit, setFirmaEdit] = useState("");

  /* ── toast nuevos correos ── */
  const [toastMsg, setToastMsg] = useState("");
  const prevCountRef = useRef<number>(0);

  /* ── estado leer ── */
  const [emailActual,    setEmailActual]    = useState<EmailHeader | null>(null);
  const [cuerpo,         setCuerpo]         = useState({ body: "", html: "" });
  const [cargandoCuerpo, setCargandoCuerpo] = useState(false);
  const [zoom,           setZoom]           = useState(100);
  const emailListRef = useRef<EmailHeader[]>([]);
  emailListRef.current = emails;

  /* ── compose ── */
  const [composeOpen,   setComposeOpen]   = useState(false);
  const [compMinimized, setCompMinimized] = useState(false);
  const [compTo,        setCompTo]        = useState("");
  const [compCc,        setCompCc]        = useState("");
  const [compBcc,       setCompBcc]       = useState("");
  const [compSubject,   setCompSubject]   = useState("");
  const [compBody,      setCompBody]      = useState("");
  const [enviando,      setEnviando]      = useState(false);
  const [showCcBcc,     setShowCcBcc]     = useState(false);
  const [readReceipt,   setReadReceipt]   = useState(false);
  const [richFormat,    setRichFormat]    = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectDropdown, setSelectDropdown] = useState(false);

  /* ── reminder modal ── */
  const [reminderOpen,    setReminderOpen]    = useState(false);
  const [reminderEmail,   setReminderEmail]   = useState<EmailHeader | null>(null);
  const [reminderDate,    setReminderDate]    = useState("");
  const [reminders,       setReminders]       = useState<Record<number, string>>({});

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

      /* Toast: detectar correos nuevos */
      if (silencioso && lista.length > prevCountRef.current && prevCountRef.current > 0) {
        const nuevos = lista.length - prevCountRef.current;
        setToastMsg(`${nuevos} correo${nuevos > 1 ? "s" : ""} nuevo${nuevos > 1 ? "s" : ""}`);
        setTimeout(() => setToastMsg(""), 4000);
      }
      prevCountRef.current = lista.length;

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
    if (!splitView) setVista("leer");
    setCargandoCuerpo(true);
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
        if (vista === "leer" && !splitView) setVista("lista");
        setEmailActual(null);
        cargarEmails(false);
      },
    });
  };

  /* ─── spam ─── */
  const marcarSpam = (em: EmailHeader) => {
    setConfirmState({
      open: true, msg: `¿Marcar "${em.subject || "(sin asunto)"}" como spam y eliminarlo?`,
      onOk: async () => {
        await fetch("/api/mail/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uids: [em.seqno], folder: carpeta }),
        });
        flash("ok", "Marcado como spam");
        cargarEmails(false);
        if (emailActual?.uid === em.uid) { setEmailActual(null); if (!splitView) setVista("lista"); }
      },
    });
  };

  /* ─── enviar ─── */
  const enviarCorreo = async () => {
    if (!compTo.trim() || !compSubject.trim()) return;
    setEnviando(true);
    try {
      const bodyFinal = firma ? compBody + "\n\n--\n" + firma : compBody;
      const r    = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: compTo.trim(),
          cc: compCc.trim() || undefined,
          bcc: compBcc.trim() || undefined,
          subject: compSubject.trim(),
          body: bodyFinal,
          readReceipt,
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Error al enviar");
      setCompTo(""); setCompCc(""); setCompBcc(""); setCompSubject(""); setCompBody("");
      setComposeOpen(false); setShowCcBcc(false); setReadReceipt(false);
      cargarEmails(false);
      flash("ok", "Correo enviado correctamente");
    } catch (e: unknown) { flash("err", "Error: " + (e as Error).message); }
    setEnviando(false);
  };

  /* ─── responder ─── */
  const responder = useCallback(() => {
    if (!emailActual) return;
    setCompTo(emailAddr(emailActual.from));
    setCompSubject(`Re: ${emailActual.subject || ""}`);
    setCompCc(""); setCompBcc("");
    setCompBody(`\n\n--- Mensaje original ---\nDe: ${emailActual.from}\nFecha: ${emailActual.date}\n\n${cuerpo.body || ""}`);
    setComposeOpen(true); setCompMinimized(false);
  }, [emailActual, cuerpo]);

  const responderATodos = useCallback(() => {
    if (!emailActual) return;
    const fromAddr = emailAddr(emailActual.from);
    const toAddr   = emailActual.to ? emailAddr(emailActual.to) : "";
    const todos    = [fromAddr, toAddr].filter(Boolean).join(", ");
    setCompTo(todos); setCompCc(""); setCompBcc("");
    setCompSubject(`Re: ${emailActual.subject || ""}`);
    setCompBody(`\n\n--- Mensaje original ---\nDe: ${emailActual.from}\nPara: ${emailActual.to}\nFecha: ${emailActual.date}\n\n${cuerpo.body || ""}`);
    setComposeOpen(true); setCompMinimized(false);
  }, [emailActual, cuerpo]);

  const reenviar = useCallback(() => {
    if (!emailActual) return;
    setCompTo(""); setCompCc(""); setCompBcc("");
    setCompSubject(`Fwd: ${emailActual.subject || ""}`);
    setCompBody(`\n\n--- Mensaje reenviado ---\nDe: ${emailActual.from}\nFecha: ${emailActual.date}\nAsunto: ${emailActual.subject || ""}\n\n${cuerpo.body || ""}`);
    setComposeOpen(true); setCompMinimized(false);
  }, [emailActual, cuerpo]);

  const toggleLeido = useCallback(() => {
    if (!emailActual) return;
    setEmails(prev => prev.map(e =>
      e.uid === emailActual.uid ? { ...e, seen: !e.seen } : e
    ));
    setEmailActual(prev => prev ? { ...prev, seen: !prev.seen } : prev);
  }, [emailActual]);

  const imprimirEmail = () => window.print();

  const copiarRemitente = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddr(addr);
      flash("ok", "Dirección copiada al portapapeles");
      setTimeout(() => setCopiedAddr(""), 2000);
    } catch { /* ok */ }
  };

  const quickReply = (em: EmailHeader) => {
    setCompTo(emailAddr(em.from));
    setCompSubject(`Re: ${em.subject || ""}`);
    setCompBody(""); setCompCc(""); setCompBcc("");
    setComposeOpen(true); setCompMinimized(false);
  };

  const cargarMas = () => {
    const n = limite + 40;
    setLimite(n);
    cargarEmails(false, n);
  };

  /* ─── ordenar columna ─── */
  const handleSort = (col: SortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir(col === "date" ? "desc" : "asc"); }
  };

  /* ─── atajos ─── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      switch (e.key) {
        case "c": case "C":
          if (!composeOpen) {
            setCompTo(""); setCompSubject(""); setCompBody(""); setCompCc(""); setCompBcc("");
            setComposeOpen(true); setCompMinimized(false);
          }
          break;
        case "r": case "R":
          if (emailActual) responder();
          break;
        case "Escape":
          if (composeOpen) setComposeOpen(false);
          else if (advSearch) setAdvSearch(false);
          else if (vista === "leer" && !splitView) { setVista("lista"); setEmailActual(null); }
          break;
        case "+": case "=":
          setZoom(z => Math.min(z + 10, 150));
          break;
        case "-":
          setZoom(z => Math.max(z - 10, 70));
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [vista, composeOpen, emailActual, responder, advSearch, splitView]);

  /* ─── filtros y búsqueda ─── */
  const emailsFiltrados = emails.filter(e => {
    const q = busqueda.toLowerCase();
    const matchSearch = !busqueda.trim() ||
      (e.subject || "").toLowerCase().includes(q) ||
      (e.from    || "").toLowerCase().includes(q) ||
      (e.to      || "").toLowerCase().includes(q);
    const matchAdv =
      (!advDe     || (e.from    || "").toLowerCase().includes(advDe.toLowerCase())) &&
      (!advPara   || (e.to      || "").toLowerCase().includes(advPara.toLowerCase())) &&
      (!advAsunto || (e.subject || "").toLowerCase().includes(advAsunto.toLowerCase())) &&
      (!advFecha  || (e.date    || "").includes(advFecha));
    const matchFiltro =
      filtro === "sinleer"    ? !e.seen :
      filtro === "destacados" ? starred.has(e.seqno) :
      filtro === "flagged"    ? flagged.has(e.seqno) :
      true;
    return matchSearch && matchAdv && matchFiltro;
  });

  /* ─── ordenar ─── */
  const emailsOrdenados = [...emailsFiltrados].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "date") {
      cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
    } else if (sortBy === "from") {
      cmp = nombreCorto(a.from).localeCompare(nombreCorto(b.from), "es");
    } else if (sortBy === "subject") {
      cmp = (a.subject || "").localeCompare(b.subject || "", "es");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const unreadCount        = emails.filter(e => !e.seen).length;
  const starredCount       = starred.size;
  const flaggedCount       = flagged.size;
  const todosSeleccionados = emailsFiltrados.length > 0 &&
    emailsFiltrados.every(e => seleccionados.has(e.seqno));
  const algunosSeleccionados = seleccionados.size > 0 && !todosSeleccionados;

  const toggleTodos = () =>
    todosSeleccionados
      ? setSeleccionados(new Set())
      : setSeleccionados(new Set(emailsFiltrados.map(e => e.seqno)));

  const toggleSel = (seqno: number) =>
    setSeleccionados(prev => { const n = new Set(prev); n.has(seqno) ? n.delete(seqno) : n.add(seqno); return n; });

  const toggleStar = (seqno: number, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setStarred(prev => { const n = new Set(prev); n.has(seqno) ? n.delete(seqno) : n.add(seqno); return n; });
  };

  const toggleFlag = (seqno: number, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setFlagged(prev => { const n = new Set(prev); n.has(seqno) ? n.delete(seqno) : n.add(seqno); return n; });
  };

  const setCategory = (uid: number, label: string) => {
    setEmailCats(prev => ({ ...prev, [uid]: label }));
    setCatMenuUid(null);
  };

  /* ── row height ── */
  const rowPy = compacto ? 5 : 9;

  /* ── palette: gris acero medio — más claro, formal ── */
  const G = {
    bg:        "linear-gradient(to right, #2B3544 0%, #323E4F 45%, #3A4759 100%)",
    card:      "rgba(0,0,0,0.14)",
    border:    "rgba(180,200,230,0.14)",
    text:      "#E8F0FA",
    secondary: "#8AAFC8",
    blue:      "#7BB6FF",
    hover:     "rgba(255,255,255,0.08)",
    unread:    "rgba(255,255,255,0.08)",
    read:      "transparent",
    selected:  "rgba(123,182,255,0.18)",
    error:     "rgba(217,48,37,0.12)",
    errorBorder: "rgba(255,80,60,0.30)",
    sidebar:         "#0A1624",
    sidebarText:     "#E0ECF8",
    sidebarSecondary:"#7B9EC4",
    sidebarCard:     "#182435",
    sidebarBorder:   "rgba(145,175,225,0.12)",
    sidebarHover:    "rgba(123,182,255,0.10)",
    sidebarSelected: "rgba(123,182,255,0.18)",
  };

  /* ── SortIcon ── */
  const SortIcon = ({ col }: { col: SortBy }) => {
    if (sortBy !== col) return <ChevronsUpDown style={{ width: 12, height: 12, opacity: 0.35, marginLeft: 4 }} />;
    return sortDir === "asc"
      ? <ChevronUp   style={{ width: 12, height: 12, color: G.blue, marginLeft: 4 }} />
      : <ChevronDown style={{ width: 12, height: 12, color: G.blue, marginLeft: 4 }} />;
  };

  /* ══════════════════════════════════════════════════════════
     PANEL LEER — reutilizable en split y en full
  ═══════════════════════════════════════════════════════════ */
  const PanelLeer = () => !emailActual ? (
    <div className="flex-1 flex items-center justify-center" style={{ background: G.bg }}>
      <div className="flex flex-col items-center gap-3">
        <InboxIcon style={{ width: 48, height: 48, color: "rgba(145,175,225,0.18)" }} />
        <p style={{ fontSize: 14, color: G.secondary }}>Selecciona un correo para leerlo</p>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: G.bg }}>
      {/* Toolbar leer */}
      <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 border-b flex-wrap"
        style={{ borderColor: G.border, background: G.card, rowGap: 4 }}>
        {!splitView && (
          <button onClick={() => { setVista("lista"); setEmailActual(null); }}
            className="p-1.5 rounded-full transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
            title="Volver (Esc)">
            <ChevronLeft style={{ width: 20, height: 20, color: G.secondary }} />
          </button>
        )}

        <button onClick={() => eliminarEmail(emailActual)}
          className="p-1.5 rounded-full" style={{ background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,80,60,0.12)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")} title="Eliminar">
          <Trash2 style={{ width: 16, height: 16, color: G.secondary }} />
        </button>

        <button onClick={() => marcarSpam(emailActual)}
          className="p-1.5 rounded-full" style={{ background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,152,0,0.12)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")} title="Marcar como spam">
          <ShieldOff style={{ width: 16, height: 16, color: G.secondary }} />
        </button>

        <button onClick={toggleLeido}
          className="p-1.5 rounded-full" style={{ background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
          title={emailActual.seen ? "Marcar como no leído" : "Marcar como leído"}>
          <BookOpen style={{ width: 16, height: 16, color: emailActual.seen ? G.secondary : G.blue }} />
        </button>

        <button onClick={imprimirEmail}
          className="p-1.5 rounded-full" style={{ background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")} title="Imprimir">
          <Printer style={{ width: 16, height: 16, color: G.secondary }} />
        </button>

        <button onClick={() => { setReminderEmail(emailActual); setReminderOpen(true); }}
          className="p-1.5 rounded-full" style={{ background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
          title={reminders[emailActual.uid] ? `Recordatorio: ${reminders[emailActual.uid]}` : "Agregar recordatorio"}>
          <Bell style={{ width: 16, height: 16, color: reminders[emailActual.uid] ? "#7BB6FF" : G.secondary }} />
        </button>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(z - 10, 70))}
            className="p-1.5 rounded-full" style={{ background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")} title="Zoom -">
            <ZoomOut style={{ width: 15, height: 15, color: G.secondary }} />
          </button>
          <span style={{ fontSize: 11, color: G.secondary, minWidth: 34, textAlign: "center" }}>{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(z + 10, 150))}
            className="p-1.5 rounded-full" style={{ background: "none", border: "none", cursor: "pointer" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")} title="Zoom +">
            <ZoomIn style={{ width: 15, height: 15, color: G.secondary }} />
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: G.border, margin: "0 2px" }} />

        <button onClick={responder}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: "rgba(123,182,255,0.12)", color: G.blue, fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(123,182,255,0.22)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(123,182,255,0.12)")}
          title="Responder (r)">
          <Reply style={{ width: 13, height: 13 }} /> Responder
        </button>

        <button onClick={responderATodos}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", color: G.secondary, fontSize: 12, fontWeight: 500, border: `1px solid ${G.border}`, cursor: "pointer" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}>
          <CornerUpRight style={{ width: 13, height: 13 }} /> A todos
        </button>

        <button onClick={reenviar}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", color: G.secondary, fontSize: 12, fontWeight: 500, border: `1px solid ${G.border}`, cursor: "pointer" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}>
          <Forward style={{ width: 13, height: 13 }} /> Reenviar
        </button>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto px-5 py-4" style={{ background: G.bg }}>
        <h2 style={{ fontSize: splitView ? 17 : 22, fontWeight: 400, color: G.text, marginBottom: 16, lineHeight: 1.3 }}>
          {emailActual.subject || "(sin asunto)"}
          {hasAttachment(emailActual) && <Paperclip style={{ width: 16, height: 16, display: "inline", marginLeft: 8, color: G.secondary }} />}
          {emailCats[emailActual.uid] && (
            <span style={{ fontSize: 11, background: CATEGORIES.find(c => c.label === emailCats[emailActual.uid])?.color + "30", color: CATEGORIES.find(c => c.label === emailCats[emailActual.uid])?.color, borderRadius: 10, padding: "2px 8px", marginLeft: 8, fontWeight: 600, verticalAlign: "middle" }}>
              {emailCats[emailActual.uid]}
            </span>
          )}
        </h2>

        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-sm font-semibold"
            style={{ width: 38, height: 38, background: avatarColor(nombreCorto(emailActual.from)) }}>
            {(nombreCorto(emailActual.from)[0] || "?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span style={{ fontSize: 14, fontWeight: 600, color: G.text }}>{nombreCorto(emailActual.from)}</span>
              <button onClick={() => copiarRemitente(emailAddr(emailActual.from))}
                style={{ background: "none", border: "none", cursor: "pointer", color: G.secondary, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                {copiedAddr === emailAddr(emailActual.from)
                  ? <><Check style={{ width: 11, height: 11, color: "#4CAF50" }} /><span style={{ color: "#4CAF50" }}>copiado</span></>
                  : <><Copy style={{ width: 11, height: 11 }} />&lt;{emailAddr(emailActual.from)}&gt;</>
                }
              </button>
            </div>
            <div style={{ fontSize: 12, color: G.secondary, marginTop: 2 }}>
              Para: {emailActual.to || "—"} · {fechaLarga(emailActual.date)}
              {readReceipt && <span style={{ marginLeft: 8, color: "#F4B400" }}>· Acuse solicitado</span>}
              {reminders[emailActual.uid] && <span style={{ marginLeft: 8, color: "#7BB6FF" }}>· Recordatorio: {reminders[emailActual.uid]}</span>}
            </div>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ background: G.card, border: `1px solid ${G.border}`, padding: "20px 24px", fontSize: zoom !== 100 ? `${zoom}%` : undefined }}>
          {cargandoCuerpo ? (
            <div className="flex justify-center py-10">
              <Loader2 style={{ width: 24, height: 24, color: G.blue }} className="animate-spin" />
            </div>
          ) : cuerpo.html ? (
            <iframe srcDoc={cuerpo.html} className="w-full border-0" style={{ minHeight: 320 }} sandbox="allow-same-origin" title="Email content" />
          ) : (
            <pre style={{ fontSize: "inherit", color: G.text, whiteSpace: "pre-wrap", lineHeight: 1.7, fontFamily: "inherit" }}>
              {cuerpo.body || "Sin contenido"}
            </pre>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={responder}
            className="flex items-center gap-2 px-5 py-2 rounded-full border"
            style={{ borderColor: G.border, color: G.text, fontSize: 13, background: "transparent", cursor: "pointer" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = G.hover)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
            <Reply style={{ width: 14, height: 14 }} /> Responder
          </button>
          <button onClick={reenviar}
            className="flex items-center gap-2 px-5 py-2 rounded-full border"
            style={{ borderColor: G.border, color: G.secondary, fontSize: 13, background: "transparent", cursor: "pointer" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = G.hover)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}>
            <Forward style={{ width: 14, height: 14 }} /> Reenviar
          </button>
        </div>
      </div>
    </div>
  );

  /* ── COLUMNA HEADER ── */
  const ColHeader = ({ col, label, width }: { col: SortBy; label: string; width?: number | string }) => (
    <button
      onClick={() => handleSort(col)}
      className="flex items-center"
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: sortBy === col ? G.blue : G.secondary,
        fontSize: 11, fontWeight: sortBy === col ? 700 : 500,
        letterSpacing: "0.04em", textTransform: "uppercase",
        padding: "0 4px",
        width: width || "auto",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {label}<SortIcon col={col} />
    </button>
  );

  /* ══════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="h-full flex overflow-hidden relative"
      style={{ background: G.bg, fontFamily: "system-ui, -apple-system, Arial, sans-serif" }}>

      {/* ── TOAST nuevos correos ── */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ transform: "translateX(-50%)", background: G.blue, color: "#0A1929", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.30)" }}>
          <Bell style={{ width: 14, height: 14 }} /> {toastMsg}
        </div>
      )}

      {/* ── SIDEBAR ── */}
      <aside className="flex-shrink-0 flex flex-col pt-3 pb-4"
        style={{ width: 220, background: G.sidebar, boxShadow: "4px 0 20px rgba(0,0,0,0.22)", zIndex: 1 }}>

        {/* Redactar */}
        <div className="px-3 mb-4">
          <button
            onClick={() => { setCompTo(""); setCompSubject(""); setCompBody(""); setCompCc(""); setCompBcc(""); setComposeOpen(true); setCompMinimized(false); }}
            className="flex items-center gap-3 transition-all w-full"
            style={{ background: G.sidebarCard, boxShadow: "0 1px 4px rgba(0,0,0,0.30)", border: `1px solid ${G.sidebarBorder}`, borderRadius: 16, padding: "12px 16px", color: G.sidebarText, fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left" }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(123,182,255,0.15)")}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = G.sidebarCard)}>
            <PenSquare style={{ width: 18, height: 18, color: "#7BB6FF" }} />
            Redactar
            <span style={{ marginLeft: "auto", fontSize: 10, color: G.sidebarSecondary }}>c</span>
          </button>
        </div>

        {/* Carpetas sistema */}
        <nav className="flex flex-col gap-0.5">
          {([
            { key: "INBOX", label: "Recibidos",  count: unreadCount, icon: InboxIcon },
            { key: "Sent",  label: "Enviados",    count: 0,          icon: Send },
          ] as { key: Carpeta; label: string; count: number; icon: React.ElementType }[]).map(item => (
            <button key={item.key}
              onClick={() => { setCarpeta(item.key); setVista("lista"); setBusqueda(""); setFiltro("todos"); setEmailActual(null); }}
              className="flex items-center gap-3 py-2.5 transition-colors"
              style={{ paddingLeft: 16, paddingRight: 16, background: carpeta === item.key ? G.sidebarSelected : "transparent", color: carpeta === item.key ? "#7BB6FF" : G.sidebarSecondary, fontWeight: carpeta === item.key ? 700 : 400, fontSize: 14, cursor: "pointer", border: "none", borderRadius: "0 24px 24px 0", textAlign: "left" }}>
              <item.icon style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span className="flex-1">{item.label}</span>
              {item.count > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#7BB6FF" }}>{item.count}</span>}
            </button>
          ))}

          {/* Carpetas personalizadas */}
          {carpetasCustom.map(cp => (
            <button key={cp}
              onClick={() => { setCarpeta(cp); setVista("lista"); setBusqueda(""); setFiltro("todos"); setEmailActual(null); }}
              className="flex items-center gap-3 py-2 transition-colors"
              style={{ paddingLeft: 16, paddingRight: 16, background: carpeta === cp ? G.sidebarSelected : "transparent", color: carpeta === cp ? "#7BB6FF" : G.sidebarSecondary, fontSize: 13, cursor: "pointer", border: "none", borderRadius: "0 24px 24px 0", textAlign: "left" }}>
              <FolderPlus style={{ width: 14, height: 14, flexShrink: 0 }} />
              <span className="flex-1 truncate">{cp}</span>
            </button>
          ))}
        </nav>

        {/* Agregar carpeta */}
        <div className="px-3 mt-2">
          {showNewCarpeta ? (
            <div className="flex gap-1">
              <input value={newCarpetaName} onChange={e => setNewCarpetaName(e.target.value)}
                placeholder="Nombre…" autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter" && newCarpetaName.trim()) {
                    setCarpetasCustom(p => [...p, newCarpetaName.trim()]);
                    setNewCarpetaName(""); setShowNewCarpeta(false);
                  } else if (e.key === "Escape") setShowNewCarpeta(false);
                }}
                className="flex-1 outline-none rounded px-2 py-1"
                style={{ fontSize: 12, background: G.sidebarCard, border: `1px solid ${G.sidebarBorder}`, color: G.sidebarText }} />
              <button onClick={() => setShowNewCarpeta(false)} style={{ background: "none", border: "none", cursor: "pointer", color: G.sidebarSecondary }}>
                <X style={{ width: 13, height: 13 }} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowNewCarpeta(true)}
              className="flex items-center gap-2 w-full transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", color: G.sidebarSecondary, fontSize: 12, padding: "6px 0" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = G.blue)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = G.sidebarSecondary)}>
              <FolderPlus style={{ width: 13, height: 13 }} /> Nueva carpeta
            </button>
          )}
        </div>

        <div style={{ margin: "8px 0", height: 1, background: G.sidebarBorder }} />

        {/* Herramientas sidebar */}
        <div className="flex flex-col gap-0.5 px-2">
          {[
            { icon: SplitSquareHorizontal, label: "Panel dividido", active: splitView, action: () => setSplitView(p => !p) },
            { icon: Layout, label: compacto ? "Vista cómoda" : "Vista compacta", active: compacto, action: () => setCompacto(p => !p) },
            { icon: Settings2, label: "Configurar firma", active: false, action: () => { setFirmaEdit(firma); setShowFirmaConfig(true); } },
          ].map(t => (
            <button key={t.label} onClick={t.action}
              className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors"
              style={{ background: t.active ? G.sidebarSelected : "none", border: "none", cursor: "pointer", color: t.active ? "#7BB6FF" : G.sidebarSecondary, fontSize: 12, textAlign: "left" }}
              onMouseEnter={e => !t.active && ((e.currentTarget as HTMLElement).style.background = G.sidebarHover)}
              onMouseLeave={e => !t.active && ((e.currentTarget as HTMLElement).style.background = "none")}>
              <t.icon style={{ width: 14, height: 14, flexShrink: 0 }} /> {t.label}
            </button>
          ))}
        </div>

        {/* Shortcuts + hora */}
        <div className="px-4 pt-3 mt-auto" style={{ borderTop: `1px solid ${G.sidebarBorder}` }}>
          <p style={{ fontSize: 10, color: G.sidebarSecondary, marginBottom: 4, letterSpacing: "0.06em" }}>ATAJOS</p>
          {[{ key: "c", desc: "Redactar" }, { key: "r", desc: "Responder" }, { key: "+/-", desc: "Zoom" }, { key: "Esc", desc: "Volver" }].map(s => (
            <div key={s.key} className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 10, background: G.sidebarCard, color: G.sidebarText, padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", border: `1px solid ${G.sidebarBorder}` }}>{s.key}</span>
              <span style={{ fontSize: 11, color: G.sidebarSecondary }}>{s.desc}</span>
            </div>
          ))}
          {lastUpdate && (
            <p style={{ fontSize: 10, color: G.sidebarSecondary, marginTop: 6 }}>
              {lastUpdate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
              {refreshing && <span style={{ color: "#7BB6FF" }}> · …</span>}
            </p>
          )}
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ═══ PANEL LISTA ═══ */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: splitView ? 420 : "100%", flexShrink: 0, borderRight: splitView ? `1px solid ${G.border}` : "none" }}>

          <FlashBanner msg={msg} className="px-4 pt-2" />

          {/* Search bar */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2"
            style={{ background: G.bg, borderBottom: `1px solid ${G.border}` }}>
            <AriaBackButton href="/dashboard" />
            <div className="flex-1 relative" style={{ maxWidth: 560 }}>
              <Search style={{ width: 15, height: 15, position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: G.secondary }} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar en correos…"
                className="w-full outline-none"
                style={{ background: "rgba(145,175,225,0.10)", border: "none", borderRadius: 24, padding: "8px 40px", fontSize: 13, color: G.text }}
                onFocus={e => ((e.target as HTMLElement).style.background = "rgba(145,175,225,0.18)")}
                onBlur={e  => ((e.target as HTMLElement).style.background = "rgba(145,175,225,0.10)")} />
              {busqueda && (
                <button onClick={() => setBusqueda("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer" }}>
                  <X style={{ width: 13, height: 13, color: G.secondary }} />
                </button>
              )}
            </div>
            {/* Búsqueda avanzada toggle */}
            <button onClick={() => setAdvSearch(p => !p)}
              className="p-1.5 rounded-full"
              style={{ background: advSearch ? "rgba(123,182,255,0.18)" : "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = advSearch ? "rgba(123,182,255,0.18)" : "none")}
              title="Búsqueda avanzada">
              <Filter style={{ width: 15, height: 15, color: advSearch ? G.blue : G.secondary }} />
            </button>
            <button onClick={() => cargarEmails(false)} disabled={loading} className="p-1.5 rounded-full"
              style={{ background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")} title="Actualizar">
              {loading || refreshing
                ? <Loader2 style={{ width: 15, height: 15, color: G.secondary }} className="animate-spin" />
                : <RefreshCw style={{ width: 15, height: 15, color: G.secondary }} />}
            </button>
          </div>

          {/* Búsqueda avanzada */}
          {advSearch && (
            <div className="flex-shrink-0 px-4 py-3 border-b grid grid-cols-2 gap-2"
              style={{ background: "rgba(0,0,0,0.20)", borderColor: G.border }}>
              {[
                { label: "De:", value: advDe, set: setAdvDe },
                { label: "Para:", value: advPara, set: setAdvPara },
                { label: "Asunto:", value: advAsunto, set: setAdvAsunto },
                { label: "Fecha (YYYY-MM):", value: advFecha, set: setAdvFecha },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  <span style={{ fontSize: 11, color: G.secondary, width: 90, flexShrink: 0 }}>{f.label}</span>
                  <input value={f.value} onChange={e => f.set(e.target.value)} placeholder=""
                    className="flex-1 outline-none rounded px-2 py-1"
                    style={{ fontSize: 12, background: "rgba(145,175,225,0.10)", border: `1px solid ${G.border}`, color: G.text }} />
                </div>
              ))}
              <div className="col-span-2 flex justify-end">
                <button onClick={() => { setAdvDe(""); setAdvPara(""); setAdvAsunto(""); setAdvFecha(""); }}
                  style={{ fontSize: 11, color: G.secondary, background: "none", border: "none", cursor: "pointer" }}>
                  Limpiar
                </button>
              </div>
            </div>
          )}

          {/* Filtros rápidos */}
          <div className="flex-shrink-0 flex items-center border-b"
            style={{ background: "rgba(0,0,0,0.14)", borderColor: G.border }}>
            {([
              { key: "todos",      label: "Todos",      count: emails.length },
              { key: "sinleer",    label: "Sin leer",   count: unreadCount },
              { key: "destacados", label: "Destacados", count: starredCount },
              { key: "flagged",    label: "Pendientes", count: flaggedCount },
            ] as { key: Filtro; label: string; count: number }[]).map(f => (
              <button key={f.key} onClick={() => setFiltro(f.key)}
                className="flex items-center gap-1 px-4 py-2 transition-colors"
                style={{ background: "none", border: "none", cursor: "pointer", color: filtro === f.key ? G.blue : G.secondary, fontSize: 12, fontWeight: filtro === f.key ? 600 : 400, borderBottom: filtro === f.key ? `2px solid ${G.blue}` : "2px solid transparent" }}>
                {f.label}
                {f.count > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: filtro === f.key ? G.blue : G.secondary, background: "rgba(123,182,255,0.12)", borderRadius: 10, padding: "1px 5px" }}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
            <div className="flex-1" />
            {/* Selector dropdown inteligente */}
            <div className="relative flex items-center gap-2 px-3">
              <div className="relative">
                <button
                  onClick={() => setSelectDropdown(p => !p)}
                  className="flex items-center gap-1"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 2px" }}>
                  <input type="checkbox"
                    checked={todosSeleccionados}
                    onChange={() => {}}
                    ref={el => { if (el) el.indeterminate = algunosSeleccionados; }}
                    style={{ width: 14, height: 14, accentColor: G.blue, cursor: "pointer", pointerEvents: "none" }} />
                  <ChevronDown style={{ width: 11, height: 11, color: G.secondary }} />
                </button>
                {selectDropdown && (
                  <div className="absolute top-full left-0 mt-1 rounded-lg overflow-hidden z-20"
                    style={{ background: "#0D1F38", border: `1px solid ${G.border}`, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.40)" }}>
                    {[
                      { label: "Todos",         action: () => setSeleccionados(new Set(emailsFiltrados.map(e => e.seqno))) },
                      { label: "Ninguno",        action: () => setSeleccionados(new Set()) },
                      { label: "Sin leer",       action: () => setSeleccionados(new Set(emailsFiltrados.filter(e => !e.seen).map(e => e.seqno))) },
                      { label: "Leídos",         action: () => setSeleccionados(new Set(emailsFiltrados.filter(e => e.seen).map(e => e.seqno))) },
                      { label: "Destacados",     action: () => setSeleccionados(new Set(emailsFiltrados.filter(e => starred.has(e.seqno)).map(e => e.seqno))) },
                    ].map(opt => (
                      <button key={opt.label} onClick={() => { opt.action(); setSelectDropdown(false); }}
                        className="w-full text-left px-4 py-2"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: G.text }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = G.hover)}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {seleccionados.size > 0 && (
                <>
                  <span style={{ fontSize: 11, color: G.secondary }}>{seleccionados.size} sel.</span>
                  <button onClick={eliminarSeleccionados} className="p-1 rounded"
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,80,60,0.12)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}>
                    <Trash2 style={{ width: 13, height: 13, color: G.secondary }} />
                  </button>
                </>
              )}
              {seleccionados.size === 0 && (
                <span style={{ fontSize: 11, color: G.secondary }}>
                  {emails.length} correo{emails.length !== 1 ? "s" : ""}
                  {unreadCount > 0 && <span style={{ color: G.blue, fontWeight: 600 }}> · {unreadCount} sin leer</span>}
                </span>
              )}
            </div>
          </div>

          {/* ── CABECERAS COLUMNAS ORDENABLES ── */}
          <div className="flex-shrink-0 flex items-center px-4 py-1.5 border-b"
            style={{ background: "rgba(0,0,0,0.18)", borderColor: G.border }}>
            {/* espaciado para checkbox+star+avatar */}
            <div style={{ width: 14+2+15+2+30+12+8, flexShrink: 0 }} />
            <ColHeader col="from"    label="De"       width={148} />
            <ColHeader col="subject" label="Asunto"   />
            <div className="flex-1" />
            <ColHeader col="date"    label="Recibido · Tamaño" width={120} />
          </div>

          {/* Error */}
          {error && (
            <div className="mx-3 mt-2 flex items-start gap-3 rounded-lg p-3"
              style={{ background: G.error, border: `1px solid ${G.errorBorder}` }}>
              <AlertTriangle style={{ width: 16, height: 16, color: "#FF6B6B", flexShrink: 0, marginTop: 1 }} />
              <div className="flex-1">
                <p style={{ fontSize: 12, color: "#FF6B6B", fontWeight: 500 }}>Error de conexión</p>
                <p style={{ fontSize: 12, color: "#FF8C8C" }}>{error}</p>
              </div>
              <button onClick={() => cargarEmails(false)}
                style={{ fontSize: 12, color: "#FF6B6B", textDecoration: "underline", cursor: "pointer", background: "none", border: "none" }}>
                Reintentar
              </button>
            </div>
          )}

          {/* Lista */}
          <div className="flex-1 overflow-auto" style={{ background: G.bg }}
            onClick={() => { setSelectDropdown(false); setCatMenuUid(null); }}>
            {loading && emails.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 style={{ width: 28, height: 28, color: G.blue }} className="animate-spin" />
                <p style={{ fontSize: 13, color: G.secondary }}>Conectando con Zoho Mail…</p>
              </div>
            ) : emailsOrdenados.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <InboxIcon style={{ width: 48, height: 48, color: "rgba(145,175,225,0.18)", marginBottom: 10 }} />
                <p style={{ fontSize: 13, color: G.secondary }}>
                  {busqueda || advDe || advPara || advAsunto || advFecha ? "Sin resultados" : filtro === "sinleer" ? "No hay correos sin leer" : filtro === "destacados" ? "No hay correos destacados" : filtro === "flagged" ? "No hay pendientes" : "Bandeja vacía"}
                </p>
              </div>
            ) : (
              <>
                {emailsOrdenados.map(em => {
                  const isSelected  = seleccionados.has(em.seqno);
                  const isStarred   = starred.has(em.seqno);
                  const isFlagged   = flagged.has(em.seqno);
                  const isActive    = splitView && emailActual?.uid === em.uid;
                  const name        = carpeta === "Sent" ? nombreCorto(em.to) : nombreCorto(em.from);
                  const catColor    = emailCats[em.uid] ? CATEGORIES.find(c => c.label === emailCats[em.uid])?.color : undefined;
                  const snippet     = "";

                  return (
                    <div key={em.uid || em.seqno}
                      className="group flex items-center gap-2 px-3 cursor-pointer transition-all border-b"
                      style={{
                        paddingTop: rowPy, paddingBottom: rowPy,
                        background: isSelected ? G.selected : isActive ? G.selected : em.seen ? G.read : G.unread,
                        borderColor: G.border,
                        borderLeft: isFlagged ? "3px solid #E53935" : em.seen ? "3px solid transparent" : `3px solid ${G.blue}`,
                      }}
                      onClick={() => abrirEmail(em)}
                      onMouseEnter={e => { if (!isSelected && !isActive) (e.currentTarget as HTMLElement).style.background = G.hover; }}
                      onMouseLeave={e => { if (!isSelected && !isActive) (e.currentTarget as HTMLElement).style.background = em.seen ? G.read : G.unread; }}>

                      {/* Checkbox */}
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSel(em.seqno)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: 14, height: 14, accentColor: G.blue, cursor: "pointer", flexShrink: 0, opacity: isSelected ? 1 : 0, transition: "opacity 0.15s" }}
                        className="group-hover:!opacity-100" />

                      {/* Star */}
                      <button onClick={e => toggleStar(em.seqno, e)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 1, flexShrink: 0, opacity: isStarred ? 1 : 0, transition: "opacity 0.15s" }}
                        className="group-hover:!opacity-100">
                        <Star style={{ width: 13, height: 13, color: isStarred ? "#F4B400" : "rgba(145,175,225,0.35)", fill: isStarred ? "#F4B400" : "none" }} />
                      </button>

                      {/* Flag (Outlook) */}
                      <button onClick={e => toggleFlag(em.seqno, e)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 1, flexShrink: 0, opacity: isFlagged ? 1 : 0, transition: "opacity 0.15s" }}
                        className="group-hover:!opacity-100" title="Bandera de seguimiento">
                        <Flag style={{ width: 13, height: 13, color: isFlagged ? "#E53935" : "rgba(145,175,225,0.35)", fill: isFlagged ? "#E53935" : "none" }} />
                      </button>

                      {/* Avatar */}
                      <div className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-semibold"
                        style={{ width: 28, height: 28, fontSize: 11, background: avatarColor(name) }}>
                        {(name[0] || "?").toUpperCase()}
                      </div>

                      {/* Categoría dot */}
                      {catColor && <div style={{ width: 7, height: 7, borderRadius: "50%", background: catColor, flexShrink: 0 }} title={emailCats[em.uid]} />}

                      {/* Sender */}
                      <span className="flex-shrink-0 truncate"
                        style={{ width: 140, fontSize: 12, fontWeight: em.seen ? 400 : 700, color: G.text }}>
                        {name}
                      </span>

                      {/* Subject + snippet */}
                      <div className="flex-1 min-w-0 truncate">
                        <span style={{ fontSize: 12, fontWeight: em.seen ? 400 : 600, color: em.seen ? G.secondary : G.text }}>
                          {em.subject || "(sin asunto)"}
                        </span>
                        {!compacto && snippet && (
                          <span style={{ fontSize: 12, color: "rgba(145,175,225,0.50)", marginLeft: 8 }}>— {snippet}</span>
                        )}
                      </div>

                      {/* Adjunto */}
                      {hasAttachment(em) && <Paperclip style={{ width: 12, height: 12, color: G.secondary, flexShrink: 0 }} />}

                      {/* Hover actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={e => { e.stopPropagation(); quickReply(em); }}
                          className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer" }}
                          onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
                          onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.background = "none")} title="Responder">
                          <Reply style={{ width: 12, height: 12, color: G.secondary }} />
                        </button>
                        {/* Categoría hover */}
                        <div className="relative">
                          <button onClick={e => { e.stopPropagation(); setCatMenuUid(catMenuUid === em.uid ? null : em.uid); }}
                            className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer" }}
                            onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
                            onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.background = "none")} title="Categoría">
                            <Tag style={{ width: 12, height: 12, color: catColor || G.secondary }} />
                          </button>
                          {catMenuUid === em.uid && (
                            <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-20"
                              style={{ background: "#0D1F38", border: `1px solid ${G.border}`, minWidth: 130, boxShadow: "0 8px 24px rgba(0,0,0,0.40)" }}
                              onClick={e => e.stopPropagation()}>
                              {CATEGORIES.map(cat => (
                                <button key={cat.label} onClick={() => setCategory(em.uid, cat.label)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5"
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: G.text }}
                                  onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.background = G.hover)}
                                  onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.background = "none")}>
                                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                                  {cat.label}
                                </button>
                              ))}
                              {emailCats[em.uid] && (
                                <button onClick={() => { setEmailCats(p => { const n = { ...p }; delete n[em.uid]; return n; }); setCatMenuUid(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 border-t"
                                  style={{ background: "none", border: "none", borderTop: `1px solid ${G.border}`, cursor: "pointer", fontSize: 11, color: G.secondary }}
                                  onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.background = G.hover)}
                                  onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.background = "none")}>
                                  <X style={{ width: 10, height: 10 }} /> Quitar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <button onClick={e => { e.stopPropagation(); eliminarEmail(em); }}
                          className="p-1 rounded" style={{ background: "none", border: "none", cursor: "pointer" }}
                          onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.background = "rgba(255,80,60,0.15)")}
                          onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.background = "none")} title="Eliminar">
                          <Trash2 style={{ width: 12, height: 12, color: G.secondary }} />
                        </button>
                      </div>

                      {/* Fecha + hora + tamaño */}
                      <div className="flex-shrink-0 flex flex-col items-end" style={{ minWidth: 90 }}>
                        <span style={{ fontSize: 11, fontWeight: em.seen ? 400 : 700, color: em.seen ? G.secondary : G.text, whiteSpace: "nowrap" }}>
                          {fechaCorta(em.date)}
                        </span>
                        {em.size && em.size > 0 && (
                          <span style={{ fontSize: 10, color: "rgba(138,175,200,0.60)", marginTop: 1 }}>
                            {pesoLegible(em.size)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {emailsOrdenados.length >= limite && (
                  <div className="flex justify-center py-3">
                    <button onClick={cargarMas} disabled={loading}
                      className="flex items-center gap-2 px-5 py-1.5 rounded-full"
                      style={{ background: G.card, border: `1px solid ${G.border}`, color: G.secondary, fontSize: 12, cursor: "pointer" }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = G.hover)}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = G.card)}>
                      {loading && <Loader2 style={{ width: 12, height: 12 }} className="animate-spin" />}
                      Cargar más
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ═══ PANEL LEER (split o full) ═══ */}
        {(splitView || vista === "leer") && (
          <div className="flex-1 flex overflow-hidden">
            <PanelLeer />
          </div>
        )}
      </div>

      {/* ── COMPOSE MODAL ── */}
      {composeOpen && (
        <div className="fixed bottom-0 right-6 z-50 flex flex-col rounded-t-xl overflow-hidden"
          style={{ width: 540, height: compMinimized ? 48 : 520, boxShadow: "0 8px 32px rgba(0,0,0,0.40)", background: "#0D1F38", border: `1px solid ${G.border}`, borderBottom: "none", transition: "height 0.2s ease" }}>

          {/* Header */}
          <div className="flex items-center gap-2 px-4 flex-shrink-0"
            style={{ height: 48, background: "#0A1929", borderBottom: `1px solid ${G.border}`, cursor: "pointer" }}
            onClick={() => setCompMinimized(p => !p)}>
            <span style={{ fontSize: 13, fontWeight: 500, color: G.text, flex: 1 }}>Nuevo mensaje</span>
            {readReceipt && <span style={{ fontSize: 10, color: "#F4B400" }}>Acuse activado</span>}
            <button onClick={e => { e.stopPropagation(); setCompMinimized(p => !p); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 5px", color: G.secondary, fontSize: 12, borderRadius: 4 }}>
              {compMinimized ? "▲" : "▼"}
            </button>
            <button onClick={e => { e.stopPropagation(); setComposeOpen(false); }}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: G.secondary, borderRadius: 4 }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {!compMinimized && (
            <>
              {/* Para */}
              <div className="flex items-center border-b px-4" style={{ borderColor: G.border }}>
                <span style={{ fontSize: 12, color: G.secondary, width: 44, flexShrink: 0 }}>Para</span>
                <input value={compTo} onChange={e => setCompTo(e.target.value)} placeholder=""
                  className="flex-1 outline-none"
                  style={{ fontSize: 13, color: G.text, background: "transparent", border: "none", padding: "9px 0" }} />
                <button onClick={() => setShowCcBcc(p => !p)}
                  style={{ fontSize: 11, color: G.secondary, background: "none", border: "none", cursor: "pointer" }}>
                  {showCcBcc ? "Ocultar" : "CC/BCC"}
                </button>
              </div>

              {/* CC / BCC */}
              {showCcBcc && (
                <>
                  <div className="flex items-center border-b px-4" style={{ borderColor: G.border }}>
                    <span style={{ fontSize: 12, color: G.secondary, width: 44, flexShrink: 0 }}>CC</span>
                    <input value={compCc} onChange={e => setCompCc(e.target.value)} placeholder="Copias"
                      className="flex-1 outline-none"
                      style={{ fontSize: 13, color: G.text, background: "transparent", border: "none", padding: "9px 0" }} />
                  </div>
                  <div className="flex items-center border-b px-4" style={{ borderColor: G.border }}>
                    <span style={{ fontSize: 12, color: G.secondary, width: 44, flexShrink: 0 }}>BCC</span>
                    <input value={compBcc} onChange={e => setCompBcc(e.target.value)} placeholder="Copias ocultas"
                      className="flex-1 outline-none"
                      style={{ fontSize: 13, color: G.text, background: "transparent", border: "none", padding: "9px 0" }} />
                  </div>
                </>
              )}

              {/* Asunto */}
              <div className="flex items-center border-b px-4" style={{ borderColor: G.border }}>
                <input value={compSubject} onChange={e => setCompSubject(e.target.value)} placeholder="Asunto"
                  className="flex-1 outline-none"
                  style={{ fontSize: 13, color: G.text, background: "transparent", border: "none", padding: "9px 0" }} />
              </div>

              {/* Toolbar formato enriquecido */}
              {richFormat && (
                <div className="flex items-center gap-1 px-4 py-1.5 border-b flex-shrink-0"
                  style={{ borderColor: G.border, background: "rgba(0,0,0,0.12)" }}>
                  {[
                    { icon: Bold, title: "Negrita", tag: "**" },
                    { icon: Italic, title: "Cursiva", tag: "_" },
                    { icon: Underline, title: "Subrayado", tag: "__" },
                    { icon: List, title: "Lista", tag: "\n- " },
                    { icon: AlignLeft, title: "Citar", tag: "\n> " },
                  ].map(btn => (
                    <button key={btn.title}
                      onClick={() => setCompBody(b => b + btn.tag)}
                      className="p-1.5 rounded transition-colors"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")} title={btn.title}>
                      <btn.icon style={{ width: 13, height: 13, color: G.secondary }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Body */}
              <textarea value={compBody} onChange={e => setCompBody(e.target.value)}
                placeholder="Escribe tu mensaje…"
                className="flex-1 outline-none resize-none px-4 py-3"
                style={{ fontSize: 13, color: G.text, background: "transparent", border: "none" }} />

              {/* Firma preview */}
              {firma && (
                <div className="px-4 pb-2 border-t" style={{ borderColor: G.border }}>
                  <p style={{ fontSize: 11, color: G.secondary }}>— {firma}</p>
                </div>
              )}

              {/* Footer toolbar */}
              <div className="flex items-center gap-2 px-4 py-2 flex-shrink-0 flex-wrap" style={{ borderTop: `1px solid ${G.border}`, rowGap: 4 }}>
                <button onClick={enviarCorreo} disabled={enviando || !compTo.trim() || !compSubject.trim()}
                  className="flex items-center gap-2 px-5 py-1.5 rounded-full disabled:opacity-50"
                  style={{ background: G.blue, color: "#0A1929", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none" }}>
                  {enviando && <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" />}
                  Enviar
                </button>

                {/* Plantillas */}
                <div className="relative">
                  <button onClick={() => setShowTemplates(p => !p)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${G.border}`, color: G.secondary, fontSize: 12, cursor: "pointer" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}>
                    <AlignLeft style={{ width: 12, height: 12 }} /> Plantillas
                  </button>
                  {showTemplates && (
                    <div className="absolute bottom-full mb-1 left-0 rounded-lg overflow-hidden z-20"
                      style={{ background: "#0D1F38", border: `1px solid ${G.border}`, minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.40)" }}>
                      {QUICK_TEMPLATES.map(t => (
                        <button key={t.label}
                          onClick={() => { setCompBody(b => b + (b ? "\n\n" : "") + t.text); setShowTemplates(false); }}
                          className="w-full text-left px-4 py-2"
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: G.text }}
                          onMouseEnter={ev => ((ev.currentTarget as HTMLElement).style.background = G.hover)}
                          onMouseLeave={ev => ((ev.currentTarget as HTMLElement).style.background = "none")}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formato enriquecido toggle */}
                <button onClick={() => setRichFormat(p => !p)}
                  className="p-1.5 rounded"
                  style={{ background: richFormat ? "rgba(123,182,255,0.15)" : "none", border: "none", cursor: "pointer" }}
                  title="Formato de texto">
                  <Bold style={{ width: 13, height: 13, color: richFormat ? G.blue : G.secondary }} />
                </button>

                {/* Acuse de recibo */}
                <button onClick={() => setReadReceipt(p => !p)}
                  className="p-1.5 rounded"
                  style={{ background: readReceipt ? "rgba(244,180,0,0.15)" : "none", border: "none", cursor: "pointer" }}
                  title="Solicitar acuse de recibo">
                  <Check style={{ width: 13, height: 13, color: readReceipt ? "#F4B400" : G.secondary }} />
                </button>

                <div className="flex-1" />
                <button onClick={() => setConfirmState({ open: true, msg: "¿Descartar este borrador?", onOk: () => { setComposeOpen(false); setCompTo(""); setCompSubject(""); setCompBody(""); setCompCc(""); setCompBcc(""); } })}
                  className="p-1.5 rounded-full"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "rgba(255,80,60,0.12)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")} title="Descartar">
                  <Trash2 style={{ width: 15, height: 15, color: G.secondary }} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODAL RECORDATORIO ── */}
      {reminderOpen && reminderEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setReminderOpen(false)}>
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: "#0D1F38", border: `1px solid ${G.border}`, width: 360, boxShadow: "0 16px 48px rgba(0,0,0,0.50)" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: G.text }}>Recordatorio de seguimiento</h3>
            <p style={{ fontSize: 13, color: G.secondary, marginTop: -8 }} className="truncate">
              {reminderEmail.subject || "(sin asunto)"}
            </p>
            <div className="flex flex-col gap-1">
              <label style={{ fontSize: 12, color: G.secondary }}>Fecha y hora</label>
              <input type="datetime-local" value={reminderDate} onChange={e => setReminderDate(e.target.value)}
                className="outline-none rounded-lg px-3 py-2"
                style={{ fontSize: 13, background: "rgba(145,175,225,0.10)", border: `1px solid ${G.border}`, color: G.text }} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReminderOpen(false)}
                style={{ fontSize: 13, color: G.secondary, background: "none", border: `1px solid ${G.border}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => {
                if (reminderDate && reminderEmail) {
                  setReminders(p => ({ ...p, [reminderEmail.uid]: reminderDate }));
                  flash("ok", `Recordatorio guardado para ${new Date(reminderDate).toLocaleString("es-MX")}`);
                }
                setReminderOpen(false);
              }}
                style={{ fontSize: 13, fontWeight: 600, color: "#0A1929", background: G.blue, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FIRMA ── */}
      {showFirmaConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setShowFirmaConfig(false)}>
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: "#0D1F38", border: `1px solid ${G.border}`, width: 420, boxShadow: "0 16px 48px rgba(0,0,0,0.50)" }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: G.text }}>Configurar firma</h3>
            <textarea value={firmaEdit} onChange={e => setFirmaEdit(e.target.value)}
              placeholder={"Ej: Juan Viveros\nGerente Avante\nTel: 449-000-0000"}
              rows={4} className="outline-none resize-none rounded-lg px-3 py-2"
              style={{ fontSize: 13, background: "rgba(145,175,225,0.10)", border: `1px solid ${G.border}`, color: G.text }} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setFirma(""); setShowFirmaConfig(false); flash("ok", "Firma eliminada"); }}
                style={{ fontSize: 13, color: "#FF6B6B", background: "none", border: "none", cursor: "pointer" }}>
                Eliminar firma
              </button>
              <button onClick={() => setShowFirmaConfig(false)}
                style={{ fontSize: 13, color: G.secondary, background: "none", border: `1px solid ${G.border}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
                Cancelar
              </button>
              <button onClick={() => { setFirma(firmaEdit); setShowFirmaConfig(false); flash("ok", "Firma guardada"); }}
                style={{ fontSize: 13, fontWeight: 600, color: "#0A1929", background: G.blue, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer" }}>
                Guardar
              </button>
            </div>
          </div>
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
