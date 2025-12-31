<script setup>
import Top from '@/components/Top.vue'
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { User, Picture, Files, Plus, VideoPlay, Edit, Delete, InfoFilled, Loading, Check, VideoPause } from '@element-plus/icons-vue'
import {
    getAudioCategories,
    reviewAudio,
    updateAudio,
    deleteAudio,
    getAlbumCategories,
    reviewAlbum,
    updateAlbum,
    deleteAlbum,
    reviewPhoto,
    updatePhoto,
    deletePhoto,
    updateAudioClassification,
    deleteAudioClassification,
    getUsers,
    banUser,
    changeUserPermission as changeUserPermissionAPI,
    resetUserPassword as resetUserPasswordAPI,
    deleteUser as deleteUserAPI
} from '@/api/admin'

// 用户状态
const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)
const { permission } = storeToRefs(userStore)

// 活跃标签页
const activeTab = ref('audio')

// 选中的音频/相册/用户
const selectedAudio = ref(null)
const selectedAlbum = ref(null)
const selectedUser = ref(null)

// 编辑对话框
const editCategoryDialog = ref(false)
const editingCategory = ref(null)
const editCategoryForm = ref({
    name: ''
})

// 编辑音频对话框
const editAudioDialog = ref(false)
const editingAudio = ref(null)
const editAudioForm = ref({
    name: ''
})

// 编辑相册对话框
const editAlbumDialog = ref(false)
const editingAlbum = ref(null)
const editAlbumForm = ref({
    name: '',
    introduction: ''
})

// 编辑照片对话框
const editPhotoDialog = ref(false)
const editingPhoto = ref(null)
const editPhotoForm = ref({
    name: ''
})

// 音频播放
const playingAudioId = ref(null)
const audioPlayers = ref(new Map())

// 加载状态
const loading = ref(false)
const audioLoading = ref(false)
const albumLoading = ref(false)

// API数据
const audioCategories = ref([])
const albumTags = ref([])
const users = ref([])

// 计算属性
const userStats = computed(() => ({
    total: users.value.length,
    active: users.value.filter(u => u.is_banned === 0).length,
    inactive: users.value.filter(u => u.is_banned === 1).length
}))

const contentStats = computed(() => {
    // 计算音频总数
    const audioCount = audioCategories.value.reduce((sum, category) => sum + category.audios.length, 0)

    // 计算相册和照片总数
    const albumCount = albumTags.value.length
    const photoCount = albumTags.value.reduce((sum, album) => sum + album.photos.length, 0)

    return {
        audioFiles: audioCount,
        albums: albumCount,
        totalPhotos: photoCount
    }
})

// 数据获取方法
const fetchAudioCategories = async () => {
    try {
        audioLoading.value = true
        const response = await getAudioCategories()
        audioCategories.value = response.data
    } catch (error) {
        console.error('获取音频分类失败:', error)
        ElMessage.error('获取音频分类失败')
    } finally {
        audioLoading.value = false
    }
}

const fetchAlbumCategories = async () => {
    try {
        albumLoading.value = true
        const response = await getAlbumCategories()
        albumTags.value = response.data
    } catch (error) {
        console.error('获取相册分类失败:', error)
        ElMessage.error('获取相册分类失败')
    } finally {
        albumLoading.value = false
    }
}

const fetchUsers = async () => {
    try {
        const response = await getUsers()
        users.value = response.data.sort((a, b) => {
            // 首先按权限等级排序（权限低的在前）
            if (a.permission !== b.permission) {
                return a.permission - b.permission
            }
            // 相同权限的按注册时间排序（早注册的在前）
            return parseInt(a.create_time || 0) - parseInt(b.create_time || 0)
        })
    } catch (error) {
        console.error('获取用户列表失败:', error)
        ElMessage.error('获取用户列表失败')
    }
}

const fetchAllData = async () => {
    const promises = [
        fetchAudioCategories(),
        fetchAlbumCategories()
    ]

    // 只有超级管理员才能获取用户数据
    if (permission.value === 1) {
        promises.push(fetchUsers())
    }

    await Promise.all(promises)
}

// 方法
const getPermissionLabel = (permission) => {
    const labels = { 1: '超级管理员', 2: '管理员', 3: '猫丸伴' }
    return labels[permission] || '未知'
}

const getPermissionType = (permission) => {
    const types = { 1: 'danger', 2: 'warning', 3: 'primary' }
    return types[permission] || 'info'
}


const getStatusLabel = (isBanned) => {
    return isBanned === 0 ? '正常' : '禁用'
}

const getStatusType = (isBanned) => {
    return isBanned === 0 ? 'success' : 'danger'
}

// 将相对URL转换为绝对URL
const getFullUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    // 假设后端基础URL是环境变量或固定值
    const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:6660'
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

// 格式化时间为人类可读格式
const formatTime = (timeStr) => {
    if (!timeStr) return ''

    try {
        const timestamp = parseInt(timeStr)
        const date = new Date(timestamp * 1000)

        // 检查是否为有效日期
        if (isNaN(date.getTime())) return timeStr

        const now = new Date()
        const diffMs = now - date
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffMinutes = Math.floor(diffMs / (1000 * 60))

        if (diffMinutes < 1) return '刚刚'
        if (diffMinutes < 60) return `${diffMinutes}分钟前`
        if (diffHours < 24) return `${diffHours}小时前`
        if (diffDays < 7) return `${diffDays}天前`

        // 超过7天显示具体日期
        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const day = date.getDate()
        const hour = date.getHours()
        const minute = date.getMinutes()

        // 如果是今年，不显示年份
        const currentYear = now.getFullYear()
        if (year === currentYear) return `${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        else return `${year}年${month}月${day}日 ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    } catch (error) {
        console.warn('时间格式化失败:', error)
        return timeStr // 出错时返回原始字符串
    }
}

