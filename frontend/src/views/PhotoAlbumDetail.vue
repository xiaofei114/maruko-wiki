<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus, Picture, UploadFilled } from '@element-plus/icons-vue'
import { getAlbumPhotos, uploadPhoto } from '@/api/album'

// 路由和用户状态
const route = useRoute()
const router = useRouter()
const { isAuthenticated } = storeToRefs(useUserStore())

// 获取相册ID
const albumId = computed(() => parseInt(route.params.id))

// 相册和照片数据
const albumData = ref({
  album: null,
  photos: []
})
const loading = ref(false)
const error = ref(null)

// 上传相关
const imagePreviewUrl = ref('')

// 当前相册信息
const currentAlbum = computed(() => {
  return albumData.value.album
})

// 当前相册的照片
const albumPhotos = computed(() => {
  return albumData.value.photos
})

// 图片预览URL（已在上方定义为 ref）

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取相册照片
async function fetchAlbumPhotos() {
  try {
    loading.value = true
    error.value = null
    const response = await getAlbumPhotos(albumId.value)
    albumData.value = response.data
  } catch (err) {
    error.value = '获取相册照片失败，请稍后重试'
    ElMessage.error('获取相册照片失败，请稍后重试')
    albumData.value = {
      album: null,
      photos: []
    }
  } finally {
    loading.value = false
  }
}

// 上传照片相关
const uploadVisible = ref(false)
const uploadRef = ref(null)
const uploadForm = ref({
  photo: null,
  name: ''
})

// 返回相册列表
function goBack() {
  router.push('/photo-album')
}

// 打开上传照片对话框
function openUploadDialog() {
  // 清理之前的预览URL
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value)
    imagePreviewUrl.value = ''
  }

  uploadVisible.value = true
  uploadForm.value = {
    photo: null,
    name: ''
  }
}

// 处理文件选择
async function handleFileChange(file, fileList) {

  // 先执行清理逻辑（类似 removeFile 但不清除上传组件的文件）
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value)
    imagePreviewUrl.value = ''
  }
  uploadForm.value.photo = null
  uploadForm.value.name = ''

  // 处理文件 - 总是只处理最新的文件，实现自动替换
  if (fileList.length > 0) {
    // 获取当前添加的文件（file 参数通常是最新添加的）
    const selectedFile = file.raw || file

    // 清空旧文件，只保留当前文件
    // 通过手动管理 fileList 来实现替换
    setTimeout(() => {
      if (uploadRef.value) {
        // 清空所有文件
        uploadRef.value.clearFiles()
        // 这里我们不重新添加文件，因为我们手动管理预览
        // el-upload 的 fileList 只是用于显示，我们用自己的逻辑
      }
    }, 0)

    uploadForm.value.photo = selectedFile

    // 如果没有输入名称，使用文件名
    if (!uploadForm.value.name.trim()) {
      uploadForm.value.name = selectedFile.name.replace(/\.[^/.]+$/, '')
    }

    // 创建新的预览URL
    try {
      const newUrl = URL.createObjectURL(selectedFile)

      // 使用 nextTick 确保 DOM 更新
      await nextTick()
      imagePreviewUrl.value = newUrl

      // 再次强制更新
      await nextTick()
    } catch (error) {
    }
  }
}

// 上传照片
async function handleUploadPhotos() {
  if (!uploadForm.value.photo) {
    ElMessage.error('请选择要上传的照片')
    return
  }

  if (!uploadForm.value.name.trim()) {
    ElMessage.error('请输入照片名称')
    return
  }

  try {
    loading.value = true

    // 创建FormData对象
    const formData = new FormData()
    formData.append('photo', uploadForm.value.photo)
    formData.append('album_id', albumId.value)
    formData.append('name', uploadForm.value.name.trim())

    await uploadPhoto(formData)

    loading.value = false

    ElMessage.success('照片上传成功！')
    uploadVisible.value = false

    // 重新获取相册照片
    await fetchAlbumPhotos()

    // 清理表单数据和上传组件的文件列表
    if (imagePreviewUrl.value) {
      URL.revokeObjectURL(imagePreviewUrl.value)
      imagePreviewUrl.value = ''
    }
    uploadForm.value.photo = null
    uploadForm.value.name = ''
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }

  } catch (error) {
    loading.value = false
    let errorMessage = '上传过程中发生错误，请重试'

    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 400:
          errorMessage = data.message || '请求参数错误'
          break
        case 401:
          errorMessage = '未认证，请先登录'
          break
        case 413:
          errorMessage = '文件过大，超过10MB限制'
          break
        default:
          errorMessage = data.message || errorMessage
      }
    }

    ElMessage.error(errorMessage)
  }
}

// URL转换函数
function getFullImageUrl(relativeUrl) {
  if (!relativeUrl) return ''
  if (relativeUrl.startsWith('http')) return relativeUrl
  if (relativeUrl.startsWith('/api/')) {
    const serverUrl = import.meta.env.VITE_APP_BASE_URL?.replace('/api', '') || 'http://localhost:6660'
    return serverUrl + relativeUrl
  }
  const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:6660/api'
  return baseUrl + relativeUrl
}

// 组件挂载时获取相册数据
onMounted(async () => {
  await fetchAlbumPhotos()
  if (!currentAlbum.value) {
    ElMessage.error('相册不存在')
    router.push('/photo-album')
  }
})

