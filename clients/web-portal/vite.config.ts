import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Target del gateway: localhost en host, nombre de servicio dentro de docker-compose.
const gatewayTarget = process.env.VITE_GATEWAY_URL ?? 'http://localhost:8101';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Proxy al gateway para evitar CORS en desarrollo local
    proxy: {
      '/v1': gatewayTarget,
    },
  },
});
