"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";
type Season = "normal" | "valentine" | "halloween" | "christmas" | "diademuertos";

interface ThemeContextType {
  theme: Theme;
  season: Season;
  setTheme: (theme: Theme) => void;
  setSeason: (season: Season) => void;
  colors: {
    bg: string;
    bgGradient: string;
    sidebar: string;
    card: string;
    cardHover: string;
    border: string;
    text: string;
    textMuted: string;
    accent: string;
  };
}

const defaultColors = {
  bg: "bg-[#0a1628]",
  bgGradient: "from-[#0f172a] to-[#1e3a5a]",
  sidebar: "bg-[#0a1628]",
  card: "bg-white/5",
  cardHover: "hover:bg-white/10",
  border: "border-white/10",
  text: "text-white",
  textMuted: "text-slate-400",
  accent: "text-cyan-400",
};

const defaultContext: ThemeContextType = {
  theme: "dark",
  season: "normal",
  setTheme: () => {},
  setSeason: () => {},
  colors: defaultColors,
};

const ThemeContext = createContext<ThemeContextType>(defaultContext);

const themes = {
  dark: {
    normal: defaultColors,
    valentine: {
      bg: "bg-[#1a0a14]",
      bgGradient: "from-[#2d1f3d] to-[#4a1942]",
      sidebar: "bg-[#1a0a14]",
      card: "bg-pink-500/10",
      cardHover: "hover:bg-pink-500/20",
      border: "border-pink-500/20",
      text: "text-white",
      textMuted: "text-pink-200",
      accent: "text-pink-400",
    },
    halloween: {
      bg: "bg-[#0d0d0d]",
      bgGradient: "from-[#1a1a1a] to-[#2d1f00]",
      sidebar: "bg-[#0d0d0d]",
      card: "bg-orange-500/10",
      cardHover: "hover:bg-orange-500/20",
      border: "border-orange-500/20",
      text: "text-white",
      textMuted: "text-orange-200",
      accent: "text-orange-400",
    },
    christmas: {
      bg: "bg-[#0a1a0a]",
      bgGradient: "from-[#1a2f1a] to-[#2d1f1f]",
      sidebar: "bg-[#0a1a0a]",
      card: "bg-green-500/10",
      cardHover: "hover:bg-green-500/20",
      border: "border-green-500/20",
      text: "text-white",
      textMuted: "text-green-200",
      accent: "text-red-400",
    },
    diademuertos: {
      bg: "bg-[#1a0a1a]",
      bgGradient: "from-[#2d1f3d] to-[#1a1a00]",
      sidebar: "bg-[#1a0a1a]",
      card: "bg-purple-500/10",
      cardHover: "hover:bg-purple-500/20",
      border: "border-purple-500/20",
      text: "text-white",
      textMuted: "text-purple-200",
      accent: "text-orange-400",
    },
  },
  light: {
    normal: {
      bg: "bg-slate-100",
      bgGradient: "from-slate-50 to-slate-200",
      sidebar: "bg-white",
      card: "bg-white",
      cardHover: "hover:bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-900",
      textMuted: "text-slate-500",
      accent: "text-cyan-600",
    },
    valentine: {
      bg: "bg-pink-50",
      bgGradient: "from-pink-50 to-rose-100",
      sidebar: "bg-white",
      card: "bg-white",
      cardHover: "hover:bg-pink-50",
      border: "border-pink-200",
      text: "text-slate-900",
      textMuted: "text-pink-600",
      accent: "text-pink-500",
    },
    halloween: {
      bg: "bg-orange-50",
      bgGradient: "from-orange-50 to-amber-100",
      sidebar: "bg-white",
      card: "bg-white",
      cardHover: "hover:bg-orange-50",
      border: "border-orange-200",
      text: "text-slate-900",
      textMuted: "text-orange-600",
      accent: "text-orange-500",
    },
    christmas: {
      bg: "bg-green-50",
      bgGradient: "from-green-50 to-red-50",
      sidebar: "bg-white",
      card: "bg-white",
      cardHover: "hover:bg-green-50",
      border: "border-green-200",
      text: "text-slate-900",
      textMuted: "text-green-600",
      accent: "text-red-500",
    },
    diademuertos: {
      bg: "bg-purple-50",
      bgGradient: "from-purple-50 to-orange-50",
      sidebar: "bg-white",
      card: "bg-white",
      cardHover: "hover:bg-purple-50",
      border: "border-purple-200",
      text: "text-slate-900",
      textMuted: "text-purple-600",
      accent: "text-orange-500",
    },
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [season, setSeasonState] = useState<Season>("normal");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("aria-theme") as Theme;
    const savedSeason = localStorage.getItem("aria-season") as Season;
    if (savedTheme) setThemeState(savedTheme);
    if (savedSeason) setSeasonState(savedSeason);
    setMounted(true);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("aria-theme", t);
  };

  const setSeason = (s: Season) => {
    setSeasonState(s);
    localStorage.setItem("aria-season", s);
  };

  const colors = themes[theme][season];

  return (
    <ThemeContext.Provider value={{ theme, season, setTheme, setSeason, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  return useContext(ThemeContext);
};
