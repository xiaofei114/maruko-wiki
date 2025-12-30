import axios from 'axios'
import { ElMessage } from 'element-plus'

// 创建统一的 axios 实例
const http = axios.create({
    baseURL: import.meta.env.VITE_APP_BILIBILI_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 请求拦截器
http.interceptors.request.use(
    config => {
        // 可以在这里添加统一的请求处理逻辑
        // 比如添加认证头、loading 状态等
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
        return response.data
    },
    error => {
        ElMessage.error('HTTP Error:', error)

        // 可以在这里统一处理错误
        // 比如显示错误提示、处理认证失败等
        if (error.response) {
            // 服务器响应错误
            const { status, data } = error.response
            switch (status) {
                case 401:
                    // 未授权，可以跳转到登录页
                    ElMessage.error('未授权访问')
                    break
                case 403:
                    ElMessage.error('访问被拒绝')
                    break
                case 404:
                    ElMessage.error('请求地址不存在')
                    break
                case 500:
                    ElMessage.error('服务器内部错误')
                    break
                default:
                    ElMessage.error(`请求失败: ${status}`)
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
