import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" makes all built asset paths relative, so this works
// on GitHub Pages (project or user site) with zero extra config.
export default defineConfig({
  plugins: [react()],
  base: "./",
});
