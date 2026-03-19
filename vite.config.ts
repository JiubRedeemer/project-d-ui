/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    vue(),
    legacy(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      devOptions: {
        enabled: true,
      },
      workbox: {
        /**
         * When offline (or network is down), serve cached API responses so the UI can
         * render the last data that was successfully loaded.
         *
         * Note: these routes are based on `url.pathname`, so they work even if your API
         * is on another host/port (e.g. :8080) as long as it uses paths like `/api/**`.
         */
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            method: 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                // Keep a bounded amount of last-seen API responses.
                maxEntries: 200,
                maxAgeSeconds: 24 * 60 * 60, // 1 day
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Images/files (avatars, items, etc.) are usually GET downloads.
            urlPattern: ({ url }) => url.pathname.startsWith('/files/'),
            method: 'GET',
            handler: 'CacheFirst',
            options: {
              cacheName: 'files-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      includeAssets: [
        'favicon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-512x512-maskable.png',
      ],
      manifest: {
        name: 'ProjectD',
        short_name: 'ProjectD',
        description: 'Dnd app',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts']
  }
})
