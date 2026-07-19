import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "media"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B6B6B",
          dark: "#145252",
          light: "#D4F1F1",
          50: "#F0F9F9",
          100: "#D4F1F1",
          200: "#A8E0E0",
          300: "#7BCFCF",
          400: "#4FBEBE",
          500: "#1B6B6B",
          600: "#145252",
          700: "#0D3A3A",
          800: "#072121",
          900: "#030909",
        },
        secondary: {
          DEFAULT: "#2A9D8F",
          light: "#D4F5F0",
        },
        accent: {
          DEFAULT: "#E76F51",
          light: "#FAD8CF",
        },
        success: "#2A9D8F",
        warning: "#E9C46A",
        danger: "#E76F51",
        info: "#3B82F6",
        dark: "#264653",
        gray: {
          50: "#FAFBFC",
          100: "#F0F4F4",
          200: "#DDE5E5",
          300: "#B8C5C5",
          400: "#8FA0A0",
          500: "#6B8282",
          600: "#4A6363",
          700: "#354D4D",
          800: "#264653",
          900: "#1A3333",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["SF Mono", "monospace"],
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "10px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.04)",
        DEFAULT: "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)",
        lg: "0 8px 24px rgba(0,0,0,0.08)",
        xl: "0 16px 48px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;