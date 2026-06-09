<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, ArrowLeft, ArrowRight, Calendar, Plus, View, Edit, Delete, Document, Upload, Download } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import PageHero from '@/components/ComponentStyle/PageHero.vue'
import DocxPreview from '@/components/ComponentStyle/DocxPreview.vue'
import { getDictionaryItems } from '@/api/dictionary'
import { getPlanList, createPlan, deletePlan as deletePlanApi } from '@/api/planDocument'

const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)

// 是否为管理员或超级管理员
const canManage = computed(() => {
    const permission = userStore.user?.permission
    return permission === 1 || permission === 2
})

const nickName = import.meta.env.VITE_APP_NICK_NAME

// 当前年月
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

// 上传对话框
const uploadDialogVisible = ref(false)
const uploadForm = ref({
    title: '',
    type: 'anchor', // anchor: 主播企划, dd: DD企划
    anchorCategory: '', // 主播企划分类（从字典获取）
    ddVisibility: 'public', // public: 公开, internal: 内部
    file: null,
    timeType: 'single', // single: 单日, range: 持续, long: 长期
    singleDate: '',
    startDate: '',
    endDate: ''
})

// 主播企划分类字典
const anchorCategories = ref([])
const loadingCategories = ref(false)

async function fetchAnchorCategories() {
    try {
        loadingCategories.value = true
        const res = await getDictionaryItems('anchor_plan_category')
        if (res.code === 200) {
            anchorCategories.value = res.data || []
        }
    } catch (err) {
        console.error('获取企划分类失败', err)
    } finally {
        loadingCategories.value = false
    }
}

// 监听企划类型变化，加载字典
watch(() => uploadForm.value.type, (newType) => {
    if (newType === 'anchor' && anchorCategories.value.length === 0) {
        fetchAnchorCategories()
    }
})

// 分类统计数据
const categoryStats = computed(() => {
    const categories = anchorCategories.value
    const anchorPlansForStats = plans.value.filter(p => p.type === 'anchor' && p.anchorCategory)
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    return categories.map(cat => {
        const catPlans = anchorPlansForStats.filter(p => p.anchorCategory === cat.dict_key)
        
        // 只统计已结束的企划（日期 <= 今天）
        const pastPlans = catPlans.filter(p => {
            const dateStr = p.date || p.endDate || p.startDate
            return dateStr && dateStr <= todayStr
        })
        
        const count = pastPlans.length
        
        // 找到最近一次已结束企划的日期
        let lastDate = null
        for (const plan of pastPlans) {
            const planDateStr = plan.date || plan.startDate
            if (planDateStr && (!lastDate || planDateStr > lastDate)) {
                lastDate = planDateStr
            }
        }
        
        // 计算距今天数
        let daysSince = null
        if (lastDate) {
            const last = new Date(lastDate)
            daysSince = Math.floor((today - last) / (1000 * 60 * 60 * 24))
        }
        
        return {
            label: cat.dict_label,
            key: cat.dict_key,
            count,
            lastDate,
            daysSince
        }
    }).filter(s => s.count > 0)
})

// 详情对话框
const detailDialogVisible = ref(false)
const selectedDate = ref('')
const selectedDatePlans = ref([])

// 分类计算
const anchorPlans = computed(() => selectedDatePlans.value.filter(p => p.type === 'anchor'))
const ddPublicPlans = computed(() => selectedDatePlans.value.filter(p => p.type === 'dd' && p.visibility === 'public'))
const ddInternalPlans = computed(() => selectedDatePlans.value.filter(p => p.type === 'dd' && p.visibility === 'internal'))

// 企划数据
const plans = ref([])
const plansLoading = ref(false)

