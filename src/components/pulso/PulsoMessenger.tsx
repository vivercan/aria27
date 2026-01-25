"use client";
import { useState, useEffect } from "react";
import { X, Send, MessageCircle, Plus, Search } from "lucide-react";

interface Usuario {
  email: string;
  name: string;
  display_name: string;
}

interface Mensaje {
  id: string;
  sender_email: string;
  contenido: string;
  created_at: string;
}

interface Conversacion {
  id: string;
  nombre?: string;
  participantes: string[];
  ultimoMensaje?: Mensaje;
  noLeidos: number;
}

export default function PulsoMessenger({ userEmail, onClose }: { userEmail: string; onClose: () => void }) {
  const [vista, setVista] = useState<"lista" | "chat" | "nuevo">("lista");
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [convActiva, setConvActiva] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchUser, setSearchUser] = useState("");

  useEffect(() => {
    cargarConversaciones();
    cargarUsuarios();
    const interval = setInterval(cargarConversaciones, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (convActiva) {
      cargarMensajes(convActiva.id);
      const interval = setInterval(() => cargarMensajes(convActiva.id), 3000);
      return () => clearInterval(interval);
    }
  }, [convActiva?.id]);

  const cargarConversaciones = async () => {
    try {
      const res = await fetch(`/api/pulso?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      setConversaciones(data.conversaciones || []);
    } catch (e) { console.error(e); }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await fetch("https://yhylkvpynzyorqortbkk.supabase.co/rest/v1/users?select=email,name,display_name", {
        headers: { "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeWxrdnB5bnp5b3Jxb3J0YmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxNjgzOTYsImV4cCI6MjA4MDc0NDM5Nn0.j6R9UeyxJvGUiI5OGSgULYU559dt9lkTeIAxbkeLkIo" }
      });
      const data = await res.json();
      setUsuarios(data.filter((u: Usuario) => u.email !== userEmail));
    } catch (e) { console.error(e); }
  };

  const cargarMensajes = async (convId: string) => {
    try {
      const res = await fetch(`/api/pulso/mensajes?conversacion_id=${convId}&email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      setMensajes(data.mensajes || []);
    } catch (e) { console.error(e); }
  };

  const crearChat = async (otroEmail: string) => {
    try {
      const res = await fetch("/api/pulso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantes: [userEmail, otroEmail], es_grupo: false })
      });
      const data = await res.json();
      await cargarConversaciones();
      const conv = { id: data.conversacion_id, participantes: [userEmail, otroEmail], noLeidos: 0 };
      setConvActiva(conv as Conversacion);
      setVista("chat");
    } catch (e) { console.error(e); }
  };

  const enviarMensaje = async () => {
    if (!nuevoMsg.trim() || !convActiva) return;
    try {
      await fetch("/api/pulso/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacion_id: convActiva.id, sender_email: userEmail, contenido: nuevoMsg.trim(), tipo: "texto" })
      });
      setNuevoMsg("");
      cargarMensajes(convActiva.id);
    } catch (e) { console.error(e); }
  };

  const getNombre = (conv: Conversacion) => {
    if (conv.nombre) return conv.nombre;
    const otro = conv.participantes?.find(p => p !== userEmail);
    const u = usuarios.find(usr => usr.email === otro);
    return u?.display_name || u?.name || otro?.split("@")[0] || "Chat";
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      width: "360px",
      height: "480px",
      backgroundColor: "#1e293b",
      borderRadius: "16px",
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
      border: "1px solid #334155",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: 9999
    }}>
      {/* HEADER */}
      <div style={{ background: "linear-gradient(90deg, #2563eb, #06b6d4)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MessageCircle size={20} color="white" />
          <span style={{ color: "white", fontWeight: 600 }}>ARIA Pulso</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setVista("nuevo")} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}>
            <Plus size={16} color="white" />
          </button>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "6px", padding: "6px", cursor: "pointer" }}>
            <X size={16} color="white" />
          </button>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        {/* LISTA DE CONVERSACIONES */}
        {vista === "lista" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {conversaciones.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                <MessageCircle size={40} style={{ opacity: 0.5, marginBottom: "12px" }} />
                <p>No hay conversaciones</p>
                <button onClick={() => setVista("nuevo")} style={{ marginTop: "12px", color: "#3b82f6", background: "none", border: "none", cursor: "pointer" }}>
                  Iniciar nuevo chat
                </button>
              </div>
            ) : (
              conversaciones.map(conv => (
                <div key={conv.id} onClick={() => { setConvActiva(conv); setVista("chat"); }} style={{ padding: "12px 16px", borderBottom: "1px solid #334155", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600 }}>
                    {getNombre(conv)?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "white", fontWeight: 500, margin: 0 }}>{getNombre(conv)}</p>
                    <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>{conv.ultimoMensaje?.contenido || "Sin mensajes"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* NUEVO CHAT */}
        {vista === "nuevo" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px", borderBottom: "1px solid #334155" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ color: "white", fontWeight: 500 }}>Nuevo Chat</span>
                <button onClick={() => setVista("lista")} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>
              <input type="text" placeholder="Buscar usuario..." value={searchUser} onChange={e => setSearchUser(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "white", outline: "none" }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {usuarios.filter(u => u.email.includes(searchUser.toLowerCase()) || u.display_name?.toLowerCase().includes(searchUser.toLowerCase())).map(u => (
                <div key={u.email} onClick={() => crearChat(u.email)} style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #1e293b" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600 }}>
                    {(u.display_name || u.name)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: "white", fontWeight: 500, margin: 0 }}>{u.display_name || u.name}</p>
                    <p style={{ color: "#94a3b8", fontSize: "12px", margin: 0 }}>{u.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CHAT ACTIVO */}
        {vista === "chat" && convActiva && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={() => { setConvActiva(null); setVista("lista"); }} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "18px" }}>←</button>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600, fontSize: "14px" }}>
                {getNombre(convActiva)?.[0]?.toUpperCase()}
              </div>
              <span style={{ color: "white", fontWeight: 500 }}>{getNombre(convActiva)}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {mensajes.map(msg => (
                <div key={msg.id} style={{ display: "flex", justifyContent: msg.sender_email === userEmail ? "flex-end" : "flex-start", marginBottom: "8px" }}>
                  <div style={{ maxWidth: "75%", padding: "8px 12px", borderRadius: "12px", background: msg.sender_email === userEmail ? "#2563eb" : "#334155", color: "white" }}>
                    <p style={{ margin: 0, fontSize: "14px" }}>{msg.contenido}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "10px", opacity: 0.7, textAlign: "right" }}>{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: "12px", borderTop: "1px solid #334155", display: "flex", gap: "8px" }}>
              <input type="text" value={nuevoMsg} onChange={e => setNuevoMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && enviarMensaje()} placeholder="Escribe un mensaje..." style={{ flex: 1, padding: "10px 14px", background: "#0f172a", border: "1px solid #334155", borderRadius: "20px", color: "white", outline: "none" }} />
              <button onClick={enviarMensaje} disabled={!nuevoMsg.trim()} style={{ padding: "10px", background: "#2563eb", border: "none", borderRadius: "50%", cursor: "pointer", opacity: nuevoMsg.trim() ? 1 : 0.5 }}>
                <Send size={18} color="white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
