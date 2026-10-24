import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      disable: process.env.KOTOBA_NATIVE === "1",
      registerType: "prompt",
      includeAssets: ["favicon.svg", "icon-192.png", "icon-512.png"],
      manifest: {
        id: "./",
        name: "ことばの島",
        short_name: "ことばの島",
        description: "假名、N4目标课程与介护日语，在小岛上每天进步一点",
        lang: "zh-CN",
        theme_color: "#285749",
        background_color: "#f7f8f2",
        display: "standalone",
        start_url: "./",
        scope: "./",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "index.html",
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { framework: ["react", "react-dom"], storage: ["dexie"] },
      },
    },
  },
});
