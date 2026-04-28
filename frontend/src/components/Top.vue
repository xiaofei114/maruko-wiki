<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessageBox, ElBadge } from 'element-plus'
import { Close, User, HomeFilled, Star, SwitchButton, Bell } from '@element-plus/icons-vue'
import img from '@/assets/猫玩伴.png'
import { getUnreadNotificationCount } from '@/api/userProfile'


// 响应式数据
const showDropdown = ref(false)
const showMobileMenu = ref(false)
const isSidebarClosing = ref(false)
const sidebarTimer = ref(null)
const unreadCount = ref(0)

const title = import.meta.env.VITE_APP_TITLE

// 获取未读消息数
const fetchUnreadCount = async () => {
  if (!isAuthenticated.value) return
  try {
    const res = await getUnreadNotificationCount()
    if (res.code === 200) {
      unreadCount.value = res.data.count || 0
    }
  } catch (error) {
    console.error('获取未读消息数失败:', error)
  }
}

// 定时刷新未读消息数
let unreadCountTimer = null
const startUnreadCountTimer = () => {
  fetchUnreadCount()
  unreadCountTimer = setInterval(fetchUnreadCount, 60000) // 每分钟刷新一次
}
const stopUnreadCountTimer = () => {
  if (unreadCountTimer) {
    clearInterval(unreadCountTimer)
    unreadCountTimer = null
  }
}

// 点击外部关闭下拉菜单
const handleClickOutside = (e) => {
  const userArea = document.querySelector('.user-area')
  if (showDropdown.value && userArea && !userArea.contains(e.target)) {
    showDropdown.value = false
  }
}

// 监听刷新未读消息数事件
const handleRefreshUnreadCount = (e) => {
  unreadCount.value = e.detail || 0
}

// 链接到生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('refresh-unread-count', handleRefreshUnreadCount)
  startUnreadCountTimer()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('refresh-unread-count', handleRefreshUnreadCount)
  cleanupTimer()
  stopUnreadCountTimer()
})

// 友情链接数据
const friendlyLinks = [
  { name: '梨按钮', url: 'https://www.shanerubian.online/' },
  { name: '虎按钮', url: 'https://zhaoshihu.shanerubian.online/' },
  { name: '羽毛球按钮', url: 'https://xinggongyun.shanerubian.online/' },
  { name: '虾按钮', url: 'https://xia.shanerubian.online/' },
  { name: '龟按钮', url: 'https://kami.shanerubian.online/' },
  { name: '浣熊按钮', url: 'https://huanxiong.shanerubian.online/' },
  { name: '埋按钮', url: 'https://maibutton.yangdujun.top/' },
  { name: '黛棠OI-WIKI', url: 'https://daitangoi.asia/' },
  { name: '煲按钮', url: 'https://wangbaobao.moe/' },
]

// 计算属性
const router = useRouter()
const userStore = useUserStore()

// 使用storeToRefs确保响应性
const { token, user, isAuthenticated } = storeToRefs(userStore)

// 用户状态的计算属性
const username = computed(() => user.value?.name || '')
const permission = computed(() => user.value?.permission || '')

// 构建文件URL（根据环境添加/api前缀）
const baseUrl = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : (import.meta.env.VITE_APP_BASE_URL?.replace(/\/api\/?$/, '') || '')
const apiPrefix = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : '/api'
function buildFileUrl(path) {
  if (!path) return img
  // 完整http URL直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // 如果路径已经以/api开头，不再添加前缀
  if (path.startsWith('/api/')) return `${baseUrl}${path}`
  // 头像路径需要加上 /file/ 前缀
  if (path.startsWith('avatar/')) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrl}${apiPrefix}/file${normalizedPath}`
  }
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${apiPrefix}${normalizedPath}`
}

// 用户头像
const userAvatar = computed(() => {
  if (!user.value?.avatar) return img
  return buildFileUrl(user.value.avatar)
})

const getPermissionName = () => {
  const permissionName = {
    1: {
      name: '超级管理员',
      type: 'danger'
    },
    2: {
      name: '管理员',
      type: 'warning'
    },
    3: {
      name: `${import.meta.env.VITE_APP_DD_NAME}`,
      type: 'primary'
    },
  }
  return permissionName[permission.value]
}

