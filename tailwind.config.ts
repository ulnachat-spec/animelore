import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        "canvas-tint": "rgb(var(--c-canvas-tint) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        soft: "rgb(var(--c-soft) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        body: "rgb(var(--c-body) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        brand: "rgb(var(--c-brand) / <alpha-value>)",
        "brand-strong": "rgb(var(--c-brand-strong) / <alpha-value>)",
        sage: "rgb(var(--c-sage) / <alpha-value>)",
        paper: "rgb(var(--c-elevated) / <alpha-value>)"
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"]
      },
      boxShadow: {
        card: "0 18px 50px rgb(var(--c-shadow) / 0.10)",
        float: "0 22px 70px rgb(var(--c-shadow) / 0.22)"
      },
      backgroundImage: {
        "archive-glow":
          "radial-gradient(circle at 15% 0%, rgb(var(--c-brand) / 0.10), transparent 36%), radial-gradient(circle at 92% 12%, rgb(var(--c-sage) / 0.10), transparent 32%)"
      }
    }
  },
  plugins: []
};

export default config;
