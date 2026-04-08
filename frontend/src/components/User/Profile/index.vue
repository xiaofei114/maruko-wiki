<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessage, ElImageViewer, ElMessageBox } from 'element-plus'
import { User, Camera, Check, Close, Clock, ZoomIn, VideoPause } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const { user, isAuthenticated } = storeToRefs(userStore)

// 数据
const userInfo = ref({
  name: '',
  email: '',
  avatar: ''
})

const uploads = ref({
  photos: [],
  audios: []
})
// 加载状态
const loading = ref(false)
const error = ref(null)

// 照片预览
const imageViewerVisible = ref(false)
const currentImageUrl = ref('')

// 打开照片预览
function openImageViewer(url) {
  currentImageUrl.value = url
  imageViewerVisible.value = true
}

// 音声播放
const playingAudioId = ref(null)
const audioPlayers = ref(new Map())

// 头像上传
const avatarDialogVisible = ref(false)
const avatarPreviewUrl = ref('')
const avatarFile = ref(null)

// 名字编辑
const isEditingName = ref(false)
const editingName = ref('')
const originalName = ref('')
const nameInput = ref(null)

// 分页状态
const photoPagination = ref({
  currentPage: 1,
  pageSize: 10
})

const audioPagination = ref({
  currentPage: 1,
  pageSize: 10
})

// 总数变量
const photoTotal = ref(0)
const audioTotal = ref(0)

// 播放/暂停音频
function toggleAudioPlay(audio) {
  const audioId = audio.id

  // 如果正在播放其他音频，先停止
  if (playingAudioId.value && playingAudioId.value !== audioId) {
    const currentPlayer = audioPlayers.value.get(playingAudioId.value)
    if (currentPlayer) {
      currentPlayer.pause()
      currentPlayer.currentTime = 0
    }
  }

  // 获取或创建音频播放器
  let player = audioPlayers.value.get(audioId)
  if (!player) {
    player = new Audio(audio.url)
    audioPlayers.value.set(audioId, player)

    // 播放结束时重置状态
    player.addEventListener('ended', () => {
      playingAudioId.value = null
    })

    // 播放错误处理
    player.addEventListener('error', () => {
      ElMessage.error('音频播放失败')
      playingAudioId.value = null
    })
  }

  // 切换播放状态
  if (playingAudioId.value === audioId) {
    // 正在播放，暂停
    player.pause()
    playingAudioId.value = null
  } else {
    // 开始播放
    player.play().catch(() => {
      ElMessage.error('音频播放失败')
    })
    playingAudioId.value = audioId
  }
}

// 模拟数据 - 实际项目中应该从API获取
const mockUserInfo = {
  name: user.value?.name || '用户',
  email: 'user@example.com',
  avatar: 'https://i2.hdslb.com/bfs/face/037080004e33990818de22a63394c7de53c0e92c.jpg'
}

const mockUploads = {
  photos: [
    {
      id: 1,
      name: '猫咪照片1',
      url: 'https://i2.hdslb.com/bfs/face/037080004e33990818de22a63394c7de53c0e92c.jpg',
      album_id: 1,
      album_name: '日常',
      upload_time: '2024-01-01 12:00:00',
      status: 1 // 1: 审核通过, 0: 审核中, 2: 审核不通过
    },
    {
      id: 2,
      name: '猫咪照片2',
      url: 'https://i2.hdslb.com/bfs/face/037080004e33990818de22a63394c7de53c0e92c.jpg',
      album_id: 1,
      album_name: '日常',
      upload_time: '2024-01-02 10:00:00',
      status: 0
    },
    {
      id: 3,
      name: '猫咪照片3',
      url: 'https://i2.hdslb.com/bfs/face/037080004e33990818de22a63394c7de53c0e92c.jpg',
      album_id: 2,
      album_name: '玩耍',
      upload_time: '2024-01-03 15:00:00',
      status: 2
    }
  ],
  audios: [
    {
      id: 1,
      name: '猫咪叫声1',
      url: '/api/audio/1',
      classification_id: 1,
      classification_name: '日常',
      upload_time: '2024-01-01 13:00:00',
      status: 1
    },
    {
      id: 2,
      name: '猫咪叫声2',
      url: '/api/audio/2',
      classification_id: 1,
      classification_name: '日常',
      upload_time: '2024-01-02 11:00:00',
      status: 0
    }
  ]
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    0: '审核中',
    1: '审核通过',
    2: '审核不通过'
  }
  return statusMap[status] || '未知状态'
}

