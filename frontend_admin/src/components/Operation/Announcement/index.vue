<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/api/announcement.js'
import { Search, Refresh, Edit, Delete, Plus, Top, Bell } from '@element-plus/icons-vue'

// 数据列表
const announcementList = ref([])
const loading = ref(false)

// 对话框状态
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEditing = ref(false)
const editingId = ref(null)

// 表单数据
const form = ref({
    title: '',
    content: '',
    author: '',
    isPinned: false,
    category: 'system'
})

// 分类选项
const categoryOptions = [
    { label: '系统公告', value: 'system' },
    { label: '功能更新', value: 'feature' },
    { label: '版本更新', value: 'update' },
    { label: '节日活动', value: 'holiday' }
]

// 分页状态
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

// 筛选条件
const filters = ref({
    title: '',
    category: ''
})

// 搜索条件
const searchParams = ref({
    title: '',
    category: ''
})

// 计算属性 - 筛选后的列表
const filteredList = computed(() => {
    let result = announcementList.value

    // 标题筛选
    if (searchParams.value.title) {
        result = result.filter(item =>
            item.title.toLowerCase().includes(searchParams.value.title.toLowerCase())
        )
    }

    // 分类筛选
    if (searchParams.value.category) {
        result = result.filter(item => item.category === searchParams.value.category)
    }

    // 更新总数
    pagination.value.total = result.length

    return result
})

// 分页后的列表
const paginatedList = computed(() => {
    const start = (pagination.value.page - 1) * pagination.value.pageSize
    const end = start + pagination.value.pageSize
    return filteredList.value.slice(start, end)
})

// 获取公告列表
const fetchAnnouncements = async () => {
    loading.value = true
    try {
        const response = await getAnnouncements()
        if (response.code === 200) {
            announcementList.value = response.data
            pagination.value.total = response.data.length
        } else {
            ElMessage.error(response.message || '获取公告列表失败')
        }
    } catch (error) {
        console.error('获取公告列表失败:', error)
        ElMessage.error('获取公告列表失败')
    } finally {
        loading.value = false
    }
}

// 搜索
const handleSearch = () => {
    searchParams.value.title = filters.value.title
    searchParams.value.category = filters.value.category
    pagination.value.page = 1
}

// 重置筛选
const resetFilters = () => {
    filters.value.title = ''
    filters.value.category = ''
    searchParams.value.title = ''
    searchParams.value.category = ''
    pagination.value.page = 1
}

// 打开新增对话框
const openAddDialog = () => {
    isEditing.value = false
    editingId.value = null
    dialogTitle.value = '新增公告'
    form.value = {
        title: '',
        content: '',
        author: '',
        isPinned: false,
        category: 'system'
    }
    dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = (row) => {
    isEditing.value = true
    editingId.value = row.id
    dialogTitle.value = '编辑公告'
    form.value = {
        title: row.title,
        content: row.content,
        author: row.author,
        isPinned: row.isPinned,
        category: row.category
    }
    dialogVisible.value = true
}

// 保存
const handleSave = async () => {
    // 表单验证
    if (!form.value.title.trim()) {
        ElMessage.warning('请输入公告标题')
        return
    }
    if (!form.value.content.trim()) {
        ElMessage.warning('请输入公告内容')
        return
    }

    try {
        const data = {
            title: form.value.title.trim(),
            content: form.value.content.trim(),
            author: form.value.author.trim() || '管理员',
            isPinned: form.value.isPinned,
            category: form.value.category
        }

        let response
        if (isEditing.value) {
            response = await updateAnnouncement(editingId.value, data)
        } else {
            response = await createAnnouncement(data)
        }

        if (response.code === 200) {
            ElMessage.success(isEditing.value ? '公告更新成功' : '公告创建成功')
            dialogVisible.value = false
            await fetchAnnouncements()
        } else {
            ElMessage.error(response.message || (isEditing.value ? '更新失败' : '创建失败'))
        }
    } catch (error) {
        console.error(isEditing.value ? '更新公告失败:' : '创建公告失败:', error)
        ElMessage.error(isEditing.value ? '更新失败' : '创建失败')
    }
}

// 删除
const handleDelete = async (row) => {
    try {
        await ElMessageBox.confirm(
            `确定要删除公告"${row.title}"吗？此操作不可恢复。`,
            '确认删除',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'danger'
            }
        )

        const response = await deleteAnnouncement(row.id)
        if (response.code === 200) {
            const index = announcementList.value.findIndex(item => item.id === row.id)
            if (index > -1) {
                announcementList.value.splice(index, 1)
                pagination.value.total = filteredList.value.length
            }
            ElMessage.success('公告删除成功')
        } else {
            ElMessage.error(response.message || '删除失败')
        }
    } catch (error) {
        if (error !== 'cancel') {
            console.error('删除公告失败:', error)
            ElMessage.error('删除失败')
        }
    }
}

