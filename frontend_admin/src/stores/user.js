import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter, useRoute } from 'vue-router'

export const useUserStore = defineStore('user', () => {
    const token = ref(localStorage.getItem(import.meta.env.VITE_APP_TOKEN) || null)
    const user = ref(null)
    const permission = ref(null)
    const router = useRouter()

    const loginIn = (newToken, newUser,newPermission) => {
        // 先保存原始 token 到 localStorage
        localStorage.setItem(import.meta.env.VITE_APP_TOKEN, newToken)
        // 设置带 Bearer 前缀的 token
        token.value = newToken
        user.value = newUser
        permission.value = newPermission
    }

    const loginOut = () => {
        token.value = null
        localStorage.removeItem(import.meta.env.VITE_APP_TOKEN)
        user.value = null
        router.push('/')
    }

    //是否已登录
    const isAuthenticated = computed(() => {
        return !!token.value && !!user.value
    })

    //是否是管理员（权限 >= 2）
    const isAdmin = computed(() => {
        return permission.value <= 2
    })

    //是否是超级管理员（权限为 1）
    const isSuperAdmin = computed(() => {
        return permission.value === 1
    })

    return {
        token,
        user,
        permission,
        loginIn,
        loginOut,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
    }
})
