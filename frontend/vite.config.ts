import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'build',  // Match CRA's output directory
  },
  // Expose REACT_APP_* variables for backward compatibility
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL),
  },
})

