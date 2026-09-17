import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/static/',
  plugins: [react()],
  build: {
    outDir: 'app_dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'utils': ['dagre', 'react-window'],
        },
      },
    },
    target: 'ES2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
});