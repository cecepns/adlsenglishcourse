import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [react(), VitePWA({
    registerType: "autoUpdate",
    manifest: { name: "ADLS English Course", short_name: "ADLS", theme_color: "#2a5885", background_color: "#ffffff", display: "standalone",
      icons: [{ src: "pwa-192.png", sizes: "192x192", type: "image/png" }, { src: "pwa-512.png", sizes: "512x512", type: "image/png" }] },
  })],
});
