import { describe, it, expect } from "vitest";
import { normalize, matchesSearch, applyListFilter, countChips, uniqueOptions } from "@/lib/list-filter";

type R = { folio: string; obra: string; prov: string | null; status: string; mine: boolean };
const items: R[] = [
  { folio: "REQ-2026-00723", obra: "DIF ESTATAL EL CÓBANO", prov: "Ing. Edmundo Gasca", status: "PENDIENTE", mine: true },
  { folio: "REQ-2026-00747", obra: "FRACCIONAMIENTO VILLAS DE LA UNIVERSIDAD", prov: "Juan Rodriguez Cimbra", status: "EN_AUTORIZACION", mine: false },
  { folio: "REQ-2026-00719", obra: "BLVD. RUIZ CORTINES", prov: "Sindicatos Innovativos", status: "PENDIENTE", mine: false },
  { folio: "REQ-2026-00001", obra: "Parque  Villas de la Universidad ", prov: null, status: "APROBADA", mine: true },
];
const fields = (r: R) => [r.folio, r.obra, r.prov];

describe("FASE 0 list-filter", () => {
  it("normalize quita acentos, mayusculas y espacios dobles", () => {
    expect(normalize("  DIF  ESTATAL el CÓBANO ")).toBe("dif estatal el cobano");
  });
  it("busca sin acentos y por fragmento de folio", () => {
    expect(matchesSearch(fields(items[0]), "cobano")).toBe(true);
    expect(matchesSearch(fields(items[0]), "723")).toBe(true);
    expect(matchesSearch(fields(items[0]), "cimbra")).toBe(false);
  });
  it("varias palabras = todas deben coincidir (AND)", () => {
    expect(matchesSearch(fields(items[1]), "villas cimbra")).toBe(true);
    expect(matchesSearch(fields(items[1]), "villas gasca")).toBe(false);
  });
  it("chip por estado y chip calculado (mis pendientes)", () => {
    const base = { items, search: "", searchFields: fields, chipOf: (r: R) => r.status, selects: {}, selectOf: {} };
    expect(applyListFilter({ ...base, chip: "PENDIENTE" }).map(r => r.folio)).toEqual(["REQ-2026-00723", "REQ-2026-00719"]);
    const preds = { mis_pendientes: (r: R) => r.mine && r.status !== "APROBADA" };
    expect(applyListFilter({ ...base, chip: "mis_pendientes", chipPredicates: preds }).map(r => r.folio)).toEqual(["REQ-2026-00723"]);
  });
  it("select de obra tolera espacios y mayusculas distintas", () => {
    const base = { items, search: "", searchFields: fields, chip: "", chipOf: (r: R) => r.status, selectOf: { obra: (r: R) => r.obra } };
    expect(applyListFilter({ ...base, selects: { obra: "parque villas de la universidad" } }).length).toBe(1);
  });
  it("counts y opciones unicas", () => {
    const c = countChips(items, ["PENDIENTE", "EN_AUTORIZACION", "APROBADA", "mis"], (r) => r.status, { mis: (r) => r.mine });
    expect(c).toEqual({ PENDIENTE: 2, EN_AUTORIZACION: 1, APROBADA: 1, mis: 2 });
    expect(uniqueOptions(items, (r) => r.obra)).toHaveLength(4);
    expect(uniqueOptions([...items, { ...items[3], obra: "PARQUE VILLAS DE LA UNIVERSIDAD" }], (r) => r.obra)).toHaveLength(4);
  });
});
