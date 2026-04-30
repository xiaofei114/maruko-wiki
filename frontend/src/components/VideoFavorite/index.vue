<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Loading, Trophy, Folder, FolderOpened, Plus, Star } from '@element-plus/icons-vue'
import {
  getWeeklyTop,
  getFavoriteList,
  createFavorite
} from '@/api/videoFavorite'
import PageHero from '@/components/ComponentStyle/PageHero.vue'

const nickName = import.meta.env.VITE_APP_NICK_NAME;

const router = useRouter()

const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)

const weeklyTop = ref([])
const favorites = ref([])
const topLoading = ref(false)
const favoriteLoading = ref(false)

const createFavoriteDialogVisible = ref(false)
const createFavoriteForm = ref({
  name: '',
  description: ''
})

async function fetchFavoriteList() {
  try {
    favoriteLoading.value = true
    const res = await getFavoriteList()
    if (res.success) {
      favorites.value = res.data?.favorites || []
    }
  } catch (err) {
    console.error('获取收藏夹列表失败:', err)
  } finally {
    favoriteLoading.value = false
  }
}

async function fetchWeeklyTop() {
  try {
    topLoading.value = true
    const res = await getWeeklyTop(10)
    weeklyTop.value = res.data || []
  } catch (err) {
    console.error('获取排行榜失败:', err)
  } finally {
    topLoading.value = false
  }
}

function openFavorite(favoriteId) {
  router.push(`/video-favorite/${favoriteId}`)
}

function openAllVideos() {
  router.push('/video-favorite/all')
}

function openBilibiliVideo(bvid) {
  window.open(`https://www.bilibili.com/video/${bvid}`, '_blank')
}

function getFullImageUrl(relativeUrl) {
  if (!relativeUrl) return ''
  if (relativeUrl.startsWith('http')) return relativeUrl
  if (relativeUrl.startsWith('/api/')) {
    const serverUrl = import.meta.env.VITE_APP_BASE_URL?.replace('/api', '')
    return serverUrl + relativeUrl
  }
  const baseUrl = import.meta.env.VITE_APP_BASE_URL
  return baseUrl + relativeUrl
}

function openCreateFavoriteDialog() {
  createFavoriteDialogVisible.value = true
  createFavoriteForm.value = { name: '', description: '' }
}

function closeCreateFavoriteDialog() {
  createFavoriteDialogVisible.value = false
}

async function handleCreateFavorite() {
  if (!createFavoriteForm.value.name.trim()) {
    ElMessage.error('请输入收藏夹名称')
    return
  }

  try {
    const res = await createFavorite({
      name: createFavoriteForm.value.name.trim(),
      description: createFavoriteForm.value.description.trim()
    })
    ElMessage.success(res.message || '收藏夹创建成功')
    closeCreateFavoriteDialog()
    fetchFavoriteList()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '创建失败')
  }
}

onMounted(() => {
  fetchFavoriteList()
  fetchWeeklyTop()
})
</script>

