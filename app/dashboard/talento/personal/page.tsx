"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Search, Plus, Edit2, X, Save, User, Building2,
  Phone, Mail, Calendar, CreditCard, Shield, Loader2, UserPlus, FolderOpen
} from "lucide-react";
import { EntityFolderDrawer } from "@/components/EntityFolder";
import { useFlashMessage } from "@/lib/use-flash-message";
import FlashBanner from "@/components/FlashBanner";

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
  const { msg, flash, clear } = useFlashMessage();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [centros, setCentros] = useState<CentroTrabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_FORM });
  const [tab, setTab] = useState<"general" | "laboral" | "bancario" | "fiscal">("general");
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);
  const [expedienteEmp, setExpedienteEmp] = useState<Empleado | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: emps } = await supabase
      .from("Personal")
      .select("*")
      .eq("status", "ACTIVO")
      .order("full_name");
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

    const saveData: any = { ...form };
    Object.keys(saveData).forEach(k => {
      if (saveData[k] === "") saveData[k] = null;
    });
    ["salario_diario", "salario_semanal", "salary_monthly", "minimo_tarjeta"].forEach(k => {
      if (saveData[k]) saveData[k] = parseFloat(saveData[k]);
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
        flash("err", "Error: " + (error?.message ?? "desconocido"));
        setMensaje({ tipo: "error", texto: "Error al crear: " + error?.message });
      } else {
        flash("ok", "Empleado " + empNumber + " creado correctamente");
        setMensaje({ tipo: "success", texto: "Empleado " + empNumber + " creado correctamente" });
        setEditando(null);
        cargarDatos();
      }
    } else {
      // UPDATE existing
      const { error } = await supabase.from("employees").update(saveData).eq("id", editando);
      setGuardando(false);

      if (error) {
        flash("err", "Error: " + (error?.message ?? "desconocido"));
        setMensaje({ tipo: "error", texto: "Error: " + error?.message });
      } else {
        flash("ok", "Empleado actualizado correctamente");
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

  const Field = ({ label, field, type = "text", placeholder = "", options }: {
    label: string; field: string; type?: string; placeholder?: string;
    options?: { value: string; label: string }[];
  }) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {options ? (
        <select
          value={form[field] || ""}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
          className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white text-sm focus:border-blue-500 focus:outline-none ${formErrors[field] ? "border-red-500/50" : "border-white/10"}`}>
          <option value="">{"\u2014 Seleccionar \u2014"}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={form[field] || ""}
          onChange={e => setForm({ ...form, [field]: e.target.value })}
          placeholder={placeholder}
          className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white text-sm focus:border-blue-500 focus:outline-none placeholder-slate-600 ${formErrors[field] ? "border-red-500/50" : "border-white/10"}`}
        />
      )}
      {formErrors[field] && <p className="text-red-400 text-xs mt-1">{formErrors[field]}</p>}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <FlashBanner msg={msg} />
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/talento"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Personal</h1>
            <p className="text-xs text-slate-400">{empleados.length} empleados activos</p>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm w-64 focus:border-blue-500 focus:outline-none placeholder-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Mensaje */}
      {mensaje && (
        <div className={`mb-3 px-4 py-2 rounded-lg text-sm flex-shrink-0 ${
          mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10">
            <tr className="border-b border-white/10">
              <th className="text-left p-3 text-slate-400 font-medium text-xs">#</th>
              <th className="text-left p-3 text-slate-400 font-medium text-xs">Nombre</th>
              <th className="text-left p-3 text-slate-400 font-medium text-xs">Puesto</th>
              <th className="text-left p-3 text-slate-400 font-medium text-xs">Empresa</th>
              <th className="text-left p-3 text-slate-400 font-medium text-xs">WhatsApp</th>
              <th className="text-center p-3 text-slate-400 font-medium text-xs">Ingreso</th>
              <th className="text-center p-3 text-slate-400 font-medium text-xs">Expediente</th>
              <th className="text-center p-3 text-slate-400 font-medium text-xs">Acc</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-400" /></td></tr>
            ) : empFiltrados.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-slate-500 text-sm">
                {busqueda ? "Sin resultados para la b\u00fasqueda" : "No hay empleados registrados"}
              </td></tr>
            ) : empFiltrados.map(e => {
              const campos = [e.curp, e.rfc, e.nss, e.banco, e.clabe, e.fecha_ingreso, e.numero_cuenta].filter(Boolean).length;
              return (
                <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="p-3 text-slate-500 text-xs">{e.employee_number}</td>
                  <td className="p-3 text-white text-sm font-medium">{e.full_name}</td>
                  <td className="p-3 text-slate-400 text-sm">{e.position}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      getEmpresaNombre(e.empresa_id).includes("Avante") ? "bg-yellow-500/20 text-yellow-400" :
                      getEmpresaNombre(e.empresa_id).includes("Denivel") ? "bg-purple-500/20 text-purple-400" :
                      getEmpresaNombre(e.empresa_id).includes("Terracret") ? "bg-cyan-500/20 text-cyan-400" :
                      "bg-slate-500/20 text-slate-400"
                    }`}>{getEmpresaNombre(e.empresa_id)}</span>
                  </td>
                  <td className="p-3 text-slate-400 text-sm">{e.whatsapp || "\u2014"}</td>
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
                        className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30">
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => abrirEdicion(e)} title="Editar"
                        className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setEditando(null)}>
          <div className="bg-[#0f1729] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {/* Header modal */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                {editando === "nuevo"
                  ? <UserPlus className="w-5 h-5 text-emerald-400" />
                  : <Edit2 className="w-5 h-5 text-blue-400" />}
                <h2 className="text-lg font-bold text-white">
                  {editando === "nuevo" ? "Nuevo Empleado" : "Editar Empleado"}
                </h2>
              </div>
              <button onClick={() => setEditando(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {[
                { key: "general", label: "General", icon: User },
                { key: "laboral", label: "Laboral", icon: Calendar },
                { key: "bancario", label: "Bancario", icon: CreditCard },
                { key: "fiscal", label: "Fiscal", icon: Shield },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    tab === t.key ? "text-blue-400 border-b-2 border-blue-400" : "text-slate-400 hover:text-white"
                  }`}>
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Form content */}
            <div className="p-4 overflow-y-auto max-h-[55vh]">
              {tab === "general" && (
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Salario diario" field="salario_diario" type="number" />
                  <Field label="Salario semanal" field="salario_semanal" type="number" />
                  <Field label="Salario mensual" field="salary_monthly" type="number" />
                  <Field label={"M\u00ednimo tarjeta"} field="minimo_tarjeta" type="number" />
                  <Field label={"Tipo n\u00f3mina"} field="tipo_nomina"
                    options={[
                      { value: "semanal", label: "Semanal" },
                      { value: "quincenal", label: "Quincenal" },
                      { value: "mensual", label: "Mensual" }
                    ]} />
                  <Field label="Hora entrada" field="hora_entrada" type="time" />
                  <Field label="Hora salida" field="hora_salida" type="time" />
                  <Field label="D\u00edas laborales" field="dias_laborales" placeholder="L,M,X,J,V,S" />
                </div>
              )}
              {tab === "bancario" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Banco" field="banco" placeholder="BBVA, Banorte, etc." />
                  <Field label={"CLABE (18 d\u00edgitos)"} field="clabe" placeholder="012345678901234567" />
                  <Field label={"N\u00famero de cuenta"} field="numero_cuenta" />
                  <div className="col-span-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-blue-400 text-xs">
                      {"Los datos bancarios se usan para la dispersi\u00f3n de n\u00f3mina. Verifica CLABE y banco con el empleado."}
                    </p>
                  </div>
                </div>
              )}
              {tab === "fiscal" && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CURP (18 caracteres)" field="curp" placeholder="XXXX000000XXXXXXX0" />
                  <Field label="RFC (13 caracteres)" field="rfc" placeholder="XXXX000000XX0" />
                  <Field label={"NSS (11 d\u00edgitos)"} field="nss" placeholder="00000000000" />
                  <div className="col-span-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-amber-400 text-xs">
                      {"Estos datos son requeridos por el IMSS y SAT. El NSS es obligatorio para el alta ante el Seguro Social."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-white/10">
              <div>
                {editando === "nuevo" && (
                  <p className="text-xs text-slate-500">
                    {"Se asignar\u00e1 n\u00famero autom\u00e1ticamente"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditando(null)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 text-sm">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={guardando}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm disabled:opacity-50 ${
                    editando === "nuevo"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-blue-600 hover:bg-blue-700"
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
