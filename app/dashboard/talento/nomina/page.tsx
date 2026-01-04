"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Calendar, Download, Save, Send, ChevronLeft, ChevronRight, FileSpreadsheet, History, Users, DollarSign, Building2, Check, X, RefreshCw, Eye } from "lucide-react";

interface EmpleadoNomina {
  id: string;
  employee_id: string;
  nombre: string;
  puesto: string;
  obra: string;
  salario_diario: number;
  salario_semanal: number;
  dias_trabajados: number;
  septimo_dia: number;
  bonos: number;
  prestamos: number;
  sueldo_calculado: number;
  sueldo_neto: number;
}

interface NominaGuardada {
  id: string;
  folio: string;
  periodo_inicio: string;
  periodo_fin: string;
  semana: number;
  total_percepciones: number;
  total_nomina: number;
  empleados_count: number;
  estatus: string;
}

// DETALLE HISTORICO SEMANAS 45-53
const HISTORIAL_DETALLE: Record<number, {nombre: string; obra: string; sueldo: number}[]> = {
  45: [
    {nombre: "DAISY SANCHEZ CALVILLO", obra: "OFICINA", sueldo: 6311.11},
    {nombre: "JESSICA MONTSERRAT GALLARDO ACOSTA", obra: "OFICINA", sueldo: 3456.67},
    {nombre: "DANIEL SAUCEDO LÓPEZ", obra: "OFICINA", sueldo: 2410.67},
    {nombre: "JOSE ARMANDO REYES ESCOBAR", obra: "PINAR DEL LAGO", sueldo: 4222.87},
    {nombre: "ARTURO GUTIERREZ ESPARZA", obra: "PINAR DEL LAGO", sueldo: 3741.36},
    {nombre: "JUAN FRANCISCO RODARTE VILLAREAL", obra: "PINAR DEL LAGO", sueldo: 6184.67},
    {nombre: "SAMUEL RODARTE VILLAREAL", obra: "PINAR DEL LAGO", sueldo: 5920.00},
    {nombre: "GUSTAVO GARIVAY OCEGUERA", obra: "CD. INDUSTRIAL", sueldo: 3799.30},
    {nombre: "JESUS ALEJANDRO COVARRUBIAS E.", obra: "CD. INDUSTRIAL", sueldo: 3186.67},
    {nombre: "MIGUEL ANGEL JIMENEZ MORALES", obra: "CD. INDUSTRIAL", sueldo: 5065.76},
    {nombre: "RAUL RAMIREZ MORENO", obra: "CD. INDUSTRIAL", sueldo: 4098.89},
  ],
  51: [
    {nombre: "DAISY SANCHEZ CALVILLO", obra: "OFICINA", sueldo: 5896.67},
    {nombre: "JESSICA M. GALLARDO ACOSTA", obra: "OFICINA", sueldo: 2677.22},
    {nombre: "LIZBETH FLORES MENDEZ", obra: "OFICINA", sueldo: 2565.00},
    {nombre: "JOSE ARMANDO REYES ESCOBAR", obra: "JUSTO SIERRA", sueldo: 1876.00},
    {nombre: "JOSE GUADALUPE GUTIERREZ", obra: "JUSTO SIERRA", sueldo: 2062.67},
    {nombre: "JESUS ALEJANDRO COVARRUBIAS", obra: "EJERCITO NACIONAL", sueldo: 2629.06},
    {nombre: "JUAN FCO. RODARTE VILLAREAL", obra: "EJERCITO NACIONAL", sueldo: 3772.00},
    {nombre: "ARTURO GUTIERREZ ESPARZA", obra: "JUAN DIEGO", sueldo: 2558.68},
    {nombre: "RAUL RAMIREZ MORENO", obra: "LAB SEMICONDUCTORES", sueldo: 3514.15},
    {nombre: "GUSTAVO GARIVAY OCEGUERA", obra: "MIRAVALLE", sueldo: 2814.06},
    {nombre: "MIGUEL ANGEL JIMENEZ MORALES", obra: "MIRAVALLE", sueldo: 3355.67},
    {nombre: "SAMUEL RODARTE VILLAREAL", obra: "MIRAVALLE", sueldo: 4329.00},
    {nombre: "LUIS FELIPE RODRIGUEZ ALVARADO", obra: "MIRAVALLE", sueldo: 3958.96},
  ],
  52: [
    {nombre: "DAISY SANCHEZ CALVILLO", obra: "OFICINA", sueldo: 8787.64},
    {nombre: "JESSICA MONTSERRAT GALLARDO ACOSTA", obra: "OFICINA", sueldo: 3050.00},
    {nombre: "LIZBETH FLORES MENDEZ", obra: "OFICINA", sueldo: 3000.00},
    {nombre: "JOSE ARMANDO REYES ESCOBAR", obra: "JUSTO SIERRA", sueldo: 3464.55},
    {nombre: "JOSE GUADALUPE GUTIERREZ", obra: "JUSTO SIERRA", sueldo: 2577.33},
    {nombre: "JESUS ALEJANDRO COVARRUBIAS E.", obra: "EJERCITO NACIONAL", sueldo: 4431.45},
    {nombre: "JUAN FRANCISCO RODARTE VILLAREAL", obra: "EJERCITO NACIONAL", sueldo: 5642.00},
    {nombre: "ARTURO GUTIERREZ ESPARZA", obra: "JUAN DIEGO", sueldo: 2789.78},
    {nombre: "RAUL RAMIREZ MORENO", obra: "LAB SEMICONDUCTORES", sueldo: 3579.72},
    {nombre: "GUSTAVO GARIVAY OCEGUERA", obra: "MIRAVALLE", sueldo: 1173.82},
    {nombre: "MIGUEL ANGEL JIMENEZ MORALES", obra: "MIRAVALLE", sueldo: 3682.94},
    {nombre: "SAMUEL RODARTE VILLAREAL", obra: "MIRAVALLE", sueldo: 4744.00},
    {nombre: "LUIS FELIPE RODRIGUEZ ALVARADO", obra: "MIRAVALLE", sueldo: 3673.33},
  ],
  53: [
    {nombre: "DAISY SANCHEZ CALVILLO", obra: "OFICINA", sueldo: 5070.00},
    {nombre: "JESSICA MONTSERRAT GALLARDO ACOSTA", obra: "OFICINA", sueldo: 2340.03},
    {nombre: "LIZBETH FLORES MENDEZ", obra: "OFICINA", sueldo: 2310.00},
    {nombre: "JOSE ARMANDO REYES ESCOBAR", obra: "JUSTO SIERRA", sueldo: 2488.75},
    {nombre: "JOSE GUADALUPE GUTIERREZ", obra: "JUSTO SIERRA", sueldo: 2048.75},
    {nombre: "JESUS ALEJANDRO COVARRUBIAS E.", obra: "EJERCITO NACIONAL", sueldo: 2395.00},
    {nombre: "JUAN FRANCISCO RODARTE VILLAREAL", obra: "EJERCITO NACIONAL", sueldo: 3663.00},
    {nombre: "ARTURO GUTIERREZ ESPARZA", obra: "JUAN DIEGO", sueldo: 2390.24},
    {nombre: "RAUL RAMIREZ MORENO", obra: "LAB SEMICONDUCTORES", sueldo: 2683.33},
    {nombre: "GUSTAVO GARIVAY OCEGUERA", obra: "MIRAVALLE", sueldo: 2195.00},
    {nombre: "MIGUEL ANGEL JIMENEZ MORALES", obra: "MIRAVALLE", sueldo: 3822.56},
    {nombre: "SAMUEL RODARTE VILLAREAL", obra: "MIRAVALLE", sueldo: 4004.00},
    {nombre: "LUIS FELIPE RODRIGUEZ ALVARADO", obra: "MIRAVALLE", sueldo: 2913.33},
    {nombre: "JUAN FRANCISCO RODARTE VILLAREAL", obra: "MIRAVALLE", sueldo: 600.00},
  ],
};