// 播放/暂停音频
const toggleAudioPlay = (audio) => {
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
        player = new Audio(getFullUrl(audio.url))
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

// 用户管理方法
const changeUserPermission = async (user) => {
    try {
        let newPermission
        let actionText
        let confirmText

        if (user.permission === 3) {
            // 普通用户 -> 管理员
            newPermission = 2
            actionText = '授予管理员权限'
            confirmText = `确定要授予用户"${user.name}"管理员权限吗？`
        } else if (user.permission === 2) {
            // 管理员 -> 普通用户
            newPermission = 3
            actionText = '撤销管理员权限'
            confirmText = `确定要撤销用户"${user.name}"的管理员权限吗？`
        } else {
            ElMessage.warning('无法修改超级管理员权限')
            return
        }

        // 二次确认
        await ElMessageBox.confirm(
            confirmText,
            actionText,
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning',
                confirmButtonClass: 'el-button--warning'
            }
        )

        // 调用修改权限API
        await changeUserPermissionAPI(user.id, newPermission)

        // 更新本地数据
        user.permission = newPermission

        const resultText = user.permission === 2 ? '已授予管理员权限' : '已撤销管理员权限'
        ElMessage.success(`用户"${user.name}"${resultText}`)

    } catch (error) {
        if (error !== 'cancel') {
            console.error('修改用户权限失败:', error)
            ElMessage.error('修改用户权限失败')
        }
    }
}

