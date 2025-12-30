<script setup>
import {ref, computed} from 'vue'
import {useRouter} from 'vue-router'
import {useUserStore} from '@/stores/user'
import {storeToRefs} from 'pinia'
import img from '@/assets/猫玩伴.png'
 

// 响应式数据
const showDropdown = ref(false)
const showMobileMenu = ref(false)
const currentRoute = ref('')

// 计算属性
const router = useRouter()
const userStore = useUserStore()

// 使用storeToRefs确保响应性
const {token, user} = storeToRefs(userStore)

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
const navItems = [
  {name: '首页', path: '/', icon: 'fas fa-home'},
  {name: '相簿', path: '/photo-album', icon: 'fas fa-images'},
  {name: '音声', path: '/audio', icon: 'fas fa-music'}
]

// 条件导航菜单项
const conditionalNavItems = computed(() => {
  const items = []

  // 下载页面 - 需要登录
  // if (isAuthenticated.value) {
  //   items.push({
  //     name: '下载',
  //     path: '/download',
  //     icon: 'fas fa-download'
  //   })
  // }

  // 管理页面 - 需要登录且权限为0或1
  if (isAuthenticated.value && (permission.value === 1 || permission.value === 2)) {
    items.push({
      name: '管理',
      path: '/admin',
      icon: 'fas fa-cog'
    })
  }

  return items
})

// 当前激活的导航项
const activeNav = computed(() => {
  const currentPath = router.currentRoute.value.path

  // 检查动态路由
  if (currentPath.startsWith('/photo-album')) {
    return '相簿'
  }

  // 检查所有可能的导航项
  const allNavItems = [...navItems, ...conditionalNavItems.value]
  return allNavItems.find(item => item.path === currentPath)?.name || '首页'
})

// 导航方法
const navigateTo = (path) => {
  router.push(path)
  showDropdown.value = false
  showMobileMenu.value = false
}

// 用户菜单项
const userMenuItems = [
  // { name: '个人中心', icon: 'fas fa-user', action: 'profile' },
  // { name: '设置', icon: 'fas fa-cog', action: 'settings' },
  {name: '退出登录', icon: 'fas fa-sign-out-alt', action: 'logout'}
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
  showMobileMenu.value = !showMobileMenu.value
  showDropdown.value = false // 关闭用户下拉菜单
}

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
  showMobileMenu.value = false
}

// 处理用户菜单点击时关闭移动菜单
const handleUserMenuClick = (action) => {
  switch (action) {
    case 'profile':
      console.log('跳转到个人中心')
      break
    case 'settings':
      console.log('跳转到设置页面')
      break
    case 'logout':
      handleLogout()
      break
  }
  showDropdown.value = false
  showMobileMenu.value = false // 关闭移动菜单
}
</script>

<template>
  <header class="top-bar" @click="closeDropdown" role="banner" aria-label="页面页眉">
    <div class="container">
      <!-- 左侧品牌区域 -->
      <div class="brand">
        <router-link to="/" class="brand-link" @click="onBrandClick" @keydown="onBrandKeydown">
          <el-avatar :size="28" :src="img" class="brand-avatar" />
          <span class="brand-text">小猫丸子Wiki</span>
        </router-link>
        <!-- 移动端菜单触发器已移除，保留品牌头像和文字 -->
      </div>

      <!-- 桌面端导航栏 -->
      <nav class="navigation desktop-nav" role="navigation" aria-label="主导航">
        <ul class="nav-list">
          <li v-for="item in navItems" :key="item.path" class="nav-item"
              :class="{ active: activeNav === item.name }" @click="navigateTo(item.path)">
            <span>{{ item.name }}</span>
          </li>
          <li v-for="item in conditionalNavItems" :key="item.path" class="nav-item conditional-nav"
              :class="{ active: activeNav === item.name }" @click="navigateTo(item.path)">
            <span>{{ item.name }}</span>
          </li>
        </ul>
      </nav>

      <!-- (已移除右侧汉堡按钮，左侧品牌图标现在充当触发器) -->

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
              <el-avatar :size="45" :src="img"/>
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

      <!-- 移动端菜单 -->
      <div v-if="showMobileMenu" class="mobile-menu-overlay" @click="closeMobileMenu">
        <div class="mobile-menu" @click.stop>
          <div class="mobile-menu-header">
            <h3>导航菜单</h3>
            <button class="close-menu-btn" @click="closeMobileMenu">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <ul class="mobile-nav-list">
            <li v-for="item in [...navItems, ...conditionalNavItems]" :key="item.path"
                class="mobile-nav-item" :class="{ active: activeNav === item.name }"
                @click="navigateTo(item.path)">
              <i :class="item.icon"></i>
              <span>{{ item.name }}</span>
            </li>
          </ul>
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
  background: rgba(255,255,255,0.06);
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

