import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // No proxy — frontend reads static /predictions.json from public/.
    // Set VITE_API_BASE_URL in .env.local to point at a live FastAPI instead.
  },
  plugins: [
    react()
  ].filter(Boolean),
  optimizeDeps: {
    // Radix mounts these lazily (only once a dialog/menu first opens), so Vite
    // discovers them mid-session, re-runs the optimizer, and can leave the page
    // holding React from one pass and Radix from the next — which surfaces as
    // "Invalid hook call ... more than one copy of React". Pre-bundling them on
    // startup keeps the whole graph on a single optimizer pass.
    include: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Vitest loads .env.local like the dev server does, which would silently
    // point the suite at the real Supabase project the moment a developer
    // configures one. Blank these so unit tests always exercise the
    // deterministic local fallback and never touch the network.
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_ANON_KEY: "",
    },
  },
}));