const deleteUser = async (user) => {
    try {
        await ElMessageBox.confirm(`确定要删除用户"${user.name}"吗？此操作不可恢复。`, '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        // 调用删除用户API
        await deleteUserAPI(user.id)

        // 从本地数据中移除用户
        const index = users.value.findIndex(u => u.id === user.id)
        if (index > -1) {
            users.value.splice(index, 1)

            // 如果删除的是当前选中的用户，清空选择状态
            if (selectedUser.value && selectedUser.value.id === user.id) {
                selectedUser.value = null
            }

            ElMessage.success('用户已删除')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除用户失败:', error)
            ElMessage.error('删除用户失败')
        }
    }
}

const toggleUserStatus = async (user) => {
    try {
        const newStatus = user.is_banned === 0 ? 1 : 0

        await banUser(user.id, newStatus)

        // 更新本地数据
        user.is_banned = newStatus
        ElMessage.success(`用户${user.name}已${user.is_banned === 0 ? '启用' : '禁用'}`)
    } catch (error) {
        console.error('修改用户状态失败:', error)
        ElMessage.error('修改用户状态失败')
    }
}

const resetUserPassword = async (user) => {
    try {
        await ElMessageBox.confirm(
            `确定要重置用户"${user.name}"的密码吗？\n\n重置后新密码将发送到用户的注册邮箱。`,
            '重置密码确认',
            {
                confirmButtonText: '确定重置',
                cancelButtonText: '取消',
                type: 'warning',
                confirmButtonClass: 'el-button--warning'
            }
        )

        // 调用重置密码API
        await resetUserPasswordAPI(user.id)

        ElMessage.success(`用户"${user.name}"的密码已重置，新密码已发送到注册邮箱`)

    } catch (error) {
        if (error !== 'cancel') {
            console.error('重置密码失败:', error)
            ElMessage.error('重置密码失败')
        }
    }
}

// 内容管理方法
// 审核音频通过
const approveAudio = async (audio) => {
    try {
        await reviewAudio(audio.id, 1)

        // 更新本地数据
        audio.is_review = 1
        ElMessage.success('音频已审核通过')
    } catch (error) {
        console.error('审核音频失败:', error)
        ElMessage.error('审核音频失败')
    }
}

// 审核音频不通过
const rejectAudio = async (audio) => {
    try {
        await reviewAudio(audio.id, 2)

        // 更新本地数据
        audio.is_review = 2
        ElMessage.success('音频已审核不通过')
    } catch (error) {
        console.error('审核音频失败:', error)
        ElMessage.error('审核音频失败')
    }
}

// 撤销音频审核
const revokeAudioReview = async (audio) => {
    try {
        await reviewAudio(audio.id, 0)

        // 更新本地数据
        audio.is_review = 0
        ElMessage.success('已撤销音频审核')
    } catch (error) {
        console.error('撤销审核失败:', error)
        ElMessage.error('撤销审核失败')
    }
}

const editAudio = (audio) => {
    editingAudio.value = audio
    editAudioForm.value.name = audio.name
    editAudioDialog.value = true
}

const editAudioCategory = (category) => {
    editingCategory.value = category
    editCategoryForm.value.name = category.name
    editCategoryDialog.value = true
}

// 处理编辑分类提交
const handleEditCategory = async () => {
    try {
        await updateAudioClassification(editingCategory.value.id, {
            name: editCategoryForm.value.name
        })

        ElMessage.success('音频分类更新成功')
        editCategoryDialog.value = false

        // 重新获取数据
        await fetchAudioCategories()
    } catch (error) {
        console.error('更新音频分类失败:', error)
        ElMessage.error('更新音频分类失败')
    }
}

// 处理编辑音频提交
const handleEditAudio = async () => {
    try {
        await updateAudio(editingAudio.value.id, {
            name: editAudioForm.value.name
        })

        // 立即更新本地数据
        editingAudio.value.name = editAudioForm.value.name

        ElMessage.success('音频更新成功')
        editAudioDialog.value = false

        // 重新获取数据
        await fetchAudioCategories()
    } catch (error) {
        console.error('更新音频失败:', error)
        ElMessage.error('更新音频失败')
    }
}

// 处理编辑相册提交
const handleEditAlbum = async () => {
    try {
        await updateAlbum(editingAlbum.value.id, {
            name: editAlbumForm.value.name,
            introduction: editAlbumForm.value.introduction
        })

        // 立即更新本地数据
        editingAlbum.value.name = editAlbumForm.value.name
        editingAlbum.value.introduction = editAlbumForm.value.introduction

        ElMessage.success('相册更新成功')
        editAlbumDialog.value = false

        // 重新获取数据
        await fetchAlbumCategories()
    } catch (error) {
        console.error('更新相册失败:', error)
        ElMessage.error('更新相册失败')
    }
}

// 处理编辑照片提交
const handleEditPhoto = async () => {
    try {
        await updatePhoto(editingPhoto.value.id, {
            name: editPhotoForm.value.name
        })

        // 立即更新本地数据
        editingPhoto.value.name = editPhotoForm.value.name

        ElMessage.success('照片更新成功')
        editPhotoDialog.value = false

        // 重新获取数据
        await fetchAlbumCategories()
    } catch (error) {
        console.error('更新照片失败:', error)
        ElMessage.error('更新照片失败')
    }
}

const deleteAudioCategory = async (category) => {
    try {
        await ElMessageBox.confirm(`确定要删除分类"${category.name}"吗？只有当分类下没有任何音频时才能删除。`, '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        await deleteAudioClassification(category.id)
        ElMessage.success('音频分类已删除')

        // 重新获取数据
        await fetchAudioCategories()
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除音频分类失败:', error)
            const errorMessage = error.response?.data?.message || '删除音频分类失败'
            ElMessage.error(errorMessage)
        }
    }
}

const handleDeleteAudio = async (audio, category) => {
    try {
        await ElMessageBox.confirm(`确定要删除音频"${audio.name}"吗？`, '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        await deleteAudio(audio.id)
        ElMessage.success('音频已删除')

        console.log('🎵 删除音频成功，准备刷新数据...')

        // 重新获取数据
        await fetchAudioCategories()

        console.log('🎵 数据刷新完成，当前音频分类:', audioCategories.value)

        // 如果删除的是当前选中分类中的音频，清空选择状态
        if (selectedAudio.value && selectedAudio.value.id === category.id) {
            const remainingAudios = selectedAudio.value.audios.filter(a => a.id !== audio.id)
            selectedAudio.value.audios = remainingAudios
            console.log('🎵 更新了选中分类的音频列表')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除音频失败:', error)
            ElMessage.error('删除音频失败')
        }
    }
}

const editPhoto = (photo) => {
    editingPhoto.value = photo
    editPhotoForm.value.name = photo.name
    editPhotoDialog.value = true
}

// 选择逻辑
const selectAudioCategory = (category) => {
    selectedAudio.value = category
    selectedAlbum.value = null
    selectedUser.value = null
    activeTab.value = 'audio'
}

const selectAlbum = (album) => {
    selectedAlbum.value = album
    selectedAudio.value = null
    selectedUser.value = null
    activeTab.value = 'albums'
}

const selectUser = (user) => {
    selectedUser.value = user
    selectedAudio.value = null
    selectedAlbum.value = null
    activeTab.value = 'users'
}

const handleDeletePhoto = async (photo, album) => {
    try {
        await ElMessageBox.confirm(`确定要删除照片"${photo.name}"吗？`, '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        await deletePhoto(photo.id)

        ElMessage.success('照片已删除')

        // 重新获取数据（保持数据同步）
        await fetchAlbumCategories()

        // 如果删除的是当前选中相册中的照片，更新选中状态
        if (selectedAlbum.value && selectedAlbum.value.id === album.id) {
            selectedAlbum.value.photos = selectedAlbum.value.photos.filter(p => p.id !== photo.id)
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除照片失败:', error)
            ElMessage.error('删除照片失败')
        }
    }
}


const editAlbum = (album) => {
    editingAlbum.value = album
    editAlbumForm.value.name = album.name
    editAlbumForm.value.introduction = album.introduction || ''
    editAlbumDialog.value = true
}


// 审核照片
// 审核照片通过
const approvePhoto = async (photo) => {
    try {
        await reviewPhoto(photo.id, 1)

        // 更新本地数据
        photo.is_review = 1
        ElMessage.success('照片已审核通过')
    } catch (error) {
        console.error('审核照片失败:', error)
        ElMessage.error('审核照片失败')
    }
}

// 审核照片不通过
const rejectPhoto = async (photo) => {
    try {
        await reviewPhoto(photo.id, 2)

        // 更新本地数据
        photo.is_review = 2
        ElMessage.success('照片已审核不通过')
    } catch (error) {
        console.error('审核照片失败:', error)
        ElMessage.error('审核照片失败')
    }
}

// 撤销照片审核
const revokePhotoReview = async (photo) => {
    try {
        await reviewPhoto(photo.id, 0)

        // 更新本地数据
        photo.is_review = 0
        ElMessage.success('已撤销照片审核')
    } catch (error) {
        console.error('撤销审核失败:', error)
        ElMessage.error('撤销审核失败')
    }
}

const handleDeleteAlbum = async (album) => {
    try {
        await ElMessageBox.confirm(`确定要删除相册"${album.name}"吗？相册内的所有照片也将被删除。`, '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        })

        await deleteAlbum(album.id)

        // 从本地相册数据中立即移除相册
        const albumIndex = albumTags.value.findIndex(a => a.id === album.id)
        if (albumIndex > -1) {
            albumTags.value.splice(albumIndex, 1)
        }

        // 如果删除的是当前选中的相册，清空选择状态
        if (selectedAlbum.value && selectedAlbum.value.id === album.id) {
            selectedAlbum.value = null
            // 切换到音频tab，因为相册tab已经没有选中的内容了
            activeTab.value = 'audio'
        }

        ElMessage.success('相册已删除')

        // 重新获取数据（保持数据同步）
        await fetchAlbumCategories()
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除相册失败:', error)
            ElMessage.error('删除相册失败')
        }
    }
}

// 组件挂载时获取数据
onMounted(() => {
    fetchAllData()
})

</script>

<template>
    <div class="admin-page">
        <!-- 顶部导航栏 -->
        <Top />

        <div class="content-wrapper">
            <!-- 页面头部 -->
            <section class="page-hero">
                <div class="hero-content">
                    <h1 class="hero-title">管理后台</h1>
                    <p class="hero-subtitle">守护方寸秩序，为你呈现此刻美好</p>
                </div>
            </section>

            <!-- 统计卡片 -->
            <div class="stats-grid">
                <div class="stat-card" v-if="permission !== 2">
                    <div class="stat-icon">
                        <el-icon>
                            <User />
                        </el-icon>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">{{ userStats.total }}</div>
                        <div class="stat-label">总用户数</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <el-icon>
                            <VideoPlay />
                        </el-icon>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">{{ contentStats.audioFiles }}</div>
                        <div class="stat-label">音频文件</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <el-icon>
                            <Picture />
                        </el-icon>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">{{ contentStats.albums }}</div>
                        <div class="stat-label">相册数量</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <el-icon>
                            <Files />
                        </el-icon>
                    </div>
                    <div class="stat-content">
                        <div class="stat-value">{{ contentStats.totalPhotos }}</div>
                        <div class="stat-label">照片总数</div>
                    </div>
                </div>
            </div>

            <!-- 双栏管理布局 -->
            <div class="management-layout">
                <!-- 左侧：音频/相册标签列表 -->
                <div class="left-panel">
                    <el-tabs v-model="activeTab" class="category-tabs">
                        <!-- 音频分类 -->
                        <el-tab-pane label="音频管理" name="audio">
                            <div v-if="audioLoading" class="loading-state">
                                <el-icon class="loading-icon">
                                    <Loading />
                                </el-icon>
                                <p>加载音频分类中...</p>
                            </div>
                            <div v-else-if="audioCategories.length === 0" class="empty-state">
                                <el-empty description="暂无音频分类" :image-size="60">
                                    <template #image>
                                        <el-icon size="60" class="empty-icon">
                                            <VideoPlay />
                                        </el-icon>
                                    </template>
                                </el-empty>
                            </div>
                            <div v-else class="tag-list">
                                <div v-for="category in audioCategories" :key="category.id"
                                    :class="['tag-item', { active: selectedAudio?.id === category.id }]"
                                    @click="selectAudioCategory(category)">
                                    <el-icon class="audio-icon">
                                        <VideoPlay />
                                    </el-icon>
                                    <div class="tag-info">
                                        <span class="tag-name">{{ category.name }}</span>
                                        <span class="tag-meta">{{ category.audios?.length || 0 }} 个音频</span>
                                    </div>
                                    <div class="tag-actions">
                                        <el-button size="small" @click.stop="editAudioCategory(category)" type="primary"
                                            circle plain>
                                            <el-icon>
                                                <Edit />
                                            </el-icon>
                                        </el-button>
                                        <el-button size="small" @click.stop="deleteAudioCategory(category)" type="danger"
                                            circle plain>
                                            <el-icon>
                                                <Delete />
                                            </el-icon>
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </el-tab-pane>

                        <!-- 相册标签 -->
                        <el-tab-pane label="相册管理" name="albums">
                            <div v-if="albumLoading" class="loading-state">
                                <el-icon class="loading-icon">
                                    <Loading />
                                </el-icon>
                                <p>加载相册分类中...</p>
                            </div>
                            <div v-else-if="albumTags.length === 0" class="empty-state">
                                <el-empty description="暂无相册分类" :image-size="60">
                                    <template #image>
                                        <el-icon size="60" class="empty-icon">
                                            <Picture />
                                        </el-icon>
                                    </template>
                                </el-empty>
                            </div>
                            <div v-else class="tag-list">
                                <div v-for="album in albumTags" :key="album.id"
                                    :class="['tag-item', { active: selectedAlbum?.id === album.id }]"
                                    @click="selectAlbum(album)">
                                    <el-icon class="album-icon">
                                        <Picture />
                                    </el-icon>
                                    <div class="tag-info">
                                        <span class="tag-name">{{ album.name }}</span>
                                        <span class="tag-meta">{{ album.photos?.length || 0 }} 张照片</span>
                                    </div>
                                    <div class="tag-actions">
                                        <el-button size="small" @click.stop="editAlbum(album)" type="primary" circle
                                            plain title="编辑相册">
                                            <el-icon>
                                                <Edit />
                                            </el-icon>
                                        </el-button>
                                        <el-button size="small" @click.stop="handleDeleteAlbum(album)" type="danger"
                                            circle plain title="删除相册">
                                            <el-icon>
                                                <Delete />
                                            </el-icon>
                                        </el-button>
                                    </div>
                                </div>
                            </div>
                        </el-tab-pane>

                        <!-- 用户管理 -->
                        <el-tab-pane label="用户管理" name="users" v-if="permission === 1">
                            <div class="user-list">
                                <div v-for="user in users" :key="user.id" class="user-item" @click="selectUser(user)">
                                    <el-avatar :size="32" :src="user.avatar || ''">{{ user.name.charAt(0) }}</el-avatar>
                                    <div class="user-info">
                                        <span class="user-name">{{ user.name }}</span>
                                        <span class="user-account">{{ user.account_number }}</span>
                                    </div>
                                    <el-tag :type="getPermissionType(user.permission)" size="small">
                                        {{ getPermissionLabel(user.permission) }}
                                    </el-tag>
                                </div>
                            </div>
                        </el-tab-pane>
                    </el-tabs>
                </div>

                <!-- 编辑分类对话框 -->
                <el-dialog v-model="editCategoryDialog" title="编辑音频分类" width="400px" class="responsive-dialog">
                    <el-form :model="editCategoryForm" label-width="80px">
                        <el-form-item label="分类名称">
                            <el-input v-model="editCategoryForm.name" placeholder="请输入分类名称" />
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <span class="dialog-footer">
                            <el-button @click="editCategoryDialog = false">取消</el-button>
                            <el-button type="primary" @click="handleEditCategory">确定</el-button>
                        </span>
                    </template>
                </el-dialog>

                <!-- 编辑音频对话框 -->
                <el-dialog v-model="editAudioDialog" title="编辑音频" width="400px" class="responsive-dialog">
                    <el-form :model="editAudioForm" label-width="80px">
                        <el-form-item label="音频名称">
                            <el-input v-model="editAudioForm.name" placeholder="请输入音频名称" />
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <span class="dialog-footer">
                            <el-button @click="editAudioDialog = false">取消</el-button>
                            <el-button type="primary" @click="handleEditAudio">确定</el-button>
                        </span>
                    </template>
                </el-dialog>

                <!-- 编辑相册对话框 -->
                <el-dialog v-model="editAlbumDialog" title="编辑相册" width="500px" class="responsive-dialog-large">
                    <el-form :model="editAlbumForm" label-width="80px">
                        <el-form-item label="相册名称">
                            <el-input v-model="editAlbumForm.name" placeholder="请输入相册名称" />
                        </el-form-item>
                        <el-form-item label="相册介绍">
                            <el-input v-model="editAlbumForm.introduction" type="textarea" :rows="3"
                                placeholder="请输入相册介绍（可选）" />
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <span class="dialog-footer">
                            <el-button @click="editAlbumDialog = false">取消</el-button>
                            <el-button type="primary" @click="handleEditAlbum">确定</el-button>
                        </span>
                    </template>
                </el-dialog>

                <!-- 编辑照片对话框 -->
                <el-dialog v-model="editPhotoDialog" title="编辑照片" width="400px" class="responsive-dialog">
                    <el-form :model="editPhotoForm" label-width="80px">
                        <el-form-item label="照片名称">
                            <el-input v-model="editPhotoForm.name" placeholder="请输入照片名称" />
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <span class="dialog-footer">
                            <el-button @click="editPhotoDialog = false">取消</el-button>
                            <el-button type="primary" @click="handleEditPhoto">确定</el-button>
                        </span>
                    </template>
                </el-dialog>


                <!-- 右侧：内容表格 -->
                <div class="right-panel">
                    <div class="content-header">
                        <h3 v-if="selectedAudio && activeTab === 'audio'">
                            <el-icon>
                                <VideoPlay />
                            </el-icon>
                            {{ selectedAudio.name }} - 音频列表
                            <span class="album-meta">({{ formatTime(selectedAudio.create_time) }})</span>
                        </h3>
                        <h3 v-else-if="selectedAlbum && activeTab === 'albums'">
                            <el-icon>
                                <Picture />
                            </el-icon>
                            {{ selectedAlbum.name }} - 照片列表
                            <span class="album-meta">({{ formatTime(selectedAlbum.create_time) }})</span>
                        </h3>
                        <h3 v-else-if="selectedUser">
                            <el-icon>
                                <User />
                            </el-icon>
                            {{ selectedUser.name }} - 用户详情
                        </h3>
                        <p v-else class="no-selection">请从左侧选择要查看的内容</p>
                    </div>

                    <div class="content-body">
                        <!-- 音频表格 -->
                        <div v-if="selectedAudio && activeTab === 'audio'" class="table-content">
                            <el-table :data="selectedAudio.audios || []" style="width: 100%" stripe>
                                <el-table-column prop="name" label="音频名称" min-width="200" />
                                <el-table-column prop="user_name" label="上传者" width="120" />
                                <el-table-column label="创建时间" width="120">
                                    <template #default="{ row }">
                                        {{ formatTime(row.create_time) }}
                                    </template>
                                </el-table-column>
                                <el-table-column label="状态" width="100">
                                    <template #default="{ row }">
                                        <el-tag
                                            :type="row.is_review === 1 ? 'success' : row.is_review === 0 ? 'warning' : 'danger'">
                                            {{ row.is_review === 1 ? '已审核' : row.is_review === 0 ? '待审核' : '不通过' }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column label="播放" width="80">
                                    <template #default="{ row }">
                                        <el-button size="small" @click="toggleAudioPlay(row)"
                                            :type="playingAudioId === row.id ? 'warning' : 'success'" circle>
                                            <el-icon size="23">
                                                <VideoPause v-if="playingAudioId === row.id" />
                                                <VideoPlay v-else />
                                            </el-icon>
                                        </el-button>
                                    </template>
                                </el-table-column>
                                <el-table-column label="操作" width="320" min-width="280">
                                    <template #default="{ row }">
                                        <!-- 未审核状态 -->
                                        <div v-if="row.is_review === 0" class="review-buttons">
                                            <el-button size="small" @click="approveAudio(row)"
                                                type="success">通过</el-button>
                                            <el-button size="small" @click="rejectAudio(row)"
                                                type="warning">不通过</el-button>
                                        </div>
                                        <!-- 已审核状态 -->
                                        <div v-else class="review-buttons">
                                            <el-button size="small" @click="revokeAudioReview(row)"
                                                type="info">撤销审核</el-button>
                                        </div>
                                        <div class="action-buttons">
                                            <el-button size="small" @click="editAudio(row)"
                                                type="primary">编辑</el-button>
                                            <el-button size="small" @click="handleDeleteAudio(row, selectedAudio)"
                                                type="danger">删除</el-button>
                                        </div>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </div>

                        <!-- 相册表格 -->
                        <div v-else-if="selectedAlbum && activeTab === 'albums'" class="table-content">
                            <el-table :data="selectedAlbum.photos || []" style="width: 100%" stripe>
                                <el-table-column prop="name" label="照片名称" min-width="200" />
                                <el-table-column prop="user_name" label="上传者" width="120" />
                                <el-table-column label="创建时间" width="120">
                                    <template #default="{ row }">
                                        {{ formatTime(row.create_time) }}
                                    </template>
                                </el-table-column>
                                <el-table-column label="状态" width="100">
                                    <template #default="{ row }">
                                        <el-tag
                                            :type="row.is_review === 1 ? 'success' : row.is_review === 0 ? 'warning' : 'danger'">
                                            {{ row.is_review === 1 ? '已审核' : row.is_review === 0 ? '待审核' : '审核不通过' }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column label="预览" width="100">
                                    <template #default="{ row }">
                                        <el-image :src="getFullUrl(row.url) || '/placeholder.jpg'"
                                            :preview-src-list="[getFullUrl(row.url) || '/placeholder.jpg']" fit="cover"
                                            style="width: 50px; height: 50px; cursor: pointer;" preview-teleported>
                                            <template #error>
                                                <div class="image-placeholder-small">
                                                    <el-icon>
                                                        <Picture />
                                                    </el-icon>
                                                </div>
                                            </template>
                                        </el-image>
                                    </template>
                                </el-table-column>
                                <el-table-column label="操作" width="320" min-width="280">
                                    <template #default="{ row }">
                                        <!-- 未审核状态 -->
                                        <div v-if="row.is_review === 0" class="review-buttons">
                                            <el-button size="small" @click="approvePhoto(row)"
                                                type="success">通过</el-button>
                                            <el-button size="small" @click="rejectPhoto(row)"
                                                type="warning">不通过</el-button>
                                        </div>
                                        <!-- 已审核状态 -->
                                        <div v-else class="review-buttons">
                                            <el-button size="small" @click="revokePhotoReview(row)"
                                                type="info">撤销审核</el-button>
                                        </div>
                                        <div class="action-buttons">
                                            <el-button size="small" @click="editPhoto(row)"
                                                type="primary">编辑</el-button>
                                            <el-button size="small" @click="handleDeletePhoto(row, selectedAlbum)"
                                                type="danger">删除</el-button>
                                        </div>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </div>

                        <!-- 用户详情 -->
                        <div v-else-if="selectedUser" class="user-detail">
                            <el-card>
                                <template #header>
                                    <div class="user-header">
                                        <el-avatar :size="64" :src="selectedUser.avatar || ''">
                                            {{ selectedUser.name.charAt(0) }}
                                        </el-avatar>
                                        <div class="user-basic-info">
                                            <h3>{{ selectedUser.name }}</h3>
                                            <p>{{ selectedUser.account_number }}</p>
                                        </div>
                                    </div>
                                </template>
                                <el-descriptions :column="2" border>
                                    <el-descriptions-item label="账号">{{ selectedUser.account_number
                                    }}</el-descriptions-item>
                                    <el-descriptions-item label="权限">
                                        <el-tag :type="getPermissionType(selectedUser.permission)">
                                            {{ getPermissionLabel(selectedUser.permission) }}
                                        </el-tag>
                                    </el-descriptions-item>
                                    <el-descriptions-item label="状态">
                                        <el-tag :type="getStatusType(selectedUser.is_banned)">
                                            {{ getStatusLabel(selectedUser.is_banned) }}
                                        </el-tag>
                                    </el-descriptions-item>
                                    <el-descriptions-item label="注册时间">{{ formatTime(selectedUser.create_time)
                                    }}</el-descriptions-item>
                                </el-descriptions>
                                <template #footer v-if="selectedUser.permission !== 1">
                                    <div class="user-actions">
                                        <el-button @click="changeUserPermission(selectedUser)"
                                            type="primary">
                                            {{ selectedUser.permission === 3 ? '授予管理员权限' : selectedUser.permission === 2 ? '撤销管理员权限' : '修改权限' }}
                                        </el-button>
                                        <el-button @click="resetUserPassword(selectedUser)" type="info">重置密码</el-button>
                                        <el-button @click="toggleUserStatus(selectedUser)" type="warning"
                                            :disabled="selectedUser.permission <= permission">
                                            {{ selectedUser.is_banned === 0 ? '禁用用户' : '启用用户' }}
                                        </el-button>
                                        <el-button @click="deleteUser(selectedUser)" type="danger"
                                            :disabled="selectedUser.permission <= permission">
                                            删除用户
                                        </el-button>
                                    </div>
                                </template>
                            </el-card>
                        </div>

                        <!-- 未选择内容 -->
                        <div v-else class="empty-state">
                            <el-empty description="请选择左侧的内容进行查看" :image-size="100">
                                <template #image>
                                    <el-icon size="100" class="empty-icon">
                                        <InfoFilled />
                                    </el-icon>
                                </template>
                            </el-empty>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.admin-page {
    min-height: 100vh;
    background: #f5f7fa;
    position: relative;
}

.content-wrapper {
    max-width: 1400px;
    margin: 0 auto;
    margin-top: 20px;
    padding: 0 20px;
}

/* 响应式内容包装器 */
@media (max-width: 768px) {
    .content-wrapper {
        margin-top: 16px;
        padding: 0 16px;
    }
}

@media (max-width: 480px) {
    .content-wrapper {
        margin-top: 12px;
        padding: 0 12px;
    }
}

/* 页面头部 */
.page-hero {
    text-align: center;
    margin-bottom: 40px;
    padding: 60px 20px;
    background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
    border-radius: 20px;
    box-shadow: 0 8px 25px rgba(64, 158, 255, 0.1);
    position: relative;
    overflow: hidden;
}

/* 响应式页面头部 */
@media (max-width: 768px) {
    .page-hero {
        margin-bottom: 30px;
        padding: 40px 20px;
        border-radius: 16px;
    }
}

@media (max-width: 480px) {
    .page-hero {
        margin-bottom: 20px;
        padding: 30px 15px;
        border-radius: 15px;
    }
}

.page-hero::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(64, 158, 255, 0.05) 0%, transparent 70%);
    animation: float 20s infinite linear;
}

.hero-content {
    position: relative;
    z-index: 1;
}

.hero-title {
    font-size: clamp(2rem, 5vw, 3rem);
    color: #409eff;
    margin-bottom: 10px;
    font-weight: 700;
    font-family: 'Comic Sans MS', cursive;
    text-shadow: 0 2px 10px rgba(64, 158, 255, 0.2);
}

.hero-subtitle {
    font-size: 1.1rem;
    color: #666;
    max-width: 500px;
    margin: 0 auto;
}

/* 响应式标题 */
@media (max-width: 768px) {
    .hero-title {
        font-size: clamp(1.5rem, 6vw, 2.5rem);
        margin-bottom: 8px;
    }

    .hero-subtitle {
        font-size: 1rem;
        max-width: 100%;
    }
}

@media (max-width: 480px) {
    .hero-title {
        font-size: clamp(1.25rem, 7vw, 2rem);
        margin-bottom: 6px;
    }

    .hero-subtitle {
        font-size: 0.9rem;
    }
}

/* 统计卡片 */
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 32px;
}

/* 响应式统计卡片 */
@media (max-width: 1024px) {
    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 24px;
    }
}

@media (max-width: 768px) {
    .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
        margin-bottom: 20px;
    }
}

