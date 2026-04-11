import type { Config } from "tailwindcss"
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: { 950: '#020617' },
        // ===== ARIA27 SEMANTIC COLORS (CSS Custom Properties) =====
        // Usar: bg-aria-primary, text-aria-accent, border-aria-card-border, etc.
        // Cambian automáticamente con ThemeContext (tema/temporada).
        aria: {
          bg: "var(--aria-bg)",
          sidebar: "var(--aria-sidebar)",
          card: "var(--aria-card)",
          "card-border": "var(--aria-card-border)",
          text: "var(--aria-text)",
          muted: "var(--aria-muted)",
          accent: "var(--aria-accent)",
          "accent-bg": "var(--aria-accent-bg)",
          primary: "var(--aria-primary)",
          "primary-hover": "var(--aria-primary-hover)",
          "primary-light": "var(--aria-primary-light)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
