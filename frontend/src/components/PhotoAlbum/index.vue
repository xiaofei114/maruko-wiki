<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { Picture, Loading, Warning } from '@element-plus/icons-vue'
import { Plus } from '@element-plus/icons-vue'
import { getAlbums, createAlbum } from '@/api/album'
import PageHero from '@/components/ComponentStyle/PageHero.vue'
import img from '@/assets/背景图.jpg'

const router = useRouter()

// 用户状态
const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)

// 新建相册相关
const createDialogVisible = ref(false)
const createForm = ref({
  title: '',
  tip: ''
})

const createFormRules = {
  title: [
    { required: true, message: '请输入相册名称', trigger: 'blur' },
    { min: 1, max: 20, message: '相册名称长度应在1-20个字符', trigger: 'blur' }
  ],
  tip: [
    { max: 100, message: '简介长度不能超过100个字符', trigger: 'blur' }
  ]
}

// 相册数据
const imgList = ref({
  photoAlbum: [],
  latestPhotos: []
})
const loading = ref(false)
const error = ref(null)

// 获取相册数据
async function fetchAlbums() {
  try {
    loading.value = true
    error.value = null
    const response = await getAlbums()
    imgList.value = response.data
  } catch (err) {
    error.value = '获取相册数据失败，请稍后重试'
    ElMessage.error('获取相册数据失败，请稍后重试')
    // 设置默认空数据
    imgList.value = {
      photoAlbum: [],
      latestPhotos: []
    }
  } finally {
    loading.value = false
  }
}

// 新建相册相关函数
function openCreateDialog() {
  createDialogVisible.value = true
  createForm.value = {
    title: '',
    tip: ''
  }
}

function closeCreateDialog() {
  createDialogVisible.value = false
}

async function handleCreateAlbum() {
  // 表单验证
  if (!createForm.value.title.trim()) {
    ElMessage.error('请输入相册名称')
    return
  }

  try {
    const albumData = {
      name: createForm.value.title.trim(),
      introduction: createForm.value.tip.trim() || undefined
    }

    const response = await createAlbum(albumData)

    ElMessage.success(`相册"${response.data.name}"创建成功！`)

    // 重新获取相册列表以显示新创建的相册
    await fetchAlbums()

    closeCreateDialog()
  } catch (err) {
    let errorMessage = '创建相册失败，请稍后重试'

    if (err.response) {
      const { status, data } = err.response
      switch (status) {
        case 400:
          errorMessage = data.message || '相册名称不能为空'
          break
        case 401:
          errorMessage = '未认证，请先登录'
          break
        default:
          errorMessage = data.message || errorMessage
      }
    }

    ElMessage.error(errorMessage)
  }
}

// 查看相册详情
function viewAlbum(albumId) {
  router.push(`/photo-album/${albumId}`)
}

// URL转换函数
function getFullImageUrl(relativeUrl) {
  if (!relativeUrl) return img
  if (relativeUrl.startsWith('http')) return relativeUrl
  if (relativeUrl.startsWith('/api/')) {
    const serverUrl = import.meta.env.VITE_APP_BASE_URL?.replace('/api', '')
    return serverUrl + relativeUrl
  }
  const baseUrl = import.meta.env.VITE_APP_BASE_URL
  return baseUrl + relativeUrl
}

// 组件挂载时获取相册数据
onMounted(() => {
  fetchAlbums()
})
</script>

<template>
  <div class="photo-album-page">
    <div class="content-wrapper">
      <PageHero title="丸子相簿" subtitle="记录精彩时刻，与你分享美好时光" />
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载相册...</p>
      </div>
      <div v-else-if="error">
        <el-empty description="加载失败" :image-size="80">
          <template #image>
            <el-icon size="80" class="error-icon">
              <Warning />
            </el-icon>
          </template>
          <el-button @click="fetchAlbums" type="primary">重试</el-button>
        </el-empty>
      </div>
      <div v-else-if="imgList.photoAlbum.length === 0">
        <el-empty description="暂无相册数据" :image-size="80">
          <template #image>
            <el-icon size="80" class="empty-icon">
              <Picture />
            </el-icon>
          </template>
          <template v-if="isAuthenticated" #default>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon>
                <Plus />
              </el-icon>
              创建第一个相册
            </el-button>
          </template>
        </el-empty>
      </div>
      <div v-else class="album-grid">
        <div class="album-card" v-for="album in imgList.photoAlbum" :key="album.id" @click="viewAlbum(album.id)">
          <div class="card-image">
            <img :src="getFullImageUrl(album.img)" :alt="album.title" />
            <div class="card-overlay">
              <div class="overlay-content">
                <h3>{{ album.title }}</h3>
                <p>{{ album.tip }}</p>
                <span class="photo-count">
                  {{ album.photoCount }}张照片
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isAuthenticated" class="album-card create-card" @click="openCreateDialog">
          <div class="card-image create-image">
            <div class="create-content">
              <el-icon size="48" class="create-icon">
                <Plus />
              </el-icon>
              <div class="create-text">新建相册</div>
            </div>
          </div>
        </div>
      </div>

      <div class="preview-section">
        <div class="preview-header">
          <h2>最新照片</h2>
        </div>

        <div v-if="imgList.latestPhotos.length === 0" class="photo-empty-state">
          <el-empty description="暂无最新照片" :image-size="60">
            <template #image>
              <el-icon size="60" class="photo-empty-icon">
                <Picture />
              </el-icon>
            </template>
          </el-empty>
        </div>
        <div v-else class="photo-grid">
          <div class="photo-item" v-for="photo in imgList.latestPhotos" :key="photo.id">
            <el-image :src="getFullImageUrl(photo.img)" :alt="photo.title" fit="cover"
              :preview-src-list="[getFullImageUrl(photo.img)]" :initial-index="0" hide-on-click-modal
              style="width: 100%;height: 100%; image-rendering: auto;" preview-teleported>
              <template #error>
                <div class="image-viewer-slot image-slot">
                  <el-icon>
                    <Picture />
                  </el-icon>
                </div>
              </template>
            </el-image>
            <div class="photo-overlay">
              <div class="photo-overlay-content">
                <h4>{{ photo.title }}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
      <el-dialog v-model="createDialogVisible" title="新建相册" width="500px" :close-on-click-modal="false">
        <el-form :model="createForm" :rules="createFormRules" ref="createFormRef" label-width="80px">
          <el-form-item label="相册名称" prop="title">
            <el-input v-model="createForm.title" placeholder="请输入相册名称" maxlength="20" show-word-limit />
          </el-form-item>

          <el-form-item label="相册简介" prop="tip">
            <el-input v-model="createForm.tip" type="textarea" placeholder="请输入相册简介（可选）" maxlength="100" show-word-limit
              :rows="3" />
          </el-form-item>
        </el-form>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="closeCreateDialog">取消</el-button>
            <el-button type="primary" @click="handleCreateAlbum">
              创建相册
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped>
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 20px;
  text-align: center;
  margin-bottom: 22px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid var(--color-primary);
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