@media (max-width: 480px) {
    .stats-grid {
        grid-template-columns: 1fr;
        gap: 12px;
        margin-bottom: 16px;
    }
}

.stat-card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    padding: 20px;
    border-radius: 16px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
    display: flex;
    align-items: center;
    gap: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(255, 255, 255, 0.9);
    position: relative;
    overflow: hidden;
    backdrop-filter: blur(10px);
}

.stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #409eff 0%, #66b1ff 50%, #91d5ff 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08);
}

.stat-card:hover::before {
    opacity: 1;
}



.stat-icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.stat-content {
    flex: 1;
    min-width: 0;
}

.stat-value {
    font-size: 28px;
    font-weight: 700;
    color: #1a202c;
    margin-bottom: 4px;
    line-height: 1.2;
    background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.stat-label {
    font-size: 13px;
    color: #718096;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    opacity: 0.8;
}

/* 双栏管理布局 */
.management-layout {
    display: flex;
    gap: 28px;
    height: calc(100vh - 280px);
    min-height: 500px;
    padding-bottom: 20px;
}

.left-panel {
    width: 345px;
    flex-shrink: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.9);
    overflow: hidden;
}

.right-panel {
    flex: 1;
    min-width: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.9);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

/* 响应式管理布局 */
@media (max-width: 1024px) {
    .management-layout {
        gap: 20px;
    }

    .left-panel {
        width: 300px;
    }
}

