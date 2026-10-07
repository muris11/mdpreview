import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/katex')) return 'katex'
          if (id.includes('node_modules/highlight.js')) return 'highlight'
          if (id.includes('node_modules/@codemirror') || id.includes('node_modules/@uiw'))
            return 'editor'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
})
