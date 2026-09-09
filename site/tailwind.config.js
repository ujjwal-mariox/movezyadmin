/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Same brand ramp as the admin panel; 500/600 are the app's orange.
      colors: {
        movezy: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#ff6b35",
          600: "#ff5722",
          700: "#ea580c",
          800: "#c2410c",
          900: "#9a3412",
        },
        brand: "#FF6200",
        ink: "#1F2937",
        muted: "#6B7280",
        leaf: "#A2BF49",
      },
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.06), 0 8px 24px -12px rgba(16, 24, 40, 0.18)",
        glow: "0 12px 40px -12px rgba(255, 98, 0, 0.45)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
