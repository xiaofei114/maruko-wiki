<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAlbums, reviewAlbum, updateAlbum, deleteAlbum, reviewPhoto, updatePhoto, deletePhoto } from '@/api/album.js'
import { Search, Refresh, Edit, Delete, View, CircleCheck, CircleClose, Picture } from '@element-plus/icons-vue'

// 数据列表
const albumList = ref([])
const loading = ref(false)
const photoLoading = ref(false)

// 选中的相册
const selectedAlbum = ref(null)

// 编辑对话框
const editAlbumDialog = ref(false)
const editPhotoDialog = ref(false)
const editingAlbum = ref(null)
const editingPhoto = ref(null)

// 审核对话框
const reviewPhotoDialog = ref(false)
const reviewingPhoto = ref(null)
const reviewAction = ref('') // 'approve' 或 'revoke'

// 编辑表单
const editAlbumForm = ref({
    name: '',
    introduction: ''
})

const editPhotoForm = ref({
    name: '',
    album_id: '',
    new_album_name: '',
    new_album_introduction: ''
})

// 分页状态
const albumPagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

const photoPagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

// 筛选条件
const albumFilters = ref({
    name: ''
})

const photoFilters = ref({
    name: '',
    status: ''
})

// 搜索条件（点击搜索后才会更新）
const albumSearchParams = ref({
    name: ''
})

const photoSearchParams = ref({
    name: '',
    status: ''
})

// 照片预览
const photoPreviewVisible = ref(false)
const previewPhotoUrl = ref('')

// 计算属性 - 筛选后的相册列表
const filteredAlbums = computed(() => {
    let result = albumList.value

    // 名称筛选（使用搜索参数）
    if (albumSearchParams.value.name) {
        result = result.filter(album =>
            album.name.toLowerCase().includes(albumSearchParams.value.name.toLowerCase())
        )
    }

    // 更新总数
    albumPagination.value.total = result.length

    return result
})

// 分页后的相册列表
const paginatedAlbums = computed(() => {
    const start = (albumPagination.value.page - 1) * albumPagination.value.pageSize
    const end = start + albumPagination.value.pageSize
    return filteredAlbums.value.slice(start, end)
})

// 筛选后的照片列表
const filteredPhotos = computed(() => {
    if (!selectedAlbum.value) return []
    let result = selectedAlbum.value.photos || []

    // 名称筛选（使用搜索参数）
    if (photoSearchParams.value.name) {
        result = result.filter(photo =>
            photo.name.toLowerCase().includes(photoSearchParams.value.name.toLowerCase())
        )
    }

    // 状态筛选（使用搜索参数）
    if (photoSearchParams.value.status !== '') {
        result = result.filter(photo => photo.is_review === parseInt(photoSearchParams.value.status))
    }

    // 更新总数
    photoPagination.value.total = result.length

    return result
})

// 分页后的照片列表
const paginatedPhotos = computed(() => {
    const start = (photoPagination.value.page - 1) * photoPagination.value.pageSize
    const end = start + photoPagination.value.pageSize
    return filteredPhotos.value.slice(start, end)
})

// 获取相册列表
const fetchAlbums = async () => {
    loading.value = true
    try {
        const response = await getAlbums()
        if (response.code === 200) {
            albumList.value = response.data
            albumPagination.value.total = response.data.length
        } else {
            ElMessage.error(response.message || '获取相册列表失败')
        }
    } catch (error) {
        console.error('获取相册列表失败:', error)
        ElMessage.error('获取相册列表失败')
    } finally {
        loading.value = false
    }
}

// 相册搜索
const handleAlbumSearch = () => {
    albumSearchParams.value.name = albumFilters.value.name
    albumPagination.value.page = 1
}

// 照片搜索
const handlePhotoSearch = () => {
    photoSearchParams.value.name = photoFilters.value.name
    photoSearchParams.value.status = photoFilters.value.status
    photoPagination.value.page = 1
}

// 重置相册筛选
const resetAlbumFilters = () => {
    albumFilters.value.name = ''
    albumSearchParams.value.name = ''
    albumPagination.value.page = 1
}

// 重置照片筛选
const resetPhotoFilters = () => {
    photoFilters.value.name = ''
    photoFilters.value.status = ''
    photoSearchParams.value.name = ''
    photoSearchParams.value.status = ''
    photoPagination.value.page = 1
}

// 选择相册
const selectAlbum = (album) => {
    selectedAlbum.value = album
    photoPagination.value.page = 1
    photoPagination.value.total = album.photos ? album.photos.length : 0
    // 重置照片筛选
    photoFilters.value.name = ''
    photoFilters.value.status = ''
}

// 编辑相册
const handleEditAlbum = (album) => {
    editingAlbum.value = album
    editAlbumForm.value = {
        name: album.name,
        introduction: album.introduction || ''
    }
    editAlbumDialog.value = true
}

