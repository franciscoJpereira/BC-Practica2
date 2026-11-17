import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const eventsPolyfillPath = path.resolve(__dirname, 'src/polyfills/events.ts');

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      'node:buffer': 'buffer',
      events: eventsPolyfillPath,
      'node:events': eventsPolyfillPath,
    },
  },
  server: {
    port: 5173,
    open: false,
  },
});
