import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as loginApi, refreshToken as refreshTokenApi } from '@/api/auth'

// 本地存储的key
const TOKEN_KEY = import.meta.env.VITE_APP_TOKEN
const USER_KEY = import.meta.env.VITE_APP_USER

export const useUserStore = defineStore('user', () => {
    // 状态
    const token = ref(localStorage.getItem(TOKEN_KEY) || '')
    const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || 'null') || null)

    // 计算属性
    const permission = computed(() => user.value?.permission || '')
    const username = computed(() => user.value?.name || '')
    const isAuthenticated = computed(() => !!token.value && !!user.value)

    // 方法
    /**
     * 用户登录
     * @param {string} accountNumber - 账号
     * @param {string} password - 密码
     */
    const login = async (accountNumber, password) => {
        try {
            const response = await loginApi(accountNumber, password)

            // 尝试多种方式获取token
            let tokenValue = response.data.token
            let userData = {
                name: response.data.name,
                permission: response.data.permission,
                avatar: response.data.avatar
            }

            setToken(tokenValue)
            setUser(userData)

            // 同时保存到localStorage（确保数据同步）
            localStorage.setItem(TOKEN_KEY, token.value)
            localStorage.setItem(USER_KEY, JSON.stringify(user.value))

            return response.data
        } catch (error) {
            // 登录失败时清除状态
            logout()
            throw error
        }
    }

    /**
     * 刷新token
     */
    const refreshToken = async () => {
        if (!token.value) {
            throw new Error('没有可用的token')
        }

        try {
            const response = await refreshTokenApi(token.value)

            // 更新token
            setToken(response.data.token)

            return response
        } catch (error) {
            // token刷新失败，清除登录状态
            logout()
            throw error
        }
    }

    /**
     * 设置token
     * @param {string} tokenValue - 用户token
     */
    const setToken = (tokenValue) => {
        token.value = tokenValue
        if (tokenValue) {
            localStorage.setItem(TOKEN_KEY, tokenValue)
        } else {
            localStorage.removeItem(TOKEN_KEY)
        }
    }

    /**
     * 设置用户信息
     * @param {Object} userInfo - 用户信息
     */
    const setUser = (userInfo) => {
        user.value = userInfo
        if (userInfo) {
            localStorage.setItem(USER_KEY, JSON.stringify(userInfo))
        } else {
            localStorage.removeItem(USER_KEY)
        }
    }

    /**
     * 用户登出
     */
    const logout = () => {
        token.value = ''
        user.value = null

        // 清除本地存储
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
    }

    /**
     * 初始化用户状态（从本地存储恢复并刷新token）
     */
    const initializeAuth = async () => {
        const storedToken = localStorage.getItem(TOKEN_KEY)
        const storedUser = localStorage.getItem(USER_KEY)

        if (storedToken && storedUser) {
            // 恢复本地状态
            token.value = storedToken
            user.value = JSON.parse(storedUser)

            // 尝试刷新token以确保有效性
            try {
                await refreshToken()
            } catch (error) {
                // token刷新失败，清除登录状态
                console.warn('token刷新失败:', error)
                logout()
            }
        }
    }

    return {
        // 状态
        token,
        user,

        // 计算属性
        permission,
        username,
        isAuthenticated,

        // 方法
        login,
        refreshToken,
        setToken,
        setUser,
        logout,
        initializeAuth
    }
})
