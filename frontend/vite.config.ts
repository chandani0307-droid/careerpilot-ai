import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "https://careerpilot-ai-nmtu.onrender.com",
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: ["careerpilot-ai-1-cvit.onrender.com", ".onrender.com"],
    proxy: {
      "/api": {
        target: process.env.VITE_PROXY_TARGET || "https://careerpilot-ai-nmtu.onrender.com",
        changeOrigin: true,
      },
    },
  },
});