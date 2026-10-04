/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['"Instrument Sans"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] },
      colors: {
        ink: { DEFAULT: "#0E1A2B", 800: "#16263D", 700: "#22354F", 400: "#7C8CA5", 300: "#A9B5C8" },
        paper: "#F4F5F7",
        line: "#E1E4EA",
        signal: { DEFAULT: "#2D6BFF", 50: "#EEF3FF", 600: "#1F57E0" },
        clear: { DEFAULT: "#E9A23B", 50: "#FDF4E3", 700: "#9A6411" },
        go: { DEFAULT: "#178F63", 50: "#E6F5EE" },
        alert: { DEFAULT: "#D3455B", 50: "#FCEBEE" },
      },
      borderRadius: { card: "14px" },
      boxShadow: { card: "0 1px 2px rgba(14,26,43,.05), 0 6px 20px -12px rgba(14,26,43,.18)" },
    },
  },
  plugins: [],
};
