import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Gemeinsame Komponenten liegen im Web-Projekt unter ../src
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "../src") },
    // Pakete immer aus mobile/node_modules laden, auch für Dateien aus ../src
    dedupe: ["react", "react-dom", "lucide-react"],
  },
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", emptyOutDir: true },
});
