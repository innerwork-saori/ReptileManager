import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string }

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // 放在系統暫存目錄，避免 Dropbox 同步鎖檔造成 EBUSY
  cacheDir: path.join(os.tmpdir(), 'reptile-manager-vite'),
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,woff2}'],
      },
      includeAssets: ['icon-192-v20260927.png', 'icon-512-v20260927.png', 'icon-maskable-512-v20260927.png', 'apple-touch-icon-180-v20260927.png'],
      manifest: {
        name: 'ReptileManager',
        short_name: 'ReptileManager',
        description: '爬蟲日常管理工具',
        theme_color: '#f7f4ef',
        background_color: '#f7f4ef',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'icon-192-v20260927.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512-v20260927.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            // Logo shrunk into Android's 80% safe zone so circle/squircle masks don't clip it
            src: 'icon-maskable-512-v20260927.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
