<script setup>
import { ref, onMounted, reactive } from 'vue'
import { get_getItemsPaged, get_deleteItem, get_banItem, get_addorupdateItem } from '@/api/dictionary.js'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter, useRoute } from 'vue-router'
import { getSysDict } from '@/utils/sys.js'
const router = useRouter()
const route = useRoute()
import { useUserStore } from '@/stores/user.js'

const userStore = useUserStore()
const { sys_display_style } = await getSysDict('sys_display_style')

const all_total = ref(0)
const tableData = ref([])
const TypeDialog = ref(false)
const queryParameters = ref({
    page: 1,
    pageSize: 10,
    includeBanned: true,
})
const TypeForm = ref({
    sort: 0
})
const TypeRules = reactive({
    dict_label: [{
        required: true,
        message: '请输入字典标签',
        trigger: 'blur'
    }],
    dict_key: [{
        required: true,
        message: '请输入字典键',
        trigger: 'blur'
    }]
})
const ruleFormRef = ref(null)
//禁用字典
const banChange = (val, id) => {
    get_banItem({
        id: id,
        banned: val
    })
}
//翻页方法
const pageTurning = pageNum => {
    queryParameters.value.page = pageNum
    getlist()
}
//获取字典方法
const getlist = () => {
    get_getItemsPaged(queryParameters.value).then(res => {
        all_total.value = res.data.pagination.total
        tableData.value = res.data.data
    })
}
//数据初始化
onMounted(async () => {
    queryParameters.value.dictType = route.params.dict_type
    getlist()
})
//删除字典方法
const deletePlayers = data => {
    ElMessageBox.confirm('<strong style="font-size: 23px;">这将不可恢复!</strong>', "警告！", {
        cancelButtonText: "取消",
        confirmButtonText: "确定",
        dangerouslyUseHTMLString: true,
        type: 'error',
    }).then(() => {
        get_deleteItem(data).then(res => {
            if (res.code == 200) {
                ElMessage.success("删除成功")
                getlist()
            }
        })
    })
}

const addModifyType = data => {
    if (data.id) {
        TypeForm.value.itemId = data.id
        TypeForm.value.dict_label = data.dict_label
        TypeForm.value.dict_key = data.dict_key
        TypeForm.value.dict_key2 = data.dict_key2
        TypeForm.value.sort = data.sort
        TypeForm.value.display_style = data.display_style
    } else {
        TypeForm.value = { sort: 0 }
    }
    TypeDialog.value = true
}

const executeType = async formEl => {
    if (!formEl) return
    await formEl.validate((valid) => {
        if (valid) {
            TypeForm.value.dict_type = queryParameters.value.dictType
            get_addorupdateItem(TypeForm.value).then(data => {
                if (data.code == 200) {
                    ElMessage.success(data.message)
                    getlist()
                    TypeDialog.value = false
                } else {
                    TypeDialog.value = false
                }
            })
        }
    })
}

const back = () => {
    router.push("/home/dictionary")
}
</script>