@media (max-width: 768px) {
    .management-layout {
        flex-direction: column;
        height: auto;
        min-height: 600px;
        gap: 16px;
    }

    .left-panel {
        width: 100%;
        max-height: 400px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }

    .right-panel {
        flex: 1;
        min-height: 500px;
    }
}

@media (max-width: 480px) {
    .management-layout {
        gap: 12px;
        padding-bottom: 16px;
    }

    .left-panel {
        max-height: 350px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
    }

    .right-panel {
        min-height: 400px;
    }
}

/* 左侧分类选项卡 */
.category-tabs {
    height: 100%;
    background: transparent;
}

.category-tabs :deep(.el-tabs__header) {
    margin: 0;
    padding: 0 24px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    position: relative;
}

.category-tabs :deep(.el-tabs__header)::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 20px;
    background: linear-gradient(90deg, rgba(248, 250, 252, 0.8) 0%, transparent 100%);
    pointer-events: none;
}

.category-tabs :deep(.el-tabs__header)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 20px;
    background: linear-gradient(270deg, rgba(248, 250, 252, 0.8) 0%, transparent 100%);
    pointer-events: none;
}

.category-tabs :deep(.el-tabs__nav-wrap::after) {
    display: none;
}

.category-tabs :deep(.el-tabs__nav) {
    margin: 0;
    padding: 0 4px;
}

