"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";

interface Requisition {
  id: string;
  folio: string;
  cost_center_name: string;
  status: string;
  created_by: string;
  user_email: string;
  required_date: string;
  created_at: string;
}

export default function RequisicionesStatusPage() {
  const [Requisiciones, setRequisiciones] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteType, setDeleteType] = useState<"single" | "selected" | "all">("single");
  const [singleDeleteId, setSingleDeleteId] = useState<string>("");
  
  const hoverSoundRef = useRef<HTMLAudioElement | null>(null);
  const clickSoundRef = useRef<HTMLAudioElement | null>(null);

  const supabase = createClient();
  const canDelete = userEmail === "recursos.humanos@gcuavante.com";

  useEffect(() => {
    // Crear sonidos
    hoverSoundRef.current = new Audio("data:audio/wav;base64,UklGRl9vT19teleXBhdmVmbXQgEAAAABAAEARKwAAESsAAACABAAZGF0YQoAAAD//wIA");
    clickSoundRef.current = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+beV9ac4OXpqqhknhkYXOCl6utpIpvYmBwe46grKuZgGtmZHWJnaass55+aWVpdomdqaynlnxsZml4iZypqaecgnBqaXqImaenp5uAdGxqe4iZpaakmoB0bGt8iJmkpKObgHRtbH2ImaSko5uAdG1sfYiZpKOim4B0bWx9iJmko6KbgHRtbH2ImaSjopuAdG1sfYiZpKOim4B0bWx9iJmko6KbgHRtbH2ImaSjopuAdG1sfYiZpA==");
    loadData();
  }, []);

  const playHoverSound = () => {
    if (hoverSoundRef.current) {
      hoverSoundRef.current.currentTime = 0;
      hoverSoundRef.current.volume = 0.2;
      hoverSoundRef.current.play().catch(() => {});
    }
  };

  const playClickSound = () => {
    if (clickSoundRef.current) {
      clickSoundRef.current.currentTime = 0;
      clickSoundRef.current.volume = 0.3;
      clickSoundRef.current.play().catch(() => {});
    }
  };

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) setUserEmail(user.email);

    const { data } = await supabase
      .from("Requisiciones")
      .select("*")
      .order("created_at", { ascending: false });

    setRequisiciones(data || []);
    setLoading(false);
  }

  function handleSelectAll(checked: boolean) {
    playClickSound();
    setSelectedIds(checked ? Requisiciones.map(r => r.id) : []);
  }

  function handleSelect(id: string, checked: boolean) {
    playClickSound();
    setSelectedIds(checked ? [...selectedIds, id] : selectedIds.filter(i => i !== id));
  }

  function openDeleteModal(type: "single" | "selected" | "all", singleId?: string) {
    playClickSound();
    setDeleteType(type);
    setSingleDeleteId(singleId || "");
    setDeleteConfirmation("");
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (deleteConfirmation !== "DELETE") return;
    playClickSound();
    setDeleting(true);

    let idsToDelete: string[] = [];
    if (deleteType === "single") idsToDelete = [singleDeleteId];
    else if (deleteType === "selected") idsToDelete = selectedIds;
    else if (deleteType === "all") idsToDelete = Requisiciones.map(r => r.id);

    try {
      const res = await fetch("/api/requisicion/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requisitionIds: idsToDelete, userEmail, confirmation: deleteConfirmation })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        setShowDeleteModal(false);
        setSelectedIds([]);
        loadData();
      } else {
        alert("Error: " + data.error);
      }
    } catch {
      alert("Error al eliminar");
    }
    setDeleting(false);
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      "PENDIENTE": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      "APROBADA": "bg-green-500/20 text-green-400 border-green-500/30",
      "RECHAZADA": "bg-red-500/20 text-red-400 border-red-500/30",
      "EN COMPRAS": "bg-blue-500/20 text-blue-400 border-blue-500/30",
      "AUTORIZADA": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    };
    return colors[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div></div>;
  }

  return (
    <div className="p-6">
      <style jsx global>{`
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(4); opacity: 0; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 5px currentColor; }
          50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; }
        }
        .btn-ripple {
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .btn-ripple::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          transition: left 0.5s ease;
        }
        .btn-ripple:hover::before {
          left: 100%;
        }
        .btn-ripple::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          width: 150%;
          height: 150%;
          background: radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 60%);
          transform: translate(-50%, -50%) scale(0);
          border-radius: 50%;
          pointer-events: none;
        }
        .btn-ripple:hover::after {
          animation: ripple 0.8s ease-out;
        }
        .btn-ripple:hover {
          transform: translateY(-2px);
          animation: glow 1.5s ease-in-out infinite;
        }
        .btn-delete::after {
          background: radial-gradient(circle, rgba(239,68,68,0.6) 0%, transparent 60%);
        }
        .btn-delete:hover {
          box-shadow: 0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.3);
        }
      `}</style>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Estatus de Requisiciones</h1>
        <div className="flex gap-2">
          {canDelete && selectedIds.length > 0 && (
            <button 
              onClick={() => openDeleteModal("selected")} 
              onMouseEnter={playHoverSound}
              className="btn-ripple btn-delete px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              🗑️ Eliminar Seleccionadas ({selectedIds.length})
            </button>
          )}
          {canDelete && (
            <button 
              onClick={() => openDeleteModal("all")} 
              onMouseEnter={playHoverSound}
              className="btn-ripple btn-delete px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg"
            >
              🗑️ Eliminar Todas
            </button>
          )}
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/50 text-slate-400 text-sm">
              {canDelete && (
                <th className="p-4 text-left">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.length === Requisiciones.length && Requisiciones.length > 0} 
                    onChange={(e) => handleSelectAll(e.target.checked)} 
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 cursor-pointer" 
                  />
                </th>
              )}
              <th className="p-4 text-left">Folio</th>
              <th className="p-4 text-left">Obra</th>
              <th className="p-4 text-left">Solicitante</th>
              <th className="p-4 text-left">Fecha Requerida</th>
              <th className="p-4 text-left">Status</th>
              {canDelete && <th className="p-4 text-left">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {Requisiciones.map((req) => (
              <tr key={req.id} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                {canDelete && (
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(req.id)} 
                      onChange={(e) => handleSelect(req.id, e.target.checked)} 
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-500 cursor-pointer" 
                    />
                  </td>
                )}
                <td className="p-4 text-white font-mono">{req.folio}</td>
                <td className="p-4 text-slate-300">{req.cost_center_name}</td>
                <td className="p-4 text-slate-300">{req.created_by}</td>
                <td className="p-4 text-slate-300">{new Date(req.required_date).toLocaleDateString("es-MX")}</td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(req.status)}`}>
                    {req.status}
                  </span>
                </td>
                {canDelete && (
                  <td className="p-4">
                    <button 
                      onClick={() => openDeleteModal("single", req.id)} 
                      onMouseEnter={playHoverSound}
                      className="btn-ripple btn-delete p-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {Requisiciones.length === 0 && <div className="p-8 text-center text-slate-400">No hay requisiciones</div>}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-700">
            <h2 className="text-xl font-bold text-white mb-4">⚠️ Confirmar Eliminación</h2>
            <p className="text-slate-300 mb-4">
              {deleteType === "single" && "¿Eliminar esta requisición?"}
              {deleteType === "selected" && `¿Eliminar ${selectedIds.length} requisición(es)?`}
              {deleteType === "all" && `¿Eliminar TODAS las ${Requisiciones.length} requisiciones?`}
            </p>
            <p className="text-red-400 text-sm mb-4">Se respaldarán antes de eliminarse.</p>
            <div className="mb-4">
              <label className="block text-slate-400 text-sm mb-2">
                Escribe <span className="text-red-400 font-bold">DELETE</span> para confirmar:
              </label>
              <input 
                type="text" 
                value={deleteConfirmation} 
                onChange={(e) => setDeleteConfirmation(e.target.value)} 
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-red-500" 
                placeholder="DELETE" 
              />
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { playClickSound(); setShowDeleteModal(false); }} 
                onMouseEnter={playHoverSound}
                className="btn-ripple flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDelete} 
                onMouseEnter={playHoverSound}
                disabled={deleteConfirmation !== "DELETE" || deleting} 
                className="btn-ripple btn-delete flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