<template>
  <div class="video-favorite-page">
    <PageHero :title="`${nickName}视频`" subtitle="汇集二创剪影，邀你编织闪耀星光" />

    <div class="content-wrapper">
      <!-- 本周排行榜 -->
      <section class="content-section">
        <div class="section-header">
          <div class="section-title">
            <el-icon><Trophy /></el-icon>
            <h2>本周推荐榜</h2>
            <span class="section-badge">TOP 10</span>
          </div>
          <span class="section-desc">每周推荐最高的视频将登上首页</span>
        </div>

        <div v-if="topLoading" class="section-loading">
          <el-icon class="loading-icon"><Loading /></el-icon>
        </div>
        <div v-else-if="weeklyTop.length === 0" class="section-empty">
          <el-empty description="暂无推荐数据" :image-size="60" />
        </div>
        <div v-else class="ranking-list">
          <div
            v-for="(video, index) in weeklyTop"
            :key="video.id"
            class="ranking-item"
            :class="'rank-' + (index + 1)"
            @click="openBilibiliVideo(video.bvid)"
          >
            <div class="ranking-rank-col">
              <div v-if="index === 0" class="rank-medal rank-gold">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div v-else-if="index === 1" class="rank-medal rank-silver">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div v-else-if="index === 2" class="rank-medal rank-bronze">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <div v-else class="rank-number">{{ index + 1 }}</div>
            </div>
            <div class="ranking-cover">
              <el-image
                :src="getFullImageUrl(video.cover)"
                fit="cover"
                lazy
              >
                <template #error>
                  <div class="cover-placeholder">
                    <el-icon size="20"><Folder /></el-icon>
                  </div>
                </template>
              </el-image>
            </div>
            <div class="ranking-info">
              <h4 class="ranking-title" :title="video.title">{{ video.title }}</h4>
              <p class="ranking-uploader">{{ video.uploaderName }}</p>
            </div>
            <div class="ranking-meta">
              <div class="ranking-stars">
                <el-icon v-for="n in Math.min(Math.ceil(video.weeklyRecommend / 2), 5)" :key="n"><Star /></el-icon>
              </div>
              <span class="ranking-count">{{ video.weeklyRecommend }} 推荐</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 收藏夹 -->
      <section class="content-section">
        <div class="section-header">
          <div class="section-title">
            <el-icon><Folder /></el-icon>
            <h2>收藏夹</h2>
            <span class="section-badge">{{ favorites.length }}</span>
          </div>
          <div class="section-actions">
            <el-button
              v-if="isAuthenticated"
              type="primary"
              plain
              @click="openCreateFavoriteDialog"
            >
              <el-icon><Plus /></el-icon>
              新建收藏夹
            </el-button>
          </div>
        </div>

        <div v-if="favoriteLoading" class="section-loading">
          <el-icon class="loading-icon"><Loading /></el-icon>
        </div>
        <div v-else-if="favorites.length === 0" class="section-empty">
          <el-empty description="暂无收藏夹" :image-size="60" />
        </div>
        <div v-else class="favorites-grid">
          <div
            class="favorite-card"
            @click="openAllVideos"
          >
            <div class="favorite-card-cover all-cover">
              <el-icon size="48"><FolderOpened /></el-icon>
              <div class="favorite-card-overlay">
                <span>浏览全部</span>
              </div>
            </div>
            <div class="favorite-card-body">
              <h4>全部视频</h4>
              <p>浏览所有收藏的视频</p>
            </div>
          </div>
          <div
            v-for="favorite in favorites"
            :key="favorite.id"
            class="favorite-card"
            @click="openFavorite(favorite.id)"
          >
            <div class="favorite-card-cover">
              <el-image
                v-if="favorite.cover"
                :src="getFullImageUrl(favorite.cover)"
                fit="cover"
              />
              <el-icon v-else size="40"><Folder /></el-icon>
              <div class="favorite-card-overlay">
                <span>{{ favorite.videoCount }} 个视频</span>
              </div>
            </div>
            <div class="favorite-card-body">
              <h4 :title="favorite.name">{{ favorite.name }}</h4>
              <p v-if="favorite.description" :title="favorite.description">{{ favorite.description }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 创建收藏夹对话框 -->
    <el-dialog
      v-model="createFavoriteDialogVisible"
      title="新建收藏夹"
      width="520px"
      :close-on-click-modal="false"
      class="create-dialog"
    >
      <el-form label-width="80px">
        <el-form-item label="名称" required>
          <el-input
            v-model="createFavoriteForm.name"
            placeholder="给收藏夹起个名字"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="createFavoriteForm.description"
            type="textarea"
            :rows="3"
            placeholder="介绍一下这个收藏夹（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeCreateFavoriteDialog">取消</el-button>
        <el-button type="primary" @click="handleCreateFavorite">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
@use '@/assets/theme' as *;

.video-favorite-page {
  min-height: 100vh;
  background: var(--color-primary-alpha-05);
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 20px 60px;
}

.content-section {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-title :deep(.el-icon) {
  font-size: 22px;
  color: var(--color-primary);
}

.section-title h2 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}

.section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 8px;
  background: var(--color-primary-alpha-10);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 600;
  border-radius: 12px;
}

