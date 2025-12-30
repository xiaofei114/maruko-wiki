<template>
  <div class="live-room-page">
    <!-- 顶部导航栏 -->
    <Top/>
    <div class="body">
      <!-- 主播信息卡片 -->
      <div class="anchor-card">
        <div class="avatar-section">
          <div class="avatar">
            <img :src="defaultAvatar" alt="主播头像">
          </div>
          <div class="anchor-basic">
            <h2 class="anchor-name">{{ anchorName }}</h2>
            <p class="anchor-id">房间号: {{ roomInfo.short_id || roomInfo.room_id || '---' }}</p>
          </div>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载直播间信息...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-container">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <button @click="fetchRoomInfo" class="retry-btn">重试</button>
      </div>

      <!-- 主要内容 -->
      <div v-else class="main-content">

        <div class="module-card fans-module">
          <div class="module-header">
            <i class="fas fa-heart"></i>
            <h2>粉丝数量</h2>
          </div>
          <div class="module-body">
            <div class="fans-count">
              <el-statistic :value="roomInfo.attention">
                <template #title>
                  <div
                      style="display: inline-flex; align-items: center;color: #409eff;font-size: 15px;font-weight: bold;">
                    丸子今天10w粉了吗？
                  </div>
                </template>
                <template #suffix>/100,000</template>
              </el-statistic>
              <div style="font-size: 13px;color: #52c41a;">
                距离10w粉还差 {{ formatNumber(100000 - roomInfo.attention) }} 粉丝
              </div>
            </div>
          </div>
        </div>

        <div class="module-card revenue-module">
          <div class="module-header">
            <i class="fas fa-chart-line"></i>
            <h2>舰长数量</h2>
          </div>
          <div class="module-body">
            <div class="fans-count">
              <el-statistic :value="captain.length">
                <template #title>
                  <div
                      style="display: inline-flex; align-items: center;color: #409eff;font-size: 15px;font-weight: bold;">
                    今天又多了几个爹呢？
                  </div>
                </template>
                <template #suffix>位舰长大人</template>
              </el-statistic>
              <div style="font-size: 13px;color: #52c41a;">
                距离千舰还差 {{ formatNumber(1000 - captain.length) }} 个舰长
              </div>
            </div>
          </div>
        </div>

        <div class="module-card status-module">
          <div class="module-header">
            <i class="fas fa-satellite-dish"></i>
            <h2>直播状态</h2>
          </div>
          <img class="module-img" :src="roomInfo.user_cover" alt="直播封面">
          <div class="module-body">
            <div class="status-content">
              <div class="status-indicator" :class="getStatusClass(roomInfo.live_status)">
                {{ getStatusText(roomInfo.live_status) }}
              </div>
              <div v-if="roomInfo.live_status === 1" class="online-count">
                <i class="fas fa-eye"></i>
                当前观看人数: <strong>{{ formatNumber(roomInfo.online) }}</strong>
              </div>
              <div v-else class="offline-notice">
                主播当前未开播
              </div>
            </div>
          </div>
        </div>

        <div class="module-card info-module" v-if="roomInfo.live_status !== 0">
          <div class="module-header">
            <i class="fas fa-info-circle"></i>
            <h2>直播信息</h2>
          </div>
          <div class="module-body">
            <div class="info-grid">
              <div class="info-item">
                <span class="label"><i class="fas fa-map-marker-alt"></i> 分区:</span>
                <span class="value">{{ roomInfo.parent_area_name || '---' }} - {{ roomInfo.area_name || '---' }}</span>
              </div>
              <div class="info-item">
                <span class="label"><i class="fas fa-clock"></i> 开始时间:</span>
                <span class="value">{{ roomInfo.live_time || '---' }}</span>
              </div>
              <div class="info-item full-width">
                <span class="label"><i class="fas fa-heading"></i> 直播标题:</span>
                <span class="value">{{ roomInfo.title || '---' }}</span>
              </div>
              <div class="info-item full-width" v-if="roomInfo.description">
                <span class="label"><i class="fas fa-align-left"></i> 直播间描述:</span>
                <span class="value">{{ roomInfo.description }}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 分隔线 -->
      <hr class="section-divider">

      <!-- 丸子专区 -->
      <div class="maruko-section">
        <div class="maruko-content">
          <div class="module-card photo-album-module" @click="goToPhotoAlbum" style="cursor: pointer;">
            <div class="module-header">
              <i class="fas fa-images"></i>
              <h2>丸子相簿</h2>
            </div>
            <div class="module-body">
              <div class="album-content">
                <div class="album-placeholder">
                  <p>记录精彩时刻，与你分享美好时光</p>
                </div>
              </div>
            </div>
          </div>

          <div class="module-card message-module" @click="goToAudio" style="cursor: pointer;">
            <div class="module-header">
              <i class="fas fa-comment-dots"></i>
              <h2>丸子音声</h2>
            </div>
            <div class="module-body">
              <div class="message-content">
                <div class="message-placeholder">
                  <p>聆听奇妙回响，与你分享此刻欢愉</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {ref, onMounted} from 'vue'
