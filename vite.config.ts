/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Пуст везде, кроме публикации: DEPLOY_BASE выставляет только job деплоя.
  base: process.env.DEPLOY_BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      // 'prompt', а не 'autoUpdate': тихая перезагрузка прервала бы урок.
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Карточки 汉字',
        short_name: '汉字',
        description: 'Карточки для заучивания китайских слов',
        lang: 'ru',
        display: 'standalone',
        background_color: '#0a092d',
        theme_color: '#0a092d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Без этого service worker берёт страницу под контроль только со
        // следующей навигации: открыл приложение впервые, потерял сеть —
        // и офлайна нет. Обновления это не затрагивает, ими управляет
        // skipWaiting, который в режиме 'prompt' ждёт кнопки «Обновить».
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
