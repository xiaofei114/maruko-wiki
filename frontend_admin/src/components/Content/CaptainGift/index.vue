<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getGiftsByMonth, addGift, updateGift, deleteGift } from '@/api/captainGift.js'
import { getSysDict } from '@/utils/sys.js'
import { Plus, Edit, Delete, Present } from '@element-plus/icons-vue'

// 字典数据
const gift_type = ref([])
const includes_type = ref([])
const show_progress = ref([])

// 加载字典
const loadDicts = async () => {
    try {
        const dicts = await getSysDict('gift_type', 'includes_type', 'show_progress')
        gift_type.value = dicts.gift_type || []
        includes_type.value = dicts.includes_type || []
        show_progress.value = dicts.show_progress || []
    } catch (error) {
        console.error('加载字典失败:', error)
    }
}

// 数据列表
const giftList = ref([])
const loading = ref(false)

// 年月选择
const giftYear = ref(String(new Date().getFullYear()))
const giftMonth = ref(new Date().getMonth() + 1)

// 对话框
const giftDialogVisible = ref(false)
const giftDialogTitle = ref('添加舰礼')

// 表单
const giftFormRef = ref(null)
const giftForm = ref({
    id: null,
    giftName: '',
    giftContent: '',
    requiredFansCount: 0,
    isLimited: false,
    giftType: 1,
    includes: 0,
    showProgress: 1
})

const giftFormRules = {
    giftName: [
        { required: true, message: '请输入礼物名称', trigger: 'blur' },
        { min: 1, max: 50, message: '礼物名称长度应在1-50个字符', trigger: 'blur' }
    ]
}

// 计算包含关系选项
const includesOptions = computed(() => {
    const options = []
    if (giftForm.value.giftType >= 2) {
        options.push({ label: '包含舰长礼', value: 1 })
    }
    if (giftForm.value.giftType >= 3) {
        options.push({ label: '包含提督礼', value: 2 })
    }
    return options
})

// 计算当前包含关系值
const currentIncludes = computed({
    get() {
        const includes = []
        if (giftForm.value.includes & 1) includes.push(1)
        if (giftForm.value.includes & 2) includes.push(2)
        return includes
    },
    set(val) {
        giftForm.value.includes = val.reduce((sum, v) => sum + v, 0)
    }
})

// 获取舰礼列表
const fetchGifts = async () => {
    loading.value = true
    try {
        const res = await getGiftsByMonth(parseInt(giftYear.value), giftMonth.value)
        if (res.code === 200) {
            giftList.value = res.data.gifts || []
        } else {
            ElMessage.error(res.message || '获取舰礼列表失败')
            giftList.value = []
        }
    } catch (error) {
        console.error('获取舰礼列表失败:', error)
        ElMessage.error('获取舰礼列表失败')
        giftList.value = []
    } finally {
        loading.value = false
    }
}

// 打开添加对话框
const openAddDialog = () => {
    giftDialogTitle.value = '添加舰礼'
    giftForm.value = {
        id: null,
        giftName: '',
        giftContent: '',
        requiredFansCount: 0,
        isLimited: false,
        giftType: 1,
        includes: 0,
        showProgress: 1
    }
    giftDialogVisible.value = true
}

// 打开编辑对话框
const openEditDialog = (gift) => {
    giftDialogTitle.value = '编辑舰礼'
    giftForm.value = {
        id: gift.id,
        giftName: gift.giftName,
        giftContent: gift.giftContent,
        requiredFansCount: gift.requiredFansCount,
        isLimited: gift.requiredFansCount > 0,
        giftType: gift.giftType || 1,
        includes: gift.includes || 0,
        showProgress: gift.showProgress !== undefined && gift.showProgress !== null ? Number(gift.showProgress) : 1
    }
    giftDialogVisible.value = true
}

