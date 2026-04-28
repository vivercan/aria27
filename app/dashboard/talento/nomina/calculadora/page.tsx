"use client";
import { useState, useMemo } from "react";
import AriaBackButton from "@/components/AriaBackButton";
import { Calculator, Info } from "lucide-react";

const TARIFA_ISR_MENSUAL_2026 = [
  { lim_inf: 0,        lim_sup: 746.04,     cuota: 0,         pct: 1.92 },
  { lim_inf: 746.05,   lim_sup: 6332.05,    cuota: 14.32,     pct: 6.40 },
  { lim_inf: 6332.06,  lim_sup: 11128.01,   cuota: 371.83,    pct: 10.88 },
  { lim_inf: 11128.02, lim_sup: 12935.82,   cuota: 893.63,    pct: 16.00 },
  { lim_inf: 12935.83, lim_sup: 15487.71,   cuota: 1182.88,   pct: 17.92 },
  { lim_inf: 15487.72, lim_sup: 31236.49,   cuota: 1640.18,   pct: 21.36 },
  { lim_inf: 31236.50, lim_sup: 49233.00,   cuota: 5004.12,   pct: 23.52 },
  { lim_inf: 49233.01, lim_sup: 93993.90,   cuota: 9236.89,   pct: 30.00 },
  { lim_inf: 93993.91, lim_sup: 125325.20,  cuota: 22665.17,  pct: 32.00 },
  { lim_inf: 125325.21,lim_sup: 375975.61,  cuota: 32691.18,  pct: 34.00 },
  { lim_inf: 375975.62,lim_sup: Infinity,   cuota: 117912.32, pct: 35.00 },
];
const IMSS_CUOTA_OBRERO_PCT = 2.375;
const INFONAVIT_PCT_DEFAULT = 5;

function calcularISRMensual(grav: number) {
  if (grav <= 0) return 0;
  const fila = TARIFA_ISR_MENSUAL_2026.find(f => grav >= f.lim_inf && grav <= f.lim_sup);
  if (!fila) return 0;
  const exc = grav - fila.lim_inf;
  return +(fila.cuota + (exc * fila.pct / 100)).toFixed(2);
}

