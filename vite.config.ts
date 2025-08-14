import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url' // Import fileURLToPath

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      "/api": "http://localhost:3002",
    },
    // Povolit všechny hosty pro fungování s tunely jako localtunnel/ngrok
    allowedHosts: ['*'],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"), 
    },
  },
  build: {
    outDir: 'build',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
  },
})
