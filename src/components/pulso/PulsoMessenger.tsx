"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect, useRef } from "react";
import { X, Send, MessageCircle, Minus, Users, Circle, Smile, Clock, Coffee, Moon, Paperclip, Phone } from "lucide-react";

interface Usuario {
  email: string;
  name: string;
  display_name: string;
  last_seen?: string;
  status?: string;
  status_message?: string;
}

interface Mensaje {
  id: string;
  sender_email: string;
  contenido: string;
  created_at: string;
  tipo?: string;
  archivo_url?: string;
  archivo_nombre?: string;
}

interface Conversacion {
  id: string;
  nombre?: string;
  participantes: string[];
  ultimoMensaje?: Mensaje;
  noLeidos: number;
}

const EMOJIS = ["😊", "😂", "❤️", "👍", "🎉", "🔥", "😎", "🤔", "😢", "😡", "👋", "🙏", "💪", "✅", "❌", "⭐"];

const SONIDO_MSN = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNBrtnAAAAAAD/+9DEAAAIAANIAAAAIAAANIAAAAQAAAGkAAAAIAAANIAAAARMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7UMQbg8AAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==";

// Sonido NUDGE/ZUMBIDO (más intenso)
const SONIDO_NUDGE = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQgAQpm+";

// Sonido de CONEXIÓN
const SONIDO_CONEXION = "data:audio/wav;base64,UklGRl9vT19teleQgAQpm+2/teleQgAQpm+3/teleQgAQpm+";

