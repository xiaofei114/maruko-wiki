<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessage, ElImageViewer, ElMessageBox } from 'element-plus'
import {
  User, Camera, Check, Close, Clock, VideoPause, VideoPlay,
  Document, Picture, Headset, Edit, Bell, HomeFilled,
  InfoFilled, Message, ArrowLeft, Delete, More, ZoomIn, ArrowRight, Lock, Star, Link, Plus, Setting
} from '@element-plus/icons-vue'
import { getPlanDocuments } from '@/api/planDocument'

const router = useRouter()
const userStore = useUserStore()
const { user, isAuthenticated } = storeToRefs(userStore)

// 当前选中的菜单
const activeMenu = ref('home')

// 数据
const userInfo = ref({
  name: '',
  email: '',
  avatar: ''
})

const uploads = ref({
  photos: [],
  audios: [],
  plans: []
})

// 消息数据
const messages = ref([
  { id: 1, title: '系统通知', content: '欢迎使用系统', time: '2024-01-01', read: false },
  { id: 2, title: '审核提醒', content: '您的照片已通过审核', time: '2024-01-02', read: true }
])

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

// 编辑对话框
const editDialogVisible = ref(false)
const editType = ref('') // 'audio', 'photo', 'plan'
const editForm = ref({
  id: null,
  name: '',
  title: '',
  albumId: null,
  classificationId: null
})
const editFormRef = ref(null)

// B站绑定
const bilibiliBind = ref({
  isBound: false,
  uid: '',
  username: '',
  avatar: '',
  fanLevel: 0
})
const bilibiliDialogVisible = ref(false)
const bilibiliForm = ref({
  uid: '',
  agreed: false
})

// 头像来源
const avatarSource = ref('custom') // 'custom' | 'bilibili'

// 选择B站头像
function selectBilibiliAvatar() {
  avatarSource.value = 'bilibili'
  avatarPreviewUrl.value = bilibiliBind.value.avatar
}

// 管理页默认版本设置
const adminDefaultVersion = ref(localStorage.getItem('adminDefaultVersion') || 'new')

// 切换管理页默认版本
function switchAdminVersion(version) {
  adminDefaultVersion.value = version
  localStorage.setItem('adminDefaultVersion', version)
  ElMessage.success(`已设置为默认打开${version === 'new' ? '新版' : '旧版'}管理后台`)
}

// 分页状态
const photoPagination = ref({ currentPage: 1, pageSize: 12 })
const audioPagination = ref({ currentPage: 1, pageSize: 10 })
const planPagination = ref({ currentPage: 1, pageSize: 10 })
const messagePagination = ref({ currentPage: 1, pageSize: 10 })

// 总数变量
const photoTotal = ref(0)
const audioTotal = ref(0)
const planTotal = ref(0)
const messageTotal = ref(0)

// 未读消息数
const unreadCount = computed(() => messages.value.filter(m => !m.read).length)

// 播放/暂停音频
function toggleAudioPlay(audio) {
  const audioId = audio.id
  if (playingAudioId.value && playingAudioId.value !== audioId) {
    const currentPlayer = audioPlayers.value.get(playingAudioId.value)
    if (currentPlayer) {
      currentPlayer.pause()
      currentPlayer.currentTime = 0
    }
  }

  let player = audioPlayers.value.get(audioId)
  if (!player) {
    player = new Audio(audio.url)
    audioPlayers.value.set(audioId, player)
    player.addEventListener('ended', () => { playingAudioId.value = null })
    player.addEventListener('error', () => {
      ElMessage.error('音频播放失败')
      playingAudioId.value = null
    })
  }

  if (playingAudioId.value === audioId) {
    player.pause()
    playingAudioId.value = null
  } else {
    player.play().catch(() => ElMessage.error('音频播放失败'))
    playingAudioId.value = audioId
  }
}

// 模拟数据
const mockUserInfo = {
  name: user.value?.name || '用户',
  email: 'user@example.com',
  avatar: 'https://i2.hdslb.com/bfs/face/037080004e33990818de22a63394c7de53c0e92c.jpg'
}

const mockUploads = {
  photos: Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    name: `照片${i + 1}`,
    url: 'https://i2.hdslb.com/bfs/face/037080004e33990818de22a63394c7de53c0e92c.jpg',
    album_id: 1,
    album_name: '日常',
    upload_time: `2024-01-${String(i % 30 + 1).padStart(2, '0')} 12:00:00`,
    status: i % 3
  })),
  audios: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    name: `音声${i + 1}`,
    url: '/api/audio/1',
    classification_id: 1,
    classification_name: '日常',
    upload_time: `2024-01-${String(i % 30 + 1).padStart(2, '0')} 12:00:00`,
    status: i % 3
  })),
  plans: [
    { id: 1, title: '2024年春季企划', fileName: 'spring_plan_2024.docx', uploadTime: 1704067200, isCurrent: true },
    { id: 2, title: '夏季活动策划', fileName: 'summer_activity.docx', uploadTime: 1706745600, isCurrent: false },
    { id: 3, title: '秋季企划案', fileName: 'autumn_plan.docx', uploadTime: 1709424000, isCurrent: false }
  ]
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = { 0: '审核中', 1: '已通过', 2: '未通过' }
  return statusMap[status] || '未知'
}

const getStatusType = (status) => {
  const typeMap = { 0: 'warning', 1: 'success', 2: 'danger' }
  return typeMap[status] || 'info'
}

// 格式化时间戳
const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

