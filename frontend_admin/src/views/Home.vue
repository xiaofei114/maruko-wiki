<script setup>
import * as icons from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { debounce } from 'lodash';
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getDateTime } from '@/utils/time.js'
import { useUserStore } from '@/stores/user.js'

// 菜单配置
const menuConfig = ref([
    {
        type: 'item',
        title: '首页',
        icon: 'House',
        index: 'things',
        route: 'things'
    },
    {
        type: 'submenu',
        title: '内容管理',
        icon: 'Folder',
        index: 'content',
        children: [
            {
                title: '相册管理',
                icon: 'Picture',
                index: 'album',
                route: 'album'
            },
            {
            title: '音声管理',
            icon: 'Headset',
            index: 'audio',
            route: 'audio'
        },
        {
            title: '舰礼管理',
            icon: 'Present',
            index: 'captain-gift',
            route: 'captain-gift'
        }
        ]
    },
    {
        type: 'submenu',
        title: '系统管理',
        icon: 'Setting',
        index: 'system',
        children: [
            {
                title: '用户管理',
                icon: 'User',
                index: 'user',
                route: 'user',
                permission: 1
            },
            {
                title: '字典管理',
                icon: 'Document',
                index: 'dictionary',
                route: 'dictionary'
            },
            {
                title: '运行日志',
                icon: 'Notebook',
                index: 'logs',
                route: 'logs',
                permission: 1
            }
        ]
    }
])

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const things = ref(route)
const userName = ref(null)
const showmenu = ref(null)

watch(() => route, newName => things.value = newName)

const isCollapse = ref(false)
const select = debounce((path) => {
    router.push("/home/" + path);
}, 300);

const menuWidth = ref(false)

const foldMenu = () => {
    menuWidth.value = !menuWidth.value
    if (menuWidth.value) setTimeout(() => isCollapse.value = !isCollapse.value, 300);
    else isCollapse.value = !isCollapse.value
}

// 检测是否为手机端
const isMobile = ref(false)

const checkMobile = () => {
    isMobile.value = window.innerWidth <= 500
}

// 手机端侧边栏控制
const mobileMenuVisible = ref(false)

const toggleMobileMenu = () => {
    mobileMenuVisible.value = !mobileMenuVisible.value
}

const closeMobileMenu = () => {
    mobileMenuVisible.value = false
}

const selectMobileMenu = (route) => {
    if (route) {
        router.push("/home/" + route);
        closeMobileMenu();
    }
}

onMounted(async () => {
    userName.value = userStore.user

    // 检测手机端
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // 手机端路由变化时自动关闭侧边栏
    if (isMobile.value) {
        router.afterEach(() => {
            closeMobileMenu()
        })
    }
})

// 组件卸载时移除事件监听
onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
})

const logOut = () => {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(() => {
        userStore.loginOut()
    })
}

const goToHomePage = () => {
    window.open(import.meta.env.VITE_APP_PAGE_URL, '_blank')
}

// 根据权限过滤菜单
const filteredMenuConfig = computed(() => {
    return menuConfig.value.map(item => {
        if (item.type === 'submenu' && item.children) {
            // 过滤子菜单
            const filteredChildren = item.children.filter(child => {
                // 如果没有权限要求，或者用户权限满足要求
                if (!child.permission) return true
                return userStore.permission === child.permission
            })
            // 如果子菜单为空，不显示该菜单组
            if (filteredChildren.length === 0) return null
            return {
                ...item,
                children: filteredChildren
            }
        }
        return item
    }).filter(item => item !== null)
})
</script>

