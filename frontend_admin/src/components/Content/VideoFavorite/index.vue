<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getVideoList, reviewVideo, revokeVideoReview, deleteVideo, getFavorites, moveVideoToFavorite, updateFavorite, deleteFavorite } from '@/api/videoFavorite.js'
import { Search, Refresh, Edit, Delete, View, CircleCheck, CircleClose, Folder, VideoPlay } from '@element-plus/icons-vue'

// 当前视图模式：'favorite' 按收藏夹管理，'all' 全部视频列表
const viewMode = ref('all')

// 数据列表
const videoList = ref([])
const loading = ref(false)

// 选中的收藏夹
const selectedFavorite = ref(null)

// 收藏夹列表
const favoritesList = ref([])

// 视频编辑对话框
const editVideoDialog = ref(false)
const editingVideo = ref(null)

// 收藏夹编辑对话框
const editFavoriteDialog = ref(false)
const editingFavorite = ref(null)
const editFavoriteForm = ref({
    name: '',
    description: ''
})

// 审核对话框
const reviewVideoDialog = ref(false)
const reviewingVideo = ref(null)
const reviewAction = ref('')

// 视频预览
const videoPreviewVisible = ref(false)
const previewVideo = ref(null)

// 视频编辑表单
const editVideoForm = ref({
    title: '',
    uploaderName: '',
    favoriteId: null
})

// 分页状态
const favoritePagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

const videoPagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

// 筛选条件
const favoriteFilters = ref({
    name: ''
})

const videoFilters = ref({
    title: '',
    status: ''
})

// 搜索条件（点击搜索后才会更新）
const favoriteSearchParams = ref({
    name: ''
})

const videoSearchParams = ref({
    title: '',
    status: ''
})

// 计算属性 - 筛选后的收藏夹列表
const filteredFavorites = computed(() => {
    let result = favoritesList.value

    // 名称筛选（使用搜索参数）
    if (favoriteSearchParams.value.name) {
        result = result.filter(favorite =>
            favorite.name.toLowerCase().includes(favoriteSearchParams.value.name.toLowerCase())
        )
    }

    // 更新总数
    favoritePagination.value.total = result.length

    return result
})

// 分页后的收藏夹列表
const paginatedFavorites = computed(() => {
    const start = (favoritePagination.value.page - 1) * favoritePagination.value.pageSize
    const end = start + favoritePagination.value.pageSize
    return filteredFavorites.value.slice(start, end)
})

// 计算属性 - 筛选后的视频列表
const filteredVideos = computed(() => {
    if (!selectedFavorite.value) return []
    let result = videoList.value.filter(video => video.favoriteId === selectedFavorite.value?.id)

    // 标题筛选（使用搜索参数）
    if (videoSearchParams.value.title) {
        result = result.filter(video =>
            video.title.toLowerCase().includes(videoSearchParams.value.title.toLowerCase())
        )
    }

    // 状态筛选（使用搜索参数）
    if (videoSearchParams.value.status !== '') {
        result = result.filter(video => video.isReview === parseInt(videoSearchParams.value.status))
    }

    // 更新总数
    videoPagination.value.total = result.length

    return result
})

// 分页后的视频列表
const paginatedVideos = computed(() => {
    const start = (videoPagination.value.page - 1) * videoPagination.value.pageSize
    const end = start + videoPagination.value.pageSize
    return filteredVideos.value.slice(start, end)
})

// ==================== 全部列表视图 ====================

// 全部视频列表（平铺所有收藏夹下的视频）
const allVideosList = computed(() => {
    return videoList.value.map(video => {
        const favorite = favoritesList.value.find(f => f.id === video.favoriteId)
        return {
            ...video,
            favoriteName: favorite?.name || '未分类'
        }
    })
})

// 全部列表筛选条件
const allVideoFilters = ref({
    title: '',
    status: ''
})

// 全部列表搜索参数
const allVideoSearchParams = ref({
    title: '',
    status: ''
})

// 全部列表分页
const allVideoPagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

