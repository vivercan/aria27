"use client";
/** Checadas en el teléfono (Doménica 27 · 11-Oct-2026): quién llegó, a qué hora, si estaba en la obra y retardos. Registro manual: modo completo. */
import { useEffect, useMemo, useState } from "react";
import { IcoChecada } from "@/components/domenica/IconosObra";
import { Esqueleto } from "@/components/domenica/Esqueleto";
import { Vacio } from "@/components/domenica/Vacio";
import { supabase } from "@/lib/supabase";
import { colorPersona } from "@/lib/actividades";
import { Encabezado, Pestanas, iniciales, ModoCompleto, Pagina } from "./base";

type A = { id: string; employee_id: string; fecha: string; hora_entrada: string | null; hora_salida: string | null; dentro_geocerca_entrada: boolean | null; retardo: boolean | null; minutos_retardo: number | null; falta: boolean | null; centro_nombre: string | null; horas_trabajadas: number | null };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const hora = (t: string | null) => { if (!t) return "—"; const m = t.match(/(\d{2}):(\d{2})/); return m ? `${m[1]}:${m[2]}` : t; };
const diaTxt = (f: string) => new Date(f + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });

export default function ChecadasMovil() {
  const [rango, setRango] = useState<"hoy" | "ayer" | "semana">("hoy");
  const [lista, setLista] = useState<A[] | null>(null); const [nombres, setNombres] = useState<Record<string, string>>({});
  useEffect(() => { supabase.from("Personal").select("id, full_name").then(({ data }) => setNombres(Object.fromEntries(((data || []) as { id: string; full_name: string }[]).map(x => [x.id, x.full_name])))); }, []);
  useEffect(() => {
    let vivo = true; setLista(null);
    const hoy = new Date(); const ini = new Date(hoy); const fin = new Date(hoy);
    if (rango === "ayer") { ini.setDate(ini.getDate() - 1); fin.setDate(fin.getDate() - 1); } if (rango === "semana") ini.setDate(ini.getDate() - 6);
    supabase.from("asistencias").select("id, employee_id, fecha, hora_entrada, hora_salida, dentro_geocerca_entrada, retardo, minutos_retardo, falta, centro_nombre, horas_trabajadas").gte("fecha", ymd(ini)).lte("fecha", ymd(fin)).order("fecha", { ascending: false }).order("hora_entrada", { ascending: true }).limit(1000)
      .then(({ data }) => { if (vivo) setLista((data || []) as A[]); });
    return () => { vivo = false; };
  }, [rango]);
  const k = useMemo(() => { const l = lista || []; return { llegaron: l.filter(a => a.hora_entrada && !a.falta).length, sitio: l.filter(a => a.dentro_geocerca_entrada).length, retardos: l.filter(a => a.retardo).length, sinSalida: l.filter(a => a.hora_entrada && !a.hora_salida).length }; }, [lista]);
  const porDia = useMemo(() => { const m = new Map<string, A[]>(); for (const a of lista || []) (m.get(a.fecha) || m.set(a.fecha, []).get(a.fecha)!).push(a); return [...m.entries()]; }, [lista]);

  return (
    <Pagina>
      <Encabezado ico={IcoChecada} color="#c62f5e" titulo="Checadas" sub="Entradas y salidas del personal" />
      <Pestanas valor={rango} cambiar={setRango} opciones={[{ v: "hoy", l: "Hoy" }, { v: "ayer", l: "Ayer" }, { v: "semana", l: "7 días" }]} />
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {[["Llegaron", k.llegaron, "#0073ea"], ["En la obra", k.sitio, "#1f8f00"], ["Retardos", k.retardos, "#b85507"], ["Sin salida", k.sinSalida, "#d0304a"]].map(([l, n, c]) => (
          <div key={String(l)} className="dom-card rounded-2xl px-2 py-2.5 text-center"><div className="text-[22px] font-bold leading-none" style={{ color: Number(n) ? String(c) : "var(--d-faint)" }}>{lista ? n : "–"}</div><div className="mt-1 text-[11px] leading-tight text-[var(--d-muted)]">{l}</div></div>))}
      </div>
      <div className="mt-4 space-y-4">
        {lista === null ? <Esqueleto filas={5} alto={60} /> : !lista.length ? <div className="dom-card rounded-3xl"><Vacio ico={IcoChecada} color="#64748b" titulo="Sin checadas" texto={rango === "hoy" ? "Todavía nadie ha checado hoy." : "No hay registros en estos días."} /></div>
          : porDia.map(([dia, l]) => (
            <section key={dia}>
              {rango === "semana" && <h2 className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-[var(--d-faint)] first-letter:uppercase">{diaTxt(dia)}</h2>}
              <div className="dom-card rounded-2xl overflow-hidden divide-y divide-[var(--d-border)]">
                {l.map(a => { const nom = nombres[a.employee_id] || "Empleado"; return (
                  <div key={a.id} className="flex items-center gap-3 px-3.5 py-3">
                    <span className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[14px]" style={{ background: colorPersona(nom) }}>{iniciales(nom)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold text-[var(--d-text)] truncate">{nom}</div>
                      <div className="text-[12.5px] text-[var(--d-muted)] truncate">{a.falta ? "Falta" : `${hora(a.hora_entrada)} → ${hora(a.hora_salida)}`}{a.centro_nombre ? ` · ${a.centro_nombre}` : ""}</div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {a.retardo && <span className="rounded-md bg-[#b85507] px-1.5 py-0.5 text-[11px] font-bold text-white">{a.minutos_retardo ? `${a.minutos_retardo} min tarde` : "Retardo"}</span>}
                      {a.hora_entrada && a.dentro_geocerca_entrada === false && <span className="rounded-md bg-[#d0304a] px-1.5 py-0.5 text-[11px] font-bold text-white">Fuera de obra</span>}
                      {a.hora_entrada && a.dentro_geocerca_entrada && !a.retardo && <span className="rounded-md bg-[#1f8500] px-1.5 py-0.5 text-[11px] font-bold text-white sobre-verde">A tiempo</span>}
                    </div>
                  </div>); })}
              </div>
            </section>))}
      </div>
      <ModoCompleto texto="Registro manual y reportes: modo completo" />
    </Pagina>
  );
}
