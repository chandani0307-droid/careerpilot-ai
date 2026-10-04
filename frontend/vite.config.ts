import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: (import.meta.env.VITE_PROXY_TARGET as string) || "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    allowedHosts: ["careerpilot-ai-1-cvit.onrender.com", ".onrender.com"],
  },
});