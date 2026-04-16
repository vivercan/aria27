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
  Link2, Image, Clock, FileDown, Hash, Table2, Languages,
  UserSearch, Save, ListOrdered, Type,
} from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import ConfirmModal from "@/components/ConfirmModal";
import { useFlashMessage } from "@/lib/use-flash-message";
import AriaBackButton from "@/components/AriaBackButton";

/* ─────────────── TIPOS ─────────────── */
interface EmailHeader {
  seqno: number; uid: number;
  from: string;  to: string;
  subject: string; date: string;
  seen: boolean; flags: string[];
  size?: number; hasAttach?: boolean;
}
interface Draft {
  id: string; to: string; cc: string; bcc: string;
  subject: string; body: string; savedAt: string;
}

type Vista   = "lista" | "leer";
type Carpeta = "INBOX" | "Sent" | "Spam" | "Trash" | string;
type Filtro  = "todos" | "sinleer" | "destacados" | "flagged";
type SortBy  = "date" | "from" | "subject";
type SortDir = "asc" | "desc";
type Category = { label: string; color: string };

const CARPETAS_SISTEMA: { key: Carpeta; label: string; icon: React.ElementType }[] = [
  { key: "INBOX", label: "Recibidos", icon: InboxIcon },
  { key: "Sent",  label: "Enviados",  icon: Send },
  { key: "Spam",  label: "Spam",      icon: ShieldOff },
  { key: "Trash", label: "Eliminados",icon: Trash2 },
];

const CATEGORIES: Category[] = [
  { label: "Trabajo",  color: "#E53935" },
  { label: "Personal", color: "#1E88E5" },
  { label: "Urgente",  color: "#FB8C00" },
  { label: "Factura",  color: "#43A047" },
  { label: "Proyecto", color: "#8E24AA" },
];

const FONTS   = ["Arial","Calibri","Georgia","Times New Roman","Courier New","Verdana"];
const SIZES   = [10,11,12,13,14,16,18,20,24];
const COLORS  = ["#E8F0FA","#FF6B6B","#FFD60A","#4CAF50","#7BB6FF","#E91E63","#FF9800","#A0A0A0"];
const QUICK_TEMPLATES = [
  { label: "Confirmado ✓",  text: "Confirmado, muchas gracias." },
  { label: "En proceso…",   text: "Recibido, lo atendemos a la brevedad." },
  { label: "Necesito info", text: "¿Podrías proporcionarme más información al respecto?" },
  { label: "Agendado",      text: "Perfecto, queda agendado. ¡Hasta entonces!" },
];

/* ─────────────── HELPERS ─────────────── */
function fechaCorta(s: string) {
  try {
    const d = new Date(s); const hoy = new Date();
    const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === hoy.toDateString()) return hora;
    return `${d.toLocaleDateString("es-MX",{ day:"numeric",month:"short" })} · ${hora}`;
  } catch { return s; }
}
function fechaLarga(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleDateString("es-MX",{ day:"numeric",month:"long",year:"numeric" }) +
      " " + d.toLocaleTimeString("es-MX",{ hour:"2-digit",minute:"2-digit" });
  } catch { return s; }
}
function nombreCorto(raw: string) {
  if (!raw) return "—";
  const m = raw.match(/^"?([^"<]+)"?\s*</);
  return m ? m[1].trim() : raw.replace(/<.*>/,"").trim() || raw;
}
function emailAddr(raw: string) { return raw.match(/<(.+?)>/)?.[1] || raw.trim(); }
function hasAttachment(em: EmailHeader) {
  return em.hasAttach === true ||
    (em.flags||[]).some(f => f.toLowerCase().includes("attach")) ||
    (em.subject||"").toLowerCase().includes("[adj");
}
function pesoLegible(bytes?: number) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1048576)     return `${(bytes/1024).toFixed(0)} KB`;
  return `${(bytes/1048576).toFixed(1)} MB`;
}
const AVATAR_COLORS = ["#1A73E8","#E91E63","#9C27B0","#FF5722","#4CAF50","#FF9800","#00BCD4","#E53935"];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function insertAtCursor(el: HTMLTextAreaElement|null, text: string, setter: (v:string)=>void, current: string) {
  if (!el) { setter(current + text); return; }
  const s = el.selectionStart; const e = el.selectionEnd;
  const next = current.slice(0,s) + text + current.slice(e);
  setter(next);
  requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = s + text.length; el.focus(); });
}

const CACHE_KEY      = (f: string) => `aria27_inbox_${f}`;
const DRAFT_KEY      = "aria27_drafts";
const AUTO_MS        = 2 * 60 * 1000;