/* 修复Element Plus默认样式导致的视觉缺块问题 */
.category-tabs :deep(.el-tabs__item:nth-child(2)) {
    padding-left: 20px;
}

.category-tabs :deep(.el-tabs__item:last-child) {
    padding-right: 20px;
}

.category-tabs :deep(.el-tabs__item:hover) {
    color: #409eff;
}

.category-tabs :deep(.el-tabs__item.is-active) {
    color: #409eff;
    font-weight: 600;
    border-bottom: 2px solid #409eff;
    margin-bottom: -1px;
    position: relative;
}

.category-tabs :deep(.el-tabs__content) {
    padding: 20px;
    height: calc(100% - 70px);
    overflow-y: auto;
    background: white;
}

/* 响应式选项卡内容 */
@media (max-width: 768px) {
    .category-tabs :deep(.el-tabs__content) {
        padding: 16px;
        height: calc(100% - 60px);
        -webkit-overflow-scrolling: touch;
    }
}

@media (max-width: 480px) {
    .category-tabs :deep(.el-tabs__content) {
        padding: 12px;
        height: calc(100% - 55px);
        -webkit-overflow-scrolling: touch;
    }
}

/* 标签列表 */
.tag-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.tag-item {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(226, 232, 240, 0.8);
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    position: relative;
    overflow: hidden;
}