<template>
    <div class="page" :class="{ 'mobile': isMobile }">
        <!-- 手机端遮罩层 -->
        <div v-if="isMobile && mobileMenuVisible" class="mobile-overlay" @click="closeMobileMenu"></div>

        <!-- 手机端左侧菜单 -->
        <div v-if="isMobile" class="mobile-sidebar" :class="{ 'mobile-sidebar-visible': mobileMenuVisible }">
            <el-menu unique-opened :default-active="route.name" @select="selectMobileMenu" active-text-color="#ffd04b"
                background-color="#545c64" text-color="#fff" style="height: 100%; border: none;">
                <div class="title">
                    <span>后台管理</span>
                </div>
                <template v-for="item in filteredMenuConfig" :key="item.index">
                    <!-- 普通菜单项 -->
                    <el-menu-item v-if="item.type === 'item'" :index="item.route">
                        <el-icon>
                            <component :is="icons[item.icon]" />
                        </el-icon>
                        <template #title>
                            <span>{{ item.title }}</span>
                        </template>
                    </el-menu-item>

                    <!-- 子菜单 -->
                    <el-sub-menu v-else-if="item.type === 'submenu'"
                        :index="item.index">
                        <template #title>
                            <el-icon>
                                <component :is="icons[item.icon]" />
                            </el-icon>
                            <span>{{ item.title }}</span>
                        </template>
                        <el-menu-item v-for="child in item.children" :key="child.index" :index="child.route">
                            <template #title>
                                <el-icon>
                                    <component :is="icons[child.icon]" />
                                </el-icon>
                                <span>{{ child.title }}</span>
                            </template>
                        </el-menu-item>
                    </el-sub-menu>
                </template>
            </el-menu>
        </div>

        <!-- 侧边栏菜单 -->
        <div class="menu" :class="{ 'mobile-menu': isMobile, 'mobile-menu-visible': mobileMenuVisible }"
            :style="{ width: isMobile ? '250px' : (menuWidth ? '64px' : '200px') }">
            <el-menu unique-opened :default-active="route.name" :collapse="isCollapse && !isMobile" @select="select"
                active-text-color="#ffd04b" background-color="#545c64" text-color="#fff" style="height: 100%;"
                :collapse-transition="false">
                <div class="title">
                    <span v-if="!isCollapse || isMobile" class="title-copy">后台管理</span>
                    <span v-else class="title-copy">
                        <span>后台</span>
                        <span>管理</span>
                    </span>
                </div>
                <template v-for="item in filteredMenuConfig" :key="item.index">
                    <!-- 普通菜单项 -->
                    <el-menu-item v-if="item.type === 'item' " :index="item.index">
                        <el-icon>
                            <component :is="icons[item.icon]" />
                        </el-icon>
                        <template #title>
                            <span>{{ item.title }}</span>
                        </template>
                    </el-menu-item>

                    <!-- 子菜单 -->
                    <el-sub-menu v-else-if="item.type === 'submenu'"
                        :index="item.index">
                        <template #title>
                            <el-icon>
                                <component :is="icons[item.icon]" />
                            </el-icon>
                            <span>{{ item.title }}</span>
                        </template>
                        <el-menu-item v-for="child in item.children" :key="child.index" :index="child.index">
                            <template #title>
                                <el-icon>
                                    <component :is="icons[child.icon]" />
                                </el-icon>
                                <span>{{ child.title }}</span>
                            </template>
                        </el-menu-item>
                    </el-sub-menu>
                </template>
            </el-menu>
        </div>

        <div class="main">
            <div class="main-head">
                <el-button size="large" text class="button" @click="isMobile ? toggleMobileMenu() : foldMenu()">
                    <template #default>
                        <el-icon size="30">
                            <Menu v-if="isMobile" />
                            <CaretLeft v-else-if="!isCollapse" />
                            <CaretRight v-else />
                        </el-icon>
                    </template>
                </el-button>
                <el-breadcrumb>
                    <el-breadcrumb-item :to="{ path: '/home/things' }">首页</el-breadcrumb-item>
                    <el-breadcrumb-item :to="{ path: things.meta.father.path }" v-if="things.meta.father">
                        {{ things.meta.father.name }}
                    </el-breadcrumb-item>
                    <el-breadcrumb-item v-if="things.meta.name">{{ things.meta.name }}</el-breadcrumb-item>
                </el-breadcrumb>
                <div style="position: absolute; right: 40px; display: flex; gap: 10px;">
                    <el-button type="primary" plain @click="goToHomePage">返回主页</el-button>
                    <el-button type="danger" plain @click="logOut">退出登录</el-button>
                </div>
            </div>
            <div class="main-body">
                <el-card class="card">
                    <div class="card-body">
                        <el-watermark :content="[userName, getDateTime()]">
                            <el-scrollbar height="84vh" class="scrollbar">
                                <router-view v-slot="{ Component }">
                                    <transition>
                                        <component :userName="userName" :is="Component" :key="$route.path" />
                                    </transition>
                                </router-view>
                            </el-scrollbar>
                        </el-watermark>
                    </div>
                </el-card>
            </div>
        </div>
    </div>
