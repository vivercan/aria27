"use client";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Trash2, Loader2 } from "lucide-react";
import FlashBanner from "@/components/FlashBanner";
import type { FlashMsg } from "@/lib/use-flash-message";

interface Carpeta {
  id: string;
  parent_id: string | null;
  scope: string;
  nombre: string;
  orden: number;
  created_by: string | null;
  created_at: string;
}

interface FolderTreeProps {
  scope: string;
  selectedId?: string | null;
  onSelect?: (id: string | null, nombre?: string) => void;
  title?: string;
}

export default function FolderTree({ scope, selectedId, onSelect, title = "Carpetas" }: FolderTreeProps) {
  const [folders, setFolders] = useState<Carpeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creatingIn, setCreatingIn] = useState<string | "root" | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<FlashMsg | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("arbol_carpetas")
      .select("*")
      .eq("scope", scope)
      .order("orden", { ascending: true })
      .order("nombre", { ascending: true });
    if (!error && data) setFolders(data as Carpeta[]);
    setLoading(false);
  }, [scope]);

  useEffect(() => { cargar(); }, [cargar]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpanded(next);
  };

  const crear = async (parentId: string | null) => {
    if (!newName.trim()) { setCreatingIn(null); return; }
    setSaving(true);
    const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") || "" : "";
    const { error } = await supabase.from("arbol_carpetas").insert({
      parent_id: parentId,
      scope,
      nombre: newName.trim(),
      created_by: email,
    });
    setSaving(false);
    if (error) { setMsg({tipo: "err", texto: "Error: " + (error as {message?: string})?.message || "Error"}); setTimeout(() => setMsg(null), 2500); return; }
    setNewName("");
    setCreatingIn(null);
    if (parentId) setExpanded(new Set(expanded).add(parentId));
    cargar();
  };

  const borrar = async (id: string, nombre: string) => {
    if (!confirm(`Borrar "${nombre}" y todas sus subcarpetas?`)) return;
    const { error } = await supabase.from("arbol_carpetas").delete().eq("id", id);
    if (error) { setMsg({tipo: "err", texto: "Error: " + (error as {message?: string})?.message || "Error"}); setTimeout(() => setMsg(null), 2500); return; }
    if (selectedId === id) onSelect?.(null);
    cargar();
  };

  const renderNode = (nodo: Carpeta, depth: number) => {
    const hijos = folders.filter(f => f.parent_id === nodo.id);
    const isExp = expanded.has(nodo.id);
    const isSel = selectedId === nodo.id;
    return (
      <div key={nodo.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer group ${isSel ? "bg-aria-primary-light" : ""}`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
          onClick={() => onSelect?.(nodo.id, nodo.nombre)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); toggle(nodo.id); }}
            className="w-4 h-4 flex items-center justify-center text-slate-400"
          >
            {hijos.length > 0 ? (isExp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : <span className="w-3 h-3" />}
          </button>
          {isExp && hijos.length > 0 ? <FolderOpen className="w-4 h-4 text-amber-400" /> : <Folder className="w-4 h-4 text-amber-400" />}
          <span className="flex-1 text-sm text-white truncate">{nodo.nombre}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setCreatingIn(nodo.id); setExpanded(new Set(expanded).add(nodo.id)); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-emerald-400"
            title="Agregar subcarpeta"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); borrar(nodo.id, nodo.nombre); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-400"
            title="Borrar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        {creatingIn === nodo.id && (
          <div className="flex items-center gap-1 py-1" style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}>
            <Folder className="w-4 h-4 text-amber-400/50" />
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") crear(nodo.id); if (e.key === "Escape") { setCreatingIn(null); setNewName(""); } }}
              onBlur={() => { if (!saving) { crear(nodo.id); } }}
              placeholder="Nombre..."
              className="flex-1 px-2 py-0.5 rounded bg-white/5 border border-aria-primary/50 text-white text-sm focus:outline-none"
            />
          </div>
        )}
        {isExp && hijos.map(h => renderNode(h, depth + 1))}
      </div>
    );
  };

  const raices = folders.filter(f => !f.parent_id);

  return (
    <div className="h-full flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      {msg && <FlashBanner msg={msg} className="mx-2 mt-2" />}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <button
          onClick={() => setCreatingIn("root")}
          className="p-1 rounded hover:bg-white/10 text-emerald-400"
          title="Nueva carpeta raiz"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-aria-accent" /></div>
        ) : (
          <>
            {creatingIn === "root" && (
              <div className="flex items-center gap-1 py-1 px-2">
                <Folder className="w-4 h-4 text-amber-400/50" />
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") crear(null); if (e.key === "Escape") { setCreatingIn(null); setNewName(""); } }}
                  onBlur={() => { if (!saving) { crear(null); } }}
                  placeholder="Nombre..."
                  className="flex-1 px-2 py-0.5 rounded bg-white/5 border border-aria-primary/50 text-white text-sm focus:outline-none"
                />
              </div>
            )}
            {raices.length === 0 && creatingIn !== "root" ? (
              <p className="text-center text-slate-500 text-xs py-6">Sin carpetas. Click + para crear.</p>
            ) : (
              raices.map(r => renderNode(r, 0))
            )}
          </>
        )}
      </div>
    </div>
  );
}
