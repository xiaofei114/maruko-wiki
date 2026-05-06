<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Plus, Star, VideoPlay, Folder, Loading } from '@element-plus/icons-vue'
import {
  getVideoList,
  getWeeklyTop,
  uploadVideo,
  recommendVideo,
  checkHasRecommended,
  getFavoriteDetail,
  getMyFavorites
} from '@/api/videoFavorite'

const route = useRoute()
const router = useRouter()

const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)

const isAllMode = computed(() => route.params.id === 'all')
const favoriteId = computed(() => {
  const id = route.params.id
  if (id === 'all') return null
  return parseInt(id)
})

const favoriteDetail = ref(null)
const videoList = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const loading = ref(false)
const hasMore = ref(true)
const error = ref(null)

const userRecommendations = ref(new Set())

const uploadDialogVisible = ref(false)
const uploadForm = ref({
  bvid: '',
  favoriteId: null
})
const myFavorites = ref([])

const uploadFormRules = {
  bvid: [
    { required: true, message: '请输入视频BV号', trigger: 'blur' },
    { pattern: /^BV[a-zA-Z0-9]{10}$/, message: 'BV号格式不正确（以BV开头的12位字符）', trigger: 'blur' }
  ]
}

async function fetchFavoriteDetail() {
  if (isAllMode.value) return
  try {
    const res = await getFavoriteDetail(favoriteId.value)
    if (res.success) {
      favoriteDetail.value = res.data
    } else {
      ElMessage.error('收藏夹不存在')
      router.push('/video-favorite')
    }
  } catch (err) {
    ElMessage.error('获取收藏夹信息失败')
    router.push('/video-favorite')
  }
}

