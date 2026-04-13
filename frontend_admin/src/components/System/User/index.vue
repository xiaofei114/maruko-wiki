<script setup>
import { ref, reactive, onMounted } from 'vue'
import { get_userlist, api_setBanStatus, api_resetPassword, api_updatePermission, user_deleteUser } from "@/api/user.js"
import { ElMessageBox, ElMessage } from 'element-plus'
import { getSysDict } from '@/utils/sys.js'
import { useUserStore } from '@/stores/user.js'
import { Sort, Edit, Delete, Key } from '@element-plus/icons-vue'

const userStore = useUserStore()
const { sys_user_permission } = await getSysDict('sys_user_permission')

const props = defineProps({
    userName: String,
})

// 格式化时间戳
const formatTime = (timestamp) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const all_total = ref(0)
const tableData = ref([])
const modifyUserDialog = ref(false)
const modifyUserForm = ref(null)
const queryParameters = ref({
    page: 1,
    pageSize: 10,
    sortBy: 'permission',
    sortOrder: 'asc',
    showSensitive: true, // 是否显示敏感字段
})
const ruleFormRef = ref(null)
//封禁单个用户
const banChange = (val, data) => {
    const state = val ? 1 : 0
    api_setBanStatus({
        id: data.id,
        isBanned: state
    })
}
//翻页方法
const pageTurning = pageNum => {
    queryParameters.value.page = pageNum
    getlist()
}
//获取用户列表
const getlist = () => {
    get_userlist(queryParameters.value).then(res => {
        all_total.value = res.data.pagination.total
        tableData.value = res.data.data.map(item => {
            item.is_banned = item.is_banned === 1 ? true : false
            return { ...item }
        })
    })
}
//数据初始化
onMounted(() => {
    getlist()
})

//删除用户
const deletePlayers = data => {
    ElMessageBox.confirm('这将不可恢复!', "警告！", {
        cancelButtonText: "取消",
        confirmButtonText: "确定",
    }).then(() => {
        user_deleteUser(data.id).then(msg => {
            if (msg.code == 200) {
                ElMessage.success("删除成功")
                getlist()
            }
        })
    })
}

//重置密码
const resetPassword = data => {
    ElMessageBox.confirm('确定要重置该用户的密码吗？', "提示", {
        cancelButtonText: "取消",
        confirmButtonText: "确定",
    }).then(() => {
        api_resetPassword(data.id).then(res => {
            if (res.code == 200) {
                ElMessage.success("重置成功")
            }
        })
    })
}

const modifyPermissions = data => {
    modifyUserForm.value = {
        permission: data.permission.toString(),
        id: data.id
    }
    modifyUserDialog.value = true
}

// 切换排序顺序
const toggleSortOrder = () => {
    queryParameters.value.sortOrder = queryParameters.value.sortOrder === 'asc' ? 'desc' : 'asc'
    getlist()
}

const sure_modifyPermissions = () => {
    api_updatePermission({
        account: modifyUserForm.value.id,
        newPermission: modifyUserForm.value.permission
    }).then(data => {
        if (data.code == 200) {
            ElMessage.success("修改成功")
            getlist()
        }
        modifyUserDialog.value = false
    })
}
</script>

<template>
    <div>
        <div class="operate">
            <div>
                <el-select v-model="queryParameters.sortBy" size="small" style="width: 140px; margin-right: 10px"
                    @change="getlist">
                    <el-option label="按权限排序" value="permission" />
                    <el-option label="按注册时间排序" value="create_time" />
                </el-select>
                <el-button size="small" @click="toggleSortOrder" style="margin-right: 10px">
                    {{ queryParameters.sortOrder === 'asc' ? '升序' : '降序' }}
                    <el-icon>
                        <Sort />
                    </el-icon>
                </el-button>
                <el-button class="operate_button" type="warning" @click="queryParameters.showSensitive = false" plain
                    v-if="queryParameters.showSensitive">隐藏时间</el-button>
                <el-button class="operate_button" type="success" @click="queryParameters.showSensitive = true" plain
                    v-else>显示时间</el-button>
            </div>
        </div>
        <el-table :data="tableData" style="width: 100%"
            :header-cell-style="{ 'text-align': 'center', 'color': '#000' }">
            <el-table-column align="center" type="index"
                :index="(queryParameters.page - 1) * queryParameters.pageSize + 1" label="排序" width="60" />
            <el-table-column align="center" prop="name" label="名字" />
            <el-table-column align="center" prop="account_number" label="邮箱" />
            <el-table-column align="center" prop="permission" label="权限">
                <template #default="data">
                    <dict-tag :value="data.row.permission" :data="sys_user_permission" />
                </template>
            </el-table-column>
            <el-table-column align="center" prop="create_time" label="注册时间" v-if="queryParameters.showSensitive">
                <template #default="data">
                    {{ formatTime(data.row.create_time) }}
                </template>
            </el-table-column>
            <el-table-column align="center" prop="is_banned" label="是否封禁">
                <template #default=data>
                    <el-switch :disabled="data.row.permission === 1" @change="banChange($event, data.row)"
                        v-model="data.row.is_banned" />
                </template>
            </el-table-column>
            <el-table-column align="center" label="操作" width="300">
                <template #default=data>
                    <el-button type="primary" text class="button" @click="modifyPermissions(data.row)"
                        :disabled="data.row.permission === 1">
                        <el-icon>
                            <Edit />
                        </el-icon>
                        修改权限
                    </el-button>
                    <el-button type="warning" text class="button" @click="resetPassword(data.row)">
                        <el-icon>
                            <Key />
                        </el-icon>
                        重置密码
                    </el-button>
                    <el-button type="danger" text class="button" @click="deletePlayers(data.row)"
                        :disabled="data.row.permission === 1">
                        <el-icon>
                            <Delete />
                        </el-icon>
                        删除用户
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
        <el-dialog v-model="modifyUserDialog" title="修改权限" width="400" append-to-body>
            <el-form-item label="用户权限">
                <el-select v-model="modifyUserForm.permission" placeholder="请选择用户权限" no-data-text="无数据"
                    no-match-text="无数据">
                    <el-option v-for="(item, index) in sys_user_permission" :key="index" :label="item.dict_label"
                        :value="item.dict_key" />
                </el-select>
            </el-form-item>
            <template #footer>
                <div class="dialog-footer">
                    <el-button @click="modifyUserDialog = false" plain>关闭</el-button>
                    <el-button type="primary" @click="sure_modifyPermissions" plain>确定</el-button>
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