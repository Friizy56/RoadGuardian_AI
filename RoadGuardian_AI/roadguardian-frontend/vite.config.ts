import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ command }) => ({
  // Use root base during dev server, and /static/ when building for backend
  base: command === 'serve' ? '/' : '/static/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'RoadGuardian AI - Road Safety Platform',
        short_name: 'RoadGuardian',
        description: 'AI-powered road safety platform',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/static/index.html',
        icons: [
          {
            src: 'icons/icon-72.png',
            sizes: '72x72',
            type: 'image/png'
          },
          {
            src: 'icons/report.png',
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/hazards/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
  },
  build: {
    outDir: path.resolve(__dirname, '../roadguardian-backend/static'),
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (
            id.includes('react') ||
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('@tanstack/react-query') ||
            id.includes('zustand') ||
            id.includes('react-hot-toast')
          ) {
            return 'vendor-react';
          }

          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }

          if (id.includes('maplibre-gl')) {
            return 'vendor-map';
          }

          if (id.includes('recharts')) {
            return 'vendor-charts';
          }

          if (id.includes('axios') || id.includes('@supabase')) {
            return 'vendor-data';
          }

          return undefined;
        }
      }
    }
  }
}));