<template>
    <div>
        <div class="operate">
            <div>
                <el-button class="operate_button" type="primary" @click="addModifyType" plain>创建键值</el-button>
                <el-button class="operate_button" type="warning" @click="back" plain>返回</el-button>
            </div>
        </div>
        <el-table :data="tableData" style="width: 100%"
            :header-cell-style="{ 'text-align': 'center', 'color': '#000' }">
            <el-table-column align="center" prop="id" label="字典编码" width="80" />
            <el-table-column align="center" prop="dict_label" label="字典标签">
                <template #default="data">
                    <dict-tag :copy="data.row.dict_label" :value="data.row.display_style" />
                </template>
            </el-table-column>
            <el-table-column align="center" prop="dict_key" label="字典键值" />
            <el-table-column align="center" prop="dict_key2" label="备用键值">
                <template #default=data>
                    {{ data.row.dict_key2 ? data.row.dict_key2 : "-" }}
                </template>
            </el-table-column>
            <el-table-column align="center" prop="sort" label="排序" />
            <el-table-column align="center" prop="created_at" label="创建时间" />
            <el-table-column align="center" prop="updated_at" label="更新时间" />
            <el-table-column align="center" prop="is_banned" label="是否封禁" >
                <template #default=data>
                    <el-switch @change="banChange($event, data.row.id)" v-model="data.row.is_banned" />
                </template>
            </el-table-column>
            <el-table-column align="center" label="操作" width="195">
                <template #default=data>
                    <el-button type="primary" text class="button" @click="addModifyType(data.row)">
                        <el-icon>
                            <Edit />
                        </el-icon>
                        编辑
                    </el-button>
                    <el-button type="danger" text class="button" @click="deletePlayers(data.row.id)">
                        <el-icon>
                            <Delete />
                        </el-icon>
                        删除
                    </el-button>
                </template>
            </el-table-column>
            <template #empty>
                无数据
            </template>
        </el-table>
        <div class="paging">
            <span>共 {{ all_total }} 条</span>
            <el-pagination background prev-text="上一页" next-text="下一页" layout="prev, pager, next" :total="all_total"
                :pager-count="5" @current-change="pageTurning" />
        </div>
        <el-dialog v-model="TypeDialog" title="编辑键值" width="500" append-to-body>
            <el-form ref="ruleFormRef" :model="TypeForm" label-width="auto" style="max-width: 600px" :rules="TypeRules">
                <el-row :gutter="10">
                    <el-col :span="12">
                        <el-form-item label="字典标签" prop="dict_label">
                            <el-input v-model="TypeForm.dict_label" placeholder="请输入字典标签" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="字典键值" prop="dict_key">
                            <el-input v-model="TypeForm.dict_key" placeholder="请输入字典键值" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="备用键值" prop="dict_key2">
                            <el-input v-model="TypeForm.dict_key2" placeholder="请输入备用键值" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="排序" prop="sort">
                            <el-input-number v-model="TypeForm.sort" :min="0" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="24">
                        <el-form-item label="外显样式" prop="display_style">
                            <el-select v-model="TypeForm.display_style" placeholder="请输入外显样式" style="width: 100%;"
                                no-data-text="无数据" no-match-text="无数据">
                                <el-option v-for="(item, index) in sys_display_style" :key="index"
                                    :label="item.dict_label" :value="item.dict_key" />
                            </el-select>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="TypeDialog = false" plain>关闭</el-button>
                    <el-button type="primary" @click="executeType(ruleFormRef)" plain>确定</el-button>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<style scoped>
.operate {
    width: 100%;
    margin-bottom: 15px;
}

.operate_button {
    width: 100px;
    height: 35px;
}

.button {
    padding: 0 3px;
}

.paging {
    margin-top: 20px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
}

.paging>span {
    font-size: 14px;
    margin-right: 18px;
    color: #484848;
}

@media screen and (max-width: 500px) {
    :deep(.el-row) {
        margin-right: 0 !important;
        margin-left: 0 !important;
    }

    :deep(.el-col) {
        flex: 0 0 100% !important;
        max-width: 100% !important;
    }

    .operate {
        display: flex;
        justify-content: center;
        margin: 10px 0;
    }

    .operate>div {
        width: 100%;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-start;
    }

    .operate_button {
        flex: 1 1 31%;
        min-width: 110px;
        height: 36px;
    }

    :deep(.el-form) {
        width: 100% !important;
        margin: 10px 0 !important;
    }

    :deep(.el-form-item__label) {
        font-size: 14px;
        line-height: 1.2;
    }

    :deep(.el-input),
    :deep(.el-select),
    :deep(.el-input-number) {
        width: 100%;
    }

    :deep(.el-table) {
        font-size: 12px;
    }

    :deep(.el-table th),
    :deep(.el-table td) {
        padding: 8px 4px !important;
    }

    .paging {
        justify-content: center;
    }

    .paging>span {
        margin-right: 8px;
        font-size: 12px;
    }

    :deep(.el-dialog) {
        width: 92% !important;
        margin: 5vh auto !important;
    }

    :deep(.el-dialog__body) {
        max-height: 70vh;
        overflow: auto;
    }
}
</style>