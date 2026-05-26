import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://abhishekingle662.github.io/teleprompter/ — the base must
// match the repo name so asset URLs resolve. If a custom domain (CNAME) is added
// later, change this to "/".
export default defineConfig({
  base: "/teleprompter/",
  plugins: [react()],
});
