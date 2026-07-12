/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          950: "#04140f",
          900: "#07231a",
          800: "#0b3d2e",
          700: "#124f3b",
          600: "#186449",
        },
        navy: {
          950: "#060c1a",
          900: "#0a1428",
          800: "#0f1e3a",
          700: "#152a4a",
          600: "#1c3559",
        },
        chalk: "#f2f6f1",
        flood: "#e8ffef",
        gold: {
          300: "#f7d666",
          400: "#F4C430",
          500: "#dba824",
          600: "#b3862a",
        },
        green: {
          glow: "#3ddc84",
          action: "#00FF87",
          actionHover: "#00CC6A",
        },
        ember: "#FF4C4C",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      backgroundImage: {
        "stripes": "repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 40px, transparent 40px, transparent 80px)",
      },
    },
  },
  plugins: [],
};