/* 响应式标签项 */
@media (max-width: 768px) {
    .tag-item {
        padding: 12px 14px;
        border-radius: 8px;
    }
}

@media (max-width: 480px) {
    .tag-item {
        padding: 10px 12px;
        flex-wrap: wrap;
        gap: 8px;
    }

    .tag-actions {
        margin-left: 0;
        margin-top: 8px;
        padding: 4px;
    }
}

.tag-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.tag-item:hover {
    border-color: rgba(102, 126, 234, 0.3);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
}

.tag-item:hover::before {
    opacity: 1;
}

.tag-item.active {
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.tag-info {
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
}

.tag-name {
    display: block;
    font-weight: 600;
    color: #1a202c;
    margin-bottom: 2px;
    font-size: 14px;
}

.tag-meta {
    font-size: 12px;
    color: #718096;
    font-weight: 400;
}

.tag-actions {
    display: flex;
    gap: 8px;
    margin-left: 12px;
    padding: 6px;
    position: relative;
    z-index: 2;
}

/* 用户列表 */
.user-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.user-item {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid rgba(226, 232, 240, 0.8);
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    position: relative;
    overflow: hidden;
}

/* 响应式用户项 */
@media (max-width: 768px) {
    .user-item {
        padding: 12px 14px;
        border-radius: 8px;
    }
}

@media (max-width: 480px) {
    .user-item {
        padding: 10px 12px;
        flex-wrap: wrap;
        gap: 8px;
    }
}

.user-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.user-item:hover {
    border-color: rgba(102, 126, 234, 0.3);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.1);
    transform: translateY(-1px);
}

.user-item:hover::before {
    opacity: 1;
}

.user-info {
    flex: 1;
    margin-left: 12px;
    position: relative;
    z-index: 1;
}

.user-name {
    display: block;
    font-weight: 600;
    color: #1a202c;
    margin-bottom: 2px;
    font-size: 14px;
}

.user-account {
    font-size: 12px;
    color: #718096;
    font-weight: 400;
}

/* 右侧内容区域 */
.content-header {
    padding: 20px 24px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 12px 12px 0 0;
}

/* 响应式内容头部 */
@media (max-width: 768px) {
    .content-header {
        padding: 16px 20px;
    }

    .content-header h3 {
        font-size: 16px;
        gap: 8px;
    }

    .content-header h3 .el-icon {
        font-size: 18px;
    }
}

@media (max-width: 480px) {
    .content-header {
        padding: 12px 16px;
    }

    .content-header h3 {
        font-size: 14px;
        gap: 6px;
    }

    .content-header h3 .el-icon {
        font-size: 16px;
    }

    .no-selection {
        font-size: 14px;
    }
}

.content-header h3 {
    margin: 0;
    color: #1a202c;
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
}

.content-header h3 .el-icon {
    color: #409eff;
    font-size: 20px;
}

.no-selection {
    margin: 0;
    color: #64748b;
    font-size: 16px;
    font-weight: 500;
}

.content-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    background: white;
}

