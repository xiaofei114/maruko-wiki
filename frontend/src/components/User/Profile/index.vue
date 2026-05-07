<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessage, ElImageViewer, ElMessageBox } from 'element-plus'
import {
  User, Camera, Check, Close, Clock, VideoPause, VideoPlay,
  Document, Picture, Headset, Edit, Bell, HomeFilled,
  InfoFilled, Message, ArrowLeft, Delete, More, ZoomIn, ArrowRight, Lock, Star, Link, Plus, Setting
} from '@element-plus/icons-vue'
import defaultAvatar from '@/assets/猫玩伴.png'
import zongduIcon from '@/assets/bilibili/总督.png'
import tiduIcon from '@/assets/bilibili/提督.png'
import jianzhangIcon from '@/assets/bilibili/舰长.png'
import {
  getUserProfile,
  getUserPhotos,
  getUserAudios,
  getUserPlans,
  getUserVideos,
  updatePhoto,
  updateAudio,
  updatePlan,
  deletePhoto,
  deleteAudio,
  deletePlan,
  updateUserAvatar,
  useBilibiliAvatar,
  updateUserName,
  updateUserPassword,
  getBilibiliBindInfo,
  bindBilibiliAccount,
  unbindBilibiliAccount,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  getUserAlbums,
  getUserAudioClassifications
} from '@/api/userProfile'
import { deleteVideo, moveVideoToFavorite, getMyFavorites } from '@/api/videoFavorite'

const router = useRouter()
const userStore = useUserStore()
const { user, isAuthenticated } = storeToRefs(userStore)

const ddName = import.meta.env.VITE_APP_DD_NAME

