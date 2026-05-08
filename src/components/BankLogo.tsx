"use client";
import { ClipboardCopy, ClipboardCheck } from "lucide-react";

interface BankLogoProps {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  showCopy?: boolean;
  copied?: boolean;
}

interface BankConfig {
  file: string;
  label: string;
  matches: string[];
  bgColor?: string;
}

const BANKS: BankConfig[] = [
  { file: "bbva.png",        label: "BBVA",        matches: ["bbva", "bancomer"] },
  { file: "santander.png",   label: "Santander",   matches: ["santander"], bgColor: "#EC0000" },
  { file: "banorte.png",     label: "Banorte",     matches: ["banorte"], bgColor: "#EC1C2E" },
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

export default function BankLogo({ name, size = "md", showName = true, showCopy = false, copied = false }: BankLogoProps) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;

  const bank = findBank(trimmed);
  const dim = size === "sm" ? { w: 70, h: 22, gap: 6, txt: 11, pad: 1, radius: 4, nameWidth: 80 } :
              size === "lg" ? { w: 110, h: 32, gap: 10, txt: 14, pad: 2, radius: 5, nameWidth: 110 } :
                              { w: 88, h: 26, gap: 8, txt: 13, pad: 1, radius: 4, nameWidth: 92 };

  if (bank) {
    const bg = bank.bgColor || "#FFFFFF";
    const cardStyle: React.CSSProperties = {
      width: dim.w,
      height: dim.h,
      borderRadius: dim.radius,
      background: bg,
      padding: dim.pad,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      overflow: "hidden",
      border: "1px solid rgba(0,0,0,0.10)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.30), 0 1px 2px rgba(0,0,0,0.20)",
    };
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: dim.gap }}>
        <span style={cardStyle} title={bank.label}>
          <img src={`/banks/${bank.file}`} alt={bank.label}
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block", imageRendering: "auto" }}
            loading="eager" decoding="sync" />
        </span>
        {showName && (
          <span style={{ fontSize: dim.txt, color: "#0A1A45", fontWeight: 500, width: dim.nameWidth, display: "inline-block" }}>
            {bank.label}
          </span>
        )}
        {showCopy && (
          copied
            ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>
            : <ClipboardCopy className="w-3.5 h-3.5 text-[#475569] shrink-0"/>
        )}
      </span>
    );
  }

  if (!showName) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: dim.gap }}>
      <span style={{ fontSize: dim.txt, color: "#475569", fontWeight: 500, width: dim.nameWidth, display: "inline-block" }}>
        {trimmed}
      </span>
      {showCopy && (
        copied
          ? <ClipboardCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0"/>
          : <ClipboardCopy className="w-3.5 h-3.5 text-[#475569] shrink-0"/>
      )}
    </span>
  );
}

export function getBankConfig(name: string | null | undefined): BankConfig | null {
  return findBank(name);
}
