<script setup>
import { ref, onMounted } from 'vue'
import { getDashboardStats } from '@/api/dashboard.js'
import { useUserStore } from '@/stores/user.js'

const userStore = useUserStore()

const stats = ref(null)
const loading = ref(true)

// 统计数据
const statsData = [
    { key: 'users', label: '用户总数', icon: 'user', color: '#409EFF' },
    { key: 'contents', label: '内容总数', icon: 'document', color: '#67C23A' },
    { key: 'announcements', label: '公告数量', icon: 'bell', color: '#E6A23C' },
    { key: 'planDocuments', label: '企划文档', icon: 'folder', color: '#909399' }
]

// 待处理数据
const pendingData = ref([])

const formatNumber = (num) => {
    if (num === undefined || num === null) return 0
    return num.toLocaleString()
}

const formatHours = (hours) => {
    if (hours >= 1000) {
        return (hours / 1000).toFixed(1) + 'k'
    }
    return hours
}

const getIcon = (iconName) => {
    const icons = {
        user: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M406 598q80-76 176-118t208-42q107 0 208 42t176 118q-14 16-39 52t-71 102t-84 137t-67 152q-18 18-41 18t-41-18q-26-52-67-152t-84-137t-71-102t-39-52zm310 210q0 106-75 181t-181 75t-181-75t-75-181q0-26 5 56q-86-8-165.5-43T112.5 650T64 531.5T43 372q23 7 53 0t63-16.5T224 328t62-9.5T351 337t63 26q29 20 60.5 27T531 372q0 106-75 181t-181 75t-181-75t-75-181q0-26 5 56q-86-8-165.5-43T112.5 650T64 531.5T43 372q36 0 62 9.5T170 408.5t55 27.5t62 26q29 20 60.5 27T404 491q0 53-13.5 102.5T365 675.5t-79.5 87T214 823q38 0 71-16.5t54-45.5q23-29 41-66.5t28-81.5q35 15 72.5 22t76.5 7q39 0 72-7t72-22q8 43 20.5 81.5t34.5 66.5q23 29 54 45.5t71 16.5q37 0 71.5-16.5t54.5-45.5q23-29 41-66.5t28-81.5q35 15 72.5 22t76.5 7q106 0 181-75t75-181z"/></svg>`,
        document: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M896 384H640V128H192v768h704V384zM832 320v64H704v-64h128zm0 128v64H704v-64h128zm0 128v64H704v-64h128zM192 320h384v64H192v-64zm0 128h384v64H192v-64z"/></svg>`,
        bell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M640 768q0-33-23.5-56.5T560 688t-56.5 23.5T480 768t23.5 56.5T560 848t56.5-23.5T640 768zm-72-80v80H128V688q0-99 68.5-170t167.5-71h1q29 0 56 7t48 22 38.5 33 27 45 14.5 53.5zm288 256q0 11-7 18t-18 7H144q-11 0-18-7t-7-18t7-18t18-7h720q11 0 18 7t7 18z"/></svg>`,
        folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M928 160H576l-64-64H96C43 96 0 139 0 192v640q0 53 43 96h896q53 0 96-43t43-96V224q0-53-43-96zm-16 672H72V231h111l63 63h615v534z"/></svg>`,
        audio: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M512 160c-194 0-352 158-352 352s158 352 352 352s352-158 352-352S706 160 512 160zm0 640c-159 0-288-129-288-288s129-288 288-288s288 129 288 288s-129 288-288 288zm-48-448V160h16v192h-16zm64 0V160h16v192h-16zm64 0V160h16v192h-16z"/></svg>`,
        album: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M928 160H96c-53 0-96 43-96 96v512c0 53 43 96 96 96h832c53 0 96-43 96-96V256c0-53-43-96-96-96zm-16 592H112V272h800v480zM752 384H208V192h544v192z"/></svg>`,
        photo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M928 160H96c-53 0-96 43-96 96v512c0 53 43 96 96 96h832c53 0 96-43 96-96V256c0-53-43-96-96-96zm-16 592H112V272h800v480zm-96-320c0-53-43-96-96-96s-96 43-96 96s43 96 96 96s96-43 96-96z"/></svg>`,
        video: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M896 192H128v576h768V192zm-16 544H144V224h736v512zM320 480v96l288-144L320 288v96h288v96H320z"/></svg>`,
        warning: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M448 128v320l192 96V32L448 128zm64 448h-64V192h64v384zm32-384h-128v448h-64V96q65-14 128-14t128 14v96h-64V192z"/></svg>`,
        clock: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><path fill="currentColor" d="M512 128c-185 0-336 151-336 336s151 336 336 336s336-151 336-336S697 128 512 128zm0 608c-150 0-272-122-272-272s122-272 272-272s272 122 272 272s-122 272-272 272zm64-384v160l128 80l-32 48L448 512l-32-48 128-80V352h160z"/></svg>`
    }
    return icons[iconName] || icons.document
}

const fetchStats = () => {
    loading.value = true
    getDashboardStats().then(res => {
        if (res.code === 200) {
            stats.value = res.data
            // 构建待处理数据列表
            pendingData.value = [
                { label: '待审核音声', count: res.data.pending.audio, icon: 'audio', path: '/audio' },
                { label: '待审核相册', count: res.data.pending.album, icon: 'album', path: '/album' },
                { label: '待审核照片', count: res.data.pending.photo, icon: 'photo', path: '/album' }
            ].filter(item => item.count > 0)
        } else {
            console.error('获取数据失败:', res.message)
        }
        loading.value = false
    }).catch((err) => {
        console.error('请求失败:', err)
        loading.value = false
    })
}

onMounted(() => {
    fetchStats()
})
</script>

<template>
    <div>
        <!-- 欢迎区域 -->
        <div class="welcome-section">
            <div class="welcome-content">
                <h1 class="welcome-title">欢迎回来，{{ userStore.userInfo?.name || '管理员' }}</h1>
                <p class="welcome-subtitle">这是您的管理后台仪表盘</p>
            </div>
            <div class="welcome-decoration"></div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
        </div>

        <!-- 数据概览 -->
        <div v-else-if="stats" class="stats-section">
            <!-- 统计卡片 -->
            <div class="stats-grid">
                <!-- 用户统计 -->
                <div class="stat-card stat-card-primary">
                    <div class="stat-icon" v-html="getIcon('user')"></div>
                    <div class="stat-content">
                        <div class="stat-label">用户总数</div>
                        <div class="stat-value">{{ formatNumber(stats.users.total) }}</div>
                        <div class="stat-detail">
                            <span>今日 +{{ stats.users.todayNew }}</span>
                            <span>本周 +{{ stats.users.weekNew }}</span>
                            <span>本月 +{{ stats.users.monthNew }}</span>
                        </div>
                    </div>
                </div>

                <!-- 内容统计 -->
                <div class="stat-card stat-card-success">
                    <div class="stat-icon" v-html="getIcon('document')"></div>
                    <div class="stat-content">
                        <div class="stat-label">内容总数</div>
                        <div class="stat-value">{{ formatNumber(stats.contents.audio + stats.contents.album + stats.contents.photo) }}</div>
                        <div class="stat-detail">
                            <span>音声 {{ formatNumber(stats.contents.audio) }}</span>
                            <span>相册 {{ formatNumber(stats.contents.album) }}</span>
                            <span>照片 {{ formatNumber(stats.contents.photo) }}</span>
                        </div>
                    </div>
                </div>

                <!-- 公告统计 -->
                <div class="stat-card stat-card-warning">
                    <div class="stat-icon" v-html="getIcon('bell')"></div>
                    <div class="stat-content">
                        <div class="stat-label">公告数量</div>
                        <div class="stat-value">{{ formatNumber(stats.announcements) }}</div>
                        <div class="stat-detail">
                            <span>系统公告</span>
                        </div>
                    </div>
                </div>

                <!-- 企划文档 -->
                <div class="stat-card stat-card-info">
                    <div class="stat-icon" v-html="getIcon('folder')"></div>
                    <div class="stat-content">
                        <div class="stat-label">企划文档</div>
                        <div class="stat-value">{{ formatNumber(stats.planDocuments) }}</div>
                        <div class="stat-detail">
                            <span>项目文档</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 待处理事项 & 直播统计 -->
            <div class="bottom-grid">
                <!-- 待处理事项 -->
                <div class="panel pending-panel">
                    <div class="panel-header">
                        <h3>
                            <span class="panel-icon" v-html="getIcon('warning')"></span>
                            待处理事项
                        </h3>
                        <span class="badge" v-if="stats.pending.total > 0">{{ stats.pending.total }}</span>
                    </div>
                    <div class="panel-content">
                        <div v-if="pendingData.length > 0" class="pending-list">
                            <div v-for="item in pendingData" :key="item.label" class="pending-item">
                                <div class="pending-icon" v-html="getIcon(item.icon)"></div>
                                <span class="pending-label">{{ item.label }}</span>
                                <span class="pending-count">{{ item.count }}</span>
                            </div>
                        </div>
                        <div v-else class="empty-state">
                            <span class="empty-icon" v-html="getIcon('clock')"></span>
                            <span>暂无待处理事项</span>
                        </div>
                    </div>
                </div>

                <!-- 直播统计 -->
                <div class="panel live-panel">
                    <div class="panel-header">
                        <h3>
                            <span class="panel-icon" v-html="getIcon('video')"></span>
                            直播统计
                        </h3>
                        <span v-if="stats.liveStream.isLive" class="live-badge">
                            <span class="live-dot"></span>
                            直播中
                        </span>
                    </div>
                    <div class="panel-content">
                        <div class="live-stats">
                            <div class="live-stat">
                                <div class="live-stat-value">{{ formatNumber(stats.liveStream.totalStreams) }}</div>
                                <div class="live-stat-label">直播场次</div>
                            </div>
                            <div class="live-divider"></div>
                            <div class="live-stat">
                                <div class="live-stat-value">{{ formatHours(stats.liveStream.totalHours) }}</div>
                                <div class="live-stat-label">总时长(h)</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>

/* 欢迎区域 */
.welcome-section {
    position: relative;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 24px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.welcome-content {
    position: relative;
    z-index: 2;
}

.welcome-title {
    font-size: 28px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 8px 0;
}

.welcome-subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
}

.welcome-decoration {
    position: absolute;
    right: -50px;
    top: -50px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
}

.welcome-decoration::before {
    content: '';
    position: absolute;
    right: 30px;
    top: 30px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
}

/* 加载状态 */
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px;
    color: #666;
}

.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e4e8ec;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* 统计卡片 */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
}

.stat-card {
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    display: flex;
    align-items: flex-start;
    gap: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.stat-icon svg {
    width: 28px;
    height: 28px;
}

.stat-card-primary .stat-icon {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
}

.stat-card-success .stat-icon {
    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    color: #fff;
}

.stat-card-warning .stat-icon {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: #fff;
}

.stat-card-info .stat-icon {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: #fff;
}

.stat-content {
    flex: 1;
    min-width: 0;
}

.stat-label {
    font-size: 14px;
    color: #909399;
    margin-bottom: 8px;
}

.stat-value {
    font-size: 32px;
    font-weight: 600;
    color: #303133;
    line-height: 1.2;
    margin-bottom: 8px;
}

.stat-detail {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 12px;
    color: #909399;
}

/* 底部面板 */
.bottom-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 20px;
}

.panel {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
}

.panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #f0f0f0;
}

.panel-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
}

.panel-icon {
    width: 20px;
    height: 20px;
    display: flex;
}

.panel-icon svg {
    width: 100%;
    height: 100%;
}

.badge {
    background: #f56c6c;
    color: #fff;
    font-size: 12px;
    padding: 2px 10px;
    border-radius: 10px;
    font-weight: 500;
}

.panel-content {
    padding: 20px 24px;
}

/* 待处理列表 */
.pending-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.pending-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: #f8f9fa;
    border-radius: 8px;
    transition: background 0.2s;
    cursor: pointer;
}

.pending-item:hover {
    background: #f0f2f5;
}

.pending-icon {
    width: 32px;
    height: 32px;
    color: #606266;
}

.pending-icon svg {
    width: 100%;
    height: 100%;
}

.pending-label {
    flex: 1;
    font-size: 14px;
    color: #606266;
}

.pending-count {
    font-size: 18px;
    font-weight: 600;
    color: #f56c6c;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #909399;
}

.empty-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
    opacity: 0.5;
}

.empty-icon svg {
    width: 100%;
    height: 100%;
}

/* 直播统计 */
.live-stats {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40px;
}

.live-stat {
    text-align: center;
}

.live-stat-value {
    font-size: 36px;
    font-weight: 600;
    color: #303133;
    line-height: 1.2;
}

.live-stat-label {
    font-size: 14px;
    color: #909399;
    margin-top: 4px;
}

.live-divider {
    width: 1px;
    height: 60px;
    background: #e4e8ec;
}

.live-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f56c6c;
    color: #fff;
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: 500;
}

.live-dot {
    width: 8px;
    height: 8px;
    background: #fff;
    border-radius: 50%;
    animation: pulse 1.5s infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.2); }
}

/* 响应式 */
@media screen and (max-width: 768px) {
    .dashboard {
        padding: 12px;
    }

    .welcome-section {
        padding: 20px;
    }

    .welcome-title {
        font-size: 22px;
    }

    .stat-card {
        padding: 16px;
    }

    .stat-value {
        font-size: 26px;
    }

    .stats-grid {
        grid-template-columns: 1fr;
    }

    .bottom-grid {
        grid-template-columns: 1fr;
    }
}
</style>
