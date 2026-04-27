<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Search, Refresh, InfoFilled, ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import {
  getRedisKeys,
  getRedisValue,
  setRedisValue,
  deleteRedisKeys,
  getRedisInfo
} from '@/api/redisAdmin.js'

// 数据
const loading = ref(false)
const keysList = ref([])
const treeData = ref([])
const searchPattern = ref('*')
const searchLimit = ref(100)
const redisInfo = ref(null)
const infoLoading = ref(false)

// 编辑对话框
const editDialogVisible = ref(false)
const editForm = ref({
  key: '',
  value: '',
  ttl: -1,
  type: 'string'
})
const editLoading = ref(false)

// 详情对话框
const detailDialogVisible = ref(false)
const detailData = ref(null)
const detailLoading = ref(false)

// 将扁平键列表转换为树形结构
const buildTree = (keys) => {
  const root = { key: 'root', label: 'Redis Keys', children: [], isFolder: true, level: -1, expanded: true }

  keys.forEach(item => {
    const parts = item.key.split(':')
    let current = root
    let currentPath = ''

    parts.forEach((part, index) => {
      currentPath = currentPath ? `${currentPath}:${part}` : part

      // 检查是否已存在该节点
      let existingNode = current.children.find(child => child.label === part)

      if (!existingNode) {
        const isLast = index === parts.length - 1
        existingNode = {
          key: currentPath,
          label: part,
          fullKey: item.key,
          isFolder: !isLast,
          children: [],
          level: index,
          expanded: false, // 默认不展开
          // 只有叶子节点才有这些属性
          ...(isLast ? {
            type: item.type,
            size: item.size,
            ttl: item.ttl,
            preview: item.preview
          } : {})
        }
        current.children.push(existingNode)
      }

      current = existingNode
    })
  })

  // 计算每个文件夹的子键数量
  const countKeys = (node) => {
    if (!node.isFolder) return 1
    let count = 0
    if (node.children) {
      for (const child of node.children) {
        count += countKeys(child)
      }
    }
    node.keyCount = count
    return count
  }

  // 对子节点进行排序：文件夹在前，然后按字母顺序
  const sortNodes = (node) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1
        if (!a.isFolder && b.isFolder) return 1
        return a.label.localeCompare(b.label)
      })
      node.children.forEach(sortNodes)
    }
  }

  root.children.forEach(countKeys)
  sortNodes(root)

  // 默认展开第一层
  root.children.forEach(child => child.expanded = true)

  return root.children
}

// 将树形结构扁平化为表格数据
const flattenTree = (nodes, result = []) => {
  nodes.forEach(node => {
    result.push(node)
    if (node.isFolder && node.expanded && node.children) {
      flattenTree(node.children, result)
    }
  })
  return result
}

// 表格显示的数据
const tableData = computed(() => {
  return flattenTree(treeData.value)
})

// 切换展开/折叠
const toggleExpand = (node) => {
  node.expanded = !node.expanded
}

// 获取所有叶子节点（实际的键）
const getLeafNodes = (nodes) => {
  const leaves = []
  const traverse = (node) => {
    if (!node.isFolder) {
      leaves.push(node)
    }
    if (node.children) {
      node.children.forEach(traverse)
    }
  }
  nodes.forEach(traverse)
  return leaves
}

// 获取 Redis 键列表
const fetchKeys = async () => {
  loading.value = true
  try {
    const res = await getRedisKeys(searchPattern.value, searchLimit.value)
    if (res.code === 200) {
      keysList.value = res.data.keys || []
      treeData.value = buildTree(keysList.value)
    } else {
      ElMessage.error(res.message || '获取 Redis 键列表失败')
    }
  } catch (error) {
    console.error('获取 Redis 键列表失败:', error)
    ElMessage.error('获取 Redis 键列表失败')
  } finally {
    loading.value = false
  }
}

// 获取 Redis 信息
const fetchRedisInfo = async () => {
  infoLoading.value = true
  try {
    const res = await getRedisInfo()
    if (res.code === 200) {
      redisInfo.value = res.data
    } else {
      ElMessage.error(res.message || '获取 Redis 信息失败')
    }
  } catch (error) {
    console.error('获取 Redis 信息失败:', error)
    ElMessage.error('获取 Redis 信息失败')
  } finally {
    infoLoading.value = false
  }
}

