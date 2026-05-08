"use client";
import { clientLogger } from "@/lib/client-logger";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  Plus, Search, Edit2, Phone, Mail, Building2,
  MapPin, X, Save, Copy, Check, Trash2, Globe,
  MessageCircle, CreditCard, Filter, ChevronRight, Loader2, FolderOpen, FileText, ClipboardCopy, ClipboardCheck
} from "lucide-react";
import BankLogo from "@/components/BankLogo";
import { formatProperName } from "@/lib/format-name";
import { formatPhoneMx } from "@/lib/format-phone";
import { getCategoryIcon } from "@/lib/category-icons";
import Link from "next/link";
import { EntityFolderDrawer } from "@/components/EntityFolder";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import AriaBackButton from "@/components/AriaBackButton";

interface Supplier {
  id: string; name: string; rfc: string | null; phone: string | null;
  email: string | null; address: string | null; categories: string[] | string | null;
  contact_name: string | null; credit_days: number | null; active: boolean;
  website: string | null; whatsapp: string | null; bank_name: string | null;
  bank_clabe: string | null; bank_account_number: string | null; payment_method: string | null; razon_social: string | null;
  zona_cobertura: string | null; notas_comerciales: string | null;
}

const EMPTY_FORM = {
  name:"",rfc:"",phone:"",email:"",address:"",categories:"",contact_name:"",
  credit_days:0,website:"",whatsapp:"",bank_name:"",bank_clabe:"",
  bank_account_number:"",payment_method:"TRANSFERENCIA",razon_social:"",zona_cobertura:"",notas_comerciales:""
};


function KpiBox({ label, value, accent, onClick, active }: { label: string; value: number; accent: string; onClick?: () => void; active?: boolean }) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md flex items-center gap-2 transition cursor-${onClick ? "pointer" : "default"} ${active ? "ring-2 ring-aria-accent" : ""}`}
      style={{
        background: `linear-gradient(180deg, rgba(15,30,60,0.85) 0%, rgba(8,18,40,0.92) 100%)`,
        border: `1px solid ${accent}55`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.30)`,
      }}
    >
      <span style={{ width: 4, height: 22, background: accent, borderRadius: 2 }} />
      <span className="text-[10px] uppercase tracking-wider text-[#7f93b0]">{label}</span>
      <span className="text-sm font-bold" style={{ color: accent }}>{value}</span>
    </Comp>
  );
}

