import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { env } from 'node:process';
import { tanstackRouter } from '@tanstack/router-plugin/vite';

const target = env.ASPNETCORE_URLS
  ? env.ASPNETCORE_URLS.split(';')[0]
  : 'http://localhost:5165';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      target: 'react',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    open: true,
    port: 5173,
    proxy: {
      '/health': {
        secure: false,
        target,
      },
      '/login': {
        secure: false,
        target,
      },
      '/signin-oidc': {
        secure: false,
        target,
      },
      '^/api': {
        secure: false,
        target,
      },
    },
  },
});
