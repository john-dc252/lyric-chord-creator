import presetWind4 from '@unocss/preset-wind4';
import { fileRoutes } from 'filesystem-routing/vite';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vitest/config';
import solid from '@solidjs/vite-plugin';
import {VitePWA} from "vite-plugin-pwa";

export default defineConfig({
  base: '/apps/lyric-chord-creator/',
  // Turnkey client mode: no index.html and no mount file — the plugin
  // generates the entries around src/App.tsx, wrapped in src/Document.tsx
  // (or a built-in shell). `vite build` prerenders the shell into
  // dist/client/index.html and emits a purely static dist/client.
  plugins: [
    // `extensions` makes @solidjs/vite-plugin also compile the `?pick=` route
    // modules the fileRoutes plugin emits (their ids end in a query string).
    solid({ start: true, extensions: ['.jsx', '.tsx'], diagnostics: true }), // add `ssr: true` for streaming SSR
    fileRoutes({ types: true }),
    // Scans source files for class names and serves their CSS as the
    // virtual:uno.css module (imported by src/App.tsx). Config can grow
    // into uno.config.ts; the wind4 preset is Tailwind-compatible utilities.
    UnoCSS({ presets: [presetWind4()] }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['404.html', 'favicon.ico', 'favicon.svg', 'icon.svg'],
      scope: '/apps/lyric-chord-creator/',
      manifest: {
        name: 'Lyric-Chord Creator',
        short_name: 'Lyric-Chord',
        description: 'Offline-capable lyric-chord sheet creation utility',
        start_url: '/apps/lyric-chord-creator/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0284c7',
        icons: [
          {
            src: '/apps/lyric-chord-creator/icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/apps/lyric-chord-creator/favicon.ico',
            sizes: '48x48 32x32 16x16',
            type: 'image/x-icon'
          },
        ],
      },
      workbox: {
        globDirectory: 'dist/client/',
        // Caches all generated JS chunks including virtual route files
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],

        // Prevents the service worker from failing on larger route chunks
        maximumFileSizeToCacheInBytes: 3000000,
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/apps\/lyric-chord-creator/],
      },
    }),
  ],
  server: {
    port: 3000,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./vitest-setup.ts'],
    // if you have few tests, try commenting this
    // out to improve performance:
    isolate: false,
  },
  build: {
    target: 'esnext',
    // Keep images as asset files instead of inlining them into the JS bundle.
    assetsInlineLimit: 0,
  },
});
