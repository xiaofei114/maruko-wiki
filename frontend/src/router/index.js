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
                },
                {
                    path: '/photo-album',
                    name: 'photo-album',
                    component: () => import('../components/PhotoAlbum/index.vue'),
                },
                {
                    path: '/photo-album/:id',
                    name: 'photo-album-detail',
                    component: () => import('../components/PhotoAlbum/detail.vue'),
                },
                {
                    path: '/audio',
                    name: 'audio',
                    component: () => import('../components/Audio/index.vue'),
                },
                {
                    path: '/announcement',
                    name: 'announcement',
                    component: () => import('../components/Announcement/index.vue'),
                },
                {
                    path: '/plan-document',
                    name: 'plan-document',
                    component: () => import('../components/PlanDocument/index.vue'),
                },

                {
                    path: '/admin',
                    name: 'admin',
                    component: () => import('../components/Admin/index.vue'),
                },
                {
                    path: '/profile',
                    name: 'profile',
                    component: () => import('../components/User/Profile/index.vue'),
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

export default router
