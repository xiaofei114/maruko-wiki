import { createRouter, createWebHistory } from 'vue-router'
// import { useUserStore } from '@/stores/user.js'
// import { api_Login } from '@/api/index.js'
// import { ElMessage } from 'element-plus'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/',
            name: 'home',
            component: () => import('../views/Home.vue'),
            //   meta: { needLogin: false }
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
            path: '/login',
            name: 'login',
            component: () => import('../views/Login.vue'),
        },
        {
            path: '/download',
            name: 'download',
            component: () => import('../views/Download.vue'),
        },
        {
            path: '/admin',
            name: 'admin',
            component: () => import('../views/Admin.vue'),
        },
        {
            path: '/:catchAll(.*)',
            name: "404",
            component: () => import('../views/Error.vue'),
            //   meta: { needLogin: true }
        }
    ],
})

export default router