// 筛选后的全部视频列表
const filteredAllVideos = computed(() => {
    let result = allVideosList.value

    // 标题筛选
    if (allVideoSearchParams.value.title) {
        result = result.filter(video =>
            video.title.toLowerCase().includes(allVideoSearchParams.value.title.toLowerCase())
        )
    }

    // 状态筛选
    if (allVideoSearchParams.value.status !== '') {
        result = result.filter(video => video.isReview === parseInt(allVideoSearchParams.value.status))
    }

    // 更新总数
    allVideoPagination.value.total = result.length

    return result
})

// 分页后的全部视频列表
const paginatedAllVideos = computed(() => {
    const start = (allVideoPagination.value.page - 1) * allVideoPagination.value.pageSize
    const end = start + allVideoPagination.value.pageSize
    return filteredAllVideos.value.slice(start, end)
})

// 全部列表搜索
const handleAllVideoSearch = () => {
    allVideoSearchParams.value.title = allVideoFilters.value.title
    allVideoSearchParams.value.status = allVideoFilters.value.status
    allVideoPagination.value.page = 1
}

// 重置全部列表筛选
const resetAllVideoFilters = () => {
    allVideoFilters.value.title = ''
    allVideoFilters.value.status = ''
    allVideoSearchParams.value.title = ''
    allVideoSearchParams.value.status = ''
    allVideoPagination.value.page = 1
}

// 全部列表分页处理
const handleAllVideoPageChange = (page) => {
    allVideoPagination.value.page = page
}

// 获取收藏夹列表
const fetchFavorites = async () => {
    loading.value = true
    try {
        const response = await getFavorites()
        if (response.success) {
            favoritesList.value = response.data?.favorites || []
            favoritePagination.value.total = favoritesList.value.length
        } else {
            ElMessage.error(response.message || '获取收藏夹列表失败')
        }
    } catch (error) {
        console.error('获取收藏夹列表失败:', error)
        ElMessage.error('获取收藏夹列表失败')
    } finally {
        loading.value = false
    }
}

// 获取视频列表
const fetchVideos = async () => {
    try {
        const response = await getVideoList({
            page: 1,
            pageSize: 1000
        })
        if (response.success) {
            videoList.value = response.data?.list || []
        } else {
            ElMessage.error(response.message || '获取视频列表失败')
        }
    } catch (error) {
        console.error('获取视频列表失败:', error)
        ElMessage.error('获取视频列表失败')
    }
}

// 收藏夹搜索
const handleFavoriteSearch = () => {
    favoriteSearchParams.value.name = favoriteFilters.value.name
    favoritePagination.value.page = 1
}

// 视频搜索
const handleVideoSearch = () => {
    videoSearchParams.value.title = videoFilters.value.title
    videoSearchParams.value.status = videoFilters.value.status
    videoPagination.value.page = 1
}

// 重置收藏夹筛选
const resetFavoriteFilters = () => {
    favoriteFilters.value.name = ''
    favoriteSearchParams.value.name = ''
    favoritePagination.value.page = 1
}

// 重置视频筛选
const resetVideoFilters = () => {
    videoFilters.value.title = ''
    videoFilters.value.status = ''
    videoSearchParams.value.title = ''
    videoSearchParams.value.status = ''
    videoPagination.value.page = 1
}

// 选择收藏夹
const selectFavorite = (favorite) => {
    selectedFavorite.value = favorite
    videoPagination.value.page = 1
    videoPagination.value.total = filteredVideos.value.length
    // 重置视频筛选
    videoFilters.value.title = ''
    videoFilters.value.status = ''
}

// 打开视频预览
const openVideoPreview = (video) => {
    previewVideo.value = video
    videoPreviewVisible.value = true
}

// 打开审核弹窗
const openReviewDialog = (video, action) => {
    reviewingVideo.value = video
    reviewAction.value = action
    reviewVideoDialog.value = true
}

