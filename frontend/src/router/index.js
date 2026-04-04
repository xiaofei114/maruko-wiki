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
            component: () => import('../views/Start.vue'),
            children: [
                {
                    path: '',
                    name: 'home',
                    component: () => import('../views/Home.vue'),
                },
                {
                    path: '/photo-album',
                    name: 'photo-album',
                    component: () => import('../views/PhotoAlbum.vue'),
                },
                {
                    path: '/photo-album/:id',
                    name: 'photo-album-detail',
                    component: () => import('../views/PhotoAlbumDetail.vue'),
                },
                {
                    path: '/audio',
                    name: 'audio',
                    component: () => import('../views/Audio.vue'),
                },
                {
                    path: '/announcement',
                    name: 'announcement',
                    component: () => import('../views/Announcement.vue'),
                },
                {
                    path: '/plan-document',
                    name: 'plan-document',
                    component: () => import('../views/PlanDocument.vue'),
                },

                {
                    path: '/admin',
                    name: 'admin',
                    component: () => import('../views/Admin.vue'),
                },
                {
                    path: '/profile',
                    name: 'profile',
                    component: () => import('../views/Profile.vue'),
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
