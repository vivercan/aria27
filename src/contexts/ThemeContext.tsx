"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";
type Season = "normal" | "valentine" | "halloween" | "christmas" | "diademuertos";

interface ThemeColors {
  bg: string;
  bgGradient: string;
  sidebar: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  accent: string;
  accentBg: string;
}

interface ThemeContextType {
  theme: Theme;
  season: Season;
  setTheme: (theme: Theme) => void;
  setSeason: (season: Season) => void;
  colors: ThemeColors;
}

const defaultColors: ThemeColors = {
  bg: "#0a1628",
  bgGradient: "from-[#0f172a] to-[#1e3a5a]",
  sidebar: "#0a1628",
  card: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.1)",
  text: "#ffffff",
  textMuted: "#94a3b8",
  accent: "#22d3ee",
  accentBg: "rgba(34,211,238,0.1)",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  season: "normal",
  setTheme: () => {},
  setSeason: () => {},
  colors: defaultColors,
});

const themeColors: Record<Theme, Record<Season, ThemeColors>> = {
  dark: {
    normal: defaultColors,
    valentine: {
      bg: "#1a0a14",
      bgGradient: "from-[#2d1025] to-[#4a1942]",
      sidebar: "#1a0a14",
      card: "rgba(236,72,153,0.1)",
      cardBorder: "rgba(236,72,153,0.2)",
      text: "#ffffff",
      textMuted: "#f9a8d4",
      accent: "#ec4899",
      accentBg: "rgba(236,72,153,0.15)",
    },
    halloween: {
      bg: "#0d0d0d",
      bgGradient: "from-[#1a1a1a] to-[#2d1f00]",
      sidebar: "#0d0d0d",
      card: "rgba(249,115,22,0.1)",
      cardBorder: "rgba(249,115,22,0.2)",
      text: "#ffffff",
      textMuted: "#fdba74",
      accent: "#f97316",
      accentBg: "rgba(249,115,22,0.15)",
    },
    christmas: {
      bg: "#0a1a0a",
      bgGradient: "from-[#0f2f0f] to-[#1a0f0f]",
      sidebar: "#0a1a0a",
      card: "rgba(34,197,94,0.1)",
      cardBorder: "rgba(34,197,94,0.2)",
      text: "#ffffff",
      textMuted: "#86efac",
      accent: "#ef4444",
      accentBg: "rgba(239,68,68,0.15)",
    },
    diademuertos: {
      bg: "#1a0a1a",
      bgGradient: "from-[#2d1f3d] to-[#1a1a00]",
      sidebar: "#1a0a1a",
      card: "rgba(168,85,247,0.1)",
      cardBorder: "rgba(168,85,247,0.2)",
      text: "#ffffff",
      textMuted: "#c4b5fd",
      accent: "#f97316",
      accentBg: "rgba(168,85,247,0.15)",
    },
  },
  light: {
    normal: {
      bg: "#f1f5f9",
      bgGradient: "from-[#e2e8f0] to-[#cbd5e1]",
      sidebar: "#ffffff",
      card: "#ffffff",
      cardBorder: "#cbd5e1",
      text: "#1e293b",
      textMuted: "#64748b",
      accent: "#0891b2",
      accentBg: "rgba(8,145,178,0.1)",
    },
    valentine: {
      bg: "#fce7f3",
      bgGradient: "from-[#fbcfe8] to-[#fda4af]",
      sidebar: "#ffffff",
      card: "#ffffff",
      cardBorder: "#f9a8d4",
      text: "#1e293b",
      textMuted: "#be185d",
      accent: "#db2777",
      accentBg: "rgba(219,39,119,0.1)",
    },
    halloween: {
      bg: "#fef3c7",
      bgGradient: "from-[#fde68a] to-[#fdba74]",
      sidebar: "#ffffff",
      card: "#ffffff",
      cardBorder: "#f97316",
      text: "#1e293b",
      textMuted: "#c2410c",
      accent: "#ea580c",
      accentBg: "rgba(234,88,12,0.1)",
    },
    christmas: {
      bg: "#dcfce7",
      bgGradient: "from-[#bbf7d0] to-[#fecaca]",
      sidebar: "#ffffff",
      card: "#ffffff",
      cardBorder: "#22c55e",
      text: "#1e293b",
      textMuted: "#166534",
      accent: "#dc2626",
      accentBg: "rgba(220,38,38,0.1)",
    },
    diademuertos: {
      bg: "#f3e8ff",
      bgGradient: "from-[#e9d5ff] to-[#fed7aa]",
      sidebar: "#ffffff",
      card: "#ffffff",
      cardBorder: "#a855f7",
      text: "#1e293b",
      textMuted: "#7c3aed",
      accent: "#ea580c",
      accentBg: "rgba(168,85,247,0.1)",
    },
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [season, setSeasonState] = useState<Season>("normal");

  useEffect(() => {
    const savedTheme = localStorage.getItem("aria-theme") as Theme;
    const savedSeason = localStorage.getItem("aria-season") as Season;
    if (savedTheme && (savedTheme === "dark" || savedTheme === "light")) setThemeState(savedTheme);
    if (savedSeason) setSeasonState(savedSeason);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("aria-theme", t);
  };

  const setSeason = (s: Season) => {
    setSeasonState(s);
    localStorage.setItem("aria-season", s);
  };

  const colors = themeColors[theme][season];

  return (
    <ThemeContext.Provider value={{ theme, season, setTheme, setSeason, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
