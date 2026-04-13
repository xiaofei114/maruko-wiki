import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    // 开发服务器配置
    server: {
      port:5174,
      // 代理配置示例（根据需求可选）
      proxy: env.VITE_PROXY === 'true' ? {
        '/api': {
          target: 'http://localhost:6660', // 开发环境后端地址
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api/, '')
        }
      } : undefined
    },
    // 构建配置
    build: {
      // 生产环境注入的全局变量（通过.env.production文件定义更规范）
      rollupOptions: {
        external: [],
        output: {}
      }
    }
  }
})