// 构建文件URL（根据环境添加/api前缀）
const baseUrl = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : (import.meta.env.VITE_APP_BASE_URL?.replace(/\/api\/?$/, '') || '')
const apiPrefix = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : '/api'
function buildFileUrl(path) {
  if (!path) return defaultAvatar
  // blob: 开头的临时URL直接返回（用于预览）
  if (path.startsWith('blob:')) return path
  // 完整http URL直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // 如果路径已经以/api开头，不再添加前缀
  if (path.startsWith('/api/')) return `${baseUrl}${path}`
  // 确保路径以 / 开头
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${apiPrefix}${normalizedPath}`
}

// 当前选中的菜单
const activeMenu = ref('home')

// 数据
const userInfo = ref({
  name: '',
  email: '',
  avatar: '',
  permission: 3,
  createTime: ''
})

const uploads = ref({
  photos: [],
  audios: [],
  plans: [],
  videos: []
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
const isSavingName = ref(false) // 防止重复提交

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
  fanLevel: 0,
  guardLevel: 0,
  fanMedalExtinguished: 0
})

// 舰长等级图标映射
const guardLevelIcons = {
  1: zongduIcon,    // 总督
  2: tiduIcon,      // 提督
  3: jianzhangIcon  // 舰长
}

// 舰长等级样式映射
const guardLevelStyles = {
  0: { label: `${import.meta.env.VITE_APP_DD_NAME}`, bgColor: '#e3f2fd', textColor: '#2196f3', borderColor: '#bbdefb' },      // 未上舰 - 浅蓝
  1: { label: '总督', bgColor: '#fff8e1', textColor: '#ff8f00', borderColor: '#ffecb3' },         // 总督 - 金色
  2: { label: '提督', bgColor: '#f3e5f5', textColor: '#7b1fa2', borderColor: '#e1bee7' },         // 提督 - 紫色
  3: { label: '舰长', bgColor: '#e8eaf6', textColor: '#303f9f', borderColor: '#c5cae9' }          // 舰长 - 蓝色
}

// 粉丝牌熄灭样式
const extinguishedStyle = {
  label: `${import.meta.env.VITE_APP_DD_NAME}`,
  bgColor: '#f5f5f5',
  textColor: '#9e9e9e',
  borderColor: '#e0e0e0'
}
const bilibiliDialogVisible = ref(false)
const bilibiliForm = ref({
  uid: '',
  agreed: false
})

// 修改密码对话框
const passwordDialogVisible = ref(false)
const passwordForm = ref({
  newPassword: '',
  confirmPassword: ''
})

// 视频移动对话框
const videoMoveDialogVisible = ref(false)
const videoMoveForm = ref({
  videoId: null,
  favoriteId: null
})
const videoMoveFormRef = ref(null)
const myFavorites = ref([])
const passwordFormRef = ref(null)
const passwordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

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
const videoPagination = ref({ currentPage: 1, pageSize: 10 })
const messagePagination = ref({ currentPage: 1, pageSize: 10 })

// 总数变量
const photoTotal = ref(0)
const audioTotal = ref(0)
const planTotal = ref(0)
const videoTotal = ref(0)
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

// 相册/分类列表（用于编辑选择）
const albums = ref([])
const classifications = ref([])

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

    // 并行获取所有数据
    const [profileRes, photosRes, audiosRes, plansRes, videosRes, notificationsRes, bilibiliRes] = await Promise.all([
      getUserProfile(),
      getUserPhotos({ page: photoPagination.value.currentPage, pageSize: photoPagination.value.pageSize }),
      getUserAudios({ page: audioPagination.value.currentPage, pageSize: audioPagination.value.pageSize }),
      getUserPlans({ page: planPagination.value.currentPage, pageSize: planPagination.value.pageSize }),
      getUserVideos({ page: videoPagination.value.currentPage, pageSize: videoPagination.value.pageSize }),
      getUserNotifications({ page: messagePagination.value.currentPage, pageSize: messagePagination.value.pageSize }),
      getBilibiliBindInfo()
    ])

    // 处理用户信息
    if (profileRes.code === 200) {
      userInfo.value = {
        name: profileRes.data.name,
        email: profileRes.data.accountNumber, // 临时使用账号作为邮箱前缀
        avatar: buildFileUrl(profileRes.data.avatar),
        permission: profileRes.data.permission || 3,
        createTime: profileRes.data.createTime
      }
    }

    // 处理照片列表
    if (photosRes.code === 200) {
      uploads.value.photos = photosRes.data.list.map(p => ({
        id: p.id,
        name: p.name,
        url: buildFileUrl(p.url),
        album_id: p.albumId,
        album_name: p.albumName,
        upload_time: formatTime(p.uploadTime),
        status: p.status
      }))
      photoTotal.value = photosRes.data.pagination?.total || 0
    }

    // 处理音声列表
    if (audiosRes.code === 200) {
      uploads.value.audios = audiosRes.data.list.map(a => ({
        id: a.id,
        name: a.name,
        url: buildFileUrl(a.url),
        classification_id: a.classificationId,
        classification_name: a.classificationName,
        upload_time: formatTime(a.uploadTime),
        status: a.status
      }))
      audioTotal.value = audiosRes.data.pagination?.total || 0
    }

    // 处理企划列表
    if (plansRes.code === 200) {
      uploads.value.plans = plansRes.data.list.map(p => ({
        id: p.id,
        title: p.title,
        fileName: p.fileName,
        uploadTime: p.uploadTime,
        isCurrent: p.isCurrent,
        status: p.status
      }))
      planTotal.value = plansRes.data.pagination?.total || 0
    }

    // 处理视频列表
    console.log('videosRes', videosRes)
    if (videosRes.code === 200 || videosRes.success) {
      uploads.value.videos = videosRes.data.list.map(v => ({
        id: v.id,
        bvid: v.bvid,
        title: v.title,
        cover: buildFileUrl(v.cover),
        uploaderName: v.uploaderName,
        totalRecommend: v.totalRecommend || 0,
        weeklyRecommend: v.weeklyRecommend || 0,
        createTime: formatTime(v.createTime),
        status: v.status,
        favoriteId: v.favoriteId,
        favoriteName: v.favoriteName
      }))
      videoTotal.value = videosRes.data.pagination?.total || 0
      console.log('videos loaded', uploads.value.videos)
    } else {
      console.error('videosRes error', videosRes)
    }

    // 处理消息列表
    if (notificationsRes.code === 200) {
      messages.value = notificationsRes.data.map(m => ({
        id: m.id,
        title: m.title,
        content: m.content,
        time: formatTime(m.time),
        read: m.read,
        type: m.type
      }))
      messageTotal.value = notificationsRes.pagination?.total || 0
    }

    // 处理B站绑定信息
    if (bilibiliRes.code === 200) {
      bilibiliBind.value = {
        ...bilibiliRes.data,
        avatar: buildFileUrl(bilibiliRes.data.avatar),
        guardLevel: bilibiliRes.data.captainType || 0,  // captainType 对应 guardLevel
        fanMedalExtinguished: bilibiliRes.data.fanMedalExtinguished || 0
      }
    }
  } catch (err) {
    error.value = '获取用户信息失败'
    ElMessage.error('获取用户信息失败')
    console.error(err)
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

    // 根据头像来源选择不同的处理方式
    if (avatarSource.value === 'bilibili') {
      // 使用B站头像
      const res = await useBilibiliAvatar()
      if (res.code === 200) {
        const newAvatarUrl = buildFileUrl(res.data.avatar)
        userInfo.value.avatar = newAvatarUrl
        // 更新 store 中的用户信息，触发 Top.vue 更新
        userStore.setUser({ ...userStore.user, avatar: res.data.avatar })
        ElMessage.success('B站头像设置成功')
        avatarDialogVisible.value = false
        avatarSource.value = 'custom'
      } else {
        ElMessage.error(res.message || 'B站头像设置失败')
      }
    } else {
      // 使用自定义头像
      if (!avatarFile.value) {
        ElMessage.error('请选择头像文件')
        loading.value = false
        return
      }

      const res = await updateUserAvatar(avatarFile.value)
      if (res.code === 200) {
        const newAvatarUrl = buildFileUrl(res.data.avatar)
        userInfo.value.avatar = newAvatarUrl
        // 更新 store 中的用户信息，触发 Top.vue 更新
        userStore.setUser({ ...userStore.user, avatar: res.data.avatar })
        ElMessage.success('头像更新成功')
        avatarDialogVisible.value = false
        avatarFile.value = null
        avatarPreviewUrl.value = ''
      } else {
        ElMessage.error(res.message || '头像更新失败')
      }
    }
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
  // 防止重复提交
  if (isSavingName.value) return

  if (editingName.value.trim() === originalName.value) {
    isEditingName.value = false
    return
  }

  isSavingName.value = true
  try {
    await ElMessageBox.confirm(`确定要修改为"${editingName.value.trim()}"吗？`, '确认修改', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    loading.value = true
    const res = await updateUserName(editingName.value.trim())
    if (res.code === 200) {
      userInfo.value.name = editingName.value.trim()
      ElMessage.success('修改成功')
      isEditingName.value = false
    } else {
      ElMessage.error(res.message || '修改失败')
    }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('修改失败')
  } finally {
    loading.value = false
    isSavingName.value = false
  }
}

function cancelEditName() {
  isEditingName.value = false
  editingName.value = originalName.value
}

// 刷新未读消息数（通知Top组件更新）
async function refreshUnreadCount() {
  try {
    const res = await getUnreadNotificationCount()
    if (res.code === 200) {
      // 触发自定义事件通知Top组件更新
      window.dispatchEvent(new CustomEvent('refresh-unread-count', { detail: res.data.count || 0 }))
    }
  } catch (error) {
    console.error('刷新未读消息数失败:', error)
  }
}

// 标记消息已读
async function markAsRead(msg) {
  try {
    const res = await markNotificationAsRead(msg.id)
    if (res.code === 200) {
      msg.read = true
      // 刷新未读消息数
      await refreshUnreadCount()
    } else {
      ElMessage.error(res.message || '标记失败')
    }
  } catch (error) {
    ElMessage.error('标记失败')
  }
}

// 标记所有消息已读
async function markAllAsRead() {
  try {
    const res = await markAllNotificationsAsRead()
    if (res.code === 200) {
      messages.value.forEach(msg => {
        msg.read = true
      })
      ElMessage.success('已全部标记为已读')
      // 刷新未读消息数
      await refreshUnreadCount()
    } else {
      ElMessage.error(res.message || '标记失败')
    }
  } catch (error) {
    ElMessage.error('标记失败')
  }
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
async function openEditDialog(type, item) {
  editType.value = type
  editForm.value = {
    id: item.id,
    name: type === 'plan' ? (item.title || '') : (item.name || ''),
    title: item.title || '',
    albumId: item.album_id || null,
    classificationId: item.classification_id || null
  }

  // 根据类型获取分类或相册列表
  if (type === 'audio') {
    await fetchAudioClassifications()
  } else if (type === 'photo') {
    await fetchUserAlbums()
  }

  editDialogVisible.value = true
}

// 获取用户的音声分类列表
async function fetchAudioClassifications() {
  try {
    const res = await getUserAudioClassifications()
    if (res.code === 200) {
      classifications.value = res.data || []
    }
  } catch (error) {
    console.error('获取音声分类失败:', error)
  }
}

// 获取用户的相册列表
async function fetchUserAlbums() {
  try {
    const res = await getUserAlbums()
    if (res.code === 200) {
      albums.value = res.data || []
    }
  } catch (error) {
    console.error('获取相册列表失败:', error)
  }
}

// 保存编辑
async function saveEdit() {
  try {
    await editFormRef.value.validate()
    loading.value = true

    let res
    if (editType.value === 'audio') {
      res = await updateAudio(editForm.value.id, {
        name: editForm.value.name,
        classificationId: editForm.value.classificationId
      })
      if (res.code === 200) {
        const index = uploads.value.audios.findIndex(a => a.id === editForm.value.id)
        if (index !== -1) {
          uploads.value.audios[index].name = editForm.value.name
          uploads.value.audios[index].classification_id = editForm.value.classificationId
          uploads.value.audios[index].isReview = res.data?.isReview ?? 1
        }
      }
    } else if (editType.value === 'photo') {
      res = await updatePhoto(editForm.value.id, {
        name: editForm.value.name,
        albumId: editForm.value.albumId
      })
      if (res.code === 200) {
        const index = uploads.value.photos.findIndex(p => p.id === editForm.value.id)
        if (index !== -1) {
          uploads.value.photos[index].name = editForm.value.name
          uploads.value.photos[index].album_id = editForm.value.albumId
          uploads.value.photos[index].isReview = res.data?.isReview ?? 1
        }
      }
    } else if (editType.value === 'plan') {
      res = await updatePlan(editForm.value.id, {
        title: editForm.value.name
      })
      if (res.code === 200) {
        const index = uploads.value.plans.findIndex(p => p.id === editForm.value.id)
        if (index !== -1) {
          uploads.value.plans[index].title = editForm.value.name
          uploads.value.plans[index].isReview = res.data?.isReview ?? 1
        }
      }
    }

    if (res.code === 200) {
      ElMessage.success(res.message || '修改成功')
      editDialogVisible.value = false
    } else {
      ElMessage.error(res.message || '修改失败')
    }
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

// 打开修改密码对话框
function openPasswordDialog() {
  passwordForm.value = { newPassword: '', confirmPassword: '' }
  passwordDialogVisible.value = true
}

// 修改密码
async function changePassword() {
  if (!passwordFormRef.value) return

  try {
    await passwordFormRef.value.validate()

    loading.value = true
    const res = await updateUserPassword(
      passwordForm.value.newPassword,
      passwordForm.value.confirmPassword
    )

    if (res.code === 200) {
      ElMessage.success('密码修改成功，请重新登录')
      passwordDialogVisible.value = false

      // 清除登录状态并跳转到登录页
      userStore.logout()
      router.push('/login')
    } else {
      ElMessage.error(res.message || '修改失败')
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    }
  } finally {
    loading.value = false
  }
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
    const res = await bindBilibiliAccount(bilibiliForm.value.uid.trim())
    if (res.code === 200) {
      bilibiliBind.value = {
        isBound: true,
        uid: res.data.uid,
        username: res.data.username,
        avatar: buildFileUrl(res.data.avatar),
        fanLevel: res.data.fanLevel,
        guardLevel: res.data.guardLevel || 0,
        fanMedalExtinguished: res.data.isExtinguished ? 1 : 0
      }
      ElMessage.success('B站账号绑定成功')
      bilibiliDialogVisible.value = false
    } else {
      ElMessage.error(res.message || '绑定失败')
    }
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
    const res = await unbindBilibiliAccount()
    if (res.code === 200) {
      bilibiliBind.value = {
        isBound: false,
        uid: '',
        username: '',
        avatar: '',
        fanLevel: 0
      }
      // 刷新用户信息，更新头像等数据
      await fetchUserInfo()
      ElMessage.success('已解绑B站账号')
    } else {
      ElMessage.error(res.message || '解绑失败')
    }
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
    let res

    if (type === 'audio') {
      res = await deleteAudio(item.id)
      if (res.code === 200) {
        uploads.value.audios = uploads.value.audios.filter(a => a.id !== item.id)
        audioTotal.value--
      }
    } else if (type === 'photo') {
      res = await deletePhoto(item.id)
      if (res.code === 200) {
        uploads.value.photos = uploads.value.photos.filter(p => p.id !== item.id)
        photoTotal.value--
      }
    } else if (type === 'plan') {
      res = await deletePlan(item.id)
      if (res.code === 200) {
        uploads.value.plans = uploads.value.plans.filter(p => p.id !== item.id)
        planTotal.value--
      }
    } else if (type === 'video') {
      res = await deleteVideo(item.id)
      if (res.success) {
        uploads.value.videos = uploads.value.videos.filter(v => v.id !== item.id)
        videoTotal.value--
        // 如果当前页没有数据了，且不是第一页，则返回上一页
        if (uploads.value.videos.length === 0 && videoPagination.value.currentPage > 1) {
          videoPagination.value.currentPage--
          await fetchUserVideos()
        }
      }
    }

    if (res.success || res.code === 200) {
      ElMessage.success('删除成功')
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  } finally {
    loading.value = false
  }
}

// 计算属性 - 直接使用 uploads 中的数据（后端已分页）
const paginatedPhotos = computed(() => uploads.value.photos)
const paginatedAudios = computed(() => uploads.value.audios)
const paginatedPlans = computed(() => uploads.value.plans)
const paginatedVideos = computed(() => uploads.value.videos)
const paginatedMessages = computed(() => messages.value)

// 分页切换处理函数
async function handlePhotoPageChange(page) {
  photoPagination.value.currentPage = page
  await fetchUserPhotos()
}

async function handleAudioPageChange(page) {
  audioPagination.value.currentPage = page
  await fetchUserAudios()
}

async function handlePlanPageChange(page) {
  planPagination.value.currentPage = page
  await fetchUserPlans()
}

async function handleVideoPageChange(page) {
  videoPagination.value.currentPage = page
  await fetchUserVideos()
}

async function handleMessagePageChange(page) {
  messagePagination.value.currentPage = page
  await fetchUserMessages()
}

// 获取照片列表
async function fetchUserPhotos() {
  try {
    const res = await getUserPhotos({
      page: photoPagination.value.currentPage,
      pageSize: photoPagination.value.pageSize
    })
    if (res.code === 200) {
      uploads.value.photos = res.data.list.map(p => ({
        id: p.id,
        name: p.name,
        url: buildFileUrl(p.url),
        album_id: p.albumId,
        album_name: p.albumName,
        upload_time: formatTime(p.uploadTime),
        status: p.status
      }))
      photoTotal.value = res.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取照片列表失败:', error)
  }
}

// 获取音声列表
async function fetchUserAudios() {
  try {
    const res = await getUserAudios({
      page: audioPagination.value.currentPage,
      pageSize: audioPagination.value.pageSize
    })
    if (res.code === 200) {
      uploads.value.audios = res.data.list.map(a => ({
        id: a.id,
        name: a.name,
        url: buildFileUrl(a.url),
        classification_id: a.classificationId,
        classification_name: a.classificationName,
        upload_time: formatTime(a.uploadTime),
        status: a.status
      }))
      audioTotal.value = res.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取音声列表失败:', error)
  }
}

// 获取企划列表
async function fetchUserPlans() {
  try {
    const res = await getUserPlans({
      page: planPagination.value.currentPage,
      pageSize: planPagination.value.pageSize
    })
    if (res.code === 200) {
      uploads.value.plans = res.data.list.map(p => ({
        id: p.id,
        title: p.title,
        create_time: formatTime(p.createTime),
        status: p.status
      }))
      planTotal.value = res.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取企划列表失败:', error)
  }
}

// 获取视频列表
async function fetchUserVideos() {
  try {
    const res = await getUserVideos({
      page: videoPagination.value.currentPage,
      pageSize: videoPagination.value.pageSize
    })
    if (res.code === 200 || res.success) {
      uploads.value.videos = res.data.list.map(v => ({
        id: v.id,
        bvid: v.bvid,
        title: v.title,
        cover: buildFileUrl(v.cover),
        uploaderName: v.uploaderName,
        totalRecommend: v.totalRecommend || 0,
        weeklyRecommend: v.weeklyRecommend || 0,
        createTime: formatTime(v.createTime),
        status: v.status,
        favoriteId: v.favoriteId,
        favoriteName: v.favoriteName
      }))
      videoTotal.value = res.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取视频列表失败:', error)
  }
}

// 获取消息列表
async function fetchUserMessages() {
  try {
    const res = await getUserNotifications({
      page: messagePagination.value.currentPage,
      pageSize: messagePagination.value.pageSize
    })
    if (res.code === 200) {
      messages.value = res.data.list.map(m => ({
        id: m.id,
        title: m.title,
        content: m.content,
        type: m.type,
        is_read: m.isRead,
        create_time: formatTime(m.createTime)
      }))
      messageTotal.value = res.data.pagination?.total || 0
    }
  } catch (error) {
    console.error('获取消息列表失败:', error)
  }
}

// 返回上一页
function goBack() {
  router.back()
}

// 打开B站视频
function openBilibiliVideo(bvid) {
  if (bvid) {
    window.open(`https://www.bilibili.com/video/${bvid}`, '_blank')
  }
}