// 分页变化
const handlePageChange = (page) => {
    pagination.value.page = page
}

// 获取分类标签
const getCategoryLabel = (value) => {
    const option = categoryOptions.find(opt => opt.value === value)
    return option ? option.label : value
}

const getCategoryType = (value) => {
    const types = {
        system: 'info',
        feature: 'success',
        update: 'warning',
        holiday: 'danger'
    }
    return types[value] || 'info'
}

// 格式化时间
const formatTime = (timeStr) => {
    if (!timeStr) return '-'
    return timeStr
}

onMounted(() => {
    fetchAnnouncements()
})
</script>

<template>
    <div class="announcement-management">
        <div class="section-header">
            <el-icon><Bell /></el-icon>
            <h3>公告管理</h3>
        </div>

        <div class="operate">
            <div class="search-area">
                <el-input
                    v-model="filters.title"
                    placeholder="请输入公告标题"
                    clearable
                    :trigger-on-focus="false"
                    style="width: 200px; margin-right: 10px"
                />
                <el-select
                    v-model="filters.category"
                    placeholder="分类"
                    clearable
                    style="width: 120px; margin-right: 10px"
                >
                    <el-option
                        v-for="opt in categoryOptions"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                    />
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
            <el-button type="primary" @click="openAddDialog">
                <el-icon><Plus /></el-icon>
                新增公告
            </el-button>
        </div>

        <el-table
            :data="paginatedList"
            style="width: 100%"
            v-loading="loading"
            :header-cell-style="{ 'text-align': 'center', 'color': '#000' }"
        >
            <el-table-column align="center" type="index" :index="(pagination.page - 1) * pagination.pageSize + 1" label="序号" width="60" />
            <el-table-column align="center" label="置顶" width="90">
                <template #default="scope">
                    <el-tag v-if="scope.row.isPinned" type="danger">
                        <el-icon><Top /></el-icon>
                        置顶
                    </el-tag>
                    <span v-else>-</span>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column align="center" label="分类" width="100">
                <template #default="scope">
                    <el-tag :type="getCategoryType(scope.row.category)">
                        {{ getCategoryLabel(scope.row.category) }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="author" label="作者" width="100" />
            <el-table-column align="center" prop="publishTime" label="发布时间" width="160" />
            <el-table-column align="center" label="操作" width="180" fixed="right">
                <template #default="scope">
                    <el-button type="primary" text @click="openEditDialog(scope.row)" class="preview-btn">
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

        <!-- 新增/编辑对话框 -->
        <el-dialog
            v-model="dialogVisible"
            :title="dialogTitle"
            width="700px"
            :close-on-click-modal="false"
        >
            <el-form :model="form" label-width="80px">
                <el-form-item label="标题">
                    <el-input v-model="form.title" placeholder="请输入公告标题" maxlength="100" show-word-limit />
                </el-form-item>
                <el-form-item label="内容">
                    <el-input
                        v-model="form.content"
                        type="textarea"
                        :rows="8"
                        placeholder="请输入公告内容（支持HTML）"
                    />
                </el-form-item>
                <el-form-item label="作者">
                    <el-input v-model="form.author" placeholder="默认为管理员" maxlength="50" />
                </el-form-item>
                <el-form-item label="分类">
                    <el-select v-model="form.category" style="width: 100%">
                        <el-option
                            v-for="opt in categoryOptions"
                            :key="opt.value"
                            :label="opt.label"
                            :value="opt.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="置顶">
                    <el-switch v-model="form.isPinned" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="handleSave">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.announcement-management {
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
