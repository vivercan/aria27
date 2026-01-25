"use client";
import { useState, useEffect, useRef } from "react";
import { X, Send, Paperclip, MessageCircle, Plus, Search, Check, CheckCheck, Volume2 } from "lucide-react";

interface Mensaje {
  id: string;
  sender_email: string;
  contenido: string;
  tipo: string;
  archivo_url?: string;
  archivo_nombre?: string;
  created_at: string;
  leido: boolean;
}

interface Conversacion {
  id: string;
  nombre?: string;
  es_grupo: boolean;
  participantes: string[];
  ultimoMensaje?: Mensaje;
  noLeidos: number;
}

interface Usuario {
  email: string;
  name: string;
  display_name: string;
}

export default function PulsoMessenger({ userEmail, onClose }: { userEmail: string; onClose: () => void }) {
  console.log(">>> PULSO COMPONENT MOUNTED, userEmail:", userEmail);
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [convActiva, setConvActiva] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [showNuevoChat, setShowNuevoChat] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Cargar sonido
  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp6agHhxeYOQnZ2VgXRtdICQoJ+XhXdwc4KTpKOcjH15d4CNo5yYjoN7eX+Ij5aZlI2Ff3t9goqRlZONhX98fIGIj5KRjYZ/fHyAhoyQkI2HgX18f4WLj46KhYB8fH+EiY2MiYWAfXx+goiLi4iFgX19foKHioqHhIF9fH6BhomJhoSAfXx+gYaIiIaEgH18fn+EhoeGhIB9fH5/g4WGhYOAfX1+f4OFhYSDgH19fn+ChISEg4B9fX5/goODg4KAfX1+f4KDg4OCgH19fn+Bg4OCgoF+fX5/gYKCgoGAfn1+f4GCgoKBgH59fn+BgoKCgYB+fX5/gYGBgYGAfn5+f4GBgYGAgH5+fn+BgYGBgIB+fn5/gYGBgYCAfn5+f4CAgYGAgH5+fn+AgICAgIB+fn5/gICAgICAfn5+f4CAgICAgH5+fn5/gICAgIB/fn5+f4CAgICAgH9+fn5/f4CAgICAf35+fn9/gICAgIB/fn5+f3+AgICAgH9+fn5/f4CAgICAf35+fn9/f4CAgIB/f35+fn9/gICAgH9/fn5+f3+AgICAf39+fn5/f4CAgIB/f35+fn9/f4CAgH9/fn5+f39/gICAf39+fn5/f3+AgIB/f35+fn9/f4CAgH9/fn5+f39/gIB/f39+fn5/f3+AgH9/f35+fn9/f4CAf39/fn5+f39/gIB/f39+fn5/f3+AgH9/f35+fn9/f4CAf39/fn5+f39/f4B/f39+fn9/f39/gH9/f35+f39/f3+Af39/fn5/f39/f4B/f39+fn9/f39/gH9/f35+f39/f3+Af39/fn5/f39/f4B/f39/fn9/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/");
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Cargar conversaciones
  const cargarConversaciones = async () => {
    const res = await fetch(`/api/pulso?email=${encodeURIComponent(userEmail)}`);
    const data = await res.json();
    setConversaciones(data.conversaciones || []);
  };

  // Cargar usuarios para nuevo chat
  const cargarUsuarios = async () => {
    const res = await fetch("https://yhylkvpynzyorqortbkk.supabase.co/rest/v1/users?select=email,name,display_name&active=eq.true", {
      headers: { "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo" }
    });
    const data = await res.json();
    setUsuarios(data.filter((u: Usuario) => u.email !== userEmail));
  };

  useEffect(() => {
    cargarConversaciones();
    cargarUsuarios();
    // Polling cada 3 segundos
    pollRef.current = setInterval(cargarConversaciones, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [userEmail]);

  // Cargar mensajes de conversación activa
  const cargarMensajes = async (convId: string) => {
    const res = await fetch(`/api/pulso/mensajes?conversacion_id=${convId}&email=${encodeURIComponent(userEmail)}`);
    const data = await res.json();
    const nuevosMensajes = data.mensajes || [];
    
    // Reproducir sonido si hay nuevos mensajes de otros
    if (mensajes.length > 0 && nuevosMensajes.length > mensajes.length) {
      const ultimo = nuevosMensajes[nuevosMensajes.length - 1];
      if (ultimo.sender_email !== userEmail) {
        audioRef.current?.play().catch(() => {});
      }
    }
    
    setMensajes(nuevosMensajes);
  };

  useEffect(() => {
    if (convActiva) {
      cargarMensajes(convActiva.id);
      const interval = setInterval(() => cargarMensajes(convActiva.id), 2000);
      return () => clearInterval(interval);
    }
  }, [convActiva?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  // Crear nueva conversación
  const crearChat = async (otroEmail: string) => {
    setLoading(true);
    const res = await fetch("/api/pulso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantes: [userEmail, otroEmail], es_grupo: false })
    });
    const data = await res.json();
    await cargarConversaciones();
    
    const conv = conversaciones.find(c => c.id === data.conversacion_id) || {
      id: data.conversacion_id,
      participantes: [userEmail, otroEmail],
      es_grupo: false,
      noLeidos: 0
    };
    setConvActiva(conv as Conversacion);
    setShowNuevoChat(false);
    setLoading(false);
  };

  // Enviar mensaje
  const enviarMensaje = async () => {
    if (!nuevoMsg.trim() || !convActiva) return;
    
    const res = await fetch("/api/pulso/mensajes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversacion_id: convActiva.id,
        sender_email: userEmail,
        contenido: nuevoMsg.trim(),
        tipo: "texto"
      })
    });
    
    if (res.ok) {
      setNuevoMsg("");
      cargarMensajes(convActiva.id);
    }
  };

  const getNombre = (conv: Conversacion) => {
    if (conv.nombre) return conv.nombre;
    const otro = conv.participantes?.find(p => p !== userEmail);
    const usuario = usuarios.find(u => u.email === otro);
    return usuario?.display_name || usuario?.name || otro?.split("@")[0] || "Chat";
  };

  const getInitial = (email: string) => {
    const u = usuarios.find(usr => usr.email === email);
    return (u?.display_name || u?.name || email)?.[0]?.toUpperCase() || "?";
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="fixed bottom-4 right-4 w-[380px] h-[500px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 flex flex-col overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-white" />
          <span className="text-white font-semibold">ARIA Pulso</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNuevoChat(true)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <Plus className="w-4 h-4 text-white" />
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Nuevo Chat Modal */}
      {showNuevoChat && (
        <div className="absolute inset-0 bg-slate-900/95 z-10 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-medium">Nuevo Chat</span>
              <button onClick={() => setShowNuevoChat(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {usuarios.filter(u => 
              u.email.includes(searchUser.toLowerCase()) || 
              u.display_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
              u.name?.toLowerCase().includes(searchUser.toLowerCase())
            ).map(u => (
              <button
                key={u.email}
                onClick={() => crearChat(u.email)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                  {(u.display_name || u.name)?.[0]?.toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-white text-sm font-medium">{u.display_name || u.name}</p>
                  <p className="text-slate-400 text-xs">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Lista de conversaciones */}
        {!convActiva && (
          <div className="flex-1 overflow-y-auto">
            {conversaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
                <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No hay conversaciones</p>
                <button onClick={() => setShowNuevoChat(true)} className="mt-3 text-blue-400 text-sm hover:underline">
                  Iniciar nuevo chat
                </button>
              </div>
            ) : (
              conversaciones.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setConvActiva(conv)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-800/50 border-b border-slate-800 transition-colors"
                >
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-semibold">
                      {getNombre(conv)?.[0]?.toUpperCase()}
                    </div>
                    {conv.noLeidos > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                        {conv.noLeidos}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-sm font-medium truncate">{getNombre(conv)}</p>
                    <p className="text-slate-400 text-xs truncate">
                      {conv.ultimoMensaje?.contenido || "Sin mensajes"}
                    </p>
                  </div>
                  {conv.ultimoMensaje && (
                    <span className="text-slate-500 text-xs">{formatTime(conv.ultimoMensaje.created_at)}</span>
                  )}
                </button>
              ))
            )}
          </div>
        )}

        {/* Chat activo */}
        {convActiva && (
          <div className="flex-1 flex flex-col">
            {/* Header del chat */}
            <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center gap-3">
              <button onClick={() => setConvActiva(null)} className="text-slate-400 hover:text-white">
                ←
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-semibold">
                {getNombre(convActiva)?.[0]?.toUpperCase()}
              </div>
              <span className="text-white font-medium text-sm">{getNombre(convActiva)}</span>
            </div>

            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {mensajes.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_email === userEmail ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                    msg.sender_email === userEmail 
                      ? "bg-blue-600 text-white rounded-br-md" 
                      : "bg-slate-700 text-white rounded-bl-md"
                  }`}>
                    <p className="text-sm">{msg.contenido}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] opacity-70">{formatTime(msg.created_at)}</span>
                      {msg.sender_email === userEmail && (
                        msg.leido ? <CheckCheck className="w-3 h-3 text-cyan-300" /> : <Check className="w-3 h-3 opacity-70" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-700 bg-slate-800/30">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nuevoMsg}
                  onChange={(e) => setNuevoMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-full text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={enviarMensaje}
                  disabled={!nuevoMsg.trim()}
                  className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

