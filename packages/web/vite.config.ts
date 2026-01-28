// https://vite.dev/config/
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Load env from monorepo root
  const rootEnv = loadEnv(mode, path.resolve(__dirname, '../..'), '')

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(rootEnv.VITE_API_URL),
    },
  }
})
