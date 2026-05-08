import {
  Hammer, Wrench, HardHat, Truck, PaintBucket, Fuel, Zap, Pipette,
  Trees, Flame, Mountain, BookOpen, Laptop, Boxes, Package, Building2,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, { icon: LucideIcon; color: string }> = {
  ACEROS:        { icon: Hammer,      color: "#9CA3AF" },
  REFACCIONES:   { icon: Wrench,      color: "#7C3AED" },
  EPP:           { icon: HardHat,     color: "#F59E0B" },
  CONCRETOS:     { icon: Truck,       color: "#64748B" },
  PINTURA:       { icon: PaintBucket, color: "#EC4899" },
  COMBUSTIBLES:  { icon: Fuel,        color: "#EF4444" },
  ELECTRICO:     { icon: Zap,         color: "#FACC15" },
  FERRETERIA:    { icon: Wrench,      color: "#0EA5E9" },
  HERRAMIENTAS:  { icon: Wrench,      color: "#0EA5E9" },
  TUBERIAS:      { icon: Pipette,     color: "#06B6D4" },
  MADERAS:       { icon: Trees,       color: "#92400E" },
  HERRERA:       { icon: Flame,       color: "#DC2626" },
  AGREGADOS:     { icon: Mountain,    color: "#A16207" },
  BLOCKS:        { icon: Mountain,    color: "#A16207" },
  PAPELERIA:     { icon: BookOpen,    color: "#3B82F6" },
  COMPUTO:       { icon: Laptop,      color: "#10B981" },
  PREFABRICADOS: { icon: Boxes,       color: "#8B5CF6" },
};

const NORMALIZE: Record<string, string> = {
  "ELÉCTRICO": "ELECTRICO",
  "FERRETERÍA": "FERRETERIA",
  "TUBERÍAS": "TUBERIAS",
  "AGREGADOS PETREOS": "AGREGADOS",
  "AGREGADOS PÉTREOS": "AGREGADOS",
};

export function getCategoryIcon(category: string | string[] | null | undefined) {
  if (!category) return { icon: Building2, color: "#64748B" };
  const cats = Array.isArray(category) ? category : [category];
  for (const c of cats) {
    if (!c) continue;
    const upper = (c + "").toUpperCase().trim();
    const norm = NORMALIZE[upper] || upper;
    if (MAP[norm]) return MAP[norm];
  }
  return { icon: Package, color: "#64748B" };
}