// 打开视频移动对话框
async function openVideoMoveDialog(video) {
  console.log('打开视频移动对话框', video)
  try {
    const res = await getMyFavorites()
    console.log('获取收藏夹列表', res)
    if (res.success) {
      myFavorites.value = res.data || []
      videoMoveForm.value = {
        videoId: video.id,
        favoriteId: video.favoriteId || null
      }
      videoMoveDialogVisible.value = true
    } else {
      ElMessage.error(res.message || '获取收藏夹列表失败')
    }
  } catch (error) {
    console.error('获取收藏夹列表失败:', error)
    ElMessage.error('获取收藏夹列表失败')
  }
}

// 确认移动视频
async function confirmMoveVideo() {
  console.log('确认移动视频', videoMoveForm.value)
  if (!videoMoveForm.value.favoriteId) {
    ElMessage.warning('请选择目标收藏夹')
    return
  }
  try {
    loading.value = true
    const res = await moveVideoToFavorite(videoMoveForm.value.videoId, videoMoveForm.value.favoriteId)
    console.log('移动视频响应', res)
    if (res.success) {
      ElMessage.success('移动成功')
      videoMoveDialogVisible.value = false
      // 刷新视频列表
      await fetchUserVideos()
    } else {
      ElMessage.error(res.message || '移动失败')
    }
  } catch (error) {
    console.error('移动视频失败:', error)
    ElMessage.error('移动失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!isAuthenticated.value) {
    ElMessage.error('请先登录')
    router.push('/login')
    return
  }
  fetchUserInfo()
})

