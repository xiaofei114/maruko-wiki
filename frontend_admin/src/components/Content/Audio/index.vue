<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAudios, reviewAudio, updateAudio, deleteAudio, updateAudioClassification, deleteAudioClassification } from '@/api/audio.js'
import { Search, Refresh, Edit, Delete, VideoPlay, VideoPause, Headset, CircleCheck, CircleClose } from '@element-plus/icons-vue'

// 当前视图模式：'category' 按分类管理，'all' 全部列表
const viewMode = ref('all')

// 数据列表
const audioList = ref([])
const loading = ref(false)
const audioLoading = ref(false)

// 选中的分类
const selectedCategory = ref(null)

// 编辑对话框
const editCategoryDialog = ref(false)
const editAudioDialog = ref(false)
const editingCategory = ref(null)
const editingAudio = ref(null)

// 审核对话框
const reviewAudioDialog = ref(false)
const reviewingAudio = ref(null)
const reviewAction = ref('') // 'approve' 或 'revoke'

// 编辑表单
const editCategoryForm = ref({
    name: ''
})

const editAudioForm = ref({
    name: '',
    classification_id: '',
    new_classification_name: ''
})

// 分页状态
const categoryPagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

const audioPagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

// 筛选条件
const categoryFilters = ref({
    name: ''
})

const audioFilters = ref({
    name: '',
    status: ''
})

// 搜索条件（点击搜索后才会更新）
const categorySearchParams = ref({
    name: ''
})

const audioSearchParams = ref({
    name: '',
    status: ''
})

// 播放状态
const playingAudioId = ref(null)
const audioPlayers = ref(new Map())

// 计算属性 - 筛选后的分类列表
const filteredCategories = computed(() => {
    let result = audioList.value

    // 名称筛选（使用搜索参数）
    if (categorySearchParams.value.name) {
        result = result.filter(category =>
            category.name.toLowerCase().includes(categorySearchParams.value.name.toLowerCase())
        )
    }

    // 更新总数
    categoryPagination.value.total = result.length

    return result
})

// 分页后的分类列表
const paginatedCategories = computed(() => {
    const start = (categoryPagination.value.page - 1) * categoryPagination.value.pageSize
    const end = start + categoryPagination.value.pageSize
    return filteredCategories.value.slice(start, end)
})

// 筛选后的音声列表
const filteredAudios = computed(() => {
    if (!selectedCategory.value) return []
    let result = selectedCategory.value.audios || []

    // 名称筛选（使用搜索参数）
    if (audioSearchParams.value.name) {
        result = result.filter(audio =>
            audio.name.toLowerCase().includes(audioSearchParams.value.name.toLowerCase())
        )
    }

    // 状态筛选（使用搜索参数）
    if (audioSearchParams.value.status !== '') {
        result = result.filter(audio => audio.is_review === parseInt(audioSearchParams.value.status))
    }

    // 更新总数
    audioPagination.value.total = result.length

    return result
})

// 分页后的音声列表
const paginatedAudios = computed(() => {
    const start = (audioPagination.value.page - 1) * audioPagination.value.pageSize
    const end = start + audioPagination.value.pageSize
    return filteredAudios.value.slice(start, end)
})

// ==================== 全部列表视图 ====================

// 全部音声列表（平铺所有分类下的音声）
const allAudiosList = computed(() => {
    const allAudios = []
    audioList.value.forEach(category => {
        if (category.audios && category.audios.length > 0) {
            category.audios.forEach(audio => {
                allAudios.push({
                    ...audio,
                    categoryName: category.name,
                    categoryId: category.id
                })
            })
        }
    })
    return allAudios
})

// 全部列表筛选条件
const allAudioFilters = ref({
    name: '',
    status: ''
})

// 全部列表搜索参数
const allAudioSearchParams = ref({
    name: '',
    status: ''
})

// 全部列表分页
const allAudioPagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

// 筛选后的全部音声列表
const filteredAllAudios = computed(() => {
    let result = allAudiosList.value

    // 名称筛选
    if (allAudioSearchParams.value.name) {
        result = result.filter(audio =>
            audio.name.toLowerCase().includes(allAudioSearchParams.value.name.toLowerCase())
        )
    }

    // 状态筛选
    if (allAudioSearchParams.value.status !== '') {
        result = result.filter(audio => audio.is_review === parseInt(allAudioSearchParams.value.status))
    }

    // 更新总数
    allAudioPagination.value.total = result.length

    return result
})

