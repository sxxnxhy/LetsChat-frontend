import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    proxy: {
      '/api': {
        target: 'https://syoo.shop',
        // target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/websocket': {
        target: 'wss://syoo.shop',  // WebSocket server
        // target: 'ws://localhost:8080',  // WebSocket server
        ws: true,  // Enable WebSocket proxying
        changeOrigin: true,
      },
    },
  },
});