// 监听菜单切换，进入消息页面时重新获取消息列表
watch(activeMenu, async (newMenu) => {
  if (newMenu === 'messages') {
    try {
      const res = await getUserNotifications({ page: 1, pageSize: messagePagination.value.pageSize })
      if (res.code === 200) {
        messages.value = res.data.map(m => ({
          id: m.id,
          title: m.title,
          content: m.content,
          time: formatTime(m.time),
          read: m.read,
          type: m.type
        }))
        messageTotal.value = res.pagination?.total || 0
        messagePagination.value.currentPage = 1
      }
    } catch (error) {
      console.error('获取消息列表失败:', error)
    }
  } else if (newMenu === 'videos') {
    // 进入视频页面时刷新视频列表
    await fetchUserVideos()
  }
})
</script>

<template>
  <div class="profile-layout">
    <!-- 左侧导航栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="back-btn" @click="goBack">
          <el-icon>
            <ArrowLeft />
          </el-icon>
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
        <div class="nav-item" :class="{ active: activeMenu === 'home' }" @click="activeMenu = 'home'">
          <el-icon>
            <HomeFilled />
          </el-icon>
          <span>我的主页</span>
        </div>
        <div class="nav-item" :class="{ active: activeMenu === 'messages' }" @click="activeMenu = 'messages'">
          <el-icon>
            <Bell />
          </el-icon>
          <span>消息</span>
          <el-badge v-if="unreadCount > 0" :value="unreadCount" class="message-badge" />
        </div>
        <div class="nav-item" :class="{ active: activeMenu === 'account' }" @click="activeMenu = 'account'">
          <el-icon>
            <InfoFilled />
          </el-icon>
          <span>账号信息</span>
        </div>
        <div class="nav-divider"></div>
        <div class="nav-item" :class="{ active: activeMenu === 'audios' }" @click="activeMenu = 'audios'">
          <el-icon>
            <Headset />
          </el-icon>
          <span>我的音声</span>
          <span class="nav-count">{{ audioTotal }}</span>
        </div>
        <div class="nav-item" :class="{ active: activeMenu === 'photos' }" @click="activeMenu = 'photos'">
          <el-icon>
            <Picture />
          </el-icon>
          <span>我的相片</span>
          <span class="nav-count">{{ photoTotal }}</span>
        </div>
        <div class="nav-item" :class="{ active: activeMenu === 'plans' }" @click="activeMenu = 'plans'">
          <el-icon>
            <Document />
          </el-icon>
          <span>我的企划</span>
          <span class="nav-count">{{ planTotal }}</span>
        </div>
        <div class="nav-item" :class="{ active: activeMenu === 'videos' }" @click="activeMenu = 'videos'">
          <el-icon>
            <VideoPlay />
          </el-icon>
          <span>我的视频</span>
          <span class="nav-count">{{ videoTotal }}</span>
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
            <el-icon class="stat-icon picture">
              <Picture />
            </el-icon>
            <div class="stat-info">
              <span class="stat-number">{{ photoTotal }}</span>
              <span class="stat-label">照片</span>
            </div>
          </div>
          <div class="stat-card" @click="activeMenu = 'audios'">
            <el-icon class="stat-icon audio">
              <Headset />
            </el-icon>
            <div class="stat-info">
              <span class="stat-number">{{ audioTotal }}</span>
              <span class="stat-label">音声</span>
            </div>
          </div>
          <div class="stat-card" @click="activeMenu = 'plans'">
            <el-icon class="stat-icon plan">
              <Document />
            </el-icon>
            <div class="stat-info">
              <span class="stat-number">{{ planTotal }}</span>
              <span class="stat-label">企划</span>
            </div>
          </div>
          <div class="stat-card" @click="activeMenu = 'videos'">
            <el-icon class="stat-icon video">
              <VideoPlay />
            </el-icon>
            <div class="stat-info">
              <span class="stat-number">{{ videoTotal }}</span>
              <span class="stat-label">视频</span>
            </div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
          <h3>快捷操作</h3>
          <div class="action-grid">
            <div class="action-item" @click="$router.push('/photo-album')">
              <div class="action-icon photo-action">
                <el-icon>
                  <Picture />
                </el-icon>
              </div>
              <span class="action-text">上传照片</span>
            </div>
            <div class="action-item" @click="$router.push('/audio')">
              <div class="action-icon audio-action">
                <el-icon>
                  <Headset />
                </el-icon>
              </div>
              <span class="action-text">上传音声</span>
            </div>
            <div class="action-item" @click="$router.push('/plan-document')">
              <div class="action-icon plan-action">
                <el-icon>
                  <Document />
                </el-icon>
              </div>
              <span class="action-text">上传企划</span>
            </div>
            <div class="action-item" @click="$router.push('/video-favorite')">
              <div class="action-icon video-action">
                <el-icon>
                  <VideoPlay />
                </el-icon>
              </div>
              <span class="action-text">上传视频</span>
            </div>
            <div class="action-item" @click="activeMenu = 'account'">
              <div class="action-icon setting-action">
                <el-icon>
                  <User />
                </el-icon>
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
              查看全部 <el-icon>
                <ArrowRight />
              </el-icon>
            </el-button>
          </div>
          <div class="recent-photos">
            <div v-for="photo in uploads.photos.slice(0, 8)" :key="photo.id" class="recent-photo-item"
              @click="openImageViewer(photo.url)">
              <el-image :src="photo.url" fit="cover" />
            </div>
          </div>
        </div>

        <!-- 最近上传的音声 -->
        <div class="recent-section" v-if="uploads.audios.length > 0">
          <div class="section-header">
            <h3>最近音声</h3>
            <el-button type="primary" link @click="activeMenu = 'audios'">
              查看全部 <el-icon>
                <ArrowRight />
              </el-icon>
            </el-button>
          </div>
          <div class="recent-audios-list">
            <div v-for="audio in uploads.audios.slice(0, 5)" :key="audio.id" class="recent-audio-row"
              @click="toggleAudioPlay(audio)">
              <div class="audio-row-icon">
                <el-icon>
                  <Headset />
                </el-icon>
              </div>
              <div class="audio-row-info">
                <div class="audio-row-name">{{ audio.name }}</div>
                <div class="audio-row-meta">{{ audio.classification_name }} · {{ audio.upload_time }}</div>
              </div>
              <el-button type="primary" link :icon="playingAudioId === audio.id ? VideoPause : VideoPlay"
                class="audio-play-btn">
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
              查看全部 <el-icon>
                <ArrowRight />
              </el-icon>
            </el-button>
          </div>
          <div class="recent-plans">
            <div v-for="plan in uploads.plans.slice(0, 3)" :key="plan.id" class="recent-plan-item">
              <div class="plan-icon-small">
                <el-icon>
                  <Document />
                </el-icon>
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
              查看全部 <el-icon>
                <ArrowRight />
              </el-icon>
            </el-button>
          </div>
          <div class="recent-messages">
            <div v-for="msg in messages.slice(0, 3)" :key="msg.id" class="recent-message-item"
              :class="{ unread: !msg.read }" @click="markAsRead(msg)">
              <div class="message-icon-small">
                <el-icon>
                  <Bell />
                </el-icon>
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
          <el-button v-if="unreadCount > 0" type="primary" link :icon="Check" @click="markAllAsRead">
            全部已读
          </el-button>
        </div>
        <!-- 空状态提示 -->
        <div v-if="messages.length === 0" class="empty-state">
          <el-icon :size="48" class="empty-icon">
            <Bell />
          </el-icon>
          <div class="empty-text">暂无消息</div>
          <div class="empty-subtext">当有新通知时，会显示在这里</div>
        </div>
        <template v-else>
          <div class="message-list">
            <div v-for="msg in paginatedMessages" :key="msg.id" class="message-item" :class="{ unread: !msg.read }"
              @click="markAsRead(msg)">
              <div class="message-icon">
                <el-icon>
                  <Bell />
                </el-icon>
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
            <el-pagination small layout="prev, pager, next" :total="messageTotal"
              :page-size="messagePagination.pageSize" :current-page="messagePagination.currentPage"
              @current-change="handleMessagePageChange" />
          </div>
        </template>
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
              <el-icon>
                <Camera />
              </el-icon>
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
            <el-icon>
              <InfoFilled />
            </el-icon>
            <span>基本信息</span>
          </div>
          <div class="info-list">
            <div class="info-item">
              <div class="info-label">
                <el-icon>
                  <User />
                </el-icon>
                <span>用户名</span>
              </div>
              <div class="info-content">
                <template v-if="!isEditingName">
                  <span class="info-value">{{ userInfo.name }}</span>
                  <el-button type="primary" link size="small" @click="startEditName">
                    <el-icon>
                      <Edit />
                    </el-icon>
                    修改
                  </el-button>
                </template>
                <template v-else>
                  <el-input v-model="editingName" size="small" @blur="saveName" @keyup.enter="saveName" ref="nameInput"
                    style="width: 200px" />
                </template>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">
                <el-icon>
                  <Message />
                </el-icon>
                <span>邮箱</span>
              </div>
              <div class="info-content">
                <span class="info-value">{{ userInfo.email }}</span>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">
                <el-icon>
                  <Document />
                </el-icon>
                <span>角色</span>
              </div>
              <div class="info-content">
                <el-tag :type="getPermissionType(userInfo.permission)" size="small" effect="light">
                  {{ getPermissionLabel(userInfo.permission) }}
                </el-tag>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">
                <el-icon>
                  <Clock />
                </el-icon>
                <span>注册时间</span>
              </div>
              <div class="info-content">
                <span class="info-value">{{ formatTime(userInfo.createTime) }}</span>
              </div>
            </div>
            <!-- 粉丝牌信息（仅绑定B站后显示） -->
            <div class="info-item" v-if="bilibiliBind.isBound">
              <div class="info-label">
                <img src="https://www.bilibili.com/favicon.ico" class="platform-icon-small" alt="B站" />
                <span>粉丝牌</span>
              </div>
              <div class="info-content">
                <img v-if="!bilibiliBind.fanMedalExtinguished && guardLevelIcons[bilibiliBind.guardLevel]"
                  :src="guardLevelIcons[bilibiliBind.guardLevel]" class="guard-icon" alt="" />
                <span class="fan-guard-badge"
                  :class="[!bilibiliBind.fanMedalExtinguished && guardLevelIcons[bilibiliBind.guardLevel] ? 'with-icon' : 'no-icon']"
                  :style="{
                    backgroundColor: bilibiliBind.fanMedalExtinguished
                      ? extinguishedStyle.bgColor
                      : guardLevelStyles[bilibiliBind.guardLevel || 0].bgColor,
                    color: bilibiliBind.fanMedalExtinguished
                      ? extinguishedStyle.textColor
                      : guardLevelStyles[bilibiliBind.guardLevel || 0].textColor,
                    borderColor: bilibiliBind.fanMedalExtinguished
                      ? extinguishedStyle.borderColor
                      : guardLevelStyles[bilibiliBind.guardLevel || 0].borderColor
                  }">
                  <span class="badge-text">
                    {{ ddName }} {{ bilibiliBind.fanLevel > 0 ? bilibiliBind.fanLevel : '-' }}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 账号绑定 -->
        <div class="account-info-card">
          <div class="info-card-header">
            <el-icon>
              <Link />
            </el-icon>
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
                    </span>
                  </template>
                  <template v-else>绑定B站账号，可使用B站头像</template>
                </div>
              </div>
              <el-button :type="bilibiliBind.isBound ? 'danger' : 'primary'" plain size="small"
                @click="bilibiliBind.isBound ? unbindBilibili() : openBilibiliDialog()">
                {{ bilibiliBind.isBound ? '解绑' : '绑定' }}
              </el-button>
            </div>
          </div>
        </div>

        <!-- 安全设置 -->
        <div class="account-info-card">
          <div class="info-card-header">
            <el-icon>
              <Lock />
            </el-icon>
            <span>安全设置</span>
          </div>
          <div class="security-list">
            <div class="security-item">
              <div class="security-info">
                <div class="security-title">登录密码</div>
                <div class="security-desc">定期修改密码可以保护账号安全</div>
              </div>
              <el-button type="primary" plain size="small" @click="openPasswordDialog">修改密码</el-button>
            </div>
          </div>
        </div>

        <!-- 偏好设置 -->
        <div class="account-info-card" v-if="userStore.user?.permission === 1 || userStore.user?.permission === 2">
          <div class="info-card-header">
            <el-icon>
              <Setting />
            </el-icon>
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
          <div v-for="audio in paginatedAudios" :key="audio.id" class="list-item">
            <div class="list-icon audio-bg">
              <el-icon>
                <Headset />
              </el-icon>
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
              <el-button type="primary" link :icon="playingAudioId === audio.id ? VideoPause : VideoPlay"
                @click="toggleAudioPlay(audio)">
                {{ playingAudioId === audio.id ? '暂停' : '播放' }}
              </el-button>
              <el-button type="primary" link :icon="Edit" @click="openEditDialog('audio', audio)">编辑</el-button>
              <el-button type="danger" link :icon="Delete" @click="deleteItem('audio', audio)">删除</el-button>
            </div>
          </div>
        </div>
        <div v-if="audioTotal > audioPagination.pageSize" class="pagination-wrapper">
          <el-pagination background layout="prev, pager, next" :total="audioTotal" :page-size="audioPagination.pageSize"
            :current-page="audioPagination.currentPage" @current-change="handleAudioPageChange" />
        </div>
      </div>

      <!-- 我的相片 -->
      <div v-else-if="activeMenu === 'photos'" class="content-section">
        <h2 class="section-title">我的相片 <span class="count">({{ photoTotal }})</span></h2>
        <div class="data-list">
          <div v-if="uploads.photos.length === 0" class="empty-state">
            <el-empty description="暂无相片" :image-size="80" />
          </div>
          <div v-for="photo in paginatedPhotos" :key="photo.id" class="list-item">
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
          <el-pagination background layout="prev, pager, next" :total="photoTotal" :page-size="photoPagination.pageSize"
            :current-page="photoPagination.currentPage" @current-change="handlePhotoPageChange" />
        </div>
      </div>

      <!-- 我的企划 -->
      <div v-else-if="activeMenu === 'plans'" class="content-section">
        <h2 class="section-title">我的企划 <span class="count">({{ planTotal }})</span></h2>
        <div class="data-list">
          <div v-if="uploads.plans.length === 0" class="empty-state">
            <el-empty description="暂无企划" :image-size="80" />
          </div>
          <div v-for="plan in paginatedPlans" :key="plan.id" class="list-item">
            <div class="list-icon plan-bg">
              <el-icon>
                <Document />
              </el-icon>
            </div>
            <div class="list-content">
              <div class="list-title">{{ plan.title }}</div>
              <div class="list-meta">
                <span>{{ plan.fileName }}</span>
                <span>{{ formatTime(plan.uploadTime) }}</span>
              </div>
            </div>
            <el-tag :type="getStatusType(plan.status)" size="small">
              {{ getStatusText(plan.status) }}
            </el-tag>
            <el-tag v-if="plan.isCurrent" type="success" size="small" class="current-tag">当前</el-tag>
            <div class="list-actions">
              <el-button type="primary" link :icon="Edit" @click="openEditDialog('plan', plan)">编辑</el-button>
              <el-button type="danger" link :icon="Delete" @click="deleteItem('plan', plan)">删除</el-button>
            </div>
          </div>
        </div>
        <div v-if="planTotal > planPagination.pageSize" class="pagination-wrapper">
          <el-pagination background layout="prev, pager, next" :total="planTotal" :page-size="planPagination.pageSize"
            :current-page="planPagination.currentPage" @current-change="handlePlanPageChange" />
        </div>
      </div>

      <!-- 我的视频 -->
      <div v-else-if="activeMenu === 'videos'" class="content-section">
        <h2 class="section-title">我的视频 <span class="count">({{ videoTotal }})</span></h2>
        <div class="data-list">
          <div v-if="uploads.videos.length === 0" class="empty-state">
            <el-empty description="暂无视频" :image-size="80" />
          </div>
          <div v-for="video in paginatedVideos" :key="video.id" class="list-item video-item">
            <el-image :src="video.cover" fit="cover" class="list-thumb video-thumb"
              @click="openBilibiliVideo(video.bvid)">
              <template #error>
                <div class="video-thumb-placeholder">
                  <el-icon>
                    <VideoPlay />
                  </el-icon>
                </div>
              </template>
            </el-image>
            <div class="list-content">
              <div class="list-title">{{ video.title }}</div>
              <div class="list-meta">
                <span v-if="video.favoriteName">{{ video.favoriteName }}</span>
                <span>{{ video.createTime }}</span>
              </div>
              <div class="video-stats">
                <span class="stat-item">
                  <el-icon>
                    <Star />
                  </el-icon>
                  {{ video.totalRecommend }} 推荐
                </span>
                <span class="stat-item weekly-stat" v-if="video.weeklyRecommend > 0">
                  本周 {{ video.weeklyRecommend }}
                </span>
              </div>
            </div>
            <el-tag :type="getStatusType(video.status)" size="small">
              {{ getStatusText(video.status) }}
            </el-tag>
            <div class="list-actions">
              <el-button type="primary" link :icon="VideoPlay" @click="openBilibiliVideo(video.bvid)">播放</el-button>
              <el-button type="primary" link :icon="Edit" @click="openVideoMoveDialog(video)">移动</el-button>
              <el-button type="danger" link :icon="Delete" @click="deleteItem('video', video)">删除</el-button>
            </div>
          </div>
        </div>
        <div v-if="videoTotal > videoPagination.pageSize" class="pagination-wrapper">
          <el-pagination background layout="prev, pager, next" :total="videoTotal" :page-size="videoPagination.pageSize"
            :current-page="videoPagination.currentPage" @current-change="handleVideoPageChange" />
        </div>
      </div>
    </main>

    <!-- 头像上传对话框 -->
    <el-dialog v-model="avatarDialogVisible" title="更换头像" width="420px">
      <!-- B站头像选择 -->
      <div v-if="bilibiliBind.isBound" class="bilibili-avatar-option">
        <div class="option-title">选择头像来源</div>
        <div class="avatar-source-grid">
          <div class="avatar-source-item" :class="{ active: avatarSource === 'bilibili' }"
            @click="selectBilibiliAvatar">
            <el-avatar :size="80" :src="bilibiliBind.avatar" />
            <span class="source-name">使用B站头像</span>
            <span class="source-username">{{ bilibiliBind.username }}</span>
          </div>
          <div class="avatar-source-item" :class="{ active: avatarSource === 'custom' }"
            @click="avatarSource = 'custom'">
            <div class="custom-avatar-placeholder">
              <el-icon>
                <Plus />
              </el-icon>
            </div>
            <span class="source-name">上传自定义</span>
            <span class="source-username">选择本地图片</span>
          </div>
        </div>
      </div>

      <!-- 自定义上传 -->
      <div v-if="!bilibiliBind.isBound || avatarSource === 'custom'" class="avatar-upload-container">
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
        <el-button @click="avatarDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAvatar" :loading="loading">保存</el-button>
      </template>
    </el-dialog>

    <!-- B站绑定对话框 -->
    <el-dialog v-model="bilibiliDialogVisible" title="绑定哔哩哔哩账号" width="450px">
      <el-form :model="bilibiliForm" label-position="top">
        <el-form-item label="B站主页ID">
          <el-input v-model="bilibiliForm.uid" placeholder="请输入B站主页ID（如：12345678）" clearable />
          <div class="form-tip">
            <el-icon>
              <InfoFilled />
            </el-icon>
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

    <!-- 修改密码对话框 -->
    <el-dialog v-model="passwordDialogVisible" title="修改密码" width="400px">
      <el-form ref="passwordFormRef" :model="passwordForm" :rules="passwordRules" label-position="top">
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码（至少6位）" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="changePassword" :loading="loading">确认修改</el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible"
      :title="editType === 'audio' ? '编辑音声' : editType === 'photo' ? '编辑相片' : '编辑企划'" width="500px">
      <el-form ref="editFormRef" :model="editForm" label-width="80px">
        <el-form-item :label="editType === 'plan' ? '标题' : '名称'" prop="name"
          :rules="[{ required: true, message: editType === 'plan' ? '请输入标题' : '请输入名称', trigger: 'blur' }]">
          <el-input v-model="editForm.name" :placeholder="editType === 'plan' ? '请输入标题' : '请输入名称'" />
        </el-form-item>
        <el-form-item v-if="editType === 'audio'" label="分类">
          <el-select v-model="editForm.classificationId" placeholder="选择分类" clearable>
            <el-option v-for="item in classifications" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editType === 'photo'" label="相册">
          <el-select v-model="editForm.albumId" placeholder="选择相册" clearable>
            <el-option v-for="item in albums" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="loading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 照片预览 -->
    <el-image-viewer v-if="imageViewerVisible" :url-list="[currentImageUrl]" @close="imageViewerVisible = false" />

    <!-- 视频移动对话框 -->
    <el-dialog v-model="videoMoveDialogVisible" title="移动到收藏夹" width="400px">
      <el-form ref="videoMoveFormRef" :model="videoMoveForm" label-position="top">
        <el-form-item label="选择收藏夹" prop="favoriteId"
          :rules="[{ required: true, message: '请选择收藏夹', trigger: 'change' }]">
          <el-select v-model="videoMoveForm.favoriteId" placeholder="请选择目标收藏夹" style="width: 100%">
            <el-option v-for="item in myFavorites" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="videoMoveDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMoveVideo" :loading="loading">确认移动</el-button>
      </template>
    </el-dialog>
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

