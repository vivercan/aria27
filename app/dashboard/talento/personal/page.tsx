"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Search, Plus, Edit2, X, Save, User, Building2,
  Phone, Mail, Calendar, CreditCard, Shield, Loader2, UserPlus, FolderOpen
} from "lucide-react";
import { EntityFolderDrawer } from "@/components/EntityFolder";
import AriaBackButton from "@/components/AriaBackButton";
import FlashBanner from "@/components/FlashBanner";
import { useFlashMessage } from "@/hooks/useFlashMessage";

interface Empleado {
  id: string;
  employee_number: string;
  full_name: string;
  position: string;
  project_site: string;
  department: string;
  salary_monthly: number;
  email: string;
  status: string;
  whatsapp: string;
  salario_diario: number;
  salario_semanal: number;
  minimo_tarjeta: number;
  tipo_nomina: string;
  hora_entrada: string;
  hora_salida: string;
  dias_laborales: string;
  banco: string;
  clabe: string;
  numero_cuenta: string;
  fecha_ingreso: string;
  fecha_baja: string;
  nss: string;
  curp: string;
  rfc: string;
  empresa_id: string;
}

interface Empresa {
  id: string;
  nombre: string;
}

interface CentroTrabajo {
  id: string;
  nombre: string;
}

const EMPTY_FORM = {
  full_name: "",
  position: "",
  department: "",
  email: "",
  whatsapp: "",
  salario_diario: "",
  salario_semanal: "",
  salary_monthly: "",
  minimo_tarjeta: "",
  tipo_nomina: "semanal",
  hora_entrada: "07:00",
  hora_salida: "17:00",
  dias_laborales: "L,M,X,J,V,S",
  banco: "",
  clabe: "",
  numero_cuenta: "",
  fecha_ingreso: "",
  nss: "",
  curp: "",
  rfc: "",
  empresa_id: "",
  project_site: ""
};

