import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // All backend calls go through `/api/*`; the FastAPI backend owns them
      // (D8). Overridable for compose/remote targets (F5).
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});
