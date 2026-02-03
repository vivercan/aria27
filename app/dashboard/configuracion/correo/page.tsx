"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Inbox, Send, Trash2, RefreshCw, Edit3, X, Search, CheckSquare, Square, Paperclip, Loader2, MailOpen, Circle, AlertCircle, Bell } from "lucide-react";

interface Email {
  seqno: number;
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  html?: string;
  seen: boolean;
  flags: string[];
  hasAttachment?: boolean;
}

export default function CorreoPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [folder, setFolder] = useState("INBOX");
  const [userEmail, setUserEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (email) setUserEmail(email);
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    setError("");
    try {
      const creds = sessionStorage.getItem("zohoCreds");
      if (!creds) {
        setError("Sesión expirada. Vuelve a iniciar sesión.");
        return;
      }
      const { e, p } = JSON.parse(atob(creds));
      const res = await fetch("/api/mail/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p, folder, limit: 50 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmails(data.emails || []);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.message || "Error al cargar correos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmails(); }, [folder]);

  const fetchEmailContent = async (email: Email) => {
    setSelectedEmail(email);
    setLoadingContent(true);
    try {
      const creds = sessionStorage.getItem("zohoCreds");
      if (!creds) return;
      const { e, p } = JSON.parse(atob(creds));
      const res = await fetch("/api/mail/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p, uid: email.uid, folder }),
      });
      const data = await res.json();
      if (data.html || data.body) {
        setSelectedEmail({ ...email, html: data.html, body: data.body });
      }
    } catch (err) {
      console.error("Error fetching content:", err);
    }
    setLoadingContent(false);
  };


  const toggleRead = (uid: number) => {
    setEmails(prev => prev.map(e => e.uid === uid ? { ...e, seen: !e.seen } : e));
    if (selectedEmail?.uid === uid) {
      setSelectedEmail(prev => prev ? { ...prev, seen: !prev.seen } : null);
    }
  };

  const deleteEmails = async (uids: number[]) => {
    if (uids.length === 0) return;
    if (!confirm(`¿Eliminar ${uids.length} correo(s)?`)) return;
    
    setDeleting(true);
    try {
      const creds = sessionStorage.getItem("zohoCreds");
      if (!creds) throw new Error("Sesión expirada");
      const { e, p } = JSON.parse(atob(creds));
      
      const res = await fetch("/api/mail/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p, uids, folder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Remover de la lista local
      setEmails(prev => prev.filter(em => !uids.includes(em.uid)));
      setSelectedIds([]);
      if (selectedEmail && uids.includes(selectedEmail.uid)) {
        setSelectedEmail(null);
      }
    } catch (err: any) {
      alert("Error al eliminar: " + (err.message || "Error desconocido"));
    } finally {
      setDeleting(false);
    }
  };

  const sendEmail = async () => {
    if (!composeTo || !composeSubject) {
      alert("Completa destinatario y asunto");
      return;
    }
    setSending(true);
    try {
      const creds = sessionStorage.getItem("zohoCreds");
      if (!creds) throw new Error("Sesión expirada");
      const { e, p } = JSON.parse(atob(creds));
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p, to: composeTo, subject: composeSubject, body: composeBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Correo enviado correctamente");
      setShowCompose(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setAttachments([]);
    } catch (err: any) {
      alert("Error: " + (err.message || "No se pudo enviar"));
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) {
        return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
    } catch { return ""; }
  };

  const extractName = (from: string) => {
    if (!from) return "Desconocido";
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim().replace(/"/g, "") : from.split("@")[0];
  };

  const toggleSelect = (uid: number) => {
    setSelectedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const selectAll = () => {
    setSelectedIds(selectedIds.length === filteredEmails.length ? [] : filteredEmails.map(e => e.uid));
  };

  const filteredEmails = emails.filter(e => {
    if (folder === "Notification") {
      const fa = e.from ? e.from.toLowerCase() : "";
      if (!fa.includes("aria") && !fa.includes("jjcrm27") && !fa.includes("noreply@mail")) return false;
    }
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.from?.toLowerCase().includes(term) || e.subject?.toLowerCase().includes(term);
  });

  const folders = [
    { name: "INBOX", label: "Entrada", icon: Inbox },
    { name: "Sent", label: "Enviados", icon: Send },
    { name: "Trash", label: "Papelera", icon: Trash2 },
    { name: "Spam", label: "Spam", icon: AlertCircle },
    { name: "Notification", label: "ARIA27 Notificaciones", icon: Bell },
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-700/50 flex-shrink-0 bg-slate-900">
        <Link href="/dashboard/configuracion" className="p-2 rounded-lg hover:bg-slate-800">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <Mail className="w-6 h-6 text-blue-400" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">Bandeja de Correo</h1>
          <p className="text-slate-400 text-sm">{userEmail}</p>
        </div>
        <button onClick={loadEmails} disabled={loading} className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
          <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r border-slate-700/50 p-3 flex flex-col flex-shrink-0 bg-slate-900">
          <button onClick={() => setShowCompose(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 mb-4 font-medium text-sm">
            <Edit3 className="w-4 h-4" />
            Redactar
          </button>

          <div className="space-y-1">
            {folders.map((f) => (
              <button key={f.name} onClick={() => { setFolder(f.name); setSelectedEmail(null); }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${f.name === "Notification" ? (folder === f.name ? "bg-orange-500/20 text-orange-300" : "text-orange-400 hover:bg-orange-500/10") : (folder === f.name ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50")}`}>
                <f.icon className="w-4 h-4" />
                {f.label}
                {f.name === "INBOX" && emails.filter(e => !e.seen).length > 0 && (
                  <span className="ml-auto text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded font-medium">
                    {emails.filter(e => !e.seen).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de correos */}
        <div className={`${selectedEmail ? "w-80" : "flex-1"} flex flex-col overflow-hidden border-r border-slate-700/50 transition-all`}>
          {/* Toolbar */}
          <div className="px-3 py-2 border-b border-slate-700/50 flex items-center gap-2 flex-shrink-0 bg-slate-800/30">
            <button onClick={selectAll} className="p-1.5 rounded hover:bg-slate-700">
              {selectedIds.length === filteredEmails.length && filteredEmails.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
            </button>

            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-600/50 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 text-sm"
              />
            </div>

            {selectedIds.length > 0 && (
              <>
                <button onClick={() => selectedIds.forEach(id => toggleRead(id))} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded" title="Marcar leído">
                  <MailOpen className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => deleteEmails(selectedIds)} 
                  disabled={deleting}
                  className="p-1.5 text-red-400 hover:bg-red-500/20 rounded disabled:opacity-50" 
                  title="Eliminar seleccionados"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
                <span className="text-xs text-slate-400">{selectedIds.length} sel.</span>
              </>
            )}
          </div>

          {/* Lista */}
          {error ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <p className="text-red-400 mb-3 text-sm">{error}</p>
                <button onClick={loadEmails} className="px-3 py-1.5 bg-blue-600 rounded text-white text-sm">Reintentar</button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              No hay correos
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredEmails.map((email, idx) => (
                <div
                  key={email.uid || idx}
                  onClick={() => { fetchEmailContent(email); toggleRead(email.uid); }}
                  className={`flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/30 cursor-pointer transition-colors ${
                    selectedEmail?.uid === email.uid ? (folder === "Notification" ? "bg-orange-500/15 border-l-2 border-l-orange-400" : "bg-blue-600/20 border-l-2 border-l-blue-500") : (folder === "Notification" ? "hover:bg-orange-500/5" : "hover:bg-slate-800/50")
                  }`}
                >
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(email.uid); }} className="p-0.5">
                    {selectedIds.includes(email.uid) ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>

                  <div className="w-2 flex-shrink-0">
                    {!email.seen && <Circle className="w-2 h-2 fill-orange-400 text-orange-400" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate ${!email.seen ? "text-white font-medium" : "text-slate-300"}`}>
                        {extractName(email.from)}
                      </span>
                      <span className="text-xs text-slate-500 ml-2">{formatShortDate(email.date)}</span>
                    </div>
                    <p className={`text-xs truncate ${!email.seen ? "text-slate-200" : "text-slate-500"}`}>
                      {email.subject || "(Sin asunto)"}
                    </p>
                  </div>

                  {email.hasAttachment && <Paperclip className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel de lectura */}
        {selectedEmail && (
          <div className="flex-1 flex flex-col overflow-hidden bg-white/95">
            <div className="p-6 border-b border-slate-200 flex-shrink-0 bg-white">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 pr-4">{selectedEmail.subject || "(Sin asunto)"}</h2>
                <button onClick={() => setSelectedEmail(null)} className="p-2 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium flex-shrink-0">
                  {extractName(selectedEmail.from).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-medium">{extractName(selectedEmail.from)}</p>
                  <p className="text-slate-500 text-sm truncate">{selectedEmail.from}</p>
                  <p className="text-slate-400 text-xs mt-1">Para: {selectedEmail.to}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-slate-500 text-sm">{formatDate(selectedEmail.date)}</p>
                  <button onClick={() => toggleRead(selectedEmail.uid)} className="text-xs text-blue-600 hover:underline mt-1">
                    {selectedEmail.seen ? "Marcar no leído" : "Marcar leído"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <div className="prose prose-slate max-w-none">
                {loadingContent ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="ml-3 text-slate-500">Cargando contenido...</span>
                    </div>
                  ) : selectedEmail.html ? (
                  <div className="text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedEmail.html }} />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed text-sm">
                    {selectedEmail.body || "Este correo no tiene contenido de texto."}
                  </pre>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex gap-2 flex-shrink-0 bg-slate-50">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                <Mail className="w-4 h-4" />
                Responder
              </button>
              <button className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm font-medium">
                Reenviar
              </button>
              <button 
                onClick={() => deleteEmails([selectedEmail.uid])}
                disabled={deleting}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Redactar */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Nuevo Correo</h3>
              <button onClick={() => setShowCompose(false)} className="p-1.5 rounded hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Para:</label>
                <input type="email" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="destinatario@email.com" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Asunto:</label>
                <input type="text" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Asunto del correo" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mensaje:</label>
                <textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} placeholder="Escribe tu mensaje..." rows={10} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 text-sm resize-none" />
              </div>
              <div>
                <input type="file" ref={fileInputRef} multiple onChange={(e) => setAttachments(Array.from(e.target.files || []))} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-200 text-sm">
                  <Paperclip className="w-4 h-4" />
                  Adjuntar archivos
                </button>
                {attachments.length > 0 && <span className="ml-3 text-sm text-blue-600">{attachments.length} archivo(s)</span>}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              <button onClick={() => setShowCompose(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">Cancelar</button>
              <button onClick={sendEmail} disabled={sending} className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






