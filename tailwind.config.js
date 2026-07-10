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
        chalk: "#f2f6f1",
        flood: "#e8ffef",
        gold: {
          400: "#e8c468",
          500: "#d4a93f",
          600: "#b3862a",
        },
        ember: "#e0553f",
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
