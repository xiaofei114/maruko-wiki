<script setup>
import { ref, onMounted, reactive } from 'vue'
import { get_getTypesPaged, get_deleteType, get_banType, get_addorupdateType } from '@/api/dictionary.js'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
const router = useRouter()
import { useUserStore } from '@/stores/user.js'

const userStore = useUserStore()
const all_total = ref(0)
const tableData = ref([])
const TypeDialog = ref(false)
const queryParameters = ref({
    page: 1,
    pageSize: 10,
    includeBanned: true,
})
const TypeForm = ref({})
const TypeRules = reactive({
    name: [{
        required: true,
        message: '请输入字典名',
        trigger: 'blur'
    }],
    dict_type: [{
        required: true,
        message: '请输入字典值',
        trigger: 'blur'
    }]
})
const ruleFormRef = ref(null)
//禁用字典
const banChange = (val, id) => {
    get_banType({
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
    get_getTypesPaged(queryParameters.value).then(res => {
        all_total.value = res.data.pagination.total
        tableData.value = res.data.data
    })
}
//数据初始化
onMounted(() => {
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
        get_deleteType(data).then(res => {
            if (res.code == 200) {
                ElMessage.success("删除成功")
                getlist()
            }
        })
    })
}

const addModifyType = data => {
    if (data.id) {
        TypeForm.value.typeId = data.id
        TypeForm.value.name = data.name
        TypeForm.value.dict_type = data.dict_type
    } else {
        TypeForm.value = {}
    }
    TypeDialog.value = true
}

const executeType = async formEl => {
    if (!formEl) return
    await formEl.validate((valid) => {
        if (valid) {
            get_addorupdateType(TypeForm.value).then(data => {
                if (data.code == 200) {
                    ElMessage.success(data.message)
                    getlist()
                }
                TypeDialog.value = false
            })
        }
    })
}

const showTpyeItem = url => {
    router.push("typeitem/" + url)
}

const copydict_type = data => {
    try {
        if (navigator.clipboard) {
            copyToClipboard(data)
        } else {
            legacyCopy(data);
        }
    } catch (err) {
        console.log(err);
        ElMessage.error("复制失败")
    }
}

// 现代浏览器的标准写法
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        ElMessage.success("复制成功")
    } catch (err) {
        legacyCopy(text);
        ElMessage.error("复制失败")
    }
}

function legacyCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        ElMessage.success('旧版方式复制成功');
    } catch (err) {
        ElMessage.error("复制失败")
    } finally {
        document.body.removeChild(textarea);
    }
}
</script>

<template>
    <div>
        <div class="operate">
            <el-button class="operate_button" type="primary" @click="addModifyType" plain>创建字典</el-button>
        </div>
        <el-table :data="tableData" style="width: 100%"
            :header-cell-style="{ 'text-align': 'center', 'color': '#000' }">
            <el-table-column align="center" prop="id" label="字典编号" width="80" />
            <el-table-column align="center" prop="name" label="字典名称" />
            <el-table-column align="center" prop="dict_type" label="字典类型">
                <template #default=data>
                    <el-link @click="showTpyeItem(data.row.dict_type)" underline="never" type="primary">
                        {{ data.row.dict_type }}
                    </el-link>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="created_at" label="创建时间" />
            <el-table-column align="center" prop="updated_at" label="更新时间" />
            <el-table-column align="center" prop="is_banned" label="是否封禁">
                <template #default=data>
                    <el-switch @change="banChange($event, data.row.id)" v-model="data.row.is_banned" />
                </template>
            </el-table-column>
            <el-table-column align="center" label="操作" width="195">
                <template #default=data>
                    <el-button type="primary" text class="button" @click="copydict_type(data.row.dict_type)">
                        <el-icon>
                            <DocumentCopy />
                        </el-icon>
                        复制
                    </el-button>
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
        <el-dialog v-model="TypeDialog" title="编辑字典" width="500" append-to-body>
            <el-form ref="ruleFormRef" :model="TypeForm" label-width="auto" style="max-width: 600px" :rules="TypeRules">
                <el-form-item label="字典名称" prop="name">
                    <el-input v-model="TypeForm.name" placeholder="请输入字典名称" />
                </el-form-item>
                <el-form-item label="字典类型" prop="dict_type">
                    <el-input v-model="TypeForm.dict_type" placeholder="请输入字典类型" />
                </el-form-item>
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
    :deep(.el-row) { margin-right: 0 !important; margin-left: 0 !important; }
    :deep(.el-col) { flex: 0 0 100% !important; max-width: 100% !important; }

    .operate { display: flex; justify-content: center; margin: 10px 0; }
    .operate > .operate_button, .operate > button { flex: 1 1 31%; min-width: 110px; height: 36px; }

    :deep(.el-form) { width: 100% !important; margin: 10px 0 !important; }
    :deep(.el-form-item__label) { font-size: 14px; line-height: 1.2; }
    :deep(.el-input), :deep(.el-select), :deep(.el-input-number) { width: 100%; }

    :deep(.el-table) { font-size: 12px; }
    :deep(.el-table th), :deep(.el-table td) { padding: 8px 4px !important; }

    .paging { justify-content: center; }
    .paging > span { margin-right: 8px; font-size: 12px; }

    :deep(.el-dialog) { width: 92% !important; margin: 5vh auto !important; }
    :deep(.el-dialog__body) { max-height: 70vh; overflow: auto; }
}
</style>