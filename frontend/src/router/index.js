import { createRouter, createWebHistory } from 'vue-router'

window.history.replaceState = () => { return }

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/Login.vue'),
            meta: { public: true }
        },
        {
            path: '/',
            component: () => import('../views/Home.vue'),
            children: [
                {
                    path: '',
                    name: 'home',
                    component: () => import('../components/Home/index.vue'),
                    meta: { title: '首页', public: true }
                },
                {
                    path: '/photo-album',
                    name: 'photo-album',
                    component: () => import('../components/PhotoAlbum/index.vue'),
                    meta: { title: '相簿', public: true }
                },
                {
                    path: '/photo-album/:id',
                    name: 'photo-album-detail',
                    component: () => import('../components/PhotoAlbum/detail.vue'),
                    meta: { title: '相簿', public: true }
                },
                {
                    path: '/audio',
                    name: 'audio',
                    component: () => import('../components/Audio/index.vue'),
                    meta: { title: '音声', public: true }
                },
                {
                    path: '/announcement',
                    name: 'announcement',
                    component: () => import('../components/Announcement/index.vue'),
                    meta: { title: '公告', public: true }
                },
                {
                    path: '/plan-document',
                    name: 'plan-document',
                    component: () => import('../components/PlanDocument/index.vue'),
                    meta: { title: '企划', public: true }
                },
                {
                    path: '/admin',
                    name: 'admin',
                    component: () => import('../components/Admin/index.vue'),
                    meta: { title: '管理', requiresAuth: true }
                },
                {
                    path: '/profile',
                    name: 'profile',
                    component: () => import('../components/User/Profile/index.vue'),
                    meta: { title: '个人中心', requiresAuth: true }
                },
            ]
        },
        {
            path: '/:catchAll(.*)',
            name: "404",
            component: () => import('../views/Error.vue'),
            meta: { public: true }
        }
    ],
})

// 检查登录状态
function isAuthenticated() {
    const token = localStorage.getItem(import.meta.env.VITE_APP_TOKEN)
    const user = localStorage.getItem(import.meta.env.VITE_APP_USER)
    return !!(token && user)
}

router.beforeEach((to, from, next) => {
    // 设置页面标题
    if (to.meta.title) {
        document.title = `${import.meta.env.VITE_APP_TITLE} - ${to.meta.title}`
    } else {
        document.title = `${import.meta.env.VITE_APP_TITLE}`
    }

    // 检查是否需要登录
    if (to.meta.requiresAuth && !isAuthenticated()) {
        // 需要登录但未登录，重定向到首页
        next('/')
        return
    }

    next()
})

export default router