.stat-icon.video {
  background: #fff2f0;
  color: #f5222d;
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

.action-icon.video-action {
  background: #fff2f0;
  color: #f5222d;
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

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.empty-icon {
  color: #c0c4cc;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #606266;
  margin-bottom: 8px;
}

.empty-subtext {
  font-size: 14px;
  color: #909399;
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
  position: relative;
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

.list-thumb.video-thumb {
  width: 80px;
  height: 60px;
  border-radius: 6px;
}

.video-thumb-placeholder {
  width: 80px;
  height: 60px;
  border-radius: 6px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 24px;
}

.video-stats {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

.video-stats .stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.video-stats .weekly-stat {
  color: #f5222d;
  font-weight: 500;
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

.current-tag {
  margin-left: 8px;
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
  flex-wrap: wrap;
}

.fan-level {
  font-size: 11px;
}

/* 粉丝等级和舰长徽章 */
.fan-guard-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 12px;
  border: 1px solid;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.5;
}

.fan-guard-badge.with-icon {
  padding: 2px 8px 2px 28px;
}

.fan-guard-badge.no-icon {
  padding: 2px 8px 2px 8px;
}

.guard-icon {
  position: absolute;
  left: -3px;
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.badge-text {
  white-space: nowrap;
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

  /* 视频列表移动端适配 */
  .list-thumb.video-thumb,
  .video-thumb-placeholder {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 10;
  }

  .video-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .video-item .list-content {
    width: 100%;
  }

  .video-item .list-title {
    font-size: 14px;
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .video-stats {
    flex-wrap: wrap;
    gap: 8px;
  }
}

/* 更小屏幕的适配 */
@media (max-width: 480px) {
  .home-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .action-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .video-item .list-actions {
    width: auto;
    margin-top: 0;
  }
}

@media (max-width: 375px) {
  .home-stats {
    grid-template-columns: 1fr;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
