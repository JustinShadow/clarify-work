import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared/src')
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules']
  },
  build: {
    rollupOptions: {
      external: ['@tauri-apps/api/core']
    }
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:3001'
    },
    fs: {
      allow: ['..']
    }
  }
})