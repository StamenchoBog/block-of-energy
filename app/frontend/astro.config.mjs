import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import dotenv from "dotenv";

dotenv.config();

const API_URL = process.env.PUBLIC_API_URL;

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
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            charts: ['chart.js', 'react-chartjs-2'],
            utils: ['date-fns', 'lodash']
          }
        },
        external: [],
        treeshake: 'smallest'
      },
      minify: 'esbuild',
      sourcemap: false,
      target: 'es2020'
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'chart.js', 'react-chartjs-2'],
      exclude: ['@astrojs/react/']
    }
  },
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp"
    },
    domains: ['localhost'],
    format: ['webp', 'avif', 'jpg'],
    quality: 80
  },
  integrations: [react()],
  output: 'static',
  trailingSlash: 'never',
  compress: true
});
