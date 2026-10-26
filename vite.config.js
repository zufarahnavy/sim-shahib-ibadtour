import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Dua halaman statis independen (index.html = landing, admin.html = panel admin),
// masing-masing React root sendiri — cocok untuk hosting statis seperti GitHub Pages
// tanpa perlu react-router / server-side routing.
export default defineConfig({
  plugins: [react()],
  base: "./", // path relatif, aman di-deploy ke subfolder repo mana pun di GitHub Pages
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        admin: resolve(__dirname, "admin.html")
      }
    }
  }
});