// 获取状态图标
const getStatusIcon = (status) => {
  switch (status) {
    case 0:
      return Clock
    case 1:
      return Check
    case 2:
      return Close
    default:
      return Clock
  }
}

// 获取状态类型
const getStatusType = (status) => {
  switch (status) {
    case 0:
      return 'warning'
    case 1:
      return 'success'
    case 2:
      return 'danger'
    default:
      return 'info'
  }
}

// 获取用户信息和上传记录
async function fetchUserInfo() {
  try {
    loading.value = true
    error.value = null

    // 模拟API请求
    await new Promise(resolve => setTimeout(resolve, 500))

    userInfo.value = mockUserInfo
    uploads.value = mockUploads

    // 更新分页总数
    photoTotal.value = uploads.value.photos.length
    audioTotal.value = uploads.value.audios.length
  } catch (err) {
    error.value = '获取用户信息失败'
    ElMessage.error('获取用户信息失败')
  } finally {
    loading.value = false
  }
}



// 查看相册详情
function viewAlbum(albumId) {
  router.push(`/photo-album/${albumId}`)
}

// 打开头像上传对话框
function openAvatarDialog() {
  avatarPreviewUrl.value = userInfo.value.avatar
  avatarDialogVisible.value = true
}

// 处理头像选择
function handleAvatarChange(file) {
  if (file.raw) {
    avatarFile.value = file.raw
    avatarPreviewUrl.value = URL.createObjectURL(file.raw)
  }
}

// 保存头像
async function saveAvatar() {
  try {
    loading.value = true

    // 模拟API请求
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新用户信息
    userInfo.value.avatar = avatarPreviewUrl.value

    ElMessage.success('头像更新成功')
    avatarDialogVisible.value = false

    // 清理
    avatarFile.value = null
  } catch (error) {
    ElMessage.error('头像更新失败')
  } finally {
    loading.value = false
  }
}

// 开始编辑名字
function startEditName() {
  isEditingName.value = true
  originalName.value = userInfo.value.name
  editingName.value = userInfo.value.name

  // 延迟聚焦到输入框
  setTimeout(() => {
    if (nameInput.value) {
      nameInput.value.focus()
    }
  }, 50)
}

// 保存名字
async function saveName() {
  if (editingName.value.trim() === originalName.value) {
    isEditingName.value = false
    return
  }

  try {
    // 弹窗确认
    await ElMessageBox.confirm(
      `确定要将名字修改为"${editingName.value.trim()}"吗？`,
      '确认修改',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true

    // 模拟API请求
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新用户信息
    userInfo.value.name = editingName.value.trim()

    ElMessage.success('名字更新成功')
    isEditingName.value = false
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('名字更新失败')
    }
  } finally {
    loading.value = false
  }
}

// 取消编辑名字
function cancelEditName() {
  isEditingName.value = false
  editingName.value = originalName.value
}

// 处理名字输入框的回车键
function handleNameKeyDown(event) {
  if (event.key === 'Enter') {
    saveName()
  }
}

// 计算属性 - 分页后的照片和音声
const paginatedPhotos = computed(() => {
  const start = (photoPagination.value.currentPage - 1) * photoPagination.value.pageSize
  const end = start + photoPagination.value.pageSize
  return uploads.value.photos.slice(start, end)
})

const paginatedAudios = computed(() => {
  const start = (audioPagination.value.currentPage - 1) * audioPagination.value.pageSize
  const end = start + audioPagination.value.pageSize
  return uploads.value.audios.slice(start, end)
})

// 分页变化处理
function handlePhotoPageChange(page) {
  photoPagination.value.currentPage = page
}

function handlePhotoPageSizeChange(size) {
  photoPagination.value.pageSize = size
  photoPagination.value.currentPage = 1
}