import {useRouter} from 'vue-router'
import Top from '@/components/Top.vue'
import {getRoomInfo, getMasterInfo, getTopListNew} from '@/api/bilibiliApis.js'

const router = useRouter()

// 响应式数据
const loading = ref(true)
const error = ref(null)
const anchorName = ref('猫丸子Maruko') // 可以在这里修改为主播名字
const defaultAvatar = ref("https://i2.hdslb.com/bfs/face/037080004e33990818de22a63394c7de53c0e92c.jpg")

const roomInfo = ref({})
const captain = ref([])
const tags = ref([])

// 获取直播状态文本
const getStatusText = (status) => {
  const statusMap = {
    0: '未开播',
    1: '直播中',
    2: '轮播中'
  }
  return statusMap[status] || '未知状态'
}

// 获取直播状态对应的CSS类
const getStatusClass = (status) => {
  const classMap = {
    0: 'status-offline',
    1: 'status-live',
    2: 'status-replay'
  }
  return classMap[status] || 'status-unknown'
}

// 获取直播状态图标
const getStatusIcon = (status) => {
  const iconMap = {
    0: 'fas fa-moon',
    1: 'fas fa-broadcast-tower',
    2: 'fas fa-redo'
  }
  return iconMap[status] || 'fas fa-question'
}

// 格式化数字（添加千位分隔符）
const formatNumber = (num) => {
  if (!num && num !== 0) return '---'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 导航到相簿页面
const goToPhotoAlbum = () => {
  router.push('/photo-album')
}

// 导航到音频页面
const goToAudio = () => {
  router.push('/audio')
}

// 获取直播间信息
const fetchRoomInfo = async () => {
  const res = await getRoomInfo()

  if (res.code === 0) {
    roomInfo.value = res.data
    tags.value = res.data.tags ? res.data.tags.split(',') : []
  } else {
    error.value = res.message || res.msg || '获取直播间信息失败'
  }
}

const getUserInfo = async () => {
  loading.value = true

  const userInfo = await getMasterInfo()

  defaultAvatar.value = userInfo.data.info.face

  loading.value = false
}

const getCaptain = async (list = [], page = 1) => {
  let all = [...list]
  const captainInfo = await getTopListNew(page)

  if (page == 1) {
    all.push(...captainInfo.data.top3)
  }

  if (captainInfo.data.list.length > 0) {
    const nextPageData = await getCaptain([...all, ...captainInfo.data.list], page + 1)
    return nextPageData
  }

  return all
}

const getThings = async () => {
  captain.value = await getCaptain()
}

// 组件挂载后获取直播间信息
onMounted(() => {
  //每分钟获取一次
  setInterval(fetchRoomInfo, 60000)
  fetchRoomInfo()
  getUserInfo()
  getThings()
})
</script>

<style scoped>
.live-room-page {
  max-width: 100vw;
  background: #f5f7fa;
  min-height: 100vh;
  box-sizing: border-box;
}

.body {
  padding: 20px;
}

.page-header h1 {
  color: #409eff;
  font-size: 28px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.page-header h1 i {
  font-size: 24px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.error-container i {
  font-size: 50px;
  color: #ff4d4f;
  margin-bottom: 15px;
}

.error-container h3 {
  color: #333;
  margin-bottom: 10px;
}

.error-container p {
  color: #666;
  margin-bottom: 20px;
}

.retry-btn {
  background: #409eff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.retry-btn:hover {
  background: #337ecc;
}

.anchor-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #409eff;
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.3);
}

.avatar img {
  width: 100%;
  height: 100%;
}

.anchor-name {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.anchor-id {
  color: #666;
  font-size: 14px;
}

.room-id .label {
  color: #666;
  margin-right: 5px;
}

.room-id .value {
  font-weight: 600;
  color: #409eff;
}

.main-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
}

.module-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

/* 可点击卡片的特殊样式 */
.photo-album-module:hover,
.message-module:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 25px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.2);
}

.photo-album-module,
.message-module {
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.module-header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #fafbfc;
  border-bottom: 1px solid #f0f2f5;
}

.module-header i {
  color: #409eff;
  font-size: 18px;
  margin-right: 10px;
}

