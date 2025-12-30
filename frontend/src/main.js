
import './assets/index.css'
import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import router from './router'
import ElementPlus from 'element-plus'
import App from './App.vue'

const app = createApp(App)

app.use(router)
app.use(ElementPlus)
const pinia = createPinia()
app.use(pinia)

// 初始化用户状态
import { useUserStore } from '@/stores/user'
const userStore = useUserStore(pinia)

// 异步初始化用户状态
const initializeApp = async () => {
    try {
        await userStore.initializeAuth()
    } catch (error) {
        console.warn('Failed to initialize auth:', error)
    }

    // 挂载应用
    app.mount('#app')
}

initializeApp()