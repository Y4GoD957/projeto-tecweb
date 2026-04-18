import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        login: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard/index.html'),
        trader: resolve(__dirname, 'trader/index.html'),
      },
    },
  },
})
