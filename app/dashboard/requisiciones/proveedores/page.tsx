"use client";
import DeleteModal from "@/components/DeleteModal";
import { useDeletePermission } from "@/lib/use-delete-permission";
import { backupAndDelete } from "@/lib/backup-delete";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Search, Edit2, Phone, Mail, Building2,
  MapPin, X, Save, Copy, Check, Trash2, Globe,
  MessageCircle, CreditCard, Filter, ChevronRight, Loader2, FolderOpen
} from "lucide-react";
import Link from "next/link";
import { EntityFolderDrawer } from "@/components/EntityFolder";

interface Supplier {
  id: string; name: string; rfc: string | null; phone: string | null;
  email: string | null; address: string | null; categories: any;
  contact_name: string | null; credit_days: number | null; active: boolean;
  website: string | null; whatsapp: string | null; bank_name: string | null;
  bank_clabe: string | null; payment_method: string | null; razon_social: string | null;
  zona_cobertura: string | null; notas_comerciales: string | null;
}

const EMPTY_FORM = {
  name:"",rfc:"",phone:"",email:"",address:"",categories:"",contact_name:"",
  credit_days:0,website:"",whatsapp:"",bank_name:"",bank_clabe:"",
  payment_method:"TRANSFERENCIA",razon_social:"",zona_cobertura:"",notas_comerciales:""
};

