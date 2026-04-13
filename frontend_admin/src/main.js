import './assets/index.css'
import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import router from './router'
import ElementPlus from 'element-plus'
import JsonViewer from 'vue-json-viewer'
import { createPinia } from 'pinia'

import App from './App.vue'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import dictionary from "@/components/componentStyle/dictionary.vue"

const app = createApp(App)

app.use(router)
app.use(ElementPlus)
app.use(JsonViewer)
app.use(createPinia())

for (const [key, component] of Object.entries(ElementPlusIconsVue)) app.component(key, component)
app.component('dict-tag', dictionary) //全局注册组件


app.mount('#app')
