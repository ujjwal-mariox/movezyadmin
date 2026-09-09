import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Served standalone at "/" (Render) or mounted under the marketing site at
// "/admin/" — the website build sets VITE_BASE_PATH=/admin/. BrowserRouter
// reads the same value through import.meta.env.BASE_URL.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || loadEnv(mode, process.cwd(), "").VITE_BASE_PATH || "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
