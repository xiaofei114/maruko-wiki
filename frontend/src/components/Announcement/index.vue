<script setup>
import { ref, computed, onMounted } from 'vue'
import { Bell, Clock, User, Star, Plus, Edit, Delete } from '@element-plus/icons-vue'
import PageHero from '@/components/ComponentStyle/PageHero.vue'
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/api/announcement.js'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { ElMessage, ElMessageBox } from 'element-plus'

// 用户状态
const userStore = useUserStore()
const { permission } = storeToRefs(userStore)

// 判断是否为管理员
const isAdmin = computed(() => {
    return permission.value === 1 || permission.value === 2
})

// 公告数据
const announcements = ref([])
const loading = ref(false)

// 获取公告列表
const fetchAnnouncements = async () => {
    loading.value = true
    try {
        const result = await getAnnouncements()
        // 后端格式: {code: 200, message: "...", data: [...]}
        if (result && result.code === 200 && Array.isArray(result.data)) {
            announcements.value = result.data
        } else {
            ElMessage.error(result?.message || '获取公告列表失败')
        }
    } catch (error) {
        console.error('获取公告列表失败:', error)
        ElMessage.error('获取公告列表失败，请稍后重试')
    } finally {
        loading.value = false
    }
}

// 页面加载时获取公告列表
onMounted(() => {
    fetchAnnouncements()
})

// 展开的公告ID集合
const expandedAnnouncements = ref(new Set())

// 切换公告展开状态
const toggleExpanded = (announcementId) => {
    if (expandedAnnouncements.value.has(announcementId)) {
        expandedAnnouncements.value.delete(announcementId)
    } else {
        expandedAnnouncements.value.add(announcementId)
    }
}

// 检查公告是否展开
const isExpanded = (announcementId) => {
    return expandedAnnouncements.value.has(announcementId)
}

// 判断公告内容是否需要折叠（HTML字符数超过300）
const shouldCollapse = (content) => {
    if (!content) return false
    return content.length > 300
}

// 获取折叠显示的内容（截取前200个字符）
const getCollapsedContent = (content) => {
    if (!content) return ''
    return content.substring(0, 200) + '...'
}

// 获取公告类型标签
const getCategoryLabel = (category) => {
    const labels = {
        system: '系统通知',
        feature: '新功能',
        update: '功能更新',
        holiday: 'Bug修复'
    }
    return labels[category] || '公告'
}

// 获取公告类型颜色
const getCategoryColor = (category) => {
    const colors = {
        system: '#F56C6C',
        feature: '#67C23A',
        update: '#409EFF',
        holiday: '#E6A23C'
    }
    return colors[category] || '#909399'
}

// 置顶公告排序
const sortedAnnouncements = computed(() => {
    return [...announcements.value].sort((a, b) => {
        // 置顶的公告排在前面
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        // 时间倒序排列（最新的在前）
        return new Date(b.publishTime) - new Date(a.publishTime)
    })
})

// 公告表单对话框
const dialogVisible = ref(false)
const dialogTitle = ref('创建公告')
const isEdit = ref(false)
const editingId = ref(null)
const formRef = ref(null)
const form = ref({
    title: '',
    content: '',
    author: '',
    isPinned: false,
    category: 'system'
})

// 表单验证规则
const formRules = {
    title: [
        { required: true, message: '请输入公告标题', trigger: 'blur' },
        { min: 1, max: 100, message: '标题长度应在1-100个字符', trigger: 'blur' }
    ],
    content: [
        { required: true, message: '请输入公告内容', trigger: 'blur' }
    ]
}

// 分类选项
const categoryOptions = [
    { label: '系统通知', value: 'system' },
    { label: '新功能', value: 'feature' },
    { label: '功能更新', value: 'update' },
    { label: 'Bug修复', value: 'holiday' }
]

