"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Inbox, Send, Trash2, RefreshCw, Edit3, X, Search, CheckSquare, Square, Paperclip, Loader2, MailOpen, Circle, LogIn } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [folder, setFolder] = useState("INBOX");
  const [userEmail, setUserEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Auth state
  const [needsAuth, setNeedsAuth] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const email = localStorage.getItem("userEmail");
    if (email) {
      setUserEmail(email);
      setAuthEmail(email);
    }
    // Check if we have credentials
    const creds = sessionStorage.getItem("zohoCreds");
    if (creds) {
      setNeedsAuth(false);
      loadEmails();
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError("");
    
    try {
      // Save credentials and try to load emails
      sessionStorage.setItem("zohoCreds", btoa(JSON.stringify({ e: authEmail.trim(), p: authPass })));
      setNeedsAuth(false);
      await loadEmails();
    } catch (err: any) {
      setError(err.message);
      setNeedsAuth(true);
      sessionStorage.removeItem("zohoCreds");
    } finally {
      setAuthLoading(false);
    }
  };

  const loadEmails = async () => {
    setLoading(true);
    setError("");
    try {
      const creds = sessionStorage.getItem("zohoCreds");
      if (!creds) {
        setNeedsAuth(true);
        return;
      }
      const { e, p } = JSON.parse(atob(creds));
      const res = await fetch("/api/mail/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password: p, folder, limit: 50 }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("credentials") || data.error?.includes("AUTHENTICATIONFAILED")) {
          sessionStorage.removeItem("zohoCreds");
          setNeedsAuth(true);
          throw new Error("Credenciales incorrectas. Ingresa tu contraseña de Zoho.");
        }
        throw new Error(data.error);
      }
      setEmails(data.emails || []);
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.message || "Error al cargar correos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (!needsAuth) loadEmails(); 
  }, [folder]);

  const toggleRead = (uid: number) => {
    setEmails(prev => prev.map(e => e.uid === uid ? { ...e, seen: !e.seen } : e));
    if (selectedEmail?.uid === uid) {
      setSelectedEmail(prev => prev ? { ...prev, seen: !prev.seen } : null);
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
      alert(err.message || "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
  };

  const filteredEmails = emails.filter(e => 
    e.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.from?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auth screen
  if (needsAuth) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 w-full max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Conectar Correo</h2>
              <p className="text-sm text-slate-400">Ingresa tus credenciales de Zoho Mail</p>
            </div>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="tu@gcuavante.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Contraseña de Zoho</label>
              <input
                type="password"
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                placeholder="••••••••"
                required
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {authLoading ? "Conectando..." : "Conectar"}
            </button>
          </form>
          
          <div className="mt-4 flex justify-center">
            <Link href="/dashboard/configuracion" className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Volver a Configuración
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/dashboard/configuracion" className="p-2 hover:bg-white/10 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-lg font-semibold text-white">Bandeja de Correo</h1>
            <p className="text-xs text-slate-400">{userEmail}</p>
          </div>
        </div>
        <button onClick={loadEmails} className="ml-auto p-2 hover:bg-white/10 rounded-lg" title="Actualizar">
          <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 flex-shrink-0 space-y-2">
          <button
            onClick={() => setShowCompose(true)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 font-medium"
          >
            <Edit3 className="w-4 h-4" /> Redactar
          </button>
          
          {[
            { id: "INBOX", label: "Entrada", icon: Inbox },
            { id: "Sent", label: "Enviados", icon: Send },
            { id: "Trash", label: "Papelera", icon: Trash2 },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFolder(f.id)}
              className={`w-full py-2 px-3 rounded-lg flex items-center gap-2 text-left ${
                folder === f.id ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"
              }`}
            >
              <f.icon className="w-4 h-4" /> {f.label}
            </button>
          ))}
        </div>

        {/* Email List & Content */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* List */}
          <div className="w-96 flex-shrink-0 bg-white/5 rounded-xl border border-white/10 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
              ) : error ? (
                <div className="p-4 text-center">
                  <p className="text-red-400 text-sm mb-2">{error}</p>
                  <button onClick={loadEmails} className="text-blue-400 text-sm hover:underline">Reintentar</button>
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="p-4 text-center text-slate-500">No hay correos</div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email.uid}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 ${
                      selectedEmail?.uid === email.uid ? "bg-white/10" : ""
                    } ${!email.seen ? "bg-blue-500/5" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {!email.seen && <Circle className="w-2 h-2 mt-2 text-blue-400 fill-blue-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${!email.seen ? "font-semibold text-white" : "text-slate-300"}`}>
                            {email.from?.split("<")[0]?.trim() || "Sin remitente"}
                          </span>
                          <span className="text-xs text-slate-500 flex-shrink-0">{formatDate(email.date)}</span>
                        </div>
                        <p className={`text-sm truncate ${!email.seen ? "text-slate-200" : "text-slate-400"}`}>
                          {email.subject}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-xl overflow-hidden flex flex-col">
            {selectedEmail ? (
              <>
                <div className="p-4 border-b bg-slate-50">
                  <h2 className="text-lg font-semibold text-slate-800">{selectedEmail.subject}</h2>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-slate-600">{selectedEmail.from}</span>
                    <span className="text-xs text-slate-500">{new Date(selectedEmail.date).toLocaleString("es-MX")}</span>
                  </div>
                </div>
                <div className="flex-1 p-4 overflow-y-auto bg-white">
                  {selectedEmail.html ? (
                    <div 
                      className="prose prose-sm max-w-none text-slate-700"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html }} 
                    />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{selectedEmail.body}</pre>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                Selecciona un correo para leer
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Nuevo Correo</h3>
              <button onClick={() => setShowCompose(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <input
                type="email"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
                placeholder="Para:"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500"
              />
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Asunto:"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500"
              />
              <textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder="Mensaje..."
                rows={10}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 resize-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={sendEmail}
                disabled={sending}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
