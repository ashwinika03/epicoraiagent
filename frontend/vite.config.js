import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
  plugins: [react()],
  // Read .env / .env.production from the monorepo root (one level up)
  // instead of Vite's default (this frontend/ folder), so the single
  // root .env file also supplies VITE_API_BASE_URL at build time.
  envDir: path.resolve(__dirname, '..'),
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
