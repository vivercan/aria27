"use client";
import { useState, useEffect, useRef } from "react";
import { X, Send, MessageCircle, Minus, Users, Circle } from "lucide-react";

interface Usuario {
  email: string;
  name: string;
  display_name: string;
  lastSeen?: string;
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
  const [vista, setVista] = useState<"contactos" | "chat">("contactos");
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [convActiva, setConvActiva] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [minimizado, setMinimizado] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sonido MSN
  useEffect(() => {
    audioRef.current = new Audio("data:audio/wav;base64,UklGRl9vT19teleGVzdBQFVF");
  }, []);

  useEffect(() => {
    cargarConversaciones();
    cargarUsuarios();
    const interval = setInterval(() => { cargarConversaciones(); cargarUsuarios(); }, 5000);
    return () => clearInterval(interval);
  }, []);

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
      const nuevosMsgs = data.mensajes || [];
      if (mensajes.length > 0 && nuevosMsgs.length > mensajes.length) {
        const ultimo = nuevosMsgs[nuevosMsgs.length - 1];
        if (ultimo.sender_email !== userEmail) {
          audioRef.current?.play().catch(() => {});
        }
      }
      setMensajes(nuevosMsgs);
    } catch (e) { console.error(e); }
  };

  const abrirChat = async (otroEmail: string) => {
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

  const getNombre = (email: string) => {
    const u = usuarios.find(usr => usr.email === email);
    return u?.display_name || u?.name || email?.split("@")[0] || "Usuario";
  };

  const getConvNombre = (conv: Conversacion) => {
    if (conv.nombre) return conv.nombre;
    const otro = conv.participantes?.find(p => p !== userEmail);
    return getNombre(otro || "");
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  
  const isOnline = () => true; // Simular que todos están en línea

  if (minimizado) {
    return (
      <div onClick={() => setMinimizado(false)} style={{
        position: "fixed", bottom: "20px", right: "20px", width: "200px", height: "36px",
        background: "linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)",
        borderRadius: "4px 4px 0 0", cursor: "pointer", display: "flex", alignItems: "center",
        padding: "0 10px", gap: "8px", boxShadow: "0 -2px 10px rgba(0,0,0,0.3)", zIndex: 9999
      }}>
        <MessageCircle size={16} color="white" />
        <span style={{ color: "white", fontSize: "12px", fontWeight: 500 }}>ARIA Pulso</span>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: "20px", right: "20px", width: "280px", height: "420px",
      background: "#f0f0f0", borderRadius: "8px 8px 0 0",
      boxShadow: "0 0 20px rgba(0,0,0,0.3)", border: "1px solid #0078d7",
      display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 9999,
      fontFamily: "Segoe UI, Tahoma, sans-serif"
    }}>
      {/* BARRA DE TÍTULO MSN */}
      <div style={{
        background: "linear-gradient(180deg, #0078d7 0%, #0063b1 100%)",
        padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MessageCircle size={14} color="white" />
          <span style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>ARIA Pulso</span>
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          <button onClick={() => setMinimizado(true)} style={{ width: "20px", height: "20px", background: "#0078d7", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "2px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Minus size={10} color="white" />
          </button>
          <button onClick={onClose} style={{ width: "20px", height: "20px", background: "#c42b1c", border: "none", borderRadius: "2px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={10} color="white" />
          </button>
        </div>
      </div>

      {/* MI PERFIL */}
      <div style={{ background: "linear-gradient(180deg, #e8f4fd 0%, #d4e8f8 100%)", padding: "10px", borderBottom: "1px solid #b8d4e8", display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "4px", background: "linear-gradient(135deg, #0078d7, #00bcf2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "16px", border: "2px solid white", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
            {userEmail?.[0]?.toUpperCase()}
          </div>
          <Circle size={10} fill="#00cc00" color="#00cc00" style={{ position: "absolute", bottom: "-2px", right: "-2px" }} />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#333" }}>{getNombre(userEmail) || userEmail?.split("@")[0]}</p>
          <p style={{ margin: 0, fontSize: "11px", color: "#0078d7" }}>🟢 Disponible</p>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "white" }}>
        
        {/* LISTA DE CONTACTOS */}
        {vista === "contactos" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Sección: En línea */}
            <div style={{ padding: "8px 12px", background: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Users size={12} color="#666" />
                <span style={{ fontSize: "11px", color: "#666", fontWeight: 600 }}>Contactos ({usuarios.length})</span>
              </div>
            </div>
            
            {usuarios.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#888" }}>
                <p style={{ fontSize: "12px" }}>No hay contactos disponibles</p>
              </div>
            ) : (
              usuarios.map(u => {
                const conv = conversaciones.find(c => c.participantes?.includes(u.email));
                const noLeidos = conv?.noLeidos || 0;
                return (
                  <div key={u.email} onClick={() => abrirChat(u.email)} style={{
                    padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px",
                    borderBottom: "1px solid #f0f0f0", background: noLeidos > 0 ? "#fff8dc" : "white"
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#e8f4fd")}
                  onMouseLeave={e => (e.currentTarget.style.background = noLeidos > 0 ? "#fff8dc" : "white")}
                  >
                    <div style={{ position: "relative" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "4px", background: "linear-gradient(135deg, #6b7280, #9ca3af)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600, fontSize: "13px" }}>
                        {(u.display_name || u.name)?.[0]?.toUpperCase()}
                      </div>
                      <Circle size={8} fill={isOnline() ? "#00cc00" : "#888"} color={isOnline() ? "#00cc00" : "#888"} style={{ position: "absolute", bottom: "-1px", right: "-1px" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "12px", fontWeight: 500, color: "#333" }}>{u.display_name || u.name}</p>
                      <p style={{ margin: 0, fontSize: "10px", color: isOnline() ? "#00aa00" : "#888" }}>
                        {isOnline() ? "En línea" : "Desconectado"}
                      </p>
                    </div>
                    {noLeidos > 0 && (
                      <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#ff6600", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "white", fontSize: "10px", fontWeight: 700 }}>{noLeidos}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VENTANA DE CHAT */}
        {vista === "chat" && convActiva && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Header del chat */}
            <div style={{ padding: "8px 10px", background: "linear-gradient(180deg, #e8f4fd 0%, #d4e8f8 100%)", borderBottom: "1px solid #b8d4e8", display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={() => { setConvActiva(null); setVista("contactos"); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#0078d7" }}>◀</button>
              <div style={{ width: "28px", height: "28px", borderRadius: "4px", background: "linear-gradient(135deg, #0078d7, #00bcf2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600, fontSize: "12px" }}>
                {getConvNombre(convActiva)?.[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#333" }}>{getConvNombre(convActiva)}</p>
                <p style={{ margin: 0, fontSize: "10px", color: "#00aa00" }}>En línea</p>
              </div>
            </div>

            {/* Mensajes */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px", background: "#ffffff" }}>
              {mensajes.map(msg => (
                <div key={msg.id} style={{ marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", flexDirection: msg.sender_email === userEmail ? "row-reverse" : "row" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "3px", background: msg.sender_email === userEmail ? "#0078d7" : "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "10px", fontWeight: 600, flexShrink: 0 }}>
                      {getNombre(msg.sender_email)?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ maxWidth: "70%" }}>
                      <p style={{ margin: "0 0 2px", fontSize: "10px", color: msg.sender_email === userEmail ? "#0078d7" : "#666", fontWeight: 600 }}>
                        {msg.sender_email === userEmail ? "Yo" : getNombre(msg.sender_email)} <span style={{ fontWeight: 400, color: "#999" }}>{formatTime(msg.created_at)}</span>
                      </p>
                      <div style={{ padding: "6px 10px", borderRadius: "4px", background: msg.sender_email === userEmail ? "#cce5ff" : "#f0f0f0", border: msg.sender_email === userEmail ? "1px solid #99caff" : "1px solid #ddd" }}>
                        <p style={{ margin: 0, fontSize: "12px", color: "#333" }}>{msg.contenido}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "8px", borderTop: "1px solid #ddd", background: "#f5f5f5" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  value={nuevoMsg}
                  onChange={e => setNuevoMsg(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && enviarMensaje()}
                  placeholder="Escribe un mensaje..."
                  style={{ flex: 1, padding: "8px 10px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "12px", outline: "none" }}
                />
                <button onClick={enviarMensaje} disabled={!nuevoMsg.trim()} style={{
                  padding: "8px 12px", background: nuevoMsg.trim() ? "#0078d7" : "#ccc",
                  border: "none", borderRadius: "4px", cursor: nuevoMsg.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <Send size={14} color="white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER MSN */}
      <div style={{ padding: "4px 8px", background: "linear-gradient(180deg, #e0e0e0, #c0c0c0)", borderTop: "1px solid #aaa", display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: "9px", color: "#666" }}>ARIA Pulso v1.0 · Grupo Cuavante</span>
      </div>
    </div>
  );
}
