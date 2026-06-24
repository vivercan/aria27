"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AriaBackButton from "@/components/AriaBackButton";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Fuel, Camera, Loader2, CheckCircle } from "lucide-react";

interface Obra {
  id: string;
  nombre: string;
  codigo?: string;
}

interface Equipo {
  id: string;
  alias: string;
  tipo_combustible: "DIESEL" | "MAGNA" | "PREMIUM";
  consumo_estandar_litros: number;
  numero_economico?: string;
  operador?: { full_name?: string; whatsapp_phone?: string } | null;
  operador_employee_id?: string;
}

interface ProveedorOption {
  id: number | string;
  name: string;
  bank_name?: string | null;
  bank_clabe?: string | null;
  bank_account_number?: string | null;
  payment_method?: string | null;
  razon_social?: string | null;
}

interface Carga {
  equipo_id: string;
  equipo_alias: string;
  tipo_combustible: "DIESEL" | "MAGNA" | "PREMIUM";
  litros_solicitados: number;
  precio_litro_estimado: number;
  horometro_lectura: number | "";
  horometro_foto_url: string;
  horometro_file?: File;
  operador_employee_id?: string;
  notas: string;
}

export default function NuevaReqCombustiblePage() {
  const router = useRouter();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState<string>("");
  const [obraName, setObraName] = useState<string>("");
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [proveedorSearch, setProveedorSearch] = useState("");
  const [proveedoresResults, setProveedoresResults] = useState<ProveedorOption[]>([]);
  const [selectedProveedor, setSelectedProveedor] = useState<ProveedorOption | null>(null);
  const [formaPago, setFormaPago] = useState("Transferencia");
  const [fechaPago, setFechaPago] = useState<string>("");
  const [prioridad, setPrioridad] = useState("NORMAL");
  const [ivaPorcentaje, setIvaPorcentaje] = useState(0);
  const [instrucciones, setInstrucciones] = useState("");
  const [solicitanteVisible, setSolicitanteVisible] = useState("");
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Cargar obras + resolver nombre del solicitante
  useEffect(() => {
    supabase.from("centros_trabajo").select("id, nombre, codigo").eq("activo", true).order("nombre").then(({ data }) => {
      if (data) setObras(data as Obra[]);
    });
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
    if (userEmail) {
      fetch(`/api/employees/by-email?email=${encodeURIComponent(userEmail)}`, { credentials: "include", cache: "no-store", })
        .then((r) => r.json())
        .then((d) => { if (d?.full_name) setSolicitanteVisible(d.full_name); })
        .catch(() => {});
    }
  }, []);

  // Cargar equipos de la obra seleccionada
  useEffect(() => {
    if (!obraId) { setEquipos([]); return; }
    setLoadingEquipos(true);
    fetch(`/api/equipo-combustible?obra_id=${obraId}`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { setEquipos(d.equipos || []); setLoadingEquipos(false); })
      .catch(() => setLoadingEquipos(false));
  }, [obraId]);

  // Search proveedor (gasolineras)
  useEffect(() => {
    if (proveedorSearch.length < 2) { setProveedoresResults([]); return; }
    const h = setTimeout(() => {
      fetch(`/api/proveedores/search?q=${encodeURIComponent(proveedorSearch)}`, { credentials: "include", cache: "no-store", })
        .then((r) => r.json())
        .then((d) => { if (d?.proveedores) setProveedoresResults(d.proveedores); })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(h);
  }, [proveedorSearch]);

  function agregarCarga(eq: Equipo) {
    if (cargas.find((c) => c.equipo_id === eq.id)) return;
    setCargas([...cargas, {
      equipo_id: eq.id,
      equipo_alias: eq.alias,
      tipo_combustible: eq.tipo_combustible,
      litros_solicitados: Number(eq.consumo_estandar_litros) || 0,
      precio_litro_estimado: 0,
      horometro_lectura: "",
      horometro_foto_url: "",
      operador_employee_id: eq.operador_employee_id,
      notas: "",
    }]);
  }

  function quitarCarga(idx: number) {
    setCargas(cargas.filter((_, i) => i !== idx));
  }

  function updateCarga(idx: number, patch: Partial<Carga>) {
    setCargas(cargas.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }

  async function uploadHorometro(idx: number, file: File) {
    const path = `cargas/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
    const { error } = await supabase.storage.from("horometros").upload(path, file);
    if (error) {
      setErrMsg("Error subiendo foto: " + error.message);
      return;
    }
    const { data: urlData } = supabase.storage.from("horometros").getPublicUrl(path);
    updateCarga(idx, { horometro_foto_url: urlData.publicUrl });
  }

  const subtotal = cargas.reduce((s, c) => s + Number(c.litros_solicitados || 0) * Number(c.precio_litro_estimado || 0), 0);
  const ivaMonto = subtotal * (ivaPorcentaje / 100);
  const total = subtotal + ivaMonto;
  const litrosTotales = cargas.reduce((s, c) => s + Number(c.litros_solicitados || 0), 0);

  async function generar() {
    if (!obraId) { setErrMsg("Selecciona la obra"); return; }
    if (cargas.length === 0) { setErrMsg("Agrega al menos una maquina"); return; }
    if (cargas.some((c) => !c.litros_solicitados)) { setErrMsg("Captura litros para cada maquina"); return; }
    setErrMsg(""); setOkMsg(""); setSaving(true);

    const userEmail = localStorage.getItem("userEmail") || "";

    const body = {
      centro_trabajo_id: obraId,
      centro_trabajo_name: obraName,
      user_email: userEmail,
      solicitante_nombre_completo: solicitanteVisible,
      forma_pago: formaPago,
      fecha_pago: fechaPago || null,
      prioridad,
      iva_porcentaje: ivaPorcentaje,
      instructions: instrucciones || null,
      ...(selectedProveedor ? {
        proveedor: selectedProveedor.name,
        proveedor_banco: selectedProveedor.bank_name,
        proveedor_clabe: selectedProveedor.bank_clabe,
        proveedor_cuenta: selectedProveedor.bank_account_number,
        proveedor_razon_social: selectedProveedor.razon_social,
      } : {}),
      cargas: cargas.map((c) => ({
        equipo_id: c.equipo_id,
        equipo_alias: c.equipo_alias,
        tipo_combustible: c.tipo_combustible,
        litros_solicitados: Number(c.litros_solicitados),
        precio_litro_estimado: Number(c.precio_litro_estimado) || undefined,
        horometro_lectura: c.horometro_lectura !== "" ? Number(c.horometro_lectura) : undefined,
        horometro_foto_url: c.horometro_foto_url || undefined,
        operador_employee_id: c.operador_employee_id,
        notas: c.notas || undefined,
      })),
    };

    const r = await fetch("/api/requisicion/combustible", {
      credentials: "include", method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) {
      setErrMsg(d.error || "Error generando requisicion");
      setSaving(false);
      return;
    }
    setOkMsg(`Requisicion ${d.folio} generada con ${d.cargas_count} cargas (Total $${Number(d.total || 0).toFixed(2)})`);
    setSaving(false);
    setTimeout(() => router.push("/dashboard/requisiciones/requisiciones/estatus"), 2500);
  }

  return (
    <div className="flex flex-col gap-5 p-6 h-full overflow-y-auto pb-12">
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/requisiciones" />
        <Fuel className="w-7 h-7 text-amber-400" />
        <h1 className="text-2xl font-bold">Nueva Requisición de Combustible</h1>
        {solicitanteVisible && (
          <div className="ml-auto inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-xs">
            <span className="text-emerald-300 font-semibold">Solicitante:</span>
            <span className="text-white font-medium">{solicitanteVisible}</span>
          </div>
        )}
      </div>

      {errMsg && <div className="px-4 py-2 rounded-lg bg-red-500/15 text-red-300 text-sm">{errMsg}</div>}
      {okMsg && <div className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />{okMsg}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Configuracion */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
          <h2 className="text-sm uppercase tracking-wider text-amber-300 font-bold">1. Configuración</h2>
          <label className="block space-y-1">
            <span className="text-xs text-[#7f93b0]">Obra / Centro *</span>
            <select value={obraId} onChange={(e) => {
              setObraId(e.target.value);
              const o = obras.find((x) => x.id === e.target.value);
              setObraName(o ? (o.codigo ? `${o.codigo}. ${o.nombre}` : o.nombre) : "");
            }} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10">
              <option value="">— Selecciona —</option>
              {obras.map((o) => <option key={o.id} value={o.id}>{o.codigo ? `${o.codigo}. ${o.nombre}` : o.nombre}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-[#7f93b0]">Forma de pago</span>
              <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10">
                <option>Transferencia</option>
                <option>Efectivo</option>
                <option>Cheque</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-[#7f93b0]">Fecha de pago</span>
              <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-[#7f93b0]">Prioridad</span>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10">
                <option>NORMAL</option>
                <option>URGENTE</option>
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-[#7f93b0]">IVA (%)</span>
              <select value={ivaPorcentaje} onChange={(e) => setIvaPorcentaje(Number(e.target.value))} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10">
                <option value="0">0% (Sin IVA)</option>
                <option value="3">3%</option>
                <option value="7">7%</option>
                <option value="8">8% (Frontera Norte)</option>
                <option value="10">10%</option>
                <option value="11">11%</option>
                <option value="16">16% (General Mexico)</option>
              </select>
            </label>
          </div>

          <div className="relative space-y-1">
            <label className="text-xs text-[#7f93b0]">Proveedor (gasolinera) — opcional</label>
            <input
              type="text"
              value={proveedorSearch}
              onChange={(e) => { setProveedorSearch(e.target.value); setSelectedProveedor(null); }}
              placeholder="Buscar gasolinera..."
              className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10"
            />
            {proveedorSearch.length >= 2 && !selectedProveedor && (
              <div className="absolute z-10 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg bg-aria-bg border border-white/10">
                {proveedoresResults.length === 0 ? (
                  <div className="p-2 text-xs text-[#7f93b0]">Sin resultados</div>
                ) : proveedoresResults.slice(0, 20).map((p) => (
                  <button key={p.id} onClick={() => { setSelectedProveedor(p); setProveedorSearch(p.name); }} className="w-full text-left p-2 hover:bg-white/[0.04] border-b border-white/[0.04]">
                    <div className="text-sm text-white">{p.name}</div>
                    {p.bank_name && <div className="text-[10px] text-[#7f93b0]">{p.bank_name} {p.bank_clabe ? "· " + p.bank_clabe : ""}</div>}
                  </button>
                ))}
              </div>
            )}
            {selectedProveedor && (
              <div className="mt-1 p-2 rounded bg-emerald-500/10 border border-emerald-400/30 text-xs text-emerald-300">
                {selectedProveedor.name} {selectedProveedor.bank_name ? `· ${selectedProveedor.bank_name}` : ""}
              </div>
            )}
          </div>

          <label className="block space-y-1">
            <span className="text-xs text-[#7f93b0]">Instrucciones generales</span>
            <textarea value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)} rows={2} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10" placeholder="Ej. depositar antes de mediodia" />
          </label>
        </div>

        {/* Selector de equipos */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
          <h2 className="text-sm uppercase tracking-wider text-amber-300 font-bold">2. Selecciona maquinarias</h2>
          {!obraId ? (
            <div className="text-xs text-[#7f93b0]">Primero selecciona la obra para ver sus equipos.</div>
          ) : loadingEquipos ? (
            <div className="text-xs text-[#7f93b0] flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Cargando equipos...</div>
          ) : equipos.length === 0 ? (
            <div className="text-xs text-[#7f93b0]">
              Sin equipos asignados a esta obra. <a href="/dashboard/admin/equipo-combustible" className="text-amber-300 underline font-bold">Click aquí para dar de alta el catálogo</a> (o en menú Administración → Equipos Combustible).
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {equipos.map((eq) => {
                const ya = !!cargas.find((c) => c.equipo_id === eq.id);
                return (
                  <button
                    key={eq.id}
                    onClick={() => !ya && agregarCarga(eq)}
                    disabled={ya}
                    className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${ya ? "bg-amber-500/30 text-amber-200 cursor-default" : "bg-white/[0.04] hover:bg-amber-500/20 text-white"}`}
                  >
                    <Plus className="w-3 h-3" />
                    <div className="text-left">
                      <div className="font-bold">{eq.alias}</div>
                      <div className="text-[10px] opacity-70">{eq.tipo_combustible} · {Number(eq.consumo_estandar_litros || 0)}L</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cargas seleccionadas */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wider text-amber-300 font-bold">3. Cargas ({cargas.length})</h2>
          <div className="text-xs text-[#7f93b0]">Total litros: <span className="text-white font-bold">{litrosTotales.toFixed(1)} L</span></div>
        </div>
        {cargas.length === 0 ? (
          <div className="text-xs text-[#7f93b0]">Selecciona maquinarias arriba.</div>
        ) : (
          <div className="space-y-3">
            {cargas.map((c, idx) => (
              <div key={idx} className="rounded-xl bg-white/[0.04] border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white">{c.equipo_alias} <span className="text-xs text-amber-300">({c.tipo_combustible})</span></div>
                  <button onClick={() => quitarCarga(idx)} className="p-2 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <label className="space-y-1">
                    <span className="text-xs text-[#7f93b0]">Litros *</span>
                    <input type="number" step="0.1" value={c.litros_solicitados} onChange={(e) => updateCarga(idx, { litros_solicitados: Number(e.target.value) })} className="w-full px-3 py-2 rounded bg-black/30 border border-white/10" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[#7f93b0]">Precio/L estimado</span>
                    <input type="number" step="0.01" value={c.precio_litro_estimado} onChange={(e) => updateCarga(idx, { precio_litro_estimado: Number(e.target.value) })} className="w-full px-3 py-2 rounded bg-black/30 border border-white/10" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[#7f93b0]">Horometro</span>
                    <input type="number" step="1" value={c.horometro_lectura} onChange={(e) => updateCarga(idx, { horometro_lectura: e.target.value === "" ? "" : Number(e.target.value) })} className="w-full px-3 py-2 rounded bg-black/30 border border-white/10" placeholder="Lectura" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-[#7f93b0]">Foto horometro</span>
                    <div className="relative">
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadHorometro(idx, f); }} className="w-full text-xs text-white/80 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-amber-500/30 file:text-amber-200 file:text-xs file:cursor-pointer" />
                      {c.horometro_foto_url && <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-emerald-400" />}
                    </div>
                  </label>
                </div>
                <div className="text-xs text-emerald-300">Subtotal: ${(Number(c.litros_solicitados) * Number(c.precio_litro_estimado)).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Totales y submit */}
      <div className="sticky bottom-0 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-xs text-[#7f93b0]">Subtotal: <span className="text-white">${subtotal.toFixed(2)}</span> · IVA: <span className="text-white">${ivaMonto.toFixed(2)}</span></div>
          <div className="text-xl font-bold text-emerald-300">Total: ${total.toFixed(2)}</div>
        </div>
        <button onClick={generar} disabled={saving || cargas.length === 0} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fuel className="w-4 h-4" />}
          {saving ? "Generando..." : "Generar Requisición de Combustible"}
        </button>
      </div>
    </div>
  );
}