// 获取用户信息和上传记录
async function fetchUserInfo() {
  try {
    loading.value = true
    error.value = null
    await new Promise(resolve => setTimeout(resolve, 500))

    userInfo.value = mockUserInfo
    uploads.value = mockUploads
    photoTotal.value = uploads.value.photos.length
    audioTotal.value = uploads.value.audios.length
    planTotal.value = uploads.value.plans.length
    messageTotal.value = messages.value.length

    try {
      const planRes = await getPlanDocuments()
      if (planRes.success && planRes.data) {
        uploads.value.plans = planRes.data.filter(p => p.uploaderId === user.value?.id)
        planTotal.value = uploads.value.plans.length
      }
    } catch (e) { console.log('使用模拟企划数据') }
  } catch (err) {
    error.value = '获取用户信息失败'
    ElMessage.error('获取用户信息失败')
  } finally {
    loading.value = false
  }
}

// 打开头像上传
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
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    if (avatarSource.value === 'bilibili' && bilibiliBind.value.isBound) {
      userInfo.value.avatar = bilibiliBind.value.avatar
    } else {
      userInfo.value.avatar = avatarPreviewUrl.value
    }
    
    ElMessage.success('头像更新成功')
    avatarDialogVisible.value = false
    avatarFile.value = null
  } catch (error) {
    ElMessage.error('头像更新失败')
  } finally {
    loading.value = false
  }
}

// 编辑名字
function startEditName() {
  isEditingName.value = true
  originalName.value = userInfo.value.name
  editingName.value = userInfo.value.name
  setTimeout(() => nameInput.value?.focus(), 50)
}

async function saveName() {
  if (editingName.value.trim() === originalName.value) {
    isEditingName.value = false
    return
  }
  try {
    await ElMessageBox.confirm(`确定要修改为"${editingName.value.trim()}"吗？`, '确认修改', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    loading.value = true
    await new Promise(resolve => setTimeout(resolve, 1000))
    userInfo.value.name = editingName.value.trim()
    ElMessage.success('修改成功')
    isEditingName.value = false
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('修改失败')
  } finally {
    loading.value = false
  }
}

function cancelEditName() {
  isEditingName.value = false
  editingName.value = originalName.value
}

// 标记消息已读
function markAsRead(msg) {
  msg.read = true
}

// 标记所有消息已读
function markAllAsRead() {
  messages.value.forEach(msg => {
    msg.read = true
  })
  ElMessage.success('已全部标记为已读')
}

// 获取角色标签
function getPermissionLabel(permission) {
  const labels = { 1: '超级管理员', 2: '管理员', 3: import.meta.env.VITE_APP_DD_NAME || '普通用户' }
  return labels[permission] || '普通用户'
}

// 获取角色标签类型
function getPermissionType(permission) {
  const types = { 1: 'danger', 2: 'warning', 3: 'primary' }
  return types[permission] || 'info'
}

// 打开编辑对话框
function openEditDialog(type, item) {
  editType.value = type
  editForm.value = {
    id: item.id,
    name: item.name || '',
    title: item.title || '',
    albumId: item.album_id || null,
    classificationId: item.classification_id || null
  }
  editDialogVisible.value = true
}

// 保存编辑
async function saveEdit() {
  try {
    await editFormRef.value.validate()
    loading.value = true

    // 模拟API请求
    await new Promise(resolve => setTimeout(resolve, 500))

    if (editType.value === 'audio') {
      const index = uploads.value.audios.findIndex(a => a.id === editForm.value.id)
      if (index !== -1) {
        uploads.value.audios[index].name = editForm.value.name
        uploads.value.audios[index].classification_id = editForm.value.classificationId
      }
    } else if (editType.value === 'photo') {
      const index = uploads.value.photos.findIndex(p => p.id === editForm.value.id)
      if (index !== -1) {
        uploads.value.photos[index].name = editForm.value.name
        uploads.value.photos[index].album_id = editForm.value.albumId
      }
    } else if (editType.value === 'plan') {
      const index = uploads.value.plans.findIndex(p => p.id === editForm.value.id)
      if (index !== -1) {
        uploads.value.plans[index].title = editForm.value.name
      }
    }

    ElMessage.success('修改成功')
    editDialogVisible.value = false
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('修改失败')
  } finally {
    loading.value = false
  }
}

// 打开B站绑定对话框
function openBilibiliDialog() {
  bilibiliForm.value = { uid: '', agreed: false }
  bilibiliDialogVisible.value = true
}

// 绑定B站账号
async function bindBilibili() {
  if (!bilibiliForm.value.uid.trim()) {
    ElMessage.error('请输入B站主页ID')
    return
  }
  if (!bilibiliForm.value.agreed) {
    ElMessage.error('请同意授权获取信息')
    return
  }
  
  try {
    loading.value = true
    // 模拟API请求
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟绑定成功
    bilibiliBind.value = {
      isBound: true,
      uid: bilibiliForm.value.uid,
      username: 'B站用户' + bilibiliForm.value.uid.slice(-4),
      avatar: 'https://i2.hdslb.com/bfs/face/037080004e33990818de22a63394c7de53c0e92c.jpg',
      fanLevel: Math.floor(Math.random() * 20) + 1 // 模拟粉丝等级
    }
    
    ElMessage.success('B站账号绑定成功')
    bilibiliDialogVisible.value = false
  } catch (error) {
    ElMessage.error('绑定失败，请检查ID是否正确')
  } finally {
    loading.value = false
  }
}

// 解绑B站账号
async function unbindBilibili() {
  try {
    await ElMessageBox.confirm(
      '确定要解绑B站账号吗？',
      '确认解绑',
      { confirmButtonText: '解绑', cancelButtonText: '取消', type: 'warning' }
    )
    
    loading.value = true
    await new Promise(resolve => setTimeout(resolve, 500))
    
    bilibiliBind.value = {
      isBound: false,
      uid: '',
      username: '',
      avatar: '',
      fanLevel: 0
    }
    
    ElMessage.success('已解绑B站账号')
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('解绑失败')
  } finally {
    loading.value = false
  }
}

// 删除项目
async function deleteItem(type, item) {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${item.name || item.title}"吗？此操作不可恢复！`,
      '确认删除',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'danger' }
    )

    loading.value = true
    await new Promise(resolve => setTimeout(resolve, 500))

    if (type === 'audio') {
      uploads.value.audios = uploads.value.audios.filter(a => a.id !== item.id)
      audioTotal.value = uploads.value.audios.length
    } else if (type === 'photo') {
      uploads.value.photos = uploads.value.photos.filter(p => p.id !== item.id)
      photoTotal.value = uploads.value.photos.length
    } else if (type === 'plan') {
      uploads.value.plans = uploads.value.plans.filter(p => p.id !== item.id)
      planTotal.value = uploads.value.plans.length
    }

    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  } finally {
    loading.value = false
  }
}

