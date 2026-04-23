import { createRouter, createWebHistory } from 'vue-router'
// import { useUserStore } from '@/stores/user.js'
// import { api_Login } from '@/api/index.js'
// import { ElMessage } from 'element-plus'

window.history.replaceState = () => { return }

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            name: 'login',
            component: () => import('../views/Login.vue'),
        },
        {
            path: '/',
            component: () => import('../views/Home.vue'),
            children: [
                {
                    path: '',
                    name: 'home',
                    component: () => import('../components/Home/index.vue'),
                    meta: { title: '首页' }
                },
                {
                    path: '/photo-album',
                    name: 'photo-album',
                    component: () => import('../components/PhotoAlbum/index.vue'),
                    meta: { title: '相簿' }
                },
                {
                    path: '/photo-album/:id',
                    name: 'photo-album-detail',
                    component: () => import('../components/PhotoAlbum/detail.vue'),
                    meta: { title: '相簿' }
                },
                {
                    path: '/audio',
                    name: 'audio',
                    component: () => import('../components/Audio/index.vue'),
                    meta: { title: '音声' }
                },
                {
                    path: '/announcement',
                    name: 'announcement',
                    component: () => import('../components/Announcement/index.vue'),
                    meta: { title: '公告' }
                },
                {
                    path: '/plan-document',
                    name: 'plan-document',
                    component: () => import('../components/PlanDocument/index.vue'),
                    meta: { title: '企划' }
                },

                {
                    path: '/admin',
                    name: 'admin',
                    component: () => import('../components/Admin/index.vue'),
                    meta: { title: '管理' }
                },
                {
                    path: '/profile',
                    name: 'profile',
                    component: () => import('../components/User/Profile/index.vue'),
                    meta: { title: '个人中心' }
                },
            ]
        },
        {
            path: '/:catchAll(.*)',
            name: "404",
            component: () => import('../views/Error.vue'),
        }
    ],
})

router.beforeEach((to, from, next) => {
    if (to.meta.title) {
        document.title = `${import.meta.env.VITE_APP_TITLE} - ${to.meta.title}`
    } else {
        document.title = `${import.meta.env.VITE_APP_TITLE}`
    }
    next()
})

export default router
