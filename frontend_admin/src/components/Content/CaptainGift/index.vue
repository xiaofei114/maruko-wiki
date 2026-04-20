<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getGiftsByMonth, addGift, updateGift, deleteGift } from '@/api/captainGift.js'
import { Plus, Edit, Delete, Present } from '@element-plus/icons-vue'

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
    isLimited: false
})

const giftFormRules = {
    giftName: [
        { required: true, message: '请输入礼物名称', trigger: 'blur' },
        { min: 1, max: 50, message: '礼物名称长度应在1-50个字符', trigger: 'blur' }
    ]
}

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
        isLimited: false
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
        isLimited: gift.requiredFansCount > 0
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

                let res
                if (giftForm.value.id) {
                    // 编辑
                    res = await updateGift(giftForm.value.id, {
                        giftName: giftForm.value.giftName,
                        giftContent: giftForm.value.giftContent,
                        requiredFansCount: requiredFansCount
                    })
                } else {
                    // 添加
                    res = await addGift({
                        year: parseInt(giftYear.value),
                        month: giftMonth.value,
                        giftName: giftForm.value.giftName,
                        giftContent: giftForm.value.giftContent,
                        requiredFansCount: requiredFansCount
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

        <!-- 数据表格 -->
        <div v-loading="loading">
            <el-empty v-if="giftList.length === 0" description="暂无舰礼，点击上方按钮添加">
                <template #image>
                    <el-icon size="60" color="#dcdfe6">
                        <Present />
                    </el-icon>
                </template>
            </el-empty>
            <el-table v-else :data="giftList" stripe style="width: 100%">
                <el-table-column type="index" label="序号" width="60" align="center" />
                <el-table-column prop="giftName" label="礼物名称" min-width="150" />
                <el-table-column prop="giftContent" label="礼物内容" min-width="250">
                    <template #default="{ row }">
                        <span class="gift-content-text">{{ row.giftContent || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="解锁条件" width="150" align="center">
                    <template #default="{ row }">
                        <el-tag :type="row.requiredFansCount === 0 ? 'success' : 'warning'" size="small">
                            {{ row.requiredFansCount === 0 ? '基础舰礼' : `${row.requiredFansCount}舰长` }}
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
        </div>

        <!-- 添加/编辑对话框 -->
        <el-dialog v-model="giftDialogVisible" :title="giftDialogTitle" width="500px" :close-on-click-modal="false">
            <el-form :model="giftForm" :rules="giftFormRules" ref="giftFormRef" label-width="100px">
                <el-form-item label="礼物名称" prop="giftName">
                    <el-input v-model="giftForm.giftName" placeholder="请输入礼物名称" maxlength="50" show-word-limit />
                </el-form-item>
                <el-form-item label="礼物内容">
                    <el-input v-model="giftForm.giftContent" type="textarea" :rows="3" placeholder="请输入礼物内容描述（可选）"
                        maxlength="200" show-word-limit />
                </el-form-item>
                <el-form-item label="解锁条件">
                    <el-radio-group v-model="giftForm.isLimited">
                        <el-radio :label="false">基础舰礼（无限制）</el-radio>
                        <el-radio :label="true">达到指定舰长数</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="目标舰长数" v-if="giftForm.isLimited">
                    <el-input-number v-model="giftForm.requiredFansCount" :min="1" :max="9999" />
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
</style>
