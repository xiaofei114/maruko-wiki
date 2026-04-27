import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user.js'

class HttpClient {
    constructor(timeout = 10000) {
        // 创建 axios 实例
        this.instance = axios.create({
            baseURL: this.formatBaseUrl(import.meta.env.VITE_API_BASE),
            timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        // 添加请求拦截器 - 每次请求时动态从 localStorage 获取最新的 token
        this.instance.interceptors.request.use(config => {
            const token = localStorage.getItem(import.meta.env.VITE_APP_TOKEN)
            if (token) {
                config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
            }
            return config
        })

        // 添加响应拦截器
        this.instance.interceptors.response.use(
            response => {
                // 成功响应处理
                if (response.data?.code !== 200 && response.config?.alertError !== false) {
                    const msg = response.data?.message || 'error'
                    ElMessage.warning({
                        message: `错误${response.data?.code}:${msg}`,
                        grouping: true,  // 合并相同内容提示
                        duration: 3000
                    })
                }
                return response.data
            },
            error => {
                // 错误处理
                let errorMessage = ''

                if (!error.response) {
                    // 网络层错误（无响应）
                    errorMessage = `网络连接异常: ${error.message || '请检查网络连接'}`
                } else {
                    // 服务器响应错误
                    const { status, data } = error.response
                    errorMessage = data?.message || `请求失败（状态码: ${status}）`

                    // 根据状态码分类处理
                    switch (status) {
                        case 401:
                            errorMessage = data?.message ?? '登录已过期，请重新登录'
                            // 清除 token 并触发页面刷新
                            const userStore = useUserStore()
                            userStore.loginOut()
                            break
                        case 403:
                            errorMessage = '没有操作权限，请联系管理员'
                            break
                        case 404:
                            errorMessage = `请求资源不存在: ${error.config.url}`
                            break
                        case 500:
                            errorMessage = '服务器内部错误，请联系技术支持'
                            break
                    }
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
                    code: error.response?.status || 'NETWORK_ERROR',
                    message: errorMessage,
                    data: error.response?.data,
                    original: error
                })
            }
        )
    }

    // 格式化基础地址（处理结尾斜杠）
    formatBaseUrl(url) {
        return url.endsWith('/') ? url.slice(0, -1) : url
    }

    // 通用请求方法
    request(method, url, data = {}, config = {}) {
        const requestConfig = {
            method: method.toLowerCase(),
            url,
            ...config
        }

        // 根据请求类型分配参数位置
        if (['get', 'head'].includes(method)) {
            requestConfig.params = data
        } else if (method === 'delete') {
            // delete 请求支持 params 或 data
            if (config.data) {
                requestConfig.data = config.data
            } else {
                requestConfig.params = data
            }
        } else {
            requestConfig.data = data
        }

        return this.instance(requestConfig)
    }

    // 快捷方法
    get(url, params = {}, config) {
        return this.request('get', url, params, config)
    }

    post(url, data = {}, config) {
        return this.request('post', url, data, config)
    }

    put(url, data = {}, config) {
        return this.request('put', url, data, config)
    }

    delete(url, params = {}, config) {
        return this.request('delete', url, params, config)
    }

    // 文件上传专用方法
    upload(url, file, formDataKey = 'file', extraData = {}) {
        const formData = new FormData()
        formData.append(formDataKey, file)
        Object.entries(extraData).forEach(([key, value]) => {
            formData.append(key, value)
        })

        return this.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        })
    }
}

const Client = new HttpClient()

export const api_Get = (url, data) => Client.get(`/api/get/${url}`, data)
export const api_Post = (url, data) => Client.post(`/api/post/${url}`, data)
export { Client }