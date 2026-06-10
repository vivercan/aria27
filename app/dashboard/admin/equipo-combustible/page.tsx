"use client";
import { useEffect, useState } from "react";
import AriaBackButton from "@/components/AriaBackButton";
import { supabase } from "@/lib/supabase";
import { Plus, Edit2, Trash2, Fuel } from "lucide-react";

interface Equipo {
  id: string;
  alias: string;
  tipo_combustible: "DIESEL" | "MAGNA" | "PREMIUM";
  consumo_estandar_litros: number;
  numero_economico?: string;
  placas?: string;
  marca?: string;
  modelo?: string;
  operador_employee_id?: string | null;
  operador?: { full_name?: string } | null;
  activo: boolean;
  obras?: { centro_trabajo_id: string }[];
}

interface Obra {
  id: string;
  nombre: string;
  codigo?: string;
}

interface Empleado {
  id: string;
  full_name: string;
}

export default function EquipoCombustiblePage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Equipo | null>(null);
  const [form, setForm] = useState({
    alias: "",
    tipo_combustible: "DIESEL" as "DIESEL" | "MAGNA" | "PREMIUM",
    consumo_estandar_litros: 0,
    numero_economico: "",
    placas: "",
    marca: "",
    modelo: "",
    operador_employee_id: "",
    notas: "",
    obras: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "err"; texto: string } | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    const [eqRes, obrRes, empRes] = await Promise.all([
      fetch("/api/equipo-combustible?incluir_baja=0", { cache: "no-store" }).then((r) => r.json()),
      supabase.from("centros_trabajo").select("id, nombre, codigo").eq("activo", true).order("nombre"),
      supabase.from("employees").select("id, full_name").eq("status", "ACTIVO").ilike("position", "%operad%").order("full_name"),
    ]);
    setEquipos(eqRes.equipos || []);
    setObras((obrRes.data || []) as Obra[]);
    setEmpleados((empRes.data || []) as Empleado[]);
    setLoading(false);
  }

  function abrirNuevo() {
    setEditing(null);
    setForm({
      alias: "",
      tipo_combustible: "DIESEL",
      consumo_estandar_litros: 0,
      numero_economico: "",
      placas: "",
      marca: "",
      modelo: "",
      operador_employee_id: "",
      notas: "",
      obras: [],
    });
    setShowForm(true);
  }

  function abrirEditar(e: Equipo) {
    setEditing(e);
    setForm({
      alias: e.alias,
      tipo_combustible: e.tipo_combustible,
      consumo_estandar_litros: Number(e.consumo_estandar_litros || 0),
      numero_economico: e.numero_economico || "",
      placas: e.placas || "",
      marca: e.marca || "",
      modelo: e.modelo || "",
      operador_employee_id: e.operador_employee_id || "",
      notas: "",
      obras: (e.obras || []).map((o) => o.centro_trabajo_id),
    });
    setShowForm(true);
  }

  async function guardar() {
    if (!form.alias.trim()) {
      setMsg({ tipo: "err", texto: "Alias requerido" });
      return;
    }
    setSaving(true);
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      alias: form.alias.trim(),
      tipo_combustible: form.tipo_combustible,
      consumo_estandar_litros: form.consumo_estandar_litros,
      numero_economico: form.numero_economico || null,
      placas: form.placas || null,
      marca: form.marca || null,
      modelo: form.modelo || null,
      operador_employee_id: form.operador_employee_id || null,
      notas: form.notas || null,
      obras: form.obras,
    };
    const r = await fetch("/api/equipo-combustible", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    if (!r.ok) {
      setMsg({ tipo: "err", texto: d?.error || "Error" });
      setSaving(false);
      return;
    }
    setMsg({ tipo: "ok", texto: editing ? "Actualizado" : "Creado" });
    setShowForm(false);
    setSaving(false);
    await cargar();
  }

  async function eliminar(e: Equipo) {
    if (!confirm(`Dar de baja "${e.alias}"?`)) return;
    await fetch("/api/equipo-combustible", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: e.id }),
    });
    await cargar();
  }

  return (
    <div className="flex flex-col gap-5 p-6 h-full overflow-y-auto pb-12">
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/admin" />
        <Fuel className="w-7 h-7 text-amber-400" />
        <h1 className="text-2xl font-bold">Catalogo Equipos Combustible</h1>
        <button
          onClick={abrirNuevo}
          className="ml-auto px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nuevo equipo
        </button>
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-lg text-sm ${msg.tipo === "ok" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
          {msg.texto}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/[0.04]">
            <tr className="text-xs uppercase text-[#7f93b0]">
              <th className="p-3 text-left">Alias</th>
              <th className="p-3 text-left">Tipo</th>
              <th className="p-3 text-right">Consumo std (L)</th>
              <th className="p-3 text-left">No. Econ</th>
              <th className="p-3 text-left">Operador</th>
              <th className="p-3 text-center">Obras</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-6 text-center text-[#7f93b0]">Cargando...</td></tr>
            ) : equipos.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-[#7f93b0]">Sin equipos. Da de alta el primero.</td></tr>
            ) : equipos.map((e) => (
              <tr key={e.id} className="border-t border-white/[0.04] hover:bg-white/[0.02]">
                <td className="p-3 text-white font-medium">{e.alias}</td>
                <td className="p-3"><span className="px-2 py-1 rounded text-xs bg-amber-500/15 text-amber-300">{e.tipo_combustible}</span></td>
                <td className="p-3 text-right text-[#c9d8ed]">{Number(e.consumo_estandar_litros || 0).toFixed(1)} L</td>
                <td className="p-3 text-[#c9d8ed] text-sm">{e.numero_economico || "—"}</td>
                <td className="p-3 text-[#c9d8ed] text-sm">{e.operador?.full_name || "—"}</td>
                <td className="p-3 text-center text-[#c9d8ed]">{e.obras?.filter((o) => true).length || 0}</td>
                <td className="p-3 text-right space-x-2">
                  <button onClick={() => abrirEditar(e)} className="p-2 rounded bg-white/[0.04] hover:bg-amber-500/20 text-amber-300">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => eliminar(e)} className="p-2 rounded bg-white/[0.04] hover:bg-red-500/20 text-red-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-aria-bg rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
            <h3 className="text-lg font-bold mb-4">{editing ? "Editar equipo" : "Nuevo equipo"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-[#7f93b0]">Alias (visible en el form) *</span>
                <input value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10" placeholder="Ej: Retro CAT 416 / Camion Volteo 2" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[#7f93b0]">Tipo combustible</span>
                <select value={form.tipo_combustible} onChange={(e) => setForm({ ...form, tipo_combustible: e.target.value as "DIESEL" | "MAGNA" | "PREMIUM" })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10">
                  <option value="DIESEL">DIESEL</option>
                  <option value="MAGNA">MAGNA</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[#7f93b0]">Consumo estandar (litros)</span>
                <input type="number" step="0.1" value={form.consumo_estandar_litros} onChange={(e) => setForm({ ...form, consumo_estandar_litros: Number(e.target.value) })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[#7f93b0]">Numero economico</span>
                <input value={form.numero_economico} onChange={(e) => setForm({ ...form, numero_economico: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[#7f93b0]">Placas</span>
                <input value={form.placas} onChange={(e) => setForm({ ...form, placas: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[#7f93b0]">Marca</span>
                <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10" />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-[#7f93b0]">Modelo</span>
                <input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs text-[#7f93b0]">Operador asignado</span>
                <select value={form.operador_employee_id} onChange={(e) => setForm({ ...form, operador_employee_id: e.target.value })} className="w-full px-3 py-2 rounded bg-white/[0.04] border border-white/10">
                  <option value="">— Sin asignar —</option>
                  {empleados.map((emp) => <option key={emp.id} value={emp.id}>{emp.full_name}</option>)}
                </select>
              </label>
              <div className="space-y-2 md:col-span-2">
                <span className="text-xs text-[#7f93b0]">Obras donde opera (puede ser varias)</span>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 rounded bg-white/[0.02] border border-white/10">
                  {obras.map((o) => {
                    const selected = form.obras.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setForm({ ...form, obras: selected ? form.obras.filter((x) => x !== o.id) : [...form.obras, o.id] })}
                        className={`px-3 py-1 rounded-full text-xs ${selected ? "bg-amber-500 text-black font-bold" : "bg-white/[0.04] text-white"}`}
                      >
                        {o.codigo ? `${o.codigo}. ` : ""}{o.nombre}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/[0.04] text-white">Cancelar</button>
              <button onClick={guardar} disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
