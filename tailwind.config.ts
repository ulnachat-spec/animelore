import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#f9fafb",
        brand: "#f97316"
      }
    }
  },
  plugins: []
};

export default config;