// 保存舰礼
const saveGift = async () => {
    if (!giftFormRef.value) return

    await giftFormRef.value.validate(async (valid) => {
        if (valid) {
            try {
                const requiredFansCount = giftForm.value.isLimited
                    ? Number(giftForm.value.requiredFansCount)
                    : 0

                const giftData = {
                    giftName: giftForm.value.giftName,
                    giftContent: giftForm.value.giftContent,
                    requiredFansCount: requiredFansCount,
                    giftType: giftForm.value.giftType,
                    includes: giftForm.value.includes,
                    showProgress: giftForm.value.showProgress
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
                    await fetchGifts()
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
const handleDelete = (gift) => {
    ElMessageBox.confirm(
        `确定要删除舰礼 "${gift.giftName}" 吗？`,
        '确认删除',
        {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        }
    ).then(async () => {
        try {
            const res = await deleteGift(gift.id)
            if (res.code === 200) {
                ElMessage.success('删除成功')
                await fetchGifts()
            } else {
                ElMessage.error(res.message || '删除失败')
            }
        } catch (error) {
            console.error('删除舰礼失败:', error)
            ElMessage.error('删除失败')
        }
    }).catch(() => { })
}

// 处理年月变化
const handleDateChange = () => {
    fetchGifts()
}

onMounted(() => {
    loadDicts()
    fetchGifts()
})
</script>

<template>
    <div class="captain-gift-page">
        <!-- 页面头部 -->
        <div class="page-header">
            <div class="header-left">
                <el-icon class="header-icon">
                    <Present />
                </el-icon>
                <div class="header-title">
                    <h2>舰礼管理</h2>
                    <p class="subtitle">管理每月舰长礼物及解锁条件</p>
                </div>
            </div>
            <div class="header-actions">
                <el-date-picker v-model="giftYear" type="year" placeholder="选择年份" @change="handleDateChange"
                    style="width: 100px;" value-format="YYYY" />
                <el-select v-model="giftMonth" @change="handleDateChange" style="width: 90px; margin-left: 10px;">
                    <el-option v-for="m in 12" :key="m" :label="m + '月'" :value="m" />
                </el-select>
                <el-button type="primary" @click="openAddDialog" style="margin-left: 16px;">
                    <el-icon>
                        <Plus />
                    </el-icon>
                    添加舰礼
                </el-button>
            </div>
        </div>

        <!-- 数据表格/卡片 -->
        <div v-loading="loading">
            <el-empty v-if="giftList.length === 0" description="暂无舰礼，点击上方按钮添加">
                <template #image>
                    <el-icon size="60" color="#dcdfe6">
                        <Present />
                    </el-icon>
                </template>
            </el-empty>
            
            <!-- 桌面端表格 -->
            <el-table v-else class="desktop-table" :data="giftList" stripe style="width: 100%">
                <el-table-column type="index" label="序号" width="60" align="center" />
                <el-table-column label="类型" width="100" align="center">
                    <template #default="{ row }">
                        <dict-tag :value="row.giftType" :data="gift_type" />
                    </template>
                </el-table-column>
                <el-table-column prop="giftName" label="礼物名称" min-width="120" />
                <el-table-column prop="giftContent" label="礼物内容" min-width="200">
                    <template #default="{ row }">
                        <span class="gift-content-text">{{ row.giftContent || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="解锁条件" width="100" align="center">
                    <template #default="{ row }">
                        <el-tag :type="row.requiredFansCount === 0 ? 'success' : 'warning'" size="small">
                            {{ row.requiredFansCount === 0 ? '基础' : row.requiredFansCount }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="包含" width="120" align="center">
                    <template #default="{ row }">
                        <span v-if="row.includes" class="includes-text">
                            <dict-tag 
                                v-for="val in [1, 2].filter(v => row.includes & v)" 
                                :key="val"
                                :value="val"
                                :data="includes_type"
                            />
                        </span>
                        <span v-else>-</span>
                    </template>
                </el-table-column>
                <el-table-column label="进度" width="80" align="center">
                    <template #default="{ row }">
                        <el-tag :type="row.showProgress === 1 ? 'success' : 'info'" size="small">
                            {{ row.showProgress === 1 ? '显示' : '隐藏' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="120" align="center" fixed="right">
                    <template #default="{ row }">
                        <el-button size="small" @click="openEditDialog(row)" type="primary">
                            <el-icon>
                                <Edit />
                            </el-icon>
                        </el-button>
                        <el-button size="small" @click="handleDelete(row)" type="danger">
                            <el-icon>
                                <Delete />
                            </el-icon>
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            
            <!-- 手机端卡片 -->
            <div class="mobile-cards">
                <el-card v-for="(gift, index) in giftList" :key="gift.id" class="gift-card" shadow="hover">
                    <div class="gift-card-header">
                        <span class="gift-index">{{ index + 1 }}</span>
                        <div class="gift-tags">
                            <dict-tag :value="gift.giftType" :data="gift_type" />
                            <el-tag :type="gift.requiredFansCount === 0 ? 'success' : 'warning'" size="small" style="margin-left: 4px;">
                                {{ gift.requiredFansCount === 0 ? '基础' : gift.requiredFansCount }}
                            </el-tag>
                        </div>
                    </div>
                    <div class="gift-card-body">
                        <h4 class="gift-name">{{ gift.giftName }}</h4>
                        <p class="gift-content">{{ gift.giftContent || '无内容描述' }}</p>
                        <div class="gift-meta" v-if="gift.includes">
                            <dict-tag 
                                v-for="val in [1, 2].filter(v => gift.includes & v)" 
                                :key="val"
                                :value="val"
                                :data="includes_type"
                            />
                        </div>
                    </div>
                    <div class="gift-card-footer">
                        <el-button size="small" @click="openEditDialog(gift)" type="primary">
                            <el-icon><Edit /></el-icon>
                            编辑
                        </el-button>
                        <el-button size="small" @click="handleDelete(gift)" type="danger">
                            <el-icon><Delete /></el-icon>
                            删除
                        </el-button>
                    </div>
                </el-card>
            </div>
        </div>

        <!-- 添加/编辑对话框 -->
        <el-dialog 
            v-model="giftDialogVisible" 
            :title="giftDialogTitle" 
            width="550px" 
            :close-on-click-modal="false"
            class="gift-dialog"
        >
            <el-form :model="giftForm" :rules="giftFormRules" ref="giftFormRef" label-width="100px" class="gift-form">
                <el-form-item label="礼物名称" prop="giftName">
                    <el-input v-model="giftForm.giftName" placeholder="请输入礼物名称" maxlength="50" show-word-limit />
                </el-form-item>
                <el-form-item label="礼物类型">
                    <el-radio-group v-model="giftForm.giftType">
                        <el-radio-button 
                            v-for="item in gift_type" 
                            :key="item.dict_key" 
                            :value="parseInt(item.dict_key)"
                        >
                            {{ item.dict_label }}
                        </el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="礼物内容">
                    <el-input v-model="giftForm.giftContent" type="textarea" :rows="3" placeholder="请输入礼物内容描述（可选）"
                        maxlength="200" show-word-limit />
                </el-form-item>
                <el-form-item label="解锁条件" class="unlock-condition">
                    <el-radio-group v-model="giftForm.isLimited">
                        <el-radio :value="false">基础礼物（无数量要求）</el-radio>
                        <el-radio :value="true">达到指定数量</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="目标数量" v-if="giftForm.isLimited">
                    <el-input-number v-model="giftForm.requiredFansCount" :min="1" :max="9999" />
                </el-form-item>
                <el-form-item label="包含关系" v-if="giftForm.giftType > 1">
                    <el-checkbox-group v-model="currentIncludes">
                        <el-checkbox 
                            v-for="opt in includesOptions" 
                            :key="opt.value" 
                            :label="opt.value"
                        >
                            {{ opt.label }}
                        </el-checkbox>
                    </el-checkbox-group>
                </el-form-item>
                <el-form-item label="显示进度">
                    <el-radio-group v-model="giftForm.showProgress">
                        <el-radio :value="1">显示</el-radio>
                        <el-radio :value="0">隐藏</el-radio>
                    </el-radio-group>
                    <el-text type="info" size="small" style="margin-left: 8px;">是否在进度条中显示</el-text>
                </el-form-item>
            </el-form>
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="giftDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="saveGift">确定</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.captain-gift-page {
    padding: 20px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 20px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.header-icon {
    font-size: 32px;
    color: #409eff;
}

.header-title h2 {
    margin: 0;
    font-size: 20px;
    color: #303133;
}

.subtitle {
    margin: 4px 0 0;
    font-size: 13px;
    color: #909399;
}

.header-actions {
    display: flex;
    align-items: center;
}

.gift-content-text {
    color: #606266;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

/* 手机端卡片样式 */
.mobile-cards {
    display: none;
}

.gift-card {
    margin-bottom: 12px;
}

.gift-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.gift-index {
    width: 24px;
    height: 24px;
    background: #409eff;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
}

.gift-card-body {
    margin-bottom: 12px;
}

.gift-name {
    margin: 0 0 8px;
    font-size: 16px;
    color: #303133;
}

.gift-content {
    margin: 0;
    font-size: 13px;
    color: #606266;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.gift-card-footer {
    display: flex;
    gap: 8px;
}

.gift-card-footer .el-button {
    flex: 1;
}

/* 响应式适配 */
@media (max-width: 768px) {
    .captain-gift-page {
        padding: 12px;
    }

    .page-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
        padding: 12px;
    }

    .header-actions {
        width: 100%;
        flex-wrap: wrap;
        gap: 8px;
    }

    .header-actions .el-date-picker,
    .header-actions .el-select {
        flex: 1;
        min-width: 100px;
    }

    .header-actions .el-button {
        margin-left: 0;
        width: 100%;
        margin-top: 8px;
    }

    .desktop-table {
        display: none;
    }

    .mobile-cards {
        display: block;
    }
}

@media (max-width: 500px) {
    .header-title h2 {
        font-size: 18px;
    }

    .subtitle {
        font-size: 12px;
    }

    .header-icon {
        font-size: 28px;
    }
}

/* 对话框响应式 */
@media (max-width: 600px) {
    .gift-dialog {
        width: 90% !important;
    }

    .gift-form .el-form-item {
        margin-bottom: 16px;
    }

    .gift-form :deep(.el-form-item__label) {
        float: none;
        display: block;
        text-align: left;
        padding: 0 0 8px;
        line-height: 1.5;
    }

    .gift-form :deep(.el-form-item__content) {
        margin-left: 0 !important;
    }

    .unlock-condition :deep(.el-radio-group) {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
}
</style>
