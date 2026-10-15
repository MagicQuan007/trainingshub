import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages liefert die Seite unter /trainingshub/ aus
export default defineConfig({
  base: "/trainingshub/",
  plugins: [react()],
});
