"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Mail, Send, Trash2, RefreshCw, Loader2, Inbox, PenSquare,
  ChevronLeft, Search, X, AlertTriangle
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

type Vista = "lista" | "leer" | "componer";
type Carpeta = "INBOX" | "Sent";

/* ── helpers ── */
function fechaCorta(s: string) {
  try {
    const d = new Date(s);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString())
      return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  } catch { return s; }
}

function nombreCorto(raw: string) {
  if (!raw) return "—";
  const match = raw.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : raw.replace(/<.*>/, "").trim() || raw;
}

const CACHE_KEY = (folder: Carpeta) => `aria27_inbox_${folder}`;
const AUTO_REFRESH_MS = 2 * 60 * 1000; // 2 minutos

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function InboxPage() {
  const { msg, flash, clear } = useFlashMessage();
  const [confirmState, setConfirmState] = useState<{ open: boolean; msg: string; onOk: () => void }>({
    open: false, msg: "", onOk: () => {},
  });
  const [vista, setVista] = useState<Vista>("lista");
  const [carpeta, setCarpeta] = useState<Carpeta>("INBOX");
  const [emails, setEmails] = useState<EmailHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // recarga en segundo plano
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── estado "leer" ── */
  const [emailActual, setEmailActual] = useState<EmailHeader | null>(null);
  const [cuerpo, setCuerpo] = useState({ body: "", html: "" });
  const [cargandoCuerpo, setCargandoCuerpo] = useState(false);

  /* ── estado "componer" ── */
  const [compTo, setCompTo] = useState("");
  const [compSubject, setCompSubject] = useState("");
  const [compBody, setCompBody] = useState("");
  const [enviando, setEnviando] = useState(false);

  /* ─────────────────────────────────────────────────────────────
     Cargar lista de correos.
     - silencioso=true → mantiene emails actuales mientras recarga
       (auto-refresh en segundo plano).
     - silencioso=false (default) → muestra spinner de carga inicial.
  ───────────────────────────────────────────────────────────── */
  const cargarEmails = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    else setRefreshing(true);
    setError("");
    try {
      const r = await fetch("/api/mail/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder: carpeta, limit: 40 }),
      });
      const data = await r.json().catch(() => ({}));

      if (r.status === 401) {
        // Credenciales no configuradas en el servidor
        setError("Credenciales de correo no configuradas. Verifica ZOHO_EMAIL y ZOHO_PASSWORD en Vercel.");
        if (!silencioso) setLoading(false);
        else setRefreshing(false);
        return;
      }
      if (!r.ok) throw new Error(data.error || "Error al conectar con Zoho");

      const lista: EmailHeader[] = data.emails || [];
      setEmails(lista);
      setSeleccionados(new Set());
      setLastUpdate(new Date());

      // Guardar en caché de sesión
      try {
        sessionStorage.setItem(CACHE_KEY(carpeta), JSON.stringify({
          emails: lista,
          at: new Date().toISOString(),
        }));
      } catch { /* sessionStorage puede estar deshabilitado */ }

    } catch (e: unknown) {
      setError((e as Error).message || "Error de conexión con Zoho Mail");
    }
    if (!silencioso) setLoading(false);
    else setRefreshing(false);
  }, [carpeta]);

  /* ── carga inicial: mostrar caché inmediatamente + fetch fresco ── */
  useEffect(() => {
    // Recuperar caché de sesión al instante (UX: emails visibles de inmediato)
    try {
      const cached = sessionStorage.getItem(CACHE_KEY(carpeta));
      if (cached) {
        const { emails: cachedEmails } = JSON.parse(cached);
        if (Array.isArray(cachedEmails) && cachedEmails.length > 0) {
          setEmails(cachedEmails);
          setLoading(false); // no spinner si ya tenemos caché
        }
      }
    } catch { /* no hay caché */ }

    // Fetch fresco en paralelo
    cargarEmails(emails.length > 0); // silencioso si ya hay caché
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carpeta]);

  /* ── auto-refresh cada 2 minutos mientras esté en vista lista ── */
  useEffect(() => {
    if (vista !== "lista") return; // no refrescar si está leyendo o componiendo

    intervalRef.current = setInterval(() => {
      cargarEmails(true); // silencioso: sin spinner, sin limpiar lista
    }, AUTO_REFRESH_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [vista, cargarEmails]);

  /* ── montar: primera carga al entrar ── */
  useEffect(() => {
    cargarEmails(false);
  // Solo al montar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── abrir email ── */
  const abrirEmail = async (em: EmailHeader) => {
    setEmailActual(em);
    setVista("leer");
    setCargandoCuerpo(true);
    try {
      const r = await fetch("/api/mail/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: em.uid, folder: carpeta }),
      });
      const data = await r.json().catch(() => ({}));
      setCuerpo({ body: data.body || "", html: data.html || "" });
    } catch { setCuerpo({ body: "Error al cargar contenido", html: "" }); }
    setCargandoCuerpo(false);
  };

  /* ── eliminar seleccionados ── */
  const eliminarSeleccionados = async () => {
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

  /* ── enviar ── */
  const enviarCorreo = async () => {
    if (!compTo.trim() || !compSubject.trim()) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: compTo.trim(), subject: compSubject.trim(), body: compBody }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || "Error al enviar");
      setCompTo(""); setCompSubject(""); setCompBody("");
      setVista("lista");
      cargarEmails(false);
    } catch (e: unknown) { flash("err", "Error: " + (e as Error).message); }
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

  const todosSeleccionados = emailsFiltrados.length > 0 &&
    emailsFiltrados.every(e => seleccionados.has(e.seqno));

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(emailsFiltrados.map(e => e.seqno)));
    }
  };

  const toggleSel = (seqno: number) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(seqno) ? next.delete(seqno) : next.add(seqno);
      return next;
    });
  };

  /* ═══════════════════════ VISTA COMPONER ═══════════════════════ */
  if (vista === "componer") {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/[0.08]">
          <button onClick={() => setVista("lista")} className="p-2 hover:bg-white/[0.06] rounded-lg">
            <ChevronLeft className="w-5 h-5 text-[#7f93b0]" />
          </button>
          <PenSquare className="w-5 h-5 text-aria-accent" />
          <span className="text-white font-semibold">Nuevo correo</span>
          <div className="flex-1" />
          <button
            onClick={enviarCorreo}
            disabled={enviando || !compTo.trim() || !compSubject.trim()}
            className="px-4 py-2 bg-aria-accent hover:bg-aria-accent/80 disabled:opacity-40 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#7f93b0] w-16">Para:</label>
            <input value={compTo} onChange={e => setCompTo(e.target.value)} placeholder="correo@ejemplo.com"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-aria-accent/50" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-[#7f93b0] w-16">Asunto:</label>
            <input value={compSubject} onChange={e => setCompSubject(e.target.value)} placeholder="Asunto del correo"
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-aria-accent/50" />
          </div>
          <textarea
            value={compBody} onChange={e => setCompBody(e.target.value)}
            placeholder="Escribe tu mensaje..."
            rows={16}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-sm outline-none focus:border-aria-accent/50 resize-none"
          />
        </div>
      </div>
    );
  }

  /* ═══════════════════════ VISTA LEER ═══════════════════════ */
  if (vista === "leer" && emailActual) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/[0.08]">
          <button
            onClick={() => { setVista("lista"); setEmailActual(null); }}
            className="p-2 hover:bg-white/[0.06] rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-[#7f93b0]" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{emailActual.subject || "(sin asunto)"}</p>
            <p className="text-xs text-[#7f93b0] truncate">
              De: {emailActual.from} · {fechaCorta(emailActual.date)}
            </p>
          </div>
          <button
            onClick={responder}
            className="px-3 py-1.5 bg-aria-accent-bg text-aria-accent rounded-lg text-sm hover:bg-aria-accent/30 transition-colors"
          >
            Responder
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {cargandoCuerpo ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-aria-accent" />
            </div>
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
            <pre className="text-[#c9d8ed] whitespace-pre-wrap text-sm leading-relaxed">
              {cuerpo.body || "Sin contenido"}
            </pre>
          )}
        </div>
      </div>
    );
  }

  /* ═══════════════════════ VISTA LISTA ═══════════════════════ */
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <FlashBanner msg={msg} className="px-6 pt-3" />

      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-white/[0.08] flex-wrap">
        <AriaBackButton href="/dashboard" />
        <Mail className="w-5 h-5 text-aria-accent" />
        <span className="text-white font-semibold">Correo</span>

        {/* tabs carpeta */}
        <div className="flex bg-white/[0.04] rounded-lg p-0.5 ml-2">
          {(["INBOX", "Sent"] as Carpeta[]).map(c => (
            <button
              key={c}
              onClick={() => { setCarpeta(c); setSeleccionados(new Set()); setBusqueda(""); }}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                carpeta === c ? "bg-aria-accent/30 text-aria-accent" : "text-[#7f93b0] hover:text-white"
              }`}
            >
              {c === "INBOX" ? "Recibidos" : "Enviados"}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* buscador */}
        <div className="relative w-full md:w-64 order-last md:order-none mt-2 md:mt-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6080]" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-9 pr-8 py-1.5 text-sm text-white outline-none focus:border-aria-accent/50"
          />
          {busqueda && (
            <button onClick={() => setBusqueda("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4a6080]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* seleccionar todos */}
        {emails.length > 0 && (
          <label className="flex items-center gap-1.5 cursor-pointer select-none group" title={todosSeleccionados ? "Deseleccionar todos" : "Seleccionar todos"}>
            <input
              type="checkbox"
              checked={todosSeleccionados}
              onChange={toggleTodos}
              className="w-4 h-4 rounded border-white/[0.12] accent-aria-accent"
            />
            <span className="text-xs text-[#7f93b0] group-hover:text-[#c9d8ed] transition-colors hidden sm:inline">
              {todosSeleccionados ? "Ninguno" : "Todos"}
            </span>
          </label>
        )}

        {/* acciones */}
        <button
          onClick={() => setVista("componer")}
          className="px-3 py-1.5 bg-aria-accent hover:bg-aria-accent/80 text-white rounded-lg text-sm flex items-center gap-1.5 transition-colors"
        >
          <PenSquare className="w-4 h-4" /> Redactar
        </button>
        <button
          onClick={() => cargarEmails(false)}
          disabled={loading}
          title="Actualizar"
          className="p-2 hover:bg-white/[0.06] rounded-lg text-[#7f93b0] disabled:opacity-40"
        >
          {loading || refreshing
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <RefreshCw className="w-4 h-4" />
          }
        </button>
        {seleccionados.size > 0 && (
          <button
            onClick={eliminarSeleccionados}
            className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
            title={`Eliminar ${seleccionados.size} seleccionado(s)`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-300 text-sm font-medium">Error de conexión</p>
            <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => cargarEmails(false)}
            className="text-xs text-red-400 hover:text-red-300 underline flex-shrink-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* LISTA */}
      <div className="flex-1 overflow-auto">
        {loading && emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-aria-accent" />
            <p className="text-sm text-[#7f93b0]">Conectando con Zoho Mail…</p>
          </div>
        ) : emailsFiltrados.length === 0 && !error ? (
          <div className="text-center py-16 text-[#4a6080]">
            <Inbox className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>{busqueda ? "Sin resultados" : "Bandeja vacía"}</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {emailsFiltrados.map(em => (
              <div
                key={em.uid || em.seqno}
                className={`flex items-center gap-3 px-4 md:px-6 py-3 hover:bg-white/[0.04] cursor-pointer transition-colors ${
                  !em.seen ? "bg-aria-accent-bg" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={seleccionados.has(em.seqno)}
                  onChange={() => toggleSel(em.seqno)}
                  className="w-4 h-4 rounded border-white/[0.12] accent-aria-accent flex-shrink-0"
                />
                <div className="flex-1 min-w-0" onClick={() => abrirEmail(em)}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm truncate ${!em.seen ? "text-white font-semibold" : "text-[#c9d8ed]"}`}>
                      {carpeta === "INBOX" ? nombreCorto(em.from) : nombreCorto(em.to)}
                    </span>
                    <span className="text-xs text-[#4a6080] flex-shrink-0">{fechaCorta(em.date)}</span>
                  </div>
                  <p className={`text-sm truncate ${!em.seen ? "text-[#c9d8ed]" : "text-[#4a6080]"}`}>
                    {em.subject || "(sin asunto)"}
                  </p>
                </div>
                {!em.seen && <div className="w-2 h-2 rounded-full bg-aria-accent flex-shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-4 md:px-6 py-2 border-t border-white/[0.08] flex items-center justify-between text-xs text-[#4a6080]">
        <span>
          {emails.length} correo{emails.length !== 1 ? "s" : ""} · {carpeta === "INBOX" ? "Recibidos" : "Enviados"}
          {refreshing && <span className="ml-2 text-aria-accent/60">actualizando…</span>}
        </span>
        <span>
          {lastUpdate && `Actualizado ${lastUpdate.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`}
          <span className="ml-3 text-[#2a3c58]">· auto-refresh 2 min</span>
        </span>
      </div>

      <ConfirmModal
        open={confirmState.open}
        message={confirmState.msg}
        onConfirm={() => { confirmState.onOk(); setConfirmState(p => ({ ...p, open: false })); }}
        onCancel={() => setConfirmState(p => ({ ...p, open: false }))}
      />
    </div>
  );
}
