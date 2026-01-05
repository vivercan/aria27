"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Inbox, Send, Trash2, RefreshCw, Edit3, X, Search, CheckSquare, Square } from "lucide-react";

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
      .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/Ã³/g, "ó").replace(/Ã©/g, "é").replace(/Ãº/g, "ú").replace(/Ã±/g, "ñ");
  };

  const toggleSelect = (uid: number) => {
    setSelectedIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
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
    return (
      e.from?.toLowerCase().includes(term) ||
      e.subject?.toLowerCase().includes(term) ||
      extractName(e.from).toLowerCase().includes(term)
    );
  });

  const folders = [
    { name: "INBOX", label: "Entrada", icon: Inbox, color: "text-blue-400" },
    { name: "Sent", label: "Enviados", icon: Send, color: "text-green-400" },
    { name: "Trash", label: "Papelera", icon: Trash2, color: "text-red-400" },
  ];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-white/10 flex-shrink-0">
        <Link href="/dashboard/configuracion" className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-400" />
        </Link>
        <div className="p-3 rounded-xl bg-blue-500/20">
          <Mail className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Bandeja de Correo</h1>
          <p className="text-slate-400 text-sm">{userEmail || "Zoho Mail"}</p>
        </div>
        <button onClick={loadEmails} disabled={loading} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar carpetas */}
        <div className="w-52 border-r border-white/10 p-3 flex flex-col flex-shrink-0">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-colors mb-4 font-medium">
            <Edit3 className="w-4 h-4" />
            Redactar
          </button>
          
          <div className="space-y-1">
            {folders.map((f) => (
              <button key={f.name} onClick={() => { setFolder(f.name); setSelectedEmail(null); setSearchTerm(""); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${folder === f.name ? "bg-blue-500/20 text-white font-medium" : "text-slate-300 hover:bg-white/5"}`}>
                <f.icon className={`w-4 h-4 ${folder === f.name ? f.color : "text-slate-400"}`} />
                {f.label}
                {f.name === "INBOX" && emails.filter(e => !e.seen).length > 0 && (
                  <span className="ml-auto text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {emails.filter(e => !e.seen).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de correos */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          {/* Barra de búsqueda y acciones */}
          <div className="p-3 border-b border-white/10 flex items-center gap-3 flex-shrink-0 bg-slate-900/50">
            <button onClick={selectAll} className="p-2 rounded-lg hover:bg-white/10 transition-colors" title="Seleccionar todos">
              {selectedIds.length === filteredEmails.length && filteredEmails.length > 0 ? (
                <CheckSquare className="w-5 h-5 text-blue-400" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
            </button>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar correos..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 text-sm"
              />
            </div>

            {selectedIds.length > 0 && (
              <button 
                onClick={() => alert(`Para eliminar ${selectedIds.length} correo(s), usa Zoho Mail directamente.`)}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar ({selectedIds.length})
              </button>
            )}
          </div>

          {/* Lista */}
          {error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center p-6 rounded-2xl bg-red-500/10 border border-red-500/20 max-w-md">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={loadEmails} className="px-4 py-2 bg-blue-500 rounded-lg text-white hover:bg-blue-600">Reintentar</button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-3" />
                <p className="text-slate-400">Cargando correos...</p>
              </div>
            </div>
          ) : filteredEmails.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Inbox className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{searchTerm ? "No se encontraron correos" : "No hay correos en esta carpeta"}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredEmails.map((email, idx) => (
                <div 
                  key={email.uid || idx} 
                  className={`flex items-center gap-3 px-4 py-3 border-b border-white/10 cursor-pointer transition-all ${selectedEmail?.uid === email.uid ? "bg-blue-500/20" : "hover:bg-slate-800/50"} ${!email.seen ? "bg-slate-800/30" : ""}`}
                >
                  {/* Checkbox */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleSelect(email.uid); }}
                    className="p-1 rounded hover:bg-white/10 flex-shrink-0"
                  >
                    {selectedIds.includes(email.uid) ? (
                      <CheckSquare className="w-5 h-5 text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>

                  {/* Contenido del correo */}
                  <div 
                    onClick={() => setSelectedEmail(email)}
                    className="flex-1 flex items-center gap-3 min-w-0"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                      {extractName(email.from).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm truncate ${!email.seen ? "font-bold text-white" : "font-medium text-slate-200"}`}>
                          {extractName(email.from)}
                        </span>
                        <span className="text-xs text-slate-400 ml-3 flex-shrink-0">{formatDate(email.date)}</span>
                      </div>
                      <p className={`text-sm truncate ${!email.seen ? "text-slate-100 font-medium" : "text-slate-400"}`}>
                        {decodeSubject(email.subject)}
                      </p>
                    </div>
                    {!email.seen && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>

                  {/* Botón borrar individual */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); alert("Para borrar, usa Zoho Mail directamente."); }}
                    className="p-2 rounded-lg hover:bg-red-500/20 transition-all flex-shrink-0"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preview panel */}
        {selectedEmail && (
          <div className="w-[400px] border-l border-white/10 flex flex-col flex-shrink-0 bg-slate-900/30 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex-shrink-0">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-base font-bold text-white pr-4 leading-tight">{decodeSubject(selectedEmail.subject)}</h2>
                <button onClick={() => setSelectedEmail(null)} className="p-1.5 rounded-lg hover:bg-white/10 flex-shrink-0">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0">
                  {extractName(selectedEmail.from).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{extractName(selectedEmail.from)}</p>
                  <p className="text-xs text-slate-400 truncate">{selectedEmail.from}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="text-sm space-y-2 mb-4">
                <p className="text-slate-300"><span className="text-slate-500">Para:</span> {selectedEmail.to}</p>
                <p className="text-slate-300"><span className="text-slate-500">Fecha:</span> {selectedEmail.date}</p>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-slate-400 text-sm mb-4">
                  Para ver el contenido completo, abre en Zoho Mail.
                </p>
                <div className="flex flex-col gap-2">
                  <a href="https://mail.zoho.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                    <Mail className="w-4 h-4" />
                    Abrir en Zoho Mail
                  </a>
                  <button 
                    onClick={() => alert("Para borrar, usa Zoho Mail directamente.")}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar correo
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
