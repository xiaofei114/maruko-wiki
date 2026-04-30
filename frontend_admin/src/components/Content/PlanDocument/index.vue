<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPlanDocuments, reviewPlanDocument, updatePlanDocument, deletePlanDocument, setCurrentPlanDocument } from '@/api/planDocument.js'
import { Search, Refresh, Edit, Delete, CircleCheck, CircleClose, Document } from '@element-plus/icons-vue'

// 数据列表
const documentList = ref([])
const loading = ref(false)

// 编辑对话框
const editDialogVisible = ref(false)
const editingDocument = ref(null)
const editForm = ref({
    title: ''
})

// 审核对话框
const reviewDialogVisible = ref(false)
const reviewingDocument = ref(null)
const reviewAction = ref('') // 'approve' 或 'reject'

// 分页状态
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

// 筛选条件
const filters = ref({
    title: '',
    status: ''
})

// 搜索条件（点击搜索后才会更新）
const searchParams = ref({
    title: '',
    status: ''
})

// 计算属性 - 筛选后的文档列表
const filteredDocuments = computed(() => {
    let result = documentList.value

    // 标题筛选
    if (searchParams.value.title) {
        result = result.filter(doc =>
            doc.title.toLowerCase().includes(searchParams.value.title.toLowerCase())
        )
    }

    // 状态筛选
    if (searchParams.value.status !== '') {
        result = result.filter(doc => doc.isReview === parseInt(searchParams.value.status))
    }

    // 更新总数
    pagination.value.total = result.length

    return result
})

// 分页后的文档列表
const paginatedDocuments = computed(() => {
    const start = (pagination.value.page - 1) * pagination.value.pageSize
    const end = start + pagination.value.pageSize
    return filteredDocuments.value.slice(start, end)
})

// 获取文档列表
const fetchDocuments = async () => {
    loading.value = true
    try {
        const response = await getPlanDocuments()
        if (response.code === 200) {
            documentList.value = response.data
            pagination.value.total = response.data.length
        } else {
            ElMessage.error(response.message || '获取企划文档列表失败')
        }
    } catch (error) {
        console.error('获取企划文档列表失败:', error)
        ElMessage.error('获取企划文档列表失败')
    } finally {
        loading.value = false
    }
}

// 搜索
const handleSearch = () => {
    searchParams.value.title = filters.value.title
    searchParams.value.status = filters.value.status
    pagination.value.page = 1
}

// 重置筛选
const resetFilters = () => {
    filters.value.title = ''
    filters.value.status = ''
    searchParams.value.title = ''
    searchParams.value.status = ''
    pagination.value.page = 1
}

// 打开审核弹窗
const openReviewDialog = (doc, action) => {
    reviewingDocument.value = doc
    reviewAction.value = action
    reviewDialogVisible.value = true
}

// 确认审核
const confirmReview = async () => {
    if (!reviewingDocument.value) return

    const status = reviewAction.value === 'approve' ? 1 : 2
    const actionText = reviewAction.value === 'approve' ? '审核通过' : '审核不通过'

    try {
        const response = await reviewPlanDocument(reviewingDocument.value.id, status)
        if (response.code === 200) {
            reviewingDocument.value.isReview = status
            ElMessage.success(`${actionText}成功`)
            reviewDialogVisible.value = false
        } else {
            ElMessage.error(response.message || `${actionText}失败`)
        }
    } catch (error) {
        console.error(`${actionText}失败:`, error)
        ElMessage.error(`${actionText}失败`)
    }
}

// 编辑文档
const handleEdit = (doc) => {
    editingDocument.value = doc
    editForm.value = {
        title: doc.title
    }
    editDialogVisible.value = true
}

// 保存编辑
const saveEdit = async () => {
    try {
        if (!editForm.value.title.trim()) {
            ElMessage.warning('文档标题不能为空')
            return
        }

        const response = await updatePlanDocument(editingDocument.value.id, {
            title: editForm.value.title.trim()
        })

        if (response.code === 200) {
            editingDocument.value.title = editForm.value.title.trim()
            ElMessage.success('文档更新成功')
            editDialogVisible.value = false
        } else {
            ElMessage.error(response.message || '更新失败')
        }
    } catch (error) {
        console.error('更新文档失败:', error)
        ElMessage.error('更新失败')
    }
}