// 确认审核操作
const confirmReview = async () => {
    if (!reviewingVideo.value) return

    let status
    let actionText

    if (reviewAction.value === 'approve') {
        status = 1
        actionText = '审核通过'
    } else if (reviewAction.value === 'reject') {
        status = 2
        actionText = '审核不通过'
    } else {
        status = 0
        actionText = '撤销审核'
    }

    try {
        let response
        if (reviewAction.value === 'revoke') {
            // 撤销审核使用单独的接口
            response = await revokeVideoReview(reviewingVideo.value.id)
        } else {
            response = await reviewVideo(reviewingVideo.value.id, status)
        }
        if (response.success) {
            reviewingVideo.value.isReview = status
            ElMessage.success(`${actionText}成功`)
            reviewVideoDialog.value = false
            // 如果是撤销审核，清除状态筛选以便用户能看到撤销后的视频
            if (reviewAction.value === 'revoke') {
                videoFilters.value.status = ''
                videoSearchParams.value.status = ''
            }
            // 刷新列表
            fetchVideos()
        } else {
            ElMessage.error(response.message || `${actionText}失败`)
        }
    } catch (error) {
        console.error(`${actionText}失败:`, error)
        ElMessage.error(`${actionText}失败`)
    }
}

// 带操作的确认审核
const confirmReviewWithAction = async (action) => {
    reviewAction.value = action
    await confirmReview()
}

// 编辑收藏夹
const handleEditFavorite = (favorite) => {
    editingFavorite.value = favorite
    editFavoriteForm.value = {
        name: favorite.name,
        description: favorite.description || ''
    }
    editFavoriteDialog.value = true
}

// 保存收藏夹编辑
const saveFavoriteEdit = async () => {
    try {
        if (!editFavoriteForm.value.name.trim()) {
            ElMessage.warning('收藏夹名称不能为空')
            return
        }

        const response = await updateFavorite(editingFavorite.value.id, {
            name: editFavoriteForm.value.name.trim(),
            description: editFavoriteForm.value.description.trim()
        })

        if (response.success) {
            // 更新本地数据
            editingFavorite.value.name = editFavoriteForm.value.name.trim()
            editingFavorite.value.description = editFavoriteForm.value.description.trim()
            // 如果当前选中的收藏夹是被编辑的，更新标题
            if (selectedFavorite.value && selectedFavorite.value.id === editingFavorite.value.id) {
                selectedFavorite.value.name = editFavoriteForm.value.name.trim()
            }
            ElMessage.success('收藏夹更新成功')
            editFavoriteDialog.value = false
        } else {
            ElMessage.error(response.message || '更新失败')
        }
    } catch (error) {
        console.error('更新收藏夹失败:', error)
        ElMessage.error('更新失败')
    }
}