// 导航菜单项
const navItems = computed(() => {
  const items = [
    { name: '首页', path: '/' },
    { name: '相簿', path: '/photo-album' },
    { name: '音声', path: '/audio' },
    { name: '企划', path: '/plan-document' },
    { name: '公告', path: '/announcement' },
  ]

  // 管理页面 - 需要登录且权限为0或1
  if (isAuthenticated.value && (permission.value === 1 || permission.value === 2)) {
    items.push({
      name: '管理',
      path: '/admin'
    })
  }

  items.push({ name: '友情链接', path: '#', isDropdown: true })

  return items
})

// 当前激活的菜单项索引（用于 el-menu）
const activeNavIndex = computed(() => {
  const currentPath = router.currentRoute.value.path
  // 首先查找完全匹配的项
  const exactMatch = navItems.value.find(item => item.path === currentPath)
  if (exactMatch) return exactMatch.path
  
  // 然后查找路径前缀匹配的项（处理子路径情况，如 /photo-album/1）
  const prefixMatch = navItems.value.find(item => {
    // 排除友情链接（path为'#'）和根路径
    if (item.path === '#' || item.path === '/') return false
    // 检查当前路径是否以导航项路径开头且后面跟着'/'或结束
    return currentPath.startsWith(item.path) && 
           (currentPath.length === item.path.length || 
            currentPath[item.path.length] === '/')
  })
  
  return prefixMatch ? prefixMatch.path : '/'
})

// 处理菜单选择
const handleMenuSelect = (index) => {
  // 如果是友情链接的URL，直接打开外部链接
  if (index.startsWith('http')) return

  // 如果是管理页面，根据用户设置决定跳转
  if (index === '/admin') {
    const adminVersion = localStorage.getItem('adminDefaultVersion') || 'new'
    if (adminVersion === 'new') {
      // 跳转到新版管理后台
      const token = userStore.token
      if (token) {
        window.open(`${import.meta.env.VITE_APP_ADMIN_URL}/?token=${token}`, '_blank')
        return
      }
    }
    // 否则跳转到旧版管理后台（/admin）
  }

  // 否则进行路由跳转
  navigateTo(index)
}

// 导航方法
const navigateTo = (path) => {
  router.push(path)
  showDropdown.value = false
  showMobileMenu.value = false
}

// 登录处理
const handleLogin = () => {
  // 跳转到登录页面
  router.push('/login')
}

// 退出登录处理
const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

// 切换下拉菜单
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// 点击其他地方关闭下拉菜单
const closeDropdown = () => {
  showDropdown.value = false
}

// 延迟隐藏下拉菜单的定时器
const hideDropdownTimer = ref(null)

// 隐藏下拉菜单（带延迟）
const hideDropdown = () => {
  hideDropdownTimer.value = setTimeout(() => {
    showDropdown.value = false
  }, 150)
}

// 取消隐藏
const cancelHide = () => {
  if (hideDropdownTimer.value) {
    clearTimeout(hideDropdownTimer.value)
    hideDropdownTimer.value = null
  }
}

// 切换移动菜单
const toggleMobileMenu = () => {
  if (showMobileMenu.value && !isSidebarClosing.value) {
    // 当前是打开状态，关闭菜单
    closeMobileMenu()
  } else if (!showMobileMenu.value && !isSidebarClosing.value) {
    // 当前是关闭状态，打开菜单
    openMobileMenu()
  }
  // 如果正在关闭动画中，忽略点击
  showDropdown.value = false // 关闭用户下拉菜单
}

// 打开移动菜单
const openMobileMenu = () => {
  // 清除之前的定时器
  if (sidebarTimer.value) {
    clearTimeout(sidebarTimer.value)
    sidebarTimer.value = null
  }

  showMobileMenu.value = true
  isSidebarClosing.value = false
}

// 清理定时器
const cleanupTimer = () => {
  if (sidebarTimer.value) {
    clearTimeout(sidebarTimer.value)
    sidebarTimer.value = null
  }
}

// 组件卸载时清理定时器（已合并到上面的 onUnmounted）

// 点击品牌：桌面端导航，移动端打开菜单
const onBrandClick = (e) => {
  const isMobile = window.innerWidth <= 768
  if (isMobile) {
    e.preventDefault()
    toggleMobileMenu()
  }
}