/* 响应式内容主体 */
@media (max-width: 768px) {
    .content-body {
        padding: 16px 20px;
    }
}

@media (max-width: 480px) {
    .content-body {
        padding: 12px 16px;
    }
}

/* 表格内容 */
.table-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-x: auto;
}

.table-content :deep(.el-table) {
    min-width: 800px; /* 确保表格有最小宽度 */
}

/* 响应式表格 */
@media (max-width: 768px) {
    .table-content {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .table-content :deep(.el-table) {
        font-size: 14px;
    }

    .table-content :deep(.el-table th),
    .table-content :deep(.el-table td) {
        padding: 8px 6px;
    }

    .table-content :deep(.el-table .el-table__cell) {
        word-break: break-word;
    }
}

@media (max-width: 480px) {
    .table-content :deep(.el-table) {
        font-size: 12px;
    }

    .table-content :deep(.el-table th),
    .table-content :deep(.el-table td) {
        padding: 6px 4px;
    }
}

.album-info-section,
.category-info-section {
    margin-bottom: 20px;
    padding: 18px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 12px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.album-info-section h4,
.category-info-section h4 {
    margin: 0 0 8px 0;
    color: #1a202c;
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.album-info-section h4::before,
.category-info-section h4::before {
    content: '';
    width: 4px;
    height: 16px;
    background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
    border-radius: 2px;
}

.album-info-section p,
.category-info-section p {
    margin: 0 0 4px 0;
    color: #4a5568;
    line-height: 1.6;
    font-size: 14px;
}

.album-meta,
.category-meta {
    margin: 0;
    color: #718096;
    font-size: 12px;
    font-weight: 500;
}


/* 图片占位符 */
.image-placeholder-small {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 50px;
    background: #f5f7fa;
    color: #c0c4cc;
}

/* 用户详情 */
.user-detail {
    max-width: 600px;
}

:deep(.el-button+.el-button) {
    margin-left: 0;
}

/* 响应式用户详情 */
@media (max-width: 768px) {
    .user-detail {
        max-width: 100%;
    }

    .user-detail :deep(.el-card__header),
    .user-detail :deep(.el-card__body) {
        padding: 16px 20px;
    }

    .user-header {
        flex-direction: column;
        text-align: center;
        gap: 12px;
    }

    .user-basic-info h3 {
        font-size: 16px;
    }
}

@media (max-width: 480px) {
    .user-detail :deep(.el-card__header),
    .user-detail :deep(.el-card__body) {
        padding: 12px 16px;
    }

    .user-actions {
        flex-direction: column;
        gap: 8px;
    }

    .user-actions .el-button {
        width: 100%;
    }
}

.user-detail :deep(.el-card) {
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.9);
}

.user-detail :deep(.el-card__header) {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    padding: 20px 24px;
}

.user-detail :deep(.el-card__body) {
    padding: 24px;
}

.user-header {
    display: flex;
    align-items: center;
    gap: 16px;
}

.user-basic-info h3 {
    margin: 0 0 4px 0;
    color: #1a202c;
    font-size: 18px;
    font-weight: 600;
}

.user-basic-info p {
    margin: 0;
    color: #718096;
    font-size: 14px;
    font-weight: 500;
}

.user-detail :deep(.el-descriptions) {
    margin-top: 20px;
}

.user-detail :deep(.el-descriptions__title) {
    color: #1a202c;
    font-weight: 600;
}

.user-detail :deep(.el-descriptions__label) {
    color: #64748b;
    font-weight: 500;
}

.user-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

/* 加载状态 */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 200px;
    color: #718096;
}

.loading-icon {
    font-size: 32px;
    margin-bottom: 12px;
    animation: spin 1s linear infinite;
}

.loading-state p {
    margin: 0;
    font-size: 14px;
}

@keyframes spin {
    from {
        transform: rotate(0deg);
    }

    to {
        transform: rotate(360deg);
    }
}

/* 空状态 */
.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 300px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 12px;
}

.empty-icon {
    color: #a0aec0;
    opacity: 0.6;
}

/* 操作按钮布局 */
.review-buttons {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
    flex-wrap: wrap;
}

.action-buttons {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.review-buttons .el-button,
.action-buttons .el-button {
    min-width: 60px;
    white-space: nowrap;
}

/* 响应式按钮 */
@media (max-width: 768px) {
    .review-buttons,
    .action-buttons {
        gap: 4px;
    }

    .review-buttons .el-button,
    .action-buttons .el-button {
        min-width: 50px;
        padding: 6px 12px;
        font-size: 12px;
    }
}

@media (max-width: 480px) {
    .review-buttons,
    .action-buttons {
        flex-direction: column;
        width: 100%;
        gap: 4px;
    }

    .review-buttons .el-button,
    .action-buttons .el-button {
        width: 100%;
        min-width: auto;
        padding: 8px 12px;
        font-size: 13px;
    }

    .review-buttons {
        margin-bottom: 8px;
    }
}


/* 图片占位符 */
.image-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 150px;
    background: #f5f7fa;
    color: #c0c4cc;
}

/* 图标样式 */
.audio-icon {
    color: #409eff;
    font-size: 18px;
    margin-right: 12px;
    filter: drop-shadow(0 2px 4px rgba(64, 158, 255, 0.2));
}

.album-icon {
    color: #409eff;
    font-size: 18px;
    margin-right: 12px;
    filter: drop-shadow(0 2px 4px rgba(64, 158, 255, 0.2));
}

/* 响应式对话框 */
.responsive-dialog {
    --el-dialog-width: 400px;
}

.responsive-dialog-large {
    --el-dialog-width: 500px;
}

@media (max-width: 768px) {
    .responsive-dialog {
        --el-dialog-width: 90vw;
    }

    .responsive-dialog-large {
        --el-dialog-width: 95vw;
    }
}

@media (max-width: 480px) {
    .responsive-dialog,
    .responsive-dialog-large {
        --el-dialog-width: 95vw;
    }
}

@keyframes float {
    0% {
        transform: translateY(0px) rotate(0deg);
    }

    50% {
        transform: translateY(-20px) rotate(180deg);
    }

    100% {
        transform: translateY(0px) rotate(360deg);
    }
}
</style>