// 保存相册编辑
const saveAlbumEdit = async () => {
    try {
        if (!editAlbumForm.value.name.trim()) {
            ElMessage.warning('相册名称不能为空')
            return
        }

        const response = await updateAlbum(editingAlbum.value.id, {
            name: editAlbumForm.value.name.trim(),
            introduction: editAlbumForm.value.introduction.trim()
        })

        if (response.code === 200) {
            editingAlbum.value.name = editAlbumForm.value.name.trim()
            editingAlbum.value.introduction = editAlbumForm.value.introduction.trim()
            ElMessage.success('相册更新成功')
            editAlbumDialog.value = false
        } else {
            ElMessage.error(response.message || '更新失败')
        }
    } catch (error) {
        console.error('更新相册失败:', error)
        ElMessage.error('更新失败')
    }
}

// 删除相册
const handleDeleteAlbum = async (album) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除相册"${album.name}"吗？此操作不可恢复。`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'danger'
            }
        )

        const response = await deleteAlbum(album.id)
        if (response.code === 200) {
            const index = albumList.value.findIndex(a => a.id === album.id)
            if (index > -1) {
                albumList.value.splice(index, 1)
                if (selectedAlbum.value && selectedAlbum.value.id === album.id) {
                    selectedAlbum.value = null
                }
            }
            ElMessage.success('相册删除成功')
        } else {
            ElMessage.error(response.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除相册失败:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 获取完整URL
const getFullUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    const baseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:6660'
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

// 预览照片
const handlePreviewPhoto = (photo) => {
    previewPhotoUrl.value = getFullUrl(photo.url)
    photoPreviewVisible.value = true
}

// 打开审核弹窗
const openReviewDialog = (photo, action) => {
    reviewingPhoto.value = photo
    reviewAction.value = action
    reviewPhotoDialog.value = true
}

// 确认审核操作
const confirmReview = async () => {
    if (!reviewingPhoto.value) return

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
        const response = await reviewPhoto(reviewingPhoto.value.id, status)
        if (response.code === 200) {
            reviewingPhoto.value.is_review = status
            ElMessage.success(`${actionText}成功`)
            reviewPhotoDialog.value = false
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

// 编辑照片
const handleEditPhoto = (photo) => {
    editingPhoto.value = photo
    editPhotoForm.value = {
        name: photo.name,
        album_id: photo.album_id || '',
        new_album_name: '',
        new_album_introduction: ''
    }
    editPhotoDialog.value = true
}

// 保存照片编辑
const savePhotoEdit = async () => {
    try {
        if (!editPhotoForm.value.name.trim()) {
            ElMessage.warning('照片名称不能为空')
            return
        }

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

        const response = await updatePhoto(editingPhoto.value.id, updateData)

        if (response.code === 200) {
            editingPhoto.value.name = editPhotoForm.value.name.trim()
            ElMessage.success('照片更新成功')
            editPhotoDialog.value = false

            // 重新获取数据
            await fetchAlbums()

            // 重新设置当前选中的相册，确保数据是最新的
            if (selectedAlbum.value) {
                const updatedAlbum = albumList.value.find(a => a.id === selectedAlbum.value.id)
                if (updatedAlbum) {
                    selectedAlbum.value = updatedAlbum
                    photoPagination.value.total = updatedAlbum.photos ? updatedAlbum.photos.length : 0
                } else {
                    // 如果相册不存在了（比如被删除了），清空选择
                    selectedAlbum.value = null
                }
            }
        } else {
            ElMessage.error(response.message || '更新失败')
        }
    } catch (error) {
        console.error('更新照片失败:', error)
        ElMessage.error('更新失败')
    }
}

// 删除照片
const handleDeletePhoto = async (photo) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除照片"${photo.name}"吗？此操作不可恢复。`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'danger'
            }
        )

        const response = await deletePhoto(photo.id)
        if (response.code === 200) {
            if (selectedAlbum.value) {
                const index = selectedAlbum.value.photos.findIndex(p => p.id === photo.id)
                if (index > -1) {
                    selectedAlbum.value.photos.splice(index, 1)
                    photoPagination.value.total = filteredPhotos.value.length
                }
            }
            ElMessage.success('照片删除成功')
        } else {
            ElMessage.error(response.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除照片失败:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 分页变化处理
const handleAlbumPageChange = (page) => {
    albumPagination.value.page = page
}

const handlePhotoPageChange = (page) => {
    photoPagination.value.page = page
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
    fetchAlbums()
})
</script>

<template>
    <div class="album-management">
        <div class="content-wrapper">
            <!-- 左侧相册列表 -->
            <div class="left-section">
                <div class="section-header">
                    <h3>相册列表</h3>
                </div>

                <div class="operate">
                    <div class="search-area">
                        <el-input
                            v-model="albumFilters.name"
                            placeholder="请输入相册名称"
                            clearable
                            :trigger-on-focus="false"
                            style="width: 180px; margin-right: 10px"
                        />
                        <el-button type="primary" @click="handleAlbumSearch">
                            <el-icon><Search /></el-icon>
                            搜索
                        </el-button>
                        <el-button @click="resetAlbumFilters">
                            <el-icon><Refresh /></el-icon>
                            重置
                        </el-button>
                    </div>
                </div>

                <el-table
                    :data="paginatedAlbums"
                    style="width: 100%"
                    v-loading="loading"
                    highlight-current-row
                    @row-click="selectAlbum"
                    :header-cell-style="{ 'text-align': 'center', 'color': '#000' }"
                >
                    <el-table-column align="center" type="index" :index="(albumPagination.page - 1) * albumPagination.pageSize + 1" label="序号" width="60" />
                    <el-table-column align="center" prop="name" label="相册名称" min-width="120" show-overflow-tooltip />
                    <el-table-column align="center" prop="user_name" label="创建者" width="100" />
                    <el-table-column align="center" label="照片数" width="80">
                        <template #default="scope">
                            {{ scope.row.photos ? scope.row.photos.length : 0 }}
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="操作" width="180">
                        <template #default="scope">
                            <el-button type="primary" text @click.stop="handleEditAlbum(scope.row)"  class="preview-btn">
                                <el-icon><Edit /></el-icon>
                                编辑
                            </el-button>
                            <el-button type="danger" text @click.stop="handleDeleteAlbum(scope.row)"  class="preview-btn">
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
                    <span>共 {{ albumPagination.total }} 条</span>
                    <el-pagination
                        background
                        prev-text="上一页"
                        next-text="下一页"
                        layout="prev, pager, next"
                        :total="albumPagination.total"
                        :pager-count="5"
                        :current-page="albumPagination.page"
                        @current-change="handleAlbumPageChange"
                    />
                </div>
            </div>

            <!-- 右侧照片列表 -->
            <div class="right-section" v-if="selectedAlbum">
                <div class="section-header">
                    <el-icon><Picture /></el-icon>
                    <h3>{{ selectedAlbum.name }} - 照片列表</h3>
                </div>

                <div class="operate">
                    <div class="search-area">
                        <el-input
                            v-model="photoFilters.name"
                            placeholder="请输入照片名称"
                            clearable
                            :trigger-on-focus="false"
                            style="width: 160px; margin-right: 10px"
                        />
                        <el-select v-model="photoFilters.status" placeholder="审核状态" clearable style="width: 110px; margin-right: 10px">
                            <el-option label="待审核" :value="0" />
                            <el-option label="已通过" :value="1" />
                            <el-option label="不通过" :value="2" />
                        </el-select>
                        <el-button type="primary" @click="handlePhotoSearch">
                            <el-icon><Search /></el-icon>
                            搜索
                        </el-button>
                        <el-button @click="resetPhotoFilters">
                            <el-icon><Refresh /></el-icon>
                            重置
                        </el-button>
                    </div>
                </div>

                <el-table
                    :data="paginatedPhotos"
                    style="width: 100%"
                    v-loading="photoLoading"
                    :header-cell-style="{ 'text-align': 'center', 'color': '#000' }"
                >
                    <el-table-column align="center" type="index" :index="(photoPagination.page - 1) * photoPagination.pageSize + 1" label="序号" width="60" />
                    <el-table-column align="center" prop="name" label="照片名称" min-width="120" show-overflow-tooltip />
                    <el-table-column align="center" prop="user_name" label="上传者" width="100" />
                    <el-table-column align="center" label="审核状态" width="90">
                        <template #default="scope">
                            <el-tag :type="getReviewStatusType(scope.row.is_review)">
                                {{ getReviewStatusLabel(scope.row.is_review) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column align="center" label="操作" min-width="200">
                        <template #default="scope">
                            <el-button class="preview-btn" type="primary" text @click="handlePreviewPhoto(scope.row)">
                                <el-icon><View /></el-icon>
                                查看
                            </el-button>
                            <el-button
                             class="preview-btn"
                                v-if="scope.row.is_review === 0"
                                type="primary"
                                text
                                @click="openReviewDialog(scope.row, 'review')"
                            >
                                <el-icon><CircleCheck /></el-icon>
                                审核
                            </el-button>
                            <el-button
                             class="preview-btn"
                                v-if="scope.row.is_review === 1 || scope.row.is_review === 2"
                                type="warning"
                                text
                                @click="openReviewDialog(scope.row, 'revoke')"
                            >
                                <el-icon><CircleClose /></el-icon>
                                撤销
                            </el-button>
                            <el-button type="primary" text @click="handleEditPhoto(scope.row)"  class="preview-btn">
                                <el-icon><Edit /></el-icon>
                                编辑
                            </el-button>
                            <el-button type="danger" text @click="handleDeletePhoto(scope.row)"  class="preview-btn">
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
                    <span>共 {{ photoPagination.total }} 条</span>
                    <el-pagination
                        background
                        prev-text="上一页"
                        next-text="下一页"
                        layout="prev, pager, next"
                        :total="photoPagination.total"
                        :pager-count="5"
                        :current-page="photoPagination.page"
                        @current-change="handlePhotoPageChange"
                    />
                </div>
            </div>

            <!-- 未选择相册提示 -->
            <div class="right-section empty-section" v-else>
                <el-empty description="请选择左侧相册查看照片列表" />
            </div>
        </div>

        <!-- 编辑相册对话框 -->
        <el-dialog v-model="editAlbumDialog" title="编辑相册" width="500px" append-to-body>
            <el-form :model="editAlbumForm" label-width="80px">
                <el-form-item label="相册名称">
                    <el-input v-model="editAlbumForm.name" />
                </el-form-item>
                <el-form-item label="相册简介">
                    <el-input v-model="editAlbumForm.introduction" type="textarea" :rows="3" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="editAlbumDialog = false">取消</el-button>
                    <el-button type="primary" @click="saveAlbumEdit">确定</el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 编辑照片对话框 -->
        <el-dialog v-model="editPhotoDialog" title="编辑照片" width="500px" append-to-body>
            <el-form :model="editPhotoForm" label-width="80px">
                <el-form-item label="照片名称">
                    <el-input v-model="editPhotoForm.name" />
                </el-form-item>
                <el-form-item label="所属相册">
                    <el-select v-model="editPhotoForm.album_id" placeholder="选择相册" clearable style="width: 100%">
                        <el-option
                            v-for="album in albumList"
                            :key="album.id"
                            :label="album.name"
                            :value="album.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="新建相册">
                    <el-input v-model="editPhotoForm.new_album_name" placeholder="输入新相册名称（优先使用）" />
                </el-form-item>
                <el-form-item label="相册简介" v-if="editPhotoForm.new_album_name">
                    <el-input v-model="editPhotoForm.new_album_introduction" type="textarea" :rows="3" placeholder="输入新相册简介" />
                </el-form-item>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="editPhotoDialog = false">取消</el-button>
                    <el-button type="primary" @click="savePhotoEdit">确定</el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 审核对话框 -->
        <el-dialog v-model="reviewPhotoDialog" title="审核照片" width="400px" append-to-body v-if="reviewAction === 'review'">
            <p>请选择对照片 "{{ reviewingPhoto?.name }}" 的审核操作：</p>
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
        <el-dialog v-model="reviewPhotoDialog" title="撤销审核" width="400px" append-to-body v-else>
            <p>确定要撤销照片 "{{ reviewingPhoto?.name }}" 的审核状态吗？撤销后将变为待审核状态。</p>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="reviewPhotoDialog = false">取消</el-button>
                    <el-button type="warning" @click="confirmReviewWithAction('revoke')">确认撤销</el-button>
                </div>
            </template>
        </el-dialog>

        <!-- 照片预览对话框 -->
        <el-dialog v-model="photoPreviewVisible" title="照片预览" width="800px" append-to-body center>
            <div class="photo-preview-container">
                <img :src="previewPhotoUrl" alt="照片预览" style="max-width: 100%; max-height: 600px;" />
            </div>
        </el-dialog>
    </div>
</template>

<style scoped>
.album-management {
    padding: 20px;
    height: calc(100vh - 100px);
}

.content-wrapper {
    display: flex;
    gap: 20px;
    height: 90%;
}

.left-section {
    width: 45%;
    background: #fff;
    border-radius: 4px;
    padding: 20px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
}

.right-section {
    flex: 1;
    background: #fff;
    border-radius: 4px;
    padding: 20px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
}

.right-section.empty-section {
    align-items: center;
    justify-content: center;
}

.section-header {
    display: flex;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;
}

.section-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}

.section-header .el-icon {
    margin-right: 8px;
    font-size: 18px;
    color: #409EFF;
}

.operate {
    margin-bottom: 15px;
}

.search-area {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
}

.el-table {
    flex: 1;
    overflow: auto;
}

.paging {
    margin-top: 15px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

.paging>span {
    font-size: 14px;
    margin-right: 18px;
    color: #484848;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.photo-preview-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 300px;
}

.preview-btn {
    margin: 0;
    padding: 8px;
}

/* 手机端适配 */
@media screen and (max-width: 768px) {
    .album-management {
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