// 键盘支持：在移动端，回车或空格打开菜单；桌面端保持默认行为（跳转）
const onBrandKeydown = (e) => {
  const isMobile = window.innerWidth <= 768
  if (!isMobile) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggleMobileMenu()
  }
}

// 关闭移动菜单
const closeMobileMenu = () => {
  // 如果已经在关闭中，直接返回
  if (isSidebarClosing.value) return

  // 清除之前的定时器
  if (sidebarTimer.value) {
    clearTimeout(sidebarTimer.value)
  }

  isSidebarClosing.value = true

  sidebarTimer.value = setTimeout(() => {
    showMobileMenu.value = false
    isSidebarClosing.value = false
    sidebarTimer.value = null
  }, 250) // 与动画时间匹配
}

// 处理用户菜单点击时关闭移动菜单
const handleUserMenuClick = async (action) => {
  switch (action) {
    case 'profile':
      router.push('/profile')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '退出登录', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
          confirmButtonClass: 'el-button--danger'
        })
        // 用户确认退出
        handleLogout()
      } catch { }
  }
  showDropdown.value = false
  showMobileMenu.value = false // 关闭移动菜单
}

// 友情链接相关方法
const openLink = (url) => {
  window.open(url, '_blank')
}
</script>

<template>
  <header class="top-bar" @click="closeDropdown" role="banner" aria-label="页面页眉">
    <div class="container">
      <!-- 左侧品牌区域 -->
      <div class="brand">
        <el-avatar :size="28" :src="img" class="brand-avatar" @click="onBrandClick" role="button" aria-label="打开导航菜单" tabindex="0" />
        <router-link to="/" class="brand-link" @keydown="onBrandKeydown">
          <span class="brand-text">{{ title }}</span>
        </router-link>
      </div>

      <!-- 桌面端导航栏 -->
      <el-menu :default-active="activeNavIndex" class="navigation-menu" mode="horizontal" :ellipsis="false"
        @select="handleMenuSelect">
        <template v-for="item in navItems" :key="item.path">
          <el-sub-menu v-if="item.isDropdown" :index="item.name" :show-timeout="100" :hide-timeout="100">
            <template #title>
              <span>{{ item.name }}</span>
            </template>
            <el-menu-item v-for="link in friendlyLinks" :key="link.url" :index="link.url" @click="openLink(link.url)">
              <span>{{ link.name }}</span>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">
            <span>{{ item.name }}</span>
          </el-menu-item>
        </template>
      </el-menu>

      <!-- 右侧用户区域 -->
      <div class="user-area">
        <!-- 未登录状态 -->
        <el-button class="login" type="primary" @click="handleLogin" plain v-if="!isAuthenticated">
          登录
        </el-button>

        <!-- 已登录状态 -->
        <div v-else class="user-info-combo" :class="{ 'expanded': showDropdown }" @mouseenter="showDropdown = true" @mouseleave="hideDropdown">
          <!-- 默认状态：小头像 -->
          <div class="default-avatar-wrapper" :class="{ 'hidden': showDropdown }">
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99" class="avatar-badge">
              <el-avatar :size="36" :src="userAvatar" class="default-avatar" />
            </el-badge>
            <div class="default-status-dot"></div>
          </div>

          <!-- 展开状态：放大的头像与卡片 -->
          <div class="combo-container" :class="{ 'visible': showDropdown }">
            <div class="combo-avatar-section" @click.stop @mouseenter="cancelHide" @mouseleave="hideDropdown">
              <div class="combo-avatar-wrapper">
                <el-avatar :size="72" :src="userAvatar" class="combo-avatar" />
                <div class="combo-status-dot"></div>
              </div>
            </div>
            
            <div class="combo-card" @click.stop @mouseenter="cancelHide" @mouseleave="hideDropdown">
              <!-- 用户信息 -->
              <div class="combo-user-info">
                <div class="combo-username">{{ username }}</div>
                <el-tag :type="getPermissionName().type" size="small" effect="light" class="combo-role-tag">
                  {{ getPermissionName().name }}
                </el-tag>
              </div>

              <!-- 快捷操作 -->
              <div class="combo-actions">
                <div class="combo-action-btn" @click="handleUserMenuClick('profile')">
                  <el-icon><User /></el-icon>
                  <span>个人中心</span>
                  <el-badge v-if="unreadCount > 0" :value="unreadCount" :max="99" class="menu-badge" />
                </div>
              </div>

              <!-- 退出按钮 -->
              <div class="combo-logout" @click="handleUserMenuClick('logout')">
                <el-icon><SwitchButton /></el-icon>
                <span>退出登录</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 移动端侧边栏菜单 -->
      <div v-show="showMobileMenu || isSidebarClosing" class="mobile-sidebar-overlay" @click="closeMobileMenu" @touchmove.prevent>
        <div class="mobile-sidebar" :class="{ 'sidebar-closing': isSidebarClosing }" @click.stop @touchmove.stop>
          <div class="mobile-sidebar-header">
            <h3>{{ title }}</h3>
          </div>
          <!-- 移动端用户信息区域 -->
          <div v-if="isAuthenticated" class="mobile-user-info">
            <el-avatar :size="48" :src="userAvatar" class="mobile-user-avatar" />
            <div class="mobile-user-detail">
              <div class="mobile-username">{{ username }}</div>
              <el-tag :type="getPermissionName().type" size="small" effect="light">
                {{ getPermissionName().name }}
              </el-tag>
            </div>
          </div>
          <el-scrollbar class="sidebar-scrollbar">
            <el-menu :default-active="activeNavIndex" class="mobile-sidebar-menu" @select="handleMenuSelect">
              <template v-for="item in navItems" :key="item.path">
                <el-sub-menu v-if="item.isDropdown" :index="item.name">
                  <template #title>
                    <span>{{ item.name }}</span>
                  </template>
                  <el-menu-item v-for="link in friendlyLinks" :key="link.url" :index="link.url"
                    @click="openLink(link.url)">
                    <span>{{ link.name }}</span>
                  </el-menu-item>
                </el-sub-menu>
                <el-menu-item v-else :index="item.path">
                  <span>{{ item.name }}</span>
                </el-menu-item>
              </template>
            </el-menu>
          </el-scrollbar>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  width: 100%;
  height: 60px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.login {
  width: 75px;
  height: 35px;
  background-color: #ffffffa5;
  transition: all 0.3s ease;
}

