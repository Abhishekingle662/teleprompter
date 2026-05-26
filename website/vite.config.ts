import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Deployed on Vercel at the domain root, so the base is "/" (Vite's default).
export default defineConfig({
  base: "/",
  plugins: [react()],
});