async function fetchVideoList() {
  try {
    loading.value = true
    error.value = null
    const res = await getVideoList(currentPage.value, pageSize.value, favoriteId.value)
    const list = res.data?.list || []
    if (currentPage.value === 1) {
      videoList.value = list
    } else {
      videoList.value.push(...list)
    }
    total.value = res.data?.total || 0
    hasMore.value = videoList.value.length < total.value

    if (isAuthenticated.value) {
      checkUserRecommendations(list)
    }
  } catch (err) {
    error.value = '获取视频列表失败，请稍后重试'
    ElMessage.error('获取视频列表失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function checkUserRecommendations(videos) {
  try {
    for (const video of videos) {
      const res = await checkHasRecommended(video.id)
      if (res.data?.hasRecommended) {
        userRecommendations.value.add(video.id)
      }
    }
  } catch (err) {
    console.error('检查推荐状态失败:', err)
  }
}

function loadMore() {
  if (!hasMore.value || loading.value) return
  currentPage.value++
  fetchVideoList()
}

function openUploadDialog() {
  uploadDialogVisible.value = true
  uploadForm.value = { bvid: '', favoriteId: isAllMode.value ? null : favoriteId.value }
  fetchMyFavorites()
}

function closeUploadDialog() {
  uploadDialogVisible.value = false
}

async function fetchMyFavorites() {
  if (!isAuthenticated.value) return
  try {
    const res = await getMyFavorites()
    if (res.success) {
      myFavorites.value = res.data || []
    }
  } catch (err) {
    console.error('获取我的收藏夹失败:', err)
  }
}

async function handleUploadVideo() {
  if (!uploadForm.value.bvid.trim()) {
    ElMessage.error('请输入视频BV号')
    return
  }

  const bvPattern = /^BV[a-zA-Z0-9]{10}$/
  if (!bvPattern.test(uploadForm.value.bvid.trim())) {
    ElMessage.error('BV号格式不正确')
    return
  }

  try {
    const response = await uploadVideo(
      uploadForm.value.bvid.trim(),
      uploadForm.value.favoriteId
    )
    ElMessage.success(response.message || '视频上传成功')
    closeUploadDialog()
    fetchVideoList()
  } catch (err) {
    ElMessage.error(err.response?.data?.message || '上传失败，请稍后重试')
  }
}

async function handleRecommend(video) {
  if (!isAuthenticated.value) {
    ElMessage.warning('请先登录')
    return
  }

  if (userRecommendations.value.has(video.id)) {
    ElMessage.info('您本周已经推荐过该视频了')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要推荐视频"${video.title}"吗？每人每周可对每个视频推荐一次。`,
      '确认推荐',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    const response = await recommendVideo(video.id)
    ElMessage.success(response.message || '推荐成功')
    userRecommendations.value.add(video.id)
    video.weeklyRecommend = (video.weeklyRecommend || 0) + 1
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error(err.response?.data?.message || '推荐失败')
    }
  }
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

function goBack() {
  router.push('/video-favorite')
}

function refreshList() {
  currentPage.value = 1
  fetchVideoList()
}

onMounted(async () => {
  if (!isAllMode.value) {
    await fetchFavoriteDetail()
  }
  fetchVideoList()
})
</script>

<template>
  <div class="video-favorite-detail-page">
    <div class="content-wrapper">
      <!-- 返回按钮和信息头 -->
      <div class="detail-header">
        <div class="header-left">
          <el-button class="back-button" text @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回收藏夹列表
          </el-button>
        </div>
        <div class="header-info">
          <template v-if="isAllMode">
            <h1>全部视频</h1>
            <p>浏览所有收藏的视频</p>
          </template>
          <template v-else-if="favoriteDetail">
            <h1>{{ favoriteDetail.name }}</h1>
            <p v-if="favoriteDetail.description">{{ favoriteDetail.description }}</p>
            <span class="header-meta">
              <span class="header-count">{{ favoriteDetail.videoCount }} 个视频</span>
              <span v-if="favoriteDetail.userName" class="header-user">{{ favoriteDetail.userName }}</span>
            </span>
          </template>
        </div>
        <div class="header-right">
          <el-button v-if="isAuthenticated" type="primary" @click="openUploadDialog">
            <el-icon><Plus /></el-icon>
            上传视频
          </el-button>
        </div>
      </div>

      <!-- 视频列表 -->
      <section class="video-section">
        <div class="section-header">
          <div class="section-title">
            <el-icon><VideoPlay /></el-icon>
            <h2>视频列表</h2>
            <span v-if="total > 0" class="section-badge">{{ total }}</span>
          </div>
        </div>

        <div v-if="loading && videoList.length === 0" class="section-loading">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <p>正在加载视频...</p>
        </div>

        <div v-else-if="error" class="section-empty">
          <el-empty description="加载失败" :image-size="80">
            <el-button type="primary" @click="refreshList">重试</el-button>
          </el-empty>
        </div>

        <div v-else-if="videoList.length === 0" class="section-empty">
          <el-empty description="暂无视频" :image-size="80">
            <template v-if="isAuthenticated" #default>
              <el-button type="primary" @click="openUploadDialog">
                <el-icon><Plus /></el-icon>
                上传第一个视频
              </el-button>
            </template>
          </el-empty>
        </div>

        <div v-else class="videos-grid">
          <div
            v-for="video in videoList"
            :key="video.id"
            class="video-card"
          >
            <div class="video-card-cover" @click="openBilibiliVideo(video.bvid)">
              <el-image
                :src="getFullImageUrl(video.cover)"
                fit="cover"
                lazy
              >
                <template #placeholder>
                  <div class="cover-placeholder">
                    <el-icon><Loading /></el-icon>
                  </div>
                </template>
                <template #error>
                  <div class="cover-placeholder">
                    <el-icon><VideoPlay /></el-icon>
                  </div>
                </template>
              </el-image>
              <div class="video-card-play">
                <el-icon size="28"><VideoPlay /></el-icon>
              </div>
            </div>
            <div class="video-card-body">
              <h4 class="video-card-title" :title="video.title">{{ video.title }}</h4>
              <div class="video-card-meta">
                <span class="video-card-uploader" :title="video.uploaderName">
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                  {{ video.uploaderName }}
                </span>
                <span v-if="video.favoriteName && isAllMode" class="video-card-fav">
                  <el-icon><Folder /></el-icon>
                  {{ video.favoriteName }}
                </span>
              </div>
            </div>
            <div class="video-card-footer">
              <div class="video-card-recommend">
                <el-icon><Star /></el-icon>
                <span>{{ video.weeklyRecommend || 0 }}</span>
              </div>
              <el-button
                v-if="isAuthenticated"
                :type="userRecommendations.has(video.id) ? '' : 'primary'"
                size="small"
                :plain="!userRecommendations.has(video.id)"
                :disabled="userRecommendations.has(video.id)"
                @click.stop="handleRecommend(video)"
                class="recommend-btn"
                :class="{ recommended: userRecommendations.has(video.id) }"
              >
                <el-icon><Star /></el-icon>
                {{ userRecommendations.has(video.id) ? '已推荐' : '推荐' }}
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="videoList.length > 0 && hasMore" class="load-more">
          <el-button :loading="loading" @click="loadMore">加载更多</el-button>
        </div>
        <div v-else-if="videoList.length > 0" class="load-more">
          <span class="no-more">已经到底了~</span>
        </div>
      </section>
    </div>

    <!-- 上传视频对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传视频"
      width="520px"
      :close-on-click-modal="false"
      class="upload-dialog"
    >
      <el-form :model="uploadForm" :rules="uploadFormRules" label-width="80px">
        <el-form-item label="BV号" prop="bvid">
          <el-input
            v-model="uploadForm.bvid"
            placeholder="请输入B站视频BV号"
            maxlength="12"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="收藏夹">
          <el-select
            v-model="uploadForm.favoriteId"
            placeholder="选择收藏夹"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="fav in myFavorites"
              :key="fav.id"
              :label="fav.name"
              :value="fav.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <div class="form-tip">
            <p>在B站视频页面地址栏中找到BV号：</p>
            <p class="form-tip-example">https://www.bilibili.com/video/<strong>BV1xx411c7mD</strong></p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeUploadDialog">取消</el-button>
        <el-button type="primary" @click="handleUploadVideo">上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
@use '@/assets/theme' as *;

.video-favorite-detail-page {
  min-height: 100vh;
  background: var(--color-primary-alpha-05);
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 20px 60px;
}

/* ========== 头部 ========== */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 16px;
  padding: 20px 28px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  flex-shrink: 0;
}

.back-button {
  font-size: 14px;
  color: #606266;
}

.back-button:hover {
  color: var(--color-primary);
}

.header-info {
  flex: 1;
  text-align: center;
  min-width: 200px;
}

.header-info h1 {
  margin: 0 0 4px 0;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a2e;
}

.header-info p {
  margin: 0 0 6px 0;
  font-size: 14px;
  color: #909399;
}

.header-meta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #909399;
}

.header-count {
  color: var(--color-primary);
  font-weight: 500;
}

.header-user::before {
  content: '·';
  margin-right: 12px;
  color: #d0d4dd;
}

.header-right {
  flex-shrink: 0;
}

/* ========== 视频列表 ========== */
.video-section {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
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

.section-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
  color: #909399;
}

.section-empty {
  display: flex;
  justify-content: center;
  padding: 60px 20px;
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

.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.video-card {
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--color-primary-alpha-10);
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
}

.video-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border-color: var(--color-primary-alpha-20);
}

.video-card-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  cursor: pointer;
  overflow: hidden;
  background: var(--color-primary-alpha-10);
}

.video-card-cover .el-image {
  width: 100%;
  height: 100%;
  transition: transform 0.3s ease;
}

.video-card:hover .video-card-cover .el-image {
  transform: scale(1.05);
}

.video-card-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.video-card-cover:hover .video-card-play {
  opacity: 1;
}

.video-card-body {
  padding: 10px 12px 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.video-card-title {
  font-size: 13px;
  font-weight: 500;
  color: #1a1a2e;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.45;
  min-height: 2.9em;
}

.video-card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.video-card-uploader {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
}

.video-card-fav {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--color-primary);
  white-space: nowrap;
}

.video-card-fav .el-icon {
  font-size: 11px;
}

.video-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-top: 8px;
  border-top: 1px solid var(--color-primary-alpha-08);
}

.video-card-recommend {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: #909399;
}

.video-card-recommend .el-icon {
  font-size: 13px;
  color: var(--color-primary);
}

.recommend-btn {
  padding: 4px 8px !important;
  font-size: 11px !important;
}

.recommend-btn .el-icon {
  font-size: 11px !important;
  margin-right: 2px !important;
}

.recommend-btn.recommended {
  background: var(--color-primary-alpha-10) !important;
  border-color: transparent !important;
  color: var(--color-primary) !important;
  cursor: default;
}

.recommend-btn.recommended .el-icon {
  color: var(--color-primary) !important;
}

.load-more {
  display: flex;
  justify-content: center;
  padding-top: 28px;
}

.no-more {
  color: #c0c4cc;
  font-size: 14px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.8;
}

.form-tip p {
  margin: 0;
}

.form-tip-example {
  word-break: break-all;
}

.form-tip-example strong {
  color: var(--color-primary);
}

/* ========== 手机端适配 ========== */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 12px 12px 40px;
  }

  /* 头部手机端适配 */
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 16px;
    gap: 12px;
    border-radius: 12px;
  }

  .header-left {
    width: 100%;
  }

  .back-button {
    font-size: 13px;
    padding: 6px 0;
  }

  .header-info {
    text-align: left;
    min-width: auto;
    width: 100%;
  }

  .header-info h1 {
    font-size: 18px;
    margin-bottom: 6px;
  }

  .header-info p {
    font-size: 13px;
    margin-bottom: 8px;
  }

  .header-meta {
    font-size: 12px;
    gap: 8px;
  }

  .header-right {
    width: 100%;
  }

  .header-right .el-button {
    width: 100%;
  }

  /* 视频列表手机端适配 */
  .video-section {
    padding: 16px;
    border-radius: 12px;
  }

  .section-header {
    margin-bottom: 16px;
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

  .videos-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .video-card-body {
    padding: 8px 10px 0;
  }

  .video-card-title {
    font-size: 12px;
    -webkit-line-clamp: 2;
    min-height: 2.7em;
  }

  .video-card-meta {
    margin-top: 4px;
    gap: 6px;
  }

  .video-card-uploader {
    font-size: 10px;
  }

  .video-card-fav {
    font-size: 10px;
  }

  .video-card-footer {
    padding: 6px 10px;
    margin-top: 6px;
  }

  .video-card-recommend {
    font-size: 11px;
  }

  .recommend-btn {
    padding: 3px 6px !important;
    font-size: 10px !important;
  }

  .recommend-btn .el-icon {
    font-size: 10px !important;
  }

  .load-more {
    padding-top: 20px;
  }

  /* 上传对话框手机端适配 */
  :deep(.upload-dialog) {
    width: 90% !important;
    max-width: 400px;
  }

  :deep(.upload-dialog .el-dialog__body) {
    padding: 16px;
  }

  .form-tip {
    font-size: 11px;
  }

  .form-tip-example {
    font-size: 10px;
  }
}

/* 小屏手机适配 */
@media (max-width: 480px) {
  .content-wrapper {
    padding: 8px 8px 32px;
  }

  .detail-header {
    padding: 12px;
    margin-bottom: 16px;
  }

  .header-info h1 {
    font-size: 16px;
  }

  .header-info p {
    font-size: 12px;
  }

  .video-section {
    padding: 12px;
  }

  .section-title h2 {
    font-size: 15px;
  }

  .videos-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .video-card-title {
    font-size: 11px;
  }

  .video-card-uploader {
    font-size: 9px;
  }

  .video-card-fav {
    font-size: 9px;
  }

  .video-card-recommend {
    font-size: 10px;
  }

  .recommend-btn {
    padding: 2px 5px !important;
    font-size: 9px !important;
  }
}

/* 超小屏幕适配 */
@media (max-width: 375px) {
  .videos-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .video-card-title {
    font-size: 12px;
  }
}
</style>