const OBRAS_COLORES: Record<string, string> = {
  "OFICINA": "bg-blue-500/20 text-blue-300",
  "JUSTO SIERRA": "bg-emerald-500/20 text-emerald-300",
  "EJERCITO NACIONAL": "bg-amber-500/20 text-amber-300",
  "JUAN DIEGO": "bg-purple-500/20 text-purple-300",
  "LAB SEMICONDUCTORES": "bg-cyan-500/20 text-cyan-300",
  "MIRAVALLE": "bg-rose-500/20 text-rose-300",
  "PINAR DEL LAGO": "bg-green-500/20 text-green-300",
  "CD. INDUSTRIAL": "bg-orange-500/20 text-orange-300",
};

export default function NominaPage() {
  const [historial, setHistorial] = useState<NominaGuardada[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNomina, setSelectedNomina] = useState<NominaGuardada | null>(null);
  const [detalleEmpleados, setDetalleEmpleados] = useState<{nombre: string; obra: string; sueldo: number}[]>([]);
  const [mensaje, setMensaje] = useState<{ tipo: "success" | "error"; texto: string } | null>(null);

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    const { data } = await supabase
      .from("nominas")
      .select("*")
      .order("semana", { ascending: false });
    if (data) setHistorial(data);
    setLoading(false);
  };

  const verDetalle = (nomina: NominaGuardada) => {
    setSelectedNomina(nomina);
    const detalle = HISTORIAL_DETALLE[nomina.semana] || [];
    setDetalleEmpleados(detalle);
  };

  const exportarExcel = (nomina: NominaGuardada) => {
    const detalle = HISTORIAL_DETALLE[nomina.semana] || [];
    let csv = "\uFEFF";
    csv += `GRUPO CUAVANTE - NOMINA SEMANA ${nomina.semana}\n`;
    csv += `Periodo: ${nomina.periodo_inicio} al ${nomina.periodo_fin}\n`;
    csv += `Folio: ${nomina.folio}\n\n`;
    csv += `No.,Nombre,Obra,Sueldo Neto\n`;
    
    detalle.forEach((emp, i) => {
      csv += `${i+1},"${emp.nombre}","${emp.obra}",${emp.sueldo.toFixed(2)}\n`;
    });
    
    const total = detalle.reduce((a, e) => a + e.sueldo, 0);
    csv += `\n,,TOTAL:,$${total.toFixed(2)}\n`;
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Nomina_Sem${nomina.semana}_${nomina.folio}.csv`;
    link.click();
    setMensaje({ tipo: "success", texto: "Excel descargado" });
    setTimeout(() => setMensaje(null), 2000);
  };

  const exportarTodo = () => {
    let csv = "\uFEFF";
    csv += "GRUPO CUAVANTE - RESUMEN NOMINAS 2025\n\n";
    csv += "Semana,Periodo Inicio,Periodo Fin,Empleados,Total Nomina,Estatus\n";
    
    historial.forEach((nom) => {
      csv += `${nom.semana},${nom.periodo_inicio},${nom.periodo_fin},${nom.empleados_count},$${nom.total_nomina?.toFixed(2) || 0},${nom.estatus}\n`;
    });
    
    const totalGeneral = historial.reduce((a, n) => a + (n.total_nomina || 0), 0);
    csv += `\n,,,,TOTAL 2025:,$${totalGeneral.toFixed(2)}\n`;
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Nominas_2025_Resumen.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <DollarSign className="w-7 h-7 text-emerald-400" />
            Historial de Nóminas 2025
          </h1>
          <p className="text-slate-400 mt-1">{historial.length} semanas registradas</p>
        </div>
        <button onClick={exportarTodo} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30">
          <Download className="w-4 h-4" />
          Descargar Resumen 2025
        </button>
      </div>

      {mensaje && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${mensaje.tipo === "success" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}>
          <Check className="w-4 h-4" />{mensaje.texto}
        </div>
      )}

      {/* Lista de Nóminas */}
      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Cargando...</div>
        ) : (
          historial.map((nom) => (
            <div key={nom.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center px-3 py-2 rounded-lg bg-blue-500/20">
                    <div className="text-2xl font-bold text-blue-300">{nom.semana}</div>
                    <div className="text-xs text-blue-400">SEM</div>
                  </div>
                  <div>
                    <div className="text-white font-medium">{nom.folio}</div>
                    <div className="text-sm text-slate-400">{nom.periodo_inicio} - {nom.periodo_fin}</div>
                    <div className="text-xs text-slate-500">{nom.empleados_count} empleados</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-400">${nom.total_nomina?.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                    <div className={`text-xs px-2 py-0.5 rounded inline-block ${nom.estatus === "AUTORIZADA" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {nom.estatus}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => verDetalle(nom)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300" title="Ver detalle">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => exportarExcel(nom)} className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300" title="Descargar Excel">
                      <FileSpreadsheet className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Detalle */}
      {selectedNomina && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Detalle Semana {selectedNomina.semana}</h2>
                <p className="text-sm text-slate-400">{selectedNomina.periodo_inicio} - {selectedNomina.periodo_fin}</p>
              </div>
              <button onClick={() => setSelectedNomina(null)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
                <X className="w-5 h-5 text-slate-300" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {detalleEmpleados.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Detalle no disponible para esta semana</p>
              ) : (
                <div className="space-y-2">
                  {detalleEmpleados.map((emp, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 w-6">{i + 1}</span>
                        <div>
                          <div className="text-white font-medium">{emp.nombre}</div>
                          <div className={`text-xs px-2 py-0.5 rounded inline-block ${OBRAS_COLORES[emp.obra] || "bg-slate-500/20 text-slate-300"}`}>
                            {emp.obra}
                          </div>
                        </div>
                      </div>
                      <div className="text-emerald-400 font-bold">${emp.sueldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-white/10 flex justify-between">
                    <span className="text-white font-semibold">TOTAL</span>
                    <span className="text-2xl font-bold text-emerald-400">
                      ${detalleEmpleados.reduce((a, e) => a + e.sueldo, 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-white/10">
              <button onClick={() => exportarExcel(selectedNomina)} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600">
                <FileSpreadsheet className="w-5 h-5" />
                Descargar Excel de esta Semana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
