import type { Config } from "tailwindcss";

/**
 * CVD 2.0 design system.
 * Institutional, neutral first. One restrained signature accent (CVD green).
 * Values map 1:1 to the visual source of truth.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "var(--canvas)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        ink: {
          DEFAULT: "var(--ink)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        cvd: {
          DEFAULT: "var(--cvd)",
          soft: "var(--cvd-soft)",
        },
        positive: "var(--positive)",
        warning: "var(--warning)",
        critical: "var(--critical)",
        info: "var(--info)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
        heading: ["var(--font-heading)", "Space Grotesk", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Clash Display", "var(--font-heading)", "system-ui", "sans-serif"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "14px", fontWeight: "500" }],
        caption: ["12px", { lineHeight: "16px", fontWeight: "500" }],
        meta: ["12px", { lineHeight: "16px", fontWeight: "500" }],
        "body-sm": ["13px", { lineHeight: "18px" }],
        body: ["14px", { lineHeight: "20px" }],
        subsection: ["13px", { lineHeight: "18px", fontWeight: "600" }],
        section: ["20px", { lineHeight: "1.25", fontWeight: "600", letterSpacing: "-0.01em" }],
        title: ["32px", { lineHeight: "1.15", fontWeight: "600", letterSpacing: "-0.02em" }],
        hero: ["56px", { lineHeight: "1.02", fontWeight: "600", letterSpacing: "-0.02em" }],
      },
      spacing: {
        sidebar: "232px",
        topbar: "48px",
      },
      maxWidth: {
        shell: "1600px",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "6px",
        lg: "8px",
        xl: "10px",
      },
      boxShadow: {
        drawer: "-8px 0 40px -12px rgba(23,24,23,0.18)",
        overlay: "0 12px 48px -12px rgba(23,24,23,0.22)",
        hair: "0 1px 0 0 var(--line)",
        elevate: "0 1px 2px rgba(23,24,23,0.06), 0 8px 24px -6px rgba(23,24,23,0.08)",
        "elevate-hover": "0 2px 4px rgba(23,24,23,0.07), 0 16px 36px -8px rgba(23,24,23,0.14)",
      },
      transitionDuration: {
        fast: "140ms",
        DEFAULT: "180ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "drawer-in": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "login-float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "login-shine": {
          "0%": { transform: "translateX(-120%) rotate(18deg)" },
          "100%": { transform: "translateX(220%) rotate(18deg)" },
        },
        "login-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-7px)" },
          "40%": { transform: "translateX(7px)" },
          "60%": { transform: "translateX(-5px)" },
          "80%": { transform: "translateX(5px)" },
        },
        "login-orbit": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out both",
        "drawer-in": "drawer-in 200ms cubic-bezier(0.32, 0.72, 0, 1) both",
        "login-float": "login-float 4.5s ease-in-out infinite",
        "login-shine": "login-shine 2.8s ease-in-out infinite",
        "login-shake": "login-shake 420ms ease-in-out",
        "login-orbit": "login-orbit 18s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