// 计算属性 - 分页数据
const paginatedPhotos = computed(() => {
  const start = (photoPagination.value.currentPage - 1) * photoPagination.value.pageSize
  return uploads.value.photos.slice(start, start + photoPagination.value.pageSize)
})

const paginatedAudios = computed(() => {
  const start = (audioPagination.value.currentPage - 1) * audioPagination.value.pageSize
  return uploads.value.audios.slice(start, start + audioPagination.value.pageSize)
})

const paginatedPlans = computed(() => {
  const start = (planPagination.value.currentPage - 1) * planPagination.value.pageSize
  return uploads.value.plans.slice(start, start + planPagination.value.pageSize)
})

const paginatedMessages = computed(() => {
  const start = (messagePagination.value.currentPage - 1) * messagePagination.value.pageSize
  return messages.value.slice(start, start + messagePagination.value.pageSize)
})

// 返回上一页
function goBack() {
  router.back()
}

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
  <div class="profile-layout">
    <!-- 左侧导航栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </div>
      </div>

      <div class="user-brief">
        <el-avatar :size="60" :src="userInfo.avatar">
          <User />
        </el-avatar>
        <span class="user-name">{{ userInfo.name }}</span>
      </div>

      <nav class="sidebar-nav">
        <div
          class="nav-item"
          :class="{ active: activeMenu === 'home' }"
          @click="activeMenu = 'home'"
        >
          <el-icon><HomeFilled /></el-icon>
          <span>我的主页</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeMenu === 'messages' }"
          @click="activeMenu = 'messages'"
        >
          <el-icon><Bell /></el-icon>
          <span>消息</span>
          <el-badge v-if="unreadCount > 0" :value="unreadCount" class="message-badge" />
        </div>
        <div
          class="nav-item"
          :class="{ active: activeMenu === 'account' }"
          @click="activeMenu = 'account'"
        >
          <el-icon><InfoFilled /></el-icon>
          <span>账号信息</span>
        </div>
        <div class="nav-divider"></div>
        <div
          class="nav-item"
          :class="{ active: activeMenu === 'audios' }"
          @click="activeMenu = 'audios'"
        >
          <el-icon><Headset /></el-icon>
          <span>我的音声</span>
          <span class="nav-count">{{ audioTotal }}</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeMenu === 'photos' }"
          @click="activeMenu = 'photos'"
        >
          <el-icon><Picture /></el-icon>
          <span>我的相片</span>
          <span class="nav-count">{{ photoTotal }}</span>
        </div>
        <div
          class="nav-item"
          :class="{ active: activeMenu === 'plans' }"
          @click="activeMenu = 'plans'"
        >
          <el-icon><Document /></el-icon>
          <span>我的企划</span>
          <span class="nav-count">{{ planTotal }}</span>
        </div>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 我的主页 -->
      <div v-if="activeMenu === 'home'" class="content-section">
        <h2 class="section-title">我的主页</h2>
        
        <!-- 统计卡片 -->
        <div class="home-stats">
          <div class="stat-card" @click="activeMenu = 'photos'">
            <el-icon class="stat-icon picture"><Picture /></el-icon>
            <div class="stat-info">
              <span class="stat-number">{{ photoTotal }}</span>
              <span class="stat-label">照片</span>
            </div>
          </div>
          <div class="stat-card" @click="activeMenu = 'audios'">
            <el-icon class="stat-icon audio"><Headset /></el-icon>
            <div class="stat-info">
              <span class="stat-number">{{ audioTotal }}</span>
              <span class="stat-label">音声</span>
            </div>
          </div>
          <div class="stat-card" @click="activeMenu = 'plans'">
            <el-icon class="stat-icon plan"><Document /></el-icon>
            <div class="stat-info">
              <span class="stat-number">{{ planTotal }}</span>
              <span class="stat-label">企划</span>
            </div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <h3>快捷操作</h3>
          <div class="action-grid">
            <div class="action-item" @click="$router.push('/photo-album')">
              <div class="action-icon photo-action">
                <el-icon><Picture /></el-icon>
              </div>
              <span class="action-text">上传照片</span>
            </div>
            <div class="action-item" @click="$router.push('/audio')">
              <div class="action-icon audio-action">
                <el-icon><Headset /></el-icon>
              </div>
              <span class="action-text">上传音声</span>
            </div>
            <div class="action-item" @click="$router.push('/plan-document')">
              <div class="action-icon plan-action">
                <el-icon><Document /></el-icon>
              </div>
              <span class="action-text">上传企划</span>
            </div>
            <div class="action-item" @click="activeMenu = 'account'">
              <div class="action-icon setting-action">
                <el-icon><User /></el-icon>
              </div>
              <span class="action-text">编辑资料</span>
            </div>
          </div>
        </div>

        <!-- 最近上传的照片 -->
        <div class="recent-section" v-if="uploads.photos.length > 0">
          <div class="section-header">
            <h3>最近照片</h3>
            <el-button type="primary" link @click="activeMenu = 'photos'">
              查看全部 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="recent-photos">
            <div
              v-for="photo in uploads.photos.slice(0, 8)"
              :key="photo.id"
              class="recent-photo-item"
              @click="openImageViewer(photo.url)"
            >
              <el-image :src="photo.url" fit="cover" />
            </div>
          </div>
        </div>

        <!-- 最近上传的音声 -->
        <div class="recent-section" v-if="uploads.audios.length > 0">
          <div class="section-header">
            <h3>最近音声</h3>
            <el-button type="primary" link @click="activeMenu = 'audios'">
              查看全部 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="recent-audios-list">
            <div
              v-for="audio in uploads.audios.slice(0, 5)"
              :key="audio.id"
              class="recent-audio-row"
              @click="toggleAudioPlay(audio)"
            >
              <div class="audio-row-icon">
                <el-icon><Headset /></el-icon>
              </div>
              <div class="audio-row-info">
                <div class="audio-row-name">{{ audio.name }}</div>
                <div class="audio-row-meta">{{ audio.classification_name }} · {{ audio.upload_time }}</div>
              </div>
              <el-button
                type="primary"
                link
                :icon="playingAudioId === audio.id ? VideoPause : VideoPlay"
                class="audio-play-btn"
              >
                {{ playingAudioId === audio.id ? '暂停' : '播放' }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- 最近上传的企划 -->
        <div class="recent-section" v-if="uploads.plans.length > 0">
          <div class="section-header">
            <h3>最近企划</h3>
            <el-button type="primary" link @click="activeMenu = 'plans'">
              查看全部 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="recent-plans">
            <div
              v-for="plan in uploads.plans.slice(0, 3)"
              :key="plan.id"
              class="recent-plan-item"
            >
              <div class="plan-icon-small">
                <el-icon><Document /></el-icon>
              </div>
              <div class="plan-info">
                <div class="plan-title">{{ plan.title }}</div>
                <div class="plan-filename">{{ plan.fileName }}</div>
              </div>
              <el-tag v-if="plan.isCurrent" type="success" size="small">当前</el-tag>
              <el-tag v-else type="info" size="small">历史</el-tag>
            </div>
          </div>
        </div>

        <!-- 最新通知 -->
        <div class="recent-section" v-if="messages.length > 0">
          <div class="section-header">
            <h3>最新通知</h3>
            <el-button type="primary" link @click="activeMenu = 'messages'">
              查看全部 <el-icon><ArrowRight /></el-icon>
            </el-button>
          </div>
          <div class="recent-messages">
            <div
              v-for="msg in messages.slice(0, 3)"
              :key="msg.id"
              class="recent-message-item"
              :class="{ unread: !msg.read }"
              @click="markAsRead(msg)"
            >
              <div class="message-icon-small">
                <el-icon><Bell /></el-icon>
              </div>
              <div class="message-info">
                <div class="message-title">{{ msg.title }}</div>
                <div class="message-text">{{ msg.content }}</div>
              </div>
              <div v-if="!msg.read" class="unread-dot-small"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 消息 -->
      <div v-else-if="activeMenu === 'messages'" class="content-section">
        <div class="section-header-with-action">
          <h2 class="section-title">消息通知</h2>
          <el-button
            v-if="unreadCount > 0"
            type="primary"
            link
            :icon="Check"
            @click="markAllAsRead"
          >
            全部已读
          </el-button>
        </div>
        <div class="message-list">
          <div
            v-for="msg in paginatedMessages"
            :key="msg.id"
            class="message-item"
            :class="{ unread: !msg.read }"
            @click="markAsRead(msg)"
          >
            <div class="message-icon">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="message-content">
              <div class="message-title">{{ msg.title }}</div>
              <div class="message-text">{{ msg.content }}</div>
              <div class="message-time">{{ msg.time }}</div>
            </div>
            <div v-if="!msg.read" class="unread-dot"></div>
          </div>
        </div>
        <div v-if="messageTotal > messagePagination.pageSize" class="pagination-wrapper">
          <el-pagination
            small
            layout="prev, pager, next"
            :total="messageTotal"
            :page-size="messagePagination.pageSize"
            @current-change="messagePagination.currentPage = $event"
          />
        </div>
      </div>

      <!-- 账号信息 -->
      <div v-else-if="activeMenu === 'account'" class="content-section">
        <h2 class="section-title">账号信息</h2>
        
        <!-- 头像卡片 -->
        <div class="account-avatar-card" @click="openAvatarDialog">
          <div class="avatar-wrapper">
            <el-avatar :size="120" :src="userInfo.avatar" class="avatar-large">
              <User />
            </el-avatar>
            <div class="avatar-overlay">
              <el-icon><Camera /></el-icon>
              <span>更换头像</span>
            </div>
          </div>
          <div class="avatar-user-info">
            <div class="user-display-name">{{ userInfo.name }}</div>
            <div class="user-display-email">{{ userInfo.email }}</div>
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="account-info-card">
          <div class="info-card-header">
            <el-icon><InfoFilled /></el-icon>
            <span>基本信息</span>
          </div>
          <div class="info-list">
            <div class="info-item">
              <div class="info-label">
                <el-icon><User /></el-icon>
                <span>用户名</span>
              </div>
              <div class="info-content">
                <template v-if="!isEditingName">
                  <span class="info-value">{{ userInfo.name }}</span>
                  <el-button type="primary" link size="small" @click="startEditName">
                    <el-icon><Edit /></el-icon>
                    修改
                  </el-button>
                </template>
                <template v-else>
                  <el-input
                    v-model="editingName"
                    size="small"
                    @blur="saveName"
                    @keyup.enter="saveName"
                    ref="nameInput"
                    style="width: 200px"
                  />
                </template>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">
                <el-icon><Message /></el-icon>
                <span>邮箱</span>
              </div>
              <div class="info-content">
                <span class="info-value">{{ userInfo.email }}</span>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">
                <el-icon><Document /></el-icon>
                <span>角色</span>
              </div>
              <div class="info-content">
                <el-tag :type="getPermissionType(user.value?.permission)" size="small" effect="light">
                  {{ getPermissionLabel(user.value?.permission) }}
                </el-tag>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">
                <el-icon><Clock /></el-icon>
                <span>注册时间</span>
              </div>
              <div class="info-content">
                <span class="info-value">2024-01-01</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 账号绑定 -->
        <div class="account-info-card">
          <div class="info-card-header">
            <el-icon><Link /></el-icon>
            <span>账号绑定</span>
          </div>
          <div class="security-list">
            <div class="security-item">
              <div class="security-info">
                <div class="security-title">
                  <img src="https://www.bilibili.com/favicon.ico" class="platform-icon-small" alt="B站" />
                  哔哩哔哩
                </div>
                <div class="security-desc">
                  <template v-if="bilibiliBind.isBound">
                    <span class="bind-info">
                      {{ bilibiliBind.username }}
                      <el-tag v-if="bilibiliBind.fanLevel > 0" type="warning" size="small" effect="dark" class="fan-level">
                        <el-icon><Star /></el-icon>
                        粉丝等级 {{ bilibiliBind.fanLevel }}
                      </el-tag>
                    </span>
                  </template>
                  <template v-else>绑定B站账号，可使用B站头像</template>
                </div>
              </div>
              <el-button 
                :type="bilibiliBind.isBound ? 'danger' : 'primary'" 
                plain 
                size="small"
                @click="bilibiliBind.isBound ? unbindBilibili() : openBilibiliDialog()"
              >
                {{ bilibiliBind.isBound ? '解绑' : '绑定' }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- 安全设置 -->
        <div class="account-info-card">
          <div class="info-card-header">
            <el-icon><Lock /></el-icon>
            <span>安全设置</span>
          </div>
          <div class="security-list">
            <div class="security-item">
              <div class="security-info">
                <div class="security-title">登录密码</div>
                <div class="security-desc">定期修改密码可以保护账号安全</div>
              </div>
              <el-button type="primary" plain size="small">修改密码</el-button>
            </div>
          </div>
        </div>

        <!-- 偏好设置 -->
        <div class="account-info-card" v-if="userStore.user?.permission === 1 || userStore.user?.permission === 2">
          <div class="info-card-header">
            <el-icon><Setting /></el-icon>
            <span>偏好设置</span>
          </div>
          <div class="preference-list">
            <div class="preference-item">
              <div class="preference-info">
                <div class="preference-title">管理后台默认版本</div>
                <div class="preference-desc">设置点击导航栏"管理"时默认打开的版本</div>
              </div>
              <div class="preference-actions">
                <el-radio-group v-model="adminDefaultVersion" size="small" @change="switchAdminVersion">
                  <el-radio-button label="new">新版</el-radio-button>
                  <el-radio-button label="old">旧版</el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 我的音声 -->
      <div v-else-if="activeMenu === 'audios'" class="content-section">
        <h2 class="section-title">我的音声 <span class="count">({{ audioTotal }})</span></h2>
        <div class="data-list">
          <div v-if="uploads.audios.length === 0" class="empty-state">
            <el-empty description="暂无音声" :image-size="80" />
          </div>
          <div
            v-for="audio in paginatedAudios"
            :key="audio.id"
            class="list-item"
          >
            <div class="list-icon audio-bg">
              <el-icon><Headset /></el-icon>
            </div>
            <div class="list-content">
              <div class="list-title">{{ audio.name }}</div>
              <div class="list-meta">
                <span>{{ audio.classification_name }}</span>
                <span>{{ audio.upload_time }}</span>
              </div>
            </div>
            <el-tag :type="getStatusType(audio.status)" size="small">
              {{ getStatusText(audio.status) }}
            </el-tag>
            <div class="list-actions">
              <el-button
                type="primary"
                link
                :icon="playingAudioId === audio.id ? VideoPause : VideoPlay"
                @click="toggleAudioPlay(audio)"
              >
                {{ playingAudioId === audio.id ? '暂停' : '播放' }}
              </el-button>
              <el-button type="primary" link :icon="Edit" @click="openEditDialog('audio', audio)">编辑</el-button>
              <el-button type="danger" link :icon="Delete" @click="deleteItem('audio', audio)">删除</el-button>
            </div>
          </div>
        </div>
        <div v-if="audioTotal > audioPagination.pageSize" class="pagination-wrapper">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="audioTotal"
            :page-size="audioPagination.pageSize"
            @current-change="audioPagination.currentPage = $event"
          />
        </div>
      </div>

      <!-- 我的相片 -->
      <div v-else-if="activeMenu === 'photos'" class="content-section">
        <h2 class="section-title">我的相片 <span class="count">({{ photoTotal }})</span></h2>
        <div class="data-list">
          <div v-if="uploads.photos.length === 0" class="empty-state">
            <el-empty description="暂无相片" :image-size="80" />
          </div>
          <div
            v-for="photo in paginatedPhotos"
            :key="photo.id"
            class="list-item"
          >
            <el-image :src="photo.url" fit="cover" class="list-thumb" @click="openImageViewer(photo.url)" />
            <div class="list-content">
              <div class="list-title">{{ photo.name }}</div>
              <div class="list-meta">
                <span>{{ photo.album_name }}</span>
                <span>{{ photo.upload_time }}</span>
              </div>
            </div>
            <el-tag :type="getStatusType(photo.status)" size="small">
              {{ getStatusText(photo.status) }}
            </el-tag>
            <div class="list-actions">
              <el-button type="primary" link :icon="ZoomIn" @click="openImageViewer(photo.url)">查看</el-button>
              <el-button type="primary" link :icon="Edit" @click="openEditDialog('photo', photo)">编辑</el-button>
              <el-button type="danger" link :icon="Delete" @click="deleteItem('photo', photo)">删除</el-button>
            </div>
          </div>
        </div>
        <div v-if="photoTotal > photoPagination.pageSize" class="pagination-wrapper">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="photoTotal"
            :page-size="photoPagination.pageSize"
            @current-change="photoPagination.currentPage = $event"
          />
        </div>
      </div>

      <!-- 我的企划 -->
      <div v-else-if="activeMenu === 'plans'" class="content-section">
        <h2 class="section-title">我的企划 <span class="count">({{ planTotal }})</span></h2>
        <div class="data-list">
          <div v-if="uploads.plans.length === 0" class="empty-state">
            <el-empty description="暂无企划" :image-size="80" />
          </div>
          <div
            v-for="plan in paginatedPlans"
            :key="plan.id"
            class="list-item"
          >
            <div class="list-icon plan-bg">
              <el-icon><Document /></el-icon>
            </div>
            <div class="list-content">
              <div class="list-title">{{ plan.title }}</div>
              <div class="list-meta">
                <span>{{ plan.fileName }}</span>
                <span>{{ formatTime(plan.uploadTime) }}</span>
              </div>
            </div>
            <el-tag v-if="plan.isCurrent" type="success" size="small">当前</el-tag>
            <el-tag v-else type="info" size="small">历史</el-tag>
            <div class="list-actions">
              <el-button type="primary" link :icon="Edit" @click="openEditDialog('plan', plan)">编辑</el-button>
              <el-button type="danger" link :icon="Delete" @click="deleteItem('plan', plan)">删除</el-button>
            </div>
          </div>
        </div>
        <div v-if="planTotal > planPagination.pageSize" class="pagination-wrapper">
          <el-pagination
            background
            layout="prev, pager, next"
            :total="planTotal"
            :page-size="planPagination.pageSize"
            @current-change="planPagination.currentPage = $event"
          />
        </div>
      </div>
    </main>

    <!-- 头像上传对话框 -->
    <el-dialog v-model="avatarDialogVisible" title="更换头像" width="420px">
      <!-- B站头像选择 -->
      <div v-if="bilibiliBind.isBound" class="bilibili-avatar-option">
        <div class="option-title">选择头像来源</div>
        <div class="avatar-source-grid">
          <div 
            class="avatar-source-item" 
            :class="{ active: avatarSource === 'bilibili' }"
            @click="selectBilibiliAvatar"
          >
            <el-avatar :size="80" :src="bilibiliBind.avatar" />
            <span class="source-name">使用B站头像</span>
            <span class="source-username">{{ bilibiliBind.username }}</span>
          </div>
          <div 
            class="avatar-source-item" 
            :class="{ active: avatarSource === 'custom' }"
            @click="avatarSource = 'custom'"
          >
            <div class="custom-avatar-placeholder">
              <el-icon><Plus /></el-icon>
            </div>
            <span class="source-name">上传自定义</span>
            <span class="source-username">选择本地图片</span>
          </div>
        </div>
      </div>
      
      <!-- 自定义上传 -->
      <div v-if="!bilibiliBind.isBound || avatarSource === 'custom'" class="avatar-upload-container">
        <el-upload
          class="avatar-uploader"
          action=""
          :auto-upload="false"
          :show-file-list="false"
          :on-change="handleAvatarChange"
          accept="image/*"
        >
          <img v-if="avatarPreviewUrl" :src="avatarPreviewUrl" class="avatar-preview" />
          <div v-else class="avatar-uploader-trigger">
            <el-icon class="el-icon--upload"><Camera /></el-icon>
            <div class="el-upload__text">点击上传</div>
          </div>
        </el-upload>
      </div>
      <template #footer>
        <el-button @click="avatarDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAvatar" :loading="loading">保存</el-button>
      </template>
    </el-dialog>

    <!-- B站绑定对话框 -->
    <el-dialog v-model="bilibiliDialogVisible" title="绑定哔哩哔哩账号" width="450px">
      <el-form :model="bilibiliForm" label-position="top">
        <el-form-item label="B站主页ID">
          <el-input 
            v-model="bilibiliForm.uid" 
            placeholder="请输入B站主页ID（如：12345678）"
            clearable
          />
          <div class="form-tip">
            <el-icon><InfoFilled /></el-icon>
            <span>主页ID是B站个人空间链接中的数字部分</span>
          </div>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="bilibiliForm.agreed">
            我同意网站获取我的B站公开信息（昵称、头像、粉丝等级等）
          </el-checkbox>
          <div class="agreement-detail">
            <p>授权后，网站将获取以下信息：</p>
            <ul>
              <li>用户昵称和头像</li>
              <li>粉丝等级信息</li>
              <li>用于展示在个人信息中</li>
            </ul>
            <p>我们承诺不会将您的信息用于其他用途。</p>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bilibiliDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="bindBilibili" :loading="loading" :disabled="!bilibiliForm.agreed">
          确认绑定
        </el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editType === 'audio' ? '编辑音声' : editType === 'photo' ? '编辑相片' : '编辑企划'"
      width="500px"
    >
      <el-form ref="editFormRef" :model="editForm" label-width="80px">
        <el-form-item
          :label="editType === 'plan' ? '标题' : '名称'"
          prop="name"
          :rules="[{ required: true, message: editType === 'plan' ? '请输入标题' : '请输入名称', trigger: 'blur' }]"
        >
          <el-input
            v-model="editForm.name"
            :placeholder="editType === 'plan' ? '请输入标题' : '请输入名称'"
          />
        </el-form-item>
        <el-form-item v-if="editType === 'audio'" label="分类">
          <el-select v-model="editForm.classificationId" placeholder="选择分类" clearable>
            <el-option label="日常" :value="1" />
            <el-option label="音乐" :value="2" />
            <el-option label="语音" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editType === 'photo'" label="相册">
          <el-select v-model="editForm.albumId" placeholder="选择相册" clearable>
            <el-option label="日常" :value="1" />
            <el-option label="风景" :value="2" />
            <el-option label="人物" :value="3" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="loading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 照片预览 -->
    <el-image-viewer
      v-if="imageViewerVisible"
      :url-list="[currentImageUrl]"
      @close="imageViewerVisible = false"
    />
  </div>
</template>

<style scoped>
.profile-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f7fa;
}

/* 左侧导航栏 */
.sidebar {
  width: 240px;
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 100vh;
}

.sidebar-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.3s;
}