function handleAudioPageChange(page) {
  audioPagination.value.currentPage = page
}

function handleAudioPageSizeChange(size) {
  audioPagination.value.pageSize = size
  audioPagination.value.currentPage = 1
}

// 组件挂载时获取数据
onMounted(() => {
  if (!isAuthenticated.value) {
    ElMessage.error('请先登录')
    router.push('/login')
    return
  }
  fetchUserInfo()
})
</script>

<template>
  <div class="profile-page">
    <div class="content-wrapper">
      <!-- 头部 -->
      <div class="profile-header">
        <h1>个人中心</h1>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载个人信息...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-container">
        <el-empty description="加载失败" :image-size="80">
          <el-button @click="fetchUserInfo" type="primary">重试</el-button>
        </el-empty>
      </div>

      <!-- 个人信息 -->
      <div v-else class="profile-content">
        <!-- 用户基本信息 -->
        <div class="user-info-card">
          <div class="user-avatar" @click="openAvatarDialog">
            <el-avatar :size="100" :src="userInfo.avatar" class="avatar-clickable">
              <User />
            </el-avatar>
            <div class="avatar-hint">点击更换头像</div>
          </div>
          <div class="user-details">
            <div class="name-container">
              <template v-if="!isEditingName">
                <h2 class="user-name" @click="startEditName">{{ userInfo.name }}</h2>
              </template>
              <template v-else>
                <el-input v-model="editingName" class="name-input" @blur="saveName" @keyup.enter="saveName"
                  @keyup.esc="cancelEditName" ref="nameInput" auto-focus />
              </template>
            </div>
            <p class="user-email">{{ userInfo.email }}</p>
            <p class="user-role">
              <el-tag type="primary">
                {{ user.value?.permission === 1 ? '超级管理员' : user.value?.permission === 2 ? '管理员' : '普通用户' }}
              </el-tag>
            </p>
          </div>
        </div>

        <!-- 上传记录 -->
        <div class="uploads-section">
          <!-- 照片上传记录 -->
          <div class="upload-card">
            <div class="card-header">
              <h3>我的照片</h3>
            </div>
            <div class="card-body">
              <div v-if="uploads.photos.length === 0" class="empty-state">
                <el-empty description="暂无照片上传记录" :image-size="60" />
              </div>
              <el-table v-else :data="paginatedPhotos" style="width: 100%">
                <el-table-column prop="name" label="照片名称" width="180">
                  <template #default="scope">
                    <el-button type="text" @click="openImageViewer(scope.row.url)" class="photo-name-button">
                      <el-icon class="zoom-icon">
                        <ZoomIn />
                      </el-icon>
                      {{ scope.row.name }}
                    </el-button>
                  </template>
                </el-table-column>
                <el-table-column prop="album_name" label="所属相册" width="120">
                  <template #default="scope">
                    <el-button type="text" @click="viewAlbum(scope.row.album_id)">{{ scope.row.album_name }}</el-button>
                  </template>
                </el-table-column>
                <el-table-column prop="upload_time" label="上传时间" width="180" />
                <el-table-column label="审核状态" width="120">
                  <template #default="scope">
                    <el-tag :type="getStatusType(scope.row.status)">
                      <el-icon>
                        <component :is="getStatusIcon(scope.row.status)" />
                      </el-icon>
                      {{ getStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="uploads.photos.length > 0" class="paging">
                <span>共 {{ photoTotal }} 条</span>
                <el-pagination background prev-text="上一页" next-text="下一页" layout="prev, pager, next" :total="photoTotal"
                  :pager-count="5" @current-change="handlePhotoPageChange" />
              </div>
            </div>
          </div>

          <!-- 音声上传记录 -->
          <div class="upload-card">
            <div class="card-header">
              <h3>我的音声</h3>
            </div>
            <div class="card-body">
              <div v-if="uploads.audios.length === 0" class="empty-state">
                <el-empty description="暂无音声上传记录" :image-size="60" />
              </div>
              <el-table v-else :data="paginatedAudios" style="width: 100%">
                <el-table-column prop="name" label="音声名称" width="180" />
                <el-table-column prop="classification_name" label="所属分类" width="120" />
                <el-table-column prop="upload_time" label="上传时间" width="180" />
                <el-table-column label="操作" width="100">
                  <template #default="scope">
                    <el-button type="primary" size="small" circle @click="toggleAudioPlay(scope.row)" :icon="VideoPause"
                      :title="playingAudioId === scope.row.id ? '暂停' : '播放'" />
                  </template>
                </el-table-column>
                <el-table-column label="审核状态" width="120">
                  <template #default="scope">
                    <el-tag :type="getStatusType(scope.row.status)">
                      <el-icon>
                        <component :is="getStatusIcon(scope.row.status)" />
                      </el-icon>
                      {{ getStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
              <div v-if="uploads.audios.length > 0" class="paging">
                <span>共 {{ audioTotal }} 条</span>
                <el-pagination background prev-text="上一页" next-text="下一页" layout="prev, pager, next" :total="audioTotal"
                  :pager-count="5" @current-change="handleAudioPageChange" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 照片预览组件 -->
  <el-image-viewer v-if="imageViewerVisible" :url-list="[currentImageUrl]" @close="imageViewerVisible = false" />

  <!-- 头像上传对话框 -->
  <el-dialog v-model="avatarDialogVisible" title="更换头像" width="400px">
    <div class="avatar-upload-container">
      <el-upload class="avatar-uploader" action="" :auto-upload="false" :show-file-list="false"
        :on-change="handleAvatarChange" accept="image/*">
        <img v-if="avatarPreviewUrl" :src="avatarPreviewUrl" class="avatar-preview" />
        <div v-else class="avatar-uploader-trigger">
          <el-icon class="el-icon--upload">
            <Camera />
          </el-icon>
          <div class="el-upload__text">点击上传</div>
        </div>
      </el-upload>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="avatarDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAvatar" :loading="loading">保存</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.paging {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
}

.paging>span {
  font-size: 14px;
  margin-right: 18px;
  color: #484848;
}

.profile-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.content-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  margin-bottom: 30px;
  padding: 10px 0;
  border-bottom: 1px solid #e9ecef;
  text-align: center;
}

.profile-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.loading-container {
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

.error-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 40px 20px;
  text-align: center;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.user-info-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  padding: 30px;
  display: flex;
  align-items: center;
  gap: 30px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-details {
  flex: 1;
}

.user-details h2 {
  margin: 0 0 10px 0;
  font-size: 24px;
  color: #333;
}

.user-email {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 16px;
}

.user-role {
  margin: 0;
}

.uploads-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.upload-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 30px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.header-icon {
  color: var(--color-primary);
  font-size: 20px;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.card-body {
  padding: 30px;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.photo-name-button {
  display: flex;
  align-items: center;
  gap: 5px;
}

.zoom-icon {
  font-size: 14px;
  color: var(--color-primary);
}

/* 头像样式 */
.avatar-clickable {
  cursor: pointer;
  transition: all 0.3s ease;
}

.avatar-clickable:hover {
  transform: scale(1.05);
  box-shadow: 0 0 10px var(--color-primary-alpha-50);
}

.avatar-hint {
  text-align: center;
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

/* 头像上传对话框样式 */
.avatar-upload-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.avatar-uploader {
  width: 200px;
  height: 200px;
}

.avatar-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.avatar-uploader-trigger {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px dashed #d9d9d9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.avatar-uploader-trigger:hover {
  border-color: var(--color-primary);
}

/* 名字编辑样式 */
.user-name {
  cursor: pointer;
  display: inline-block;
  transition: all 0.3s ease;
}

.user-name:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.name-input {
  width: 200px;
  margin-bottom: 10px;
}

.name-container {
  display: flex;
  align-items: center;
}

/* 分页样式 */
.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.paging {
  margin-top: 20px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
}

.paging>span {
  font-size: 14px;
  margin-right: 18px;
  color: #484848;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 15px;
  }

  .user-info-card {
    flex-direction: column;
    text-align: center;
    padding: 20px;
  }

  .card-body {
    padding: 20px;
  }

  .profile-header h1 {
    font-size: 20px;
  }
}
</style>