// 查看键值详情
const viewDetail = async (row) => {
  if (row.isFolder) return
  detailLoading.value = true
  detailDialogVisible.value = true
  try {
    const res = await getRedisValue(row.fullKey)
    if (res.code === 200) {
      detailData.value = res.data
    } else {
      ElMessage.error(res.message || '获取键值详情失败')
      detailDialogVisible.value = false
    }
  } catch (error) {
    console.error('获取键值详情失败:', error)
    ElMessage.error('获取键值详情失败')
    detailDialogVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

// 打开编辑对话框
const openEditDialog = async (row) => {
  if (row.isFolder) return
  editLoading.value = true
  editDialogVisible.value = true
  try {
    const res = await getRedisValue(row.fullKey)
    if (res.code === 200) {
      const data = res.data
      editForm.value = {
        key: data.key,
        value: typeof data.value === 'object' ? JSON.stringify(data.value, null, 2) : String(data.value),
        ttl: data.ttl,
        type: data.type
      }
    } else {
      ElMessage.error(res.message || '获取键值失败')
      editDialogVisible.value = false
    }
  } catch (error) {
    console.error('获取键值失败:', error)
    ElMessage.error('获取键值失败')
    editDialogVisible.value = false
  } finally {
    editLoading.value = false
  }
}

// 保存编辑
const saveEdit = async () => {
  editLoading.value = true
  try {
    const res = await setRedisValue(editForm.value.key, editForm.value.value, editForm.value.ttl)
    if (res.code === 200) {
      ElMessage.success('保存成功')
      editDialogVisible.value = false
      fetchKeys()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    editLoading.value = false
  }
}

// 删除键
const deleteKey = async (row) => {
  if (row.isFolder) return
  try {
    await ElMessageBox.confirm(
      `确定要删除键 "${row.fullKey}" 吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await deleteRedisKeys([row.fullKey])
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchKeys()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 删除文件夹（删除该前缀下的所有键）
const deleteFolder = async (row) => {
  try {
    // 获取该文件夹下的所有键
    const leafNodes = getLeafNodes([row])
    if (leafNodes.length === 0) {
      ElMessage.warning('该文件夹下没有键')
      return
    }

    await ElMessageBox.confirm(
      `确定要删除 "${row.key}" 下的 ${leafNodes.length} 个键吗？此操作不可恢复！`,
      '确认批量删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const keys = leafNodes.map(n => n.fullKey)
    const res = await deleteRedisKeys(keys)
    if (res.code === 200) {
      ElMessage.success(`成功删除 ${res.data.deletedCount} 个键`)
      fetchKeys()
    } else {
      ElMessage.error(res.message || '批量删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

// 格式化 TTL 显示
const formatTTL = (ttl) => {
  if (ttl === -1) return '永不过期'
  if (ttl === -2) return '已过期'
  if (ttl < 60) return `${ttl} 秒`
  if (ttl < 3600) return `${Math.floor(ttl / 60)} 分钟`
  if (ttl < 86400) return `${Math.floor(ttl / 3600)} 小时`
  return `${Math.floor(ttl / 86400)} 天`
}

// 格式化大小显示
const formatSize = (size) => {
  if (size === null || size === undefined) return '-'
  if (size === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let value = size
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }
  return `${value.toFixed(2)} ${units[index]}`
}

// 格式化值预览
const formatPreview = (preview) => {
  if (!preview) return '-'
  if (preview.length > 100) return preview.substring(0, 100) + '...'
  return preview
}

// 获取缩进样式
const getIndentStyle = (level) => {
  return { paddingLeft: `${level * 20 + 10}px` }
}

onMounted(() => {
  fetchKeys()
  fetchRedisInfo()
})
</script>

<template>
  <div class="redis-admin">
    <!-- Redis 信息卡片 -->
    <el-card class="info-card" v-loading="infoLoading">
      <template #header>
        <div class="card-header">
          <span><el-icon>
              <InfoFilled />
            </el-icon> Redis 服务器信息</span>
          <el-button :icon="Refresh" circle size="small" @click="fetchRedisInfo" />
        </div>
      </template>
      <div v-if="redisInfo" class="info-grid">
        <div class="info-item">
          <span class="info-label">版本:</span>
          <span class="info-value">{{ redisInfo.version }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">模式:</span>
          <span class="info-value">{{ redisInfo.mode }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">角色:</span>
          <span class="info-value">{{ redisInfo.role }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">内存使用:</span>
          <span class="info-value">{{ redisInfo.usedMemory }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">内存峰值:</span>
          <span class="info-value">{{ redisInfo.usedMemoryPeak }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">键数量:</span>
          <span class="info-value">{{ redisInfo.keyCount }}</span>
        </div>
        <div class="info-item">
          <span class="info-label">运行时间:</span>
          <span class="info-value">{{ Math.floor(redisInfo.uptimeInSeconds / 86400) }} 天</span>
        </div>
        <div class="info-item">
          <span class="info-label">总连接数:</span>
          <span class="info-value">{{ redisInfo.totalConnections }}</span>
        </div>
      </div>
    </el-card>

    <!-- 搜索和操作栏 -->
    <el-card class="search-card">
      <div class="search-bar">
        <el-input v-model="searchPattern" placeholder="输入匹配模式，如: user:* 或 *" style="width: 300px"
          @keyup.enter="fetchKeys">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-input-number v-model="searchLimit" :min="10" :max="1000" :step="10" placeholder="数量限制"
          style="width: 120px; margin-left: 10px" />
        <el-button type="primary" :icon="Search" @click="fetchKeys" style="margin-left: 10px">
          搜索
        </el-button>
        <el-button :icon="Refresh" @click="fetchKeys">刷新</el-button>
      </div>
    </el-card>

    <!-- 树形表格 -->
    <el-card class="table-card" v-loading="loading">
      <el-table :data="tableData" style="width: 100%" border>
        <el-table-column label="键" min-width="280">
          <template #default="{ row }">
            <div class="key-cell" :style="getIndentStyle(row.level)">
              <!-- 展开/折叠按钮 -->
              <span v-if="row.isFolder" class="expand-btn" @click.stop="toggleExpand(row)">
                <el-icon v-if="row.expanded">
                  <ArrowDown />
                </el-icon>
                <el-icon v-else>
                  <ArrowRight />
                </el-icon>
              </span>
              <span v-else class="expand-placeholder"></span>

              <!-- 键名 -->
              <span class="key-name" :class="{ 'is-folder': row.isFolder }">
                {{ row.label }}
                <span v-if="row.isFolder" class="key-count">({{ row.keyCount }})</span>
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag v-if="!row.isFolder && row.type" :type="row.type === 'string' ? 'primary' : 'success'" size="small">
              {{ row.type }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="值" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="!row.isFolder && row.preview" class="value-preview">
              {{ formatPreview(row.preview) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="大小" width="120">
          <template #default="{ row }">
            <span v-if="!row.isFolder && row.size !== undefined">
              {{ formatSize(row.size) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="TTL" width="120">
          <template #default="{ row }">
            <el-tag v-if="!row.isFolder && row.ttl !== undefined" :type="row.ttl === -1 ? 'info' : 'warning'"
              size="small">
              {{ formatTTL(row.ttl) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <template v-if="!row.isFolder">
              <el-button type="primary" size="small" @click="viewDetail(row)">查看</el-button>
              <el-button type="warning" size="small" @click="openEditDialog(row)">编辑</el-button>
              <el-button type="danger" size="small" :icon="Delete" @click="deleteKey(row)" />
            </template>
            <template v-else>
              <el-button type="danger" size="small" @click="deleteFolder(row)">
                删除全部
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 编辑对话框 -->
    <el-dialog v-model="editDialogVisible" title="编辑 Redis 键值" width="600px" :close-on-click-modal="false">
      <el-form :model="editForm" label-width="80px" v-loading="editLoading">
        <el-form-item label="键名">
          <el-input v-model="editForm.key" disabled />
        </el-form-item>
        <el-form-item label="类型">
          <el-tag>{{ editForm.type }}</el-tag>
        </el-form-item>
        <el-form-item label="值">
          <el-input v-model="editForm.value" type="textarea" :rows="10" placeholder="输入值..." />
        </el-form-item>
        <el-form-item label="过期时间">
          <el-input-number v-model="editForm.ttl" :min="-1" style="width: 200px" />
          <span style="margin-left: 10px; color: #909399;">秒 (-1 表示永不过期)</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="editLoading">保存</el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="键值详情" width="700px">
      <div v-loading="detailLoading" v-if="detailData">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="键名">{{ detailData.key }}</el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag>{{ detailData.type }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="大小">{{ detailData.size }}</el-descriptions-item>
          <el-descriptions-item label="过期时间">
            {{ formatTTL(detailData.ttl) }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="detail-value">
          <div class="detail-label">值:</div>
          <pre class="value-content">{{ typeof detailData.value === 'object' ? JSON.stringify(detailData.value, null, 2) :
            detailData.value }}</pre>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.redis-admin {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #303133;
}

.page-header .subtitle {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.page-header .prefix-info {
  margin: 8px 0 0 0;
  font-size: 12px;
  color: #606266;
}

.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
}

.card-header .el-icon {
  margin-right: 5px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
}

.info-label {
  color: #909399;
  font-size: 12px;
  margin-bottom: 4px;
}

.info-value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.search-card {
  margin-bottom: 20px;
}

.search-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.table-card {
  min-height: 400px;
}

/* 键单元格样式 */
.key-cell {
  display: flex;
  align-items: center;
}

.expand-btn {
  cursor: pointer;
  padding: 4px;
  margin-right: 4px;
  color: #909399;
  display: flex;
  align-items: center;
}

.expand-btn:hover {
  color: #409eff;
}

.expand-placeholder {
  width: 24px;
  margin-right: 4px;
}

.key-name {
  font-family: monospace;
}

.key-name.is-folder {
  font-weight: 500;
  color: #303133;
}

.key-count {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

.value-preview {
  color: #606266;
  font-size: 13px;
}

.detail-value {
  margin-top: 20px;
}

.detail-label {
  font-weight: 500;
  margin-bottom: 10px;
  color: #303133;
}

.value-content {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  max-height: 400px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.5;
}
</style>
