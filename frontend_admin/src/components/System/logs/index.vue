<script setup>
import { ref, onMounted } from 'vue'
import { get_QueryLogs } from '@/api/logs.js'

const all_total = ref(0)
const tableData = ref([])
const queryParameters = ref({
    page: 1,
    pageSize: 10,
    showUserIp: false,
})

const format = data => {
    try {
        return JSON.parse(data)
    } catch (error) {
        return { data }
    }
}

const operate = () => {
    queryParameters.value.showUserIp = !queryParameters.value.showUserIp
    getlist()
}

//翻页方法
const pageTurning = pageNum => {
    queryParameters.value.page = pageNum
    getlist()
}

//获取日志列表
const getlist = () => {
    get_QueryLogs(queryParameters.value).then(res => {
        all_total.value = res.data.pagination.total
        tableData.value = res.data.data
    })
}

//数据初始化
onMounted(() => {
    getlist()
})
</script>

<template>
    <div>
        <div class="operate">
            <el-button class="operate_button" :type="queryParameters.showUserIp ? 'success' : 'danger'" @click="operate"
                plain>
                {{ queryParameters.showUserIp ? '隐藏用户IP' : '显示用户IP' }}
            </el-button>
        </div>
        <el-table :data="tableData" style="width: 100%"
            :header-cell-style="{ 'text-align': 'center', 'color': '#000' }">
            <el-table-column align="center" type="index"
                :index="(queryParameters.page - 1) * queryParameters.pageSize + 1" label="排序" width="60" />
            <el-table-column align="center" prop="log_name" label="操作名称">
                <template #default=data>
                    {{ data.row.log_name ?? '-' }}
                </template>
            </el-table-column>
            <el-table-column align="center" prop="log_content" label="接口名称" width="350">
                <template #default=data>
                    {{ data.row.log_type }} {{ data.row.log_content?.split('?')[0]?.replace('/api', '') }}
                </template>
            </el-table-column>
            <el-table-column align="center" prop="user_name" label="操作用户" />
            <el-table-column align="center" prop="request_params" label="发送数据">
                <template #default=data>
                    <div style="text-align: left;">
                        <json-viewer :value="format(data.row.request_params)" :expand-depth="0" boxed />
                    </div>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="log_return" label="返回数据">
                <template #default=data>
                    <div style="text-align: left;">
                        <json-viewer :value="format(data.row.log_return)" :expand-depth="0" boxed />
                    </div>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="user_ip" label="用户IP" v-if="queryParameters.showUserIp" />
            <el-table-column align="center" prop="created_at" label="操作时间" />
            <template #empty>
                无数据
            </template>
        </el-table>
        <div class="paging">
            <span>共 {{ all_total }} 条</span>
            <el-pagination background prev-text="上一页" next-text="下一页" layout="prev, pager, next" :total="all_total"
                :pager-count="5" @current-change="pageTurning" />
        </div>
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

:deep(.json-tooltip) {
    .tree-line {
        line-height: 1.5;
        white-space: nowrap;
    }

    .arrow {
        display: inline-block;
        margin-right: 4px;
        transition: transform 0.2s;

        &:hover {
            color: #409EFF;
        }
    }

    pre {
        margin: 0;
        padding: 0;
    }
}

/* 隐藏所有浏览器滚动条但保留滚动功能 */
:deep(.hidden-scrollbar) {
    scrollbar-width: none;
    -ms-overflow-style: none;
}

:deep(.hidden-scrollbar::-webkit-scrollbar) {
    display: none;
}

:deep(.jv-container .jv-code) {
    padding: 5px 10px;
}
</style>