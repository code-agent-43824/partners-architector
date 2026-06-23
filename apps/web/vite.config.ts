import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// SPA dev server. /api is proxied to the NestJS API so the browser talks to a
// single origin (cookies + CSRF work without CORS); the production reverse
// proxy routes /api the same way.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
