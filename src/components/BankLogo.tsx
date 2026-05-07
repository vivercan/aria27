"use client";

// 7-May-2026 — Logos reales de bancos como tarjetas blancas con shadow 3D ligero.
// Los archivos PNG estan en /public/banks/.
// Si el banco no tiene archivo, fallback a tarjeta gris con texto.

interface BankLogoProps {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showName?: boolean; // si false, solo se muestra la tarjeta del logo
}

interface BankConfig {
  file: string;       // archivo en /public/banks/{file}
  label: string;      // nombre canonico para tooltip/showName
  matches: string[];  // patrones para matching (lowercase)
}

const BANKS: BankConfig[] = [
  { file: "bbva.png",        label: "BBVA",        matches: ["bbva", "bancomer"] },
  { file: "santander.png",   label: "Santander",   matches: ["santander"] },
  { file: "banorte.png",     label: "Banorte",     matches: ["banorte"] },
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

  // Tarjeta tamaños — TODOS la misma proporcion para consistencia
  const dim = size === "sm" ? { w: 78, h: 28, gap: 6, txt: 11, pad: 1 } :
              size === "lg" ? { w: 130, h: 44, gap: 10, txt: 14, pad: 2 } :
                              { w: 100, h: 34, gap: 8, txt: 13, pad: 1 };

  // Estilo tarjeta canon: fondo blanco + ligero 3D + ring sutil
  const cardStyle: React.CSSProperties = {
    width: dim.w,
    height: dim.h,
    background: "#FFFFFF",
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: dim.pad,
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.40), 0 2px 4px rgba(0,0,0,0.30), 0 1px 2px rgba(0,0,0,0.15)",
    flexShrink: 0,
  };

  if (bank) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: dim.gap }}>
        <span style={cardStyle} title={bank.label}>
          <img
            src={`/banks/${bank.file}`}
            alt={bank.label}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
          />
        </span>
        {showName && <span style={{ fontSize: dim.txt, color: "#C9D8ED", fontWeight: 400 }}>{bank.label}</span>}
      </span>
    );
  }

  // Fallback tarjeta gris con texto del banco no reconocido
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: dim.gap }}>
      <span style={{
        ...cardStyle,
        background: "linear-gradient(180deg, #475569 0%, #2D3848 100%)",
        color: "#F1F5F9",
        fontSize: Math.max(8, dim.txt - 2),
        fontWeight: 700,
      }}>
        {trimmed.slice(0, 8).toUpperCase()}
      </span>
      {showName && <span style={{ fontSize: dim.txt, color: "#C9D8ED" }}>{trimmed}</span>}
    </span>
  );
}

export function getBankConfig(name: string | null | undefined): BankConfig | null {
  return findBank(name);
}
