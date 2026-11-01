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
          } else if (req.url === '/users/dashboard' || req.url === '/users/dashboard/' || req.url === '/frontend/users/dashboard' || req.url === '/frontend/users/dashboard/') {
            req.url = '/frontend/users/dashboard/index.html'
          } else if (req.url === '/users/habwa' || req.url === '/users/habwa/' || req.url === '/frontend/users/habwa' || req.url === '/frontend/users/habwa/') {
            req.url = '/frontend/users/habwa/index.html'
          } else if (req.url === '/users/bills' || req.url === '/users/bills/' || req.url === '/frontend/users/bills' || req.url === '/frontend/users/bills/') {
            req.url = '/frontend/users/bills/index.html'
          } else if (req.url === '/users/requests' || req.url === '/users/requests/' || req.url === '/frontend/users/requests' || req.url === '/frontend/users/requests/') {
            req.url = '/frontend/users/requests/index.html'
          } else if (req.url === '/users/exports' || req.url === '/users/exports/' || req.url === '/frontend/users/exports' || req.url === '/frontend/users/exports/') {
            req.url = '/frontend/users/exports/index.html'
          } else if (req.url === '/users/notifications' || req.url === '/users/notifications/' || req.url === '/frontend/users/notifications' || req.url === '/frontend/users/notifications/') {
            req.url = '/frontend/users/notifications/index.html'
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
        users_dashboard: resolve(import.meta.dirname, 'frontend/users/dashboard/index.html'),
        users_habwa: resolve(import.meta.dirname, 'frontend/users/habwa/index.html'),
        users_bills: resolve(import.meta.dirname, 'frontend/users/bills/index.html'),
        users_requests: resolve(import.meta.dirname, 'frontend/users/requests/index.html'),
        users_exports: resolve(import.meta.dirname, 'frontend/users/exports/index.html'),
        users_notifications: resolve(import.meta.dirname, 'frontend/users/notifications/index.html'),
      },
    },
  },
})
