import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Proxy al gateway para evitar CORS en desarrollo local
    proxy: {
      '/v1': 'http://localhost:8080',
    },
  },
});