export default function ProveedoresPage() {
  const [suppliers,setSuppliers] = useState<Supplier[]>([]);
  const { userEmail, canDelete } = useDeletePermission();
  const [deleteModal, setDeleteModal] = useState<{open:boolean;id:string;name:string}>
    ({open:false,id:"",name:""});
  const [loading,setLoading] = useState(true);
  const [search,setSearch] = useState("");
  const [filterCat,setFilterCat] = useState("");
  const [showModal,setShowModal] = useState(false);
  const [editingId,setEditingId] = useState<string|null>(null);
  const [form,setForm] = useState(EMPTY_FORM);
  const [saving,setSaving] = useState(false);
  const [copiedId,setCopiedId] = useState<string|null>(null);
  const [expanded,setExpanded] = useState<string|null>(null);
  const [expedienteSup,setExpedienteSup] = useState<Supplier|null>(null);

  const loadSuppliers = useCallback(async()=>{
    const{data}=await supabase.from("Proveedores")
      .select("id,name,rfc,phone,email,address,categories,contact_name,credit_days,active,website,whatsapp,bank_name,bank_clabe,payment_method,razon_social,zona_cobertura,notas_comerciales")
      .order("name");
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
    return ms && mc;
  });

  const openNew = ()=>{setForm(EMPTY_FORM);setEditingId(null);setShowModal(true);};
  const openEdit = (s:Supplier)=>{
    const catStr = getCatDisplay(s.categories).join(", ");
    setForm({name:s.name||"",rfc:s.rfc||"",phone:s.phone||"",email:s.email||"",address:s.address||"",categories:catStr,contact_name:s.contact_name||"",credit_days:s.credit_days||0,website:s.website||"",whatsapp:s.whatsapp||"",bank_name:s.bank_name||"",bank_clabe:s.bank_clabe||"",payment_method:s.payment_method||"TRANSFERENCIA",razon_social:s.razon_social||"",zona_cobertura:s.zona_cobertura||"",notas_comerciales:s.notas_comerciales||""});
    setEditingId(s.id);setShowModal(true);
  };

  const handleSave = async()=>{
    if(!form.name.trim())return; setSaving(true);
    try{
      if(editingId){
        const { error } = await supabase.from("suppliers").update(form).eq("id",editingId);
        if (error) { alert("Error al actualizar proveedor: " + error.message); return; }
      } else {
        const { error } = await supabase.from("suppliers").insert({...form,active:true});
        if (error) { alert("Error al crear proveedor: " + error.message); return; }
      }
      setShowModal(false);setEditingId(null);setForm(EMPTY_FORM);await loadSuppliers();
    }catch(e){console.error(e);alert("Error: "+(e as Error).message);}finally{setSaving(false);}
  };

  const handleDelete = async(id:string,name:string)=>{
    setDeleteModal({open:true,id,name:""}); return; // Protected by DeleteModal
    await supabase.from("suppliers").delete().eq("id",id);await loadSuppliers();
  };

  const copyClabe = (id:string,clabe:string)=>{navigator.clipboard.writeText(clabe);setCopiedId(id);setTimeout(()=>setCopiedId(null),2000);};
  const updateField = (f:string,v:string|number)=>setForm(p=>({...p,[f]:v}));
  const confirmDelete = async () => {
    try {
      await backupAndDelete({ table: "suppliers", id: deleteModal.id, userEmail });
    } catch (e) { console.error(e); }
    setDeleteModal({open:false,id:"",name:""});
    loadSuppliers();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-none px-4 pt-3 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/requisiciones" className="p-1 hover:bg-white/10 rounded-lg"><ArrowLeft className="w-4 h-4 text-slate-400"/></Link>
            <h1 className="text-lg font-bold text-white flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-400"/>Proveedores</h1>
            <span className="text-xs text-slate-500 ml-1">{loading?"...": `${filtered.length} de ${suppliers.length} · ${categories.length} categorías`}</span>
          </div>
          <button onClick={openNew} className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30"><Plus className="w-3 h-3"/>Nuevo</button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500"/>
            <input type="text" placeholder="Buscar nombre, RFC, contacto, email..." value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none"/>
            {search&&<button onClick={()=>setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-slate-400"/></button>}
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
          <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-blue-400"/></div>
        ):filtered.length===0?(
          <div className="text-center py-12"><Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2"/><p className="text-slate-400 text-sm">Sin resultados</p></div>
        ):(
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-900/95 backdrop-blur-sm border-b border-white/[0.06] text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                <th className="text-left pl-4 py-1.5 w-[220px]">Proveedor</th>
                <th className="text-left py-1.5 w-[120px]">Categoría</th>
                <th className="text-left py-1.5 w-[120px]">Teléfono</th>
                <th className="text-left py-1.5">Email</th>
                <th className="text-left py-1.5 w-[100px]">Crédito</th>
                <th className="text-left py-1.5 w-[120px]">CLABE</th>
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
                        <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0"><Building2 className="w-3 h-3 text-emerald-400"/></div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate text-xs leading-tight">{s.name}</p>
                          {s.contact_name&&<p className="text-[10px] text-slate-500 truncate leading-tight">{s.contact_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      {cats.length>0&&<div className="flex gap-0.5 flex-wrap">{cats.slice(0,2).map(c=><span key={c} className="text-[9px] px-1 py-0.5 bg-blue-500/15 text-blue-400 rounded">{c}</span>)}{cats.length>2&&<span className="text-[9px] text-slate-500">+{cats.length-2}</span>}</div>}
                    </td>
                    <td className="text-slate-400">
                      {s.phone&&<a href={`tel:${s.phone}`} className="hover:text-blue-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5"/>{s.phone}</a>}
                    </td>
                    <td className="text-slate-400 truncate max-w-[200px]">
                      {s.email&&<a href={`mailto:${s.email}`} className="hover:text-blue-400">{s.email}</a>}
                    </td>
                    <td className="text-slate-400">
                      {s.credit_days&&s.credit_days>0?<span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">{s.credit_days}d</span>:null}
                    </td>
                    <td>
                      {s.bank_clabe&&s.bank_clabe.length>=10?(
                        <button onClick={()=>copyClabe(s.id,s.bank_clabe!)} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white" title={s.bank_clabe}>
                          {copiedId===s.id?<Check className="w-2.5 h-2.5 text-emerald-400"/>:<Copy className="w-2.5 h-2.5"/>}
                          {s.bank_name||"CLABE"}
                        </button>
                      ):null}
                    </td>
                    <td className="pr-2">
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>setExpedienteSup(s)} title="Expediente" className="p-1 hover:bg-violet-500/20 rounded text-violet-400/70 hover:text-violet-400"><FolderOpen className="w-3 h-3"/></button>
                        <button onClick={()=>openEdit(s)} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"><Edit2 className="w-3 h-3"/></button>
                        {canDelete && (<button onClick={()=>handleDelete(s.id,s.name)} className="p-1 hover:bg-red-500/20 rounded text-slate-500 hover:text-red-400"><Trash2 className="w-3 h-3"/></button>)}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10 flex-none">
              <h2 className="text-lg font-bold text-white">{editingId?"Editar Proveedor":"Nuevo Proveedor"}</h2>
              <button onClick={()=>{setShowModal(false);setEditingId(null);}} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400"><X className="w-4 h-4"/></button>
            </div>
            <div className="overflow-auto p-4 space-y-4 flex-1">
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Identificación</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[11px] text-slate-400 mb-0.5 block">Nombre comercial *</label>
                    <input value={form.name} onChange={e=>updateField("name",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="Ej: SAACSA"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-0.5 block">Razón Social</label>
                    <input value={form.razon_social} onChange={e=>updateField("razon_social",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="SA de CV"/>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-0.5 block">RFC</label>
                    <input value={form.rfc} onChange={e=>updateField("rfc",e.target.value.toUpperCase())} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white uppercase placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="ABC123456XY0" maxLength={13}/>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Contacto</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">Contacto</label><input value={form.contact_name} onChange={e=>updateField("contact_name",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="Nombre"/></div>
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">Teléfono</label><input value={form.phone} onChange={e=>updateField("phone",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="(449) 123-4567"/></div>
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">Email</label><input value={form.email} onChange={e=>updateField("email",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="ventas@empresa.com"/></div>
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">WhatsApp</label><input value={form.whatsapp} onChange={e=>updateField("whatsapp",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="4491234567"/></div>
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">Web</label><input value={form.website} onChange={e=>updateField("website",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="www.empresa.com"/></div>
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">Dirección</label><input value={form.address} onChange={e=>updateField("address",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="Calle, colonia"/></div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Comercial</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">Categoría</label><input value={form.categories} onChange={e=>updateField("categories",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="ACEROS" list="cats-list"/><datalist id="cats-list">{categories.map(c=><option key={c} value={c}/>)}</datalist></div>
                  <div>
                    <label className="text-[11px] text-slate-400 mb-0.5 block">Forma pago</label>
                    <select value={form.payment_method} onChange={e=>updateField("payment_method",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white focus:border-emerald-500/50 outline-none">
                      <option value="TRANSFERENCIA">Transferencia</option><option value="EFECTIVO">Efectivo</option><option value="CHEQUE">Cheque</option><option value="CREDITO">Crédito</option><option value="TARJETA">Tarjeta</option>
                    </select>
                  </div>
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">Días crédito</label><input type="number" value={form.credit_days} onChange={e=>updateField("credit_days",parseInt(e.target.value)||0)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white focus:border-emerald-500/50 outline-none" min={0}/></div>
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">Zona</label><input value={form.zona_cobertura} onChange={e=>updateField("zona_cobertura",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="Aguascalientes"/></div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Bancario</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">Banco</label><input value={form.bank_name} onChange={e=>updateField("bank_name",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="BBVA"/></div>
                  <div><label className="text-[11px] text-slate-400 mb-0.5 block">CLABE</label><input value={form.bank_clabe} onChange={e=>updateField("bank_clabe",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white font-mono placeholder-slate-500 focus:border-emerald-500/50 outline-none" placeholder="18 dígitos" maxLength={18}/></div>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 mb-0.5 block">Notas</label>
                <textarea value={form.notas_comerciales} onChange={e=>updateField("notas_comerciales",e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500/50 outline-none resize-none h-16" placeholder="Observaciones"/>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-white/10 flex-none">
              <button onClick={()=>{setShowModal(false);setEditingId(null);}} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/10 rounded-lg">Cancelar</button>
              <button onClick={handleSave} disabled={saving||!form.name.trim()} className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg flex items-center gap-1"><Save className="w-3 h-3"/>{saving?"...":editingId?"Actualizar":"Crear"}</button>
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
