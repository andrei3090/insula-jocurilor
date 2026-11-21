/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  base: '/insula-jocurilor/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon.svg', 'icons/*.png'],
      manifest: {
        name: 'Insula Jocurilor',
        short_name: 'Insula',
        description: 'Jocuri educative pentru copii de 4–10 ani, cu creion și voce în română.',
        lang: 'ro',
        start_url: '/insula-jocurilor/',
        scope: '/insula-jocurilor/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#fffaf2',
        theme_color: '#4cc9c0',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,m4a,json}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // the parent app has its own page; never answer its navigations with the child app
        navigateFallbackDenylist: [/\/parinti\//],
      },
    }),
  ],
  build: {
    rollupOptions: {
      input: { main: 'index.html', parinti: 'parinti/index.html' },
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tools/**/*.test.{ts,mjs}'],
  },
});
