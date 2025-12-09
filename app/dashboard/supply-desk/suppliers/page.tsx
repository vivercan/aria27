"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, Plus, Trash2, Save, X, Phone, Globe, MessageCircle, CreditCard } from "lucide-react";

type Supplier = {
  id: number;
  folio: string;
  name: string;
  status: string;
  contact_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  website: string;
  payment_method: string;
  credit_days: number;
  bank_name: string;
  bank_account: string;
  bank_clabe: string;
  categories: string[];
  products_offered: string;
  active: boolean;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({
    name: "", status: "ACTIVO", contact_name: "", email: "", phone: "", whatsapp: "",
    address: "", website: "", payment_method: "transferencia", credit_days: 0,
    bank_name: "", bank_account: "", bank_clabe: "", categories: "", products_offered: ""
  });

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    const { data } = await supabase.from("suppliers").select("*").order("name");
    setSuppliers((data || []) as Supplier[]);
    setLoading(false);
  };

  const openNew = () => {
    setEditingSupplier(null);
    setForm({ name: "", status: "ACTIVO", contact_name: "", email: "", phone: "", whatsapp: "",
      address: "", website: "", payment_method: "transferencia", credit_days: 0,
      bank_name: "", bank_account: "", bank_clabe: "", categories: "", products_offered: "" });
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({
      name: s.name || "", status: s.status || "ACTIVO", contact_name: s.contact_name || "",
      email: s.email || "", phone: s.phone || "", whatsapp: s.whatsapp || "",
      address: s.address || "", website: s.website || "", payment_method: s.payment_method || "transferencia",
      credit_days: s.credit_days || 0, bank_name: s.bank_name || "", bank_account: s.bank_account || "",
      bank_clabe: s.bank_clabe || "", categories: (s.categories || []).join(", "), products_offered: s.products_offered || ""
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) return;
    const nextFolio = `PROV-${String((suppliers.length || 0) + 1).padStart(3, "0")}`;
    const data = {
      name: form.name, status: form.status, contact_name: form.contact_name, email: form.email,
      phone: form.phone, whatsapp: form.whatsapp, address: form.address, website: form.website,
      payment_method: form.payment_method, credit_days: form.credit_days, bank_name: form.bank_name,
      bank_account: form.bank_account, bank_clabe: form.bank_clabe,
      categories: form.categories.split(",").map(c => c.trim()).filter(Boolean),
      products_offered: form.products_offered, active: form.status === "ACTIVO",
      folio: editingSupplier?.folio || nextFolio
    };
    if (editingSupplier) {
      await supabase.from("suppliers").update(data).eq("id", editingSupplier.id);
    } else {
      await supabase.from("suppliers").insert(data);
    }
    setShowModal(false);
    loadSuppliers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar este proveedor?")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    loadSuppliers();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-400" />
            Proveedores
          </h1>
          <p className="text-white/60 text-sm">Gestión de proveedores y condiciones comerciales.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-emerald-400">
          <Plus className="h-4 w-4" /> Nuevo Proveedor
        </button>
      </div>

      <div className="rounded-2xl bg-white/5 p-5 shadow-lg backdrop-blur">
        {loading ? (
          <div className="text-center py-8 text-white/50">Cargando...</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-white/50">No hay proveedores registrados.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs uppercase text-white/50">
                  <th className="pb-3 pr-4">Folio</th>
                  <th className="pb-3 pr-4">Nombre</th>
                  <th className="pb-3 pr-4">Contacto</th>
                  <th className="pb-3 pr-4">Teléfono</th>
                  <th className="pb-3 pr-4">Pago</th>
                  <th className="pb-3 pr-4">Banco</th>
                  <th className="pb-3 pr-4">Estado</th>
                  <th className="pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-white/5">
                    <td className="py-3 pr-4 font-mono text-xs text-blue-400">{s.folio}</td>
                    <td className="py-3 pr-4 font-medium">{s.name}</td>
                    <td className="py-3 pr-4 text-white/70">{s.contact_name}</td>
                    <td className="py-3 pr-4 text-white/70">
                      <div>{s.phone}</div>
                      {s.whatsapp && <div className="text-xs text-emerald-400 flex items-center gap-1"><MessageCircle className="h-3 w-3" />{s.whatsapp}</div>}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-1 rounded ${s.payment_method === "credito" ? "bg-emerald-500/20 text-emerald-400" : s.payment_method === "efectivo" ? "bg-amber-500/20 text-amber-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {s.payment_method}{s.credit_days > 0 ? ` ${s.credit_days}d` : ""}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      {s.bank_name === "PAGO EN EFECTIVO" ? <span className="text-amber-400">Efectivo</span> : s.bank_name ? (
                        <div><div className="text-white/70">{s.bank_name}</div><div className="text-white/50">{s.bank_clabe}</div></div>
                      ) : <span className="text-white/30">Sin datos</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-1 rounded ${s.status === "ACTIVO" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>{s.status}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(s)} className="rounded-lg bg-white/10 px-3 py-1 text-xs hover:bg-white/20">Editar</button>
                        <button onClick={() => handleDelete(s.id)} className="rounded-lg bg-red-500/20 px-2 py-1 text-red-400 hover:bg-red-500/30"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 overflow-auto py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-800 p-6 shadow-xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
              <button onClick={() => setShowModal(false)} className="rounded-full p-1 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 max-h-[70vh] overflow-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2"><label className="text-xs text-white/70">Nombre / Razón Social *</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
                <div><label className="text-xs text-white/70">Estado</label>
                  <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                    <option value="ACTIVO">ACTIVO</option><option value="PROSPECTO">PROSPECTO</option>
                  </select>
                </div>
                <div><label className="text-xs text-white/70">Contacto</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.contact_name} onChange={e => setForm(f => ({...f, contact_name: e.target.value}))} /></div>
                <div><label className="text-xs text-white/70">Email</label><input type="email" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
                <div><label className="text-xs text-white/70">Teléfono</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
                <div><label className="text-xs text-white/70 flex items-center gap-1"><MessageCircle className="h-3 w-3" />WhatsApp</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.whatsapp} onChange={e => setForm(f => ({...f, whatsapp: e.target.value}))} /></div>
                <div><label className="text-xs text-white/70">Sitio Web</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} /></div>
                <div className="col-span-2"><label className="text-xs text-white/70">Dirección</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
              </div>
              
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4" />Datos de Pago</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs text-white/70">Forma de Pago</label>
                    <select className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.payment_method} onChange={e => setForm(f => ({...f, payment_method: e.target.value}))}>
                      <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="cheque">Cheque</option><option value="credito">Crédito</option>
                    </select>
                  </div>
                  <div><label className="text-xs text-white/70">Días de Crédito</label><input type="number" className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.credit_days} onChange={e => setForm(f => ({...f, credit_days: Number(e.target.value)}))} /></div>
                  <div><label className="text-xs text-white/70">Banco</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" placeholder="BBVA, BANORTE, etc." value={form.bank_name} onChange={e => setForm(f => ({...f, bank_name: e.target.value}))} /></div>
                  <div><label className="text-xs text-white/70">No. Cuenta</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" value={form.bank_account} onChange={e => setForm(f => ({...f, bank_account: e.target.value}))} /></div>
                  <div className="col-span-2"><label className="text-xs text-white/70">CLABE Interbancaria</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm font-mono" placeholder="18 dígitos" value={form.bank_clabe} onChange={e => setForm(f => ({...f, bank_clabe: e.target.value}))} /></div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div><label className="text-xs text-white/70">Categorías (separadas por coma)</label><input className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm" placeholder="lubricantes, aceites, filtros" value={form.categories} onChange={e => setForm(f => ({...f, categories: e.target.value}))} /></div>
                <div className="mt-3"><label className="text-xs text-white/70">Productos/Servicios que ofrece</label><textarea className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm h-20" placeholder="Descripción de productos..." value={form.products_offered} onChange={e => setForm(f => ({...f, products_offered: e.target.value}))} /></div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-full text-sm hover:bg-white/10">Cancelar</button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-emerald-400"><Save className="h-4 w-4" /> Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