// 分页后的全部音声列表
const paginatedAllAudios = computed(() => {
    const start = (allAudioPagination.value.page - 1) * allAudioPagination.value.pageSize
    const end = start + allAudioPagination.value.pageSize
    return filteredAllAudios.value.slice(start, end)
})

// 全部列表搜索
const handleAllAudioSearch = () => {
    allAudioSearchParams.value.name = allAudioFilters.value.name
    allAudioSearchParams.value.status = allAudioFilters.value.status
    allAudioPagination.value.page = 1
}

// 重置全部列表筛选
const resetAllAudioFilters = () => {
    allAudioFilters.value.name = ''
    allAudioFilters.value.status = ''
    allAudioSearchParams.value.name = ''
    allAudioSearchParams.value.status = ''
    allAudioPagination.value.page = 1
}

// 获取音声列表
const fetchAudios = async () => {
    loading.value = true
    try {
        const response = await getAudios()
        if (response.code === 200) {
            audioList.value = response.data
            categoryPagination.value.total = response.data.length
        } else {
            ElMessage.error(response.message || '获取音声列表失败')
        }
    } catch (error) {
        console.error('获取音声列表失败:', error)
        ElMessage.error('获取音声列表失败')
    } finally {
        loading.value = false
    }
}

// 分类搜索
const handleCategorySearch = () => {
    categorySearchParams.value.name = categoryFilters.value.name
    categoryPagination.value.page = 1
}

// 音声搜索
const handleAudioSearch = () => {
    audioSearchParams.value.name = audioFilters.value.name
    audioSearchParams.value.status = audioFilters.value.status
    audioPagination.value.page = 1
}

// 重置分类筛选
const resetCategoryFilters = () => {
    categoryFilters.value.name = ''
    categorySearchParams.value.name = ''
    categoryPagination.value.page = 1
}

// 重置音声筛选
const resetAudioFilters = () => {
    audioFilters.value.name = ''
    audioFilters.value.status = ''
    audioSearchParams.value.name = ''
    audioSearchParams.value.status = ''
    audioPagination.value.page = 1
}

// 选择分类
const selectCategory = (category) => {
    // 停止当前播放的音频
    if (playingAudioId.value) {
        const currentPlayer = audioPlayers.value.get(playingAudioId.value)
        if (currentPlayer) {
            currentPlayer.pause()
            currentPlayer.currentTime = 0
        }
        playingAudioId.value = null
    }

    selectedCategory.value = category
    audioPagination.value.page = 1
    audioPagination.value.total = category.audios ? category.audios.length : 0
    // 重置音声筛选
    audioFilters.value.name = ''
    audioFilters.value.status = ''
}

// 编辑分类
const handleEditCategory = (category) => {
    editingCategory.value = category
    editCategoryForm.value = {
        name: category.name
    }
    editCategoryDialog.value = true
}

// 保存分类编辑
const saveCategoryEdit = async () => {
    try {
        if (!editCategoryForm.value.name.trim()) {
            ElMessage.warning('分类名称不能为空')
            return
        }

        const response = await updateAudioClassification(editingCategory.value.id, {
            name: editCategoryForm.value.name.trim()
        })

        if (response.code === 200) {
            editingCategory.value.name = editCategoryForm.value.name.trim()
            ElMessage.success('分类更新成功')
            editCategoryDialog.value = false
        } else {
            ElMessage.error(response.message || '更新失败')
        }
    } catch (error) {
        console.error('更新分类失败:', error)
        ElMessage.error('更新失败')
    }
}