// 打开创建对话框
const openCreateDialog = () => {
    isEdit.value = false
    editingId.value = null
    dialogTitle.value = '创建公告'
    form.value = {
        title: '',
        content: '',
        author: userStore.username || '管理员',
        isPinned: false,
        category: 'system'
    }
    dialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = (announcement) => {
    isEdit.value = true
    editingId.value = announcement.id
    dialogTitle.value = '编辑公告'
    form.value = {
        title: announcement.title,
        content: announcement.content,
        author: announcement.author,
        isPinned: announcement.isPinned,
        category: announcement.category
    }
    dialogVisible.value = true
}

// 提交表单
const submitForm = async () => {
    if (!formRef.value) return

    await formRef.value.validate(async (valid) => {
        if (valid) {
            try {
                if (isEdit.value) {
                    // 编辑公告
                    const result = await updateAnnouncement(editingId.value, form.value)
                    if (result && result.code === 200) {
                        ElMessage.success('公告更新成功')
                        dialogVisible.value = false
                        fetchAnnouncements()
                    } else {
                        ElMessage.error(result?.message || '更新失败')
                    }
                } else {
                    // 创建公告
                    const result = await createAnnouncement(form.value)
                    if (result && result.code === 200) {
                        ElMessage.success('公告创建成功')
                        dialogVisible.value = false
                        fetchAnnouncements()
                    } else {
                        ElMessage.error(result?.message || '创建失败')
                    }
                }
            } catch (error) {
                console.error('提交失败:', error)
                ElMessage.error('操作失败，请稍后重试')
            }
        }
    })
}

// 删除公告
const handleDelete = (announcement) => {
    ElMessageBox.confirm(
        `确定要删除公告 "${announcement.title}" 吗？`,
        '确认删除',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }
    ).then(async () => {
        try {
            const result = await deleteAnnouncement(announcement.id)
            if (result && result.code === 200) {
                ElMessage.success('公告删除成功')
                fetchAnnouncements()
            } else {
                ElMessage.error(result?.message || '删除失败')
            }
        } catch (error) {
            console.error('删除失败:', error)
            ElMessage.error('删除失败，请稍后重试')
        }
    }).catch(() => {
        // 取消删除
    })
}
</script>

<template>
    <div class="announcement-page">
        <div class="content-wrapper">
            <PageHero 
              title="公告中心" 
              subtitle="同步每份动态，与你共赴崭新旅程" 
            />

            <!-- 公告列表 -->
            <div class="announcement-section">
                <!-- 管理员工具栏 -->
                <div v-if="isAdmin" class="admin-toolbar">
                    <el-button type="primary" :icon="Plus" @click="openCreateDialog">
                        创建公告
                    </el-button>
                </div>

                <!-- 加载状态 -->
                <div v-if="loading" class="loading-state">
                    <el-skeleton :rows="6" animated />
                </div>

                <!-- 公告列表 -->
                <div v-else class="announcement-list">
                    <div v-for="announcement in sortedAnnouncements" :key="announcement.id" class="announcement-card"
                        :class="{ 'pinned': announcement.isPinned }">

                        <!-- 公告头部 -->
                        <div class="announcement-header">
                            <div class="header-left">
                                <div v-if="announcement.isPinned" class="pinned-badge">
                                    <el-icon>
                                        <Star />
                                    </el-icon>
                                    置顶
                                </div>
                                <el-tag :color="getCategoryColor(announcement.category)" size="small">
                                    {{ getCategoryLabel(announcement.category) }}
                                </el-tag>
                            </div>
                            <div class="header-right">
                                <span class="publish-time">
                                    <el-icon>
                                        <Clock />
                                    </el-icon>
                                    {{ announcement.publishTime }}
                                </span>
                            </div>
                        </div>

                        <!-- 公告标题 -->
                        <h3 class="announcement-title">{{ announcement.title }}</h3>

                        <!-- 公告内容 -->
                        <div class="announcement-content">
                            <!-- 折叠状态显示内容 -->
                            <div v-if="!isExpanded(announcement.id) && shouldCollapse(announcement.content)"
                                class="content-collapsed">
                                <div class="content-html" v-html="getCollapsedContent(announcement.content)"></div>
                                <div class="expand-indicator">
                                    <el-button size="small" type="text" @click="toggleExpanded(announcement.id)"
                                        class="expand-btn">
                                        展开全文
                                    </el-button>
                                </div>
                            </div>

                            <!-- 展开状态显示全部内容 -->
                            <div v-else class="content-expanded">
                                <div class="content-html" v-html="announcement.content"></div>
                                <div v-if="shouldCollapse(announcement.content)" class="collapse-indicator">
                                    <el-button size="small" type="text" @click="toggleExpanded(announcement.id)"
                                        class="collapse-btn">
                                        收起内容
                                    </el-button>
                                </div>
                            </div>
                        </div>

                        <!-- 公告底部 -->
                        <div class="announcement-footer">
                            <div class="author-info">
                                <el-icon>
                                    <User />
                                </el-icon>
                                <span>{{ announcement.author }}</span>
                            </div>
                            <!-- 管理员操作按钮 -->
                            <div v-if="isAdmin" class="admin-actions">
                                <el-button size="small" type="primary" :icon="Edit" @click="openEditDialog(announcement)">
                                    编辑
                                </el-button>
                                <el-button size="small" type="danger" :icon="Delete" @click="handleDelete(announcement)">
                                    删除
                                </el-button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 空状态 -->
                <div v-if="!loading && announcements.length === 0" class="empty-state">
                    <el-empty description="暂无公告" :image-size="80">
                        <template #image>
                            <el-icon size="80" class="empty-icon">
                                <Bell />
                            </el-icon>
                        </template>
                    </el-empty>
                </div>
            </div>
        </div>

        <!-- 创建/编辑公告对话框 -->
        <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px" destroy-on-close>
            <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
                <el-form-item label="标题" prop="title">
                    <el-input v-model="form.title" placeholder="请输入公告标题" maxlength="100" show-word-limit />
                </el-form-item>
                <el-form-item label="作者">
                    <el-input v-model="form.author" placeholder="请输入作者名称" />
                </el-form-item>
                <el-form-item label="分类">
                    <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
                        <el-option v-for="item in categoryOptions" :key="item.value" :label="item.label"
                            :value="item.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="置顶">
                    <el-switch v-model="form.isPinned" />
                </el-form-item>
                <el-form-item label="内容" prop="content">
                    <el-input v-model="form.content" type="textarea" :rows="10" placeholder="请输入公告内容，支持HTML格式" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitForm">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
