import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:6060'

  return {
    // Relative asset URLs so the static build embeds under /dashboard/ (or any subpath).
    // Routing stays on the hash (`#/overview`); do not switch to browser history.
    base: './',
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api/v1': {
          target: apiTarget,
          // Keep the browser Host. FerroMQ CSRF compares Origin/Referer host
          // to Host; changeOrigin would rewrite Host to the proxy target
          // (127.0.0.1:6060) and reject cookie session writes.
          changeOrigin: false,
        },
      },
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      proxy: {
        '/api/v1': {
          target: apiTarget,
          changeOrigin: false,
        },
      },
    },
  }
})