export default function ProveedoresPage() {
  const log = clientLogger("PROVEEDORES");
  const { msg, flash, clear } = useFlashMessage();
  const [suppliers,setSuppliers] = useState<Supplier[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState("");
  const [filterCat,setFilterCat] = useState("");
  const [sortBy,setSortBy] = useState<string>("");
  const [sortDir,setSortDir] = useState<"asc"|"desc">("asc");
  const [density,setDensity] = useState<"compact"|"comfy">("comfy");
  const toggleSort = (col: string) => {
    if (sortBy === col) {
      if (sortDir === "asc") setSortDir("desc");
      else { setSortBy(""); setSortDir("asc"); }
    } else { setSortBy(col); setSortDir("asc"); }
  };
  // FC2 23-Abr-2026: tabs Activos / Catalogo
  const [tabFilter,setTabFilter] = useState<"ACTIVOS" | "CATALOGO" | "TODOS">("ACTIVOS");
  const [showModal,setShowModal] = useState(false);
  const [editingId,setEditingId] = useState<string|null>(null);
  const [form,setForm] = useState(EMPTY_FORM);
  const [saving,setSaving] = useState(false);
  const [copiedId,setCopiedId] = useState<string|null>(null);
  const [expanded,setExpanded] = useState<string|null>(null);
  const [expedienteSup,setExpedienteSup] = useState<Supplier|null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadSuppliers = useCallback(async()=>{
    // Hotfix 24-Abr-2026: la VIEW Proveedores no expone "active" (solo status). Leemos tabla base suppliers directamente (consistente con insert/update/delete del mismo modulo).
    const{data,error}=await supabase.from("suppliers")
      .select("id,name,rfc,phone,email,address,categories,contact_name,credit_days,active,website,whatsapp,bank_name,bank_clabe,bank_account_number,payment_method,razon_social,zona_cobertura,notas_comerciales")
      .order("name");
    if(error) log.error("Error cargando suppliers", { err: error.message });
    if(data)setSuppliers(data);
    setLoading(false);
  },[]);

  useEffect(()=>{loadSuppliers();},[loadSuppliers]);

  // Extraer categorías únicas del campo categories (puede ser string o array)
  const allCats = suppliers.reduce<string[]>((acc,s)=>{
    if(!s.categories) return acc;
    if(Array.isArray(s.categories)) return acc.concat(s.categories);
    if(typeof s.categories==="string") return acc.concat(s.categories.split(",").map(c=>c.trim()));
    return acc;
  },[]);
  const categories = [...new Set(allCats.filter(Boolean))].sort();

  const getCatDisplay = (cats:any):string[] => {
    if(!cats) return [];
    if(Array.isArray(cats)) return cats.filter(Boolean);
    if(typeof cats==="string") return cats.split(",").map((c:string)=>c.trim()).filter(Boolean);
    return [];
  };

  const filtered = suppliers.filter(s=>{
    const ms = !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.rfc?.toLowerCase().includes(search.toLowerCase()) || s.contact_name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const cats = getCatDisplay(s.categories);
    const mc = !filterCat || cats.includes(filterCat);
    // FC2: filtro por tab activos/catalogo
    // 27-Abr-2026: Activos = active=true Y CLABE valida (>=10 char). Sin clabe -> Catalogo.
    const tieneClabeValida = !!(s.bank_clabe && /^\d{18}$/.test(s.bank_clabe.trim()));
    const mt = tabFilter === "TODOS" ? true
      : tabFilter === "ACTIVOS" ? (s.active === true && tieneClabeValida)
      : (s.active === false || !tieneClabeValida);
    return ms && mc && mt;
  });
  const countActivos  = suppliers.filter(s => s.active === true && !!(s.bank_clabe && /^\d{18}$/.test(s.bank_clabe.trim()))).length;
  const countCatalogo = suppliers.filter(s => s.active === false || !(s.bank_clabe && /^\d{18}$/.test(s.bank_clabe.trim()))).length;
  const kpiSinEmail   = suppliers.filter(s => !s.email).length;
  const kpiSinTel     = suppliers.filter(s => !s.phone).length;
  const kpiCredito30  = suppliers.filter(s => (s.credit_days || 0) >= 30).length;
  const kpiSinClabe   = suppliers.filter(s => !s.bank_clabe || s.bank_clabe.length < 10).length;

  const exportCSV = () => {
    const rows = filtered.map((p:Supplier) => [
      formatProperName(p.name) || "",
      Array.isArray(p.categories) ? p.categories.join(" | ") : (p.categories || ""),
      p.phone || "",
      p.email || "",
      p.credit_days ? p.credit_days + "d" : "Contado",
      p.bank_name || "",
      p.bank_clabe || "",
      p.active ? "ACTIVO" : "CATALOGO",
    ]);
    const headers = ["Proveedor","Categoria","Telefono","Email","Credito","Banco","CLABE","Estado"];
    const csv = [headers, ...rows].map(r => r.map((c:any) => `"` + String(c).replace(/"/g, `""`) + `"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proveedores_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openNew = ()=>{setForm(EMPTY_FORM);setEditingId(null);setShowModal(true);};
  const openEdit = (s:Supplier)=>{
    const catStr = getCatDisplay(s.categories).join(", ");
    setForm({name:s.name||"",rfc:s.rfc||"",phone:s.phone||"",email:s.email||"",address:s.address||"",categories:catStr,contact_name:s.contact_name||"",credit_days:s.credit_days||0,website:s.website||"",whatsapp:s.whatsapp||"",bank_name:s.bank_name||"",bank_clabe:s.bank_clabe||"",bank_account_number:s.bank_account_number||"",payment_method:s.payment_method||"TRANSFERENCIA",razon_social:s.razon_social||"",zona_cobertura:s.zona_cobertura||"",notas_comerciales:s.notas_comerciales||""});
    setEditingId(s.id);setShowModal(true);
  };

  const sorted = (() => {
    if (!sortBy) return filtered;
    const cmp = (a: any, b: any): number => {
      let av: any = a[sortBy] ?? "";
      let bv: any = b[sortBy] ?? "";
      if (sortBy === "categoria") {
        av = Array.isArray(a.categories) ? (a.categories[0] || "") : (a.categories || "");
        bv = Array.isArray(b.categories) ? (b.categories[0] || "") : (b.categories || "");
      }
      if (sortBy === "credit") { av = Number(a.credit_days || 0); bv = Number(b.credit_days || 0); }
      if (sortBy === "active") { av = a.active ? 1 : 0; bv = b.active ? 1 : 0; }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    };
    return [...filtered].sort(cmp);
  })();


  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = "El nombre es obligatorio";
    if (form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Email inválido";
    if (form.rfc && form.rfc.trim() && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(form.rfc)) errors.rfc = "RFC inválido";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async()=>{
    if (!validar()) return;
    setSaving(true);
    try{
      // Normalizar categories: string "ACEROS, CONCRETO" -> array; "" -> null
      const catsArr = form.categories
        ? form.categories.split(",").map(c=>c.trim()).filter(Boolean)
        : null;
      // 7-May-2026 canon AAA: aplicar Title Case al nombre y contacto antes de guardar
      const payload:any = {
        ...form,
        name: formatProperName(form.name) || form.name,
        contact_name: form.contact_name ? formatProperName(form.contact_name) : form.contact_name,
        razon_social: form.razon_social ? formatProperName(form.razon_social) : form.razon_social,
        categories: catsArr && catsArr.length>0 ? catsArr : null,
      };
      if(editingId){
        const { error } = await supabase.from("suppliers").update(payload).eq("id",editingId);
        if (error) {
          log.error("UPDATE suppliers fallo", { err: error.message, code: error.code, details: error.details, hint: error.hint });
          const fullMsg = `Error al actualizar proveedor: ${error.message}${error.hint ? " | hint: " + error.hint : ""}`;
          flash("err", fullMsg);
          alert(fullMsg);
          return;
        }
      } else {
        const { error } = await supabase.from("suppliers").insert({...payload,active:true});
        if (error) {
          log.error("INSERT suppliers fallo", { err: error.message, code: error.code, details: error.details, hint: error.hint });
          const fullMsg = `Error al crear proveedor: ${error.message}${error.hint ? " | hint: " + error.hint : ""}`;
          flash("err", fullMsg);
          alert(fullMsg);
          return;
        }
      }
      setShowModal(false);setEditingId(null);setForm(EMPTY_FORM);await loadSuppliers();
    }catch (e: unknown){log.error(String(e));flash("err", "Error: "+(e as Error).message);}finally{setSaving(false);}
  };

  const handleDelete = async(id:string,name:string)=>{
    setDeleteModal({open:true,id,name:""}); return; // Protected by DeleteModal
    await supabase.from("suppliers").delete().eq("id",id);await loadSuppliers();
  };

  // FC2: toggle active suppliers
  const toggleActivo = async (id: string, currentActive: boolean) => {
    const nuevo = !currentActive;
    const accion = nuevo ? "activar" : "desactivar";
    if (!confirm(`Confirmas ${accion} este proveedor?`)) return;
    const { error } = await supabase.from("suppliers").update({ active: nuevo }).eq("id", id);
    if (error) { flash("err", "No se pudo " + accion + ": " + error.message); return; }
    flash("ok", nuevo ? "Proveedor activado" : "Proveedor pasado a catalogo");
    await loadSuppliers();
  };
  const copyClabe = (id:string,clabe:string)=>{navigator.clipboard.writeText(clabe);setCopiedId(id);setTimeout(()=>setCopiedId(null),2000);};
  const updateField = (f:string,v:string|number)=>setForm(p=>({...p,[f]:v}));
  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "suppliers", id: deleteModal.id, userEmail });
    } catch (e: unknown) { log.error(String(e)); }
    setDeleteModal({open:false,id:"",name:""});
    loadSuppliers();
  };

  return (
    <div className="aria-bg-canon h-full flex flex-col overflow-hidden">
      <FlashBanner msg={msg} className="mx-0 mb-2" />
      {/* HEADER */}
      <div className="flex-none px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2">
          <AriaBackButton href="/dashboard/requisiciones" />
          <h1 className="text-lg font-bold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-aria-accent"/>Proveedores</h1>
          <span className="text-xs text-[#4a6080] ml-1">{loading?"...": `${filtered.length} de ${suppliers.length} · ${categories.length} categorías`}</span>
        </div>
        {/* KPI cards */}
        <div className="flex gap-2 mb-2 flex-wrap">
          <KpiBox label="Activos" value={countActivos} accent="#1F4A8C" onClick={()=>setTabFilter("ACTIVOS")} active={tabFilter==="ACTIVOS"} />
          <KpiBox label="En catálogo" value={countCatalogo} accent="#475569" onClick={()=>setTabFilter("CATALOGO")} active={tabFilter==="CATALOGO"} />
          <KpiBox label="Crédito 30d+" value={kpiCredito30} accent="#D97706" />
          <KpiBox label="Sin email" value={kpiSinEmail} accent="#EC0000" />
          <KpiBox label="Sin teléfono" value={kpiSinTel} accent="#A02530" />
          <KpiBox label="Sin CLABE" value={kpiSinClabe} accent="#6B7B95" />
          <div className="flex-1" />
          <button onClick={exportCSV} className="px-3 py-1.5 text-[11px] font-medium bg-white/[0.04] border border-white/[0.10] rounded-md text-[#c9d8ed] hover:bg-white/[0.08] transition flex items-center gap-1.5" title="Exportar CSV de la lista filtrada">
            <FileText className="w-3.5 h-3.5"/>Exportar
          </button>
          <button onClick={()=>setDensity(density==="compact"?"comfy":"compact")} className="px-3 py-1.5 text-[11px] font-medium bg-white/[0.04] border border-white/[0.10] rounded-md text-[#c9d8ed] hover:bg-white/[0.08] transition flex items-center gap-1.5" title="Cambiar densidad">
            {density==="compact"?"Densidad: Compacta":"Densidad: Cómoda"}
          </button>
        </div>
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <div className="flex items-center gap-1.5 mr-3">
          {(["ACTIVOS","CATALOGO","TODOS"] as const).map(t => {
            const active = tabFilter === t;
            const count = t === "ACTIVOS" ? countActivos : t === "CATALOGO" ? countCatalogo : suppliers.length;
            return (
              <button key={t} onClick={() => setTabFilter(t)} type="button"
                style={{
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  borderRadius: "6px",
                  color: active ? "#FFFFFF" : "rgba(180,200,228,0.72)",
                  background: active ? "linear-gradient(180deg, #1E3E7A 0%, #163068 100%)" : "linear-gradient(180deg, #1A2A44 0%, #14223A 100%)",
                  border: active ? "1px solid rgba(160,200,240,0.30)" : "1px solid rgba(140,178,228,0.14)",
                  boxShadow: active ? "inset 0 1px 0 rgba(220,235,255,0.10), 0 2px 6px rgba(0,0,0,0.30)" : "inset 0 1px 0 rgba(220,235,255,0.04)",
                  transition: "all 120ms ease",
                  cursor: "pointer",
                }}>
                {t === "ACTIVOS" ? "Activos" : t === "CATALOGO" ? "Catalogo" : "Todos"}
                <span style={{ marginLeft: 6, opacity: 0.75 }}>({count})</span>
              </button>
            );
          })}
          </div>
          <div className="relative" style={{ width: 280 }}>
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a6080]"/>
            <input type="text" placeholder="Buscar nombre, RFC, contacto..." value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none"/>
            {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-[#7f93b0]"/></button>}
          </div>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none cursor-pointer min-w-[150px]">
            <option value="">Todas ({categories.length})</option>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={openNew} className="aria-btn-nuevo" type="button">
            <Plus className="w-3.5 h-3.5"/>Nuevo
          </button>
        </div>

      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-auto min-h-0 aria-table-zone-light">
        {loading?(
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-aria-accent"/></div>
        ):filtered.length===0?(
          <div className="text-center py-12"><Building2 className="w-8 h-8 text-[#4a6080] mx-auto mb-2"/><p className="text-[#7f93b0] text-sm">Sin resultados</p></div>
        ):(
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="aria-table-header text-[10px] text-white font-bold uppercase tracking-wider">
                <th onClick={()=>toggleSort("name")} className={`aria-th-sortable text-left pl-4 py-2.5 w-[220px] ${sortBy==="name"?"active":""}`}><span className="inline-flex items-center gap-1.5"><Building2 className="w-3 h-3 opacity-70"/>Proveedor<span className="sort-arrow">{sortBy==="name"?(sortDir==="asc"?"↑":"↓"):"⇅"}</span></span></th>
                <th onClick={()=>toggleSort("categoria")} className={`aria-th-sortable text-left py-2.5 w-[240px] ${sortBy==="categoria"?"active":""}`}>Categoría<span className="sort-arrow">{sortBy==="categoria"?(sortDir==="asc"?"↑":"↓"):"⇅"}</span></th>
                <th onClick={()=>toggleSort("phone")} className={`aria-th-sortable text-left py-2.5 w-[130px] ${sortBy==="phone"?"active":""}`}><span className="inline-flex items-center gap-1.5"><Phone className="w-3 h-3 opacity-70"/>Teléfono<span className="sort-arrow">{sortBy==="phone"?(sortDir==="asc"?"↑":"↓"):"⇅"}</span></span></th>
                <th onClick={()=>toggleSort("email")} className={`aria-th-sortable text-left py-2.5 w-[260px] ${sortBy==="email"?"active":""}`}>Email<span className="sort-arrow">{sortBy==="email"?(sortDir==="asc"?"↑":"↓"):"⇅"}</span></th>
                <th onClick={()=>toggleSort("credit")} className={`aria-th-sortable text-left py-2.5 w-[80px] ${sortBy==="credit"?"active":""}`}>Crédito<span className="sort-arrow">{sortBy==="credit"?(sortDir==="asc"?"↑":"↓"):"⇅"}</span></th>
                <th onClick={()=>toggleSort("bank_name")} className={`aria-th-sortable text-left py-2.5 w-[200px] ${sortBy==="bank_name"?"active":""}`}>Banco / CLABE<span className="sort-arrow">{sortBy==="bank_name"?(sortDir==="asc"?"↑":"↓"):"⇅"}</span></th>
                <th onClick={()=>toggleSort("active")} className={`aria-th-sortable text-center py-2.5 w-[100px] ${sortBy==="active"?"active":""}`}>Estado<span className="sort-arrow">{sortBy==="active"?(sortDir==="asc"?"↑":"↓"):"⇅"}</span></th>
                <th className="w-[60px]"></th>
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {sorted.map(s=>{
                const cats = getCatDisplay(s.categories);
                return (
                  <tr key={s.id} className="aria-table-row group h-[36px]">
                    <td className="pl-4 pr-2">
                      <div className="flex items-center gap-2">
                        {(() => { const ci = getCategoryIcon(s.categories); const Icon = ci.icon; return (
                          <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${ci.color}55`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.50), 0 1px 2px rgba(0,0,0,0.15)" }}>
                            <Icon className="w-4 h-4" style={{ color: ci.color }}/>
                          </div>
                        );})()}
                        <div className="min-w-0">
                          <p className="aria-table-name truncate text-xs leading-tight">{formatProperName(s.name)}</p>
                          {s.contact_name&&<p className="aria-table-subtle text-[10px] truncate leading-tight">{formatProperName(s.contact_name)}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {cats.length>0&&<div className="flex gap-0.5 flex-wrap">{cats.slice(0,3).map(c=><span key={c} className="aria-table-tag-cat">{c}</span>)}{cats.length>3&&<span className="text-[10px] text-[#475569] self-center">+{cats.length-3}</span>}</div>}
                    </td>
                    <td className="text-[#7f93b0]">
                      {s.phone?<a href={`tel:${s.phone}`} className="hover:text-aria-accent flex items-center gap-1 text-[12px]"><Phone className="w-3 h-3"/>{formatPhoneMx(s.phone)}</a>:<span className="text-[#94a3b8] text-[12px]">—</span>}
                    </td>
                    <td className="text-[#7f93b0] truncate max-w-[200px]">
                      {s.email?<a href={`mailto:${s.email}`} className="hover:text-aria-accent">{s.email}</a>:<span className="text-[#94a3b8]">—</span>}
                    </td>
                    <td className="text-[#7f93b0]">
                      {s.credit_days&&s.credit_days>0?(()=>{
                        const d = s.credit_days;
                        const style = d <= 7 ? { bg: "linear-gradient(180deg,#2EAE6E 0%,#1B7E4D 100%)", color: "#F4F8FF", ring: "rgba(180,255,210,0.40)" } :
                                      d <= 15 ? { bg: "linear-gradient(180deg,#F5B23E 0%,#C7821B 100%)", color: "#1A1206", ring: "rgba(255,230,180,0.40)" } :
                                      d <= 30 ? { bg: "linear-gradient(180deg,#F09137 0%,#C56A18 100%)", color: "#FFFFFF", ring: "rgba(255,210,170,0.40)" } :
                                                { bg: "linear-gradient(180deg,#D14550 0%,#A02530 100%)", color: "#FFF4F4", ring: "rgba(255,180,180,0.40)" };
                        return <span style={{padding:"2px 9px",fontSize:10,fontWeight:700,letterSpacing:"0.04em",borderRadius:6,background:style.bg,color:style.color,border:`1px solid ${style.ring}`,boxShadow:"inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 3px rgba(0,0,0,0.20)"}}>{d}d</span>;
                      })():<span className="text-[12px] font-medium text-[#475569]">Contado</span>}
                    </td>
                    <td>
                      {s.bank_clabe&&s.bank_clabe.length>=10?(
                        <button onClick={()=>copyClabe(s.id,s.bank_clabe!)} className="hover:opacity-80 transition" title={copiedId===s.id?"CLABE copiada":`Click para copiar CLABE: ${s.bank_clabe}`}>
                          <BankLogo name={s.bank_name} size="sm" showName={true} showCopy={true} copied={copiedId===s.id} />
                        </button>
                      ):s.bank_name?(
                        <BankLogo name={s.bank_name} size="sm" showName={true} />
                      ):null}
                    </td>
                    <td className="text-center pr-2">
                      <button
                        onClick={() => toggleActivo(s.id, s.active)}
                        title={s.active ? "Activo - click para mover a catalogo" : "En catalogo - click para activar"}
                        className={s.active ? "aria-pill-activo" : "aria-pill-catalogo"}
                        type="button"
                      >
                        {s.active ? "ACTIVO" : "CATALOGO"}
                      </button>
                    </td>
                    <td className="pr-2">
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>setExpedienteSup(s)} title="Expediente" className="p-1 hover:bg-aria-primary-light rounded text-aria-accent/70 hover:text-aria-accent"><FolderOpen className="w-3 h-3"/></button>
                        <button onClick={()=>openEdit(s)} className="p-1 hover:bg-white/[0.06] rounded text-[#7f93b0] hover:text-white"><Edit2 className="w-3 h-3"/></button>
                        {canDelete && (<button onClick={()=>handleDelete(s.id,s.name)} className="p-1 hover:bg-red-500/20 rounded text-[#4a6080] hover:text-red-400"><Trash2 className="w-3 h-3"/></button>)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showModal&&(
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4">
          <div className="bg-[#0c1d38] rounded-2xl w-full max-w-2xl border border-white/[0.08] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08] flex-none">
              <h2 className="text-lg font-bold text-white">{editingId?"Editar Proveedor":"Nuevo Proveedor"}</h2>
              <button onClick={()=>{setShowModal(false);setEditingId(null);}} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-[#7f93b0]"><X className="w-4 h-4"/></button>
            </div>
            <div className="overflow-auto p-4 space-y-4 flex-1">
              <div>
                <p className="text-[10px] font-semibold text-[#7f93b0] uppercase tracking-wider mb-2">Identificación</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Nombre comercial *</label>
                    <input value={form.name} onChange={e=>updateField("name",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="Ej: SAACSA"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Razón Social</label>
                    <input value={form.razon_social} onChange={e=>updateField("razon_social",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="SA de CV"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-[#7f93b0] mb-0.5 block">RFC</label>
                    <input value={form.rfc} onChange={e=>updateField("rfc",e.target.value.toUpperCase())} className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white uppercase placeholder-[#4a6080] focus:border-aria-primary/50 outline-none" placeholder="ABC123456XY0" maxLength={13}/>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#7f93b0] uppercase tracking-wider mb-2">Contacto</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">Contacto</label><input value={form.contact_name} onChange={e=>updateField("contact_name",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="Nombre"/></div>
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">Teléfono</label><input value={form.phone} onChange={e=>updateField("phone",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="(449) 123-4567"/></div>
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">Email</label><input value={form.email} onChange={e=>updateField("email",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="ventas@empresa.com"/></div>
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">WhatsApp</label><input value={form.whatsapp} onChange={e=>updateField("whatsapp",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="4491234567"/></div>
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">Web</label><input value={form.website} onChange={e=>updateField("website",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="www.empresa.com"/></div>
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">Dirección</label><input value={form.address} onChange={e=>updateField("address",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="Calle, colonia"/></div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#7f93b0] uppercase tracking-wider mb-2">Comercial</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">Categoría</label><input value={form.categories} onChange={e=>updateField("categories",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="ACEROS" list="cats-list"/><datalist id="cats-list">{categories.map(c=><option key={c} value={c}/>)}</datalist></div>
                  <div>
                    <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Forma pago</label>
                    <select value={form.payment_method} onChange={e=>updateField("payment_method",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:border-aria-primary/50 outline-none">
                      <option value="TRANSFERENCIA">Transferencia</option><option value="EFECTIVO">Efectivo</option><option value="CHEQUE">Cheque</option><option value="CREDITO">Crédito</option><option value="TARJETA">Tarjeta</option>
                    </select>
                  </div>
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">Días crédito</label><input type="number"  value={form.credit_days} onChange={e=>updateField("credit_days",parseInt(e.target.value)||0)} className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:border-aria-primary/50 outline-none" min={0}/></div>
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">Zona</label><input value={form.zona_cobertura} onChange={e=>updateField("zona_cobertura",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="Aguascalientes"/></div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#7f93b0] uppercase tracking-wider mb-2">Bancario</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">Banco</label><input value={form.bank_name} onChange={e=>updateField("bank_name",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none" placeholder="BBVA"/></div>
                  <div><label className="text-[11px] text-[#7f93b0] mb-0.5 block">CLABE</label><input value={form.bank_clabe} onChange={e=>updateField("bank_clabe",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white font-mono placeholder-[#4a6080] focus:border-aria-primary/50 outline-none" placeholder="18 dígitos" maxLength={18}/></div>
            <div>
              <label className="block text-[10px] text-[#7f93b0] mb-0.5 uppercase tracking-wide">No. Cuenta</label>
              <input type="text" value={form.bank_account_number} onChange={e=>updateField("bank_account_number",e.target.value)}
                placeholder="00-1234-5678" className="w-full px-2 py-1 text-xs aria-input-canon" />
            </div>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-[#7f93b0] mb-0.5 block">Notas</label>
                <textarea value={form.notas_comerciales} onChange={e=>updateField("notas_comerciales",e.target.value)} className="w-full px-2.5 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none resize-none h-16" placeholder="Observaciones"/>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-white/[0.08] flex-none">
              <button onClick={()=>{setShowModal(false);setEditingId(null);}} className="px-3 py-1.5 text-xs text-[#7f93b0] hover:text-white hover:bg-white/[0.06] rounded-lg">Cancelar</button>
              <button onClick={handleSave} disabled={saving||!form.name.trim()} className="px-3 py-1.5 text-xs aria-btn-emerald-solid disabled:bg-[#0f2448] text-white rounded-lg flex items-center gap-1"><Save className="w-3 h-3"/>{saving?"...":editingId?"Actualizar":"Crear"}</button>
            </div>
          </div>
        </div>
      )}

      <EntityFolderDrawer
        open={!!expedienteSup}
        onClose={() => setExpedienteSup(null)}
        entityType="proveedor"
        entityId={expedienteSup?.id || ""}
        entityName={expedienteSup?.name}
      />

      <DeleteModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({open:false,id:"",name:""})}
        onConfirm={confirmDelete}
        count={1}
        itemLabel="Proveedor"
      />
    </div>
  );
}
