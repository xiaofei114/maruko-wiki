import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建统一的 axios 实例
const http = axios.create({
    baseURL: import.meta.env.VITE_APP_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
http.interceptors.request.use(
    config => {
        // 添加JWT认证头（如果有token）
        const token = localStorage.getItem(import.meta.env.VITE_APP_TOKEN)
        if (token && config.url !== '/login') { // 登录接口不需要token
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 响应拦截器
http.interceptors.response.use(
    response => {
        // 直接返回数据部分，简化调用
        // 注意：304 Not Modified 浏览器会自动从缓存返回数据，axios 会正常处理
        return response.data
    },
    error => {
        // 认证错误时清除本地存储的token和用户信息
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem(import.meta.env.VITE_APP_TOKEN)
            localStorage.removeItem(import.meta.env.VITE_APP_USER)
        }

        // 可以在这里统一处理错误
        // 比如显示错误提示、处理认证失败等
        if (error.response) {
            // 服务器响应错误
            const { status, data } = error.response
            switch (status) {
                case 401:
                    // 未授权，可以跳转到登录页
                    ElMessage.error('未授权访问，请重新登录')
                    break
                case 403:
                    ElMessage.error('Token无效或权限不足，请重新登录')
                    break
                case 404:
                    ElMessage.error('请求地址不存在')
                    break
                case 500:
                    ElMessage.error('服务器内部错误')
                    break
                default:
                    // 对于其他错误，优先使用服务器返回的消息
                    const errorMessage = data?.message || `请求失败: ${status}`
                    ElMessage.error(errorMessage)
            }
        } else if (error.request) {
            // 网络错误
            ElMessage.error('网络错误，请检查网络连接')
        } else {
            // 其他错误
            ElMessage.error('请求配置错误，请稍后重试')
        }

        return Promise.reject(error)
    }
)

// 导出 axios 实例
export default http
