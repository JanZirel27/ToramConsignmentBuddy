import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Toram Online Consignment Buddy',
        short_name: 'Consignment Buddy',
        description: 'Calculate optimal consignment prices for Toram Online with today\'s tax rates',
        theme_color: '#1a2344',
        background_color: '#1a2344',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'app-icon.jpg',
            sizes: '192x192',
            type: 'image/jpeg'
          },
          {
            src: 'app-icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg'
          },
          {
            src: 'app-icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}']
      }
    })
  ],
})
