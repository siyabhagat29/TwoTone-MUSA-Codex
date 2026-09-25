import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, ".");
  const rootDir = path.resolve(__dirname, "../..");
  const serverDir = path.resolve(__dirname, "../../server");

  const envWeb = loadEnv(mode, envDir, "");
  const envRoot = loadEnv(mode, rootDir, "");
  const envServer = loadEnv(mode, serverDir, "");

  const googleMapsKey =
    envWeb.VITE_GOOGLE_MAPS_API_KEY ||
    envRoot.VITE_GOOGLE_MAPS_API_KEY ||
    envServer.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    "";

  return {
    plugins: [react()],
    define: {
      ...(googleMapsKey
        ? { "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(googleMapsKey) }
        : {})
    },
    server: {
      proxy: {
        "/uploads": "http://localhost:5001"
      }
    }
  };
});