// 删除分类
const handleDeleteCategory = async (category) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除分类"${category.name}"吗？此操作不可恢复。`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'danger'
            }
        )

        const response = await deleteAudioClassification(category.id)
        if (response.code === 200) {
            const index = audioList.value.findIndex(c => c.id === category.id)
            if (index > -1) {
                audioList.value.splice(index, 1)
                if (selectedCategory.value && selectedCategory.value.id === category.id) {
                    selectedCategory.value = null
                }
            }
            ElMessage.success('分类删除成功')
        } else {
            ElMessage.error(response.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除分类失败:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 播放音声
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

    // 获取完整URL
    const getFullUrl = (url) => {
        if (!url) return ''
        if (url.startsWith('http')) return url
        const baseUrl = import.meta.env.VITE_APP_API_BASE || 'http://localhost:6660'
        return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
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

// 打开审核弹窗
const openReviewDialog = (audio, action) => {
    reviewingAudio.value = audio
    reviewAction.value = action
    reviewAudioDialog.value = true
}

// 确认审核操作
const confirmReview = async () => {
    if (!reviewingAudio.value) return

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
        const response = await reviewAudio(reviewingAudio.value.id, status)
        if (response.code === 200) {
            reviewingAudio.value.is_review = status
            ElMessage.success(`${actionText}成功`)
            reviewAudioDialog.value = false
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

// 编辑音声
const handleEditAudio = (audio) => {
    editingAudio.value = audio
    editAudioForm.value = {
        name: audio.name,
        classification_id: audio.classification_id || '',
        new_classification_name: ''
    }
    editAudioDialog.value = true
}

// 保存音声编辑
const saveAudioEdit = async () => {
    try {
        if (!editAudioForm.value.name.trim()) {
            ElMessage.warning('音声名称不能为空')
            return
        }

        const updateData = {}

        // 音声名称
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
            ElMessage.warning('请至少填写音声名称或选择/创建分类')
            return
        }

        const response = await updateAudio(editingAudio.value.id, updateData)

        if (response.code === 200) {
            editingAudio.value.name = editAudioForm.value.name.trim()
            ElMessage.success('音声更新成功')
            editAudioDialog.value = false

            // 重新获取数据
            await fetchAudios()

            // 重新设置当前选中的分类，确保数据是最新的
            if (selectedCategory.value) {
                const updatedCategory = audioList.value.find(c => c.id === selectedCategory.value.id)
                if (updatedCategory) {
                    selectedCategory.value = updatedCategory
                    audioPagination.value.total = updatedCategory.audios ? updatedCategory.audios.length : 0
                } else {
                    // 如果分类不存在了（比如被删除了），清空选择
                    selectedCategory.value = null
                }
            }
        } else {
            ElMessage.error(response.message || '更新失败')
        }
    } catch (error) {
        console.error('更新音声失败:', error)
        ElMessage.error('更新失败')
    }
}

// 删除音声
const handleDeleteAudio = async (audio) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除音声"${audio.name}"吗？此操作不可恢复。`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'danger'
            }
        )

        // 如果正在播放该音频，先停止
        if (playingAudioId.value === audio.id) {
            const player = audioPlayers.value.get(audio.id)
            if (player) {
                player.pause()
                player.currentTime = 0
            }
            playingAudioId.value = null
        }

        const response = await deleteAudio(audio.id)
        if (response.code === 200) {
            if (selectedCategory.value) {
                const index = selectedCategory.value.audios.findIndex(a => a.id === audio.id)
                if (index > -1) {
                    selectedCategory.value.audios.splice(index, 1)
                    audioPagination.value.total = filteredAudios.value.length
                }
            }
            ElMessage.success('音声删除成功')
        } else {
            ElMessage.error(response.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除音声失败:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 分页变化处理
const handleCategoryPageChange = (page) => {
    categoryPagination.value.page = page
}

const handleAudioPageChange = (page) => {
    audioPagination.value.page = page
}

// 全部列表分页处理
const handleAllAudioPageChange = (page) => {
    allAudioPagination.value.page = page
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

onMounted(() => {
    fetchAudios()
})
</script>

<template>
    <div class="audio-management">
        <!-- 视图切换 Tabs -->
        <div class="view-tabs">
            <el-radio-group v-model="viewMode" size="large">
                <el-radio-button label="all">
                    <el-icon><Search /></el-icon>
                    全部列表
                </el-radio-button>
                <el-radio-button label="category">
                    <el-icon><Headset /></el-icon>
                    按分类管理
                </el-radio-button>
            </el-radio-group>
        </div>

        <!-- 按分类管理视图 -->
        <div v-if="viewMode === 'category'" class="content-wrapper">
            <!-- 左侧分类列表 -->
            <div class="left-section">
                <div class="section-header">
                    <h3>音声分类</h3>
                </div>

                <div class="operate">
                    <div class="search-area">
                        <el-input
                            v-model="categoryFilters.name"
                            placeholder="请输入分类名称"
                            clearable
                            :trigger-on-focus="false"
                            style="width: 180px; margin-right: 10px"
                        />
                        <el-button type="primary" @click="handleCategorySearch">
                            <el-icon><Search /></el-icon>
                            搜索
                        </el-button>
                        <el-button @click="resetCategoryFilters">
                            <el-icon><Refresh /></el-icon>
                            重置
                        </el-button>
                    </div>
                </div>

                <el-table
                    :data="paginatedCategories"
                    style="width: 100%"
                    v-loading="loading"
                    highlight-current-row
                    @row-click="selectCategory"
                    :header-cell-style="{ 'text-align': 'center', 'color': '#000' }"
                >
                    <el-table-column align="center" type="index" :index="(categoryPagination.page - 1) * categoryPagination.pageSize + 1" label="序号" width="60" />
                    <el-table-column align="center" prop="name" label="分类名称" min-width="120" show-overflow-tooltip />
                    <el-table-column align="center" prop="user_name" label="创建者" width="100" />
                    <el-table-column align="center" label="音声数" width="80">
                        <template #default="scope">
                            {{ scope.row.audios ? scope.row.audios.length : 0 }}
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="操作" min-width="120">
                        <template #default="scope">
                            <el-button type="primary" text @click.stop="handleEditCategory(scope.row)"  class="preview-btn">
                                <el-icon><Edit /></el-icon>
                                编辑
                            </el-button>
                            <el-button type="danger" text @click.stop="handleDeleteCategory(scope.row)"  class="preview-btn">
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
                    <span>共 {{ categoryPagination.total }} 条</span>
                    <el-pagination
                        background
                        prev-text="上一页"
                        next-text="下一页"
                        layout="prev, pager, next"
                        :total="categoryPagination.total"
                        :pager-count="5"
                        :current-page="categoryPagination.page"
                        @current-change="handleCategoryPageChange"
                    />
                </div>
            </div>

            <!-- 右侧音声列表 -->
            <div class="right-section" v-if="selectedCategory">
                <div class="section-header">
                    <el-icon><Headset /></el-icon>
                    <h3>{{ selectedCategory.name }} - 音声列表</h3>
                </div>

                <div class="operate">
                    <div class="search-area">
                        <el-input
                            v-model="audioFilters.name"
                            placeholder="请输入音声名称"
                            clearable
                            :trigger-on-focus="false"
                            style="width: 160px; margin-right: 10px"
                        />
                        <el-select v-model="audioFilters.status" placeholder="审核状态" clearable style="width: 110px; margin-right: 10px">
                            <el-option label="待审核" :value="0" />
                            <el-option label="已通过" :value="1" />
                            <el-option label="不通过" :value="2" />
                        </el-select>
                        <el-button type="primary" @click="handleAudioSearch">
                            <el-icon><Search /></el-icon>
                            搜索
                        </el-button>
                        <el-button @click="resetAudioFilters">
                            <el-icon><Refresh /></el-icon>
                            重置
                        </el-button>
                    </div>
                </div>

                <el-table
                    :data="paginatedAudios"
                    style="width: 100%"
                    v-loading="audioLoading"
                    :header-cell-style="{ 'text-align': 'center', 'color': '#000' }"
                >
                    <el-table-column align="center" type="index" :index="(audioPagination.page - 1) * audioPagination.pageSize + 1" label="序号" width="60" />
                    <el-table-column align="center" prop="name" label="音声名称" min-width="150" show-overflow-tooltip />
                    <el-table-column align="center" prop="user_name" label="上传者" width="100" />
                    <el-table-column align="center" label="审核状态" width="90">
                        <template #default="scope">
                            <el-tag :type="getReviewStatusType(scope.row.is_review)">
                                {{ getReviewStatusLabel(scope.row.is_review) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="播放">
                        <template #default="scope">
                            <el-button
                                type="primary"
                                text
                                circle
                                @click="toggleAudioPlay(scope.row)"
                            >
                                <el-icon v-if="playingAudioId === scope.row.id"><VideoPause /></el-icon>
                                <el-icon v-else><VideoPlay /></el-icon>
                            </el-button>
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="操作" width="200">
                        <template #default="scope">
                            <el-button
                                v-if="scope.row.is_review === 0"
                                type="primary"
                                text
                                @click="openReviewDialog(scope.row, 'review')"  class="preview-btn"
                            >
                                <el-icon><CircleCheck /></el-icon>
                                审核
                            </el-button>
                            <el-button
                                v-if="scope.row.is_review === 1 || scope.row.is_review === 2"
                                type="warning"
                                text
                                @click="openReviewDialog(scope.row, 'revoke')"  class="preview-btn"
                            >
                                <el-icon><CircleClose /></el-icon>
                                撤销
                            </el-button>
                            <el-button type="primary" text @click="handleEditAudio(scope.row)"  class="preview-btn">
                                <el-icon><Edit /></el-icon>
                                编辑
                            </el-button>
                            <el-button type="danger" text @click="handleDeleteAudio(scope.row)"  class="preview-btn">
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
                    <span>共 {{ audioPagination.total }} 条</span>
                    <el-pagination
                        background
                        prev-text="上一页"
                        next-text="下一页"
                        layout="prev, pager, next"
                        :total="audioPagination.total"
                        :pager-count="5"
                        :current-page="audioPagination.page"
                        @current-change="handleAudioPageChange"
                    />
                </div>
            </div>

            <!-- 未选择分类提示 -->
            <div class="right-section empty-section" v-else>
                <el-empty description="请选择左侧分类查看音声列表" />
            </div>
        </div>

        <!-- 全部列表视图 -->
        <div v-else class="all-audio-view">
            <div class="section-header">
                <el-icon><Headset /></el-icon>
                <h3>全部音声列表</h3>
            </div>

            <div class="operate">
                <div class="search-area">
                    <el-input
                        v-model="allAudioFilters.name"
                        placeholder="请输入音声名称"
                        clearable
                        :trigger-on-focus="false"
                        style="width: 200px; margin-right: 10px"
                    />
                    <el-select v-model="allAudioFilters.status" placeholder="审核状态" clearable style="width: 120px; margin-right: 10px">
                        <el-option label="待审核" :value="0" />
                        <el-option label="已通过" :value="1" />
                        <el-option label="不通过" :value="2" />
                    </el-select>
                    <el-button type="primary" @click="handleAllAudioSearch">
                        <el-icon><Search /></el-icon>
                        搜索
                    </el-button>
                    <el-button @click="resetAllAudioFilters">
                        <el-icon><Refresh /></el-icon>
                        重置
                    </el-button>
                </div>
            </div>

            <el-table
                :data="paginatedAllAudios"
                style="width: 100%"
                v-loading="loading"
                :header-cell-style="{ 'text-align': 'center', 'color': '#000' }"
            >
                <el-table-column align="center" type="index" :index="(allAudioPagination.page - 1) * allAudioPagination.pageSize + 1" label="序号" width="60" />
                <el-table-column align="center" prop="name" label="音声名称" min-width="180" show-overflow-tooltip />
                <el-table-column align="center" prop="categoryName" label="所属分类" width="120" />
                <el-table-column align="center" prop="user_name" label="上传者" width="100" />
                <el-table-column align="center" label="审核状态" width="100">
                    <template #default="scope">
                        <el-tag :type="getReviewStatusType(scope.row.is_review)">
                            {{ getReviewStatusLabel(scope.row.is_review) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column align="center" label="播放" width="80">
                    <template #default="scope">
                        <el-button
                            type="primary"
                            text
                            circle
                            @click="toggleAudioPlay(scope.row)"
                        >
                            <el-icon v-if="playingAudioId === scope.row.id"><VideoPause /></el-icon>
                            <el-icon v-else><VideoPlay /></el-icon>
                        </el-button>
                    </template>
                </el-table-column>
                <el-table-column align="center" label="操作" width="220">
                    <template #default="scope">
                        <el-button
                            v-if="scope.row.is_review === 0"
                            type="primary"
                            text
                            @click="openReviewDialog(scope.row, 'review')" class="preview-btn"
                        >
                            <el-icon><CircleCheck /></el-icon>
                            审核
                        </el-button>
                        <el-button
                            v-if="scope.row.is_review === 1 || scope.row.is_review === 2"
                            type="warning"
                            text
                            @click="openReviewDialog(scope.row, 'revoke')" class="preview-btn"
                        >
                            <el-icon><CircleClose /></el-icon>
                            撤销
                        </el-button>
                        <el-button type="primary" text @click="handleEditAudio(scope.row)" class="preview-btn">
                            <el-icon><Edit /></el-icon>
                            编辑
                        </el-button>
                        <el-button type="danger" text @click="handleDeleteAudio(scope.row)" class="preview-btn">
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
                <span>共 {{ allAudioPagination.total }} 条</span>
                <el-pagination
                    background
                    prev-text="上一页"
                    next-text="下一页"
                    layout="prev, pager, next"
                    :total="allAudioPagination.total"
                    :pager-count="5"
                    :current-page="allAudioPagination.page"
                    @current-change="handleAllAudioPageChange"
                />
            </div>
        </div>

        <!-- 编辑分类对话框 -->
        <el-dialog v-model="editCategoryDialog" title="编辑分类" width="400px" append-to-body>
            <el-form :model="editCategoryForm" label-width="80px">
                <el-form-item label="分类名称">
                    <el-input v-model="editCategoryForm.name" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="editCategoryDialog = false">取消</el-button>
                    <el-button type="primary" @click="saveCategoryEdit">确定</el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 编辑音声对话框 -->
        <el-dialog v-model="editAudioDialog" title="编辑音声" width="500px" append-to-body>
            <el-form :model="editAudioForm" label-width="80px">
                <el-form-item label="音声名称">
                    <el-input v-model="editAudioForm.name" />
                </el-form-item>
                <el-form-item label="所属分类">
                    <el-select v-model="editAudioForm.classification_id" placeholder="选择分类" clearable style="width: 100%">
                        <el-option
                            v-for="category in audioList"
                            :key="category.id"
                            :label="category.name"
                            :value="category.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="新建分类">
                    <el-input v-model="editAudioForm.new_classification_name" placeholder="输入新分类名称（优先使用）" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="editAudioDialog = false">取消</el-button>
                    <el-button type="primary" @click="saveAudioEdit">确定</el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 审核对话框 -->
        <el-dialog v-model="reviewAudioDialog" title="审核音声" width="400px" append-to-body v-if="reviewAction === 'review'">
            <p>请选择对音声 "{{ reviewingAudio?.name }}" 的审核操作：</p>
            <div style="margin-top: 20px; display: flex; justify-content: center; gap: 20px;">
                <el-button type="success" size="large" @click="confirmReviewWithAction('approve')">
                    <el-icon><CircleCheck /></el-icon>
                    审核通过
                </el-button>
                <el-button type="danger" size="large" @click="confirmReviewWithAction('reject')">
                    <el-icon><CircleClose /></el-icon>
                    审核拒绝
                </el-button>
            </div>
        </el-dialog>

        <!-- 撤销审核对话框 -->
        <el-dialog v-model="reviewAudioDialog" title="撤销审核" width="400px" append-to-body v-else>
            <p>确定要撤销音声 "{{ reviewingAudio?.name }}" 的审核状态吗？撤销后将变为待审核状态。</p>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="reviewAudioDialog = false">取消</el-button>
                    <el-button type="warning" @click="confirmReviewWithAction('revoke')">确认撤销</el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.audio-management {
    padding: 20px;
    height: calc(100vh - 100px);
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
    width: 42%;
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
    border: 1px solid #f0f0f0;
}

.right-section.empty-section {
    align-items: center;
    justify-content: center;
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
    border-radius: 6px;
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

/* 全部列表视图样式 */
.all-audio-view {
    background: #fff;
    border-radius: 4px;
    padding: 20px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    height: calc(100% - 60px);
}

/* 手机端适配 */
@media screen and (max-width: 768px) {
    .audio-management {
        padding: 10px;
        height: auto;
        min-height: calc(100vh - 80px);
    }

    .view-tabs {
        margin-bottom: 15px;
    }

    .view-tabs .el-radio-button__inner {
        padding: 8px 12px;
        font-size: 13px;
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

    .all-audio-view {
        padding: 15px;
        height: auto;
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
}

/* 超小屏幕适配 */
@media screen and (max-width: 480px) {
    .left-section,
    .right-section {
        padding: 10px;
    }

    .section-header h3 {
        font-size: 13px;
    }

    .section-header .el-icon {
        font-size: 16px;
    }
}
</style>