:deep(.el-tag.el-tag--primary) {
    --el-tag-text-color: #fff
}

.announcement-page {
    min-height: 100vh;
    background: #f5f7fa;
}

.content-wrapper {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

/* 公告区域 */
.announcement-section {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* 管理员工具栏 */
.admin-toolbar {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e9ecef;
}

/* 加载状态 */
.loading-state {
    padding: 20px;
}

.announcement-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    -webkit-overflow-scrolling: touch;
}

.announcement-card {
    border: 1px solid #e9ecef;
    border-radius: 12px;
    padding: 24px;
    transition: all 0.3s ease;
    position: relative;
    -webkit-tap-highlight-color: var(--color-primary-alpha-10);
}

.announcement-card:hover {
    border-color: var(--color-primary);
    box-shadow: 0 4px 12px var(--color-primary-alpha-10);
    transform: translateY(-2px);
}

.announcement-card.pinned {
    border-color: #e6a23c;
    background: linear-gradient(135deg, #fdf6ec 0%, #fdf2f2 100%);
    position: relative;
}

.announcement-card.pinned:hover {
    border-color: #e6a23c;
    box-shadow: 0 4px 12px rgba(230, 162, 60, 0.1);
}

/* 移动端禁用悬停效果 */
@media (max-width: 768px) {
    .announcement-card:hover {
        transform: none;
        box-shadow: none;
    }

    .announcement-card.pinned:hover {
        box-shadow: none;
    }
}

/* 公告头部 */
.announcement-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 10px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pinned-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #e6a23c;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.header-right {
    display: flex;
    align-items: center;
}

.publish-time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #999;
}

/* 公告标题 */
.announcement-title {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    line-height: 1.4;
}

/* 公告内容 */
.announcement-content {
    color: #666;
    line-height: 1.6;
    margin-bottom: 20px;
}

.content-html {
    line-height: 1.6;
}