.back-btn:hover {
  color: var(--color-primary);
}

.user-brief {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.user-brief .user-name {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 0;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  margin: 4px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  color: #606266;
  font-size: 14px;
  position: relative;
}

.nav-item:hover {
  background: #f5f7fa;
  color: var(--color-primary);
}

.nav-item.active {
  background: var(--color-primary-alpha-10);
  color: var(--color-primary);
  font-weight: 500;
}

.nav-item .el-icon {
  font-size: 18px;
}

.nav-count {
  margin-left: auto;
  background: #e4e7ed;
  color: #909399;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.nav-item.active .nav-count {
  background: var(--color-primary);
  color: white;
}

.message-badge {
  margin-left: auto;
}

.nav-divider {
  height: 1px;
  background: #e4e7ed;
  margin: 12px 20px;
}

/* 主内容区 */
.main-content {
  flex: 1;
  padding: 24px 32px;
  min-height: 100vh;
}

.content-section {
  max-width: 100%;
}

.section-title {
  margin: 0 0 24px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.section-title .count {
  font-size: 16px;
  color: #909399;
  font-weight: normal;
}

/* 带操作按钮的标题栏 */
.section-header-with-action {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header-with-action .section-title {
  margin: 0;
}

/* 主页统计 */
.home-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-icon.picture {
  background: #e6f7ff;
  color: #1890ff;
}

.stat-icon.audio {
  background: #f6ffed;
  color: #52c41a;
}

.stat-icon.plan {
  background: #fff7e6;
  color: #fa8c16;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 快捷操作 */
.quick-actions {
  margin-bottom: 32px;
}

.quick-actions h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #303133;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.action-item {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.action-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.action-icon.photo-action {
  background: #e6f7ff;
  color: #1890ff;
}

.action-icon.audio-action {
  background: #f6ffed;
  color: #52c41a;
}

.action-icon.plan-action {
  background: #fff7e6;
  color: #fa8c16;
}

.action-icon.setting-action {
  background: #f0f5ff;
  color: #722ed1;
}

.action-text {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

/* 最近上传 */
.recent-section {
  margin-bottom: 32px;
}

.recent-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.recent-photos {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 12px;
}

.recent-photo-item {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.recent-photo-item .el-image {
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
}

.recent-photo-item:hover .el-image {
  transform: scale(1.05);
}

/* 最近音声 - 列表样式 */
.recent-audios-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.recent-audio-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.3s;
}

.recent-audio-row:last-child {
  border-bottom: none;
}

.recent-audio-row:hover {
  background: #fafafa;
}

.audio-row-icon {
  width: 36px;
  height: 36px;
  background: #f6ffed;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #52c41a;
  font-size: 18px;
  flex-shrink: 0;
}

.audio-row-info {
  flex: 1;
  min-width: 0;
}

.audio-row-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-row-meta {
  font-size: 12px;
  color: #909399;
}

.audio-play-btn {
  flex-shrink: 0;
}

/* 最近企划 */
.recent-plans {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.recent-plan-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.3s;
}

.recent-plan-item:last-child {
  border-bottom: none;
}

.recent-plan-item:hover {
  background: #fafafa;
}

.plan-icon-small {
  width: 40px;
  height: 40px;
  background: var(--color-primary-alpha-10);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 20px;
  flex-shrink: 0;
}

.plan-info {
  flex: 1;
  min-width: 0;
}

.plan-info .plan-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-info .plan-filename {
  font-size: 12px;
  color: #909399;
}

/* 最近通知 */
.recent-messages {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.recent-message-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.3s;
  position: relative;
}

.recent-message-item:last-child {
  border-bottom: none;
}

.recent-message-item:hover {
  background: #fafafa;
}

.recent-message-item.unread {
  background: #f0f9ff;
}

.message-icon-small {
  width: 36px;
  height: 36px;
  background: var(--color-primary-alpha-10);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 16px;
  flex-shrink: 0;
}

.message-info {
  flex: 1;
  min-width: 0;
}

.message-info .message-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-info .message-text {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-dot-small {
  width: 8px;
  height: 8px;
  background: #f56c6c;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 消息列表 */
.message-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background 0.3s;
  position: relative;
}

.message-item:last-child {
  border-bottom: none;
}

.message-item:hover {
  background: #fafafa;
}

.message-item.unread {
  background: #f0f9ff;
}

.message-icon {
  width: 40px;
  height: 40px;
  background: var(--color-primary-alpha-10);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 18px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
}

.message-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.message-text {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
}

.message-time {
  color: #909399;
  font-size: 12px;
}

.unread-dot {
  width: 8px;
  height: 8px;
  background: #f56c6c;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 6px;
}

/* 账号信息 */
.account-avatar-card {
  background: white;
  border-radius: 16px;
  padding: 40px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.3s;
}

.account-avatar-card:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar-large {
  border: 4px solid var(--color-primary-alpha-20);
  transition: all 0.3s;
}

.avatar-wrapper:hover .avatar-large {
  transform: scale(1.05);
  box-shadow: 0 8px 24px var(--color-primary-alpha-30);
}

.avatar-overlay {
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  height: 40px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  border-radius: 0 0 56px 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: white;
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.avatar-user-info {
  flex: 1;
}

.user-display-name {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.user-display-email {
  font-size: 14px;
  color: #909399;
}

/* 信息卡片 */
.account-info-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.info-card-header .el-icon {
  font-size: 20px;
  color: var(--color-primary);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f5f5f5;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  width: 120px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
  font-size: 14px;
}

.info-label .el-icon {
  font-size: 16px;
  color: #909399;
}

.info-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-value {
  color: #303133;
  font-size: 14px;
}

/* 安全设置 */
.security-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.security-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
}

.security-info {
  flex: 1;
}

.security-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.security-desc {
  font-size: 12px;
  color: #909399;
}

/* 音频网格 */
.audio-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.audio-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: transform 0.3s, box-shadow 0.3s;
}

.audio-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.audio-cover {
  aspect-ratio: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.audio-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.8);
}

.play-btn {
  position: absolute;
  width: 48px;
  height: 48px;
  font-size: 20px;
}

.audio-info {
  padding: 16px;
}

.audio-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audio-meta {
  color: #909399;
  font-size: 12px;
  margin-bottom: 8px;
}

/* 相片瀑布流 */
.photo-masonry {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.photo-card {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.photo-card .el-image {
  width: 100%;
  height: 100%;
  transition: transform 0.3s;
}

.photo-card:hover .el-image {
  transform: scale(1.05);
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
}

/* 列表样式 */
.data-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.3s;
}

.list-item:last-child {
  border-bottom: none;
}

.list-item:hover {
  background: #fafafa;
}

.list-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.list-icon.audio-bg {
  background: #f6ffed;
  color: #52c41a;
}

.list-icon.plan-bg {
  background: #fff7e6;
  color: #fa8c16;
}

.list-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  flex-shrink: 0;
  cursor: pointer;
}

.list-content {
  flex: 1;
  min-width: 0;
}

.list-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-meta {
  color: #909399;
  font-size: 13px;
  display: flex;
  gap: 12px;
}

.list-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* 企划时间线 */
.plan-timeline {
  position: relative;
  padding-left: 24px;
}

.plan-timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #e4e7ed;
}

.plan-card {
  position: relative;
  margin-bottom: 20px;
}

.plan-timeline-dot {
  position: absolute;
  left: -20px;
  top: 20px;
  width: 12px;
  height: 12px;
  background: var(--color-primary);
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 0 0 2px var(--color-primary-alpha-30);
}

.plan-content {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.plan-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.plan-icon {
  width: 40px;
  height: 40px;
  background: var(--color-primary-alpha-10);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  font-size: 20px;
}

.plan-title-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.plan-title {
  font-weight: 500;
  color: #303133;
}

.plan-filename {
  font-size: 12px;
  color: #909399;
}

.plan-time {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
}

/* 分页 */
.pagination-wrapper {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}

/* 头像上传 */
.avatar-upload-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.avatar-uploader {
  width: 180px;
  height: 180px;
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

/* B站头像选择 */
.bilibili-avatar-option {
  margin-bottom: 20px;
}

.option-title {
  font-size: 14px;
  color: #606266;
  margin-bottom: 16px;
  text-align: center;
}

.avatar-source-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.avatar-source-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.avatar-source-item:hover {
  border-color: var(--color-primary-alpha-50);
  background: var(--color-primary-alpha-5);
}

.avatar-source-item.active {
  border-color: var(--color-primary);
  background: var(--color-primary-alpha-10);
}

.custom-avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 2px dashed #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #909399;
}

.source-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.source-username {
  font-size: 12px;
  color: #909399;
}

/* B站绑定对话框 */
.form-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
  width: 100%;
}

.agreement-detail {
  margin-top: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 12px;
  color: #606266;
  width: 100%;
  box-sizing: border-box;
}

.agreement-detail p {
  margin: 0 0 8px 0;
}

.agreement-detail ul {
  margin: 0 0 8px 0;
  padding-left: 20px;
}

.agreement-detail li {
  margin-bottom: 4px;
}

/* 账号绑定 */
.platform-icon-small {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  vertical-align: middle;
}

.bind-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fan-level {
  font-size: 11px;
}

/* 偏好设置 */
.preference-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preference-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fafafa;
  border-radius: 12px;
}

.preference-info {
  flex: 1;
}

.preference-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.preference-desc {
  font-size: 12px;
  color: #909399;
}

.preference-actions {
  flex-shrink: 0;
}

/* 响应式 */
@media (max-width: 1200px) {
  .audio-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .photo-masonry {
    grid-template-columns: repeat(3, 1fr);
  }

  .recent-photos {
    grid-template-columns: repeat(4, 1fr);
  }

}

@media (max-width: 992px) {
  .sidebar {
    width: 200px;
  }

  .main-content {
    padding: 20px;
  }

  .home-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .audio-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .photo-masonry {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    min-height: auto;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }

  .main-content {
    min-height: auto;
    padding: 16px;
  }

  .profile-layout {
    flex-direction: column;
  }

  .home-stats {
    grid-template-columns: 1fr;
  }

  .audio-grid {
    grid-template-columns: 1fr;
  }

  .photo-masonry {
    grid-template-columns: repeat(2, 1fr);
  }

  .recent-photos {
    grid-template-columns: repeat(3, 1fr);
  }

  .action-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .action-item {
    padding: 16px;
  }

  .list-item {
    flex-wrap: wrap;
    gap: 12px;
  }

  .list-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 8px;
  }
}
</style>