async function fetchPlans() {
    try {
        plansLoading.value = true
        const res = await getPlanList()
        if (res.code === 200) {
            plans.value = (res.data || []).map(item => ({
                id: item.id,
                title: item.title,
                type: item.type,
                anchorCategory: item.anchorCategory,
                visibility: item.ddVisibility,
                fileName: item.fileName,
                filePath: item.filePath,
                timeType: item.timeType,
                date: item.date,
                startDate: item.startDate,
                endDate: item.endDate,
                createTime: item.createTime * 1000
            }))
        }
    } catch (err) {
        console.error('获取企划列表失败', err)
        ElMessage.error('获取企划列表失败')
    } finally {
        plansLoading.value = false
    }
}

// 获取月份的天数
function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate()
}

// 获取月份第一天是星期几（0-6，0是周日）
function getFirstDayOfMonth(year, month) {
    return new Date(year, month - 1, 1).getDay()
}

// 获取当月所有企划及其行号分配
function getMonthPlanRows() {
    const year = currentYear.value
    const month = currentMonth.value
    const daysInMonth = getDaysInMonth(year, month)
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`
    
    // 收集当月涉及的所有企划，主播企划优先，再按开始时间排序
    const monthPlans = plans.value
        .filter(plan => {
            if (plan.timeType === 'single') {
                return plan.date >= monthStart && plan.date <= monthEnd
            } else if (plan.timeType === 'range') {
                return plan.startDate <= monthEnd && plan.endDate >= monthStart
            } else if (plan.timeType === 'long') {
                return true
            }
            return false
        })
        .sort((a, b) => {
            // 排序：主播 > DD公开 > DD内部
            const getPriority = (p) => {
                if (p.type === 'anchor') return 0
                if (p.visibility === 'public') return 1
                return 2
            }
            const pa = getPriority(a), pb = getPriority(b)
            if (pa !== pb) return pa - pb
            // 同优先级按开始时间排序
            const getStart = (p) => {
                if (p.timeType === 'single') return p.date
                if (p.timeType === 'range') return p.startDate
                return monthStart
            }
            return getStart(a).localeCompare(getStart(b))
        })
    
    // 给每个企划分配行号
    const planRowMap = new Map() // plan.id -> rowIndex
    const rowEndDay = [] // rowIndex -> 该行企划结束的最晚日期
    
    for (const plan of monthPlans) {
        let planStart, planEnd
        if (plan.timeType === 'single') {
            planStart = plan.date
            planEnd = plan.date
        } else if (plan.timeType === 'range') {
            planStart = plan.startDate
            planEnd = plan.endDate
        } else {
            planStart = monthStart
            planEnd = monthEnd
        }
        
        // 找第一个可用的行（该行的结束日期早于当前企划的开始日期）
        let assignedRow = -1
        for (let r = 0; r < rowEndDay.length; r++) {
            if (rowEndDay[r] < planStart) {
                assignedRow = r
                break
            }
        }
        
        if (assignedRow === -1) {
            assignedRow = rowEndDay.length
            rowEndDay.push('')
        }
        
        planRowMap.set(plan.id, assignedRow)
        rowEndDay[assignedRow] = planEnd
    }
    
    return { monthPlans, planRowMap, monthStart, monthEnd, daysInMonth }
}

// 日历格子（按周分组）
const calendarWeeks = computed(() => {
    const daysInMonth = getDaysInMonth(currentYear.value, currentMonth.value)
    const firstDay = getFirstDayOfMonth(currentYear.value, currentMonth.value)
    
    // 调整为周一开始（0=周一，6=周日）
    const startOffset = firstDay === 0 ? 6 : firstDay - 1
    
    const { monthPlans, planRowMap, monthStart, monthEnd } = getMonthPlanRows()
    
    const allDays = []
    
    // 上个月的补位
    const prevMonthDays = getDaysInMonth(
        currentMonth.value === 1 ? currentYear.value - 1 : currentYear.value,
        currentMonth.value === 1 ? 12 : currentMonth.value - 1
    )
    for (let i = startOffset - 1; i >= 0; i--) {
        allDays.push({
            day: prevMonthDays - i,
            isCurrentMonth: false,
            date: null,
            plans: [],
            planCount: 0
        })
    }
    
    // 当前月的天数
    const today = new Date()
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        const isToday = today.getFullYear() === currentYear.value && 
                       today.getMonth() + 1 === currentMonth.value && 
                       today.getDate() === i
        
        // 获取当天的企划，带行号
        const dayPlans = monthPlans
            .filter(plan => {
                if (plan.timeType === 'single') {
                    return plan.date === dateStr
                } else if (plan.timeType === 'range') {
                    return dateStr >= plan.startDate && dateStr <= plan.endDate
                } else if (plan.timeType === 'long') {
                    return true
                }
                return false
            })
            .map(plan => ({
                ...plan,
                rowIndex: planRowMap.get(plan.id)
            }))
            .sort((a, b) => a.rowIndex - b.rowIndex)
        
        allDays.push({
            day: i,
            isCurrentMonth: true,
            date: dateStr,
            isToday,
            plans: dayPlans,
            planCount: dayPlans.length
        })
    }
    
    // 下个月的补位
    const remaining = 42 - allDays.length
    for (let i = 1; i <= remaining; i++) {
        allDays.push({
            day: i,
            isCurrentMonth: false,
            date: null,
            plans: [],
            planCount: 0
        })
    }
    
    // 按周分组（7天一组），计算每周最大行数
    const weeks = []
    for (let i = 0; i < allDays.length; i += 7) {
        const weekDays = allDays.slice(i, i + 7)
        const maxRow = Math.max(...weekDays.map(d => {
            if (d.plans.length === 0) return 0
            return Math.max(...d.plans.map(p => p.rowIndex)) + 1
        }), 0)
        weeks.push({
            days: weekDays,
            planRows: maxRow
        })
    }
    
    return weeks
})

// 获取某天的企划
function getPlansForDate(dateStr) {
    return plans.value.filter(plan => {
        if (plan.timeType === 'single') {
            return plan.date === dateStr
        } else if (plan.timeType === 'range') {
            return dateStr >= plan.startDate && dateStr <= plan.endDate
        } else if (plan.timeType === 'long') {
            return true
        }
        return false
    })
}

// 上一月
function prevMonth() {
    if (currentMonth.value === 1) {
        currentMonth.value = 12
        currentYear.value--
    } else {
        currentMonth.value--
    }
}

// 下一月
function nextMonth() {
    if (currentMonth.value === 12) {
        currentMonth.value = 1
        currentYear.value++
    } else {
        currentMonth.value++
    }
}

// 回到今天
function goToToday() {
    const today = new Date()
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
}

// 打开上传对话框
function openUploadDialog() {
    uploadDialogVisible.value = true
    resetUploadForm()
    // 默认是主播企划，需要加载分类
    if (anchorCategories.value.length === 0) {
        fetchAnchorCategories()
    }
}

// 重置表单
function resetUploadForm() {
    uploadForm.value = {
        title: '',
        type: 'anchor',
        anchorCategories: [],
        ddVisibility: 'public',
        file: null,
        timeType: 'single',
        singleDate: '',
        startDate: '',
        endDate: ''
    }
}

// 文件选择（el-upload on-change）
function handleFileChange(file, fileList) {
    if (fileList.length > 0) {
        uploadForm.value.file = file.raw || file
    } else {
        uploadForm.value.file = null
    }
}

function handleFileExceed() {
    ElMessage.warning('只能选择一个文件')
}

// 提交上传
async function handleSubmit() {
    if (!uploadForm.value.title.trim()) {
        ElMessage.error('请输入企划名称')
        return
    }
    
    if (uploadForm.value.type === 'anchor' && !uploadForm.value.anchorCategory) {
        ElMessage.error('请选择企划分类')
        return
    }
    if (uploadForm.value.type === 'dd' && !uploadForm.value.ddVisibility) {
        ElMessage.error('请选择可见范围')
        return
    }
    
    if (uploadForm.value.timeType === 'single' && !uploadForm.value.singleDate) {
        ElMessage.error('请选择企划日期')
        return
    }
    
    if (uploadForm.value.timeType === 'range') {
        if (!uploadForm.value.startDate || !uploadForm.value.endDate) {
            ElMessage.error('请选择开始和结束日期')
            return
        }
        if (uploadForm.value.startDate > uploadForm.value.endDate) {
            ElMessage.error('开始日期不能晚于结束日期')
            return
        }
    }
    
    const formData = new FormData()
    formData.append('title', uploadForm.value.title.trim())
    formData.append('type', uploadForm.value.type)
    formData.append('timeType', uploadForm.value.timeType)
    
    if (uploadForm.value.type === 'anchor') {
        formData.append('anchorCategory', uploadForm.value.anchorCategory)
    }
    if (uploadForm.value.type === 'dd') {
        formData.append('ddVisibility', uploadForm.value.ddVisibility)
    }
    if (uploadForm.value.timeType === 'single') {
        formData.append('date', uploadForm.value.singleDate)
    }
    if (uploadForm.value.timeType === 'range') {
        formData.append('startDate', uploadForm.value.startDate)
        formData.append('endDate', uploadForm.value.endDate)
    }
    if (uploadForm.value.file) {
        formData.append('file', uploadForm.value.file)
    }
    
    try {
        const res = await createPlan(formData)
        if (res.code === 200) {
            ElMessage.success('企划创建成功')
            uploadDialogVisible.value = false
            resetUploadForm()
            await fetchPlans()
        } else {
            throw new Error(res.message || '创建失败')
        }
    } catch (err) {
        ElMessage.error(err.message || '创建失败，请稍后重试')
    }
}

// 查看某天详情
function viewDateDetail(dateStr) {
    if (!dateStr) return
    selectedDate.value = dateStr
    selectedDatePlans.value = getPlansForDate(dateStr)
    detailDialogVisible.value = true
}

// 删除企划
async function deletePlan(plan) {
    try {
        await ElMessageBox.confirm(
            `确定要删除企划 "${plan.title}" 吗？`,
            '删除确认',
            {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            }
        )
        
        const res = await deletePlanApi(plan.id)
        if (res.code === 200) {
            ElMessage.success('删除成功')
            await fetchPlans()
            // 刷新详情
            selectedDatePlans.value = getPlansForDate(selectedDate.value)
        } else {
            throw new Error(res.message || '删除失败')
        }
    } catch (err) {
        if (err !== 'cancel') {
            ElMessage.error(err.message || '删除失败')
        }
    }
}

// 格式化时间
function formatTime(timestamp) {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// 获取类型标签
function getTypeLabel(type) {
    return type === 'anchor' ? '主播企划' : 'DD企划'
}

// 获取企划分类标签
function getCategoryLabel(plan) {
    if (plan.type !== 'anchor' || !plan.anchorCategories?.length) {
        return getTypeLabel(plan.type)
    }
    const names = plan.anchorCategories.map(code => {
        const item = anchorCategories.value.find(c => c.code === code)
        return item ? item.name : code
    })
    return names.join(' / ')
}

function getTypeTagType(type) {
    return type === 'anchor' ? 'primary' : 'warning'
}

// 日历标签样式类
function getPlanTagClass(plan) {
    if (plan.type === 'anchor') return 'plan-anchor'
    return plan.visibility === 'internal' ? 'plan-dd-internal' : 'plan-dd-public'
}

// 获取时间显示
function getTimeDisplay(plan) {
    if (plan.timeType === 'single') {
        return plan.date
    } else if (plan.timeType === 'range') {
        return `${plan.startDate} ~ ${plan.endDate}`
    } else {
        return '长期有效'
    }
}

const baseUrl = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : (import.meta.env.VITE_APP_BASE_URL?.replace(/\/api\/?$/, '') || '')

// 文档预览弹窗
const previewDialogVisible = ref(false)
const previewPlan = ref(null)
const previewDocUrl = ref('')
const previewDocName = ref('')

// 查看文档
function viewDocument(plan) {
    if (!plan.filePath) return
    previewPlan.value = plan
    const apiPrefix = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : '/api'
    previewDocUrl.value = `${baseUrl}${apiPrefix}/file/${plan.filePath}`
    previewDocName.value = plan.fileName || '文档'
    previewDialogVisible.value = true
}

function closePreview() {
    previewDialogVisible.value = false
    previewPlan.value = null
    previewDocUrl.value = ''
    previewDocName.value = ''
}

function onPreviewError(payload) {
    const detail = payload?.message ? `（${payload.message}）` : ''
    ElMessage.warning(`文档预览失败${detail}`)
}

// 下载文档（传给后端文件名，由后端设置 Content-Disposition）
function downloadDocument(plan) {
    if (!plan.filePath) return
    const apiPrefix = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : '/api'
    const fileName = encodeURIComponent(plan.fileName || 'document.docx')
    const url = `${baseUrl}${apiPrefix}/file/${plan.filePath}?download=1&filename=${fileName}`
    const link = document.createElement('a')
    link.href = url
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

onMounted(() => {
    // 加载企划列表和分类字典
    fetchPlans()
    fetchAnchorCategories()
})
</script>

<template>
  <div class="maruko-calendar-page">
    <div class="container">
      <PageHero :title="`${nickName}企划`" subtitle="绘出明日蓝图，邀你共同执笔未来" />

      <!-- 工具栏 -->
      <div class="toolbar-card" v-if="isAuthenticated && canManage">
        <el-button @click="openUploadDialog" type="primary" plain>
          <el-icon><Plus /></el-icon>
          上传企划
        </el-button>
      </div>

      <!-- 数据统计 -->
      <div class="stats-card" v-if="categoryStats.length > 0">
        <div class="stats-title">企划统计</div>
        <div class="stats-grid">
          <div v-for="stat in categoryStats" :key="stat.key" class="stat-item">
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-content">
              <div class="stat-row">
                <span class="stat-key">次数</span>
                <span class="stat-value">{{ stat.count }}次</span>
              </div>
              <div class="stat-row">
                <span class="stat-key">上次</span>
                <span class="stat-value">{{ stat.lastDate || '暂无' }}</span>
              </div>
              <div class="stat-row" v-if="stat.daysSince !== null">
                <span class="stat-key">距今</span>
                <span class="stat-value">{{ stat.daysSince }}天</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 日历主体 -->
      <div class="calendar-card">
        <!-- 日历头部 -->
        <div class="calendar-header">
          <div class="month-selector">
            <el-button @click="prevMonth" :icon="ArrowLeft" circle />
            <span class="month-text">{{ currentYear }}年{{ currentMonth }}月</span>
            <el-button @click="nextMonth" :icon="ArrowRight" circle />
          </div>
          <el-button @click="goToToday" size="small">今天</el-button>
        </div>

        <!-- 星期标题 -->
        <div class="weekday-header">
          <div class="weekday" v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day">
            {{ day }}
          </div>
        </div>

        <!-- 日历格子 -->
        <div class="calendar-weeks">
          <div v-for="(week, weekIndex) in calendarWeeks" :key="weekIndex" class="calendar-week" :style="{ minHeight: `${80 + week.planRows * 22}px` }">
            <div 
              v-for="(day, dayIndex) in week.days" 
              :key="dayIndex"
              class="calendar-day"
              :class="{
                'other-month': !day.isCurrentMonth,
                'today': day.isToday,
                'has-plans': day.plans.length > 0
              }"
              @click="day.isCurrentMonth && viewDateDetail(day.date)"
            >
              <div class="day-number">{{ day.day }}</div>
              <div class="day-plans" v-if="day.plans.length > 0">
                <div 
                  v-for="plan in day.plans" 
                  :key="plan.id"
                  class="plan-tag"
                  :class="getPlanTagClass(plan)"
                  :style="{ top: `${plan.rowIndex * 22}px` }"
                >
                  {{ plan.title }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 上传企划对话框 -->
      <el-dialog 
        v-model="uploadDialogVisible" 
        title="上传企划" 
        width="520px" 
        :close-on-click-modal="false"
      >
        <el-form :model="uploadForm" label-width="80px" label-position="right">
          <el-form-item label="企划名称" required>
            <el-input 
              v-model="uploadForm.title" 
              placeholder="请输入企划名称" 
              maxlength="50" 
              show-word-limit 
            />
          </el-form-item>

          <el-form-item label="企划类型" required>
            <el-radio-group v-model="uploadForm.type">
              <el-radio-button value="anchor">主播企划</el-radio-button>
              <el-radio-button value="dd">DD企划</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="企划分类" v-if="uploadForm.type === 'anchor'">
            <el-select 
              v-model="uploadForm.anchorCategory" 
              placeholder="请选择企划分类" 
              style="width: 100%;"
              :loading="loadingCategories"
            >
              <el-option 
                v-for="item in anchorCategories" 
                :key="item.id" 
                :label="item.dict_label" 
                :value="item.dict_key"
              />
            </el-select>
            <div v-if="!loadingCategories && anchorCategories.length === 0" class="empty-tip">暂无分类，请先在管理后台配置</div>
          </el-form-item>

          <el-form-item label="可见范围" v-if="uploadForm.type === 'dd'" required>
            <el-radio-group v-model="uploadForm.ddVisibility">
              <el-radio value="public">公开企划</el-radio>
              <el-radio value="internal">内部企划</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="企划周期" required>
            <el-radio-group v-model="uploadForm.timeType">
              <el-radio-button value="single">单日</el-radio-button>
              <el-radio-button value="range">持续</el-radio-button>
              <el-radio-button value="long">长期</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="uploadForm.timeType === 'single'" label="日期" required>
            <el-date-picker
              v-model="uploadForm.singleDate"
              type="date"
              placeholder="选择日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%;"
            />
          </el-form-item>

          <el-form-item v-if="uploadForm.timeType === 'range'" label="时间范围" required>
            <div class="date-range">
              <el-date-picker
                v-model="uploadForm.startDate"
                type="date"
                placeholder="开始日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="flex: 1;"
              />
              <span class="range-separator">~</span>
              <el-date-picker
                v-model="uploadForm.endDate"
                type="date"
                placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="flex: 1;"
              />
            </div>
          </el-form-item>

          <el-form-item label="附件">
            <el-upload
              :auto-upload="false"
              :show-file-list="true"
              accept=".docx"
              :on-change="handleFileChange"
              :on-exceed="handleFileExceed"
              action=""
              drag
              style="width: 100%;"
            >
              <el-icon class="el-icon--upload">
                <UploadFilled />
              </el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或 <em>点击选择</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  仅支持 .docx 格式，可选上传
                </div>
              </template>
            </el-upload>
          </el-form-item>
        </el-form>

        <template #footer>
          <div class="dialog-footer">
            <el-button @click="uploadDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleSubmit">确认</el-button>
          </div>
        </template>
      </el-dialog>

      <!-- 日期详情对话框 -->
      <el-dialog 
        v-model="detailDialogVisible" 
        :title="`${selectedDate} 企划详情`" 
        width="700px"
      >
        <el-empty v-if="selectedDatePlans.length === 0" description="当天暂无企划" />
        
        <div v-else>
          <!-- 主播企划 -->
          <div v-if="anchorPlans.length > 0" class="plan-section">
            <h3 class="section-title">主播企划</h3>
            <div class="plan-list">
              <div v-for="plan in anchorPlans" :key="plan.id" class="plan-item">
                <div class="plan-item-header">
                  <h4>{{ plan.title }}</h4>
                  <div class="plan-item-actions">
                    <el-tag :type="getTypeTagType(plan.type)" size="small">
                      {{ getCategoryLabel(plan) }}
                    </el-tag>
                    <el-button 
                      v-if="canManage" 
                      @click="deletePlan(plan)" 
                      type="danger" 
                      size="small" 
                      :icon="Delete"
                      link
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <div class="plan-item-info">
                  <p class="plan-time">
                    <el-icon><Calendar /></el-icon>
                    {{ getTimeDisplay(plan) }}
                  </p>
                  <div v-if="plan.filePath" class="plan-file-actions">
                    <el-button type="primary" size="small" plain @click="viewDocument(plan)">
                      <el-icon><View /></el-icon>
                      查看
                    </el-button>
                    <el-button type="success" size="small" plain @click="downloadDocument(plan)">
                      <el-icon><Download /></el-icon>
                      下载
                    </el-button>
                  </div>
                  <p class="plan-create-time">
                    创建时间：{{ formatTime(plan.createTime) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- DD公开企划 -->
          <div v-if="ddPublicPlans.length > 0" class="plan-section">
            <h3 class="section-title">DD公开企划</h3>
            <div class="plan-list">
              <div v-for="plan in ddPublicPlans" :key="plan.id" class="plan-item">
                <div class="plan-item-header">
                  <h4>{{ plan.title }}</h4>
                  <div class="plan-item-actions">
                    <el-tag type="warning" size="small">公开企划</el-tag>
                    <el-button 
                      v-if="canManage" 
                      @click="deletePlan(plan)" 
                      type="danger" 
                      size="small" 
                      :icon="Delete"
                      link
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <div class="plan-item-info">
                  <p class="plan-time">
                    <el-icon><Calendar /></el-icon>
                    {{ getTimeDisplay(plan) }}
                  </p>
                  <div v-if="plan.filePath" class="plan-file-actions">
                    <el-button type="primary" size="small" plain @click="viewDocument(plan)">
                      <el-icon><View /></el-icon>
                      查看
                    </el-button>
                    <el-button type="success" size="small" plain @click="downloadDocument(plan)">
                      <el-icon><Download /></el-icon>
                      下载
                    </el-button>
                  </div>
                  <p class="plan-create-time">
                    创建时间：{{ formatTime(plan.createTime) }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- DD内部企划 -->
          <div v-if="ddInternalPlans.length > 0" class="plan-section">
            <h3 class="section-title">DD内部企划</h3>
            <div class="plan-list">
              <div v-for="plan in ddInternalPlans" :key="plan.id" class="plan-item">
                <div class="plan-item-header">
                  <h4>{{ plan.title }}</h4>
                  <div class="plan-item-actions">
                    <el-tag type="danger" size="small">内部企划</el-tag>
                    <el-button 
                      v-if="canManage" 
                      @click="deletePlan(plan)" 
                      type="danger" 
                      size="small" 
                      :icon="Delete"
                      link
                    >
                      删除
                    </el-button>
                  </div>
                </div>
                <div class="plan-item-info">
                  <p class="plan-time">
                    <el-icon><Calendar /></el-icon>
                    {{ getTimeDisplay(plan) }}
                  </p>
                  <div v-if="plan.filePath" class="plan-file-actions">
                    <el-button type="primary" size="small" plain @click="viewDocument(plan)">
                      <el-icon><View /></el-icon>
                      查看
                    </el-button>
                    <el-button type="success" size="small" plain @click="downloadDocument(plan)">
                      <el-icon><Download /></el-icon>
                      下载
                    </el-button>
                  </div>
                  <p class="plan-create-time">
                    创建时间：{{ formatTime(plan.createTime) }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-dialog>

      <!-- 文档预览对话框 -->
      <el-dialog 
        v-model="previewDialogVisible" 
        :title="`预览：${previewDocName}`" 
        width="900px"
        :close-on-click-modal="false"
        @close="closePreview"
      >
        <div style="height: 70vh; overflow: auto;">
          <docx-preview
            :src="previewDocUrl"
            style="height: 100%"
            @error="onPreviewError"
          />
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-button @click="closePreview">关闭</el-button>
          </div>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped>
.maruko-calendar-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 20px 40px;
}

.toolbar-card {
  background: white;
  border-radius: 16px;
  padding: 16px 24px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.stats-card {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.stats-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.stats-grid {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-item {
  flex: 1;
  min-width: 160px;
  background: #f8f9fb;
  border-radius: 12px;
  padding: 14px 18px;
}

.stat-label {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8eaee;
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.stat-key {
  color: #909399;
}

.stat-value {
  color: #303133;
  font-weight: 500;
}

.calendar-card {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 16px;
}

.month-text {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  min-width: 140px;
  text-align: center;
}

.weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  padding: 12px 0;
  font-weight: 600;
  color: #606266;
  background: #fafbfc;
}

.weekday:nth-child(6),
.weekday:nth-child(7) {
  color: #f56c6c;
}

.calendar-weeks {
  display: flex;
  flex-direction: column;
  gap: 1px;
  background: #ebeef5;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  overflow: hidden;
}

.calendar-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  background: #ebeef5;
  align-items: stretch;
}

.calendar-day {
  background: white;
  min-height: 80px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.calendar-day:hover {
  background: #f5f7fa;
}

.calendar-day.other-month {
  background: #fafbfc;
  cursor: default;
}

.calendar-day.other-month .day-number {
  color: #c0c4cc;
}

.calendar-day.today {
  background: var(--color-primary-alpha-15);
}

.calendar-day.today .day-number {
  color: var(--color-primary);
  font-weight: 700;
}

.calendar-day.has-plans {
  background: white;
}

.calendar-day.today.has-plans {
  background: var(--color-primary-alpha-15);
}

.day-number {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.day-plans {
  position: relative;
  min-height: 0;
}

.plan-tag {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  position: absolute;
  left: 0;
  right: 0;
}

.plan-tag:nth-child(1) { top: 0; }
.plan-tag:nth-child(2) { top: 22px; }
.plan-tag:nth-child(3) { top: 44px; }
.plan-tag:nth-child(4) { top: 66px; }
.plan-tag:nth-child(5) { top: 88px; }

.plan-anchor {
  background: #ecf5ff;
  color: #409eff;
  border: 1px solid #b3d8ff;
}

.plan-dd-public {
  background: #fdf6ec;
  color: #e6a23c;
  border: 1px solid #f5dab1;
}

.plan-dd-internal {
  background: #fef0f0;
  color: #f56c6c;
  border: 1px solid #fbc4c4;
}

.more-plans {
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.range-separator {
  color: #909399;
  font-size: 14px;
  flex-shrink: 0;
}

.upload-drop-area {
  border: 2px dashed #dcdfe6;
  border-radius: 6px;
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafbfc;
}

.upload-drop-area:hover {
  border-color: var(--color-primary);
  background: var(--color-primary-alpha-5);
}

.upload-icon {
  font-size: 20px;
  color: #909399;
}

.upload-text {
  font-size: 13px;
  color: #606266;
}

.file-selected {
  color: var(--color-primary);
  font-weight: 600;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
  padding-left: 4px;
}

.loading-tip,
.empty-tip {
  font-size: 12px;
  color: #909399;
}

.empty-tip {
  color: #f56c6c;
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-item {
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.plan-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.plan-item-header h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.plan-item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-item-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.plan-item-info p {
  margin: 0;
  font-size: 14px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 6px;
}

.plan-file {
  color: #409eff !important;
}

.plan-create-time {
  color: #909399 !important;
  font-size: 12px !important;
}

@media (max-width: 768px) {
  .container {
    padding: 15px;
  }

  .stats-grid {
    flex-direction: column;
    gap: 12px;
  }

  .stat-item {
    min-width: auto;
  }

  .calendar-card {
    padding: 16px;
  }

  .calendar-day {
    min-height: 80px;
    padding: 4px;
  }

  .day-number {
    font-size: 12px;
  }

  .plan-tag {
    font-size: 10px;
    padding: 1px 4px;
  }

  .month-text {
    font-size: 16px;
    min-width: 120px;
  }

  .preview-dialog-body {
    height: 50vh;
  }
}
</style>
