import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const alias = { '@': resolve(__dirname, 'src') }

export default defineConfig({
  main: {
    resolve: { alias },
    build: {
      rolldownOptions: {
        input: { main: resolve(__dirname, 'electron/main.ts') }
      }
    }
  },
  preload: {
    resolve: { alias },
    build: {
      rolldownOptions: {
        input: { preload: resolve(__dirname, 'electron/preload.ts') }
      }
    }
  },
  renderer: {
    root: '.',
    resolve: { alias },
    plugins: [react()],
    build: {
      rolldownOptions: {
        input: resolve(__dirname, 'index.html')
      }
    }
  }
})
