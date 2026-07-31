/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        cream: {
          50: "#FAF5EF",
          100: "#F5EBE0",
          200: "#E8DFD4",
          300: "#D4C4B5",
          400: "#B8A99A",
          500: "#9C8B7A",
          600: "#8B7355",
          700: "#6F5E4D",
          800: "#5D4E37",
          900: "#4A3F2E",
        },
        coffee: {
          50: "#FDF8F3",
          100: "#F5E6D3",
          200: "#EBD0B3",
          300: "#D4A574",
          400: "#C9956B",
          500: "#B07D53",
          600: "#8B5E3C",
          700: "#6B4A30",
          800: "#4A3320",
          900: "#2E2014",
        },
        caramel: "#C9956B",
        mocha: "#8B5E3C",
        alert: "#E15D5D",
        success: "#34C759",
      },
      fontFamily: {
        display: ['"Noto Serif SC"', '"Source Han Serif SC"', 'STSong', 'SimSun', 'serif'],
        body: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 4px 20px rgba(139, 94, 60, 0.08)",
        card: "0 8px 32px rgba(139, 94, 60, 0.12)",
        float: "0 12px 40px rgba(107, 74, 48, 0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out forwards",
        "slide-up": "slideUp 0.5s ease-out forwards",
        "pulse-ring": "pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