export default function PulsoMessenger({ userEmail, onClose }: { userEmail: string; onClose: () => void }) {
  const log = clientLogger("PULSOMESSENGER");
  const [vista, setVista] = useState<"contactos" | "chat" | "estado">("contactos");
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [convActiva, setConvActiva] = useState<Conversacion | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMsg, setNuevoMsg] = useState("");
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [minimizado, setMinimizado] = useState(false);
  const [miEstado, setMiEstado] = useState("disponible");
  const [miMensaje, setMiMensaje] = useState("");
  const [escribiendo, setEscribiendo] = useState<string[]>([]);
  const [showEmojis, setShowEmojis] = useState(false);
  const [nudgeAnimation, setNudgeAnimation] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const previousOnlineRef = useRef<Set<string>>(new Set<string>());
  const nudgeAudioRef = useRef<HTMLAudioElement | null>(null);
  const conexionAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastMsgCount = useRef(0);

  useEffect(() => {
    audioRef.current = new Audio(SONIDO_MSN);
    nudgeAudioRef.current = new Audio(SONIDO_NUDGE);
    conexionAudioRef.current = new Audio(SONIDO_CONEXION);
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
      const interval = setInterval(() => {
        cargarMensajes(convActiva.id);
        verificarEscribiendo(convActiva.id);
      }, 2000);
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
    } catch (e: unknown) { log.error(String(e)); }
  };

  const cargarUsuarios = async () => {
    try {
      const res = await fetch("/api/pulso/estado");
      const data = await res.json();
      const nuevosUsuarios = (data.usuarios || []).filter((u: Usuario) => u.email !== userEmail);
      
      // Detectar nuevas conexiones
      const currentOnline: Set<string> = new Set<string>(nuevosUsuarios.filter((u: Usuario) => {
        if (!u.last_seen) return false;
        const ts = u.last_seen.replace(" ", "T") + "Z";
        const diff = Date.now() - new Date(ts).getTime();
        return diff < 60000;
      }).map((u: Usuario) => u.email));
      
      // Comparar con conexiones anteriores
      currentOnline.forEach(email => {
        if (!previousOnlineRef.current.has(email)) {
          const usuario = nuevosUsuarios.find((u: Usuario) => u.email === email);
          if (usuario && previousOnlineRef.current.size > 0) {
            const nombre = usuario.display_name || usuario.name || (email as string).split("@")[0];
            setToast(`🟢 ${nombre} se ha conectado`);
            conexionAudioRef.current?.play().catch(() => {});
            setTimeout(() => setToast(null), 4000);
          }
        }
      });
      previousOnlineRef.current = currentOnline as Set<string>;
      
      setUsuarios(nuevosUsuarios);
    } catch (e: unknown) { log.error(String(e)); }
  };

  const cargarMensajes = async (convId: string) => {
    try {
      const res = await fetch(`/api/pulso/mensajes?conversacion_id=${convId}&email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      const nuevosMsgs = data.mensajes || [];
      
      if (lastMsgCount.current > 0 && nuevosMsgs.length > lastMsgCount.current) {
        const ultimo = nuevosMsgs[nuevosMsgs.length - 1];
        if (ultimo.sender_email !== userEmail) {
          audioRef.current?.play().catch(() => {});
        }
      }
      lastMsgCount.current = nuevosMsgs.length;
      setMensajes(nuevosMsgs);
    } catch (e: unknown) { log.error(String(e)); }
  };

  const verificarEscribiendo = async (convId: string) => {
    try {
      const res = await fetch(`/api/pulso/escribiendo?conversacion_id=${convId}&email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      setEscribiendo(data.escribiendo || []);
    } catch (e: unknown) { log.error(String(e)); }
  };

  const notificarEscribiendo = async (escribiendoAhora: boolean) => {
    if (!convActiva) return;
    try {
      await fetch("/api/pulso/escribiendo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacion_id: convActiva.id, user_email: userEmail, escribiendo: escribiendoAhora })
      });
    } catch (e: unknown) { log.error(String(e)); }
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
      lastMsgCount.current = 0;
    } catch (e: unknown) { log.error(String(e)); }
  };

  const enviarNudge = () => {
    setNudgeAnimation(true);
    nudgeAudioRef.current?.play().catch(() => {});
    setTimeout(() => setNudgeAnimation(false), 500);
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
      notificarEscribiendo(false);
      cargarMensajes(convActiva.id);
    } catch (e: unknown) { log.error(String(e)); }
  };

  const enviarArchivo = async (file: File) => {
    if (!convActiva || subiendoArchivo) return;
    if (file.size > 10 * 1024 * 1024) { setToast("❌ Archivo muy grande (máx 10 MB)"); setTimeout(() => setToast(null), 3000); return; }
    setSubiendoArchivo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("sender_email", userEmail);
      fd.append("conversacion_id", convActiva.id);
      const res = await fetch("/api/pulso/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir");
      // Crear mensaje con archivo
      await fetch("/api/pulso/mensajes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversacion_id: convActiva.id,
          sender_email: userEmail,
          contenido: `📎 ${file.name}`,
          tipo: file.type.startsWith("image/") ? "imagen" : "archivo",
          archivo_url: data.archivo_url,
          archivo_nombre: data.archivo_nombre,
        })
      });
      cargarMensajes(convActiva.id);
    } catch (e: unknown) { setToast("❌ Error al subir: " + (e as Error).message); setTimeout(() => setToast(null), 3000); }
    setSubiendoArchivo(false);
  };

  const handleInputChange = (value: string) => {
    setNuevoMsg(value);
    notificarEscribiendo(value.length > 0);
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

  // ESTADO REAL: Online si last_seen es menor a 60 segundos
  // ESTADO REAL: Online si last_seen es menor a 60 segundos
  const isOnline = (u: Usuario) => {
    if (!u.last_seen) return false;
    const ts = u.last_seen.replace(" ", "T") + "Z";
    const diff = Date.now() - new Date(ts).getTime();
    return diff < 60000;
  };
  const getLastSeenText = (u: Usuario) => {
    if (!u.last_seen) return "Nunca conectado";
    const ts = u.last_seen.replace(" ", "T") + "Z";
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return null;
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)} hrs`;
    return `Hace ${Math.floor(diff / 86400000)} días`;
  };
  const getStatusColor = (u: Usuario) => {
    if (!isOnline(u)) return "#888888";
    switch (u.status) {
      case "disponible": return "#00cc00";
      case "ocupado": return "#ff0000";
      case "ausente": return "#ffaa00";
      case "no_molestar": return "#cc0000";
      default: return "#00cc00";
    }
  };

  const getStatusText = (u: Usuario) => {
    if (!isOnline(u)) {
      const lastSeen = getLastSeenText(u);
      return lastSeen || "Desconectado";
    }
    if (u.status_message) return u.status_message;
    switch (u.status) {
      case "disponible": return "En línea";
      case "ocupado": return "Ocupado";
      case "ausente": return "Ausente";
      case "no_molestar": return "No molestar";
      default: return "En línea";
    }
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    setMiEstado(nuevoEstado);
    try {
      await fetch("/api/pulso/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, status: nuevoEstado, status_message: miMensaje })
      });
    } catch (e: unknown) { log.error(String(e)); }
    setVista("contactos");
  };

  const guardarMensaje = async () => {
    try {
      await fetch("/api/pulso/estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, status: miEstado, status_message: miMensaje })
      });
    } catch (e: unknown) { log.error(String(e)); }
  };

  // Ordenar: online primero, luego por último visto
  const usuariosOrdenados = [...usuarios].sort((a, b) => {
    const aOnline = isOnline(a);
    const bOnline = isOnline(b);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
    const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
    return bTime - aTime;
  });

  const onlineCount = usuarios.filter(u => isOnline(u)).length;

  if (minimizado) {
    return (
      <div onClick={() => setMinimizado(false)} style={{
        position: "fixed", bottom: "20px", right: "10px", width: "200px", height: "32px",
        background: "linear-gradient(180deg, #0078d7 0%, #0063b1 100%)",
        borderRadius: "4px 4px 0 0", cursor: "pointer", display: "flex", alignItems: "center",
        padding: "0 10px", gap: "8px", boxShadow: "0 -2px 10px rgba(0,0,0,0.3)", zIndex: 9999
      }}>
        <Circle size={8} fill="#00cc00" color="#00cc00" />
        <span style={{ color: "white", fontSize: "11px", fontWeight: 500 }}>ARIA Pulso ({onlineCount} en línea)</span>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: "20px", right: "10px", width: "320px", height: "450px", transform: nudgeAnimation ? "translateX(5px)" : "translateX(0)", transition: "transform 0.05s",
      background: "#f0f0f0", borderRadius: "8px 8px 0 0",
      boxShadow: "0 0 20px rgba(0,0,0,0.3)", border: "1px solid #0078d7",
      display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 9999,
      fontFamily: "Segoe UI, Tahoma, sans-serif"
    }}>
      {/* BARRA DE TÍTULO */}
      <div style={{ background: "linear-gradient(180deg, #0078d7 0%, #0063b1 100%)", padding: "6px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <MessageCircle size={14} color="white" />
          <span style={{ color: "white", fontSize: "12px", fontWeight: 600 }}>ARIA Pulso</span>
        </div>
        <div style={{ display: "flex", gap: "2px" }}>
          <button onClick={() => setMinimizado(true)} style={{ width: "20px", height: "20px", background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "2px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Minus size={10} color="white" />
          </button>
          <button onClick={onClose} style={{ width: "20px", height: "20px", background: "#c42b1c", border: "none", borderRadius: "2px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={10} color="white" />
          </button>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: "absolute", top: "40px", left: "10px", right: "10px",
          background: "linear-gradient(135deg, #00cc00, #009900)",
          color: "white", padding: "8px 12px", borderRadius: "4px",
          fontSize: "11px", fontWeight: 600, textAlign: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)", zIndex: 10000,
          animation: "fadeIn 0.3s ease"
        }}>
          {toast}
        </div>
      )}

      {/* MI PERFIL */}
      <div onClick={() => setVista("estado")} style={{ background: "linear-gradient(180deg, #e8f4fd 0%, #d4e8f8 100%)", padding: "10px", borderBottom: "1px solid #b8d4e8", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "4px", background: "linear-gradient(135deg, #0078d7, #00bcf2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "16px", border: "2px solid white", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>
            {userEmail?.[0]?.toUpperCase()}
          </div>
          <Circle size={12} fill="#00cc00" color="#00cc00" style={{ position: "absolute", bottom: "-2px", right: "-2px", border: "2px solid white", borderRadius: "50%" }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#333" }}>{getNombre(userEmail) || userEmail?.split("@")[0]}</p>
          <p style={{ margin: 0, fontSize: "11px", color: "#00cc00" }}>
            {miMensaje || (miEstado === "disponible" ? "En línea" : miEstado === "ocupado" ? "Ocupado" : miEstado === "ausente" ? "Ausente" : "No molestar")}
          </p>
        </div>
        <span style={{ fontSize: "10px", color: "#666" }}>▼</span>
      </div>

      {/* CONTENIDO */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", background: "white" }}>
        
        {/* CAMBIAR ESTADO */}
        {vista === "estado" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #e0e0e0" }}>
              <p style={{ margin: "0 0 10px", fontSize: "12px", fontWeight: 600, color: "#333" }}>Cambiar mi estado</p>
              {[
                { id: "disponible", color: "#00cc00", label: "En línea" },
                { id: "ocupado", color: "#ff0000", label: "Ocupado" },
                { id: "ausente", color: "#ffaa00", label: "Ausente" },
                { id: "no_molestar", color: "#cc0000", label: "No molestar" },
              ].map(s => (
                <div key={s.id} onClick={() => cambiarEstado(s.id)} style={{ padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", borderRadius: "4px", background: miEstado === s.id ? "#e8f4fd" : "transparent" }}>
                  <Circle size={10} fill={s.color} color={s.color} />
                  <span style={{ fontSize: "12px", color: "#333" }}>{s.label}</span>
                  {miEstado === s.id && <span style={{ marginLeft: "auto", fontSize: "10px", color: "#0078d7" }}>✓</span>}
                </div>
              ))}
            </div>
            <div style={{ padding: "10px 12px" }}>
              <p style={{ margin: "0 0 8px", fontSize: "11px", color: "#666" }}>Mensaje personal:</p>
              <input type="text" value={miMensaje} onChange={e => setMiMensaje(e.target.value)} onBlur={guardarMensaje} placeholder="¿Qué estás haciendo?" maxLength={50} style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "4px", fontSize: "12px" }} />
            </div>
            <button onClick={() => setVista("contactos")} style={{ margin: "10px 12px", padding: "8px 16px", background: "#0078d7", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>← Volver</button>
          </div>
        )}

        {/* LISTA DE CONTACTOS */}
        {vista === "contactos" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "8px 12px", background: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
              <span style={{ fontSize: "11px", color: "#666", fontWeight: 600 }}>
                <Users size={12} style={{ verticalAlign: "middle", marginRight: "6px" }} />
                {onlineCount}/{usuarios.length} en línea
              </span>
            </div>
            
            {usuarios.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#888" }}>
                <p style={{ fontSize: "12px" }}>No hay contactos</p>
              </div>
            ) : (
              usuariosOrdenados.map(u => {
                const conv = conversaciones.find(c => c.participantes?.includes(u.email));
                const noLeidos = conv?.noLeidos || 0;
                const online = isOnline(u);
                return (
                  <div key={u.email} onClick={() => abrirChat(u.email)} style={{ 
                    padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", 
                    borderBottom: "1px solid #f0f0f0", 
                    background: noLeidos > 0 ? "#fff8dc" : "white",
                    opacity: online ? 1 : 0.6
                  }}>
                    <div style={{ position: "relative" }}>
                      <div style={{ 
                        width: "32px", height: "32px", borderRadius: "4px", 
                        background: online ? "linear-gradient(135deg, #0078d7, #00bcf2)" : "#888", 
                        display: "flex", alignItems: "center", justifyContent: "center", 
                        color: "white", fontWeight: 600, fontSize: "13px" 
                      }}>
                        {(u.display_name || u.name)?.[0]?.toUpperCase()}
                      </div>
                      <Circle size={8} fill={getStatusColor(u)} color={getStatusColor(u)} style={{ position: "absolute", bottom: "-1px", right: "-1px" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: "12px", fontWeight: 500, color: online ? "#333" : "#666" }}>{u.display_name || u.name}</p>
                      <p style={{ margin: 0, fontSize: "10px", color: getStatusColor(u) }}>{getStatusText(u)}</p>
                    </div>
                    {noLeidos > 0 && <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#ff6600", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "white", fontSize: "10px", fontWeight: 700 }}>{noLeidos}</span></div>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* VENTANA DE CHAT */}
        {vista === "chat" && convActiva && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "8px 10px", background: "linear-gradient(180deg, #e8f4fd 0%, #d4e8f8 100%)", borderBottom: "1px solid #b8d4e8", display: "flex", alignItems: "center", gap: "8px" }}>
              <button onClick={() => { setConvActiva(null); setVista("contactos"); notificarEscribiendo(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#0078d7" }}>◀</button>
              <div style={{ width: "28px", height: "28px", borderRadius: "4px", background: "linear-gradient(135deg, #0078d7, #00bcf2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600, fontSize: "12px" }}>
                {getConvNombre(convActiva)?.[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#333" }}>{getConvNombre(convActiva)}</p>
                {escribiendo.length > 0 ? (
                  <p style={{ margin: 0, fontSize: "10px", color: "#0078d7", fontStyle: "italic" }}>Escribiendo...</p>
                ) : (
                  <p style={{ margin: 0, fontSize: "10px", color: "#666" }}>Chat</p>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px", background: "#ffffff" }}>
              {mensajes.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px", color: "#888", fontSize: "12px" }}>
                  Inicia la conversación 👋
                </div>
              )}
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
                        {msg.tipo === "imagen" && msg.archivo_url ? (
                          <a href={msg.archivo_url} target="_blank" rel="noopener noreferrer">
                            <img src={msg.archivo_url} alt={msg.archivo_nombre || "imagen"} style={{ maxWidth: "180px", maxHeight: "180px", borderRadius: "4px", display: "block", marginBottom: "4px" }} />
                          </a>
                        ) : msg.tipo === "archivo" && msg.archivo_url ? (
                          <a href={msg.archivo_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "6px", color: "#0078d7", fontSize: "12px", textDecoration: "none" }}>
                            <Paperclip size={14} />
                            <span style={{ textDecoration: "underline" }}>{msg.archivo_nombre || "Archivo"}</span>
                          </a>
                        ) : (
                          <p style={{ margin: 0, fontSize: "12px", color: "#333" }}>{msg.contenido}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {showEmojis && (
              <div style={{ padding: "8px", background: "#f5f5f5", borderTop: "1px solid #ddd", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setNuevoMsg(nuevoMsg + e); setShowEmojis(false); }} style={{ padding: "4px 8px", background: "white", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer", fontSize: "16px" }}>{e}</button>
                ))}
              </div>
            )}

            <div style={{ padding: "8px", borderTop: "1px solid #ddd", background: "#f5f5f5" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setShowEmojis(!showEmojis)} style={{ padding: "8px", background: "#e8f4fd", border: "1px solid #0078d7", borderRadius: "4px", cursor: "pointer" }} title="Emojis">
                  <Smile size={16} color="#0078d7" />
                </button>
                <button onClick={enviarNudge} style={{ padding: "8px", background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "4px", cursor: "pointer" }} title="Zumbido">
                  <Phone size={16} color="#d39e00" />
                </button>
                <label style={{ padding: "8px", background: subiendoArchivo ? "#f0f0f0" : "#d4edda", border: "1px solid #28a745", borderRadius: "4px", cursor: subiendoArchivo ? "wait" : "pointer", display: "flex", alignItems: "center", opacity: subiendoArchivo ? 0.5 : 1 }} title={subiendoArchivo ? "Subiendo..." : "Adjuntar archivo"}>
                  {subiendoArchivo ? <Clock size={16} color="#666" /> : <Paperclip size={16} color="#28a745" />}
                  <input type="file" style={{ display: "none" }} disabled={subiendoArchivo} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={(e) => { if (e.target.files?.[0]) { enviarArchivo(e.target.files[0]); e.target.value = ""; } }} />
                </label>
                <input type="text" value={nuevoMsg} onChange={e => handleInputChange(e.target.value)} onKeyDown={e => e.key === "Enter" && enviarMensaje()} placeholder="Escribe un mensaje..." style={{ flex: 1, padding: "8px 10px", border: "2px solid #0078d7", borderRadius: "4px", fontSize: "12px", outline: "none", background: "#fff", color: "#1a1a1a" }} />
                <button onClick={enviarMensaje} disabled={!nuevoMsg.trim()} style={{ padding: "8px 12px", background: nuevoMsg.trim() ? "#0078d7" : "#ccc", border: "none", borderRadius: "4px", cursor: nuevoMsg.trim() ? "pointer" : "default" }}>
                  <Send size={14} color="white" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "4px 8px", background: "linear-gradient(180deg, #e0e0e0, #c0c0c0)", borderTop: "1px solid #aaa", display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: "9px", color: "#666" }}>ARIA Pulso v2.1 · Grupo Constructor Urbano Avante</span>
      </div>
    </div>
  );
}
