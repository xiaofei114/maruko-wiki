<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { User, Picture, Files, VideoPlay, Edit, Delete, InfoFilled, VideoPause, ArrowRight, Plus, Present } from '@element-plus/icons-vue'
import PageHero from '@/components/ComponentStyle/PageHero.vue'
import {
    getAudioCategories,
    reviewAudio,
    updateAudio,
    deleteAudio,
    getAlbumCategories,
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
import { getGiftsByMonth, addGift, updateGift, deleteGift, batchAddGifts } from '@/api/captainGift'

// 用户状态
const userStore = useUserStore()
const { permission } = storeToRefs(userStore)

// 活跃标签页
const activeTab = ref('audio')

// 选中的音频/相册/用户
const selectedAudio = ref(null)
const selectedAlbum = ref(null)
const selectedUser = ref(null)

// 舰礼管理
const giftYear = ref(String(new Date().getFullYear()))
const giftMonth = ref(new Date().getMonth() + 1)
const captainGifts = ref([])
const giftLoading = ref(false)
const giftDialogVisible = ref(false)
const giftDialogTitle = ref('添加舰礼')
const giftFormRef = ref(null)
const giftForm = ref({
    id: null,
    giftName: '',
    giftContent: '',
    requiredFansCount: 0,
    isLimited: false,  // 是否限制舰长数
    giftType: 1,       // 礼物类型: 1=舰长礼, 2=提督礼, 3=总督礼
    includesCaptain: false,   // 是否包含舰长礼
    includesCommander: false, // 是否包含提督礼
    showProgress: true  // 是否显示进度条
})
const giftFormRules = {
    giftName: [
        { required: true, message: '请输入礼物名称', trigger: 'blur' },
        { min: 1, max: 50, message: '礼物名称长度应在1-50个字符', trigger: 'blur' }
    ],
    giftContent: [
        { max: 200, message: '礼物内容描述不能超过200个字符', trigger: 'blur' }
    ]
}

// 礼物类型选项
const giftTypeOptions = [
    { label: '舰长礼', value: 1, type: 'primary' },
    { label: '提督礼', value: 2, type: 'warning' },
    { label: '总督礼', value: 3, type: 'danger' }
]

// 获取礼物类型标签
const getGiftTypeLabel = (type) => {
    const option = giftTypeOptions.find(opt => opt.value === type)
    return option ? option.label : '未知'
}

// 获取礼物类型标签样式
const getGiftTypeTagType = (type) => {
    const option = giftTypeOptions.find(opt => opt.value === type)
    return option ? option.type : 'info'
}

// 获取包含关系显示文本
const getIncludesText = (includes) => {
    if (!includes || includes === 0) return ''
    const parts = []
    if (includes & 1) parts.push('含舰长礼')
    if (includes & 2) parts.push('含提督礼')
    return parts.join('、')
}

// 编辑对话框
const editCategoryDialog = ref(false)
const editingCategory = ref(null)
const editCategoryFormRef = ref(null)
const editCategoryForm = ref({
    name: ''
})

// 分类编辑表单验证规则
const editCategoryFormRules = {
    name: [
        { required: true, message: '请输入分类名称', trigger: 'blur' },
        { min: 1, max: 50, message: '分类名称长度应在1-50个字符', trigger: 'blur' }
    ]
}

// 编辑音频对话框
const editAudioDialog = ref(false)
const editingAudio = ref(null)
const editAudioFormRef = ref(null)
const editAudioForm = ref({
    name: '',
    classification_id: '',
    new_classification_name: ''
})

// 音频编辑表单验证规则
const editAudioFormRules = {
    name: [
        { required: true, message: '请输入音频名称', trigger: 'blur' },
        { min: 1, max: 100, message: '音频名称长度应在1-100个字符', trigger: 'blur' }
    ]
}

// 编辑相册对话框
const editAlbumDialog = ref(false)
const editingAlbum = ref(null)
const editAlbumFormRef = ref(null)
const editAlbumForm = ref({
    name: '',
    introduction: ''
})

// 相册编辑表单验证规则
const editAlbumFormRules = {
    name: [
        { required: true, message: '请输入相册名称', trigger: 'blur' },
        { min: 1, max: 100, message: '相册名称长度应在1-100个字符', trigger: 'blur' }
    ]
}

// 编辑照片对话框
const editPhotoDialog = ref(false)
const editingPhoto = ref(null)
const editPhotoFormRef = ref(null)
const editPhotoForm = ref({
    name: '',
    album_id: '',
    new_album_name: '',
    new_album_introduction: ''
})

// 照片编辑表单验证规则
const editPhotoFormRules = {
    name: [
        { required: true, message: '请输入照片名称', trigger: 'blur' },
        { min: 1, max: 100, message: '照片名称长度应在1-100个字符', trigger: 'blur' }
    ]
}

// 音频播放
const playingAudioId = ref(null)
const audioPlayers = ref(new Map())

// 筛选和分页状态
// 音频筛选
const audioFilters = ref({
    name: '',
    status: '',
    uploader: '',
    dateRange: []
})

// 相册筛选
const albumFilters = ref({
    name: '',
    status: '',
    uploader: '',
    dateRange: []
})

// 分页状态
const audioPagination = ref({
    currentPage: 1,
    pageSize: 10,
    total: 0
})

const albumPagination = ref({
    currentPage: 1,
    pageSize: 10,
    total: 0
})

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

// 筛选和分页计算属性
const filteredAudios = computed(() => {
    if (!selectedAudio.value) return []

    let audios = [...selectedAudio.value.audios]

    // 名称筛选
    if (audioFilters.value.name) {
        audios = audios.filter(audio =>
            audio.name.toLowerCase().includes(audioFilters.value.name.toLowerCase())
        )
    }

    // 状态筛选
    if (audioFilters.value.status !== '') {
        audios = audios.filter(audio => audio.is_review === parseInt(audioFilters.value.status))
    }

    // 上传者筛选
    if (audioFilters.value.uploader) {
        audios = audios.filter(audio =>
            audio.user_name.toLowerCase().includes(audioFilters.value.uploader.toLowerCase())
        )
    }

    // 时间范围筛选
    if (audioFilters.value.dateRange && audioFilters.value.dateRange.length === 2) {
        const [startDate, endDate] = audioFilters.value.dateRange
        const startTime = new Date(startDate).getTime() / 1000
        const endTime = new Date(endDate).getTime() / 1000 + 86400 // 加一天

        audios = audios.filter(audio => {
            const audioTime = parseInt(audio.create_time)
            return audioTime >= startTime && audioTime <= endTime
        })
    }

    // 更新分页总数
    audioPagination.value.total = audios.length

    return audios
})

const paginatedAudios = computed(() => {
    const start = (audioPagination.value.currentPage - 1) * audioPagination.value.pageSize
    const end = start + audioPagination.value.pageSize
    return filteredAudios.value.slice(start, end)
})

const filteredPhotos = computed(() => {
    if (!selectedAlbum.value) return []

    let photos = [...selectedAlbum.value.photos]

    // 名称筛选
    if (albumFilters.value.name) {
        photos = photos.filter(photo =>
            photo.name.toLowerCase().includes(albumFilters.value.name.toLowerCase())
        )
    }

    // 状态筛选
    if (albumFilters.value.status !== '') {
        photos = photos.filter(photo => photo.is_review === parseInt(albumFilters.value.status))
    }

    // 上传者筛选
    if (albumFilters.value.uploader) {
        photos = photos.filter(photo =>
            photo.user_name.toLowerCase().includes(albumFilters.value.uploader.toLowerCase())
        )
    }

    // 时间范围筛选
    if (albumFilters.value.dateRange && albumFilters.value.dateRange.length === 2) {
        const [startDate, endDate] = albumFilters.value.dateRange
        const startTime = new Date(startDate).getTime() / 1000
        const endTime = new Date(endDate).getTime() / 1000 + 86400 // 加一天

        photos = photos.filter(photo => {
            const photoTime = parseInt(photo.create_time)
            return photoTime >= startTime && photoTime <= endTime
        })
    }

    // 更新分页总数
    albumPagination.value.total = photos.length

    return photos
})

const paginatedPhotos = computed(() => {
    const start = (albumPagination.value.currentPage - 1) * albumPagination.value.pageSize
    const end = start + albumPagination.value.pageSize
    return filteredPhotos.value.slice(start, end)
})

// 数据获取方法
const fetchAudioCategories = async () => {
    try {
        const response = await getAudioCategories()
        audioCategories.value = response.data
    } catch (error) {
        ElMessage.error('获取音频分类失败')
    }
}

const fetchAlbumCategories = async () => {
    try {
        const response = await getAlbumCategories()
        albumTags.value = response.data
    } catch (error) {
        ElMessage.error('获取相册分类失败')
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

// 前往新版管理后台
const goToNewAdmin = () => {
    const token = userStore.token
    if (token) {
        window.open(`${import.meta.env.VITE_APP_ADMIN_URL}/?token=${token}`, '_blank')
    } else {
        window.open('/admin/', '_blank')
    }
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
    editAudioForm.value = {
        name: audio.name,
        classification_id: audio.classification_id || '',
        new_classification_name: ''
    }
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
        // 表单验证
        if (!editCategoryFormRef.value) return

        await editCategoryFormRef.value.validate()

        await updateAudioClassification(editingCategory.value.id, {
            name: editCategoryForm.value.name.trim()
        })

        ElMessage.success('音频分类更新成功')
        editCategoryDialog.value = false

        // 重新获取数据
        await fetchAudioCategories()
    } catch (error) {
        if (error !== 'cancel') {
            console.error('更新音频分类失败:', error)
            ElMessage.error('更新音频分类失败')
        }
    }
}

// 处理编辑音频提交
const handleEditAudio = async () => {
    try {
        // 表单验证
        if (!editAudioFormRef.value) return

        await editAudioFormRef.value.validate()

        const updateData = {}

        // 音频名称
        if (editAudioForm.value.name.trim()) {
            updateData.name = editAudioForm.value.name.trim()
        }

        // 分类选择逻辑：优先使用新分类名称，如果没有则使用现有分类ID
        if (editAudioForm.value.new_classification_name.trim()) {
            updateData.new_classification_name = editAudioForm.value.new_classification_name.trim()
        } else if (editAudioForm.value.classification_id) {
            updateData.classification_id = editAudioForm.value.classification_id
        }

        // 至少需要提供一个字段
        if (Object.keys(updateData).length === 0) {
            ElMessage.warning('请至少填写音频名称或选择/创建分类')
            return
        }

        await updateAudio(editingAudio.value.id, updateData)

        ElMessage.success('音频更新成功')
        editAudioDialog.value = false

        // 重新获取数据
        await fetchAudioCategories()

        // 重新设置当前选中的分类，确保数据是最新的
        if (selectedAudio.value) {
            const updatedCategory = audioCategories.value.find(c => c.id === selectedAudio.value.id)
            if (updatedCategory) {
                selectedAudio.value = updatedCategory
                audioPagination.value.total = updatedCategory.audios.length
                console.log('🎵 音频编辑完成，当前分类音频数量:', updatedCategory.audios.length)
            } else {
                // 如果分类不存在了（比如被删除了），清空选择
                selectedAudio.value = null
            }
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('更新音频失败:', error)
            ElMessage.error('更新音频失败')
        }
    }
}

// 处理编辑相册提交
const handleEditAlbum = async () => {
    try {
        // 表单验证
        if (!editAlbumFormRef.value) return

        await editAlbumFormRef.value.validate()

        await updateAlbum(editingAlbum.value.id, {
            name: editAlbumForm.value.name.trim(),
            introduction: editAlbumForm.value.introduction.trim()
        })

        // 立即更新本地数据
        editingAlbum.value.name = editAlbumForm.value.name.trim()
        editingAlbum.value.introduction = editAlbumForm.value.introduction.trim()

        ElMessage.success('相册更新成功')
        editAlbumDialog.value = false

        // 重新获取数据
        await fetchAlbumCategories()
    } catch (error) {
        if (error !== 'cancel') {
            console.error('更新相册失败:', error)
            ElMessage.error('更新相册失败')
        }
    }
}

// 处理编辑照片提交
const handleEditPhoto = async () => {
    try {
        // 表单验证
        if (!editPhotoFormRef.value) return

        await editPhotoFormRef.value.validate()

        const updateData = {}

        // 照片名称
        if (editPhotoForm.value.name.trim()) {
            updateData.name = editPhotoForm.value.name.trim()
        }

        // 相册选择逻辑：优先使用新相册名称，如果没有则使用现有相册ID
        if (editPhotoForm.value.new_album_name.trim()) {
            updateData.new_album_name = editPhotoForm.value.new_album_name.trim()
            if (editPhotoForm.value.new_album_introduction.trim()) {
                updateData.new_album_introduction = editPhotoForm.value.new_album_introduction.trim()
            }
        } else if (editPhotoForm.value.album_id) {
            updateData.album_id = editPhotoForm.value.album_id
        }

        // 至少需要提供一个字段
        if (Object.keys(updateData).length === 0) {
            ElMessage.warning('请至少填写照片名称或选择/创建相册')
            return
        }

        await updatePhoto(editingPhoto.value.id, updateData)

        ElMessage.success('照片更新成功')
        editPhotoDialog.value = false

        // 重新获取数据
        await fetchAlbumCategories()

        // 重新设置当前选中的相册，确保数据是最新的
        if (selectedAlbum.value) {
            const updatedAlbum = albumTags.value.find(a => a.id === selectedAlbum.value.id)
            if (updatedAlbum) {
                selectedAlbum.value = updatedAlbum
                albumPagination.value.total = updatedAlbum.photos.length
                console.log('📸 照片编辑完成，当前相册照片数量:', updatedAlbum.photos.length)
            } else {
                // 如果相册不存在了（比如被删除了），清空选择
                selectedAlbum.value = null
            }
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('更新照片失败:', error)
            ElMessage.error('更新照片失败')
        }
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
    editPhotoForm.value = {
        name: photo.name,
        album_id: photo.album_id || '',
        new_album_name: '',
        new_album_introduction: ''
    }
    editPhotoDialog.value = true
}

// 选择逻辑
const selectAudioCategory = async (category) => {
    console.log('🎵 选择音频分类:', category.name, category.id)
    selectedAudio.value = category
    selectedAlbum.value = null
    selectedUser.value = null
    activeTab.value = 'audio'
    resetAudioFilters()

    // 强制重新获取音频数据以确保数据是最新的
    await fetchAudioCategories()

    // 重新设置选中的分类（因为数据可能已经更新）
    const updatedCategory = audioCategories.value.find(c => c.id === category.id)
    if (updatedCategory) {
        selectedAudio.value = updatedCategory
        audioPagination.value.total = updatedCategory.audios.length
        console.log('🎵 选中分类更新完成，音频数量:', updatedCategory.audios.length)
    } else {
        console.warn('🎵 未找到更新的分类，可能已被删除')
        selectedAudio.value = null
    }
}

const selectAlbum = async (album) => {
    console.log('📸 选择相册:', album.name, album.id)
    selectedAlbum.value = album
    selectedAudio.value = null
    selectedUser.value = null
    activeTab.value = 'albums'
    resetAlbumFilters()

    // 强制重新获取相册数据以确保数据是最新的
    await fetchAlbumCategories()

    // 重新设置选中的相册（因为数据可能已经更新）
    const updatedAlbum = albumTags.value.find(a => a.id === album.id)
    if (updatedAlbum) {
        selectedAlbum.value = updatedAlbum
        albumPagination.value.total = updatedAlbum.photos.length
        console.log('📸 选中相册更新完成，照片数量:', updatedAlbum.photos.length)
    } else {
        console.warn('📸 未找到更新的相册，可能已被删除')
        selectedAlbum.value = null
    }
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

// 筛选和分页方法
const resetAudioFilters = () => {
    audioFilters.value = {
        name: '',
        status: '',
        uploader: '',
        dateRange: []
    }
    audioPagination.value.currentPage = 1
}

const resetAlbumFilters = () => {
    albumFilters.value = {
        name: '',
        status: '',
        uploader: '',
        dateRange: []
    }
    albumPagination.value.currentPage = 1
}

const handleAudioPageChange = (page) => {
    audioPagination.value.currentPage = page
}

const handleAudioPageSizeChange = (size) => {
    audioPagination.value.pageSize = size
    audioPagination.value.currentPage = 1
}

const handleAlbumPageChange = (page) => {
    albumPagination.value.currentPage = page
}

const handleAlbumPageSizeChange = (size) => {
    albumPagination.value.pageSize = size
    albumPagination.value.currentPage = 1
}

// 监听筛选变化时重置分页
const onAudioFiltersChange = () => {
    audioPagination.value.currentPage = 1
    audioPagination.value.total = filteredAudios.value.length
}

// 组件挂载时获取数据
onMounted(() => {
    fetchAllData()
})

// ========== 舰礼管理方法 ==========

// 获取舰礼列表
const fetchCaptainGifts = async () => {
    giftLoading.value = true
    try {
        const res = await getGiftsByMonth(parseInt(giftYear.value), giftMonth.value)
        if (res.code === 200) {
            captainGifts.value = res.data.gifts || []
        } else {
            ElMessage.error(res.message || '获取舰礼列表失败')
            captainGifts.value = []
        }
    } catch (error) {
        console.error('获取舰礼列表失败:', error)
        ElMessage.error('获取舰礼列表失败')
        captainGifts.value = []
    } finally {
        giftLoading.value = false
    }
}

// 切换年月
const handleGiftMonthChange = () => {
    fetchCaptainGifts()
}

// 打开添加舰礼对话框
const openAddGiftDialog = () => {
    giftDialogTitle.value = '添加舰礼'
    giftForm.value = {
        id: null,
        giftName: '',
        giftContent: '',
        requiredFansCount: 0,
        isLimited: false,
        giftType: 1,
        includesCaptain: false,
        includesCommander: false,
        showProgress: true
    }
    giftDialogVisible.value = true
}

// 打开编辑舰礼对话框
const openEditGiftDialog = (gift) => {
    giftDialogTitle.value = '编辑舰礼'
    const includes = gift.includes || 0
    giftForm.value = {
        id: gift.id,
        giftName: gift.giftName,
        giftContent: gift.giftContent,
        requiredFansCount: gift.requiredFansCount,
        isLimited: gift.requiredFansCount > 0,
        giftType: gift.giftType || 1,
        includesCaptain: !!(includes & 1),
        includesCommander: !!(includes & 2),
        showProgress: gift.showProgress === 0 ? false : true
    }
    giftDialogVisible.value = true
}

// 保存舰礼
const saveGift = async () => {
    if (!giftFormRef.value) return
    
    await giftFormRef.value.validate(async (valid) => {
        if (valid) {
            try {
                // 根据是否限制舰长数决定 requiredFansCount
                const requiredFansCount = giftForm.value.isLimited 
                    ? Number(giftForm.value.requiredFansCount) 
                    : 0
                
                // 计算包含关系 (bitmap)
                let includes = 0
                if (giftForm.value.includesCaptain) includes |= 1
                if (giftForm.value.includesCommander) includes |= 2
                
                const giftData = {
                    giftName: giftForm.value.giftName,
                    giftContent: giftForm.value.giftContent,
                    requiredFansCount: requiredFansCount,
                    giftType: giftForm.value.giftType,
                    includes: includes,
                    showProgress: giftForm.value.showProgress ? 1 : 0
                }
                
                let res
                if (giftForm.value.id) {
                    // 编辑
                    res = await updateGift(giftForm.value.id, giftData)
                } else {
                    // 添加
                    res = await addGift({
                        year: parseInt(giftYear.value),
                        month: giftMonth.value,
                        ...giftData
                    })
                }
                
                if (res.code === 200) {
                    ElMessage.success(giftForm.value.id ? '编辑成功' : '添加成功')
                    giftDialogVisible.value = false
                    await fetchCaptainGifts()
                } else {
                    ElMessage.error(res.message || (giftForm.value.id ? '编辑失败' : '添加失败'))
                }
            } catch (error) {
                console.error('保存舰礼失败:', error)
                ElMessage.error('保存失败')
            }
        }
    })
}

// 删除舰礼
const handleDeleteGift = async (gift) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除舰礼「${gift.giftName}」吗？`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )
        
        const res = await deleteGift(gift.id)
        if (res.code === 200) {
            ElMessage.success('删除成功')
            await fetchCaptainGifts()
        } else {
            ElMessage.error(res.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除舰礼失败:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 标签页切换处理
const handleTabChange = (tabName) => {
    if (tabName === 'gifts-full') {
        fetchCaptainGifts()
    }
}

// 切换到舰礼管理完整页面
const switchToGiftFullPage = () => {
    activeTab.value = 'gifts-full'
    fetchCaptainGifts()
}

</script>

<template>
    <div class="admin-page">
        <div class="content-wrapper">
            <!-- 页面头部 -->
            <PageHero
              title="管理后台"
              subtitle="守护方寸秩序，为你呈现此刻美好"
            />
            <!-- 前往新版管理后台 -->
            <div class="new-admin-entry">
              <el-button type="success" plain @click="goToNewAdmin">
                前往新版管理后台
                <el-icon style="margin-left: 6px"><ArrowRight /></el-icon>
              </el-button>
            </div>

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
                    <el-tabs v-model="activeTab" class="category-tabs" @tab-change="handleTabChange">
                        <!-- 音频分类 -->
                        <el-tab-pane label="音频管理" name="audio">
                            <div v-if="audioCategories.length === 0" class="empty-state">
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
                                        <el-button size="small" @click.stop="deleteAudioCategory(category)"
                                            type="danger" circle plain>
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
                            <div v-if="albumTags.length === 0" class="empty-state">
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

                        <!-- 舰礼管理 -->
                        <el-tab-pane label="舰礼管理" name="gifts-full">
                            <div class="gift-management-compact" @click="switchToGiftFullPage">
                                <div class="gift-compact-header">
                                    <el-icon><Present /></el-icon>
                                    <span>舰礼管理</span>
                                    <el-tag size="small" type="info">{{ captainGifts.length }}个舰礼</el-tag>
                                </div>
                                <div class="gift-compact-desc">点击管理当月舰礼</div>
                            </div>
                        </el-tab-pane>
                    </el-tabs>
                </div>

                <!-- 编辑分类对话框 -->
                <el-dialog v-model="editCategoryDialog" title="编辑音频分类" width="500px" :close-on-click-modal="false">
                    <el-form :model="editCategoryForm" :rules="editCategoryFormRules" ref="editCategoryFormRef"
                        label-width="100px">
                        <el-form-item label="分类名称" prop="name">
                            <el-input v-model="editCategoryForm.name" placeholder="请输入分类名称" maxlength="50"
                                show-word-limit />
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <span class="dialog-footer">
                            <el-button @click="editCategoryDialog = false">取消</el-button>
                            <el-button type="primary" @click="handleEditCategory" :loading="false">
                                确定编辑
                            </el-button>
                        </span>
                    </template>
                </el-dialog>

                <!-- 编辑音频对话框 -->
                <el-dialog v-model="editAudioDialog" title="编辑音频" width="600px" :close-on-click-modal="false">
                    <el-form :model="editAudioForm" :rules="editAudioFormRules" ref="editAudioFormRef"
                        label-width="100px">
                        <el-form-item label="音频名称" prop="name">
                            <el-input v-model="editAudioForm.name" placeholder="请输入音频名称" maxlength="100"
                                show-word-limit />
                        </el-form-item>
                        <el-form-item label="选择分类">
                            <el-select v-model="editAudioForm.classification_id" placeholder="选择现有分类（可选）" clearable
                                style="width: 100%" filterable>
                                <el-option v-for="category in audioCategories" :key="category.id" :label="category.name"
                                    :value="category.id" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="创建新分类">
                            <el-input v-model="editAudioForm.new_classification_name" placeholder="输入新分类名称（可选）"
                                maxlength="50" />
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <span class="dialog-footer">
                            <el-button @click="editAudioDialog = false">取消</el-button>
                            <el-button type="primary" @click="handleEditAudio" :loading="false">
                                确定
                            </el-button>
                        </span>
                    </template>
                </el-dialog>

                <!-- 编辑相册对话框 -->
                <el-dialog v-model="editAlbumDialog" title="编辑相册" width="600px" :close-on-click-modal="false">
                    <el-form :model="editAlbumForm" :rules="editAlbumFormRules" ref="editAlbumFormRef"
                        label-width="100px">
                        <el-form-item label="相册名称" prop="name">
                            <el-input v-model="editAlbumForm.name" placeholder="请输入相册名称" maxlength="100"
                                show-word-limit />
                        </el-form-item>
                        <el-form-item label="相册介绍">
                            <el-input v-model="editAlbumForm.introduction" type="textarea" :rows="3"
                                placeholder="请输入相册介绍（可选）" maxlength="500" show-word-limit />
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <span class="dialog-footer">
                            <el-button @click="editAlbumDialog = false">取消</el-button>
                            <el-button type="primary" @click="handleEditAlbum" :loading="false">
                                确定
                            </el-button>
                        </span>
                    </template>
                </el-dialog>

                <!-- 编辑照片对话框 -->
                <el-dialog v-model="editPhotoDialog" title="编辑照片" width="600px" :close-on-click-modal="false">
                    <el-form :model="editPhotoForm" :rules="editPhotoFormRules" ref="editPhotoFormRef"
                        label-width="100px">
                        <el-form-item label="照片名称" prop="name">
                            <el-input v-model="editPhotoForm.name" placeholder="请输入照片名称" maxlength="100"
                                show-word-limit />
                        </el-form-item>
                        <el-form-item label="选择相册">
                            <el-select v-model="editPhotoForm.album_id" placeholder="选择现有相册（可选）" clearable
                                style="width: 100%" filterable>
                                <el-option v-for="album in albumTags" :key="album.id" :label="album.name"
                                    :value="album.id" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="创建新相册">
                            <el-input v-model="editPhotoForm.new_album_name" placeholder="输入新相册名称（可选）"
                                maxlength="100" />
                        </el-form-item>
                        <el-form-item label="新相册简介" v-if="editPhotoForm.new_album_name">
                            <el-input v-model="editPhotoForm.new_album_introduction" type="textarea" :rows="3"
                                placeholder="输入新相册简介（可选）" maxlength="500" show-word-limit />
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <span class="dialog-footer">
                            <el-button @click="editPhotoDialog = false">取消</el-button>
                            <el-button type="primary" @click="handleEditPhoto" :loading="false">
                                确定
                            </el-button>
                        </span>
                    </template>
                </el-dialog>

                <!-- 舰礼编辑对话框 -->
                <el-dialog v-model="giftDialogVisible" :title="giftDialogTitle" width="550px" :close-on-click-modal="false">
                    <el-form :model="giftForm" :rules="giftFormRules" ref="giftFormRef" label-width="100px">
                        <el-form-item label="礼物名称" prop="giftName">
                            <el-input v-model="giftForm.giftName" placeholder="请输入礼物名称" maxlength="50" show-word-limit />
                        </el-form-item>
                        <el-form-item label="礼物类型">
                            <el-radio-group v-model="giftForm.giftType">
                                <el-radio-button :value="1">舰长礼</el-radio-button>
                                <el-radio-button :value="2">提督礼</el-radio-button>
                                <el-radio-button :value="3">总督礼</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item label="礼物内容" prop="giftContent">
                            <el-input v-model="giftForm.giftContent" type="textarea" :rows="3" placeholder="请输入礼物内容描述（可选）" maxlength="200" show-word-limit />
                        </el-form-item>
                        <el-form-item label="解锁条件">
                            <el-radio-group v-model="giftForm.isLimited">
                                <el-radio :value="false">基础礼物（无数量要求）</el-radio>
                                <el-radio :value="true">达到指定数量</el-radio>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item label="目标数量" v-if="giftForm.isLimited">
                            <el-input-number v-model="giftForm.requiredFansCount" :min="1" :max="9999" />
                        </el-form-item>
                        <el-form-item label="包含关系" v-if="giftForm.giftType > 1">
                            <el-checkbox v-model="giftForm.includesCaptain" v-if="giftForm.giftType >= 2">包含舰长礼</el-checkbox>
                            <el-checkbox v-model="giftForm.includesCommander" v-if="giftForm.giftType >= 3">包含提督礼</el-checkbox>
                        </el-form-item>
                        <el-form-item label="显示进度">
                            <el-radio-group v-model="giftForm.showProgress">
                                <el-radio :value="true">显示</el-radio>
                                <el-radio :value="false">隐藏</el-radio>
                            </el-radio-group>
                            <el-text type="info" size="small" style="margin-left: 8px;">是否在进度条中显示</el-text>
                        </el-form-item>
                    </el-form>
                    <template #footer>
                        <span class="dialog-footer">
                            <el-button @click="giftDialogVisible = false">取消</el-button>
                            <el-button type="primary" @click="saveGift">
                                确定
                            </el-button>
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
                            <!-- 音频筛选区域 -->
                            <el-form :inline="true" :model="audioFilters" class="filters-form">
                                <el-form-item label="音频名称">
                                    <el-input v-model="audioFilters.name" placeholder="搜索音频名称" clearable
                                        style="width: 150px" @input="onAudioFiltersChange" />
                                </el-form-item>
                                <el-form-item label="审核状态">
                                    <el-select v-model="audioFilters.status" placeholder="选择状态" clearable
                                        style="width: 120px" @change="onAudioFiltersChange">
                                        <el-option label="待审核" :value="0" />
                                        <el-option label="已审核" :value="1" />
                                        <el-option label="不通过" :value="2" />
                                    </el-select>
                                </el-form-item>
                                <el-form-item>
                                    <el-button @click="resetAudioFilters" type="default">重置筛选</el-button>
                                </el-form-item>
                            </el-form>

                            <el-table :data="paginatedAudios" style="width: 100%" stripe>
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

                            <!-- 音频分页 -->
                            <div class="paging">
                                <span>共 {{ audioPagination.total }} 条</span>
                                <el-pagination background prev-text="上一页" next-text="下一页" layout="prev, pager, next"
                                    :total="audioPagination.total" :pager-count="5"
                                    @current-change="handleAudioPageChange" />
                            </div>
                        </div>

                        <!-- 相册表格 -->
                        <div v-else-if="selectedAlbum && activeTab === 'albums'" class="table-content">
                            <!-- 相册筛选区域 -->
                            <el-form :inline="true" :model="albumFilters" class="filters-form">
                                <el-form-item label="照片名称">
                                    <el-input v-model="albumFilters.name" placeholder="搜索照片名称" clearable
                                        style="width: 150px" @input="onAlbumFiltersChange" />
                                </el-form-item>
                                <el-form-item label="审核状态">
                                    <el-select v-model="albumFilters.status" placeholder="选择状态" clearable
                                        style="width: 120px" @change="onAlbumFiltersChange">
                                        <el-option label="待审核" :value="0" />
                                        <el-option label="已审核" :value="1" />
                                        <el-option label="不通过" :value="2" />
                                    </el-select>
                                </el-form-item>
                                <el-form-item>
                                    <el-button @click="resetAlbumFilters" type="default">重置筛选</el-button>
                                </el-form-item>
                            </el-form>

                            <el-table :data="paginatedPhotos" style="width: 100%" stripe>
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
                                            {{ row.is_review === 1 ? '已审核' : row.is_review === 0 ? '待审核' : '不通过' }}
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

                            <!-- 相册分页 -->
                            <div class="paging">
                                <span>共 {{ albumPagination.total }} 条</span>
                                <el-pagination background prev-text="上一页" next-text="下一页" layout="prev, pager, next"
                                    :total="albumPagination.total" :pager-count="5"
                                    @current-change="handleAlbumPageChange" />
                            </div>
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
                                        <el-button @click="changeUserPermission(selectedUser)" type="primary">
                                            {{ selectedUser.permission === 3 ? '授予管理员权限' : selectedUser.permission === 2
                                                ? '撤销管理员权限' : '修改权限' }}
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

                        <!-- 舰礼管理完整页面 -->
                        <div v-else-if="activeTab === 'gifts-full'" class="gift-full-page">
                            <div class="gift-full-header">
                                <div class="gift-full-title">
                                    <el-icon size="24"><Present /></el-icon>
                                    <h3>舰礼管理</h3>
                                </div>
                                <div class="gift-full-actions">
                                    <el-date-picker
                                        v-model="giftYear"
                                        type="year"
                                        placeholder="选择年份"
                                        @change="handleGiftMonthChange"
                                        style="width: 120px;"
                                        value-format="YYYY"
                                    />
                                    <el-select v-model="giftMonth" @change="handleGiftMonthChange" style="width: 100px; margin-left: 10px;">
                                        <el-option
                                            v-for="m in 12"
                                            :key="m"
                                            :label="m + '月'"
                                            :value="m"
                                        />
                                    </el-select>
                                    <el-button type="primary" @click="openAddGiftDialog" style="margin-left: 16px;">
                                        <el-icon><Plus /></el-icon>
                                        添加舰礼
                                    </el-button>
                                </div>
                            </div>

                            <div v-loading="giftLoading" class="gift-full-content">
                                <el-empty v-if="captainGifts.length === 0" description="暂无舰礼，点击上方按钮添加" :image-size="120">
                                    <template #image>
                                        <el-icon size="80" color="#dcdfe6"><Present /></el-icon>
                                    </template>
                                </el-empty>
                                <div v-else class="gift-full-list">
                                    <el-table :data="captainGifts" style="width: 100%" stripe>
                                        <el-table-column type="index" label="序号" width="60" align="center" />
                                        <el-table-column label="类型" width="90" align="center">
                                            <template #default="{ row }">
                                                <el-tag :type="getGiftTypeTagType(row.giftType)" size="small">
                                                    {{ getGiftTypeLabel(row.giftType) }}
                                                </el-tag>
                                            </template>
                                        </el-table-column>
                                        <el-table-column prop="giftName" label="礼物名称" min-width="120" />
                                        <el-table-column prop="giftContent" label="礼物内容" min-width="200">
                                            <template #default="{ row }">
                                                <span class="gift-content-text">{{ row.giftContent || '-' }}</span>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="解锁条件" width="120" align="center">
                                            <template #default="{ row }">
                                                <el-tag :type="row.requiredFansCount === 0 ? 'success' : 'warning'" size="small">
                                                    {{ row.requiredFansCount === 0 ? '基础' : `${row.requiredFansCount}` }}
                                                </el-tag>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="包含" width="120" align="center">
                                            <template #default="{ row }">
                                                <el-text type="info" size="small" v-if="getIncludesText(row.includes)">
                                                    {{ getIncludesText(row.includes) }}
                                                </el-text>
                                                <span v-else>-</span>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="进度" width="80" align="center">
                                            <template #default="{ row }">
                                                <el-tag :type="row.showProgress !== 0 ? 'success' : 'info'" size="small">
                                                    {{ row.showProgress !== 0 ? '显示' : '隐藏' }}
                                                </el-tag>
                                            </template>
                                        </el-table-column>
                                        <el-table-column label="操作" width="120" align="center" fixed="right">
                                            <template #default="{ row }">
                                                <el-button size="small" @click="openEditGiftDialog(row)" type="primary">
                                                    <el-icon><Edit /></el-icon>
                                                </el-button>
                                                <el-button size="small" @click="handleDeleteGift(row)" type="danger">
                                                    <el-icon><Delete /></el-icon>
                                                </el-button>
                                            </template>
                                        </el-table-column>
                                    </el-table>
                                </div>
                            </div>
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
    padding: 20px;
}

/* 响应式内容包装器 */
@media (max-width: 768px) {
    .content-wrapper {
        padding: 15px;
    }
}

@media (max-width: 480px) {
    .content-wrapper {
        padding: 12px;
    }
}

/* 统计卡片 */
.new-admin-entry {
    margin-bottom: 30px;
}

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
    background: linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-light) 50%, var(--color-primary-lighter) 100%);
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
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    flex-shrink: 0;
    box-shadow: 0 4px 12px var(--color-primary-alpha-30);
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
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
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
    color: var(--color-primary);
}

.category-tabs :deep(.el-tabs__item.is-active) {
    color: var(--color-primary);
    font-weight: 600;
    border-bottom: 2px solid var(--color-primary);
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
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-alpha-20);
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
    color: var(--color-primary);
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
    min-width: 800px;
    /* 确保表格有最小宽度 */
}

/* 响应式筛选区域 */
@media (max-width: 1024px) {
    .filters-section {
        padding: 12px;
    }

    .filters-form .el-form-item {
        margin-bottom: 12px;
    }
}

@media (max-width: 768px) {
    .filters-section {
        margin-bottom: 16px;
        padding: 12px;
    }

    .filters-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .filters-form .el-form-item {
        width: 100%;
        margin-bottom: 0;
    }

    .filters-form .el-form-item .el-input,
    .filters-form .el-form-item .el-select,
    .filters-form .el-form-item .el-date-picker {
        width: 100% !important;
    }

    .filters-info {
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
    }

    .paging {
        justify-content: center;
    }

    .paging>span {
        margin-right: 12px;
        font-size: 12px;
    }
}

@media (max-width: 480px) {
    .filters-section {
        margin-bottom: 12px;
        padding: 8px;
    }

    .filters-form {
        gap: 8px;
    }
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
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
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


/* 筛选区域 */
.filters-section {
    margin-bottom: 20px;
    padding: 16px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 8px;
    border: 1px solid rgba(226, 232, 240, 0.8);
}

.filters-form {
    margin-bottom: 12px;
}

.filters-form .el-form-item {
    margin-bottom: 8px;
}

.filters-form .el-form-item__label {
    font-weight: 500;
    color: #374151;
}

.filters-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: #6b7280;
}

.filters-info span {
    font-weight: 500;
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
    color: var(--color-primary);
    font-size: 18px;
    margin-right: 12px;
    filter: drop-shadow(0 2px 4px var(--color-primary-alpha-20));
}

.album-icon {
    color: var(--color-primary);
    font-size: 18px;
    margin-right: 12px;
    filter: drop-shadow(0 2px 4px var(--color-primary-alpha-20));
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

/* 响应式按钮 */

/* 舰礼管理样式 */
.gift-management {
    padding: 16px;
}

.gift-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 10px;
}

.gift-date-selector {
    display: flex;
    align-items: center;
}

.gift-list {
    min-height: 200px;
}

.gift-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.gift-card {
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 16px;
    transition: all 0.3s ease;
}

.gift-card:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.gift-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.gift-card-name {
    font-weight: 600;
    font-size: 15px;
    color: #303133;
}

.gift-card-actions {
    display: flex;
    gap: 4px;
}

.gift-card-content {
    font-size: 13px;
    color: #606266;
    margin-bottom: 12px;
    min-height: 20px;
}

.gift-card-footer {
    display: flex;
    justify-content: flex-start;
}

@media (max-width: 768px) {
    .gift-header {
        flex-direction: column;
        align-items: stretch;
    }

    .gift-date-selector {
        justify-content: center;
    }
}

/* 舰礼管理紧凑版（左侧） */
.gift-management-compact {
    padding: 16px;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid #bae6fd;
}

.gift-management-compact:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
}

.gift-compact-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    color: #0369a1;
    margin-bottom: 4px;
}

.gift-compact-desc {
    font-size: 12px;
    color: #64748b;
}

/* 舰礼管理完整页面 */
.gift-full-page {
    padding: 20px;
    background: #fff;
    border-radius: 12px;
    min-height: 500px;
}

.gift-full-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e4e7ed;
    flex-wrap: wrap;
    gap: 12px;
}

.gift-full-title {
    display: flex;
    align-items: center;
    gap: 10px;
}

.gift-full-title h3 {
    margin: 0;
    font-size: 20px;
    color: #303133;
}

.gift-full-actions {
    display: flex;
    align-items: center;
}

.gift-full-content {
    min-height: 400px;
}

.gift-full-list {
    width: 100%;
}

.gift-content-text {
    color: #606266;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

@media (max-width: 768px) {
    .gift-full-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .gift-full-actions {
        width: 100%;
        flex-wrap: wrap;
    }
}
</style>