</template>

<style scoped>
.page {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
}

.title {
    width: 100%;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
}

.title-copy {
    display: flex;
    flex-direction: column;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
    font-weight: bold;
    font-size: 18px;
}

.logo_img {
    width: 140px;
    height: 140px;
    transform: translateY(13px);
    transition: all 1s;
}

.logo_img:hover {
    transform: translateY(13px) scale(1.1);
}

.menu {
    transition: all 0.5s;
    height: 100%;
    overflow: hidden;
}

.main {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.main-head {
    width: 100%;
    height: 50px;
    box-shadow: 0px 7px 30px 0px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
}

.button {
    width: 50px;
    height: 50px;
    margin-right: 5px;
}

.main-body {
    width: 96%;
    height: 96%;
    padding: 2%;
    display: flex;
}

.card {
    width: 100%;
    height: 100%;
}

.card-body {
    position: relative;
    width: 100%;
    height: 100%;
}

:deep(.el-scrollbar__bar.is-horizontal) {
    display: none !important;
}

.v-enter-active {
    position: absolute;
    width: 100%;
    height: 100%;
    transition: all 1s;
}

.v-enter-from {
    opacity: 0;
    transform: translateX(30px);
}

/* 手机端适配样式 */
@media screen and (max-width: 500px) {
    .page {
        flex-direction: column;
        overflow: hidden;
        height: 100vh;
        position: relative;
    }

    /* 手机端遮罩层 */
    .mobile-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 999;
        animation: fadeIn 0.3s ease;
    }

    /* 手机端左侧菜单 */
    .mobile-sidebar {
        position: fixed;
        top: 0;
        left: -280px;
        width: 180px;
        height: 100vh;
        background-color: #545c64;
        color: #fff;
        z-index: 1000;
        transition: left 0.3s ease;
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
        overflow-y: auto;
        overflow-x: hidden;
        -webkit-overflow-scrolling: touch;
    }

    .mobile-sidebar-visible {
        left: 0;
    }

    /* 确保手机端侧边栏与电脑端样式一致 */
    .mobile-sidebar :deep(.el-menu) {
        border: none;
        background-color: #545c64;
    }

    .mobile-sidebar :deep(.el-menu-item) {
        color: #fff;
        background-color: transparent;
    }

    .mobile-sidebar :deep(.el-menu-item:hover) {
        background-color: #666;
    }

    .mobile-sidebar :deep(.el-menu-item.is-active) {
        color: #ffd04b;
    }

    .mobile-sidebar :deep(.el-sub-menu__title) {
        color: #fff;
        background-color: transparent;
    }

    .mobile-sidebar :deep(.el-sub-menu__title:hover) {
        background-color: #666;
    }

    .mobile-sidebar :deep(.el-sub-menu .el-menu-item.is-active) {
        color: #ffd04b;
    }

    /* 手机端侧边栏隐藏 */
    .mobile-menu {
        display: none !important;
    }

    .menu {
        width: 100% !important;
        height: 60px;
        order: 1;
        position: relative;
        z-index: 100;
        overflow: hidden;
        flex-shrink: 0;
    }

    .main {
        order: 2;
        height: calc(100vh - 60px);
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .main-head {
        height: 50px;
        padding: 0 15px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        overflow: hidden;
    }

    .button {
        width: 40px;
        height: 40px;
        margin-right: 10px;
        flex-shrink: 0;
    }

    .main-body {
        height: 89%;
    }

    .title {
        height: 60px;
    }

    .logo_img {
        width: 100px;
        height: 100px;
        transform: translateY(10px);
    }

    .title-copy {
        font-size: 14px;
    }

    /* 调整面包屑导航 */
    .el-breadcrumb {
        font-size: 12px;
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        margin: 0 10px;
    }

    /* 调整退出登录按钮 */
    .main-head>div:last-child {
        right: 15px;
        position: absolute;
        flex-shrink: 0;
    }

    /* 调整菜单项文字大小 */
    :deep(.el-menu-item),
    :deep(.el-sub-menu__title) {
        font-size: 14px;
    }

    /* 调整卡片内容区域 */
    .card-body {
        padding: 10px;
        height: 100%;
        overflow: hidden;
    }

    /* 优化过渡动画 */
    .v-enter-from {
        transform: translateY(20px);
    }

    /* 手机端菜单优化 */
    :deep(.el-menu) {
        height: auto !important;
        min-height: 60px;
        overflow: hidden;
    }

    :deep(.el-menu--collapse) {
        width: 100% !important;
    }

    /* 调整菜单折叠按钮在手机端的位置 */
    .mobile .main-head .button {
        position: relative;
        left: auto;
        z-index: 10;
    }

    /* 手机端面包屑居中 */
    .mobile .el-breadcrumb {
        position: relative;
        left: auto;
        transform: none;
        max-width: none;
        text-align: center;
    }

    /* 手机端退出按钮调整 */
    .mobile .main-head>div:last-child {
        right: 15px;
        position: absolute;
    }

    /* 手机端卡片样式优化 */
    .mobile .card {
        border-radius: 8px;
        margin: 5px;
        height: 100%;
        overflow: hidden;
    }

    .mobile .card-body {
        padding: 8px;
        height: 100%;
        overflow: hidden;
    }

    /* 手机端水印调整 */
    .mobile :deep(.el-watermark) {
        font-size: 12px;
    }

    /* 手机端触摸优化 */
    .mobile .button {
        min-width: 44px;
        min-height: 44px;
        touch-action: manipulation;
    }

    .mobile :deep(.el-menu-item),
    .mobile :deep(.el-sub-menu__title) {
        min-height: 44px;
        touch-action: manipulation;
    }

    .mobile :deep(.el-button) {
        min-height: 36px;
        touch-action: manipulation;
    }

    /* 手机端滚动优化 */
    .scrollbar>:deep(.el-scrollbar__wrap) {
        overflow-x: hidden;
    }

    /* 手机端过渡动画优化 */
    .mobile .v-enter-active {
        transition: all 0.3s ease;
    }

    .mobile .v-enter-from {
        transform: translateY(15px);
        opacity: 0;
    }

    .mobile .v-enter-to {
        transform: translateY(0);
        opacity: 1;
    }

    /* 手机端字体和间距优化 */
    .mobile :deep(.el-card__body) {
        padding: 12px;
    }

    .mobile :deep(.el-table) {
        font-size: 12px;
    }

    .mobile .el-table th,
    .mobile .el-table td {
        padding: 8px 4px;
    }

    .mobile :deep(.el-form-item__label) {
        font-size: 14px;
        line-height: 1.4;
    }

    .mobile :deep(.el-input__inner) {
        font-size: 14px;
        height: 36px;
    }

    .mobile :deep(.el-select) {
        width: 100%;
    }

    /* 手机端分页器优化 */
    .mobile :deep(.el-pagination) {
        text-align: center;
        margin-top: 15px;
    }

    .mobile .el-pagination .el-pager li {
        min-width: 32px;
        height: 32px;
        line-height: 32px;
    }

    /* 手机端弹窗优化 */
    .mobile :deep(.el-dialog) {
        width: 90% !important;
        margin: 5vh auto !important;
    }

    .mobile :deep(.el-message-box) {
        width: 90% !important;
        margin: 5vh auto !important;
    }

    /* 手机端标签页优化 */
    .mobile :deep(.el-tabs__nav-wrap) {
        padding: 0 10px;
    }

    .mobile .el-pagination .el-pager li {
        font-size: 14px;
        padding: 0 15px;
    }
}

/* 遮罩层动画 */
@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}
</style>