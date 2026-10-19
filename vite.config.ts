import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, type Plugin } from 'vite'
import { handleUpload } from './api/upload.ts'

/**
 * Serves the same `/api/upload` endpoint locally that Vercel runs in
 * production, so pasting images behaves identically on `npm run dev`,
 * `npm run preview` and the deployed site.
 */
function uploadApi(): Plugin {
  const handle = (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== 'POST') {
      response.statusCode = 405
      response.setHeader('Content-Type', 'application/json')
      response.end('{"error":"Method not allowed"}')
      return
    }

    let raw = ''
    request.on('data', (chunk: Buffer) => {
      raw += chunk.toString()
    })
    request.on('error', () => {
      response.statusCode = 400
      response.end('{"error":"Bad request"}')
    })
    request.on('end', () => {
      let body: unknown
      try {
        body = JSON.parse(raw)
      } catch {
        body = undefined
      }
      void handleUpload(body).then(({ status, payload }) => {
        response.statusCode = status
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(payload))
      })
    })
  }

  return {
    name: 'mdpreview:upload-api',
    configureServer(server) {
      server.middlewares.use('/api/upload', handle)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/upload', handle)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), uploadApi()],
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
