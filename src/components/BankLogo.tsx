"use client";

// 7-May-2026 — Logos de bancos como SVG inline.
// Cada banco renderea con su color corporativo + tipografia bold.
// Si el nombre no matchea, devuelve un badge generico con iniciales.

interface BankLogoProps {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

interface BankConfig {
  bg: string;       // color de fondo
  fg: string;       // color del texto
  label: string;    // texto a mostrar
  matches: string[]; // patrones para matching (lowercase)
  letters?: string; // iniciales para la version mini
}

const BANKS: BankConfig[] = [
  { bg: "#004481", fg: "#FFFFFF", label: "BBVA",       letters: "BB", matches: ["bbva", "bancomer"] },
  { bg: "#EC0000", fg: "#FFFFFF", label: "Santander",  letters: "SN", matches: ["santander"] },
  { bg: "#EC1C2E", fg: "#FFFFFF", label: "Banorte",    letters: "NT", matches: ["banorte"] },
  { bg: "#DB0011", fg: "#FFFFFF", label: "HSBC",       letters: "HS", matches: ["hsbc"] },
  { bg: "#E1251B", fg: "#FFFFFF", label: "Citibanamex",letters: "BX", matches: ["banamex", "citibanamex", "citi"] },
  { bg: "#7A1A8C", fg: "#FFFFFF", label: "BanBajío",   letters: "BJ", matches: ["banbajio", "ban bajio", "bajio"] },
  { bg: "#F47920", fg: "#FFFFFF", label: "Banregio",   letters: "BR", matches: ["banregio"] },
  { bg: "#E30613", fg: "#FFFFFF", label: "Scotiabank", letters: "SC", matches: ["scotiabank", "scotia"] },
  { bg: "#1E3E7A", fg: "#FFFFFF", label: "Inbursa",    letters: "IN", matches: ["inbursa"] },
  { bg: "#005EB8", fg: "#FFFFFF", label: "Banco Azteca",letters: "AZ", matches: ["azteca"] },
  { bg: "#00A0AF", fg: "#FFFFFF", label: "Bancoppel",  letters: "CP", matches: ["coppel", "bancoppel"] },
  { bg: "#003B70", fg: "#FFFFFF", label: "Mifel",      letters: "MF", matches: ["mifel"] },
  { bg: "#7B2D8E", fg: "#FFFFFF", label: "Multiva",    letters: "MV", matches: ["multiva"] },
  { bg: "#003366", fg: "#FFFFFF", label: "Bansí",      letters: "BS", matches: ["bansi", "bansí"] },
  { bg: "#0070BB", fg: "#FFFFFF", label: "Banco Sabadell", letters: "SB", matches: ["sabadell"] },
];

function findBank(name: string | null | undefined): BankConfig | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  for (const b of BANKS) {
    for (const m of b.matches) {
      if (lower.includes(m)) return b;
    }
  }
  return null;
}

export default function BankLogo({ name, size = "md", showName = true }: BankLogoProps) {
  const bank = findBank(name);

  // Tamaños
  const dim = size === "sm" ? { box: 22, font: 9, gap: 6, txt: 11 } :
              size === "lg" ? { box: 36, font: 13, gap: 10, txt: 14 } :
                              { box: 28, font: 11, gap: 8, txt: 13 };

  if (!bank) {
    // Fallback: cuadro genérico con primeras 2 letras del nombre
    const fallbackLetters = (name || "??").trim().slice(0, 2).toUpperCase();
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: dim.gap }}>
        <span style={{
          width: dim.box, height: dim.box,
          background: "linear-gradient(180deg, #475569 0%, #2D3848 100%)",
          color: "#F1F5F9",
          borderRadius: 6,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: dim.font,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 3px rgba(0,0,0,0.30)",
        }}>{fallbackLetters}</span>
        {showName && <span style={{ fontSize: dim.txt, color: "#C9D8ED" }}>{name || "-"}</span>}
      </span>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: dim.gap }}>
      <span style={{
        width: dim.box, height: dim.box,
        background: bank.bg,
        color: bank.fg,
        borderRadius: 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: dim.font,
        fontWeight: 800,
        letterSpacing: "-0.02em",
        border: "1px solid rgba(255,255,255,0.20)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.20), 0 1px 3px rgba(0,0,0,0.30)",
      }}>{bank.letters}</span>
      {showName && <span style={{ fontSize: dim.txt, color: "#F4F8FF", fontWeight: 500 }}>{bank.label}</span>}
    </span>
  );
}

// Helper para obtener configuración (uso opcional desde otros componentes)
export function getBankConfig(name: string | null | undefined): BankConfig | null {
  return findBank(name);
}
