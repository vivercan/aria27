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
  MessageCircle, CreditCard, Filter, ChevronRight, Loader2, FolderOpen
} from "lucide-react";
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

  const openNew = ()=>{setForm(EMPTY_FORM);setEditingId(null);setShowModal(true);};
  const openEdit = (s:Supplier)=>{
    const catStr = getCatDisplay(s.categories).join(", ");
    setForm({name:s.name||"",rfc:s.rfc||"",phone:s.phone||"",email:s.email||"",address:s.address||"",categories:catStr,contact_name:s.contact_name||"",credit_days:s.credit_days||0,website:s.website||"",whatsapp:s.whatsapp||"",bank_name:s.bank_name||"",bank_clabe:s.bank_clabe||"",bank_account_number:s.bank_account_number||"",payment_method:s.payment_method||"TRANSFERENCIA",razon_social:s.razon_social||"",zona_cobertura:s.zona_cobertura||"",notas_comerciales:s.notas_comerciales||""});
    setEditingId(s.id);setShowModal(true);
  };

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
      const payload:any = {...form, categories: catsArr && catsArr.length>0 ? catsArr : null};
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
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <AriaBackButton href="/dashboard/requisiciones" />
            <h1 className="text-lg font-bold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-aria-accent"/>Proveedores</h1>
            <span className="text-xs text-[#4a6080] ml-1">{loading?"...": `${filtered.length} de ${suppliers.length} · ${categories.length} categorías`}</span>
          </div>
          <button onClick={openNew} className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-emerald-500/20 text-aria-accent rounded-lg hover:bg-aria-primary/30"><Plus className="w-3 h-3"/>Nuevo</button>
        </div>
        <div className="flex items-center gap-1.5 mb-2">
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
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4a6080]"/>
            <input type="text" placeholder="Buscar nombre, RFC, contacto, email..." value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs aria-input-canon focus:border-aria-primary/50 outline-none"/>
            {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-[#7f93b0]"/></button>}
          </div>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)}
            className="appearance-none pl-2.5 pr-6 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white outline-none cursor-pointer min-w-[160px]">
            <option value="">Todas ({categories.length})</option>
            {categories.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* TABLA */}
      <div className="flex-1 overflow-auto min-h-0">
        {loading?(
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-aria-accent"/></div>
        ):filtered.length===0?(
          <div className="text-center py-12"><Building2 className="w-8 h-8 text-[#4a6080] mx-auto mb-2"/><p className="text-[#7f93b0] text-sm">Sin resultados</p></div>
        ):(
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[rgba(4,8,16,0.98)]  border-b border-white/[0.06] text-[10px] text-[#4a6080] font-semibold uppercase tracking-wider">
                <th className="text-left pl-4 py-1.5 w-[220px]">Proveedor</th>
                <th className="text-left py-1.5 w-[120px]">Categoría</th>
                <th className="text-left py-1.5 w-[120px]">Teléfono</th>
                <th className="text-left py-1.5">Email</th>
                <th className="text-left py-1.5 w-[100px]">Crédito</th>
                <th className="text-left py-1.5 w-[120px]">CLABE</th>
                <th className="text-center py-1.5 w-[80px]">Activo</th>
                <th className="w-[60px]"></th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {filtered.map(s=>{
                const cats = getCatDisplay(s.categories);
                return (
                  <tr key={s.id} className="border-b border-white/[0.02] hover:bg-white/[0.04] transition-colors group h-[34px]">
                    <td className="pl-4 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0"><Building2 className="w-3 h-3 text-aria-accent"/></div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate text-xs leading-tight">{s.name}</p>
                          {s.contact_name&&<p className="text-[10px] text-[#4a6080] truncate leading-tight">{s.contact_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {cats.length>0&&<div className="flex gap-0.5 flex-wrap">{cats.slice(0,2).map(c=><span key={c} className="text-[9px] px-1 py-0.5 bg-aria-primary/15 text-aria-accent rounded">{c}</span>)}{cats.length>2&&<span className="text-[9px] text-[#4a6080]">+{cats.length-2}</span>}</div>}
                    </td>
                    <td className="text-[#7f93b0]">
                      {s.phone&&<a href={`tel:${s.phone}`} className="hover:text-aria-accent flex items-center gap-1"><Phone className="w-2.5 h-2.5"/>{s.phone}</a>}
                    </td>
                    <td className="text-[#7f93b0] truncate max-w-[200px]">
                      {s.email&&<a href={`mailto:${s.email}`} className="hover:text-aria-accent">{s.email}</a>}
                    </td>
                    <td className="text-[#7f93b0]">
                      {s.credit_days&&s.credit_days>0?<span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">{s.credit_days}d</span>:null}
                    </td>
                    <td>
                      {s.bank_clabe&&s.bank_clabe.length>=10?(
                        <button onClick={()=>copyClabe(s.id,s.bank_clabe!)} className="flex items-center gap-1 text-[10px] text-[#7f93b0] hover:text-white" title={s.bank_clabe}>
                          {copiedId===s.id?<Check className="w-2.5 h-2.5 text-aria-accent"/>:<Copy className="w-2.5 h-2.5"/>}
                          {s.bank_name||"CLABE"}
                        </button>
                      ):null}
                    </td>
                    <td className="text-center pr-2">
                      <button
                        onClick={() => toggleActivo(s.id, s.active)}
                        title={s.active ? "Activo - click para mover a catalogo" : "En catalogo - click para activar"}
                        style={{
                          padding: "3px 9px",
                          fontSize: "10px",
                          fontWeight: 700,
                          borderRadius: "5px",
                          color: "#FFFFFF",
                          background: s.active
                            ? "linear-gradient(180deg, #1F8A60 0%, #16704D 100%)"
                            : "linear-gradient(180deg, #4A5468 0%, #353C4A 100%)",
                          border: s.active ? "1px solid rgba(160,230,200,0.30)" : "1px solid rgba(140,160,200,0.18)",
                          boxShadow: "inset 0 1px 0 rgba(220,235,255,0.10), 0 1px 4px rgba(0,0,0,0.30)",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          cursor: "pointer",
                        }}
                      >
                        {s.active ? "Activo" : "Catalogo"}
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
