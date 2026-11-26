import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// "npm run build" erzeugt die installierbare Web-App (PWA) in dist/,
// "npm run build:single" eine einzelne HTML-Datei in dist-single/ (ohne Service Worker).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  define: { __SINGLE__: JSON.stringify(mode === 'single') },
  publicDir: mode === 'single' ? false : 'public',
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
  },
  server: {
    proxy: { '/api': 'http://localhost:8787' },
  },
  test: {
    environment: 'node',
  },
}));
