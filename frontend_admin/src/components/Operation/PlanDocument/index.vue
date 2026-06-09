<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPlanList, updatePlan, deletePlan } from '@/api/planDocument.js'
import { Client } from '@/utils/HttpClient.js'
import { Search, Refresh, Edit, Delete, Calendar, Plus, UploadFilled, View, Download } from '@element-plus/icons-vue'
import DocxPreview from '@/components/componentStyle/DocxPreview.vue'

const planList = ref([])
const loading = ref(false)
const anchorCategories = ref([])

// 创建弹窗
const createDialogVisible = ref(false)
const createForm = ref({
    title: '',
    type: 'anchor',
    anchorCategory: '',
    ddVisibility: 'public',
    timeType: 'single',
    singleDate: '',
    startDate: '',
    endDate: '',
    file: null
})

// 编辑弹窗
const editDialogVisible = ref(false)
const editingPlan = ref(null)
const editForm = ref({
    title: '',
    type: 'anchor',
    anchorCategory: '',
    ddVisibility: 'public',
    timeType: 'single',
    singleDate: '',
    startDate: '',
    endDate: ''
})

// 分页
const pagination = ref({
    page: 1,
    pageSize: 10,
    total: 0
})

const filters = ref({ title: '', type: '', anchorCategory: '', ddVisibility: '', timeType: '' })
const searchParams = ref({ title: '', type: '', anchorCategory: '', ddVisibility: '', timeType: '' })

const paginatedPlans = computed(() => planList.value)

async function fetchPlans(pageNum) {
    loading.value = true
    if (pageNum) pagination.value.page = pageNum
    try {
        const params = { page: pagination.value.page, pageSize: pagination.value.pageSize }
        if (searchParams.value.title) params.title = searchParams.value.title
        if (searchParams.value.type) params.type = searchParams.value.type
        if (searchParams.value.anchorCategory) params.anchorCategory = searchParams.value.anchorCategory
        if (searchParams.value.ddVisibility) params.ddVisibility = searchParams.value.ddVisibility
        if (searchParams.value.timeType) params.timeType = searchParams.value.timeType
        const res = await getPlanList(params)
        if (res.code === 200) {
            planList.value = (res.data?.list || []).map(p => ({ ...p }))
            if (res.data?.pagination) {
                pagination.value.total = res.data.pagination.total
            }
        }
    } catch (err) {
        console.error('获取企划列表失败:', err)
        ElMessage.error('获取企划列表失败')
    } finally {
        loading.value = false
    }
}

async function fetchCategories() {
    try {
        const res = await Client.get('/api/dictionary/items', { dictType: 'anchor_plan_category' })
        if (res.code === 200) {
            anchorCategories.value = res.data || []
        }
    } catch (err) {
        console.error('获取企划分类字典失败:', err)
    }
}

function handleSearch() {
    searchParams.value.title = filters.value.title
    searchParams.value.type = filters.value.type
    searchParams.value.anchorCategory = filters.value.anchorCategory
    searchParams.value.ddVisibility = filters.value.ddVisibility
    searchParams.value.timeType = filters.value.timeType
    pagination.value.page = 1
    fetchPlans(1)
}

function resetFilters() {
    filters.value.title = ''
    filters.value.type = ''
    filters.value.anchorCategory = ''
    filters.value.ddVisibility = ''
    filters.value.timeType = ''
    searchParams.value.title = ''
    searchParams.value.type = ''
    searchParams.value.anchorCategory = ''
    searchParams.value.ddVisibility = ''
    searchParams.value.timeType = ''
    pagination.value.page = 1
    fetchPlans(1)
}

function resetCreateForm() {
    createForm.value = {
        title: '',
        type: 'anchor',
        anchorCategory: '',
        ddVisibility: 'public',
        timeType: 'single',
        singleDate: '',
        startDate: '',
        endDate: '',
        file: null
    }
}

function openCreate() {
    resetCreateForm()
    createDialogVisible.value = true
}

