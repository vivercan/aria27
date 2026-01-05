"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Inbox, Send, Trash2, RefreshCw, Edit3, X, Search, CheckSquare, Square, Paperclip, Loader2 } from "lucide-react";

interface Email {
  seqno: number;
  uid: number;
  from: string;
  to: string;
  subject: string;
  date: string;
  seen: boolean;
  flags: string[];
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
  
  // Compose modal
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
        body: JSON.stringify({
          email: e,
          password: p,
          to: composeTo,
          subject: composeSubject,
          body: composeBody,
        }),
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
      return d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
    } catch { return dateStr?.substring(0, 16) || ""; }
  };

  const extractName = (from: string) => {
    if (!from) return "Desconocido";
    const match = from.match(/^([^<]+)/);
    return match ? match[1].trim().replace(/"/g, "") : from.split("@")[0];
  };

  const decodeSubject = (subject: string) => {
    if (!subject) return "(Sin asunto)";
    return subject
      .replace(/=\?utf-8\?[BQ]\?([^?]+)\?=/gi, (_, encoded) => {
        try { return atob(encoded); } catch { return encoded; }
      })
      .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  };

  const toggleSelect = (uid: number) => {
    setSelectedIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const selectAll = () => {
    if (selectedIds.length === filteredEmails.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmails.map(e => e.uid));
    }
  };

  const filteredEmails = emails.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.from?.toLowerCase().includes(term) || e.subject?.toLowerCase().includes(term);
  });

  const folders = [
    { name: "INBOX", label: "Entrada", icon: Inbox, color: "text-cyan-400" },
    { name: "Sent", label: "Enviados", icon: Send, color: "text-emerald-400" },
    { name: "Trash", label: "Papelera", icon: Trash2, color: "text-red-400" },
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-700 flex-shrink-0 bg-slate-900">
        <Link href="/dashboard/configuracion" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </Link>
        <div className="p-3 rounded-xl bg-cyan-500/20 border border-cyan-500/30">
          <Mail className="w-6 h-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Bandeja de Correo</h1>
          <p className="text-cyan-400 text-sm font-medium">{userEmail || "Zoho Mail"}</p>
        </div>
        <button onClick={loadEmails} disabled={loading} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-5 h-5 text-slate-300 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex" style={{ minHeight: 0, overflow: "hidden" }}>
        {/* Sidebar */}
        <div className="w-56 border-r border-slate-700 p-4 flex flex-col flex-shrink-0 bg-slate-900/50">
          <button 
            onClick={() => setShowCompose(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 transition-all mb-5 font-semibold shadow-lg shadow-cyan-500/25"
          >
            <Edit3 className="w-5 h-5" />
            Redactar
          </button>
          
          <div className="space-y-2">
            {folders.map((f) => (
              <button key={f.name} onClick={() => { setFolder(f.name); setSelectedEmail(null); setSearchTerm(""); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${folder === f.name ? "bg-slate-700 text-white font-semibold border border-slate-600" : "text-slate-300 hover:bg-slate-800"}`}>
                <f.icon className={`w-5 h-5 ${folder === f.name ? f.color : "text-slate-500"}`} />
                {f.label}
                {f.name === "INBOX" && emails.filter(e => !e.seen).length > 0 && (
                  <span className="ml-auto text-xs bg-cyan-500 text-white px-2 py-1 rounded-full font-bold">
                    {emails.filter(e => !e.seen).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 flex flex-col" style={{ minHeight: 0, minWidth: 0, overflow: "hidden" }}>
          {/* Barra de búsqueda */}
          <div className="p-4 border-b border-slate-700 flex items-center gap-3 flex-shrink-0 bg-slate-800/50">
            <button onClick={selectAll} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
              {selectedIds.length === filteredEmails.length && filteredEmails.length > 0 ? (
                <CheckSquare className="w-5 h-5 text-cyan-400" />
              ) : (
                <Square className="w-5 h-5 text-slate-500" />
              )}
            </button>
            
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar correos..."
                className="w-full pl-12 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
              />
            </div>

            {selectedIds.length > 0 && (
              <button 
                onClick={() => alert(`Para eliminar ${selectedIds.length} correo(s), usa Zoho Mail.`)}
                className="flex items-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors text-sm font-semibold border border-red-500/30"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar ({selectedIds.length})
              </button>
            )}
          </div>

          {/* Lista de correos */}
          {error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-8 rounded-2xl bg-red-500/10 border border-red-500/30 max-w-md">
                <p className="text-red-400 mb-4 font-medium">{error}</p>
                <button onClick={loadEmails} className="px-6 py-2.5 bg-cyan-500 rounded-xl text-white font-semibold hover:bg-cyan-600">Reintentar</button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-400 font-medium">Cargando correos...</p>
              </div>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Inbox className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400 font-medium">{searchTerm ? "No se encontraron correos" : "No hay correos"}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1" style={{ overflowY: "auto", overflowX: "hidden" }}>
              {filteredEmails.map((email, idx) => (
                <div 
                  key={email.uid || idx} 
                  className={`flex items-center gap-3 px-4 py-4 border-b border-slate-700/50 cursor-pointer transition-all ${selectedEmail?.uid === email.uid ? "bg-cyan-500/10 border-l-4 border-l-cyan-500" : "hover:bg-slate-800/70"} ${!email.seen ? "bg-slate-800/40" : ""}`}
                >
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(email.uid); }} className="p-1 rounded flex-shrink-0">
                    {selectedIds.includes(email.uid) ? (
                      <CheckSquare className="w-5 h-5 text-cyan-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                    )}
                  </button>

                  <div onClick={() => setSelectedEmail(email)} className="flex-1 flex items-center gap-4 min-w-0">
                    <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {extractName(email.from).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm truncate ${!email.seen ? "font-bold text-white" : "font-medium text-slate-200"}`}>
                          {extractName(email.from)}
                        </span>
                        <span className="text-xs text-slate-500 ml-3 flex-shrink-0 font-medium">{formatDate(email.date)}</span>
                      </div>
                      <p className={`text-sm truncate ${!email.seen ? "text-slate-200 font-medium" : "text-slate-400"}`}>
                        {decodeSubject(email.subject)}
                      </p>
                    </div>
                    {!email.seen && <div className="w-3 h-3 rounded-full bg-cyan-400 flex-shrink-0 shadow-lg shadow-cyan-400/50" />}
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); alert("Para borrar, usa Zoho Mail."); }}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-slate-600 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview */}
        {selectedEmail && (
          <div className="w-[420px] border-l border-slate-700 flex flex-col flex-shrink-0 bg-slate-900/50" style={{ overflow: "hidden" }}>
            <div className="p-5 border-b border-slate-700 flex-shrink-0">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-lg font-bold text-white pr-4">{decodeSubject(selectedEmail.subject)}</h2>
                <button onClick={() => setSelectedEmail(null)} className="p-2 rounded-lg hover:bg-slate-700">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg">
                  {extractName(selectedEmail.from).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold">{extractName(selectedEmail.from)}</p>
                  <p className="text-xs text-slate-400 truncate">{selectedEmail.from}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 p-5" style={{ overflowY: "auto" }}>
              <div className="text-sm space-y-2 mb-5">
                <p className="text-slate-300"><span className="text-slate-500">Para:</span> {selectedEmail.to}</p>
                <p className="text-slate-300"><span className="text-slate-500">Fecha:</span> {selectedEmail.date}</p>
              </div>
              <div className="pt-5 border-t border-slate-700">
                <p className="text-slate-400 text-sm mb-5">Para ver el contenido completo, abre en Zoho Mail.</p>
                <div className="flex flex-col gap-3">
                  <a href="https://mail.zoho.com" target="_blank" className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 font-semibold">
                    <Mail className="w-5 h-5" />
                    Abrir en Zoho
                  </a>
                  <button onClick={() => alert("Para borrar, usa Zoho Mail.")} className="flex items-center justify-center gap-2 px-5 py-3 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 font-semibold border border-red-500/30">
                    <Trash2 className="w-5 h-5" />
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Redactar */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-2xl border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">Nuevo Correo</h3>
              <button onClick={() => setShowCompose(false)} className="p-2 rounded-lg hover:bg-slate-700">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Para:</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="destinatario@email.com"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Asunto:</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Asunto del correo"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Mensaje:</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Escribe tu mensaje..."
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>
              <div>
                <input type="file" ref={fileInputRef} multiple onChange={(e) => setAttachments(Array.from(e.target.files || []))} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 hover:bg-slate-700">
                  <Paperclip className="w-4 h-4" />
                  Adjuntar archivos
                </button>
                {attachments.length > 0 && (
                  <div className="mt-2 text-sm text-cyan-400">{attachments.length} archivo(s) seleccionado(s)</div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-slate-700">
              <button onClick={() => setShowCompose(false)} className="px-6 py-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-600 font-medium">
                Cancelar
              </button>
              <button onClick={sendEmail} disabled={sending} className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 font-semibold disabled:opacity-50">
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
