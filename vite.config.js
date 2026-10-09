import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // three.js (the 3D views) is ~0.9 MB and loads lazily, only when a 3D view opens.
  build: { chunkSizeWarningLimit: 1000 },
})
