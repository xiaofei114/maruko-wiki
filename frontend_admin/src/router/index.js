import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user.js'
import { api_Login } from '@/api/login.js'
import { ElMessage } from 'element-plus'

const originalReplaceState = window.history.replaceState

window.history.replaceState = function () {
  originalReplaceState.call(this, null, '', '')
}

//菜单栏路由
const sidebar = [
  {
    path: 'things',
    name: 'things',
    component: () => import('../components/Home/index.vue'),
    meta: { needLogin: true, cnname: "主页", }
  },
  {
    path: 'album',
    name: 'album',
    component: () => import('../components/Content/Album/index.vue'),
    meta: { needLogin: true, name: "相册管理", cnname: "相册管理", }
  },
  {
    path: 'audio',
    name: 'audio',
    component: () => import('../components/Content/Audio/index.vue'),
    meta: { needLogin: true, name: "音声管理", cnname: "音声管理", }
  },
  {
    path: 'captain-gift',
    name: 'captain-gift',
    component: () => import('../components/Content/CaptainGift/index.vue'),
    meta: { needLogin: true, name: "舰礼管理", cnname: "舰礼管理", }
  },
  {
    path: 'user',
    name: 'user',
    component: () => import('../components/System/User/index.vue'),
    meta: { needLogin: true, name: "用户管理", cnname: "用户管理", }
  },
  {
    path: 'dictionary',
    name: 'dictionary',
    component: () => import('../components/System/Dictionary/index.vue'),
    meta: { needLogin: true, name: "字典管理", cnname: "字典管理", }
  },
  {
    path: 'logs',
    name: 'logs',
    component: () => import('../components/System/logs/index.vue'),
    meta: { needLogin: true, name: "运行日志", cnname: "运行日志", }
  },
  {
    path: 'redis-admin',
    name: 'redis-admin',
    component: () => import('../components/System/RedisAdmin/index.vue'),
    meta: { needLogin: true, name: "Redis管理", cnname: "Redis管理", needSuperAdmin: true }
  }
]

//子页面路由
const subpage = [
  {
    path: 'typeitem/:dict_type',
    name: 'typeitem',
    component: () => import('../components/System/Dictionary/typeitem.vue'),
    meta: {
      needLogin: true,
      name: "字典项管理",
      father: {
        path: '/home/dictionary',
        name: '字典管理'
      }
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('../views/Login.vue'),
      meta: { needLogin: false }
    },
    {
      path: '/home',
      name: 'home',
      redirect: '/home/things',
      component: () => import('../views/Home.vue'),
      meta: { needLogin: true },
      children: [...sidebar, ...subpage]
    },
    {
      path: '/:catchAll(.*)',
      name: "404",
      component: () => import('../views/Error.vue'),
      meta: { needLogin: true }
    }
  ],
})

// 全局前置守卫，检查登录状态
router.beforeEach((to, from, next) => {
  // 获取用户 store
  const userStore = useUserStore()
  const { token } = userStore

  // 检查路由是否需要登录
  if (to.meta.needLogin) {
    // 检查用户是否已登录且是管理员
    if (userStore.isAuthenticated && userStore.isAdmin) {
      // 已登录且是管理员，允许访问
      next()
    } else if (userStore.isAuthenticated && !userStore.isAdmin) {
      // 已登录但不是管理员
      ElMessage.warning('无管理权限，仅管理员可登录')
      userStore.loginOut()
      next({ name: 'login' })
    } else {
      // 未登录，先尝试登录
      if (token) {
        api_Login({ token }).then(res => {
          if (res.data?.token) {
            // 检查是否为管理员
            if (res.data.permission <= 2) {
              userStore.loginIn(res.data.token, res.data.name, res.data.permission)
              next()
            } else {
              ElMessage.warning('无管理权限，仅管理员可登录')
              userStore.loginOut()
              next({ name: 'login' })
            }
          } else {
            ElMessage.warning('请先登录')
            next({ name: 'login' })
          }
        })
      } else {
        ElMessage.warning('请先登录')
        next({ name: 'login' })
      }
    }
  } else {
    // 不需要登录的页面，直接访问
    next()
  }
})

export default router