// 删除文档
const handleDelete = async (doc) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除文档"${doc.title}"吗？此操作不可恢复。`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'danger'
            }
        )

        const response = await deletePlanDocument(doc.id)
        if (response.code === 200) {
            const index = documentList.value.findIndex(d => d.id === doc.id)
            if (index > -1) {
                documentList.value.splice(index, 1)
                pagination.value.total = filteredDocuments.value.length
            }
            ElMessage.success('文档删除成功')
        } else {
            ElMessage.error(response.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除文档失败:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 设置当前文档
const handleSetCurrent = async (doc) => {
    try {
        const response = await setCurrentPlanDocument(doc.id)
        if (response.code === 200) {
            // 更新本地状态
            documentList.value.forEach(d => {
                d.isCurrent = (d.id === doc.id)
            })
            ElMessage.success('已设置为当前文档')
        } else {
            ElMessage.error(response.message || '设置失败')
        }
    } catch (error) {
        console.error('设置当前文档失败:', error)
        ElMessage.error('设置失败')
    }
}

// 分页变化
const handlePageChange = (page) => {
    pagination.value.page = page
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
    fetchDocuments()
})
</script>

<template>
    <div class="plan-document-management">
        <div class="section-header">
            <el-icon><Document /></el-icon>
            <h3>企划文档管理</h3>
        </div>

        <div class="operate">
            <div class="search-area">
                <el-input
                    v-model="filters.title"
                    placeholder="请输入文档标题"
                    clearable
                    :trigger-on-focus="false"
                    style="width: 200px; margin-right: 10px"
                />
                <el-select
                    v-model="filters.status"
                    placeholder="审核状态"
                    clearable
                    style="width: 120px; margin-right: 10px"
                >
                    <el-option label="待审核" :value="0" />
                    <el-option label="已通过" :value="1" />
                    <el-option label="不通过" :value="2" />
                </el-select>
                <el-button type="primary" @click="handleSearch">
                    <el-icon><Search /></el-icon>
                    搜索
                </el-button>
                <el-button @click="resetFilters">
                    <el-icon><Refresh /></el-icon>
                    重置
                </el-button>
            </div>
        </div>

        <el-table
            :data="paginatedDocuments"
            style="width: 100%"
            v-loading="loading"
            :header-cell-style="{ 'text-align': 'center', 'color': '#000' }"
        >
            <el-table-column align="center" type="index" :index="(pagination.page - 1) * pagination.pageSize + 1" label="序号" width="60" />
            <el-table-column align="center" prop="title" label="文档标题" min-width="200" show-overflow-tooltip />
            <el-table-column align="center" prop="fileName" label="文件名" min-width="180" show-overflow-tooltip />
            <el-table-column align="center" prop="uploaderName" label="上传者" width="100" />
            <el-table-column align="center" label="审核状态" width="100">
                <template #default="scope">
                    <el-tag :type="getReviewStatusType(scope.row.isReview)">
                        {{ getReviewStatusLabel(scope.row.isReview) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" label="当前显示" width="100">
                <template #default="scope">
                    <el-tag v-if="scope.row.isCurrent" type="success">当前</el-tag>
                    <span v-else>-</span>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="uploadTime" label="上传时间" width="160">
                <template #default="scope">
                    {{ formatTime(scope.row.uploadTime) }}
                </template>
            </el-table-column>
            <el-table-column align="center" label="操作" min-width="280" fixed="right">
                <template #default="scope">
                    <!-- 审核操作 -->
                    <template v-if="scope.row.isReview === 0">
                        <el-button type="success" text @click="openReviewDialog(scope.row, 'approve')" class="preview-btn">
                            <el-icon><CircleCheck /></el-icon>
                            通过
                        </el-button>
                        <el-button type="danger" text @click="openReviewDialog(scope.row, 'reject')" class="preview-btn">
                            <el-icon><CircleClose /></el-icon>
                            拒绝
                        </el-button>
                    </template>
                    <template v-else-if="scope.row.isReview === 2">
                        <el-button type="success" text @click="openReviewDialog(scope.row, 'approve')" class="preview-btn">
                            <el-icon><CircleCheck /></el-icon>
                            重新通过
                        </el-button>
                    </template>
                    
                    <!-- 设置当前 -->
                    <el-button 
                        v-if="scope.row.isReview === 1 && !scope.row.isCurrent" 
                        type="primary" 
                        text 
                        @click="handleSetCurrent(scope.row)" 
                        class="preview-btn"
                    >
                        设为当前
                    </el-button>
                    
                    <!-- 编辑删除 -->
                    <el-button type="primary" text @click="handleEdit(scope.row)" class="preview-btn">
                        <el-icon><Edit /></el-icon>
                        编辑
                    </el-button>
                    <el-button type="danger" text @click="handleDelete(scope.row)" class="preview-btn">
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
            <span>共 {{ pagination.total }} 条</span>
            <el-pagination
                background
                prev-text="上一页"
                next-text="下一页"
                layout="prev, pager, next"
                :total="pagination.total"
                :pager-count="5"
                :current-page="pagination.page"
                @current-change="handlePageChange"
            />
        </div>

        <!-- 审核对话框 -->
        <el-dialog
            v-model="reviewDialogVisible"
            title="审核确认"
            width="400px"
        >
            <p v-if="reviewAction === 'approve'">
                确定要通过文档"{{ reviewingDocument?.title }}"的审核吗？
            </p>
            <p v-else>
                确定要拒绝文档"{{ reviewingDocument?.title }}"的审核吗？
            </p>
            <template #footer>
                <el-button @click="reviewDialogVisible = false">取消</el-button>
                <el-button 
                    :type="reviewAction === 'approve' ? 'success' : 'danger'" 
                    @click="confirmReview"
                >
                    确定
                </el-button>
            </template>
        </el-dialog>

        <!-- 编辑对话框 -->
        <el-dialog
            v-model="editDialogVisible"
            title="编辑文档"
            width="500px"
        >
            <el-form :model="editForm" label-width="80px">
                <el-form-item label="文档标题">
                    <el-input v-model="editForm.title" placeholder="请输入文档标题" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="editDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveEdit">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.plan-document-management {
    padding: 20px;
}

.section-header {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}

.section-header .el-icon {
    font-size: 24px;
    margin-right: 10px;
    color: var(--el-color-primary);
}

.section-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
}

.operate {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.search-area {
    display: flex;
    align-items: center;
}

.paging {
    margin-top: 15px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

.paging > span {
    font-size: 14px;
    margin-right: 18px;
    color: #484848;
}

.preview-btn {
    padding: 4px 8px;
}
</style>
