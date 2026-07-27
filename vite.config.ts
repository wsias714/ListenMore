import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves project sites from a /<repo>/ subpath, not the
// domain root, so asset and manifest URLs need that prefix baked in for
// that target. Any other host (Vercel, Netlify, a custom domain) serves
// from the root, so this only changes when DEPLOY_TARGET=gh-pages is set
// (done by .github/workflows/deploy-pages.yml).
const base = process.env.DEPLOY_TARGET === 'gh-pages' ? '/ListenMore/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-32.png', 'icons/icon-16.png'],
      manifest: {
        name: 'Listening Log',
        short_name: 'Listening Log',
        description: 'An audiobook retention & reflection log — capture, apply, and resurface what you listen to.',
        theme_color: '#10151C',
        background_color: '#10151C',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: `${base}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Google Fonts are fetched at runtime; cache them so the app still
        // looks right (and loads) offline or on a flaky connection.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
})