// 组件卸载时清理资源
onBeforeUnmount(() => {
  // 清理图片预览URL
  if (imagePreviewUrl.value) URL.revokeObjectURL(imagePreviewUrl.value)
})
</script>

<template>
  <div class="photo-album-detail-page">
    <div class="content-wrapper">
      <!-- 返回按钮和相册信息 -->
      <div class="album-header">
        <div class="header-left">
          <el-button class="back-button" @click="goBack" type="text">
            <el-icon>
              <ArrowLeft />
            </el-icon>
            返回相册列表
          </el-button>
        </div>

        <div class="album-info" v-if="currentAlbum">
          <div class="album-details">
            <h1>{{ currentAlbum.name }}</h1>
            <p>{{ currentAlbum.introduction }}</p>
          </div>
        </div>
      </div>

      <!-- 照片网格 -->
      <div class="photos-section">
        <div v-if="albumPhotos.length === 0" class="empty-state">
          <el-empty description="这个相册还没有照片" :image-size="80">
            <template #image>
              <el-icon size="80" class="empty-icon">
                <Picture />
              </el-icon>
            </template>
            <el-button v-if="isAuthenticated" @click="openUploadDialog" type="primary">
              上传第一张照片
            </el-button>
          </el-empty>
        </div>

        <div v-else class="photo-grid">
          <div v-for="photo in albumPhotos" :key="photo.id" class="photo-item">
            <el-image :src="getFullImageUrl(photo.url)" :alt="photo.name" fit="cover"
              :preview-src-list="[getFullImageUrl(photo.url)]" :initial-index="0" hide-on-click-modal
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
                <h4>{{ photo.name }}</h4>
              </div>
            </div>
          </div>

          <!-- 卡片样式的上传按钮 -->
          <div v-if="isAuthenticated" class="photo-item upload-card" @click="openUploadDialog">
            <div class="upload-content">
              <el-icon size="48" class="upload-icon">
                <Plus />
              </el-icon>
              <div class="upload-text">上传照片</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传照片对话框 -->
    <el-dialog v-model="uploadVisible" title="上传照片" width="600px" :close-on-click-modal="false">
      <el-upload ref="uploadRef" :on-change="handleFileChange" :auto-upload="false" :show-file-list="false"
        accept="image/*" action="" drag style="width: 100%;">
        <!-- 自定义上传区域 -->
        <div v-if="!uploadForm.photo" class="upload-area">
          <el-icon class="el-icon--upload">
            <component :is="UploadFilled" />
          </el-icon>
          <div class="el-upload__text">
            将照片拖到此处，或 <em>点击选择</em>
          </div>
        </div>

        <!-- 图片预览区域 -->
        <div v-else class="upload-preview">
          <img :src="imagePreviewUrl" :key="imagePreviewUrl"
            style="width: 100%; height: 200px; border-radius: 8px; object-fit: cover;" alt="预览图片" />
          <div class="preview-info">
            <p>{{ formatFileSize(uploadForm.photo.size) }}</p>
          </div>
        </div>

        <template #tip>
          <div class="el-upload__tip">
            支持 JPG、PNG、GIF 格式，单张照片最大 10MB
          </div>
        </template>
      </el-upload>

      <!-- 照片名称输入 -->
      <div style="margin-top: 20px;">
        <el-input v-model="uploadForm.name" placeholder="请输入照片名称" maxlength="50" show-word-limit />
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadVisible = false">取消</el-button>
          <el-button type="primary" @click="handleUploadPhotos" :loading="loading"
            :disabled="!uploadForm.photo || !uploadForm.name.trim()">
            上传照片
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.photo-album-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* 相册头部 */
.album-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding: 10px 20px;
  height: 80px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  position: relative;
}

.header-left {
  flex-shrink: 0;
}

.album-info {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
  justify-content: center;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
}

.album-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-details {
  text-align: center;
}

.album-details h1 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
  font-weight: 600;
}

.album-details p {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 14px;
}

.header-right {
  flex-shrink: 0;
  margin: auto 0;
}

/* 照片区域 */
.photos-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  color: #c0c4cc;
}

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
  min-height: 150px;
  /* 最小高度 */
  max-height: 200px;
  /* 最大高度 */
  position: relative;
  /* 为遮罩定位 */
}

.photo-item:hover {
  transform: scale(1.05);
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

.photo-item:not(.upload-card):hover .photo-overlay {
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

/* 上传卡片样式 */
.upload-card {
  border: 2px dashed #d9d9d9;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.upload-card:hover {
  border-color: #409eff;
  background: #f0f8ff;
}

.upload-content {
  text-align: center;
  color: #999;
  transition: color 0.3s ease;
}

.upload-card:hover .upload-content {
  color: #409eff;
}

.upload-icon {
  margin-bottom: 12px;
  opacity: 0.7;
}

.upload-card:hover .upload-icon {
  opacity: 1;
}

.upload-text {
  font-size: 14px;
  font-weight: 500;
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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

.upload-area {
  padding: 40px 20px;
  text-align: center;
}

.upload-preview {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.preview-info {
  margin-top: 12px;
  text-align: center;
}

.preview-info p {
  margin: 4px 0;
  color: #666;
  font-size: 14px;
}

.preview-info strong {
  color: #333;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .album-header {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }

  .album-info {
    flex-direction: column;
    gap: 15px;
  }

  .album-details h1 {
    font-size: 20px;
  }

  .photo-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 10px;
  }

  .photos-section {
    padding: 20px;
  }

  .content-wrapper {
    padding: 15px;
  }
}
</style>
