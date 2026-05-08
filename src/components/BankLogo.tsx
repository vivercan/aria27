"use client";

// 7-May-2026 — Logos de bancos como etiquetas con nitidez AAA.
// SVG/PNG inline. Per-banco se puede indicar si requiere fondo blanco
// (logos con texto sobre transparente) o NO (logos que ya traen su
// propio fondo de color como Santander, Banorte).

interface BankLogoProps {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
}

interface BankConfig {
  file: string;
  label: string;
  matches: string[];
  noBg?: boolean; // Si true: no aplicar fondo blanco, el logo va directo
}

const BANKS: BankConfig[] = [
  { file: "bbva.png",        label: "BBVA",        matches: ["bbva", "bancomer"] },
  { file: "santander.png",   label: "Santander",   matches: ["santander"], noBg: true },
  { file: "banorte.png",     label: "Banorte",     matches: ["banorte"], noBg: true },
  { file: "hsbc.png",        label: "HSBC",        matches: ["hsbc"] },
  { file: "citibanamex.png", label: "Citibanamex", matches: ["banamex", "citibanamex", "citi"] },
  { file: "babajio.png",     label: "BanBajío",    matches: ["banbajio", "ban bajio", "bajio"] },
  { file: "banregio.png",    label: "Banregio",    matches: ["banregio"] },
  { file: "scotia.png",      label: "Scotiabank",  matches: ["scotiabank", "scotia"] },
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
  const trimmed = (name || "").trim();
  if (!trimmed) return null;

  const bank = findBank(trimmed);

  // Etiqueta tipo tag, altura corta. Border-radius 4 (canon).
  const dim = size === "sm" ? { w: 70, h: 22, gap: 6, txt: 11, pad: 1, radius: 4 } :
              size === "lg" ? { w: 110, h: 32, gap: 10, txt: 14, pad: 2, radius: 5 } :
                              { w: 88, h: 26, gap: 8, txt: 13, pad: 1, radius: 4 };

  const baseCard: React.CSSProperties = {
    width: dim.w,
    height: dim.h,
    borderRadius: dim.radius,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.30), 0 1px 2px rgba(0,0,0,0.30), 0 1px 1px rgba(0,0,0,0.10)",
  };

  if (bank) {
    // Si el banco usa noBg (Santander, Banorte): el logo ocupa 100% sin fondo blanco
    const cardStyle: React.CSSProperties = bank.noBg
      ? { ...baseCard, padding: 0, border: "1px solid rgba(255,255,255,0.10)" }
      : { ...baseCard, padding: dim.pad, background: "#FFFFFF", border: "1px solid rgba(255,255,255,0.18)" };

    const imgStyle: React.CSSProperties = bank.noBg
      ? {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          imageRendering: "auto",
        }
      : {
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          display: "block",
          imageRendering: "auto",
        };

    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: dim.gap }}>
        <span style={cardStyle} title={bank.label}>
          <img
            src={`/banks/${bank.file}`}
            alt={bank.label}
            style={imgStyle}
            loading="eager"
            decoding="sync"
          />
        </span>
        {showName && <span style={{ fontSize: dim.txt, color: "#0A1A45", fontWeight: 500 }}>{bank.label}</span>}
      </span>
    );
  }

  // Banco no reconocido: solo texto plano (sin cuadro fantasma)
  if (!showName) return null;
  return (
    <span style={{ fontSize: dim.txt, color: "#475569", fontWeight: 500 }}>{trimmed}</span>
  );
}

export function getBankConfig(name: string | null | undefined): BankConfig | null {
  return findBank(name);
}
