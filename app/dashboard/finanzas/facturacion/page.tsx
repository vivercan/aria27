"use client";
import { clientLogger } from "@/lib/client-logger";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { FileText, Search, Plus, DollarSign, CheckCircle2, Clock, AlertTriangle, Loader2, Upload, Download, X, File, FileJson } from "lucide-react";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";
import { getEntityColor } from "@/lib/entity-colors";
import CanonPageHeader from "@/components/ui/CanonPageHeader";
import PortalesBlikonCard from "@/components/PortalesBlikonCard";

interface Factura {
  id: string;
  folio: string;
  serie: string;
  cliente: string;
  rfc_cliente: string;
  uuid_fiscal?: string;
  concepto: string;
  subtotal: number;
  iva: number;
  total: number;
  status: string;
  obra_nombre: string;
  fecha_emision: string;
  fecha_pago: string;
  metodo_pago: string;
  uso_cfdi: string;
  tipo?: string;
  created_at: string;
}

interface FacturaFiles {
  xml: File | null;
  pdf: File | null;
}

interface FacturaStorageFiles {
  xml: string | null;
  pdf: string | null;
}

export default function FacturacionPage() {
  const log = clientLogger("FACTURACION");
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODOS");
  const [filterTipo, setFilterTipo] = useState("TODOS");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    serie: "A", cliente: "", rfc_cliente: "", concepto: "", subtotal: 0, obra_nombre: "",
    metodo_pago: "PUE", uso_cfdi: "G03", tipo: "EGRESO"
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { msg, flash, clear } = useFlashMessage();

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFacturaId, setUploadFacturaId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [facturaFiles, setFacturaFiles] = useState<FacturaFiles>({ xml: null, pdf: null });
  const [uploadedFiles, setUploadedFiles] = useState<Map<string, FacturaStorageFiles>>(new Map());

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data } = await supabase.from("facturas").select("*").order("created_at", { ascending: false });
      setFacturas(data || []);

      // Load uploaded files for each factura
      const filesMap = new Map<string, FacturaStorageFiles>();
      for (const f of data || []) {
        const files = await loadFacturaFiles(f.id);
        if (files.xml || files.pdf) {
          filesMap.set(f.id, files);
        }
      }
      setUploadedFiles(filesMap);
    } catch (e: unknown) { log.error(String(e)); }
    finally { setLoading(false); }
  }

  async function loadFacturaFiles(facturaId: string): Promise<FacturaStorageFiles> {
    try {
      const { data: xmlFiles } = await supabase.storage
        .from("finanzas")
        .list(`facturas/${facturaId}`, { search: ".xml" });
      const { data: pdfFiles } = await supabase.storage
        .from("finanzas")
        .list(`facturas/${facturaId}`, { search: ".pdf" });

      let xmlUrl = null;
      let pdfUrl = null;

      if (xmlFiles && xmlFiles.length > 0) {
        const xmlFile = xmlFiles[0];
        const { data: { publicUrl } } = supabase.storage
          .from("finanzas")
          .getPublicUrl(`facturas/${facturaId}/${xmlFile.name}`);
        xmlUrl = publicUrl;
      }

      if (pdfFiles && pdfFiles.length > 0) {
        const pdfFile = pdfFiles[0];
        const { data: { publicUrl } } = supabase.storage
          .from("finanzas")
          .getPublicUrl(`facturas/${facturaId}/${pdfFile.name}`);
        pdfUrl = publicUrl;
      }

      return { xml: xmlUrl, pdf: pdfUrl };
    } catch (e: unknown) {
      log.error("Error loading files:", { data: e });
      return { xml: null, pdf: null };
    }
  }

  function parseXmlCFDI(xmlString: string): Partial<Factura> | null {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");

      if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
        log.error("Error parsing XML");
        return null;
      }

      // Get root element
      const comprobante = xmlDoc.documentElement;
      const uuid = comprobante.getAttribute("Folio") || "";
      const fecha = comprobante.getAttribute("Fecha") || "";
      const metodoPago = comprobante.getAttribute("MetodoPago") || "PUE";

      // Get issuer info
      const emisor = comprobante.getElementsByTagName("cfdi:Emisor")[0];
      const rfcEmisor = emisor?.getAttribute("Rfc") || "";

      // Get receiver info
      const receptor = comprobante.getElementsByTagName("cfdi:Receptor")[0];
      const rfcReceptor = receptor?.getAttribute("Rfc") || "";

      // Get totals
      const concepto = comprobante.getElementsByTagName("cfdi:Concepto")[0];
      let subtotal = 0;
      let iva = 0;

      const conceptos = comprobante.getElementsByTagName("cfdi:Concepto");
      for (let i = 0; i < conceptos.length; i++) {
        const importe = parseFloat(conceptos[i].getAttribute("Importe") || "0");
        subtotal += importe;
      }

      const impuestos = comprobante.getElementsByTagName("cfdi:Traslado")[0];
      if (impuestos) {
        iva = parseFloat(impuestos.getAttribute("Importe") || "0");
      }

      const total = parseFloat(comprobante.getAttribute("Total") || "0");

      return {
        uuid_fiscal: uuid,
        rfc_cliente: rfcReceptor,
        fecha_emision: fecha.split("T")[0],
        subtotal: subtotal || 0,
        iva: iva || 0,
        total: total || (subtotal + iva),
        metodo_pago: metodoPago,
      };
    } catch (e: unknown) {
      log.error("Error parsing CFDI XML:", { data: e });
      return null;
    }
  }

  async function handleUploadFiles() {
    if (!uploadFacturaId) return;
    setUploading(true);

    try {
      if (facturaFiles.xml) {
        const xmlContent = await facturaFiles.xml.text();
        const xmlPath = `facturas/${uploadFacturaId}/${uploadFacturaId}.xml`;
        const { error: xmlError } = await supabase.storage
          .from("finanzas")
          .upload(xmlPath, facturaFiles.xml, { upsert: true });

        if (!xmlError) {
          const xmlData = parseXmlCFDI(xmlContent);
          if (xmlData && xmlData.uuid_fiscal) {
            await supabase.from("facturas").update({ uuid_fiscal: xmlData.uuid_fiscal }).eq("id", uploadFacturaId);
          }
        }
      }

      if (facturaFiles.pdf) {
        const pdfPath = `facturas/${uploadFacturaId}/${uploadFacturaId}.pdf`;
        await supabase.storage
          .from("finanzas")
          .upload(pdfPath, facturaFiles.pdf, { upsert: true });
      }

      // Reload files
      const files = await loadFacturaFiles(uploadFacturaId);
      setUploadedFiles(prev => new Map(prev).set(uploadFacturaId, files));

      setFacturaFiles({ xml: null, pdf: null });
      setShowUploadModal(false);
      flash("ok", "Archivos subidos exitosamente");
    } catch (e: unknown) {
      log.error("Upload error:", { data: e });
      flash("err", "Error al subir archivos: " + (e instanceof Error ? (e as Error).message : "Desconocido"));
    } finally {
      setUploading(false);
    }
  }

  function validar(): boolean {
    const errors: Record<string, string> = {};
    if (!form.cliente?.trim()) errors.cliente = "Cliente es obligatorio";
    if (form.subtotal <= 0) errors.subtotal = "Subtotal debe ser mayor a 0";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function guardar() {
    if (!validar()) return;
    // Folio derivado del max(folio) por serie. NOTA: sin unique constraint en
    // (serie, folio) sigue habiendo riesgo de colisión bajo concurrencia.
    // Mitigación cliente + retry simple. Deuda P1: añadir unique index en BD.
    const iva = +(form.subtotal * 0.16).toFixed(2);
    const total = +(form.subtotal + iva).toFixed(2);

    const generarFolio = async (): Promise<string> => {
      const { data: rows } = await supabase
        .from("facturas")
        .select("folio")
        .eq("serie", form.serie)
        .order("folio", { ascending: false })
        .limit(1);
      const last = rows?.[0]?.folio as string | undefined;
      const lastNum = last ? parseInt(last.split("-").pop() || "0", 10) || 0 : 0;
      return `${form.serie}-${String(lastNum + 1).padStart(5, "0")}`;
    };

    const intentar = async (intento: number): Promise<{ ok: boolean; err?: string }> => {
      const folio = await generarFolio();
      const { error } = await supabase.from("facturas").insert({
        folio, serie: form.serie, cliente: form.cliente, rfc_cliente: form.rfc_cliente,
        concepto: form.concepto, subtotal: form.subtotal, iva, total,
        status: "EMITIDA", obra_nombre: form.obra_nombre, fecha_emision: new Date().toISOString().split("T")[0],
        metodo_pago: form.metodo_pago, uso_cfdi: form.uso_cfdi, tipo: (form as Record<string, unknown>).tipo,
      });
      if (!error) return { ok: true };
      // Si fue colisión por unique constraint, reintentar una sola vez.
      const msg = (error as {message?: string})?.message || "Error desconocido" || "";
      const esDuplicado = /duplicate|unique|23505/i.test(msg);
      if (esDuplicado && intento < 2) return intentar(intento + 1);
      return { ok: false, err: msg };
    };

    const r = await intentar(1);
    if (!r.ok) { flash("err", "Error: " + r.err); return; }
    setShowForm(false);
    setForm({ serie: "A", cliente: "", rfc_cliente: "", concepto: "", subtotal: 0, obra_nombre: "", metodo_pago: "PUE", uso_cfdi: "G03", tipo: "EGRESO" });
    loadData();
  }

  const totalFacturado = facturas.reduce((s, f) => s + (f.total || 0), 0);
  const totalCobrado = facturas.filter(f => f.status === "PAGADA").reduce((s, f) => s + (f.total || 0), 0);

  const filtered = facturas.filter(f => {
    const matchSearch = !search || f.folio?.toLowerCase().includes(search.toLowerCase()) || f.cliente?.toLowerCase().includes(search.toLowerCase()) || f.uuid_fiscal?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "TODOS" || f.status === filter;
    const matchTipo = filterTipo === "TODOS" || f.tipo === filterTipo;
    return matchSearch && matchFilter && matchTipo;
  });

  return (
    <div className="aria-page-canon space-y-6 max-w-7xl mx-auto">
      <CanonPageHeader
        title="Facturacion"
        subtitle="Control de facturas emitidas - IVA 16%"
        backHref="/dashboard/finanzas"
        right={
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] text-white rounded-full text-sm font-medium hover:bg-[#2A4A8E] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nueva Factura
          </button>
        }
      />

      {/* Aviso CFDI prominente */}
      <div className="p-5 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/20 flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-amber-300">Registro Interno — Sin Timbrado CFDI</h3>
            <p className="text-sm text-amber-400/80 mt-1">
              Este módulo registra facturas para control interno de la empresa.
              No genera CFDI (Comprobante Fiscal Digital por Internet) ni timbrado ante el SAT.
            </p>
            <div className="mt-3 p-3 bg-black/20 rounded-lg">
              <p className="text-xs text-[#c9d8ed] font-medium mb-1">Para habilitar facturación electrónica se requiere:</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#7f93b0]">
                <span>1. Contratar un PAC autorizado por el SAT</span>
                <span>2. Certificado de Sello Digital (CSD)</span>
                <span>3. Configurar API del PAC en ARIA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portales facturacion CFDI - 24-Abr-2026 */}
      <PortalesBlikonCard />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Facturado", value: `$${totalFacturado.toLocaleString()}`, icon: DollarSign, color: "text-aria-accent", bg: "bg-aria-primary/10" },
          { label: "Cobrado", value: `$${totalCobrado.toLocaleString()}`, icon: CheckCircle2, color: "text-aria-accent", bg: "bg-emerald-500/10" },
          { label: "Pendiente", value: `$${(totalFacturado - totalCobrado).toLocaleString()}`, icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((s, i) => (
          <div key={i} className="p-4 bg-gradient-to-br from-[#1E3E7A]/15 to-[#0A2450]/25 border border-[#3A5E9A]/40 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}><s.icon className={`w-4 h-4 ${s.color}`} /></div>
            <p className="text-xl font-bold text-white">{loading ? "..." : s.value}</p>
            <p className="text-xs text-[#7f93b0]">{s.label}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Nueva Factura</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="text-xs text-[#7f93b0] mb-1 block">Tipo</label>
              <select value={form.tipo as string || "EGRESO"} onChange={e => setForm({...form, tipo: e.target.value})} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none">
                <option value="INGRESO">INGRESO - Dinero que entra</option><option value="EGRESO">EGRESO - Dinero que sale</option>
              </select></div>
            <div><label className="text-xs text-[#7f93b0] mb-1 block">Cliente *</label>
              <input value={form.cliente} onChange={e => setForm({...form, cliente: e.target.value})} placeholder="Razón social" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-[#4a6080] focus:outline-none" />{formErrors.cliente && <p className="text-red-400 text-xs mt-1">{formErrors.cliente}</p>}</div>
            <div><label className="text-xs text-[#7f93b0] mb-1 block">RFC</label>
              <input value={form.rfc_cliente} onChange={e => setForm({...form, rfc_cliente: e.target.value.toUpperCase()})} placeholder="RFC del cliente" maxLength={13} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-[#4a6080] focus:outline-none uppercase" /></div>
            <div><label className="text-xs text-[#7f93b0] mb-1 block">Obra</label>
              <input value={form.obra_nombre} onChange={e => setForm({...form, obra_nombre: e.target.value})} placeholder="Nombre de la obra" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-[#4a6080] focus:outline-none" /></div>
            <div className="md:col-span-2"><label className="text-xs text-[#7f93b0] mb-1 block">Concepto</label>
              <input value={form.concepto} onChange={e => setForm({...form, concepto: e.target.value})} placeholder="Descripción del servicio" className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm placeholder:text-[#4a6080] focus:outline-none" /></div>
            <div><label className="text-xs text-[#7f93b0] mb-1 block">Subtotal (sin IVA) *</label>
              <input type="number" min="0" value={form.subtotal} onChange={e => setForm({...form, subtotal: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none" />{formErrors.subtotal && <p className="text-red-400 text-xs mt-1">{formErrors.subtotal}</p>}</div>
            <div><label className="text-xs text-[#7f93b0] mb-1 block">Método Pago</label>
              <select value={form.metodo_pago} onChange={e => setForm({...form, metodo_pago: e.target.value})} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none">
                <option value="PUE">PUE - Pago en una sola exhibición</option><option value="PPD">PPD - Pago en parcialidades</option>
              </select></div>
            <div><label className="text-xs text-[#7f93b0] mb-1 block">Uso CFDI</label>
              <select value={form.uso_cfdi} onChange={e => setForm({...form, uso_cfdi: e.target.value})} className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white text-sm focus:outline-none">
                <option value="G03">G03 - Gastos en general</option><option value="I01">I01 - Construcciones</option><option value="P01">P01 - Por definir</option>
              </select></div>
          </div>
          {form.subtotal > 0 && (
            <div className="p-3 bg-white/[0.04] rounded-lg text-sm">
              <span className="text-[#7f93b0]">Subtotal: </span><span className="text-white">${form.subtotal.toLocaleString()}</span>
              <span className="text-[#7f93b0] mx-2">+ IVA: </span><span className="text-white">${(form.subtotal * 0.16).toLocaleString()}</span>
              <span className="text-[#7f93b0] mx-2">= Total: </span><span className="text-aria-accent font-bold">${(form.subtotal * 1.16).toLocaleString()}</span>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={guardar} className="px-6 py-2 bg-[#1E3E7A] hover:bg-[#2A4A8E] text-white font-medium rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.25)] text-sm font-medium">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-6 py-2 bg-white/[0.04] hover:bg-white/[0.06] text-[#c9d8ed] rounded-lg text-sm">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por folio, cliente, UUID fiscal..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white text-sm placeholder:text-[#4a6080] focus:border-aria-primary/50 focus:outline-none" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <span className="text-xs text-[#7f93b0] py-2">Estado:</span>
            {["TODOS", "EMITIDA", "PAGADA", "CANCELADA"].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-aria-primary-light text-aria-accent border border-aria-primary/30" : "bg-white/[0.04] text-[#7f93b0] border border-white/[0.08] hover:bg-white/[0.06]"}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <span className="text-xs text-[#7f93b0] py-2">Tipo:</span>
            {["TODOS", "INGRESO", "EGRESO"].map(t => (
              <button key={t} onClick={() => setFilterTipo(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filterTipo === t ? "bg-emerald-500/20 text-aria-accent border border-emerald-500/30" : "bg-white/[0.04] text-[#7f93b0] border border-white/[0.08] hover:bg-white/[0.06]"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)] backdrop-blur z-10">
              <tr className="text-[#7f93b0] text-xs uppercase">
                <th className="text-left p-3">Folio</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">RFC</th>
                <th className="text-center p-3">UUID Fiscal</th>
                <th className="text-left p-3">Obra</th>
                <th className="text-right p-3">Total</th>
                <th className="text-center p-3">Archivos</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]"><Loader2 className="w-6 h-6 animate-spin text-aria-accent mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-[#7f93b0]">Sin facturas registradas</td></tr>
              ) : filtered.map(f => {
                const files = uploadedFiles.get(f.id);
                return (
                  <tr key={f.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="p-3 text-white font-mono text-xs">{f.folio}</td>
                    <td className="p-3 text-white text-sm">{f.cliente}</td>
                    <td className="p-3 text-[#7f93b0] font-mono text-xs">{f.rfc_cliente}</td>
                    <td className="p-3 text-center text-[#7f93b0] font-mono text-xs">{f.uuid_fiscal ? f.uuid_fiscal.substring(0, 8) + "..." : "-"}</td>
                    <td className="p-3">{f.obra_nombre ? <span className={`px-2 py-1 rounded-lg text-xs ${getEntityColor(f.obra_nombre)}`}>{f.obra_nombre}</span> : <span className="text-[#7f93b0]">—</span>}</td>
                    <td className="p-3 text-right text-white font-medium">${(f.total || 0).toLocaleString()}</td>
                    <td className="p-3 text-center flex gap-2 justify-center">
                      {files?.xml && <span title="XML"><FileJson className="w-4 h-4 text-aria-accent" /></span>}
                      {files?.pdf && <span title="PDF"><FileText className="w-4 h-4 text-red-400" /></span>}
                      {!files?.xml && !files?.pdf && <span className="text-[#4a6080] text-xs">—</span>}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        f.status === "PAGADA" ? "bg-emerald-500/20 text-aria-accent" :
                        f.status === "CANCELADA" ? "bg-red-500/20 text-red-400" :
                        "bg-aria-primary-light text-aria-accent"
                      }`}>{f.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setUploadFacturaId(f.id);
                          setFacturaFiles({ xml: null, pdf: null });
                          setShowUploadModal(true);
                        }}
                        className="px-3 py-1.5 bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 mx-auto"
                      >
                        <Upload className="w-3 h-3" /> Adjuntar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50  flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a1628] border border-white/[0.08] rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Adjuntar Archivos CFDI</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-[#7f93b0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* XML Upload */}
              <div className="p-4 border border-white/[0.08] rounded-lg hover:bg-white/[0.02] transition-colors">
                <label className="flex items-center gap-3 cursor-pointer">
                  <FileJson className="w-5 h-5 text-aria-accent" />
                  <div>
                    <p className="text-sm font-medium text-white">Archivo XML</p>
                    <p className="text-xs text-[#7f93b0]">Comprobante fiscal digital</p>
                  </div>
                  <input
                    type="file"
                    accept=".xml"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setFacturaFiles(prev => ({ ...prev, xml: file }));
                    }}
                    className="hidden"
                  />
                </label>
                {facturaFiles.xml && (
                  <div className="mt-2 p-2 bg-emerald-500/10 rounded text-xs text-aria-accent flex items-center justify-between">
                    <span>{facturaFiles.xml.name}</span>
                    <button onClick={() => setFacturaFiles(prev => ({ ...prev, xml: null }))} className="hover:text-emerald-200">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* PDF Upload */}
              <div className="p-4 border border-white/[0.08] rounded-lg hover:bg-white/[0.02] transition-colors">
                <label className="flex items-center gap-3 cursor-pointer">
                  <FileText className="w-5 h-5 text-red-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Archivo PDF</p>
                    <p className="text-xs text-[#7f93b0]">Representación visual</p>
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) setFacturaFiles(prev => ({ ...prev, pdf: file }));
                    }}
                    className="hidden"
                  />
                </label>
                {facturaFiles.pdf && (
                  <div className="mt-2 p-2 bg-red-500/10 rounded text-xs text-red-300 flex items-center justify-between">
                    <span>{facturaFiles.pdf.name}</span>
                    <button onClick={() => setFacturaFiles(prev => ({ ...prev, pdf: null }))} className="hover:text-red-200">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-aria-primary/10 border border-aria-primary/20 rounded-lg text-xs text-aria-accent">
              Nota: Al subir el XML, se extraerá automáticamente el UUID fiscal y otros datos del comprobante.
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUploadFiles}
                disabled={!facturaFiles.xml && !facturaFiles.pdf || uploading}
                className="flex-1 px-4 py-2 rounded-full bg-[#1E3E7A] border border-[rgba(130,170,230,0.25)] hover:bg-[#2A4A8E] disabled:bg-[#162040] disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Subiendo..." : "Subir"}
              </button>
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.06] text-[#c9d8ed] rounded-lg text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
