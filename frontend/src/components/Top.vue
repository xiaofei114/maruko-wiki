<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessageBox } from 'element-plus'
import img from '@/assets/猫玩伴.png'


// 响应式数据
const showDropdown = ref(false)
const showMobileMenu = ref(false)
const isSidebarClosing = ref(false)
const sidebarTimer = ref(null)

// 友情链接数据
const friendlyLinks = [
  { name: '梨按钮', url: 'https://www.shanerubian.online/' },
  { name: '虎按钮', url: 'https://zhaoshihu.shanerubian.online/' },
  { name: '羽毛球按钮', url: 'https://xinggongyun.shanerubian.online/' },
  { name: '虾按钮', url: 'https://xia.shanerubian.online/' },
  { name: '龟按钮', url: 'https://kami.shanerubian.online/' },
  { name: '浣熊按钮', url: 'https://huanxiong.shanerubian.online/' },
  { name: '埋按钮', url: 'https://maibutton.yangdujun.top/' },
]

// 计算属性
const router = useRouter()
const userStore = useUserStore()

// 使用storeToRefs确保响应性
const { token, user } = storeToRefs(userStore)

// 用户状态的计算属性，确保响应性
const isAuthenticated = computed(() => !!token.value && !!user.value)
const username = computed(() => user.value?.name || '')
const permission = computed(() => user.value?.permission || '')

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
      name: '猫丸伴',
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
    { name: '企划表', path: '/plan-document' },
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

  // 否则进行路由跳转
  navigateTo(index)
}

// 导航方法
const navigateTo = (path) => {
  router.push(path)
  showDropdown.value = false
  showMobileMenu.value = false
}

// 用户菜单项
const userMenuItems = [
  // { name: '个人中心', action: 'profile' },
  // { name: '设置', action: 'settings' },
  { name: '退出登录', action: 'logout' }
]


// 登录处理
const handleLogin = () => {
  // 跳转到登录页面
  router.push('/login')
}

// 退出登录处理
const handleLogout = () => {
  userStore.logout()
}

// 切换下拉菜单
const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

// 点击其他地方关闭下拉菜单
const closeDropdown = () => {
  showDropdown.value = false
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

// 组件卸载时清理定时器
onUnmounted(() => {
  cleanupTimer()
})

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
    case 'settings':
      console.log('跳转到设置页面')
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
        <el-avatar :size="28" :src="img" class="brand-avatar" @click="onBrandClick" />
        <router-link to="/" class="brand-link" @keydown="onBrandKeydown">
          <span class="brand-text">小猫丸子Wiki</span>
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
        <div v-else class="user-info" @click.stop="toggleDropdown">
          <span class="user-name">{{ username }}</span>

          <!-- 用户下拉菜单 -->
          <div v-if="showDropdown" class="user-dropdown" @click.stop>
            <div class="dropdown-header">
              <el-avatar :size="45" :src="img" />
              <div class="dropdown-info">
                <div class="dropdown-name">{{ username }}</div>
                <el-tag :type="getPermissionName().type" style="padding: 0;">
                  {{ getPermissionName().name }}
                </el-tag>
              </div>
            </div>

            <div class="dropdown-divider"></div>

            <ul class="dropdown-menu">
              <li v-for="item in userMenuItems" :key="item.action" class="dropdown-item"
                @click="handleUserMenuClick(item.action)">
                <span>{{ item.name }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 移动端侧边栏菜单 -->
      <div v-show="showMobileMenu || isSidebarClosing" class="mobile-sidebar-overlay" @click="closeMobileMenu">
        <div class="mobile-sidebar" :class="{ 'sidebar-closing': isSidebarClosing }" @click.stop>
          <div class="mobile-sidebar-header">
            <h3>小猫丸子Wiki</h3>
          </div>
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
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  width: 100%;
  height: 60px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.login {
  width: 75px;
  height: 35px;
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
  border-bottom: 2px solid #3040e7;
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
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  position: relative;
  transition: background-color 0.3s ease;
}

.user-info:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-avatar i {
  color: white;
  font-size: 18px;
}

.user-name {
  color: white;
  font-weight: 500;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 下拉菜单 */
.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 220px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: dropdownSlide 0.3s ease;
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dropdown-header {
  padding: 5px 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  display: flex;
  align-items: center;
  gap: 12px;
}

.dropdown-avatar i {
  color: white;
  font-size: 20px;
}

.dropdown-info {
  flex: 1;
}

.dropdown-name {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.dropdown-divider {
  height: 1px;
  background: #e9ecef;
  margin: 0;
}

.dropdown-menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  color: #333;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-item i {
  width: 16px;
  color: #666;
}

/* 退出登录项特殊样式 */
.dropdown-item:last-child {
  color: #F56C6C;
  border-top: 1px solid #999;
  background: #fef0f0;
}

.dropdown-item:last-child:hover {
  background: rgb(252, 211, 211);
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

  .user-info {
    padding: 5px 8px;
    border-radius: 16px;
  }

  .user-dropdown {
    width: 200px;
    right: -8px;
    top: 100%;
    margin-top: 6px;
  }

  .dropdown-header {
    padding: 12px;
  }

  .dropdown-avatar i {
    font-size: 16px;
  }

  .dropdown-name {
    font-size: 12px;
  }

  .dropdown-item {
    padding: 10px 12px;
    font-size: 13px;
  }

  .dropdown-item i {
    width: 12px;
    font-size: 11px;
  }

  /* 移动端优化用户下拉菜单 */
  .user-dropdown {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .dropdown-header {
    border-radius: 8px 8px 0 0;
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

  .user-info {
    padding: 4px 6px;
  }

  .user-dropdown {
    width: 160px;
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
  background: white;
  box-shadow: 2px 0 20px rgba(0, 0, 0, 0.15);
  animation: slideInLeft 0.3s ease;
  display: flex;
  flex-direction: column;
}

.mobile-sidebar.sidebar-closing {
  animation: slideOutLeft 0.3s ease;
}

/* 移动端侧边栏菜单 */
.mobile-sidebar-menu {
  flex: 1;
  background: transparent;
  border: none;
  padding: 0;
}

.mobile-sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 24px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: white;
  height: 60px;
}

.mobile-sidebar-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
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
