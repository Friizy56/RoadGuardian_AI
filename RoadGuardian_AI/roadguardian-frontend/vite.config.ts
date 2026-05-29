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
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../roadguardian-backend/static'),
    emptyOutDir: true,
    assetsDir: 'assets'
  }
}));
