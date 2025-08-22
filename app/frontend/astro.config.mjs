import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import dotenv from "dotenv";

dotenv.config();

const API_URL = process.env.PUBLIC_API_URL;

console.log('API_URL configured:', API_URL);

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
            server: {
      proxy: {
        '/api': {
          target: API_URL,
          changeOrigin: true
        }
      }
    }
  },
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp"
    }
  },
  integrations: [react()],
});