/* 导航栏 */
.navigation {
  flex: 1;
  display: flex;
  justify-content: center;
  position: absolute;
  left: 50vw;
  transform: translateX(-50%);
}

/* 中央 Logo（替代原本的淡淡小方块） */
/* 中间 logo 已移除 - 保留相关提示样式 */

/* 可见的移动端标签，提示这是导航栏 */
.nav-label {
  display: none;
  font-size: 11px;
  color: #1976d2;
  margin-left: 6px;
}

@media (max-width: 768px) {
  .nav-label {
    display: inline-block;
    margin-left: 6px;
    font-weight: 600;
  }
}

/* 屏幕阅读器文本 */
.sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
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

.nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

.nav-icon {
  font-size: 14px;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  transform: translateY(-1px);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 条件导航项样式 */
.conditional-nav {
  position: relative;
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
  border-radius: 20px;
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
  padding: 16px;
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

  .nav-item {
    padding: 12px 20px;
    font-size: 16px;
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
  .nav-list {
    gap: 25px;
  }

  .nav-item {
    padding: 10px 16px;
    font-size: 15px;
  }
}

/* 平板端 (481px-768px) */
@media (min-width: 481px) and (max-width: 768px) {
  .nav-item {
    padding: 8px 12px;
    font-size: 14px;
  }

  .nav-list {
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

  .navigation {
    display: none; /* 在移动端隐藏桌面导航 */
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

  .navigation {
    margin: 0 3px;
  }

  .nav-list {
    gap: 4px;
  }

  .nav-item {
    width: 32px;
    height: 32px;
    padding: 4px;
  }

  .user-info {
    padding: 4px 6px;
  }

  .user-dropdown {
    width: 160px;
  }
}

/* 移动端汉堡菜单 */
.hamburger-menu {
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.hamburger-menu:hover {
  background: rgba(255, 255, 255, 0.2);
}

.hamburger-line {
  width: 20px;
  height: 2px;
  background: white;
  margin: 2px 0;
  transition: all 0.3s ease;
  transform-origin: center;
}

.hamburger-menu.active .hamburger-line:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.hamburger-menu.active .hamburger-line:nth-child(2) {
  opacity: 0;
}

.hamburger-menu.active .hamburger-line:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -6px);
}

/* 移动端菜单遮罩 */
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 60px;
  animation: fadeIn 0.3s ease;
}

.mobile-menu {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 320px;
  max-height: 70vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideDown 0.3s ease;
}

.mobile-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e9ecef;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.mobile-menu-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.close-menu-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-menu-btn:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
}

.mobile-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mobile-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f8f9fa;
  color: #333;
}

.mobile-nav-item:hover {
  background: #f8f9fa;
}

.mobile-nav-item.active {
  background: #e3f2fd;
  color: #1976d2;
  border-left: 4px solid #1976d2;
}

.mobile-nav-item i {
  width: 20px;
  font-size: 16px;
  color: #666;
}

.mobile-nav-item.active i {
  color: #1976d2;
}

.mobile-nav-item:last-child {
  border-bottom: none;
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

/* 平板端优化 */
@media (min-width: 769px) and (max-width: 1024px) {
  .navigation {
    position: static;
    transform: none;
    flex: 1;
    margin: 0 20px;
  }

  .nav-list {
    justify-content: center;
  }
}

/* 移动端显示控制 */
@media (max-width: 768px) {
  .hamburger-menu {
    display: flex;
  }

  .desktop-nav {
    display: none;
  }

  .mobile-only {
    display: block !important;
  }

  /* 将汉堡按钮固定到右上角，避免位于中间 */
  .hamburger-menu {
    position: absolute;
    right: 12px;
    top: 12px;
    z-index: 1001;
  }

  /* 移动端隐藏导航图标，只显示文字 */
  .nav-icon {
    display: none;
  }

  /* 移动端优化导航项间距 */
  .nav-item {
    gap: 4px;
  }
}

/* 平板端显示图标 */
@media (min-width: 769px) {
  .nav-icon {
    display: inline-block;
  }
}
</style>