/* ══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function InboxPage() {
  const { msg, flash } = useFlashMessage();
  const [confirmState, setConfirmState] = useState<{ open:boolean; msg:string; onOk:()=>void }>({ open:false,msg:"",onOk:()=>{} });

  /* ── core ── */
  const [vista,         setVista]         = useState<Vista>("lista");
  const [carpeta,       setCarpeta]       = useState<Carpeta>("INBOX");
  const [emails,        setEmails]        = useState<EmailHeader[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState("");
  const [lastUpdate,    setLastUpdate]    = useState<Date|null>(null);
  const [filtro,        setFiltro]        = useState<Filtro>("todos");
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [starred,       setStarred]       = useState<Set<number>>(new Set());
  const [flagged,       setFlagged]       = useState<Set<number>>(new Set());
  const [limite,        setLimite]        = useState(40);
  const [copiedAddr,    setCopiedAddr]    = useState("");
  const [toastMsg,      setToastMsg]      = useState("");
  const prevCountRef = useRef<number>(0);
  const intervalRef  = useRef<ReturnType<typeof setInterval>|null>(null);

  /* ── búsqueda ── */
  const [busqueda,   setBusqueda]   = useState("");
  const [showSearch, setShowSearch] = useState(true);
  const [advSearch,  setAdvSearch]  = useState(false);
  const [advDe,      setAdvDe]      = useState("");
  const [advPara,    setAdvPara]    = useState("");
  const [advAsunto,  setAdvAsunto]  = useState("");
  const [advFecha,   setAdvFecha]   = useState("");
  const [senderFilter, setSenderFilter] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── sort ── */
  const [sortBy,  setSortBy]  = useState<SortBy>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* ── vista ── */
  const [splitView, setSplitView] = useState(false);
  const [compacto,  setCompacto]  = useState(false);

  /* ── categorías ── */
  const [emailCats,  setEmailCats]  = useState<Record<number,string>>({});
  const [catMenuUid, setCatMenuUid] = useState<number|null>(null);

  /* ── carpetas personalizadas ── */
  const [carpetasCustom,  setCarpetasCustom]  = useState<string[]>([]);
  const [newCarpetaName,  setNewCarpetaName]  = useState("");
  const [showNewCarpeta,  setShowNewCarpeta]  = useState(false);

  /* ── firma ── */
  const [firma,          setFirma]          = useState("");
  const [showFirmaConfig,setShowFirmaConfig] = useState(false);
  const [firmaEdit,      setFirmaEdit]       = useState("");

  /* ── borradores ── */
  const [drafts, setDrafts] = useState<Draft[]>([]);
  useEffect(() => {
    try {
      const d = sessionStorage.getItem(DRAFT_KEY);
      if (d) setDrafts(JSON.parse(d));
    } catch { /* ok */ }
  }, []);
  const saveDraftToStorage = (list: Draft[]) => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(list)); } catch { /* ok */ }
  };

  /* ── lectura ── */
  const [emailActual,    setEmailActual]    = useState<EmailHeader|null>(null);
  const [cuerpo,         setCuerpo]         = useState({ body:"", html:"" });
  const [cargandoCuerpo, setCargandoCuerpo] = useState(false);
  const [zoom,           setZoom]           = useState(100);
  const [inlineReply,    setInlineReply]    = useState("");
  const [showInlineReply,setShowInlineReply]= useState(false);
  const [translating,    setTranslating]    = useState(false);
  const [translated,     setTranslated]     = useState("");

  /* ── compose ── */
  const [composeOpen,    setComposeOpen]    = useState(false);
  const [compMinimized,  setCompMinimized]  = useState(false);
  const [compTo,         setCompTo]         = useState("");
  const [compCc,         setCompCc]         = useState("");
  const [compBcc,        setCompBcc]        = useState("");
  const [compSubject,    setCompSubject]    = useState("");
  const [compBody,       setCompBody]       = useState("");
  const [enviando,       setEnviando]       = useState(false);
  const [showCcBcc,      setShowCcBcc]      = useState(false);
  const [readReceipt,    setReadReceipt]    = useState(false);
  const [richFormat,     setRichFormat]     = useState(false);
  const [showTemplates,  setShowTemplates]  = useState(false);
  const [selectDropdown, setSelectDropdown] = useState(false);
  const [compFiles,      setCompFiles]      = useState<File[]>([]);
  const [compFont,       setCompFont]       = useState("Arial");
  const [compFontSize,   setCompFontSize]   = useState(13);
  const [compTextColor,  setCompTextColor]  = useState("#E8F0FA");
  const [scheduledDate,  setScheduledDate]  = useState("");
  const [showSchedule,   setShowSchedule]   = useState(false);
  const [showLinkModal,  setShowLinkModal]  = useState(false);
  const [linkText,       setLinkText]       = useState("");
  const [linkUrl,        setLinkUrl]        = useState("");
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows,      setTableRows]      = useState(3);
  const [tableCols,      setTableCols]      = useState(3);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const imageInputRef  = useRef<HTMLInputElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  /* ── modales auxiliares ── */
  const [reminderOpen,  setReminderOpen]  = useState(false);
  const [reminderEmail, setReminderEmail] = useState<EmailHeader|null>(null);
  const [reminderDate,  setReminderDate]  = useState("");
  const [reminders,     setReminders]     = useState<Record<number,string>>({});

  /* ─── cargar emails ─── */
  const cargarEmails = useCallback(async (silencioso=false, lim=limite) => {
    if (!silencioso) setLoading(true); else setRefreshing(true);
    setError("");
    try {
      const r    = await fetch("/api/mail/inbox",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ folder:carpeta, limit:lim }) });
      const data = await r.json().catch(()=>({}));
      if (r.status===401){ setError("Credenciales no configuradas. Verifica ZOHO_EMAIL y ZOHO_PASSWORD."); }
      else if (!r.ok){ throw new Error(data.error||"Error al conectar"); }
      else {
        const lista:EmailHeader[] = data.emails||[];
        if (silencioso && lista.length > prevCountRef.current && prevCountRef.current>0){
          const n = lista.length - prevCountRef.current;
          setToastMsg(`${n} correo${n>1?"s":""} nuevo${n>1?"s":""}`);
          setTimeout(()=>setToastMsg(""),4000);
        }
        prevCountRef.current = lista.length;
        setEmails(lista); setSeleccionados(new Set()); setLastUpdate(new Date());
        try { sessionStorage.setItem(CACHE_KEY(carpeta), JSON.stringify({emails:lista,at:new Date().toISOString()})); } catch { /* ok */ }
      }
    } catch(e:unknown){ setError((e as Error).message||"Error de conexión"); }
    if (!silencioso) setLoading(false); else setRefreshing(false);
  }, [carpeta, limite]);

  useEffect(()=>{
    try {
      const c = sessionStorage.getItem(CACHE_KEY(carpeta));
      if (c){ const {emails:d}=JSON.parse(c); if(Array.isArray(d)&&d.length>0){setEmails(d);setLoading(false);} }
    } catch { /* ok */ }
    cargarEmails(emails.length>0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[carpeta]);

  useEffect(()=>{
    if (vista!=="lista") return;
    intervalRef.current = setInterval(()=>cargarEmails(true), AUTO_MS);
    return ()=>{ if(intervalRef.current) clearInterval(intervalRef.current); };
  },[vista, cargarEmails]);

  useEffect(()=>{ cargarEmails(false); /* eslint-disable-next-line */ },[]);

  /* ─── abrir email ─── */
  const abrirEmail = async (em: EmailHeader) => {
    setEmailActual(em); setTranslated(""); setShowInlineReply(false); setInlineReply("");
    if (!splitView) setVista("leer");
    setCargandoCuerpo(true);
    setEmails(prev => prev.map(e => e.uid===em.uid ? {...e,seen:true} : e));
    try {
      const r    = await fetch("/api/mail/fetch",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({uid:em.uid,folder:carpeta}) });
      const data = await r.json().catch(()=>({}));
      setCuerpo({ body:data.body||"", html:data.html||"" });
    } catch { setCuerpo({body:"Error al cargar contenido",html:""}); }
    setCargandoCuerpo(false);
  };

  /* ─── eliminar ─── */
  const eliminarSeleccionados = () => {
    if (!seleccionados.size) return;
    setConfirmState({ open:true, msg:`¿Eliminar ${seleccionados.size} correo(s)?`, onOk:async()=>{
      try {
        const uids = emails.filter(e=>seleccionados.has(e.seqno)).map(e=>e.seqno);
        await fetch("/api/mail/delete",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({uids,folder:carpeta}) });
        cargarEmails(false);
      } catch(e:unknown){ setError((e as Error).message); }
    }});
  };
  const eliminarEmail = (em: EmailHeader) => {
    setConfirmState({ open:true, msg:"¿Eliminar este correo?", onOk:async()=>{
      await fetch("/api/mail/delete",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({uids:[em.seqno],folder:carpeta}) });
      if (!splitView) setVista("lista");
      setEmailActual(null); cargarEmails(false);
    }});
  };

  /* ─── spam ─── */
  const marcarSpam = (em: EmailHeader) => {
    setConfirmState({ open:true, msg:`¿Mover "${em.subject||"(sin asunto)"}" a Spam?`, onOk:async()=>{
      await fetch("/api/mail/delete",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({uids:[em.seqno],folder:carpeta}) });
      flash("ok","Movido a Spam"); cargarEmails(false);
      if (emailActual?.uid===em.uid){ setEmailActual(null); if(!splitView) setVista("lista"); }
    }});
  };

  /* ─── enviar ─── */
  const enviarCorreo = async () => {
    if (!compTo.trim()||!compSubject.trim()) return;
    if (scheduledDate){ flash("ok",`Envío programado para ${new Date(scheduledDate).toLocaleString("es-MX")}`); setComposeOpen(false); return; }
    setEnviando(true);
    try {
      const bodyFinal = firma ? compBody+"\n\n--\n"+firma : compBody;
      const fd = new FormData();
      fd.append("to", compTo.trim()); fd.append("subject", compSubject.trim()); fd.append("body", bodyFinal);
      if (compCc.trim())  fd.append("cc",  compCc.trim());
      if (compBcc.trim()) fd.append("bcc", compBcc.trim());
      compFiles.forEach(f => fd.append("attachments", f));
      const r = await fetch("/api/mail/send",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ to:compTo.trim(), cc:compCc.trim()||undefined, bcc:compBcc.trim()||undefined, subject:compSubject.trim(), body:bodyFinal, readReceipt }) });
      const data = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(data.error||"Error al enviar");
      setCompTo(""); setCompCc(""); setCompBcc(""); setCompSubject(""); setCompBody("");
      setCompFiles([]); setComposeOpen(false); setShowCcBcc(false); setReadReceipt(false); setScheduledDate("");
      cargarEmails(false); flash("ok","Correo enviado correctamente");
    } catch(e:unknown){ flash("err","Error: "+(e as Error).message); }
    setEnviando(false);
  };

  /* ─── guardar borrador ─── */
  const guardarBorrador = () => {
    const d: Draft = { id: Date.now().toString(), to:compTo, cc:compCc, bcc:compBcc, subject:compSubject, body:compBody, savedAt:new Date().toISOString() };
    const next = [...drafts, d];
    setDrafts(next); saveDraftToStorage(next);
    flash("ok","Borrador guardado"); setComposeOpen(false);
  };

  /* ─── abrir borrador ─── */
  const abrirBorrador = (d: Draft) => {
    setCompTo(d.to); setCompCc(d.cc); setCompBcc(d.bcc); setCompSubject(d.subject); setCompBody(d.body);
    setComposeOpen(true); setCompMinimized(false);
    const next = drafts.filter(x=>x.id!==d.id);
    setDrafts(next); saveDraftToStorage(next);
  };

  /* ─── acciones compose ─── */
  const responder = useCallback(()=>{
    if (!emailActual) return;
    setCompTo(emailAddr(emailActual.from)); setCompCc(""); setCompBcc("");
    setCompSubject(`Re: ${emailActual.subject||""}`);
    setCompBody(`\n\n--- Mensaje original ---\nDe: ${emailActual.from}\nFecha: ${emailActual.date}\n\n${cuerpo.body||""}`);
    setComposeOpen(true); setCompMinimized(false);
  },[emailActual,cuerpo]);

  const responderATodos = useCallback(()=>{
    if (!emailActual) return;
    setCompTo([emailAddr(emailActual.from), emailActual.to?emailAddr(emailActual.to):""].filter(Boolean).join(", "));
    setCompCc(""); setCompBcc("");
    setCompSubject(`Re: ${emailActual.subject||""}`);
    setCompBody(`\n\n--- Mensaje original ---\nDe: ${emailActual.from}\nPara: ${emailActual.to}\nFecha: ${emailActual.date}\n\n${cuerpo.body||""}`);
    setComposeOpen(true); setCompMinimized(false);
  },[emailActual,cuerpo]);

  const reenviar = useCallback(()=>{
    if (!emailActual) return;
    setCompTo(""); setCompCc(""); setCompBcc("");
    setCompSubject(`Fwd: ${emailActual.subject||""}`);
    setCompBody(`\n\n--- Mensaje reenviado ---\nDe: ${emailActual.from}\nFecha: ${emailActual.date}\nAsunto: ${emailActual.subject||""}\n\n${cuerpo.body||""}`);
    setComposeOpen(true); setCompMinimized(false);
  },[emailActual,cuerpo]);

  const toggleLeido = useCallback(()=>{
    if (!emailActual) return;
    setEmails(prev=>prev.map(e=>e.uid===emailActual.uid?{...e,seen:!e.seen}:e));
    setEmailActual(prev=>prev?{...prev,seen:!prev.seen}:prev);
  },[emailActual]);

  /* ─── respuesta inline ─── */
  const enviarInlineReply = async () => {
    if (!emailActual||!inlineReply.trim()) return;
    try {
      const r = await fetch("/api/mail/send",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ to:emailAddr(emailActual.from), subject:`Re: ${emailActual.subject||""}`, body:inlineReply }) });
      if (!r.ok) throw new Error();
      flash("ok","Respuesta enviada"); setInlineReply(""); setShowInlineReply(false);
    } catch { flash("err","Error al responder"); }
  };

  /* ─── traducir ─── */
  const traducirEmail = async () => {
    if (!cuerpo.body && !cuerpo.html) return;
    setTranslating(true);
    try {
      const texto = cuerpo.body || cuerpo.html.replace(/<[^>]+>/g,"");
      const r = await fetch("https://libretranslate.com/translate",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ q:texto.slice(0,2000), source:"auto", target:"es", format:"text" }) });
      if (r.ok) { const d = await r.json(); setTranslated(d.translatedText||""); }
      else setTranslated("(Traducción no disponible sin API key de LibreTranslate)");
    } catch { setTranslated("(Servicio de traducción no disponible)"); }
    setTranslating(false);
  };

  /* ─── exportar PDF ─── */
  const exportarPDF = () => {
    const win = window.open("","_blank");
    if (!win) return;
    win.document.write(`<html><head><title>${emailActual?.subject||"Correo"}</title><style>body{font-family:Arial;padding:24px;max-width:800px;margin:0 auto}h1{font-size:20px}pre{white-space:pre-wrap;font-family:inherit;line-height:1.6}</style></head><body><h1>${emailActual?.subject||"(sin asunto)"}</h1><p><b>De:</b> ${emailActual?.from||""}<br><b>Para:</b> ${emailActual?.to||""}<br><b>Fecha:</b> ${emailActual?.date?fechaLarga(emailActual.date):""}</p><hr><pre>${cuerpo.body||""}</pre></body></html>`);
    win.document.close();
    win.print();
  };

  /* ─── insertar tabla en compose ─── */
  const insertarTabla = () => {
    const sep = " | ";
    const header = Array.from({length:tableCols},(_:unknown,i:number)=>`Col${i+1}`).join(sep);
    const divider = Array.from({length:tableCols},()=>"---").join(sep);
    const row     = Array.from({length:tableCols},()=>"    ").join(sep);
    const tabla = "\n" + header + "\n" + divider + "\n" + Array.from({length:tableRows-1},()=>row).join("\n") + "\n";
    insertAtCursor(textareaRef.current, tabla, setCompBody, compBody);
    setShowTableModal(false);
  };

  /* ─── insertar hipervínculo ─── */
  const insertarLink = () => {
    const texto = linkText || linkUrl;
    insertAtCursor(textareaRef.current, `[${texto}](${linkUrl})`, setCompBody, compBody);
    setLinkText(""); setLinkUrl(""); setShowLinkModal(false);
  };

  /* ─── filtrar por remitente ─── */
  const filtrarPorRemitente = (raw: string) => {
    const addr = emailAddr(raw);
    setSenderFilter(addr); setAdvDe(addr); setAdvSearch(true); setShowSearch(true);
    flash("ok", `Filtrando correos de ${addr}`);
  };

  /* ─── sort ─── */
  const handleSort = (col: SortBy) => {
    if (sortBy===col) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortBy(col); setSortDir(col==="date"?"desc":"asc"); }
  };

  /* ─── atajos ─── */
  useEffect(()=>{
    const h = (e:KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName==="INPUT"||t.tagName==="TEXTAREA") return;
      switch(e.key){
        case "c": case "C":
          if (!composeOpen){ setCompTo(""); setCompSubject(""); setCompBody(""); setCompCc(""); setCompBcc(""); setComposeOpen(true); setCompMinimized(false); }
          break;
        case "r": case "R":
          if (emailActual) responder();
          break;
        case "f": case "F":
          if (!composeOpen){ setShowSearch(true); setTimeout(()=>searchInputRef.current?.focus(),100); }
          break;
        case "Escape":
          if (composeOpen) setComposeOpen(false);
          else if (advSearch) setAdvSearch(false);
          else if (senderFilter){ setSenderFilter(""); setAdvDe(""); }
          else if (vista==="leer"&&!splitView){ setVista("lista"); setEmailActual(null); }
          break;
        case "+": case "=": setZoom(z=>Math.min(z+10,150)); break;
        case "-":           setZoom(z=>Math.max(z-10,70));  break;
      }
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[vista,composeOpen,emailActual,responder,advSearch,splitView,senderFilter]);

  /* ─── filtros ─── */
  const emailsFiltrados = emails.filter(e=>{
    const q = busqueda.toLowerCase();
    const ms = !busqueda.trim()||(e.subject||"").toLowerCase().includes(q)||(e.from||"").toLowerCase().includes(q)||(e.to||"").toLowerCase().includes(q);
    const ma = (!advDe||((e.from||"").toLowerCase().includes(advDe.toLowerCase())))&&(!advPara||((e.to||"").toLowerCase().includes(advPara.toLowerCase())))&&(!advAsunto||((e.subject||"").toLowerCase().includes(advAsunto.toLowerCase())))&&(!advFecha||(e.date||"").includes(advFecha));
    const mf = filtro==="sinleer"?!e.seen:filtro==="destacados"?starred.has(e.seqno):filtro==="flagged"?flagged.has(e.seqno):true;
    return ms&&ma&&mf;
  });

  const emailsOrdenados = [...emailsFiltrados].sort((a,b)=>{
    let cmp = 0;
    if (sortBy==="date")    cmp = new Date(a.date).getTime()-new Date(b.date).getTime();
    else if (sortBy==="from")    cmp = nombreCorto(a.from).localeCompare(nombreCorto(b.from),"es");
    else if (sortBy==="subject") cmp = (a.subject||"").localeCompare(b.subject||"","es");
    return sortDir==="asc"?cmp:-cmp;
  });

  const unreadCount        = emails.filter(e=>!e.seen).length;
  const starredCount       = starred.size;
  const flaggedCount       = flagged.size;
  const todosSeleccionados = emailsFiltrados.length>0&&emailsFiltrados.every(e=>seleccionados.has(e.seqno));
  const algunosSeleccionados = seleccionados.size>0&&!todosSeleccionados;

  const toggleStar = (seqno:number,ev:React.MouseEvent)=>{ ev.stopPropagation(); setStarred(p=>{const n=new Set(p);n.has(seqno)?n.delete(seqno):n.add(seqno);return n;}); };
  const toggleFlag = (seqno:number,ev:React.MouseEvent)=>{ ev.stopPropagation(); setFlagged(p=>{const n=new Set(p);n.has(seqno)?n.delete(seqno):n.add(seqno);return n;}); };
  const toggleSel  = (seqno:number) => setSeleccionados(p=>{const n=new Set(p);n.has(seqno)?n.delete(seqno):n.add(seqno);return n;});
  const setCategory = (uid:number,label:string) => { setEmailCats(p=>({...p,[uid]:label})); setCatMenuUid(null); };

  const rowPy = compacto ? 5 : 9;

  /* ── palette: gris acero medio ── */
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
    errorBorder:"rgba(255,80,60,0.30)",
    sidebar:         "#0A1624",
    sidebarText:     "#E0ECF8",
    sidebarSecondary:"#7B9EC4",
    sidebarCard:     "#182435",
    sidebarBorder:   "rgba(145,175,225,0.12)",
    sidebarHover:    "rgba(123,182,255,0.10)",
    sidebarSelected: "rgba(123,182,255,0.18)",
  };

  /* ── sort icon ── */
  const SI = ({col}:{col:SortBy}) => sortBy!==col
    ? <ChevronsUpDown style={{width:11,height:11,opacity:0.35,marginLeft:3}}/>
    : sortDir==="asc"
      ? <ChevronUp   style={{width:11,height:11,color:G.blue,marginLeft:3}}/>
      : <ChevronDown style={{width:11,height:11,color:G.blue,marginLeft:3}}/>;

  const ColH = ({col,label,width}:{col:SortBy;label:string;width?:number|string}) => (
    <button onClick={()=>handleSort(col)} style={{ background:"none",border:"none",cursor:"pointer", color:sortBy===col?G.blue:G.secondary, fontSize:11,fontWeight:sortBy===col?700:500, letterSpacing:"0.04em",textTransform:"uppercase" as const, padding:"0 4px",width:width||"auto",flexShrink:0,userSelect:"none" as const, display:"flex",alignItems:"center" }}>
      {label}<SI col={col}/>
    </button>
  );

  /* ══════════════════════════════════════════════════════════════
     PANEL LEER
  ══════════════════════════════════════════════════════════════ */
  const PanelLeer = () => !emailActual ? (
    <div className="flex-1 flex items-center justify-center" style={{background:G.bg}}>
      <div className="flex flex-col items-center gap-3">
        <InboxIcon style={{width:48,height:48,color:"rgba(145,175,225,0.18)"}}/>
        <p style={{fontSize:14,color:G.secondary}}>Selecciona un correo para leerlo</p>
      </div>
    </div>
  ) : (
    <div className="flex-1 flex flex-col overflow-hidden" style={{background:G.bg}}>
      {/* Toolbar leer */}
      <div className="flex-shrink-0 flex items-center gap-1 px-3 py-2 border-b flex-wrap" style={{borderColor:G.border,background:G.card,rowGap:4}}>
        {!splitView&&(
          <button onClick={()=>{setVista("lista");setEmailActual(null);}} className="p-1.5 rounded-full"
            style={{background:"none",border:"none",cursor:"pointer"}}
            onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)")}
            onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="none")} title="Volver (Esc)">
            <ChevronLeft style={{width:19,height:19,color:G.secondary}}/>
          </button>
        )}
        {/* acciones icono */}
        {([
          { icon:Trash2,    title:"Eliminar",           fn:()=>eliminarEmail(emailActual), hov:"rgba(255,80,60,0.12)" },
          { icon:ShieldOff, title:"Spam",                fn:()=>marcarSpam(emailActual),   hov:"rgba(255,152,0,0.12)" },
          { icon:BookOpen,  title:emailActual.seen?"No leído":"Leído", fn:toggleLeido, hov:"rgba(255,255,255,0.07)" },
          { icon:Printer,   title:"Imprimir",            fn:()=>window.print(),            hov:"rgba(255,255,255,0.07)" },
          { icon:Bell,      title:reminders[emailActual.uid]?`Recuerdo: ${reminders[emailActual.uid]}`:"Recordatorio", fn:()=>{setReminderEmail(emailActual);setReminderOpen(true);}, hov:"rgba(255,255,255,0.07)" },
          { icon:FileDown,  title:"Exportar PDF",        fn:exportarPDF,                   hov:"rgba(255,255,255,0.07)" },
          { icon:Languages, title:"Traducir",            fn:traducirEmail,                 hov:"rgba(255,255,255,0.07)" },
        ] as {icon:React.ElementType;title:string;fn:()=>void;hov:string}[]).map(({icon:Icon,title,fn,hov})=>(
          <button key={title} onClick={fn} className="p-1.5 rounded-full" title={title}
            style={{background:"none",border:"none",cursor:"pointer"}}
            onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background=hov)}
            onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="none")}>
            <Icon style={{width:15,height:15,color:title==="Traducir"&&translating?G.blue:G.secondary}}/>
          </button>
        ))}
        {/* zoom */}
        <div className="flex items-center gap-1">
          <button onClick={()=>setZoom(z=>Math.max(z-10,70))} className="p-1.5 rounded-full"
            style={{background:"none",border:"none",cursor:"pointer"}}
            onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)")}
            onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="none")} title="Reducir">
            <ZoomOut style={{width:14,height:14,color:G.secondary}}/>
          </button>
          <span style={{fontSize:10,color:G.secondary,minWidth:30,textAlign:"center"}}>{zoom}%</span>
          <button onClick={()=>setZoom(z=>Math.min(z+10,150))} className="p-1.5 rounded-full"
            style={{background:"none",border:"none",cursor:"pointer"}}
            onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)")}
            onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="none")} title="Ampliar">
            <ZoomIn style={{width:14,height:14,color:G.secondary}}/>
          </button>
        </div>
        <div style={{width:1,height:20,background:G.border,margin:"0 2px"}}/>
        {/* responder / todos / reenviar */}
        {([
          {label:"Responder",fn:responder,icon:Reply,blue:true},
          {label:"A todos",fn:responderATodos,icon:CornerUpRight,blue:false},
          {label:"Reenviar",fn:reenviar,icon:Forward,blue:false},
        ]).map(({label,fn,icon:Icon,blue})=>(
          <button key={label} onClick={fn}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{background:blue?"rgba(123,182,255,0.12)":"rgba(255,255,255,0.06)",color:blue?G.blue:G.secondary,fontSize:12,fontWeight:500,border:blue?"none":`1px solid ${G.border}`,cursor:"pointer"}}
            onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background=blue?"rgba(123,182,255,0.22)":"rgba(255,255,255,0.10)")}
            onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background=blue?"rgba(123,182,255,0.12)":"rgba(255,255,255,0.06)")}>
            <Icon style={{width:12,height:12}}/> {label}
          </button>
        ))}
        {/* filtrar por remitente */}
        <button onClick={()=>filtrarPorRemitente(emailActual.from)}
          className="flex items-center gap-1 px-2 py-1 rounded-full"
          style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${G.border}`,color:G.secondary,fontSize:11,cursor:"pointer"}}
          onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.08)")}
          onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.04)")}
          title="Ver todos los correos de este remitente">
          <UserSearch style={{width:12,height:12}}/>
        </button>
      </div>

      {/* Cuerpo del email */}
      <div className="flex-1 overflow-auto px-5 py-4">
        <h2 style={{fontSize:splitView?17:22,fontWeight:400,color:G.text,marginBottom:14,lineHeight:1.3}}>
          {emailActual.subject||"(sin asunto)"}
          {hasAttachment(emailActual)&&<Paperclip style={{width:15,height:15,display:"inline",marginLeft:8,color:G.secondary,verticalAlign:"middle"}}/>}
          {emailCats[emailActual.uid]&&(
            <span style={{fontSize:11,background:(CATEGORIES.find(c=>c.label===emailCats[emailActual.uid])?.color||"#888")+"30",color:CATEGORIES.find(c=>c.label===emailCats[emailActual.uid])?.color,borderRadius:10,padding:"2px 8px",marginLeft:8,fontWeight:600,verticalAlign:"middle"}}>
              {emailCats[emailActual.uid]}
            </span>
          )}
        </h2>
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-semibold"
            style={{width:38,height:38,fontSize:14,background:avatarColor(nombreCorto(emailActual.from))}}>
            {(nombreCorto(emailActual.from)[0]||"?").toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{fontSize:14,fontWeight:600,color:G.text}}>{nombreCorto(emailActual.from)}</span>
              <button onClick={()=>copiarRemitente(emailAddr(emailActual.from))}
                style={{background:"none",border:"none",cursor:"pointer",color:G.secondary,fontSize:12,display:"flex",alignItems:"center",gap:3}}>
                {copiedAddr===emailAddr(emailActual.from)
                  ? <><Check style={{width:11,height:11,color:"#4CAF50"}}/><span style={{color:"#4CAF50"}}>copiado</span></>
                  : <><Copy style={{width:11,height:11}}/>&lt;{emailAddr(emailActual.from)}&gt;</>
                }
              </button>
            </div>
            <p style={{fontSize:12,color:G.secondary,marginTop:2}}>Para: {emailActual.to||"—"} · {fechaLarga(emailActual.date)}</p>
            {reminders[emailActual.uid]&&<p style={{fontSize:11,color:G.blue}}>🔔 Recordatorio: {new Date(reminders[emailActual.uid]).toLocaleString("es-MX")}</p>}
          </div>
        </div>

        {/* Body */}
        <div className="rounded-xl overflow-hidden" style={{background:G.card,border:`1px solid ${G.border}`,padding:"20px 24px"}}>
          {cargandoCuerpo ? (
            <div className="flex justify-center py-8"><Loader2 style={{width:24,height:24,color:G.blue}} className="animate-spin"/></div>
          ) : translated ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span style={{fontSize:11,color:G.blue,background:"rgba(123,182,255,0.12)",borderRadius:10,padding:"2px 8px"}}>Traducido</span>
                <button onClick={()=>setTranslated("")} style={{fontSize:11,color:G.secondary,background:"none",border:"none",cursor:"pointer"}}>Ver original</button>
              </div>
              <pre style={{fontSize:`${zoom}%`,color:G.text,whiteSpace:"pre-wrap",lineHeight:1.7,fontFamily:"inherit"}}>{translated}</pre>
            </div>
          ) : cuerpo.html ? (
            <iframe srcDoc={cuerpo.html} className="w-full border-0" style={{minHeight:300}} sandbox="allow-same-origin" title="Email"/>
          ) : (
            <pre style={{fontSize:`${zoom}%`,color:G.text,whiteSpace:"pre-wrap",lineHeight:1.7,fontFamily:"inherit"}}>{cuerpo.body||"Sin contenido"}</pre>
          )}
        </div>

        {/* Respuesta inline */}
        <div className="mt-4">
          {!showInlineReply ? (
            <button onClick={()=>setShowInlineReply(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border"
              style={{borderColor:G.border,color:G.secondary,fontSize:12,background:"transparent",cursor:"pointer"}}
              onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background=G.hover)}
              onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="transparent")}>
              <Reply style={{width:13,height:13}}/> Responder aquí…
            </button>
          ) : (
            <div className="rounded-xl overflow-hidden border" style={{borderColor:G.border,background:G.card}}>
              <textarea value={inlineReply} onChange={e=>setInlineReply(e.target.value)}
                placeholder={`Responder a ${nombreCorto(emailActual.from)}…`}
                rows={3} className="w-full outline-none resize-none px-4 py-3"
                style={{fontSize:13,color:G.text,background:"transparent",border:"none"}}/>
              <div className="flex gap-2 px-4 py-2 border-t" style={{borderColor:G.border}}>
                <button onClick={enviarInlineReply}
                  className="px-4 py-1.5 rounded-full"
                  style={{background:G.blue,color:"#0A1929",fontSize:13,fontWeight:600,border:"none",cursor:"pointer"}}>
                  Enviar
                </button>
                <button onClick={()=>{setShowInlineReply(false);setInlineReply("");}}
                  style={{fontSize:12,color:G.secondary,background:"none",border:"none",cursor:"pointer"}}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={responder} className="flex items-center gap-2 px-5 py-2 rounded-full border"
            style={{borderColor:G.border,color:G.text,fontSize:13,background:"transparent",cursor:"pointer"}}
            onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background=G.hover)}
            onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="transparent")}>
            <Reply style={{width:13,height:13}}/> Responder
          </button>
          <button onClick={reenviar} className="flex items-center gap-2 px-5 py-2 rounded-full border"
            style={{borderColor:G.border,color:G.secondary,fontSize:13,background:"transparent",cursor:"pointer"}}
            onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background=G.hover)}
            onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="transparent")}>
            <Forward style={{width:13,height:13}}/> Reenviar
          </button>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="h-full flex overflow-hidden relative"
      style={{background:G.bg,fontFamily:"system-ui,-apple-system,Arial,sans-serif"}}>

      {/* Toast */}
      {toastMsg&&(
        <div className="fixed top-4 left-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full"
          style={{transform:"translateX(-50%)",background:G.blue,color:"#0A1929",fontSize:13,fontWeight:600,boxShadow:"0 4px 16px rgba(0,0,0,0.30)"}}>
          <Bell style={{width:13,height:13}}/> {toastMsg}
        </div>
      )}

      {/* Banner filtro activo */}
      {senderFilter&&(
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2 px-4 py-2 rounded-full"
          style={{background:"rgba(123,182,255,0.20)",border:`1px solid ${G.blue}`,color:G.blue,fontSize:12}}>
          <UserSearch style={{width:12,height:12}}/>
          {senderFilter}
          <button onClick={()=>{setSenderFilter("");setAdvDe("");}} style={{background:"none",border:"none",cursor:"pointer",color:G.secondary}}>
            <X style={{width:12,height:12}}/>
          </button>
        </div>
      )}

      {/* ═══ SIDEBAR ═══ */}
      <aside className="flex-shrink-0 flex flex-col pt-3 pb-2"
        style={{width:220,background:G.sidebar,boxShadow:"4px 0 20px rgba(0,0,0,0.22)",zIndex:1}}>

        {/* Redactar */}
        <div className="px-3 mb-3">
          <button onClick={()=>{setCompTo("");setCompSubject("");setCompBody("");setCompCc("");setCompBcc("");setComposeOpen(true);setCompMinimized(false);}}
            className="flex items-center gap-3 transition-all w-full"
            style={{background:G.sidebarCard,boxShadow:"0 1px 4px rgba(0,0,0,0.30)",border:`1px solid ${G.sidebarBorder}`,borderRadius:16,padding:"11px 16px",color:G.sidebarText,fontSize:14,fontWeight:500,cursor:"pointer",textAlign:"left"}}
            onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(123,182,255,0.15)")}
            onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background=G.sidebarCard)}>
            <PenSquare style={{width:17,height:17,color:"#7BB6FF"}}/> Redactar
            <span style={{marginLeft:"auto",fontSize:10,color:G.sidebarSecondary}}>c</span>
          </button>
        </div>

        {/* Carpetas sistema */}
        <nav className="flex flex-col gap-0.5">
          {CARPETAS_SISTEMA.map(({key,label,icon:Icon})=>{
            const count = key==="INBOX"?unreadCount:key==="Drafts"?drafts.length:0;
            return (
              <button key={key} onClick={()=>{setCarpeta(key);setVista("lista");setBusqueda("");setFiltro("todos");setEmailActual(null);}}
                className="flex items-center gap-3 py-2 transition-colors"
                style={{paddingLeft:16,paddingRight:16,background:carpeta===key?G.sidebarSelected:"transparent",color:carpeta===key?"#7BB6FF":G.sidebarSecondary,fontWeight:carpeta===key?700:400,fontSize:13,cursor:"pointer",border:"none",borderRadius:"0 24px 24px 0",textAlign:"left"}}>
                <Icon style={{width:15,height:15,flexShrink:0}}/> <span className="flex-1">{label}</span>
                {count>0&&<span style={{fontSize:11,fontWeight:700,color:"#7BB6FF"}}>{count}</span>}
              </button>
            );
          })}

          {/* Borradores */}
          <button onClick={()=>{/* mostrar borradores como overlay */ flash("ok",`${drafts.length} borrador(es) guardados`);}}
            className="flex items-center gap-3 py-2 transition-colors"
            style={{paddingLeft:16,paddingRight:16,background:"transparent",color:G.sidebarSecondary,fontSize:13,cursor:"pointer",border:"none",borderRadius:"0 24px 24px 0",textAlign:"left"}}>
            <Save style={{width:15,height:15,flexShrink:0}}/> <span className="flex-1">Borradores</span>
            {drafts.length>0&&<span style={{fontSize:11,fontWeight:700,color:G.blue}}>{drafts.length}</span>}
          </button>

          {/* Carpetas personalizadas */}
          {carpetasCustom.map(cp=>(
            <button key={cp} onClick={()=>{setCarpeta(cp);setVista("lista");setEmailActual(null);}}
              className="flex items-center gap-3 py-1.5 transition-colors"
              style={{paddingLeft:16,paddingRight:16,background:carpeta===cp?G.sidebarSelected:"transparent",color:carpeta===cp?"#7BB6FF":G.sidebarSecondary,fontSize:12,cursor:"pointer",border:"none",borderRadius:"0 24px 24px 0",textAlign:"left"}}>
              <FolderPlus style={{width:13,height:13,flexShrink:0}}/> <span className="flex-1 truncate">{cp}</span>
            </button>
          ))}
        </nav>

        {/* Nueva carpeta */}
        <div className="px-3 mt-1">
          {showNewCarpeta?(
            <div className="flex gap-1">
              <input value={newCarpetaName} onChange={e=>setNewCarpetaName(e.target.value)} placeholder="Nombre…" autoFocus
                onKeyDown={e=>{if(e.key==="Enter"&&newCarpetaName.trim()){setCarpetasCustom(p=>[...p,newCarpetaName.trim()]);setNewCarpetaName("");setShowNewCarpeta(false);}else if(e.key==="Escape")setShowNewCarpeta(false);}}
                className="flex-1 outline-none rounded px-2 py-1"
                style={{fontSize:12,background:G.sidebarCard,border:`1px solid ${G.sidebarBorder}`,color:G.sidebarText}}/>
              <button onClick={()=>setShowNewCarpeta(false)} style={{background:"none",border:"none",cursor:"pointer",color:G.sidebarSecondary}}><X style={{width:12,height:12}}/></button>
            </div>
          ):(
            <button onClick={()=>setShowNewCarpeta(true)} className="flex items-center gap-2 w-full"
              style={{background:"none",border:"none",cursor:"pointer",color:G.sidebarSecondary,fontSize:12,padding:"5px 0"}}
              onMouseEnter={e=>((e.currentTarget as HTMLElement).style.color=G.blue)}
              onMouseLeave={e=>((e.currentTarget as HTMLElement).style.color=G.sidebarSecondary)}>
              <FolderPlus style={{width:12,height:12}}/> Nueva carpeta
            </button>
          )}
        </div>

        <div style={{margin:"6px 0",height:1,background:G.sidebarBorder}}/>

        {/* Herramientas */}
        <div className="flex flex-col gap-0.5 px-2">
          {([
            {icon:SplitSquareHorizontal,label:"Panel dividido",    active:splitView,   fn:()=>setSplitView(p=>!p)},
            {icon:Layout,              label:compacto?"Vista cómoda":"Vista compacta",active:compacto,fn:()=>setCompacto(p=>!p)},
            {icon:Settings2,           label:"Configurar firma",  active:false,        fn:()=>{setFirmaEdit(firma);setShowFirmaConfig(true);}},
          ]).map(({icon:Icon,label,active,fn})=>(
            <button key={label} onClick={fn}
              className="flex items-center gap-2 py-1.5 px-3 rounded-lg transition-colors"
              style={{background:active?G.sidebarSelected:"none",border:"none",cursor:"pointer",color:active?"#7BB6FF":G.sidebarSecondary,fontSize:12,textAlign:"left"}}
              onMouseEnter={e=>!active&&((e.currentTarget as HTMLElement).style.background=G.sidebarHover)}
              onMouseLeave={e=>!active&&((e.currentTarget as HTMLElement).style.background="none")}>
              <Icon style={{width:13,height:13,flexShrink:0}}/> {label}
            </button>
          ))}
        </div>

        {/* Borradores pendientes */}
        {drafts.length>0&&(
          <div className="px-3 mt-2">
            <p style={{fontSize:10,color:G.sidebarSecondary,letterSpacing:"0.06em",marginBottom:4}}>BORRADORES</p>
            {drafts.slice(0,3).map(d=>(
              <button key={d.id} onClick={()=>abrirBorrador(d)}
                className="w-full text-left flex flex-col mb-1 px-2 py-1.5 rounded-lg"
                style={{background:G.sidebarCard,border:`1px solid ${G.sidebarBorder}`,cursor:"pointer"}}
                onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(123,182,255,0.10)")}
                onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background=G.sidebarCard)}>
                <span style={{fontSize:11,color:G.sidebarText,fontWeight:500}} className="truncate">{d.subject||"(sin asunto)"}</span>
                <span style={{fontSize:10,color:G.sidebarSecondary}}>{new Date(d.savedAt).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}</span>
              </button>
            ))}
          </div>
        )}

        {/* Atajos + hora */}
        <div className="px-4 pt-3 mt-auto" style={{borderTop:`1px solid ${G.sidebarBorder}`}}>
          <p style={{fontSize:10,color:G.sidebarSecondary,marginBottom:4,letterSpacing:"0.06em"}}>ATAJOS</p>
          {[{key:"c",desc:"Redactar"},{key:"f",desc:"Buscar"},{key:"r",desc:"Responder"},{key:"+/-",desc:"Zoom"},{key:"Esc",desc:"Volver"}].map(s=>(
            <div key={s.key} className="flex items-center gap-2 mb-1">
              <span style={{fontSize:10,background:G.sidebarCard,color:G.sidebarText,padding:"1px 5px",borderRadius:4,fontFamily:"monospace",border:`1px solid ${G.sidebarBorder}`}}>{s.key}</span>
              <span style={{fontSize:11,color:G.sidebarSecondary}}>{s.desc}</span>
            </div>
          ))}
          {lastUpdate&&(
            <p style={{fontSize:10,color:G.sidebarSecondary,marginTop:6}}>
              {lastUpdate.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"})}
              {refreshing&&<span style={{color:G.blue}}> · …</span>}
            </p>
          )}
        </div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* PANEL LISTA */}
        <div className="flex flex-col overflow-hidden"
          style={{width:splitView?430:"100%",flexShrink:0,borderRight:splitView?`1px solid ${G.border}`:"none"}}>

          <FlashBanner msg={msg} className="px-4 pt-2"/>

          {/* Barra búsqueda siempre visible */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b"
            style={{background:"rgba(0,0,0,0.10)",borderColor:G.border}}>
            <AriaBackButton href="/dashboard"/>

            {/* Búsqueda */}
            {showSearch&&(
              <div className="flex-1 relative" style={{maxWidth:580}}>
                <Search style={{width:14,height:14,position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:G.secondary}}/>
                <input ref={searchInputRef} value={busqueda} onChange={e=>setBusqueda(e.target.value)}
                  placeholder="Buscar correos… (De, Asunto, Para)"
                  className="w-full outline-none"
                  style={{background:"rgba(255,255,255,0.09)",border:`1px solid ${G.border}`,borderRadius:24,padding:"7px 36px",fontSize:13,color:G.text,transition:"background 0.15s"}}
                  onFocus={e=>((e.target as HTMLElement).style.background="rgba(255,255,255,0.14)")}
                  onBlur={e =>((e.target as HTMLElement).style.background="rgba(255,255,255,0.09)")}/>
                {busqueda&&(
                  <button onClick={()=>setBusqueda("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer"}}>
                    <X style={{width:12,height:12,color:G.secondary}}/>
                  </button>
                )}
              </div>
            )}

            {/* Botón buscar */}
            <button onClick={()=>{setShowSearch(p=>!p);setTimeout(()=>searchInputRef.current?.focus(),80);}}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
              style={{background:showSearch?"rgba(123,182,255,0.15)":"rgba(255,255,255,0.07)",border:`1px solid ${G.border}`,color:showSearch?G.blue:G.secondary,fontSize:12,cursor:"pointer"}}
              title="Buscar (f)">
              <Search style={{width:13,height:13}}/> Buscar
            </button>

            {/* Búsqueda avanzada */}
            <button onClick={()=>setAdvSearch(p=>!p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
              style={{background:advSearch?"rgba(123,182,255,0.15)":"rgba(255,255,255,0.07)",border:`1px solid ${G.border}`,color:advSearch?G.blue:G.secondary,fontSize:12,cursor:"pointer"}}
              title="Búsqueda avanzada">
              <Filter style={{width:13,height:13}}/> Avanzada
            </button>

            <button onClick={()=>cargarEmails(false)} disabled={loading} className="p-1.5 rounded-full"
              style={{background:"none",border:"none",cursor:"pointer"}}
              onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.07)")}
              onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="none")} title="Actualizar">
              {loading||refreshing
                ?<Loader2 style={{width:14,height:14,color:G.secondary}} className="animate-spin"/>
                :<RefreshCw style={{width:14,height:14,color:G.secondary}}/>}
            </button>
          </div>

          {/* Panel búsqueda avanzada */}
          {advSearch&&(
            <div className="flex-shrink-0 px-4 py-2 border-b grid grid-cols-2 gap-2"
              style={{background:"rgba(0,0,0,0.18)",borderColor:G.border}}>
              {([
                {label:"De:",       value:advDe,     set:setAdvDe},
                {label:"Para:",     value:advPara,   set:setAdvPara},
                {label:"Asunto:",   value:advAsunto, set:setAdvAsunto},
                {label:"Fecha:",    value:advFecha,  set:setAdvFecha,ph:"YYYY-MM"},
              ] as {label:string;value:string;set:(v:string)=>void;ph?:string}[]).map(f=>(
                <div key={f.label} className="flex items-center gap-2">
                  <span style={{fontSize:11,color:G.secondary,width:52,flexShrink:0}}>{f.label}</span>
                  <input value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph||""}
                    className="flex-1 outline-none rounded-lg px-2 py-1"
                    style={{fontSize:12,background:"rgba(255,255,255,0.08)",border:`1px solid ${G.border}`,color:G.text}}/>
                </div>
              ))}
              <div className="col-span-2 flex justify-end gap-3">
                <button onClick={()=>{setAdvDe("");setAdvPara("");setAdvAsunto("");setAdvFecha("");setSenderFilter("");}}
                  style={{fontSize:11,color:G.secondary,background:"none",border:"none",cursor:"pointer"}}>Limpiar</button>
                <button onClick={()=>setAdvSearch(false)}
                  style={{fontSize:11,color:G.secondary,background:"none",border:"none",cursor:"pointer"}}>Cerrar</button>
              </div>
            </div>
          )}

          {/* Filtros rápidos + select */}
          <div className="flex-shrink-0 flex items-center border-b"
            style={{background:"rgba(0,0,0,0.14)",borderColor:G.border}}>
            {([
              {key:"todos",      label:"Todos",      count:emails.length},
              {key:"sinleer",    label:"Sin leer",   count:unreadCount},
              {key:"destacados", label:"Destacados", count:starredCount},
              {key:"flagged",    label:"Pendientes", count:flaggedCount},
            ] as {key:Filtro;label:string;count:number}[]).map(f=>(
              <button key={f.key} onClick={()=>setFiltro(f.key)}
                className="flex items-center gap-1 px-4 py-2"
                style={{background:"none",border:"none",cursor:"pointer",color:filtro===f.key?G.blue:G.secondary,fontSize:12,fontWeight:filtro===f.key?600:400,borderBottom:filtro===f.key?`2px solid ${G.blue}`:"2px solid transparent"}}>
                {f.label}
                {f.count>0&&<span style={{fontSize:10,fontWeight:700,color:filtro===f.key?G.blue:G.secondary,background:"rgba(123,182,255,0.12)",borderRadius:10,padding:"1px 5px"}}>{f.count}</span>}
              </button>
            ))}
            <div className="flex-1"/>
            {/* Selector con botón visible */}
            <div className="relative flex items-center gap-2 px-3">
              <div className="relative">
                <button onClick={()=>setSelectDropdown(p=>!p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
                  style={{background:seleccionados.size>0?"rgba(123,182,255,0.18)":"rgba(255,255,255,0.07)",border:`1px solid ${seleccionados.size>0?G.blue:G.border}`,cursor:"pointer",color:seleccionados.size>0?G.blue:G.secondary,fontSize:12,fontWeight:seleccionados.size>0?600:400}}>
                  <input type="checkbox" checked={todosSeleccionados} onChange={()=>{}}
                    ref={el=>{if(el) el.indeterminate=algunosSeleccionados;}}
                    style={{width:13,height:13,accentColor:G.blue,cursor:"pointer",pointerEvents:"none",flexShrink:0}}/>
                  <span>{seleccionados.size>0?`${seleccionados.size} sel.`:"Seleccionar"}</span>
                  <ChevronDown style={{width:10,height:10}}/>
                </button>
                {selectDropdown&&(
                  <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-20"
                    style={{background:"#0D1F38",border:`1px solid ${G.border}`,minWidth:150,boxShadow:"0 8px 24px rgba(0,0,0,0.40)"}}>
                    {[
                      {label:"Todos",      fn:()=>setSeleccionados(new Set(emailsFiltrados.map(e=>e.seqno)))},
                      {label:"Ninguno",     fn:()=>setSeleccionados(new Set())},
                      {label:"Sin leer",    fn:()=>setSeleccionados(new Set(emailsFiltrados.filter(e=>!e.seen).map(e=>e.seqno)))},
                      {label:"Leídos",      fn:()=>setSeleccionados(new Set(emailsFiltrados.filter(e=>e.seen).map(e=>e.seqno)))},
                      {label:"Destacados",  fn:()=>setSeleccionados(new Set(emailsFiltrados.filter(e=>starred.has(e.seqno)).map(e=>e.seqno)))},
                    ].map(o=>(
                      <button key={o.label} onClick={()=>{o.fn();setSelectDropdown(false);}}
                        className="w-full text-left px-4 py-2"
                        style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:G.text}}
                        onMouseEnter={ev=>((ev.currentTarget as HTMLElement).style.background=G.hover)}
                        onMouseLeave={ev=>((ev.currentTarget as HTMLElement).style.background="none")}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {seleccionados.size>0&&(
                <button onClick={eliminarSeleccionados}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                  style={{background:"rgba(255,80,60,0.12)",border:"1px solid rgba(255,80,60,0.25)",color:"#FF6B6B",fontSize:12,cursor:"pointer"}}>
                  <Trash2 style={{width:12,height:12}}/> Eliminar
                </button>
              )}
              <span style={{fontSize:11,color:G.secondary,marginLeft:4}}>
                {emails.length} correo{emails.length!==1?"s":""}
                {unreadCount>0&&<span style={{color:G.blue,fontWeight:600}}> · {unreadCount} sin leer</span>}
              </span>
            </div>
          </div>

          {/* Cabeceras columnas */}
          <div className="flex-shrink-0 flex items-center px-3 py-1.5 border-b"
            style={{background:"rgba(0,0,0,0.18)",borderColor:G.border}}>
            {/* offset checkboxes + flags + avatar */}
            <div style={{width:14+4+13+4+13+4+26+6,flexShrink:0}}/>
            <ColH col="from"    label="De"      width={140}/>
            <ColH col="subject" label="Asunto"  width={260}/>
            <div className="flex-1"/>
            <ColH col="date"    label="Recibido · Tamaño" width={134}/>
          </div>

          {/* Error */}
          {error&&(
            <div className="mx-3 mt-2 flex items-start gap-3 rounded-lg p-3"
              style={{background:G.error,border:`1px solid ${G.errorBorder}`}}>
              <AlertTriangle style={{width:15,height:15,color:"#FF6B6B",flexShrink:0,marginTop:1}}/>
              <div className="flex-1">
                <p style={{fontSize:12,color:"#FF6B6B",fontWeight:500}}>Error de conexión</p>
                <p style={{fontSize:12,color:"#FF8C8C"}}>{error}</p>
              </div>
              <button onClick={()=>cargarEmails(false)} style={{fontSize:12,color:"#FF6B6B",textDecoration:"underline",cursor:"pointer",background:"none",border:"none"}}>Reintentar</button>
            </div>
          )}

          {/* Lista */}
          <div className="flex-1 overflow-auto" style={{background:G.bg}}
            onClick={()=>{setSelectDropdown(false);setCatMenuUid(null);}}>
            {loading&&emails.length===0?(
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 style={{width:28,height:28,color:G.blue}} className="animate-spin"/>
                <p style={{fontSize:13,color:G.secondary}}>Conectando con Zoho Mail…</p>
              </div>
            ):emailsOrdenados.length===0&&!error?(
              <div className="flex flex-col items-center justify-center py-16">
                <InboxIcon style={{width:44,height:44,color:"rgba(145,175,225,0.18)",marginBottom:10}}/>
                <p style={{fontSize:13,color:G.secondary}}>
                  {busqueda||advDe||advPara||advAsunto||advFecha?"Sin resultados":filtro==="sinleer"?"No hay correos sin leer":filtro==="destacados"?"No hay destacados":filtro==="flagged"?"No hay pendientes":"Bandeja vacía"}
                </p>
              </div>
            ):(
              <>
                {emailsOrdenados.map(em=>{
                  const isSel   = seleccionados.has(em.seqno);
                  const isStar  = starred.has(em.seqno);
                  const isFlag  = flagged.has(em.seqno);
                  const isAct   = splitView&&emailActual?.uid===em.uid;
                  const name    = carpeta==="Sent"?nombreCorto(em.to):nombreCorto(em.from);
                  const catCol  = emailCats[em.uid]?CATEGORIES.find(c=>c.label===emailCats[em.uid])?.color:undefined;

                  return (
                    <div key={em.uid||em.seqno}
                      className="group flex items-center gap-2 px-3 cursor-pointer transition-all border-b"
                      style={{paddingTop:rowPy,paddingBottom:rowPy,background:isSel||isAct?G.selected:em.seen?G.read:G.unread,borderColor:G.border,borderLeft:isFlag?"3px solid #E53935":em.seen?"3px solid transparent":`3px solid ${G.blue}`}}
                      onClick={()=>abrirEmail(em)}
                      onMouseEnter={e=>{if(!isSel&&!isAct)(e.currentTarget as HTMLElement).style.background=G.hover;}}
                      onMouseLeave={e=>{if(!isSel&&!isAct)(e.currentTarget as HTMLElement).style.background=em.seen?G.read:G.unread;}}>

                      <input type="checkbox" checked={isSel} onChange={()=>toggleSel(em.seqno)} onClick={e=>e.stopPropagation()}
                        style={{width:13,height:13,accentColor:G.blue,cursor:"pointer",flexShrink:0,opacity:isSel?1:0,transition:"opacity 0.15s"}} className="group-hover:!opacity-100"/>

                      <button onClick={e=>toggleStar(em.seqno,e)} style={{background:"none",border:"none",cursor:"pointer",padding:1,flexShrink:0,opacity:isStar?1:0,transition:"opacity 0.15s"}} className="group-hover:!opacity-100">
                        <Star style={{width:12,height:12,color:isStar?"#F4B400":"rgba(145,175,225,0.35)",fill:isStar?"#F4B400":"none"}}/>
                      </button>

                      <button onClick={e=>toggleFlag(em.seqno,e)} style={{background:"none",border:"none",cursor:"pointer",padding:1,flexShrink:0,opacity:isFlag?1:0,transition:"opacity 0.15s"}} className="group-hover:!opacity-100" title="Bandera">
                        <Flag style={{width:12,height:12,color:isFlag?"#E53935":"rgba(145,175,225,0.35)",fill:isFlag?"#E53935":"none"}}/>
                      </button>

                      <div className="flex-shrink-0 flex items-center justify-center rounded-full text-white font-semibold"
                        style={{width:26,height:26,fontSize:11,background:avatarColor(name)}}>
                        {(name[0]||"?").toUpperCase()}
                      </div>

                      {catCol&&<div style={{width:6,height:6,borderRadius:"50%",background:catCol,flexShrink:0}} title={emailCats[em.uid]}/>}

                      <span className="flex-shrink-0 truncate"
                        style={{width:138,fontSize:12,fontWeight:em.seen?400:700,color:G.text}}>
                        {name}
                      </span>

                      <div className="min-w-0 truncate" style={{width:260,flexShrink:0}}>
                        <span style={{fontSize:12,fontWeight:em.seen?400:600,color:em.seen?G.secondary:G.text}}>
                          {em.subject||"(sin asunto)"}
                        </span>
                      </div>

                      {hasAttachment(em)&&<Paperclip style={{width:11,height:11,color:G.secondary,flexShrink:0}}/>}

                      {/* Hover actions */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={e=>{e.stopPropagation();quickReplyFn(em);}} className="p-1 rounded"
                          style={{background:"none",border:"none",cursor:"pointer"}}
                          onMouseEnter={ev=>((ev.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.10)")}
                          onMouseLeave={ev=>((ev.currentTarget as HTMLElement).style.background="none")} title="Responder">
                          <Reply style={{width:11,height:11,color:G.secondary}}/>
                        </button>
                        <div className="relative">
                          <button onClick={e=>{e.stopPropagation();setCatMenuUid(catMenuUid===em.uid?null:em.uid);}} className="p-1 rounded"
                            style={{background:"none",border:"none",cursor:"pointer"}}
                            onMouseEnter={ev=>((ev.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.10)")}
                            onMouseLeave={ev=>((ev.currentTarget as HTMLElement).style.background="none")} title="Categoría">
                            <Tag style={{width:11,height:11,color:catCol||G.secondary}}/>
                          </button>
                          {catMenuUid===em.uid&&(
                            <div className="absolute right-0 top-full mt-1 rounded-lg overflow-hidden z-20"
                              style={{background:"#0D1F38",border:`1px solid ${G.border}`,minWidth:130,boxShadow:"0 8px 24px rgba(0,0,0,0.40)"}}
                              onClick={e=>e.stopPropagation()}>
                              {CATEGORIES.map(cat=>(
                                <button key={cat.label} onClick={()=>setCategory(em.uid,cat.label)}
                                  className="w-full flex items-center gap-2 px-3 py-1.5"
                                  style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:G.text}}
                                  onMouseEnter={ev=>((ev.currentTarget as HTMLElement).style.background=G.hover)}
                                  onMouseLeave={ev=>((ev.currentTarget as HTMLElement).style.background="none")}>
                                  <div style={{width:7,height:7,borderRadius:"50%",background:cat.color,flexShrink:0}}/>{cat.label}
                                </button>
                              ))}
                              {emailCats[em.uid]&&(
                                <button onClick={()=>{setEmailCats(p=>{const n={...p};delete n[em.uid];return n;});setCatMenuUid(null);}}
                                  className="w-full flex items-center gap-2 px-3 py-1.5"
                                  style={{background:"none",border:"none",borderTop:`1px solid ${G.border}`,cursor:"pointer",fontSize:11,color:G.secondary}}
                                  onMouseEnter={ev=>((ev.currentTarget as HTMLElement).style.background=G.hover)}
                                  onMouseLeave={ev=>((ev.currentTarget as HTMLElement).style.background="none")}>
                                  <X style={{width:10,height:10}}/> Quitar
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <button onClick={e=>{e.stopPropagation();eliminarEmail(em);}} className="p-1 rounded"
                          style={{background:"none",border:"none",cursor:"pointer"}}
                          onMouseEnter={ev=>((ev.currentTarget as HTMLElement).style.background="rgba(255,80,60,0.15)")}
                          onMouseLeave={ev=>((ev.currentTarget as HTMLElement).style.background="none")} title="Eliminar">
                          <Trash2 style={{width:11,height:11,color:G.secondary}}/>
                        </button>
                      </div>

                      {/* Fecha + tamaño */}
                      <div className="flex-shrink-0 flex flex-col items-end" style={{minWidth:96}}>
                        <span style={{fontSize:11,fontWeight:em.seen?400:700,color:em.seen?G.secondary:G.text,whiteSpace:"nowrap"}}>{fechaCorta(em.date)}</span>
                        {em.size&&em.size>0&&<span style={{fontSize:10,color:"rgba(138,175,200,0.55)",marginTop:1}}>{pesoLegible(em.size)}</span>}
                      </div>
                    </div>
                  );
                })}
                {emailsOrdenados.length>=limite&&(
                  <div className="flex justify-center py-3">
                    <button onClick={()=>{const n=limite+40;setLimite(n);cargarEmails(false,n);}} disabled={loading}
                      className="flex items-center gap-2 px-5 py-1.5 rounded-full"
                      style={{background:G.card,border:`1px solid ${G.border}`,color:G.secondary,fontSize:12,cursor:"pointer"}}
                      onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background=G.hover)}
                      onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background=G.card)}>
                      {loading&&<Loader2 style={{width:12,height:12}} className="animate-spin"/>}Cargar más
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* PANEL LEER (split o full) */}
        {(splitView||vista==="leer")&&(
          <div className="flex-1 flex overflow-hidden"><PanelLeer/></div>
        )}
      </div>

      {/* ════ COMPOSE MODAL ════ */}
      {composeOpen&&(
        <div className="fixed bottom-0 right-6 z-50 flex flex-col rounded-t-xl overflow-visible"
          style={{width:560,height:compMinimized?48:540,boxShadow:"0 8px 32px rgba(0,0,0,0.45)",background:"#0D1F38",border:`1px solid ${G.border}`,borderBottom:"none",transition:"height 0.2s ease"}}>

          {/* Header compose */}
          <div className="flex items-center gap-2 px-4 flex-shrink-0"
            style={{height:48,background:"#0A1929",borderBottom:`1px solid ${G.border}`,cursor:"pointer"}}
            onClick={()=>setCompMinimized(p=>!p)}>
            <span style={{fontSize:13,fontWeight:500,color:G.text,flex:1}}>Nuevo mensaje</span>
            {readReceipt&&<span style={{fontSize:10,color:"#F4B400"}}>Acuse</span>}
            {scheduledDate&&<span style={{fontSize:10,color:"#43A047"}}>Programado</span>}
            {compFiles.length>0&&<span style={{fontSize:10,color:G.secondary}}>{compFiles.length} adj.</span>}
            <button onClick={e=>{e.stopPropagation();setCompMinimized(p=>!p);}} style={{background:"none",border:"none",cursor:"pointer",padding:"3px 6px",color:G.secondary,fontSize:12,borderRadius:4}}>
              {compMinimized?"▲":"▼"}
            </button>
            <button onClick={e=>{e.stopPropagation();setComposeOpen(false);}} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:G.secondary,borderRadius:4}}>
              <X style={{width:14,height:14}}/>
            </button>
          </div>

          {!compMinimized&&(
            <>
              {/* Para */}
              <div className="flex items-center border-b px-4" style={{borderColor:G.border}}>
                <span style={{fontSize:12,color:G.secondary,width:40,flexShrink:0}}>Para</span>
                <input value={compTo} onChange={e=>setCompTo(e.target.value)} placeholder="" className="flex-1 outline-none"
                  style={{fontSize:13,color:G.text,background:"transparent",border:"none",padding:"9px 0"}}/>
                <button onClick={()=>setShowCcBcc(p=>!p)} style={{fontSize:11,color:G.secondary,background:"none",border:"none",cursor:"pointer"}}>
                  {showCcBcc?"Ocultar":"CC/BCC"}
                </button>
              </div>
              {showCcBcc&&(
                <>
                  <div className="flex items-center border-b px-4" style={{borderColor:G.border}}>
                    <span style={{fontSize:12,color:G.secondary,width:40,flexShrink:0}}>CC</span>
                    <input value={compCc} onChange={e=>setCompCc(e.target.value)} className="flex-1 outline-none"
                      style={{fontSize:13,color:G.text,background:"transparent",border:"none",padding:"8px 0"}}/>
                  </div>
                  <div className="flex items-center border-b px-4" style={{borderColor:G.border}}>
                    <span style={{fontSize:12,color:G.secondary,width:40,flexShrink:0}}>BCC</span>
                    <input value={compBcc} onChange={e=>setCompBcc(e.target.value)} className="flex-1 outline-none"
                      style={{fontSize:13,color:G.text,background:"transparent",border:"none",padding:"8px 0"}}/>
                  </div>
                </>
              )}
              {/* Asunto */}
              <div className="flex items-center border-b px-4" style={{borderColor:G.border}}>
                <input value={compSubject} onChange={e=>setCompSubject(e.target.value)} placeholder="Asunto" className="flex-1 outline-none"
                  style={{fontSize:13,color:G.text,background:"transparent",border:"none",padding:"8px 0"}}/>
              </div>

              {/* Toolbar formato enriquecido */}
              {richFormat&&(
                <div className="flex items-center gap-1 px-3 py-1.5 border-b flex-shrink-0 flex-wrap" style={{borderColor:G.border,background:"rgba(0,0,0,0.14)",rowGap:3}}>
                  {/* Fuente */}
                  <select value={compFont} onChange={e=>setCompFont(e.target.value)}
                    style={{fontSize:11,background:"rgba(255,255,255,0.08)",border:`1px solid ${G.border}`,borderRadius:6,color:G.text,padding:"2px 4px",cursor:"pointer"}}>
                    {FONTS.map(f=><option key={f} value={f} style={{background:"#0D1F38"}}>{f}</option>)}
                  </select>
                  {/* Tamaño */}
                  <select value={compFontSize} onChange={e=>setCompFontSize(Number(e.target.value))}
                    style={{fontSize:11,background:"rgba(255,255,255,0.08)",border:`1px solid ${G.border}`,borderRadius:6,color:G.text,padding:"2px 4px",width:52,cursor:"pointer"}}>
                    {SIZES.map(s=><option key={s} value={s} style={{background:"#0D1F38"}}>{s}</option>)}
                  </select>
                  {/* Negrita / Cursiva / Subrayado */}
                  {([
                    {icon:Bold,   title:"Negrita",   tag:"**",end:"**"},
                    {icon:Italic, title:"Cursiva",   tag:"_", end:"_"},
                    {icon:Underline,title:"Subrayado",tag:"<u>",end:"</u>"},
                    {icon:List,   title:"Lista",     tag:"\n- ",end:""},
                    {icon:ListOrdered,title:"Numeración",tag:"\n1. ",end:""},
                    {icon:AlignLeft,title:"Citar",   tag:"\n> ",end:""},
                  ]).map(({icon:Icon,title,tag,end})=>(
                    <button key={title} onClick={()=>insertAtCursor(textareaRef.current,tag+(end??""),setCompBody,compBody)}
                      className="p-1.5 rounded" title={title}
                      style={{background:"none",border:"none",cursor:"pointer"}}
                      onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.10)")}
                      onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="none")}>
                      <Icon style={{width:12,height:12,color:G.secondary}}/>
                    </button>
                  ))}
                  {/* Color de texto */}
                  <div className="relative group/color flex items-center gap-1">
                    <Type style={{width:12,height:12,color:compTextColor}}/>
                    <div className="absolute bottom-full left-0 mb-1 p-1.5 rounded-lg hidden group-hover/color:flex flex-wrap gap-1 z-10"
                      style={{background:"#0D1F38",border:`1px solid ${G.border}`,width:120,boxShadow:"0 4px 12px rgba(0,0,0,0.40)"}}>
                      {COLORS.map(c=>(
                        <button key={c} onClick={()=>setCompTextColor(c)}
                          style={{width:18,height:18,borderRadius:4,background:c,border:compTextColor===c?"2px solid #7BB6FF":"2px solid transparent",cursor:"pointer",padding:0}}/>
                      ))}
                    </div>
                  </div>
                  {/* Hipervínculo */}
                  <button onClick={()=>setShowLinkModal(true)} className="p-1.5 rounded" title="Insertar hipervínculo"
                    style={{background:"none",border:"none",cursor:"pointer"}}
                    onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.10)")}
                    onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="none")}>
                    <Link2 style={{width:12,height:12,color:G.secondary}}/>
                  </button>
                  {/* Imagen */}
                  <button onClick={()=>imageInputRef.current?.click()} className="p-1.5 rounded" title="Insertar imagen"
                    style={{background:"none",border:"none",cursor:"pointer"}}
                    onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.10)")}
                    onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="none")}>
                    <Image style={{width:12,height:12,color:G.secondary}}/>
                  </button>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={e=>{
                    const f = e.target.files?.[0]; if(!f) return;
                    const reader = new FileReader();
                    reader.onload = ev => insertAtCursor(textareaRef.current,`\n![${f.name}](${ev.target?.result})\n`,setCompBody,compBody);
                    reader.readAsDataURL(f);
                  }}/>
                  {/* Tabla */}
                  <button onClick={()=>setShowTableModal(true)} className="p-1.5 rounded" title="Insertar tabla"
                    style={{background:"none",border:"none",cursor:"pointer"}}
                    onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background="rgba(255,255,255,0.10)")}
                    onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background="none")}>
                    <Table2 style={{width:12,height:12,color:G.secondary}}/>
                  </button>
                </div>
              )}

              {/* Archivos adjuntos */}
              {compFiles.length>0&&(
                <div className="flex gap-2 px-4 py-1.5 border-b flex-wrap" style={{borderColor:G.border,background:"rgba(0,0,0,0.10)"}}>
                  {compFiles.map((f,i)=>(
                    <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                      style={{background:"rgba(123,182,255,0.12)",border:`1px solid ${G.border}`}}>
                      <Paperclip style={{width:11,height:11,color:G.secondary}}/>
                      <span style={{fontSize:11,color:G.text}}>{f.name}</span>
                      <span style={{fontSize:10,color:G.secondary}}>{pesoLegible(f.size)}</span>
                      <button onClick={()=>setCompFiles(prev=>prev.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",padding:1}}>
                        <X style={{width:10,height:10,color:G.secondary}}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Textarea */}
              <textarea ref={textareaRef} value={compBody} onChange={e=>setCompBody(e.target.value)}
                placeholder="Escribe tu mensaje…" spellCheck className="flex-1 outline-none resize-none px-4 py-3"
                style={{fontSize:compFontSize,fontFamily:compFont,color:compTextColor,background:"transparent",border:"none"}}/>

              {/* Firma */}
              {firma&&(
                <div className="px-4 pb-2 border-t" style={{borderColor:G.border}}>
                  <p style={{fontSize:11,color:G.secondary,whiteSpace:"pre-line"}}>— {firma}</p>
                </div>
              )}

              {/* Envío programado */}
              {showSchedule&&(
                <div className="px-4 py-2 border-t flex items-center gap-2" style={{borderColor:G.border,background:"rgba(0,0,0,0.12)"}}>
                  <Clock style={{width:13,height:13,color:"#43A047"}}/>
                  <span style={{fontSize:12,color:G.secondary}}>Programar envío:</span>
                  <input type="datetime-local" value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)}
                    className="outline-none rounded-lg px-2 py-1"
                    style={{fontSize:12,background:"rgba(255,255,255,0.08)",border:`1px solid ${G.border}`,color:G.text}}/>
                  <button onClick={()=>{setScheduledDate("");setShowSchedule(false);}} style={{fontSize:11,color:G.secondary,background:"none",border:"none",cursor:"pointer"}}>Cancelar</button>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0 flex-wrap" style={{borderTop:`1px solid ${G.border}`,rowGap:4}}>
                <button onClick={enviarCorreo} disabled={enviando||!compTo.trim()||!compSubject.trim()}
                  className="flex items-center gap-1.5 px-5 py-1.5 rounded-full disabled:opacity-50"
                  style={{background:G.blue,color:"#0A1929",fontSize:13,fontWeight:600,cursor:"pointer",border:"none"}}>
                  {enviando&&<Loader2 style={{width:12,height:12}} className="animate-spin"/>}
                  {scheduledDate?"Programar":"Enviar"}
                </button>

                {/* Adjuntar */}
                <button onClick={()=>fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
                  style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${G.border}`,color:G.secondary,fontSize:12,cursor:"pointer"}}
                  title="Adjuntar archivo">
                  <Paperclip style={{width:12,height:12}}/> Adjuntar
                </button>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e=>{
                  const files = Array.from(e.target.files||[]);
                  setCompFiles(prev=>[...prev,...files]);
                  e.target.value="";
                }}/>

                {/* Plantillas */}
                <div className="relative">
                  <button onClick={()=>setShowTemplates(p=>!p)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full"
                    style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${G.border}`,color:G.secondary,fontSize:12,cursor:"pointer"}}>
                    <AlignLeft style={{width:12,height:12}}/> Plantillas
                  </button>
                  {showTemplates&&(
                    <div className="absolute bottom-full mb-1 left-0 rounded-lg overflow-hidden z-20"
                      style={{background:"#0D1F38",border:`1px solid ${G.border}`,minWidth:190,boxShadow:"0 8px 24px rgba(0,0,0,0.40)"}}>
                      {QUICK_TEMPLATES.map(t=>(
                        <button key={t.label} onClick={()=>{setCompBody(b=>b+(b?"\n\n":"")+t.text);setShowTemplates(false);}}
                          className="w-full text-left px-4 py-2"
                          style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:G.text}}
                          onMouseEnter={ev=>((ev.currentTarget as HTMLElement).style.background=G.hover)}
                          onMouseLeave={ev=>((ev.currentTarget as HTMLElement).style.background="none")}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formato / Acuse / Programar / Guardar borrador */}
                {([
                  {icon:Bold,   title:"Formato",     active:richFormat,    fn:()=>setRichFormat(p=>!p),    ac:"rgba(123,182,255,0.15)"},
                  {icon:Check,  title:"Acuse recibo", active:readReceipt,   fn:()=>setReadReceipt(p=>!p),  ac:"rgba(244,180,0,0.15)"},
                  {icon:Clock,  title:"Programar envío",active:showSchedule,fn:()=>setShowSchedule(p=>!p),ac:"rgba(67,160,71,0.15)"},
                  {icon:Save,   title:"Guardar borrador",active:false,       fn:guardarBorrador,            ac:"rgba(255,255,255,0.10)"},
                ] as {icon:React.ElementType;title:string;active:boolean;fn:()=>void;ac:string}[]).map(({icon:Icon,title,active,fn,ac})=>(
                  <button key={title} onClick={fn} className="p-1.5 rounded" title={title}
                    style={{background:active?ac:"none",border:"none",cursor:"pointer"}}
                    onMouseEnter={e=>((e.currentTarget as HTMLElement).style.background=active?ac:"rgba(255,255,255,0.07)")}
                    onMouseLeave={e=>((e.currentTarget as HTMLElement).style.background=active?ac:"none")}>
                    <Icon style={{width:13,height:13,color:active?G.blue:G.secondary}}/>
                  </button>
                ))}

                <div className="flex-1"/>
                <button onClick={()=>setConfirmState({open:true,msg:"¿Descartar borrador?",onOk:()=>{setComposeOpen(false);setCompTo("");setCompSubject("");setCompBody("");setCompCc("");setCompBcc("");setCompFiles([]);setScheduledDate("");}})}>
                  <Trash2 style={{width:14,height:14,color:G.secondary}}/>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════ MODAL RECORDATORIO ════ */}
      {reminderOpen&&reminderEmail&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.55)"}} onClick={()=>setReminderOpen(false)}>
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={{background:"#0D1F38",border:`1px solid ${G.border}`,width:360,boxShadow:"0 16px 48px rgba(0,0,0,0.50)"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:16,fontWeight:600,color:G.text}}>Recordatorio de seguimiento</h3>
            <p style={{fontSize:13,color:G.secondary,marginTop:-8}} className="truncate">{reminderEmail.subject||"(sin asunto)"}</p>
            <div className="flex flex-col gap-1">
              <label style={{fontSize:12,color:G.secondary}}>Fecha y hora</label>
              <input type="datetime-local" value={reminderDate} onChange={e=>setReminderDate(e.target.value)}
                className="outline-none rounded-lg px-3 py-2"
                style={{fontSize:13,background:"rgba(145,175,225,0.10)",border:`1px solid ${G.border}`,color:G.text}}/>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setReminderOpen(false)} style={{fontSize:13,color:G.secondary,background:"none",border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 16px",cursor:"pointer"}}>Cancelar</button>
              <button onClick={()=>{if(reminderDate&&reminderEmail){setReminders(p=>({...p,[reminderEmail.uid]:reminderDate}));flash("ok",`Recordatorio guardado para ${new Date(reminderDate).toLocaleString("es-MX")}`);}setReminderOpen(false);}}
                style={{fontSize:13,fontWeight:600,color:"#0A1929",background:G.blue,border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer"}}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL FIRMA ════ */}
      {showFirmaConfig&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.55)"}} onClick={()=>setShowFirmaConfig(false)}>
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={{background:"#0D1F38",border:`1px solid ${G.border}`,width:420,boxShadow:"0 16px 48px rgba(0,0,0,0.50)"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:16,fontWeight:600,color:G.text}}>Configurar firma</h3>
            <textarea value={firmaEdit} onChange={e=>setFirmaEdit(e.target.value)} placeholder={"Ej: Juan Viveros\nGerente Avante\nTel: 449-000-0000"} rows={4}
              className="outline-none resize-none rounded-lg px-3 py-2"
              style={{fontSize:13,background:"rgba(145,175,225,0.10)",border:`1px solid ${G.border}`,color:G.text}}/>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>{setFirma("");setShowFirmaConfig(false);flash("ok","Firma eliminada");}} style={{fontSize:13,color:"#FF6B6B",background:"none",border:"none",cursor:"pointer"}}>Eliminar firma</button>
              <button onClick={()=>setShowFirmaConfig(false)} style={{fontSize:13,color:G.secondary,background:"none",border:`1px solid ${G.border}`,borderRadius:8,padding:"8px 16px",cursor:"pointer"}}>Cancelar</button>
              <button onClick={()=>{setFirma(firmaEdit);setShowFirmaConfig(false);flash("ok","Firma guardada");}} style={{fontSize:13,fontWeight:600,color:"#0A1929",background:G.blue,border:"none",borderRadius:8,padding:"8px 16px",cursor:"pointer"}}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL HIPERVÍNCULO ════ */}
      {showLinkModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.55)"}} onClick={()=>setShowLinkModal(false)}>
          <div className="rounded-2xl p-5 flex flex-col gap-3" style={{background:"#0D1F38",border:`1px solid ${G.border}`,width:360,boxShadow:"0 16px 48px rgba(0,0,0,0.50)"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:15,fontWeight:600,color:G.text}}>Insertar hipervínculo</h3>
            <input value={linkText} onChange={e=>setLinkText(e.target.value)} placeholder="Texto del enlace" className="outline-none rounded-lg px-3 py-2"
              style={{fontSize:13,background:"rgba(255,255,255,0.08)",border:`1px solid ${G.border}`,color:G.text}}/>
            <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} placeholder="https://..." className="outline-none rounded-lg px-3 py-2"
              style={{fontSize:13,background:"rgba(255,255,255,0.08)",border:`1px solid ${G.border}`,color:G.text}}/>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setShowLinkModal(false)} style={{fontSize:13,color:G.secondary,background:"none",border:`1px solid ${G.border}`,borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>Cancelar</button>
              <button onClick={insertarLink} disabled={!linkUrl} style={{fontSize:13,fontWeight:600,color:"#0A1929",background:G.blue,border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",opacity:linkUrl?1:0.5}}>Insertar</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL TABLA ════ */}
      {showTableModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background:"rgba(0,0,0,0.55)"}} onClick={()=>setShowTableModal(false)}>
          <div className="rounded-2xl p-5 flex flex-col gap-4" style={{background:"#0D1F38",border:`1px solid ${G.border}`,width:300,boxShadow:"0 16px 48px rgba(0,0,0,0.50)"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{fontSize:15,fontWeight:600,color:G.text}}>Insertar tabla</h3>
            <div className="flex items-center gap-3">
              <label style={{fontSize:12,color:G.secondary,width:60}}>Filas</label>
              <input type="number" min={1} max={20} value={tableRows} onChange={e=>setTableRows(Number(e.target.value))}
                className="outline-none rounded-lg px-3 py-2 w-24"
                style={{fontSize:13,background:"rgba(255,255,255,0.08)",border:`1px solid ${G.border}`,color:G.text}}/>
            </div>
            <div className="flex items-center gap-3">
              <label style={{fontSize:12,color:G.secondary,width:60}}>Columnas</label>
              <input type="number" min={1} max={10} value={tableCols} onChange={e=>setTableCols(Number(e.target.value))}
                className="outline-none rounded-lg px-3 py-2 w-24"
                style={{fontSize:13,background:"rgba(255,255,255,0.08)",border:`1px solid ${G.border}`,color:G.text}}/>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>setShowTableModal(false)} style={{fontSize:13,color:G.secondary,background:"none",border:`1px solid ${G.border}`,borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>Cancelar</button>
              <button onClick={insertarTabla} style={{fontSize:13,fontWeight:600,color:"#0A1929",background:G.blue,border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer"}}>Insertar</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal open={confirmState.open} message={confirmState.msg}
        onConfirm={()=>{confirmState.onOk();setConfirmState(p=>({...p,open:false}));}}
        onCancel={()=>setConfirmState(p=>({...p,open:false}))}/>
    </div>
  );

  /* helpers locales */
  function quickReplyFn(em: EmailHeader) {
    setCompTo(emailAddr(em.from)); setCompSubject(`Re: ${em.subject||""}`);
    setCompBody(""); setCompCc(""); setCompBcc("");
    setComposeOpen(true); setCompMinimized(false);
  }
  function copiarRemitente(addr: string) {
    navigator.clipboard.writeText(addr).then(()=>{
      setCopiedAddr(addr); flash("ok","Dirección copiada"); setTimeout(()=>setCopiedAddr(""),2000);
    }).catch(()=>{});
  }
}