export default function PersonalPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [centros, setCentros] = useState<CentroTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [tab, setTab] = useState<"general" | "laboral" | "bancario" | "fiscal">("general");
  // EX-3 18-Abr-2026: flash canónico via useFlashMessage (wrapper mantiene success/error)
  const { msg: mensaje, flash: _flash } = useFlashMessage(3000);
  // EX-3 18-Abr-2026: wrapper retrocompatible setMensaje
  const setMensaje = (v: { tipo: "success" | "error" | "info"; texto: string } | null) => {
    if (v === null) return; // el hook auto-limpia tras timeout
    _flash(v.tipo === "success" ? "ok" : "err", v.texto);
  };
  const [expedienteEmp, setExpedienteEmp] = useState<Empleado | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setFetchError(null);
    const { data: emps, error: empsErr } = await supabase
      .from("Personal")
      .select("*")
      .eq("status", "ACTIVO")
      .order("full_name");
    if (empsErr) {
      setFetchError("No se pudo cargar el personal. Intenta recargar la página.");
      setLoading(false);
      return;
    }
    if (emps) setEmpleados(emps);

    const { data: emp } = await supabase.from("empresas").select("id, nombre").order("nombre");
    if (emp) setEmpresas(emp);

    const { data: ct } = await supabase.from("centros_trabajo").select("id, nombre").eq("activo", true).order("nombre");
    if (ct) setCentros(ct);

    setLoading(false);
  };

  const nuevoEmpleado = () => {
    setEditando("nuevo");
    setForm({ ...EMPTY_FORM, fecha_ingreso: new Date().toISOString().split("T")[0] });
    setTab("general");
  };

  const abrirEdicion = (e: Empleado) => {
    setEditando(e.id);
    setForm({
      full_name: e.full_name || "",
      position: e.position || "",
      department: e.department || "",
      email: e.email || "",
      whatsapp: e.whatsapp || "",
      salario_diario: e.salario_diario || "",
      salario_semanal: e.salario_semanal || "",
      salary_monthly: e.salary_monthly || "",
      minimo_tarjeta: e.minimo_tarjeta || "",
      tipo_nomina: e.tipo_nomina || "semanal",
      hora_entrada: e.hora_entrada?.substring(0, 5) || "07:00",
      hora_salida: e.hora_salida?.substring(0, 5) || "17:00",
      dias_laborales: e.dias_laborales || "L,M,X,J,V,S",
      banco: e.banco || "",
      clabe: e.clabe || "",
      numero_cuenta: e.numero_cuenta || "",
      fecha_ingreso: e.fecha_ingreso || "",
      nss: e.nss || "",
      curp: e.curp || "",
      rfc: e.rfc || "",
      empresa_id: e.empresa_id || "",
      project_site: e.project_site || "",
    });
    setTab("general");
  };

  const generarNumeroEmpleado = (): string => {
    const nums = empleados
      .map(e => {
        const m = e.employee_number?.match(/EMP-(\d+)/);
        return m ? parseInt(m[1], 10) : 0;
      })
      .filter(n => n > 0);
    const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
    const next = maxNum + 1;
    return "EMP-" + String(next).padStart(3, "0");
  };

  const validar = (): boolean => {
    const errors: Record<string, string> = {};
    if (!form.full_name?.trim()) errors.full_name = "El nombre es obligatorio";
    if (!form.empresa_id?.trim()) errors.empresa_id = "La empresa es obligatoria";
    if (!form.fecha_ingreso?.trim()) errors.fecha_ingreso = "La fecha de ingreso es obligatoria";
    if (form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Email inválido";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const guardar = async () => {
    if (!editando) return;
    if (!validar()) return;

    setGuardando(true);

    const saveData: Record<string, unknown> = { ...form };
    Object.keys(saveData).forEach(k => {
      if (saveData[k] === "") saveData[k] = null;
    });
    ["salario_diario", "salario_semanal", "salary_monthly", "minimo_tarjeta"].forEach(k => {
      if (saveData[k]) saveData[k] = parseFloat(String(saveData[k]));
    });

    if (editando === "nuevo") {
      // INSERT into base table employees
      const empNumber = generarNumeroEmpleado();
      const insertData = {
        ...saveData,
        employee_number: empNumber,
        status: "ACTIVO",
      };

      const { error } = await supabase.from("employees").insert(insertData);
      setGuardando(false);

      if (error) {
        setMensaje({ tipo: "error", texto: "Error al crear: " + error?.message });
      } else {
        setMensaje({ tipo: "success", texto: "Empleado " + empNumber + " creado correctamente" });
        setEditando(null);
        cargarDatos();
      }
    } else {
      // UPDATE existing
      const { error } = await supabase.from("employees").update(saveData).eq("id", editando);
      setGuardando(false);

      if (error) {
        setMensaje({ tipo: "error", texto: "Error: " + error?.message });
      } else {
        setMensaje({ tipo: "success", texto: "Empleado actualizado correctamente" });
        setEditando(null);
        cargarDatos();
      }
    }

    setTimeout(() => setMensaje(null), 3000);
  };

  const empFiltrados = empleados.filter(e =>
    e.full_name?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.position?.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.employee_number?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const getEmpresaNombre = (id: string) => empresas.find(e => e.id === id)?.nombre || "\u2014";

  const Field = ({ label, field, type = "text", placeholder = "", options, min }: {
    label: string; field: string; type?: string; placeholder?: string; min?: string;
    options?: { value: string; label: string }[];
  }) => (
    <div>
      <label className="block text-xs text-[#7f93b0] mb-1">{label}</label>
      {options ? (
        <select
          value={form[field] || ""}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
          className={`w-full px-3 py-2 rounded-lg bg-white/[0.04] border text-white text-sm focus:border-aria-primary focus:outline-none ${formErrors[field] ? "border-red-500/50" : "border-white/[0.08]"}`}>
          <option value="">{"\u2014 Seleccionar \u2014"}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[field] || ""}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
          placeholder={placeholder}
          min={min}
          className={`w-full px-3 py-2 rounded-lg bg-white/[0.04] border text-white text-sm focus:border-aria-primary focus:outline-none placeholder-slate-600 ${formErrors[field] ? "border-red-500/50" : "border-white/[0.08]"}`}
        />
      )}
      {formErrors[field] && <p className="text-red-400 text-xs mt-1">{formErrors[field]}</p>}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {fetchError && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-white/[0.02] border border-white/[0.08] text-red-400 text-sm flex-shrink-0">
          <X className="w-4 h-4 shrink-0" />
          {fetchError}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <AriaBackButton href="/dashboard/talento" />
          <div>
            <h1 className="text-2xl font-bold text-white">Personal</h1>
            <p className="text-xs text-[#7f93b0]">{empleados.length} empleados activos</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={nuevoEmpleado}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium">
            <UserPlus className="w-4 h-4" />
            Nuevo Empleado
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7f93b0]" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm w-64 focus:border-aria-primary focus:outline-none placeholder-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Mensaje */}
      <FlashBanner msg={mensaje} />

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-[rgba(4,8,16,0.98)]  z-10">
            <tr className="border-b border-white/[0.08]">
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">#</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Nombre</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Puesto</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">Empresa</th>
              <th className="text-left p-3 text-[#7f93b0] font-medium text-xs">WhatsApp</th>
              <th className="text-center p-3 text-[#7f93b0] font-medium text-xs">Ingreso</th>
              <th className="text-center p-3 text-[#7f93b0] font-medium text-xs">Expediente</th>
              <th className="text-center p-3 text-[#7f93b0] font-medium text-xs">Acc</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-aria-accent" /></td></tr>
            ) : empFiltrados.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-[#4a6080] text-sm">
                {busqueda ? "Sin resultados para la b\u00fasqueda" : "No hay empleados registrados"}
              </td></tr>
            ) : empFiltrados.map(e => {
              const campos = [e.curp, e.rfc, e.nss, e.banco, e.clabe, e.fecha_ingreso, e.numero_cuenta].filter(Boolean).length;
              return (
                <tr key={e.id} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                  <td className="p-3 text-[#4a6080] text-xs">{e.employee_number}</td>
                  <td className="p-3 text-white text-sm font-medium">{e.full_name}</td>
                  <td className="p-3 text-[#7f93b0] text-sm">{e.position}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      getEmpresaNombre(e.empresa_id).includes("Avante") ? "bg-amber-500/20 text-amber-400" :
                      getEmpresaNombre(e.empresa_id).includes("Denivel") ? "bg-aria-primary-light text-aria-accent" :
                      getEmpresaNombre(e.empresa_id).includes("Terracret") ? "bg-aria-accent-bg text-aria-accent" :
                      "bg-slate-500/20 text-[#7f93b0]"
                    }`}>{getEmpresaNombre(e.empresa_id)}</span>
                  </td>
                  <td className="p-3 text-[#7f93b0] text-sm">{e.whatsapp || "\u2014"}</td>
                  <td className="p-3 text-center text-sm">
                    {e.fecha_ingreso
                      ? <span className="text-emerald-400">{e.fecha_ingreso}</span>
                      : <span className="text-red-400/60">{"\u2014"}</span>}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      campos >= 5 ? "bg-emerald-500/20 text-emerald-400" :
                      campos >= 2 ? "bg-amber-500/20 text-amber-400" :
                      "bg-red-500/20 text-red-400"
                    }`}>{campos}/7</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setExpedienteEmp(e)} title="Expediente documental"
                        className="p-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30">
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => abrirEdicion(e)} title="Editar"
                        className="p-1.5 rounded-lg bg-aria-primary-light text-aria-accent hover:bg-aria-primary-hover/30">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Drawer Expediente */}
      <EntityFolderDrawer
        open={!!expedienteEmp}
        onClose={() => setExpedienteEmp(null)}
        entityType="empleado"
        entityId={expedienteEmp?.id || ""}
        entityName={expedienteEmp?.full_name}
      />

      {/* Modal de edicion / alta */}
      {editando && (
        <div className="fixed inset-0 bg-black/60  z-50 flex items-center justify-center p-4"
          onClick={() => setEditando(null)}>
          <div className="bg-[#0f1729] border border-white/[0.08] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Header modal */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                {editando === "nuevo"
                  ? <UserPlus className="w-5 h-5 text-emerald-400" />
                  : <Edit2 className="w-5 h-5 text-aria-accent" />}
                <h2 className="text-lg font-bold text-white">
                  {editando === "nuevo" ? "Nuevo Empleado" : "Editar Empleado"}
                </h2>
              </div>
              <button onClick={() => setEditando(null)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#7f93b0]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.08]">
              {[
                { key: "general", label: "General", icon: User },
                { key: "laboral", label: "Laboral", icon: Calendar },
                { key: "bancario", label: "Bancario", icon: CreditCard },
                { key: "fiscal", label: "Fiscal", icon: Shield },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as "general" | "laboral" | "bancario" | "fiscal")}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === t.key ? "text-aria-accent border-b-2 border-aria-accent" : "text-[#7f93b0] hover:text-white"
                  }`}>
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form content */}
            <div className="p-4 overflow-y-auto max-h-[55vh]">
              {tab === "general" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Nombre completo *" field="full_name" />
                  <Field label="Puesto" field="position" />
                  <Field label="Centro de Trabajo / Obra" field="project_site"
                    options={centros.map(c => ({ value: c.nombre, label: c.nombre }))} />
                  <Field label="Email" field="email" type="email" />
                  <Field label={"WhatsApp (10 d\u00edgitos)"} field="whatsapp" placeholder="4491234567" />
                  <Field label="Empresa" field="empresa_id"
                    options={empresas.map(e => ({ value: e.id, label: e.nombre }))} />
                  <Field label="Fecha de ingreso" field="fecha_ingreso" type="date" />
                  <Field label="Departamento" field="department" />
                </div>
              )}
              {tab === "laboral" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Salario diario" field="salario_diario" type="number" min="0" />
                  <Field label="Salario semanal" field="salario_semanal" type="number" min="0" />
                  <Field label="Salario mensual" field="salary_monthly" type="number" min="0" />
                  <Field label={"M\u00ednimo tarjeta"} field="minimo_tarjeta" type="number" min="0" />
                  <Field label={"Tipo n\u00f3mina"} field="tipo_nomina"
                    options={[
                      { value: "semanal", label: "Semanal" },
                      { value: "quincenal", label: "Quincenal" },
                      { value: "mensual", label: "Mensual" }
                    ]} />
                  <Field label="Hora entrada" field="hora_entrada" type="time" />
                  <Field label="Hora salida" field="hora_salida" type="time" />
                  <Field label="Días laborales" field="dias_laborales" placeholder="L,M,X,J,V,S" />
                </div>
              )}
              {tab === "bancario" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Banco" field="banco" placeholder="BBVA, Banorte, etc." />
                  <Field label={"CLABE (18 d\u00edgitos)"} field="clabe" placeholder="012345678901234567" />
                  <Field label={"N\u00famero de cuenta"} field="numero_cuenta" />
                  <div className="col-span-2 p-3 rounded-lg bg-aria-primary/10 border border-aria-primary/20">
                    <p className="text-aria-accent text-xs">
                      {"Los datos bancarios se usan para la dispersi\u00f3n de n\u00f3mina. Verifica CLABE y banco con el empleado."}
                    </p>
                  </div>
                </div>
              )}
              {tab === "fiscal" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="CURP (18 caracteres)" field="curp" placeholder="XXXX000000XXXXXXX0" />
                  <Field label="RFC (13 caracteres)" field="rfc" placeholder="XXXX000000XX0" />
                  <Field label={"NSS (11 d\u00edgitos)"} field="nss" placeholder="00000000000" />
                  <div className="col-span-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.08]">
                    <p className="text-amber-400 text-xs">
                      {"Estos datos son requeridos por el IMSS y SAT. El NSS es obligatorio para el alta ante el Seguro Social."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-white/[0.08]">
              <div>
                {editando === "nuevo" && (
                  <p className="text-xs text-[#4a6080]">
                    {"Se asignar\u00e1 n\u00famero autom\u00e1ticamente"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditando(null)}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] text-[#7f93b0] hover:bg-white/[0.06] text-sm">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={guardando}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50 ${
                    editando === "nuevo"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-aria-primary hover:bg-aria-primary-hover"
                  }`}>
                  {guardando
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : editando === "nuevo"
                      ? <UserPlus className="w-4 h-4" />
                      : <Save className="w-4 h-4" />}
                  {editando === "nuevo" ? "Crear Empleado" : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