async function handleCreate() {
    if (!createForm.value.title.trim()) {
        ElMessage.error('请输入企划名称')
        return
    }
    if (createForm.value.timeType === 'single' && !createForm.value.singleDate) {
        ElMessage.error('请选择日期')
        return
    }
    if (createForm.value.timeType === 'range' && (!createForm.value.startDate || !createForm.value.endDate)) {
        ElMessage.error('请选择时间范围')
        return
    }

    try {
        const fd = new FormData()
        fd.append('title', createForm.value.title.trim())
        fd.append('type', createForm.value.type)
        fd.append('timeType', createForm.value.timeType)
        if (createForm.value.type === 'anchor') fd.append('anchorCategory', createForm.value.anchorCategory)
        if (createForm.value.type === 'dd') fd.append('ddVisibility', createForm.value.ddVisibility)
        if (createForm.value.timeType === 'single') fd.append('date', createForm.value.singleDate)
        if (createForm.value.timeType === 'range') {
            fd.append('startDate', createForm.value.startDate)
            fd.append('endDate', createForm.value.endDate)
        }
        if (createForm.value.file) fd.append('file', createForm.value.file)

        const res = await Client.post('/api/plan', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        if (res.code === 200 || res.code === 201) {
            ElMessage.success('创建成功')
            createDialogVisible.value = false
            await fetchPlans()
        } else {
            ElMessage.error(res.message || '创建失败')
        }
    } catch (err) {
        console.error('创建企划失败:', err)
        ElMessage.error('创建失败')
    }
}

// 编辑
function handleEdit(plan) {
    editingPlan.value = plan
    editForm.value = {
        title: plan.title,
        type: plan.type,
        anchorCategory: plan.anchorCategory || '',
        ddVisibility: plan.ddVisibility || 'public',
        timeType: plan.timeType,
        singleDate: plan.timeType === 'single' ? plan.date : '',
        startDate: plan.timeType === 'range' ? plan.startDate : '',
        endDate: plan.timeType === 'range' ? plan.endDate : ''
    }
    editDialogVisible.value = true
}

async function saveEdit() {
    if (!editForm.value.title.trim()) {
        ElMessage.warning('企划名称不能为空')
        return
    }
    const payload = { title: editForm.value.title.trim() }
    payload.type = editForm.value.type
    if (editForm.value.type === 'anchor') payload.anchorCategory = editForm.value.anchorCategory || null
    if (editForm.value.type === 'dd') payload.ddVisibility = editForm.value.ddVisibility || null
    payload.timeType = editForm.value.timeType
    if (editForm.value.timeType === 'single') payload.date = editForm.value.singleDate || null
    if (editForm.value.timeType === 'range') {
        payload.startDate = editForm.value.startDate || null
        payload.endDate = editForm.value.endDate || null
    }

    try {
        const res = await updatePlan(editingPlan.value.id, payload)
        if (res.code === 200) {
            ElMessage.success('更新成功')
            editDialogVisible.value = false
            await fetchPlans()
        } else {
            ElMessage.error(res.message || '更新失败')
        }
    } catch (err) {
        console.error('更新企划失败:', err)
        ElMessage.error('更新失败')
    }
}

async function handleDelete(plan) {
    try {
        await ElMessageBox.confirm(
            `确定要删除企划"${plan.title}"吗？`,
            '确认删除',
            { confirmButtonText: '确定', cancelButtonText: '取消', type: 'danger' }
        )
        const res = await deletePlan(plan.id)
        if (res.code === 200) {
            ElMessage.success('删除成功')
            await fetchPlans()
        } else {
            ElMessage.error(res.message || '删除失败')
        }
    } catch (err) {
        if (err !== 'cancel') console.error('删除企划失败:', err)
    }
}

function handlePageChange(page) {
    fetchPlans(page)
}

// 文档预览
const previewDialogVisible = ref(false)
const previewDocUrl = ref('')
const previewDocName = ref('')

function viewDocument(plan) {
    if (!plan.filePath) return
    const baseUrl = import.meta.env.VITE_APP_API_BASE?.replace(/\/api\/?$/, '') || ''
    previewDocUrl.value = `${baseUrl}/file/${plan.filePath}`
    previewDocName.value = plan.fileName || '文档'
    previewDialogVisible.value = true
}

function closePreview() {
    previewDialogVisible.value = false
    previewDocUrl.value = ''
    previewDocName.value = ''
}

function onPreviewError(payload) {
    const detail = payload?.message ? `（${payload.message}）` : ''
    ElMessage.warning(`文档预览失败${detail}`)
}

function downloadDocument(plan) {
    if (!plan.filePath) return
    const baseUrl = import.meta.env.VITE_APP_API_BASE?.replace(/\/api\/?$/, '') || ''
    const fileName = encodeURIComponent(plan.fileName || 'document.docx')
    const url = `${baseUrl}/file/${plan.filePath}?download=1&filename=${fileName}`
    const link = document.createElement('a')
    link.href = url
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

function formatTime(ts) {
    if (!ts) return '-'
    return new Date(ts * 1000).toLocaleString('zh-CN')
}

function getTypeLabel(t) { return t === 'anchor' ? '主播企划' : 'DD企划' }
function getTypeTagType(t) { return t === 'anchor' ? 'primary' : 'warning' }
function getTimeLabel(p) {
    if (p.timeType === 'single') return p.date
    if (p.timeType === 'range') return `${p.startDate} ~ ${p.endDate}`
    return '长期有效'
}
function getFileInfo(p) { return p.fileName || '-' }

onMounted(() => { fetchPlans(); fetchCategories() })
</script>

<template>
    <div class="plan-management">
        <div class="section-header">
            <el-icon>
                <Calendar />
            </el-icon>
            <h3>企划管理</h3>
        </div>

        <div class="operate">
            <div class="search-area">
                <el-input v-model="filters.title" placeholder="企划名称" clearable :trigger-on-focus="false"
                    style="width:180px;margin-right:8px" />
                <el-select v-model="filters.type" placeholder="企划类型" clearable style="width:120px;margin-right:8px">
                    <el-option label="主播企划" value="anchor" />
                    <el-option label="DD企划" value="dd" />
                </el-select>
                <el-select v-model="filters.anchorCategory" placeholder="企划分类" clearable
                    style="width:140px;margin-right:8px">
                    <el-option v-for="item in anchorCategories" :key="item.id" :label="item.dict_label"
                        :value="item.dict_key" />
                </el-select>
                <el-select v-model="filters.ddVisibility" placeholder="可见范围" clearable style="width:100px;margin-right:8px">
                    <el-option label="公开" value="public" />
                    <el-option label="内部" value="internal" />
                </el-select>
                <el-select v-model="filters.timeType" placeholder="周期" clearable style="width:100px;margin-right:8px">
                    <el-option label="单日" value="single" />
                    <el-option label="持续" value="range" />
                    <el-option label="长期" value="long" />
                </el-select>
                <el-button type="primary" @click="handleSearch"><el-icon>
                        <Search />
                    </el-icon> 搜索</el-button>
                <el-button @click="resetFilters"><el-icon>
                        <Refresh />
                    </el-icon> 重置</el-button>
            </div>
        </div>

        <el-button type="primary" @click="openCreate">
            创建企划
        </el-button>

        <el-table :data="paginatedPlans" style="width:100%" v-loading="loading"
            :header-cell-style="{ 'text-align': 'center', 'color': '#000' }">
            <el-table-column align="center" type="index" :index="(pagination.page - 1) * pagination.pageSize + 1"
                label="序号" width="60" />
            <el-table-column align="center" prop="title" label="企划名称" min-width="160" show-overflow-tooltip />
            <el-table-column align="center" label="类型" width="100">
                <template #default="s"><el-tag :type="getTypeTagType(s.row.type)" size="small">{{
                    getTypeLabel(s.row.type) }}</el-tag></template>
            </el-table-column>
            <el-table-column align="center" label="分类/可见范围" width="150">
                <template #default="s">
                    <template v-if="s.row.type === 'anchor'"><dict-tag :data="anchorCategories"
                            :value="s.row.anchorCategory" /></template>
                    <el-tag v-else :type="s.row.ddVisibility === 'internal' ? 'danger' : 'warning'" size="small">{{
                        s.row.ddVisibility === 'internal' ? '内部' : '公开' }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" label="周期" width="80">
                <template #default="s">{{ { single: '单日', range: '持续', long: '长期' }[s.row.timeType] || s.row.timeType
                    }}</template>
            </el-table-column>
            <el-table-column align="center" label="时间/范围" min-width="170">
                <template #default="s">{{ getTimeLabel(s.row) }}</template>
            </el-table-column>
            <el-table-column align="center" label="附件" width="150" show-overflow-tooltip>
                <template #default="s">{{ s.row.fileName || '-' }}</template>
            </el-table-column>
            <el-table-column align="center" label="创建时间" width="160">
                <template #default="s">{{ formatTime(s.row.createTime) }}</template>
            </el-table-column>
            <el-table-column align="center" label="操作" width="250" fixed="right">
                <template #default="s">
                    <div v-if="s.row.fileName">
                        <el-button type="primary" text size="small" @click="viewDocument(s.row)">
                            <el-icon>
                                <View />
                            </el-icon> 预览
                        </el-button>
                        <el-button type="primary" text size="small" @click="downloadDocument(s.row)">
                            <el-icon>
                                <Download />
                            </el-icon> 下载
                        </el-button>
                    </div>
                    <el-button type="primary" text size="small" @click="handleEdit(s.row)">
                        <el-icon>
                            <Edit />
                        </el-icon> 编辑
                    </el-button>
                    <el-button type="danger" text size="small" @click="handleDelete(s.row)">
                        <el-icon>
                            <Delete />
                        </el-icon> 删除
                    </el-button>
                </template>
            </el-table-column>
            <template #empty>暂无数据</template>
        </el-table>

        <div class="paging">
            <span>共 {{ pagination.total }} 条</span>
            <el-pagination background prev-text="上一页" next-text="下一页" layout="prev, pager, next"
                :total="pagination.total" :pager-count="5" :current-page="pagination.page"
                @current-change="handlePageChange" />
        </div>

        <!-- 创建弹窗 -->
        <el-dialog v-model="createDialogVisible" title="创建企划" width="520px" :close-on-click-modal="false">
            <el-form :model="createForm" label-width="80px" label-position="right">
                <el-form-item label="企划名称" required>
                    <el-input v-model="createForm.title" placeholder="请输入企划名称" maxlength="50" show-word-limit />
                </el-form-item>
                <el-form-item label="企划类型" required>
                    <el-radio-group v-model="createForm.type">
                        <el-radio-button value="anchor">主播企划</el-radio-button>
                        <el-radio-button value="dd">DD企划</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="createForm.type === 'anchor'" label="企划分类">
                    <el-select v-model="createForm.anchorCategory" placeholder="请选择分类" style="width:100%">
                        <el-option v-for="item in anchorCategories" :key="item.id" :label="item.dict_label"
                            :value="item.dict_key" />
                    </el-select>
                </el-form-item>
                <el-form-item v-if="createForm.type === 'dd'" label="可见范围" required>
                    <el-radio-group v-model="createForm.ddVisibility">
                        <el-radio value="public">公开企划</el-radio>
                        <el-radio value="internal">内部企划</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="企划周期" required>
                    <el-radio-group v-model="createForm.timeType">
                        <el-radio-button value="single">单日</el-radio-button>
                        <el-radio-button value="range">持续</el-radio-button>
                        <el-radio-button value="long">长期</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="createForm.timeType === 'single'" label="日期" required>
                    <el-date-picker v-model="createForm.singleDate" type="date" placeholder="选择日期" format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
                <el-form-item v-if="createForm.timeType === 'range'" label="时间范围" required>
                    <div style="display:flex;gap:8px;width:100%">
                        <el-date-picker v-model="createForm.startDate" type="date" placeholder="开始" format="YYYY-MM-DD"
                            value-format="YYYY-MM-DD" style="flex:1" />
                        <span style="line-height:32px">~</span>
                        <el-date-picker v-model="createForm.endDate" type="date" placeholder="结束" format="YYYY-MM-DD"
                            value-format="YYYY-MM-DD" style="flex:1" />
                    </div>
                </el-form-item>
                <el-form-item label="附件">
                    <el-upload :auto-upload="false" :show-file-list="true" accept=".docx,.pdf,.txt"
                        :on-change="(f) => createForm.file = f.raw" action="" drag style="width:100%">
                        <el-icon class="el-icon--upload">
                            <UploadFilled />
                        </el-icon>
                        <div class="el-upload__text">将文件拖到此处，或 <em>点击选择</em></div>
                        <template #tip>
                            <div class="el-upload__tip">仅支持 .docx/.pdf/.txt 格式，可选上传</div>
                        </template>
                    </el-upload>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="createDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="handleCreate">创建</el-button>
            </template>
        </el-dialog>

        <!-- 编辑弹窗 -->
        <el-dialog v-model="editDialogVisible" title="编辑企划" width="520px" :close-on-click-modal="false">
            <el-form :model="editForm" label-width="80px" label-position="right">
                <el-form-item label="企划名称" required>
                    <el-input v-model="editForm.title" placeholder="请输入企划名称" maxlength="50" show-word-limit />
                </el-form-item>
                <el-form-item label="企划类型" required>
                    <el-radio-group v-model="editForm.type">
                        <el-radio-button value="anchor">主播企划</el-radio-button>
                        <el-radio-button value="dd">DD企划</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="editForm.type === 'anchor'" label="企划分类">
                    <el-select v-model="editForm.anchorCategory" placeholder="请选择分类" style="width:100%">
                        <el-option v-for="item in anchorCategories" :key="item.id" :label="item.dict_label"
                            :value="item.dict_key" />
                    </el-select>
                </el-form-item>
                <el-form-item v-if="editForm.type === 'dd'" label="可见范围" required>
                    <el-radio-group v-model="editForm.ddVisibility">
                        <el-radio value="public">公开企划</el-radio>
                        <el-radio value="internal">内部企划</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="企划周期" required>
                    <el-radio-group v-model="editForm.timeType">
                        <el-radio-button value="single">单日</el-radio-button>
                        <el-radio-button value="range">持续</el-radio-button>
                        <el-radio-button value="long">长期</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="editForm.timeType === 'single'" label="日期" required>
                    <el-date-picker v-model="editForm.singleDate" type="date" placeholder="选择日期" format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD" style="width:100%" />
                </el-form-item>
                <el-form-item v-if="editForm.timeType === 'range'" label="时间范围" required>
                    <div style="display:flex;gap:8px;width:100%">
                        <el-date-picker v-model="editForm.startDate" type="date" placeholder="开始" format="YYYY-MM-DD"
                            value-format="YYYY-MM-DD" style="flex:1" />
                        <span style="line-height:32px">~</span>
                        <el-date-picker v-model="editForm.endDate" type="date" placeholder="结束" format="YYYY-MM-DD"
                            value-format="YYYY-MM-DD" style="flex:1" />
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="editDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="saveEdit">保存</el-button>
            </template>
        </el-dialog>

        <!-- 文档预览弹窗 -->
        <el-dialog v-model="previewDialogVisible" :title="'预览：' + previewDocName" width="900px"
            :close-on-click-modal="false" @close="closePreview" top="5vh">
            <div style="height:70vh;overflow:auto;">
                <docx-preview :src="previewDocUrl" @error="onPreviewError" />
            </div>
            <template #footer>
                <el-button @click="closePreview">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.plan-management {
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

.paging>span {
    font-size: 14px;
    margin-right: 18px;
    color: #484848;
}

.act-btn {
    padding: 4px 8px;
}
</style>
