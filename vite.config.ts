import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// The admin panel lives at /admin — never at the root. The marketing site
// owns "/". BrowserRouter reads the same value through import.meta.env.BASE_URL,
// and scripts/postbuild.mjs lays the build out as dist/admin/* with a root
// redirect, so a standalone deployment also answers only under /admin.
export default defineConfig({
  plugins: [react()],
  base: "/admin/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