.module-header h2 {
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.module-img {
  position: absolute;
  width: 100%;
  z-index: 1;
  opacity: 0.7;
}

.module-body {
  padding: 20px;
  position: relative;
  z-index: 2;
}

.status-content {
  text-align: center;
  padding: 10px 0;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  padding: 10px 20px;
  border-radius: 30px;
  color: white;
  font-weight: 600;
  margin-bottom: 15px;
  font-size: 16px;
}

.online-count {
  font-size: 16px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.online-count strong {
  color: #ff4d4f;
  font-size: 18px;
}

.offline-notice {
  color: #999;
  font-style: italic;
}

.fans-count {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
  text-align: center;
  margin: 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-direction: column;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item .label {
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.info-item .value {
  color: #333;
  font-weight: 500;
  word-break: break-word;
}

.revenue-placeholder i,
.other-placeholder i {
  font-size: 40px;
  margin-bottom: 10px;
  color: #d9d9d9;
}

/* 丸子相簿样式 */
.album-content,
.message-content {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-placeholder,
.message-placeholder {
  text-align: center;
  color: #999;
}

.album-placeholder i,
.message-placeholder i {
  font-size: 40px;
  margin-bottom: 10px;
  color: #d9d9d9;
}

.album-placeholder p,
.message-placeholder p {
  font-size: 16px;
  margin: 0;
  color: #666;
}

.revenue-item .value {
  font-weight: 600;
  color: #409eff;
  font-size: 18px;
}

.cover-image img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 分隔线样式 */
.section-divider {
  margin: 40px 0;
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #409eff 20%, #409eff 80%, transparent 100%);
  opacity: 0.3;
}

/* 丸子专区样式 */
.maruko-section {
  margin-top: 20px;
}

.maruko-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
}

/* 移动端统计数字优化 */
@media (max-width: 768px) {
  .fans-count {
    text-align: center;
    margin: 15px 0;
  }
}

/* 响应式设计 */
/* 大屏优化 (>1200px) */
@media (min-width: 1200px) {

  .anchor-card {
    padding: 30px;
    gap: 25px;
  }

  .avatar {
    width: 90px;
    height: 90px;
  }
}

/* 中等屏幕 (769px-1199px) */
@media (min-width: 769px) and (max-width: 1199px) {

  .anchor-card {
    padding: 20px;
    gap: 20px;
  }
}

/* 平板 (481px-768px) */
@media (max-width: 768px) {

  .main-content {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .maruko-content {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .anchor-card {
    flex-direction: column;
    text-align: center;
    padding: 20px;
    gap: 15px;
  }

  .avatar-section {
    justify-content: center;
  }

  .avatar {
    width: 70px;
    height: 70px;
  }

  .anchor-name {
    font-size: 20px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .module-card {
    padding: 15px;
  }

  .module-header {
    padding: 0 15px;
  }

  .module-header h2 {
    font-size: 16px;
  }

  .fans-count {
    font-size: 24px;
    margin: 10px 0;
  }

  .floating-login-btn i {
    font-size: 14px;
  }

  /* 触摸设备优化 */
  .module-card {
    -webkit-tap-highlight-color: rgba(64, 158, 255, 0.1);
  }

  .photo-album-module,
  .message-module {
    cursor: pointer;
    -webkit-tap-highlight-color: rgba(64, 158, 255, 0.15);
  }

  /* 优化按钮触摸体验 */
  .retry-btn {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* 小屏手机 (≤480px) */
@media (max-width: 480px) {

  .body {
    padding: 15px 5px;
  }

  .anchor-card {
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 10px;
  }

  .avatar {
    width: 60px;
    height: 60px;
  }

  .avatar-section {
    gap: 12px;
  }

  .anchor-name {
    font-size: 18px;
  }

  .anchor-id {
    font-size: 13px;
  }

  .main-content {
    gap: 12px;
  }

  .maruko-content {
    gap: 12px;
  }

  .module-card {
    padding: 12px;
    border-radius: 10px;
  }

  .module-header {
    padding: 0 12px;
  }

  .module-header h2 {
    font-size: 15px;
  }

  .module-body {
    padding: 15px 12px;
  }

  .fans-count {
    font-size: 20px;
    margin: 8px 0;
  }

  .info-grid {
    gap: 12px;
  }

  .info-item .label,
  .info-item .value {
    font-size: 13px;
  }

  .section-divider {
    margin: 30px 0;
  }
}

/* 超小屏幕 (≤375px) */
@media (max-width: 375px) {
  .anchor-card {
    padding: 12px;
  }

  .avatar {
    width: 55px;
    height: 55px;
  }

  .anchor-name {
    font-size: 16px;
  }

  .anchor-id {
    font-size: 12px;
  }

  .module-card {
    padding: 10px;
  }

  .module-header h2 {
    font-size: 14px;
  }

  .module-body {
    padding: 12px 10px;
  }

  .fans-count {
    font-size: 18px;
    margin: 6px 0;
  }

  .retry-btn {
    padding: 8px 16px;
    font-size: 13px;
  }
}

/* 横屏手机适配 */
@media screen and (max-width: 896px) and (orientation: landscape) {

  .body {
    padding: 10px 5px;
  }

  .anchor-card {
    padding: 12px;
    margin-bottom: 15px;
  }

  .avatar {
    width: 50px;
    height: 50px;
  }

  .anchor-name {
    font-size: 16px;
  }

  .module-card {
    padding: 10px;
  }

  .module-header {
    padding: 0 10px;
  }

  .module-header h2 {
    font-size: 14px;
  }

  .module-body {
    padding: 10px;
  }

  .fans-count {
    font-size: 16px;
  }

}

</style>