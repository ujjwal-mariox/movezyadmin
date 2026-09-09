import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Local convenience: with the admin dev server running on 5173 with
    // VITE_BASE_PATH=/admin/, http://localhost:5178/admin shows it, mirroring
    // production where both apps share one host.
    proxy: {
      "/admin": { target: "http://localhost:5173", changeOrigin: true },
    },
  },
  // `vite preview` inherits server.proxy by default, which would hide the
  // built dist/admin behind a dead proxy — serve the bundle as-is instead.
  preview: {
    proxy: {},
  },
});