export default function CalculadoraNominaPage() {
  const [sueldoMensual, setSueldoMensual] = useState<number>(0);
  const [diasPeriodo, setDiasPeriodo] = useState<number>(7);
  const [tieneInfonavit, setTieneInfonavit] = useState<boolean>(false);
  const [pctInfonavit, setPctInfonavit] = useState<number>(INFONAVIT_PCT_DEFAULT);

  const calc = useMemo(() => {
    const sm = Number(sueldoMensual) || 0;
    const sbc = sm;
    const isrM = calcularISRMensual(sbc);
    const imssM = +(sbc * IMSS_CUOTA_OBRERO_PCT / 100).toFixed(2);
    const infM = tieneInfonavit ? +(sbc * pctInfonavit / 100).toFixed(2) : 0;
    const dedM = +(isrM + imssM + infM).toFixed(2);
    const netoM = +(sm - dedM).toFixed(2);
    const factor = diasPeriodo / 30;
    return {
      sueldoBruto: +(sm * factor).toFixed(2),
      isr: +(isrM * factor).toFixed(2),
      imss: +(imssM * factor).toFixed(2),
      infonavit: +(infM * factor).toFixed(2),
      deducciones: +(dedM * factor).toFixed(2),
      neto: +(netoM * factor).toFixed(2),
      mensual: { isr: isrM, imss: imssM, infonavit: infM },
    };
  }, [sueldoMensual, diasPeriodo, tieneInfonavit, pctInfonavit]);

  const fmt = (n: number) => n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="aria-bg-canon h-full overflow-y-auto p-6 pb-12 space-y-5">
      <div className="flex items-center gap-3">
        <AriaBackButton href="/dashboard/talento/nomina" />
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-7 h-7 text-aria-accent" /> Calculadora de Nomina 2026
          </h1>
          <p className="text-xs text-[#7f93b0]">Estimacion ISR + IMSS + INFONAVIT con tablas SAT vigentes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white">Datos del empleado</h2>
          <div>
            <label className="text-xs text-[#7f93b0] block mb-1">Sueldo bruto mensual *</label>
            <input type="number" min="0" step="100" value={sueldoMensual || ""}
              onChange={e => setSueldoMensual(Number(e.target.value))}
              placeholder="Ej: 12000"
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm focus:border-aria-accent outline-none" />
          </div>
          <div>
            <label className="text-xs text-[#7f93b0] block mb-1">Periodo (dias)</label>
            <select value={diasPeriodo} onChange={e => setDiasPeriodo(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm">
              <option value={7}>Semanal (7 dias)</option>
              <option value={14}>Catorcenal (14 dias)</option>
              <option value={15}>Quincenal (15 dias)</option>
              <option value={30}>Mensual (30 dias)</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05]">
            <input id="infonavit" type="checkbox" checked={tieneInfonavit}
              onChange={e => setTieneInfonavit(e.target.checked)}
              className="w-4 h-4 accent-aria-accent" />
            <label htmlFor="infonavit" className="text-sm text-white cursor-pointer">Tiene credito INFONAVIT</label>
          </div>
          {tieneInfonavit && (
            <div>
              <label className="text-xs text-[#7f93b0] block mb-1">% retencion INFONAVIT</label>
              <input type="number" min="0" max="30" step="0.5" value={pctInfonavit}
                onChange={e => setPctInfonavit(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08] text-white text-sm" />
              <p className="text-[10px] text-[#4a6080] mt-1">Default 5%. Ajustar segun aviso del INFONAVIT.</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-aria-primary/10 border border-emerald-500/20 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-white">Resultado del periodo ({diasPeriodo} dias)</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-[#c9d8ed]">Sueldo bruto</span><span className="text-aria-accent tabular-nums">$ {fmt(calc.sueldoBruto)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#c9d8ed]">ISR</span><span className="text-rose-300 tabular-nums">- $ {fmt(calc.isr)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[#c9d8ed]">IMSS (obrero)</span><span className="text-rose-300 tabular-nums">- $ {fmt(calc.imss)}</span></div>
            {tieneInfonavit && (
              <div className="flex justify-between text-sm"><span className="text-[#c9d8ed]">INFONAVIT ({pctInfonavit}%)</span><span className="text-rose-300 tabular-nums">- $ {fmt(calc.infonavit)}</span></div>
            )}
            <div className="border-t border-white/[0.1] pt-2">
              <div className="flex justify-between text-sm"><span className="text-amber-300 font-semibold">Total deducciones</span><span className="text-amber-300 font-semibold tabular-nums">- $ {fmt(calc.deducciones)}</span></div>
              <div className="flex justify-between text-lg mt-1"><span className="text-emerald-300 font-bold">NETO A PAGAR</span><span className="text-emerald-300 font-bold tabular-nums">$ {fmt(calc.neto)}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5 space-y-3 text-xs text-[#7f93b0]">
        <div className="flex items-center gap-2 text-white">
          <Info className="w-4 h-4 text-aria-accent" />
          <span className="font-semibold">Como se determinan las deducciones</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <div><p className="text-aria-accent font-semibold mb-1">ISR</p><p>Tarifa progresiva del articulo 96 LISR sobre el sueldo bruto mensual. Mensual: <span className="text-white">$ {fmt(calc.mensual.isr)}</span></p></div>
          <div><p className="text-aria-accent font-semibold mb-1">IMSS</p><p>Cuota obrera del {IMSS_CUOTA_OBRERO_PCT}% sobre SBC. Mensual: <span className="text-white">$ {fmt(calc.mensual.imss)}</span></p></div>
          <div><p className="text-aria-accent font-semibold mb-1">INFONAVIT</p><p>Solo con credito activo. Default 5% s/SBC. Mensual: <span className="text-white">$ {fmt(calc.mensual.infonavit)}</span></p></div>
        </div>
      </div>
    </div>
  );
}