.section-desc {
  font-size: 13px;
  color: #909399;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  gap: 16px;
}

.section-empty {
  display: flex;
  justify-content: center;
  padding: 40px 20px;
}

.loading-icon {
  font-size: 32px;
  animation: spin 1s linear infinite;
  color: var(--color-primary);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-alpha-10);
  color: var(--color-primary-alpha-40);
  font-size: 28px;
}

/* ========== 排行榜 ========== */
.ranking-list {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--color-primary-alpha-05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  min-width: 0;
}

.ranking-item:hover {
  background: var(--color-primary-alpha-10);
  border-color: var(--color-primary-alpha-20);
  transform: translateX(3px);
}

.ranking-item.rank-1 {
  background: linear-gradient(135deg, #fff9e6, #fff3cc);
  border-color: #ffd700;
}

.ranking-item.rank-2 {
  background: linear-gradient(135deg, #f5f7fc, #eef0f5);
  border-color: #d0d4dd;
}

.ranking-item.rank-3 {
  background: linear-gradient(135deg, #fff5e6, #ffedd4);
  border-color: #ffc08a;
}

.ranking-rank-col {
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rank-medal {
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-gold svg {
  width: 22px;
  height: 22px;
  color: #ffd700;
  filter: drop-shadow(0 1px 3px rgba(255, 215, 0, 0.4));
}

.rank-silver svg {
  width: 20px;
  height: 20px;
  color: #a8b0c0;
  filter: drop-shadow(0 1px 3px rgba(168, 176, 192, 0.3));
}

.rank-bronze svg {
  width: 19px;
  height: 19px;
  color: #cd7f32;
  filter: drop-shadow(0 1px 3px rgba(205, 127, 50, 0.3));
}

.rank-number {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-alpha-10);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  border-radius: 50%;
}

.ranking-item.rank-1 .rank-number,
.ranking-item.rank-2 .rank-number,
.ranking-item.rank-3 .rank-number {
  display: none;
}

.ranking-cover {
  position: relative;
  width: 80px;
  height: 45px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.ranking-cover .el-image {
  width: 100%;
  height: 100%;
}

.ranking-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
}

.ranking-title {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a2e;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking-item.rank-1 .ranking-title {
  color: #b8860b;
}

.ranking-uploader {
  font-size: 11px;
  color: #909399;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ranking-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
  min-width: 64px;
}

.ranking-stars {
  display: flex;
  gap: 1px;
}

.ranking-stars .el-icon {
  font-size: 12px;
  color: #e8e8e8;
}

.ranking-item.rank-1 .ranking-stars .el-icon { color: #ffd700; }
.ranking-item.rank-2 .ranking-stars .el-icon { color: #c0c0c0; }
.ranking-item.rank-3 .ranking-stars .el-icon { color: #cd7f32; }
.ranking-item:not(.rank-1):not(.rank-2):not(.rank-3) .ranking-stars .el-icon { color: var(--color-primary); }

.ranking-count {
  font-size: 11px;
  font-weight: 500;
  color: #909399;
  white-space: nowrap;
}

/* ========== 收藏夹 ========== */
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.favorite-card {
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-primary-alpha-05);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.favorite-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--color-primary-alpha-30);
}

.favorite-card-cover {
  position: relative;
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary-alpha-10);
  color: var(--color-primary-alpha-50);
  overflow: hidden;
}

.favorite-card-cover .el-image {
  width: 100%;
  height: 100%;
  transition: transform 0.4s ease;
}

.favorite-card:hover .favorite-card-cover .el-image {
  transform: scale(1.08);
}

.favorite-card-cover.all-cover {
  background: linear-gradient(135deg, var(--color-primary-alpha-30), var(--color-primary-alpha-50));
  color: rgba(255, 255, 255, 0.9);
}

.favorite-card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 14px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  transform: translateY(100%);
  transition: transform 0.3s ease;
}

.favorite-card:hover .favorite-card-overlay {
  transform: translateY(0);
}

.all-cover .favorite-card-overlay {
  transform: translateY(0);
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.4));
}

.favorite-card-body {
  padding: 12px;
}

.favorite-card-body h4 {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a2e;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.favorite-card-body p {
  font-size: 12px;
  color: #909399;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ========== 手机端适配 ========== */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 12px 12px 40px;
  }

  .content-section {
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 16px;
  }

  .section-title {
    gap: 6px;
  }

  .section-title :deep(.el-icon) {
    font-size: 18px;
  }

  .section-title h2 {
    font-size: 16px;
  }

  .section-badge {
    min-width: 24px;
    height: 20px;
    padding: 0 6px;
    font-size: 11px;
  }

  .section-desc {
    font-size: 12px;
  }

  /* 排行榜手机端适配 */
  .ranking-list {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .ranking-item {
    padding: 8px 10px;
    gap: 10px;
  }

  .ranking-rank-col {
    width: 24px;
  }

  .rank-gold svg {
    width: 20px;
    height: 20px;
  }

  .rank-silver svg {
    width: 18px;
    height: 18px;
  }

  .rank-bronze svg {
    width: 17px;
    height: 17px;
  }

  .rank-number {
    width: 20px;
    height: 20px;
    font-size: 11px;
  }

  .ranking-cover {
    width: 70px;
    height: 40px;
  }

  .ranking-title {
    font-size: 12px;
  }

  .ranking-uploader {
    font-size: 10px;
  }

  .ranking-meta {
    min-width: 50px;
  }

  .ranking-stars .el-icon {
    font-size: 10px;
  }

  .ranking-count {
    font-size: 10px;
  }

  /* 收藏夹手机端适配 */
  .favorites-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .favorite-card-cover {
    height: 90px;
  }

  .favorite-card-cover .el-icon {
    font-size: 32px;
  }

  .favorite-card-overlay {
    padding: 8px 10px;
    font-size: 11px;
    transform: translateY(0);
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
  }

  .favorite-card-body {
    padding: 10px;
  }

  .favorite-card-body h4 {
    font-size: 13px;
  }

  .favorite-card-body p {
    font-size: 11px;
  }

  /* 创建收藏夹对话框手机端适配 */
  :deep(.create-dialog) {
    width: 90% !important;
    max-width: 400px;
  }

  :deep(.create-dialog .el-dialog__body) {
    padding: 16px;
  }

  :deep(.create-dialog .el-form-item__label) {
    font-size: 13px;
  }

  :deep(.create-dialog .el-input__inner) {
    font-size: 14px;
  }
}

/* 小屏手机适配 */
@media (max-width: 480px) {
  .content-wrapper {
    padding: 8px 8px 32px;
  }

  .content-section {
    padding: 12px;
    border-radius: 10px;
  }

  .section-title h2 {
    font-size: 15px;
  }

  /* 排行榜小屏适配 */
  .ranking-item {
    padding: 6px 8px;
    gap: 8px;
  }

  .ranking-cover {
    width: 60px;
    height: 34px;
  }

  .ranking-title {
    font-size: 11px;
  }

  .ranking-uploader {
    font-size: 9px;
  }

  .ranking-meta {
    min-width: 45px;
  }

  .ranking-count {
    font-size: 9px;
  }

  /* 收藏夹小屏适配 */
  .favorites-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .favorite-card-cover {
    height: 80px;
  }

  .favorite-card-cover .el-icon {
    font-size: 28px;
  }

  .favorite-card-body {
    padding: 8px;
  }

  .favorite-card-body h4 {
    font-size: 12px;
    margin-bottom: 2px;
  }

  .favorite-card-body p {
    font-size: 10px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 375px) {
  .favorites-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .favorite-card-cover {
    height: 100px;
  }
}
</style>
