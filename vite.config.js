import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: 'html-clean-urls',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/dashboard' || req.url === '/dashboard/') {
            req.url = '/frontend/pages/dashboard/index.html'
          } else if (req.url === '/exports' || req.url === '/exports/') {
            req.url = '/frontend/pages/exports/index.html'
          } else if (req.url === '/habwa' || req.url === '/habwa/') {
            req.url = '/frontend/pages/habwa/index.html'
          } else if (req.url === '/frontend/pages/dashboard/' || req.url === '/frontend/pages/dashboard/') {
            req.url = '/frontend/pages/dashboard/index.html'
          } else if (req.url === '/frontend/pages/exports' || req.url === '/frontend/pages/exports/') {
            req.url = '/frontend/pages/exports/index.html'
          } else if (req.url === '/frontend/pages/habwa' || req.url === '/frontend/pages/habwa/') {
            req.url = '/frontend/pages/habwa/index.html'
          } else if (req.url === '/bills' || req.url === '/bills/' || req.url === '/frontend/pages/bills' || req.url === '/frontend/pages/bills/') {
            req.url = '/frontend/pages/bills/index.html'
          } else if (req.url === '/requests' || req.url === '/requests/' || req.url === '/frontend/pages/requests' || req.url === '/frontend/pages/requests/') {
            req.url = '/frontend/pages/requests/index.html'
          } else if (req.url === '/owners' || req.url === '/owners/' || req.url === '/frontend/pages/owners' || req.url === '/frontend/pages/owners/') {
            req.url = '/frontend/pages/owners/index.html'
          }
          next()
        })
      },
    },
  ],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        dashboard: resolve(import.meta.dirname, 'frontend/pages/dashboard/index.html'),
        exports: resolve(import.meta.dirname, 'frontend/pages/exports/index.html'),
        habwa: resolve(import.meta.dirname, 'frontend/pages/habwa/index.html'),
        bills: resolve(import.meta.dirname, 'frontend/pages/bills/index.html'),
        requests: resolve(import.meta.dirname, 'frontend/pages/requests/index.html'),
        owners: resolve(import.meta.dirname, 'frontend/pages/owners/index.html'),
      },
    },
  },
})
