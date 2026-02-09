"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, Search, Star, Phone, Mail, MapPin, Package, Plus, TrendingUp, Users, Building2, Filter } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  category: string;
  rating: number;
  total_ocs: number;
  total_compras: number;
  ultimo_pedido: string;
}

export default function ProspeccionPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("TODOS");
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, conCompras: 0, sinCompras: 0, categorias: 0 });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Cargar proveedores
      const { data: provs, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (error) throw error;

      // Cargar OCs para stats por proveedor
      const { data: ocs } = await supabase
        .from("purchase_orders")
        .select("supplier_name, total, created_at");

      const ocsMap: Record<string, { count: number; total: number; last: string }> = {};
      (ocs || []).forEach((oc: any) => {
        const key = oc.supplier_name?.toLowerCase();
        if (!key) return;
        if (!ocsMap[key]) ocsMap[key] = { count: 0, total: 0, last: "" };
        ocsMap[key].count++;
        ocsMap[key].total += oc.total || 0;
        if (oc.created_at > (ocsMap[key].last || "")) ocsMap[key].last = oc.created_at;
      });

      const enriched = (provs || []).map((p: any) => {
        const key = p.name?.toLowerCase();
        const ocData = ocsMap[key] || { count: 0, total: 0, last: "" };
        return {
          ...p,
          total_ocs: ocData.count,
          total_compras: ocData.total,
          ultimo_pedido: ocData.last,
          rating: ocData.count > 5 ? 5 : ocData.count > 2 ? 4 : ocData.count > 0 ? 3 : 0,
        };
      });

      setSuppliers(enriched);

      // Categorías únicas
      const cats = [...new Set((provs || []).map((p: any) => p.category).filter(Boolean))].sort();
      setCategories(cats as string[]);

      const conCompras = enriched.filter((s: any) => s.total_ocs > 0).length;
      setStats({
        total: enriched.length,
        conCompras,
        sinCompras: enriched.length - conCompras,
        categorias: cats.length,
      });
    } catch (e) {
      console.error("Error:", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = suppliers.filter(s => {
    const matchSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.category?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "TODOS" || s.category === filterCategory;
    return matchSearch && matchCat;
  });

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star key={i} className={`w-3 h-3 ${i < rating ? "text-amber-400 fill-amber-400" : "text-slate-600"}`} />
    ));
  };

  return (
    <div className="space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
        <div className="p-2 rounded-lg bg-white/5 hover:bg-white/10"><ArrowLeft className="w-5 h-5" /></div>
        <span className="text-sm font-medium">Regresar</span>
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Prospección de Proveedores</h1>
          <p className="text-slate-400 text-sm">Evalúa y encuentra proveedores por categoría y desempeño</p>
        </div>
        <button onClick={() => router.push("/dashboard/requisiciones/proveedores")}
          className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Proveedor
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Proveedores", value: stats.total, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Con Compras", value: stats.conCompras, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Sin Compras", value: stats.sinCompras, icon: Building2, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Categorías", value: stats.categorias, icon: Package, color: "text-violet-400", bg: "bg-violet-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar proveedor, contacto o categoría..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none" />
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-blue-500/50 focus:outline-none">
          <option value="TODOS">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl animate-pulse h-48" />
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-3 p-10 text-center text-slate-400">No se encontraron proveedores</div>
        ) : filtered.map(s => (
          <div key={s.id} className="group p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-semibold group-hover:text-blue-400 transition-colors">{s.name}</h3>
                {s.contact_name && <p className="text-xs text-slate-400">{s.contact_name}</p>}
              </div>
              <div className="flex">{renderStars(s.rating)}</div>
            </div>

            {s.category && (
              <span className="inline-block px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded-full mb-3">{s.category}</span>
            )}

            <div className="space-y-1.5 text-xs text-slate-400 mb-4">
              {s.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{s.phone}</div>}
              {s.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{s.email}</div>}
              {s.address && <div className="flex items-center gap-2"><MapPin className="w-3 h-3" /><span className="truncate">{s.address}</span></div>}
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">OCs: </span>
                <span className="text-white font-medium">{s.total_ocs}</span>
              </div>
              <div>
                <span className="text-slate-400">Compras: </span>
                <span className="text-emerald-400 font-medium">${s.total_compras.toLocaleString()}</span>
              </div>
              {s.ultimo_pedido && (
                <div className="text-slate-500">{new Date(s.ultimo_pedido).toLocaleDateString("es-MX", { month: "short", year: "2-digit" })}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