.content-html h4 {
    color: var(--color-primary);
    font-size: 16px;
    font-weight: 600;
    margin: 20px 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid var(--color-primary);
}

.content-html strong {
    color: #333;
    font-weight: 600;
}

.content-html em {
    color: #666;
    font-style: italic;
}

/* 内容折叠相关样式 */
.content-collapsed,
.content-expanded {
    position: relative;
}

.expand-indicator,
.collapse-indicator {
    margin-top: 8px;
    text-align: center;
}

.expand-btn,
.collapse-btn {
    color: var(--color-primary);
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.3s ease;
}

.expand-btn:hover,
.collapse-btn:hover {
    background-color: var(--color-primary-alpha-10);
    color: var(--color-primary-light);
}

/* 公告底部 */
.announcement-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
    flex-wrap: wrap;
    gap: 10px;
}

.author-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #999;
}

/* 管理员操作按钮 */
.admin-actions {
    display: flex;
    gap: 8px;
}

/* 空状态 */
.empty-state {
    text-align: center;
    padding: 60px 20px;
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

.empty-icon {
    color: #c0c4cc;
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

/* 响应式设计 */
@media (max-width: 768px) {
    .content-wrapper {
        padding: 15px;
    }

    .announcement-section {
        padding: 20px;
    }

    .announcement-card {
        padding: 20px;
    }

    .announcement-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .header-right {
        align-self: flex-end;
    }

    .announcement-title {
        font-size: 16px;
    }

    .announcement-content {
        font-size: 14px;
    }

    .content-html h4 {
        font-size: 15px;
        margin: 16px 0 10px 0;
    }

    .expand-btn,
    .collapse-btn {
        font-size: 13px;
        padding: 3px 6px;
    }

    .announcement-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .admin-actions {
        width: 100%;
        justify-content: flex-end;
    }

    .pinned-badge {
        font-size: 11px;
        padding: 3px 6px;
    }

    .publish-time {
        font-size: 13px;
    }
}

@media (max-width: 480px) {
    .content-wrapper {
        padding: 10px;
    }

    .announcement-section {
        padding: 15px;
        border-radius: 8px;
    }

    .announcement-card {
        padding: 16px;
        border-radius: 8px;
        gap: 15px;
    }

    .announcement-header {
        margin-bottom: 12px;
        gap: 6px;
    }

    .header-left {
        flex-direction: row;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .header-right {
        align-self: flex-start;
        margin-top: 4px;
    }

    .announcement-title {
        font-size: 15px;
        margin-bottom: 12px;
        line-height: 1.3;
    }

    .announcement-content {
        font-size: 13px;
        margin-bottom: 16px;
    }

    .content-html h4 {
        font-size: 14px;
        margin: 14px 0 8px 0;
    }

    .expand-btn,
    .collapse-btn {
        font-size: 12px;
        padding: 2px 5px;
    }

    .announcement-footer {
        padding-top: 12px;
        gap: 8px;
    }

    .admin-actions {
        width: 100%;
        justify-content: flex-start;
    }

    .author-info {
        font-size: 13px;
    }

    .pinned-badge {
        font-size: 10px;
        padding: 2px 5px;
    }

    .publish-time {
        font-size: 12px;
    }
}

/* 超小屏幕优化 (≤375px) */
@media (max-width: 375px) {
    .content-wrapper {
        padding: 8px;
    }

    .announcement-section {
        padding: 12px;
    }

    .announcement-card {
        padding: 14px;
    }

    .announcement-title {
        font-size: 14px;
    }

    .announcement-content {
        font-size: 12px;
    }

    .content-html h4 {
        font-size: 13px;
        margin: 12px 0 6px 0;
    }

    .expand-btn,
    .collapse-btn {
        font-size: 11px;
        padding: 1px 4px;
    }

    .author-info {
        font-size: 12px;
    }

    .admin-actions {
        width: 100%;
        justify-content: flex-start;
    }

    .admin-actions .el-button {
        padding: 6px 12px;
        font-size: 12px;
    }

    .pinned-badge {
        font-size: 9px;
        padding: 1px 4px;
    }

    .publish-time {
        font-size: 11px;
    }
}
</style>
