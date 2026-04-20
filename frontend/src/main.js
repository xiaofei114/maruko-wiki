
import 'element-plus/dist/index.css'
import './assets/index.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import router from './router'
import ElementPlus from 'element-plus'
import App from './App.vue'

// 引入 ECharts
import VueECharts from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'

// 注册 ECharts 组件
use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent])

const app = createApp(App)

// 注册 vue-echarts 组件
app.component('v-chart', VueECharts)

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