.photo-album-page {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 页面主体内容 */
.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 20px 40px;
}

/* 相簿网格 */
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 30px;
  margin-bottom: 30px;
}

/* 相册卡片 */
.album-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  position: relative;
  height: 200px;
}

.album-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px var(--color-primary-alpha-15);
}

/* 新建相册卡片 */
.create-card {
  border: 2px dashed #d9d9d9;
  background: #fafafa;
}

.create-card:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-alpha-10);
  box-shadow: 0 12px 30px var(--color-primary-alpha-10);
}

.create-image {
  position: relative;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.create-content {
  text-align: center;
  color: #999;
  transition: color 0.3s ease;
}

.create-card:hover .create-content {
  color: var(--color-primary);
}

.create-icon {
  margin-bottom: 12px;
  opacity: 0.7;
}

.create-card:hover .create-icon {
  opacity: 1;
}

.create-text {
  font-size: 16px;
  font-weight: 500;
}

.card-image {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.album-card:hover .card-image img {
  transform: scale(1.05);
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to top,
      rgba(0, 0, 0, 0.8) 0%,
      rgba(0, 0, 0, 0.4) 50%,
      transparent 100%);
  display: flex;
  align-items: flex-end;
  padding: 20px;
  transition: background 0.3s ease;
  box-sizing: border-box;
}

.album-card:hover .card-overlay {
  background: linear-gradient(to top,
      var(--color-primary-alpha-80) 0%,
      var(--color-primary-alpha-40) 50%,
      transparent 100%);
}

.overlay-content {
  color: white;
  width: 100%;
  position: relative;
}

.overlay-content h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.overlay-content p {
  margin: 0 0 0 0;
  font-size: 14px;
  opacity: 0.9;
}

.photo-count {
  display: inline-block;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  position: absolute;
  right: 0;
  bottom: 0;
}


/* 照片预览区域 */
.preview-section {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e9ecef;
}

.preview-header h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-header h2 i {
  color: var(--color-primary);
}

/* 照片网格 */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.photo-item {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
  height: 150px;
  width: 150px;
}

.photo-item:hover {
  transform: scale(1.05);
}

.photo-item {
  position: relative;
  /* 为遮罩定位 */
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(to top,
      rgba(0, 0, 0, 0.8) 0%,
      rgba(0, 0, 0, 0.4) 50%,
      transparent 100%);
  display: flex;
  align-items: flex-end;
  padding: 15px;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 12px;
  box-sizing: border-box;
  pointer-events: none;
  /* 不拦截点击事件 */
}

.photo-item:hover .photo-overlay {
  opacity: 1;
}

.photo-overlay-content {
  color: white;
  width: 100%;
}

.photo-overlay-content h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 保持 cover 以填充容器，但可以考虑改为 contain */
  image-rendering: -webkit-optimize-contrast;
  /* 提高图片渲染质量 */
  image-rendering: crisp-edges;
  transition: transform 0.3s ease;
}

.photo-item:hover img {
  transform: scale(1.1);
}

.image-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f5f5;
  color: #c0c4cc;
  font-size: 24px;
}

.photo-empty-state {
  padding: 40px 20px;
  text-align: center;
}

.photo-empty-icon {
  color: #c0c4cc;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .album-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  .page-hero {
    padding: 40px 20px;
    margin-bottom: 30px;
  }

  .hero-title {
    font-size: 2.2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .content-wrapper {
    padding: 15px;
  }

  .preview-section {
    padding: 24px 20px;
  }

  .preview-header h2 {
    font-size: 22px;
  }

  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
  }

  .preview-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  .overlay-content h3 {
    font-size: 18px;
  }

  .overlay-content p {
    font-size: 13px;
  }

  .create-card {
    margin-bottom: 10px;
  }

  .create-text {
    font-size: 14px;
  }
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
