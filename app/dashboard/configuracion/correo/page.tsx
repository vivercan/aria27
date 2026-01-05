"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Inbox, Send, Trash2, RefreshCw, Edit3, X, Search, CheckSquare, Square, Paperclip, Loader2, MailOpen, Circle } from "lucide-react";

interface Email {
  seqno: number;
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  seen: boolean;
  flags: string[];
  hasAttachment?: boolean;
}

export default function CorreoPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [folder, setFolder] = useState("INBOX");
  const [userEmail, setUserEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
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

  const toggleRead = (uid: number) => {
    setEmails(prev => prev.map(e => e.uid === uid ? { ...e, seen: !e.seen } : e));
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

  const decodeSubject = (subject: string) => {
    if (!subject) return "(Sin asunto)";
    return subject.replace(/=\?utf-8\?[BQ]\?([^?]+)\?=/gi, (_, encoded) => {
      try { return atob(encoded); } catch { return encoded; }
    }).replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  };

  const toggleSelect = (uid: number) => {
    setSelectedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const selectAll = () => {
    setSelectedIds(selectedIds.length === filteredEmails.length ? [] : filteredEmails.map(e => e.uid));
  };

  const filteredEmails = emails.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.from?.toLowerCase().includes(term) || e.subject?.toLowerCase().includes(term);
  });

  const folders = [
    { name: "INBOX", label: "Entrada", icon: Inbox },
    { name: "Sent", label: "Enviados", icon: Send },
    { name: "Trash", label: "Papelera", icon: Trash2 },
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-[#0d1a2d]">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
        <Link href="/dashboard/configuracion" className="p-2 rounded-lg hover:bg-white/5">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <Mail className="w-6 h-6 text-blue-400" />
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">Bandeja de Correo</h1>
          <p className="text-slate-400 text-sm">{userEmail}</p>
        </div>
        <button onClick={loadEmails} disabled={loading} className="p-2 rounded-lg hover:bg-white/5 disabled:opacity-50">
          <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-52 border-r border-slate-700/50 p-4 flex flex-col flex-shrink-0">
          <button onClick={() => setShowCompose(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 mb-5 font-medium text-sm">
            <Edit3 className="w-4 h-4" />
            Redactar
          </button>
          
          <div className="space-y-1">
            {folders.map((f) => (
              <button key={f.name} onClick={() => { setFolder(f.name); setSelectedEmail(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${folder === f.name ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-slate-300"}`}>
                <f.icon className="w-4 h-4" />
                {f.label}
                {f.name === "INBOX" && emails.filter(e => !e.seen).length > 0 && (
                  <span className="ml-auto text-xs bg-orange-500/80 text-white px-1.5 py-0.5 rounded font-medium">
                    {emails.filter(e => !e.seen).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center gap-3 flex-shrink-0">
            <button onClick={selectAll} className="p-1.5 rounded hover:bg-white/5">
              {selectedIds.length === filteredEmails.length && filteredEmails.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
            </button>
            
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 text-sm"
              />
            </div>

            {selectedIds.length > 0 && (
              <>
                <button onClick={() => selectedIds.forEach(id => toggleRead(id))} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 hover:bg-white/5 rounded-lg text-sm">
                  <MailOpen className="w-4 h-4" />
                  Marcar leído
                </button>
                <button onClick={() => alert(`Para eliminar, usa Zoho Mail.`)} className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-sm">
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </>
            )}
          </div>

          {/* Lista de correos */}
          {error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={loadEmails} className="px-4 py-2 bg-blue-600 rounded-lg text-white text-sm">Reintentar</button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              No hay correos
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredEmails.map((email, idx) => (
                <div 
                  key={email.uid || idx} 
                  onClick={() => setSelectedEmail(email)}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-slate-700/30 cursor-pointer transition-colors ${
                    selectedEmail?.uid === email.uid ? "bg-blue-500/10" : idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"
                  } hover:bg-white/5`}
                >
                  {/* Checkbox */}
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(email.uid); }} className="p-1">
                    {selectedIds.includes(email.uid) ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-600" />
                    )}
                  </button>

                  {/* Indicador no leído */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleRead(email.uid); }}
                    className="p-1"
                    title={email.seen ? "Marcar como no leído" : "Marcar como leído"}
                  >
                    {!email.seen ? (
                      <Circle className="w-3 h-3 fill-orange-400 text-orange-400" />
                    ) : (
                      <Circle className="w-3 h-3 text-slate-600" />
                    )}
                  </button>

                  {/* Remitente */}
                  <div className="w-48 flex-shrink-0">
                    <span className={`text-sm truncate block ${!email.seen ? "text-white font-medium" : "text-slate-300"}`}>
                      {extractName(email.from)}
                    </span>
                  </div>

                  {/* Asunto */}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm truncate block ${!email.seen ? "text-slate-100" : "text-slate-400"}`}>
                      {decodeSubject(email.subject)}
                    </span>
                  </div>

                  {/* Adjuntos */}
                  {email.hasAttachment && <Paperclip className="w-4 h-4 text-slate-500 flex-shrink-0" />}

                  {/* Fecha */}
                  <div className="w-16 text-right flex-shrink-0">
                    <span className="text-xs text-slate-500">{formatDate(email.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        {selectedEmail && (
          <div className="w-96 border-l border-slate-700/50 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex-shrink-0">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-base font-medium text-white pr-4 leading-snug">{decodeSubject(selectedEmail.subject)}</h2>
                <button onClick={() => setSelectedEmail(null)} className="p-1.5 rounded hover:bg-white/5">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              <div className="space-y-1.5 text-sm">
                <p><span className="text-slate-500">De:</span> <span className="text-slate-300">{selectedEmail.from}</span></p>
                <p><span className="text-slate-500">Para:</span> <span className="text-slate-300">{selectedEmail.to}</span></p>
                <p><span className="text-slate-500">Fecha:</span> <span className="text-slate-300">{selectedEmail.date}</span></p>
              </div>
            </div>
            <div className="flex-1 p-5 overflow-y-auto">
              <p className="text-slate-500 text-sm mb-5">Para ver el contenido completo, abre en Zoho Mail.</p>
              <div className="space-y-2">
                <a href="https://mail.zoho.com" target="_blank" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  <Mail className="w-4 h-4" />
                  Abrir en Zoho
                </a>
                <button 
                  onClick={() => toggleRead(selectedEmail.uid)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 text-sm"
                >
                  <MailOpen className="w-4 h-4" />
                  {selectedEmail.seen ? "Marcar no leído" : "Marcar leído"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Redactar */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1e32] rounded-xl w-full max-w-xl border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
              <h3 className="text-base font-medium text-white">Nuevo Correo</h3>
              <button onClick={() => setShowCompose(false)} className="p-1.5 rounded hover:bg-white/5">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Para:</label>
                <input type="email" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} placeholder="destinatario@email.com" className="w-full px-3 py-2.5 bg-white/5 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Asunto:</label>
                <input type="text" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} placeholder="Asunto" className="w-full px-3 py-2.5 bg-white/5 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Mensaje:</label>
                <textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} placeholder="Escribe tu mensaje..." rows={6} className="w-full px-3 py-2.5 bg-white/5 border border-slate-600/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 text-sm resize-none" />
              </div>
              <div>
                <input type="file" ref={fileInputRef} multiple onChange={(e) => setAttachments(Array.from(e.target.files || []))} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-slate-600/50 rounded-lg text-slate-400 hover:bg-white/10 text-sm">
                  <Paperclip className="w-4 h-4" />
                  Adjuntar
                </button>
                {attachments.length > 0 && <span className="ml-2 text-sm text-orange-400">{attachments.length} archivo(s)</span>}
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-700/50">
              <button onClick={() => setShowCompose(false)} className="px-4 py-2 text-slate-400 hover:bg-white/5 rounded-lg text-sm">Cancelar</button>
              <button onClick={sendEmail} disabled={sending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
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
