import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

const isInsideDocker = fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';
const backendTarget =
  process.env.VITE_BACKEND_INTERNAL_URL ||
  (isInsideDocker ? 'http://backend:5001' : 'http://127.0.0.1:5001');

console.log(`[Vite Config] Proxy hedefi: ${backendTarget} (Docker ortamı: ${isInsideDocker})`);

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
    open: false,
    watch: {
      usePolling: true,
      interval: 100,
    },
    hmr: {
      clientPort: 3001,
    },
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (!res.headersSent && typeof (res as any).writeHead === 'function') {
              (res as any).writeHead(503, {
                'Content-Type': 'application/json',
                'Retry-After': '1',
              });
              (res as any).end(
                JSON.stringify({
                  status: 'reconnecting',
                  database: 'disk-storage',
                  message: 'Backend servisi yeniden başlatılıyor...',
                })
              );
            }
          });
        },
      },
    },
  },
});
