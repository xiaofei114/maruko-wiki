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
        // 业务逻辑错误处理（success === false）
        const data = response.data
        if (data?.success === false && response.config?.alertError !== false) {
            const msg = data?.message || '操作失败'
            ElMessage.warning({
                message: `错误${data?.code ? ':' + data.code : ''}${msg}`,
                grouping: true,
                duration: 3000
            })
        }
        return data
    },
    error => {
        let errorMessage = ''
        let errorCode = 'NETWORK_ERROR'

        // 认证错误时清除本地存储的token和用户信息
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            localStorage.removeItem(import.meta.env.VITE_APP_TOKEN)
            localStorage.removeItem(import.meta.env.VITE_APP_USER)

            // 触发登录失效事件，通知应用跳转
            window.dispatchEvent(new CustomEvent('auth:logout', {
                detail: { reason: 'token_expired' }
            }))
        }

        if (error.response) {
            // 服务器响应错误
            const { status, data } = error.response
            errorCode = status
            errorMessage = data?.message || `请求失败（状态码: ${status}）`

            switch (status) {
                case 401:
                    errorMessage = data?.message ?? '登录已过期，请重新登录'
                    break
                case 403:
                    errorMessage = '没有操作权限，请联系管理员'
                    break
                case 404:
                    errorMessage = `请求资源不存在: ${error.config?.url || ''}`
                    break
                case 500:
                    errorMessage = '服务器内部错误，请联系技术支持'
                    break
            }
        } else if (error.request) {
            // 网络错误
            errorMessage = '网络错误，请检查网络连接'
        } else {
            // 其他错误
            errorMessage = '请求配置错误，请稍后重试'
        }

        // 显示错误提示（配置可选）
        if (error.config?.alertError !== false) {
            ElMessage.error({
                message: errorMessage,
                grouping: true,
                duration: 5000
            })
        }

        // 返回统一错误格式
        return Promise.reject({
            code: errorCode,
            message: errorMessage,
            data: error.response?.data,
            original: error
        })
    }
)

// 导出 axios 实例
export default http
