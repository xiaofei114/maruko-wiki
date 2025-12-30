import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // Suppress specific console warnings in development
  server: {
    hmr: {
      overlay: false
    }
  },
  // Optimize build warnings
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress common Element Plus passive event listener warnings
        if (warning.message.includes('passive') ||
            warning.message.includes('Violation')) {
          return;
        }
        warn(warning);
      }
    }
  }
})