.login:hover {
  background-color: #ffffff4e;
}

.container {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

/* 品牌区域 */
.brand {
  display: flex;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: white;
  font-weight: 600;
  font-size: 20px;
  transition: opacity 0.3s ease;
}

.brand-link:hover {
  opacity: 0.8;
}

.brand-link i {
  font-size: 24px;
  color: #ffd700;
}

.brand-text {
  font-family: 'Comic Sans MS', cursive;
  letter-spacing: 1px;
}

.brand-avatar {
  margin-right: 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
}

/* 桌面端隐藏品牌头像（仅移动端显示） */
@media (min-width: 769px) {
  .brand-avatar {
    display: none;
  }
}

.brand-text {
  font-family: 'Comic Sans MS', cursive;
  letter-spacing: 1px;
}

/* 导航栏菜单 */
.navigation-menu {
  flex: 1;
  display: flex;
  justify-content: center;
  position: absolute;
  left: 50vw;
  transform: translateX(-50%);
  border-bottom: none;
  height: 70%;
}

.el-menu--horizontal {
  --el-menu-bg-color: transparent;
  --el-menu-text-color: #fff;
  --el-menu-active-color: #fff;
  --el-menu-hover-bg-color: #ffffff48;
  --el-menu-hover-text-color: #fff;
}

:deep(.el-menu--horizontal>.el-menu-item.is-active) {
  border-bottom: 2px solid var(--color-primary);
}

/* 移动端显示品牌图标，隐藏文字 */
@media (max-width: 768px) {
  .brand-text {
    display: none;
  }
}

/* 移动端用户下拉左移，避免溢出 */
@media (max-width: 768px) {
  .user-dropdown {
    right: 12px;
    width: auto;
    max-width: 90vw;
  }
}

.nav-item i {
  font-size: 14px;
}

/* 用户区域 */
.user-area {
  display: flex;
  align-items: center;
}

/* 用户信息 */
/* 用户信息和卡片组合 */
.user-info-combo {
  position: relative;
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  width: 100px;
  height: 100px;
  margin: -26px -26px -26px 0;
}

/* 默认小头像 */
.default-avatar-wrapper {
  position: absolute;
  top: 26px;
  left: 26px;
  padding: 6px;
  border-radius: 50%;
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.default-avatar-wrapper.hidden {
  opacity: 0;
  transform: scale(0.85);
  pointer-events: none;
}

.user-info-combo:hover .default-avatar-wrapper:not(.hidden) {
  background: rgba(255, 255, 255, 0.15);
}

.default-avatar {
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

/* 头像角标样式 */
.avatar-badge {
  position: relative;
}

.avatar-badge :deep(.el-badge__content) {
  position: absolute;
  top: 5px !important;
  right: 10px !important;
  border: 2px solid var(--color-primary);
  background-color: #f56c6c;
  z-index: 10;
}

/* 菜单角标样式 */
.menu-badge {
  position: absolute;
  top: -6px;
  right: -6px;
}

.menu-badge :deep(.el-badge__content) {
  background-color: #f56c6c;
  border: none;
}

.user-info-combo:hover .default-avatar {
  border-color: white;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.default-status-dot {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 10px;
  height: 10px;
  background: #67c23a;
  border: 2px solid var(--color-primary);
  border-radius: 50%;
}

/* 展开状态容器 */
.combo-container {
  position: absolute;
  top: 25px;
  left: -14px;
  opacity: 0;
  transform: scale(0.85);
  pointer-events: none;
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1), transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1000;
}

.combo-container.visible {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.combo-avatar-section {
  position: relative;
  z-index: 10;
  padding: 4px;
  background: white;
  border-radius: 50%;
}

.combo-avatar-wrapper {
  position: relative;
  padding: 3px;
  background: white;
  border-radius: 50%;
}

.combo-avatar {
  border: 3px solid white;
}

.combo-status-dot {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 12px;
  height: 12px;
  background: #67c23a;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 卡片内容区（与头像拼接） */
.combo-card {
  position: absolute;
  top: 50px;
  right: 0;
  width: 200px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.05);
  padding: 20px;
  text-align: center;
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1) 0.08s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s;
}

.combo-container.visible .combo-card {
  opacity: 1;
  transform: translateY(0);
}

.combo-user-info {
  margin-bottom: 16px;
}

.combo-username {
  font-weight: 600;
  color: #303133;
  font-size: 16px;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.combo-role-tag {
  font-size: 11px;
}

/* 卡片操作按钮 */
.combo-actions {
  margin-bottom: 12px;
}

.combo-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-primary-alpha-10);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  position: relative;
}

.combo-action-btn:hover {
  background: var(--color-primary-alpha-20);
  transform: translateY(-1px);
}

.combo-action-btn .el-icon {
  font-size: 16px;
}

/* 退出按钮 */
.combo-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.combo-logout:hover {
  background: rgba(245, 108, 108, 0.2);
}

.combo-logout .el-icon {
  font-size: 14px;
}

/* 退出登录确认对话框样式 */
.logout-confirm-dialog {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.logout-confirm-dialog .el-messagebox__header {
  padding: 20px 20px 10px;
}

.logout-confirm-dialog .el-messagebox__title {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.logout-confirm-dialog .el-messagebox__content {
  padding: 10px 20px 20px;
  color: #606266;
}

.logout-confirm-dialog .el-messagebox__message {
  color: #606266;
  font-size: 14px;
}

.logout-confirm-dialog .el-messagebox__btns {
  padding: 10px 20px 20px;
}

.logout-confirm-dialog .el-button--danger {
  background-color: #f56c6c;
  border-color: #f56c6c;
}

.logout-confirm-dialog .el-button--danger:hover {
  background-color: #f78989;
  border-color: #f78989;
}

/* 响应式设计 */

/* 大屏幕优化 (>1200px) */
@media (min-width: 1200px) {
  .top-bar {
    height: 70px;
  }

  .brand-link {
    font-size: 24px;
  }

  .brand-link i {
    font-size: 28px;
  }

  .user-info {
    padding: 10px 14px;
  }

  .dropdown-name {
    font-size: 16px;
  }

}

/* 中等屏幕 (769px-1199px) */
@media (min-width: 769px) and (max-width: 1199px) {
  .navigation-menu {
    gap: 25px;
  }

}

/* 平板端 (481px-768px) */
@media (min-width: 481px) and (max-width: 768px) {

  .navigation-menu {
    gap: 8px;
  }

  .brand-link {
    font-size: 18px;
  }
}

/* 小屏手机 (≤480px) */
@media (max-width: 480px) {
  .top-bar {
    height: 50px;
  }

  .container {
    padding: 0 10px;
  }

  .brand-link {
    font-size: 16px;
    gap: 6px;
  }

  .brand-link i {
    font-size: 18px;
  }

  .navigation-menu {
    display: none;
  }

  .user-area {
    min-width: auto;
  }

  /* 移动端用户头像组合适配 */
  .user-info-combo {
    width: 100px;
    height: 100px;
    position: relative;
  }

  .default-avatar-wrapper {
    top: 26px;
    left: 26px;
    padding: 6px;
  }

  .default-avatar {
    width: 36px !important;
    height: 36px !important;
  }

  .default-status-dot {
    width: 10px;
    height: 10px;
    bottom: 6px;
    right: 6px;
  }

  .combo-container {
    top: 32px;
    left: -14px;
  }

  .combo-avatar-section {
    padding: 4px;
  }

  .combo-avatar {
    width: 72px !important;
    height: 72px !important;
  }

  .combo-status-dot {
    width: 12px;
    height: 12px;
    bottom: 4px;
    right: 4px;
  }

  .combo-card {
    top: 50px;
    right: 0;
    width: 180px;
    padding: 16px;
    border-radius: 12px;
  }

  .combo-username {
    font-size: 14px;
  }

  .combo-action-btn,
  .combo-logout {
    padding: 10px 12px;
    font-size: 13px;
  }
}

/* 超小屏幕 (≤375px) */
@media (max-width: 375px) {
  .top-bar {
    height: 48px;
  }

  .container {
    padding: 0 8px;
  }


  .brand-link {
    font-size: 15px;
  }

  .brand-link i {
    font-size: 16px;
  }

  /* 超小屏幕用户头像适配 */
  .user-info-combo {
    width: 90px;
    height: 90px;
  }

  .default-avatar-wrapper {
    top: 22px;
    left: 22px;
    padding: 6px;
  }

  .default-avatar {
    width: 36px !important;
    height: 36px !important;
  }

  .combo-container {
    top: 14px;
    left: -12px;
  }

  .combo-avatar {
    width: 64px !important;
    height: 64px !important;
  }

  .combo-card {
    top: 44px;
    right: 0;
    width: 160px;
    padding: 14px;
  }

  .combo-username {
    font-size: 13px;
  }
}

/* 移动端侧边栏遮罩 */
.mobile-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.mobile-sidebar-overlay:has(.sidebar-closing) {
  animation: fadeOut 0.3s ease;
}

.mobile-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: 280px;
  height: 100vh;
  max-height: 100vh;
  background: white;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.15);
  animation: slideInLeft 0.3s ease;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mobile-sidebar.sidebar-closing {
  animation: slideOutLeft 0.3s ease;
}

/* 移动端侧边栏菜单 */
.mobile-sidebar-menu {
  background: transparent;
  border: none;
  padding: 0;
  width: 100%;
}

/* 侧边栏滚动区域 */
.sidebar-scrollbar {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mobile-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 24px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: white;
  height: 60px;
  flex-shrink: 0;
}

.mobile-sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

/* 移动端用户信息 */
.mobile-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--color-primary-alpha-10) 0%, var(--color-primary-alpha-5) 100%);
  border-bottom: 1px solid #f0f0f0;
}

.mobile-user-avatar {
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.mobile-user-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-username {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.close-btn {
  color: white !important;
  padding: 8px !important;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
}


/* 动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(0);
  }
}

@keyframes slideOutLeft {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(-100%);
  }
}

/* 平板端优化 */
@media (min-width: 769px) and (max-width: 1024px) {
  .navigation-menu {
    position: static;
    transform: none;
    flex: 1;
    margin: 0 20px;
  }
}
</style>
