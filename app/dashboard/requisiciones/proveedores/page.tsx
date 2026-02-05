"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Search, Edit2, Phone, Mail, Building2,
  MapPin, Star, X, Save, Copy, Check, Trash2, Globe,
  MessageCircle, CreditCard, Filter
} from "lucide-react";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  rfc: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  categories: string | null;
  contact_name: string | null;
  credit_days: number | null;
  active: boolean;
  folio: string | null;
  website: string | null;
  whatsapp: string | null;
  bank_name: string | null;
  bank_clabe: string | null;
  payment_method: string | null;
  razon_social: string | null;
  zona_cobertura: string | null;
  calificacion: number | null;
  notas_comerciales: string | null;
}

const EMPTY_FORM = {
  name: "", rfc: "", phone: "", email: "", address: "",
  categories: "", contact_name: "", credit_days: 0,
  website: "", whatsapp: "", bank_name: "", bank_clabe: "",
  payment_method: "TRANSFERENCIA", razon_social: "",
  zona_cobertura: "", notas_comerciales: ""
};

export default function ProveedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("id, name, rfc, phone, email, address, categories, contact_name, credit_days, active, folio, website, whatsapp, bank_name, bank_clabe, payment_method, razon_social, zona_cobertura, calificacion, notas_comerciales")
      .order("name");
    if (data) setSuppliers(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const categories = [...new Set(suppliers.map(s => s.categories).filter(Boolean))].sort();

  const filtered = suppliers.filter(s => {
    const matchSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.rfc?.toLowerCase().includes(search.toLowerCase()) ||
      s.contact_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || s.categories === filterCat;
    return matchSearch && matchCat;
  });

  const openNew = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (s: Supplier) => {
    setForm({
      name: s.name || "",
      rfc: s.rfc || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      categories: s.categories || "",
      contact_name: s.contact_name || "",
      credit_days: s.credit_days || 0,
      website: s.website || "",
      whatsapp: s.whatsapp || "",
      bank_name: s.bank_name || "",
      bank_clabe: s.bank_clabe || "",
      payment_method: s.payment_method || "TRANSFERENCIA",
      razon_social: s.razon_social || "",
      zona_cobertura: s.zona_cobertura || "",
      notas_comerciales: s.notas_comerciales || "",
    });
    setEditingId(s.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await supabase.from("suppliers").update(form).eq("id", editingId);
      } else {
        await supabase.from("suppliers").insert({ ...form, active: true });
      }
      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadSuppliers();
    } catch (e) {
      console.error("Error guardando:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar proveedor "${name}"? Esta acción no se puede deshacer.`)) return;
    await supabase.from("suppliers").delete().eq("id", id);
    await loadSuppliers();
  };

  const copyClabe = (id: string, clabe: string) => {
    navigator.clipboard.writeText(clabe);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const updateField = (field: string, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* HEADER */}
      <div className="flex-none p-6 border-b border-white/10">
        <Link href="/dashboard/requisiciones" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Requisiciones
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Proveedores</h1>
            <p className="text-slate-400 text-sm">
              {filtered.length} de {suppliers.length} proveedores • {categories.length} categorías
            </p>
          </div>
          <button onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </button>
        </div>
        <div className="mt-4 flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Buscar por nombre, RFC o contacto..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition-colors" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:border-blue-500/50 focus:outline-none transition-colors">
              <option value="">Todas las categorías</option>
              {categories.map(c => <option key={c} value={c!}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* LISTA */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No se encontraron proveedores</p>
            <p className="text-slate-500 text-sm mt-1">Intenta con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => (
              <div key={s.id} className="p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white truncate">{s.name}</h3>
                        {s.categories && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full font-medium">{s.categories}</span>
                        )}
                        {s.calificacion && s.calificacion > 0 && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5" />{s.calificacion}
                          </span>
                        )}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.active !== false ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {s.active !== false ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                      {s.rfc && <p className="text-xs text-slate-500 mt-0.5">RFC: {s.rfc}</p>}
                      {s.contact_name && <p className="text-xs text-slate-400 mt-0.5">👤 {s.contact_name}</p>}

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                            <Phone className="w-3 h-3" />{s.phone}
                          </a>
                        )}
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                            <Mail className="w-3 h-3" />{s.email}
                          </a>
                        )}
                        {s.whatsapp && (
                          <a href={`https://wa.me/52${s.whatsapp.replace(/\D/g,"")}`} target="_blank"
                            className="flex items-center gap-1 hover:text-green-400 transition-colors">
                            <MessageCircle className="w-3 h-3" />WhatsApp
                          </a>
                        )}
                        {s.website && (
                          <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`} target="_blank"
                            className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
                            <Globe className="w-3 h-3" />Web
                          </a>
                        )}
                        {s.credit_days && s.credit_days > 0 && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />{s.credit_days} días crédito
                          </span>
                        )}
                      </div>

                      {s.bank_clabe && s.bank_clabe.length >= 10 && (
                        <div className="mt-2 px-3 py-2 bg-white/[0.04] rounded-lg flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-slate-500">CLABE {s.bank_name && `• ${s.bank_name}`}</span>
                            <p className="text-sm text-white font-mono">{s.bank_clabe}</p>
                          </div>
                          <button onClick={() => copyClabe(s.id, s.bank_clabe!)}
                            className={`p-1.5 rounded-lg transition-all ${copiedId === s.id ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-slate-400 hover:text-white"}`}>
                            {copiedId === s.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}

                      {s.address && (
                        <p className="text-[11px] text-slate-600 mt-1.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{s.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(s)}
                      className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(s.id, s.name)}
                      className="p-2 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CREAR/EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-white/10 flex-none">
              <h2 className="text-xl font-bold text-white">
                {editingId ? "Editar Proveedor" : "Nuevo Proveedor"}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); }}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-auto p-6 space-y-5 flex-1">
              {/* Identificación */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Identificación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1 block">Nombre comercial *</label>
                    <input value={form.name} onChange={e => updateField("name", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="Ej: SAACSA" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Razón Social</label>
                    <input value={form.razon_social} onChange={e => updateField("razon_social", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="Ej: Aceros SA de CV" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">RFC</label>
                    <input value={form.rfc} onChange={e => updateField("rfc", e.target.value.toUpperCase())}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none uppercase"
                      placeholder="ABC123456XY0" maxLength={13} />
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Contacto</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Contacto principal</label>
                    <input value={form.contact_name} onChange={e => updateField("contact_name", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="Nombre del contacto" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Teléfono</label>
                    <input value={form.phone} onChange={e => updateField("phone", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="(449) 123-4567" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Email</label>
                    <input type="email" value={form.email} onChange={e => updateField("email", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="ventas@empresa.com" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">WhatsApp</label>
                    <input value={form.whatsapp} onChange={e => updateField("whatsapp", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="4491234567" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Sitio web</label>
                    <input value={form.website} onChange={e => updateField("website", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="www.empresa.com" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-slate-400 mb-1 block">Dirección</label>
                    <input value={form.address} onChange={e => updateField("address", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="Calle, colonia, ciudad" />
                  </div>
                </div>
              </div>

              {/* Comercial */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Comercial</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                    <input value={form.categories} onChange={e => updateField("categories", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="Ej: ACEROS" list="categorias-list" />
                    <datalist id="categorias-list">
                      {categories.map(c => <option key={c} value={c!} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Forma de pago</label>
                    <select value={form.payment_method} onChange={e => updateField("payment_method", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none">
                      <option value="TRANSFERENCIA">Transferencia</option>
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CREDITO">Crédito</option>
                      <option value="TARJETA">Tarjeta</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Días de crédito</label>
                    <input type="number" value={form.credit_days} onChange={e => updateField("credit_days", parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:border-blue-500/50 focus:outline-none"
                      min={0} max={180} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Zona cobertura</label>
                    <input value={form.zona_cobertura} onChange={e => updateField("zona_cobertura", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="Aguascalientes" />
                  </div>
                </div>
              </div>

              {/* Bancario */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Datos Bancarios</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Banco</label>
                    <input value={form.bank_name} onChange={e => updateField("bank_name", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
                      placeholder="Ej: BBVA" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">CLABE interbancaria</label>
                    <input value={form.bank_clabe} onChange={e => updateField("bank_clabe", e.target.value)}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none font-mono"
                      placeholder="18 dígitos" maxLength={18} />
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Notas comerciales</label>
                <textarea value={form.notas_comerciales} onChange={e => updateField("notas_comerciales", e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none resize-none h-20"
                  placeholder="Observaciones, acuerdos especiales, etc." />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-white/10 flex-none">
              <button onClick={() => { setShowModal(false); setEditingId(null); }}
                className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-medium flex items-center gap-2 transition-colors">
                <Save className="w-4 h-4" />
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear Proveedor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
