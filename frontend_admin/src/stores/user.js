import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'

// 从 JWT 中解析 userId，用于判断共享 token 是否切换了账号
export const getUserIdFromToken = (jwt) => {
    try {
        const payload = jwt.split('.')[1]
        if (!payload) return null
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const binary = atob(base64)
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
        return JSON.parse(new TextDecoder().decode(bytes)).userId ?? null
    } catch {
        return null
    }
}

export const useUserStore = defineStore('user', () => {
    const token = ref(localStorage.getItem(import.meta.env.VITE_APP_TOKEN) || null)
    const user = ref(null)
    const permission = ref(null)
    const router = useRouter()
    let currentUserId = getUserIdFromToken(token.value)

    const loginIn = (newToken, newUser, newPermission, newAvatar) => {
        currentUserId = getUserIdFromToken(newToken)
        // 同源共享登录态：token 和用户信息都写回 localStorage，主站可直接复用
        localStorage.setItem(import.meta.env.VITE_APP_TOKEN, newToken)
        localStorage.setItem(import.meta.env.VITE_APP_USER, JSON.stringify({
            name: newUser,
            permission: newPermission,
            avatar: newAvatar
        }))
        token.value = newToken
        user.value = newUser
        permission.value = newPermission
    }

    const loginOut = () => {
        token.value = null
        currentUserId = null
        // 共享会话：退出后台时一并清理主站的 token 和用户信息
        localStorage.removeItem(import.meta.env.VITE_APP_TOKEN)
        localStorage.removeItem(import.meta.env.VITE_APP_USER)
        user.value = null
        permission.value = null
        router.push('/')
    }

    // 仅清理后台会话，保留同源共享的 token
    // 用于普通用户误入后台时，避免把主站的登录态一起清掉
    const clearSession = () => {
        user.value = null
        permission.value = null
    }

    // 同源共享会话：其他标签页登录/退出时同步后台状态
    window.addEventListener('storage', (event) => {
        if (event.key !== import.meta.env.VITE_APP_TOKEN) return

        // 主站退出登录：后台同步失效
        if (!event.newValue) {
            currentUserId = null
            token.value = null
            user.value = null
            permission.value = null
            if (router.currentRoute.value.meta.needLogin) router.push('/')
            return
        }

        // 主站刷新 token 且仍是同一账号时，只同步 token，不打断后台操作
        const incomingUserId = getUserIdFromToken(event.newValue)
        token.value = event.newValue
        if (incomingUserId !== null && incomingUserId === currentUserId) return

        // 切换了账号：清掉后台身份，交给登录页用新 token 重新校验
        currentUserId = incomingUserId
        user.value = null
        permission.value = null
        if (router.currentRoute.value.meta.needLogin) router.push('/')
    })

    //是否已登录
    const isAuthenticated = computed(() => {
        return !!token.value && !!user.value
    })

    //是否是管理员（权限 <= 2）
    const isAdmin = computed(() => {
        return permission.value !== null && permission.value <= 2
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
        clearSession,
        isAuthenticated,
        isAdmin,
        isSuperAdmin,
    }
})