// 删除收藏夹
const handleDeleteFavorite = async (favorite) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除收藏夹"${favorite.name}"吗？此操作会同时删除收藏夹内的所有视频，且不可恢复。`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'danger'
            }
        )

        const response = await deleteFavorite(favorite.id)
        if (response.success) {
            const index = favoritesList.value.findIndex(f => f.id === favorite.id)
            if (index > -1) {
                favoritesList.value.splice(index, 1)
                favoritePagination.value.total = filteredFavorites.value.length
            }
            // 如果删除的是当前选中的收藏夹，清空选中
            if (selectedFavorite.value && selectedFavorite.value.id === favorite.id) {
                selectedFavorite.value = null
            }
            ElMessage.success('收藏夹删除成功')
        } else {
            ElMessage.error(response.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除收藏夹失败:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 编辑视频
const handleEditVideo = (video) => {
    editingVideo.value = video
    editVideoForm.value = {
        title: video.title,
        uploaderName: video.uploaderName || '',
        favoriteId: video.favoriteId || null
    }
    editVideoDialog.value = true
}

// 保存视频编辑
const saveVideoEdit = async () => {
    try {
        if (!editVideoForm.value.title.trim()) {
            ElMessage.warning('视频标题不能为空')
            return
        }

        // 如果收藏夹发生变化，调用移动API
        if (editVideoForm.value.favoriteId !== editingVideo.value.favoriteId) {
            const moveResponse = await moveVideoToFavorite(
                editingVideo.value.id,
                editVideoForm.value.favoriteId
            )
            if (!moveResponse.success) {
                ElMessage.error(moveResponse.message || '移动收藏夹失败')
                return
            }
            editingVideo.value.favoriteId = editVideoForm.value.favoriteId
            // 更新收藏夹名称
            const favorite = favoritesList.value.find(f => f.id === editVideoForm.value.favoriteId)
            if (favorite) {
                editingVideo.value.favoriteName = favorite.name
            }
            // 如果当前选中的收藏夹不是目标收藏夹，从列表中移除
            if (selectedFavorite.value && selectedFavorite.value.id !== editVideoForm.value.favoriteId) {
                const index = videoList.value.findIndex(v => v.id === editingVideo.value.id)
                if (index > -1) {
                    videoList.value.splice(index, 1)
                    videoPagination.value.total = filteredVideos.value.length
                }
            }
        }

        // 更新本地数据
        editingVideo.value.title = editVideoForm.value.title.trim()
        editingVideo.value.uploaderName = editVideoForm.value.uploaderName.trim()
        ElMessage.success('视频更新成功')
        editVideoDialog.value = false
    } catch (error) {
        console.error('更新视频失败:', error)
        ElMessage.error('更新失败')
    }
}

// 删除视频
const handleDeleteVideo = async (video) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除视频"${video.title}"吗？此操作不可恢复。`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'danger'
            }
        )

        const response = await deleteVideo(video.id)
        if (response.success) {
            const index = videoList.value.findIndex(v => v.id === video.id)
            if (index > -1) {
                videoList.value.splice(index, 1)
                videoPagination.value.total = filteredVideos.value.length
            }
            ElMessage.success('视频删除成功')
        } else {
            ElMessage.error(response.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除视频失败:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 分页变化处理
const handleFavoritePageChange = (page) => {
    favoritePagination.value.page = page
}

const handleVideoPageChange = (page) => {
    videoPagination.value.page = page
}

// 获取审核状态标签
const getReviewStatusType = (status) => {
    const types = { 0: 'warning', 1: 'success', 2: 'danger' }
    return types[status] || 'info'
}

const getReviewStatusLabel = (status) => {
    const labels = { 0: '待审核', 1: '已通过', 2: '不通过' }
    return labels[status] || '未知'
}

// 格式化时间
const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('zh-CN')
}

// 获取B站视频链接
const getBilibiliUrl = (bvid) => {
    return `https://www.bilibili.com/video/${bvid}`
}

// 获取完整URL（处理图片路径）
const getFullUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    const baseUrl = import.meta.env.VITE_APP_API_BASE || 'http://localhost:6660'
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

onMounted(() => {
    fetchFavorites()
    fetchVideos()
})
</script>

<template>
    <div class="video-favorite-management">
        <!-- 视图切换 Tabs -->
        <div class="view-tabs">
            <el-radio-group v-model="viewMode" size="large">
                <el-radio-button label="all">
                    <el-icon><VideoPlay /></el-icon>
                    全部视频
                </el-radio-button>
                <el-radio-button label="favorite">
                    <el-icon><Folder /></el-icon>
                    按收藏夹管理
                </el-radio-button>
            </el-radio-group>
        </div>

        <!-- 按收藏夹管理视图 -->
        <div v-if="viewMode === 'favorite'" class="content-wrapper">
            <!-- 左侧收藏夹列表 -->
            <div class="left-section">
                <div class="section-header">
                    <h3>收藏夹列表</h3>
                </div>

                <div class="operate">
                    <div class="search-area">
                        <el-input v-model="favoriteFilters.name" placeholder="请输入收藏夹名称" clearable
                            :trigger-on-focus="false" style="width: 180px; margin-right: 10px" />
                        <el-button type="primary" @click="handleFavoriteSearch">
                            <el-icon>
                                <Search />
                            </el-icon>
                            搜索
                        </el-button>
                        <el-button @click="resetFavoriteFilters">
                            <el-icon>
                                <Refresh />
                            </el-icon>
                            重置
                        </el-button>
                    </div>
                </div>

                <el-table :data="paginatedFavorites" style="width: 100%" v-loading="loading" highlight-current-row
                    @row-click="selectFavorite" :header-cell-style="{ 'text-align': 'center', 'color': '#000' }">
                    <el-table-column align="center" type="index"
                        :index="(favoritePagination.page - 1) * favoritePagination.pageSize + 1" label="序号"
                        width="60" />
                    <el-table-column align="center" prop="name" label="收藏夹名称" min-width="120" show-overflow-tooltip />
                    <el-table-column align="center" prop="userName" label="创建者" width="100" />
                    <el-table-column align="center" label="视频数" width="80">
                        <template #default="scope">
                            {{ scope.row.videoCount || 0 }}
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="操作" width="150">
                        <template #default="scope">
                            <el-button type="primary" text @click.stop="handleEditFavorite(scope.row)"
                                class="preview-btn">
                                <el-icon>
                                    <Edit />
                                </el-icon>
                                编辑
                            </el-button>
                            <el-button type="danger" text @click.stop="handleDeleteFavorite(scope.row)"
                                class="preview-btn">
                                <el-icon>
                                    <Delete />
                                </el-icon>
                                删除
                            </el-button>
                        </template>
                    </el-table-column>
                    <template #empty>
                        暂无数据
                    </template>
                </el-table>

                <div class="paging">
                    <span>共 {{ favoritePagination.total }} 条</span>
                    <el-pagination background prev-text="上一页" next-text="下一页" layout="prev, pager, next"
                        :total="favoritePagination.total" :pager-count="5" :current-page="favoritePagination.page"
                        @current-change="handleFavoritePageChange" />
                </div>
            </div>

            <!-- 右侧视频列表 -->
            <div class="right-section" v-if="selectedFavorite">
                <div class="section-header">
                    <el-icon>
                        <Folder />
                    </el-icon>
                    <h3>{{ selectedFavorite.name }} - 视频列表</h3>
                </div>

                <div class="operate">
                    <div class="search-area">
                        <el-input v-model="videoFilters.title" placeholder="请输入视频标题" clearable :trigger-on-focus="false"
                            style="width: 160px; margin-right: 10px" />
                        <el-select v-model="videoFilters.status" placeholder="审核状态" clearable
                            style="width: 110px; margin-right: 10px">
                            <el-option label="待审核" :value="0" />
                            <el-option label="已通过" :value="1" />
                            <el-option label="不通过" :value="2" />
                        </el-select>
                        <el-button type="primary" @click="handleVideoSearch">
                            <el-icon>
                                <Search />
                            </el-icon>
                            搜索
                        </el-button>
                        <el-button @click="resetVideoFilters">
                            <el-icon>
                                <Refresh />
                            </el-icon>
                            重置
                        </el-button>
                    </div>
                </div>

                <el-table :data="paginatedVideos" style="width: 100%" v-loading="loading"
                    :header-cell-style="{ 'text-align': 'center', 'color': '#000' }">
                    <el-table-column align="center" type="index"
                        :index="(videoPagination.page - 1) * videoPagination.pageSize + 1" label="序号" width="60" />
                    <el-table-column align="center" prop="title" label="视频标题" min-width="150" show-overflow-tooltip />
                    <el-table-column align="center" prop="bvid" label="BV号" width="130" />
                    <el-table-column align="center" prop="userName" label="上传者" width="90" />
                    <el-table-column align="center" label="审核状态" width="90">
                        <template #default="scope">
                            <el-tag :type="getReviewStatusType(scope.row.isReview)">
                                {{ getReviewStatusLabel(scope.row.isReview) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="操作" width="260" fixed="right">
                        <template #default="scope">
                            <el-button type="primary" text @click="openVideoPreview(scope.row)" class="preview-btn">
                                <el-icon>
                                    <View />
                                </el-icon>
                                预览
                            </el-button>
                            <el-button v-if="scope.row.isReview === 0" type="primary" text
                                @click="openReviewDialog(scope.row, 'review')" class="preview-btn">
                                <el-icon>
                                    <CircleCheck />
                                </el-icon>
                                审核
                            </el-button>
                            <el-button v-if="scope.row.isReview === 1 || scope.row.isReview === 2" type="warning" text
                                @click="openReviewDialog(scope.row, 'revoke')" class="preview-btn">
                                <el-icon>
                                    <CircleClose />
                                </el-icon>
                                撤销
                            </el-button>
                            <el-button type="primary" text @click="handleEditVideo(scope.row)" class="preview-btn">
                                <el-icon>
                                    <Edit />
                                </el-icon>
                                编辑
                            </el-button>
                            <el-button type="danger" text @click="handleDeleteVideo(scope.row)" class="preview-btn">
                                <el-icon>
                                    <Delete />
                                </el-icon>
                                删除
                            </el-button>
                        </template>
                    </el-table-column>
                    <template #empty>
                        暂无数据
                    </template>
                </el-table>

                <div class="paging">
                    <span>共 {{ videoPagination.total }} 条</span>
                    <el-pagination background prev-text="上一页" next-text="下一页" layout="prev, pager, next"
                        :total="videoPagination.total" :pager-count="5" :current-page="videoPagination.page"
                        @current-change="handleVideoPageChange" />
                </div>
            </div>

            <!-- 未选择收藏夹提示 -->
            <div class="right-section empty-section" v-else>
                <el-empty description="请选择左侧收藏夹查看视频列表" />
            </div>
        </div>

        <!-- 全部视频列表视图 -->
        <div v-else class="all-videos-view">
            <div class="section-header">
                <el-icon><VideoPlay /></el-icon>
                <h3>全部视频列表</h3>
            </div>

            <div class="operate">
                <div class="search-area">
                    <el-input
                        v-model="allVideoFilters.title"
                        placeholder="请输入视频标题"
                        clearable
                        :trigger-on-focus="false"
                        style="width: 200px; margin-right: 10px"
                    />
                    <el-select v-model="allVideoFilters.status" placeholder="审核状态" clearable style="width: 120px; margin-right: 10px">
                        <el-option label="待审核" :value="0" />
                        <el-option label="已通过" :value="1" />
                        <el-option label="不通过" :value="2" />
                    </el-select>
                    <el-button type="primary" @click="handleAllVideoSearch">
                        <el-icon><Search /></el-icon>
                        搜索
                    </el-button>
                    <el-button @click="resetAllVideoFilters">
                        <el-icon><Refresh /></el-icon>
                        重置
                    </el-button>
                </div>
            </div>

            <el-table
                :data="paginatedAllVideos"
                style="width: 100%"
                v-loading="loading"
                :header-cell-style="{ 'text-align': 'center', 'color': '#000' }"
            >
                <el-table-column align="center" type="index" :index="(allVideoPagination.page - 1) * allVideoPagination.pageSize + 1" label="序号" width="60" />
                <el-table-column align="center" label="封面" width="130">
                    <template #default="scope">
                        <el-image
                            :src="getFullUrl(scope.row.cover)"
                            fit="cover"
                            style="width: 100px; height: 60px; border-radius: 4px; cursor: pointer;"
                            @click="openVideoPreview(scope.row)"
                        />
                    </template>
                </el-table-column>
                <el-table-column align="center" prop="title" label="视频标题" min-width="180" show-overflow-tooltip />
                <el-table-column align="center" prop="bvid" label="BV号" width="130" />
                <el-table-column align="center" prop="uploaderName" label="UP主" width="100" />
                <el-table-column align="center" prop="favoriteName" label="所属收藏夹" width="120" />
                <el-table-column align="center" prop="userName" label="上传者" width="100" />
                <el-table-column align="center" label="审核状态" width="100">
                    <template #default="scope">
                        <el-tag :type="getReviewStatusType(scope.row.isReview)">
                            {{ getReviewStatusLabel(scope.row.isReview) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column align="center" label="操作" width="260">
                    <template #default="scope">
                        <el-button
                            v-if="scope.row.isReview === 0"
                            type="primary"
                            text
                            @click="openReviewDialog(scope.row, 'review')"
                            class="preview-btn"
                        >
                            <el-icon><CircleCheck /></el-icon>
                            审核
                        </el-button>
                        <el-button
                            v-if="scope.row.isReview === 1 || scope.row.isReview === 2"
                            type="warning"
                            text
                            @click="openReviewDialog(scope.row, 'revoke')"
                            class="preview-btn"
                        >
                            <el-icon><CircleClose /></el-icon>
                            撤销
                        </el-button>
                        <el-button type="primary" text @click="openVideoPreview(scope.row)" class="preview-btn">
                            <el-icon><View /></el-icon>
                            预览
                        </el-button>
                        <el-button type="primary" text @click="handleEditVideo(scope.row)" class="preview-btn">
                            <el-icon><Edit /></el-icon>
                            编辑
                        </el-button>
                        <el-button type="danger" text @click="handleDeleteVideo(scope.row)" class="preview-btn">
                            <el-icon><Delete /></el-icon>
                            删除
                        </el-button>
                    </template>
                </el-table-column>
                <template #empty>
                    暂无数据
                </template>
            </el-table>

            <div class="paging">
                <span>共 {{ allVideoPagination.total }} 条</span>
                <el-pagination
                    background
                    prev-text="上一页"
                    next-text="下一页"
                    layout="prev, pager, next"
                    :total="allVideoPagination.total"
                    :pager-count="5"
                    :current-page="allVideoPagination.page"
                    @current-change="handleAllVideoPageChange"
                />
            </div>
        </div>

        <!-- 视频预览对话框 -->
        <el-dialog v-model="videoPreviewVisible" title="视频预览" width="800px" append-to-body>
            <div v-if="previewVideo" class="video-preview-content">
                <div class="preview-cover">
                    <el-image :src="getFullUrl(previewVideo.cover)" fit="contain"
                        style="width: 100%; max-height: 400px" />
                    <a :href="getBilibiliUrl(previewVideo.bvid)" target="_blank" class="bilibili-link">
                        <el-button type="primary" size="large">
                            <el-icon>
                                <VideoCamera />
                            </el-icon>
                            在B站观看
                        </el-button>
                    </a>
                </div>
                <div class="preview-info">
                    <h4>{{ previewVideo.title }}</h4>
                    <p><strong>BV号：</strong>{{ previewVideo.bvid }}</p>
                    <p><strong>UP主：</strong>{{ previewVideo.uploaderName || '-' }}</p>
                    <p><strong>上传者：</strong>{{ previewVideo.userName || '-' }}</p>
                    <p><strong>所属收藏夹：</strong>{{ previewVideo.favoriteName || '-' }}</p>
                    <p><strong>审核状态：</strong>
                        <el-tag :type="getReviewStatusType(previewVideo.isReview)">
                            {{ getReviewStatusLabel(previewVideo.isReview) }}
                        </el-tag>
                    </p>
                </div>
            </div>
        </el-dialog>

        <!-- 编辑收藏夹对话框 -->
        <el-dialog v-model="editFavoriteDialog" title="编辑收藏夹" width="500px" append-to-body>
            <el-form :model="editFavoriteForm" label-width="80px">
                <el-form-item label="收藏夹名称">
                    <el-input v-model="editFavoriteForm.name" placeholder="请输入收藏夹名称" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="editFavoriteForm.description" type="textarea" :rows="3"
                        placeholder="请输入收藏夹描述（可选）" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="editFavoriteDialog = false">取消</el-button>
                    <el-button type="primary" @click="saveFavoriteEdit">确定</el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 编辑视频对话框 -->
        <el-dialog v-model="editVideoDialog" title="编辑视频" width="500px" append-to-body>
            <el-form :model="editVideoForm" label-width="90px">
                <el-form-item label="视频标题">
                    <el-input v-model="editVideoForm.title" />
                </el-form-item>
                <el-form-item label="UP主">
                    <el-input v-model="editVideoForm.uploaderName" />
                </el-form-item>
                <el-form-item label="所属收藏夹">
                    <el-select v-model="editVideoForm.favoriteId" placeholder="选择收藏夹" clearable style="width: 100%">
                        <el-option v-for="favorite in favoritesList" :key="favorite.id" :label="favorite.name"
                            :value="favorite.id" />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="editVideoDialog = false">取消</el-button>
                    <el-button type="primary" @click="saveVideoEdit">确定</el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 审核对话框 -->
        <el-dialog v-model="reviewVideoDialog" title="审核视频" width="400px" append-to-body
            v-if="reviewAction === 'review' || reviewAction === 'approve' || reviewAction === 'reject'">
            <p v-if="reviewAction === 'approve' || reviewAction === 'review'">请选择对视频 "{{ reviewingVideo?.title }}"
                的审核操作：</p>
            <p v-else>请选择对视频 "{{ reviewingVideo?.title }}" 的审核操作：</p>
            <div style="margin-top: 20px; display: flex; justify-content: center; gap: 20px;">
                <el-button type="success" size="large" @click="confirmReviewWithAction('approve')">
                    <el-icon>
                        <CircleCheck />
                    </el-icon>
                    审核通过
                </el-button>
                <el-button type="danger" size="large" @click="confirmReviewWithAction('reject')">
                    <el-icon>
                        <CircleClose />
                    </el-icon>
                    审核拒绝
                </el-button>
            </div>
        </el-dialog>

        <!-- 撤销审核对话框 -->
        <el-dialog v-model="reviewVideoDialog" title="撤销审核" width="400px" append-to-body
            v-if="reviewAction === 'revoke'">
            <p>确定要撤销视频 "{{ reviewingVideo?.title }}" 的审核状态吗？撤销后将变为待审核状态。</p>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="reviewVideoDialog = false">取消</el-button>
                    <el-button type="warning" @click="confirmReviewWithAction('revoke')">确认撤销</el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.video-favorite-management {
    height: calc(100vh - 170px);
}

.view-tabs {
    margin-bottom: 16px;
    display: flex;
    justify-content: center;
}

.view-tabs .el-radio-group {
    display: flex;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-radius: 8px;
    overflow: hidden;
}

.view-tabs .el-radio-button__inner {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    font-size: 14px;
}

.content-wrapper {
    display: flex;
    gap: 16px;
    height: calc(100% - 60px);
}

.left-section {
    width: 38%;
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    border: 1px solid #f0f0f0;
}

.right-section {
    flex: 1;
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
    border: 1px solid #f0f0f0;
}

.right-section.empty-section {
    align-items: center;
    justify-content: center;
}

.all-videos-view {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    display: flex;
    flex-direction: column;
    height: calc(100% - 60px);
    border: 1px solid #f0f0f0;
}

.section-header {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #f0f0f0;
}

.section-header h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
}

.section-header .el-icon {
    margin-right: 8px;
    font-size: 18px;
    color: #409EFF;
}

.operate {
    margin-bottom: 12px;
    padding: 12px;
    background: #fafafa;
    border-radius: 6px;
}

.search-area {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.el-table {
    flex: 1;
    overflow: auto;
    width: 100%;
    border-radius: 6px;
}

:deep(.el-table__body-wrapper) {
    overflow-x: auto !important;
}

.paging {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

.paging>span {
    font-size: 13px;
    margin-right: 16px;
    color: #606266;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.preview-btn {
    margin: 0;
    padding: 8px;
}

.video-preview-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.preview-cover {
    position: relative;
    text-align: center;
}

.bilibili-link {
    display: inline-block;
    margin-top: 15px;
}

.preview-info {
    padding: 15px;
    background: #f5f7fa;
    border-radius: 4px;
}

.preview-info h4 {
    margin: 0 0 15px 0;
    font-size: 16px;
    color: #303133;
}

.preview-info p {
    margin: 8px 0;
    color: #606266;
}

/* 手机端适配 */
@media screen and (max-width: 768px) {
    .video-favorite-management {
        padding: 10px;
        height: auto;
        min-height: calc(100vh - 80px);
    }

    .content-wrapper {
        flex-direction: column;
        gap: 15px;
        height: auto;
    }

    .left-section {
        width: 100%;
        padding: 15px;
    }

    .right-section {
        padding: 15px;
    }

    .section-header {
        margin-bottom: 10px;
        padding-bottom: 10px;
    }

    .section-header h3 {
        font-size: 14px;
    }

    .search-area {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
    }

    .search-area .el-input,
    .search-area .el-select {
        width: 100% !important;
        margin-right: 0 !important;
    }

    .search-area .el-button {
        width: 100%;
        margin-left: 0;
    }

    .paging {
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }

    .paging>span {
        margin-right: 0;
    }

    /* 表格横向滚动 */
    .el-table {
        width: 100%;
        overflow-x: auto;
    }

    /* 操作按钮适配 */
    .el-table .cell .el-button {
        padding: 4px 8px;
        font-size: 12px;
    }

    /* 对话框适配 */
    :deep(.el-dialog) {
        width: 90% !important;
        margin: 10px auto !important;
    }

    :deep(.el-dialog__body) {
        padding: 15px;
    }

    /* 审核对话框按钮适配 */
    .dialog-footer {
        flex-direction: column;
        gap: 8px;
    }

    .dialog-footer .el-button {
        width: 100%;
        margin-left: 0 !important;
    }

    .preview-cover .el-image {
        max-height: 250px !important;
    }
}

/* 超小屏幕适配 */
@media screen and (max-width: 480px) {
    .preview-info h4 {
        font-size: 14px;
    }

    .preview-info p {
        font-size: 13px;
    }
}
</style>
