"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Plus, Search, Edit2, Phone, Mail, Building2, MapPin, Star } from "lucide-react";
import Link from "next/link";

interface Proveedor {
  id: string;
  nombre: string;
  rfc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  categoria: string | null;
  contacto_nombre: string | null;
  dias_credito: number | null;
  activo: boolean;
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase.from("proveedores").select("*").order("nombre");
      if (data) setProveedores(data);
      setLoading(false);
    };
    cargar();
  }, []);

  const filtrados = proveedores.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase()) ||
    p.categoria?.toLowerCase().includes(search.toLowerCase())
  );

  const categorias = [...new Set(proveedores.map(p => p.categoria).filter(Boolean))];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-none p-6 border-b border-white/10">
        <Link href="/dashboard/requisiciones" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Requisiciones
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Proveedores</h1>
            <p className="text-slate-400">{proveedores.length} proveedores • {categorias.length} categorías</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </button>
        </div>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Buscar por nombre o categoría..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No hay proveedores registrados</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtrados.map(p => (
              <div key={p.id} className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{p.nombre}</h3>
                        {p.categoria && (
                          <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded">{p.categoria}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${p.activo ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {p.activo ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      {p.rfc && <p className="text-sm text-slate-400">RFC: {p.rfc}</p>}
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                        {p.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.telefono}</span>}
                        {p.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</span>}
                        {p.dias_credito && <span className="flex items-center gap-1"><Star className="w-3 h-3" />{p.dias_credito} días crédito</span>}
                      </div>
                      {p.direccion && <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{p.direccion}</p>}
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
