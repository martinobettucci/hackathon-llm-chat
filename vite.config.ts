import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // When the app is served from a sub-path (e.g. behind a reverse proxy),
  // Vite needs to know the base path so that it can prefix asset URLs
  // correctly. The base path can be configured through the BASE_PATH
  // environment variable. When not provided, it falls back to '/'.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
