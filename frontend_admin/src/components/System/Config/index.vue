<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getConfig, getConfigMetadata, saveConfig, getPM2Status, triggerRestart } from '@/api/config.js'

// 配置数据（展平格式，所有值都是字符串）
const config = ref({})
const originalConfig = ref({})
const configMetadata = ref({ groups: [], fields: {} })

const loading = ref(false)
const saving = ref(false)
const restarting = ref(false)

// PM2 状态
const pm2Status = ref({
  running: false,
  status: 'unknown',
  restartCount: 0
})

// 数组输入相关
const arrayInputVisible = ref({})
const arrayInputValue = ref({})
const arrayInputRefs = ref({})

// 计算是否有修改（简单字符串比较）
const hasChanges = computed(() => {
  for (const key of Object.keys(config.value)) {
    if (String(config.value[key]) !== String(originalConfig.value[key])) {
      return true
    }
  }
  return false
})

// 安全获取 PM2 状态
const isPM2Running = () => pm2Status.value?.running || false

// 获取配置
const fetchConfig = async () => {
  loading.value = true
  try {
    const [configRes, metadataRes] = await Promise.all([
      getConfig(),
      getConfigMetadata()
    ])

    if (metadataRes.code === 200 && metadataRes.data) {
      configMetadata.value = metadataRes.data
    }

    if (configRes.code === 200 && configRes.data) {
      // 展平配置数据并统一转为字符串
      const flatConfig = flattenObject(configRes.data)
      config.value = objectToStrings(flatConfig)
      originalConfig.value = { ...config.value }
    }
  } catch (error) {
    ElMessage.error('获取配置失败: ' + error.message)
    console.error('获取配置错误:', error)
  } finally {
    loading.value = false
  }
}

// 将对象所有值转为字符串
const objectToStrings = (obj) => {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      result[key] = ''
    } else if (Array.isArray(value)) {
      result[key] = value.join(',')
    } else {
      result[key] = String(value)
    }
  }
  return result
}

// 展平对象
const flattenObject = (obj, prefix = '') => {
  const result = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey))
    } else {
      result[fullKey] = value
    }
  }
  return result
}

// 获取 PM2 状态
const fetchPM2Status = async () => {
  try {
    const res = await getPM2Status()
    if (res.code === 200) {
      pm2Status.value = res.data
    }
  } catch (error) {
    console.error('获取 PM2 状态失败:', error)
  }
}

// 保存配置
const handleSave = async () => {
  if (!hasChanges.value) {
    ElMessage.info('配置未修改')
    return
  }

  saving.value = true
  try {
    // 准备提交的数据（数组类型需要转为逗号分隔字符串）
    const submitConfig = {}
    for (const [key, value] of Object.entries(config.value)) {
      const fieldType = configMetadata.value.fields?.[key]?.type
      if (fieldType === 'array' && Array.isArray(value)) {
        submitConfig[key] = value.join(',')
      } else {
        submitConfig[key] = value
      }
    }

    const res = await saveConfig(submitConfig)
    if (res.code === 200) {
      ElMessage.success(res.message)
      originalConfig.value = { ...config.value }
    } else {
      ElMessage.error(res.message)
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 还原嵌套对象
const unflattenObject = (flatObj) => {
  const result = {}
  for (const [key, value] of Object.entries(flatObj)) {
    const keys = key.split('.')
    let current = result
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {}
      }
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value
  }
  return result
}

// 重启服务 - 双重确认
const handleRestart = async () => {
  if (hasChanges.value) {
    ElMessage.warning('请先保存配置再重启')
    return
  }

  if (!isPM2Running()) {
    ElMessage.error('当前未在 PM2 环境下运行，无法自动重启')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要重启服务吗？这将导致服务短暂中断。',
      '重启确认 (1/2)',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await ElMessageBox.confirm(
      `请再次确认：服务将立即重启，当前在线用户会被中断。\n\nPM2 状态: ${pm2Status.value?.status || 'unknown'}\n已重启次数: ${pm2Status.value?.restartCount || 0}`,
      '最终确认 (2/2)',
      {
        confirmButtonText: '确认重启',
        cancelButtonText: '取消',
        type: 'danger',
        confirmButtonClass: 'el-button--danger'
      }
    )

    restarting.value = true
    const res = await triggerRestart()
    if (res.code === 200) {
      ElMessage.success(res.message)
      setTimeout(() => {
        fetchPM2Status()
      }, 5000)
    } else {
      ElMessage.error(res.message)
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重启失败: ' + error.message)
    }
  } finally {
    restarting.value = false
  }
}

// 重置配置
const handleReset = () => {
  ElMessageBox.confirm(
    '确定要重置所有修改吗？未保存的更改将丢失。',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    config.value = { ...originalConfig.value }
    ElMessage.success('已重置')
  }).catch(() => {})
}

onMounted(() => {
  fetchConfig()
  fetchPM2Status()
})

// ========== 数组操作相关方法 ==========

// 获取数组项列表
const getArrayItems = (value) => {
  if (!value) return []
  return value.split(',').filter(item => item.trim() !== '')
}

// 显示数组输入框
const showArrayInput = (fieldKey) => {
  arrayInputVisible.value[fieldKey] = true
  arrayInputValue.value[fieldKey] = ''
  // 下一个 tick 聚焦输入框
  nextTick(() => {
    arrayInputRefs.value[fieldKey]?.focus()
  })
}

// 设置数组输入框 ref
const setArrayInputRef = (el, fieldKey) => {
  if (el) {
    arrayInputRefs.value[fieldKey] = el
  }
}

// 确认添加数组项
const confirmArrayItem = (fieldKey) => {
  const value = arrayInputValue.value[fieldKey]?.trim()
  if (value) {
    const currentItems = getArrayItems(config.value[fieldKey])
    if (!currentItems.includes(value)) {
      currentItems.push(value)
      config.value[fieldKey] = currentItems.join(',')
    }
  }
  arrayInputVisible.value[fieldKey] = false
  arrayInputValue.value[fieldKey] = ''
}

// 删除数组项
const removeArrayItem = (fieldKey, index) => {
  const currentItems = getArrayItems(config.value[fieldKey])
  currentItems.splice(index, 1)
  config.value[fieldKey] = currentItems.join(',')
}
</script>

<template>
  <div class="config-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">系统配置</h2>
        <el-tag v-if="hasChanges" type="warning" effect="dark" class="changes-tag">
          <el-icon><Warning /></el-icon>
          配置已修改
        </el-tag>
      </div>
      <div class="header-actions">
        <el-tag :type="isPM2Running() ? 'success' : 'danger'" class="status-tag">
          <el-icon><CircleCheck v-if="isPM2Running()" /><CircleClose v-else /></el-icon>
          PM2 {{ isPM2Running() ? '运行中' : '未运行' }}
        </el-tag>
        <el-button
          type="danger"
          :disabled="!isPM2Running() || hasChanges"
          :loading="restarting"
          @click="handleRestart"
        >
          <el-icon><RefreshRight /></el-icon>
          重启服务
        </el-button>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <span class="config-path">配置文件: configs/config.yaml</span>
      </div>
      <div class="action-right">
        <el-button @click="handleReset" :disabled="!hasChanges">
          <el-icon><RefreshLeft /></el-icon>
          重置
        </el-button>
        <el-button type="primary" @click="handleSave" :loading="saving" :disabled="!hasChanges">
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
      </div>
    </div>

    <!-- 配置表单 -->
    <div v-loading="loading" class="config-form">
      <!-- 按分组显示配置 -->
      <template v-for="group in configMetadata.groups" :key="group.name">
        <div class="config-section">
          <div class="section-header">
            <h3 class="section-title">{{ group.label }}</h3>
            <span class="section-count">{{ group.fields?.length || 0 }} 项</span>
          </div>
          <div class="section-items">
            <template v-for="fieldKey in group.fields" :key="fieldKey">
              <div class="form-item" v-if="fieldKey in config">
                <label class="item-label">
                  {{ configMetadata.fields[fieldKey]?.label || fieldKey }}
                  <el-tooltip :content="fieldKey" placement="top">
                    <el-icon class="info-icon"><InfoFilled /></el-icon>
                  </el-tooltip>
                </label>

                <div class="item-input">
                  <!-- 数字输入 -->
                  <el-input
                    v-if="configMetadata.fields[fieldKey]?.type === 'number'"
                    v-model="config[fieldKey]"
                    type="number"
                    class="input-compact"
                  />

                  <!-- 下拉选择 -->
                  <el-select
                    v-else-if="configMetadata.fields[fieldKey]?.type === 'select'"
                    v-model="config[fieldKey]"
                    class="input-compact"
                  >
                    <el-option
                      v-for="opt in configMetadata.fields[fieldKey]?.options"
                      :key="opt"
                      :label="opt"
                      :value="opt"
                    />
                  </el-select>

                  <!-- 密码输入 -->
                  <el-input
                    v-else-if="configMetadata.fields[fieldKey]?.type === 'password'"
                    v-model="config[fieldKey]"
                    type="password"
                    show-password
                    class="input-full"
                  />

                  <!-- 数组输入（标签形式） -->
                  <div
                    v-else-if="configMetadata.fields[fieldKey]?.type === 'array'"
                    class="array-input-wrapper"
                  >
                    <div class="array-tags">
                      <el-tag
                        v-for="(item, index) in getArrayItems(config[fieldKey])"
                        :key="index"
                        closable
                        @close="removeArrayItem(fieldKey, index)"
                        class="array-tag"
                      >
                        {{ item }}
                      </el-tag>
                      <el-input
                        v-if="arrayInputVisible[fieldKey]"
                        :ref="(el) => setArrayInputRef(el, fieldKey)"
                        v-model="arrayInputValue[fieldKey]"
                        size="small"
                        style="width: 100px"
                        @keyup.enter="confirmArrayItem(fieldKey)"
                        @blur="confirmArrayItem(fieldKey)"
                      />
                      <el-button
                        v-else
                        size="small"
                        @click="showArrayInput(fieldKey)"
                      >
                        <el-icon><Plus /></el-icon>
                      </el-button>
                    </div>
                  </div>

                  <!-- 布尔值 -->
                  <el-select
                    v-else-if="configMetadata.fields[fieldKey]?.type === 'boolean'"
                    v-model="config[fieldKey]"
                    style="width: 80px"
                  >
                    <el-option label="是" value="true" />
                    <el-option label="否" value="false" />
                  </el-select>

                  <!-- 文本输入 -->
                  <el-input
                    v-else
                    v-model="config[fieldKey]"
                    class="input-full"
                  />
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- 未分组的配置项 -->
      <div class="config-section" v-if="Object.keys(config).length > Object.keys(configMetadata.fields || {}).length">
        <div class="section-header">
          <h3 class="section-title">其他配置</h3>
        </div>
        <div class="section-items">
          <div
            v-for="(value, key) in config"
            :key="key"
            class="form-item"
            v-if="!configMetadata.fields?.[key]"
          >
            <label class="item-label">{{ key }}</label>
            <div class="item-input">
              <el-input v-model="config[key]" class="input-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.changes-tag {
  font-size: 13px;
  padding: 6px 12px;
}

.changes-tag :deep(.el-icon) {
  margin-right: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.status-tag {
  font-size: 13px;
  padding: 6px 12px;
}

.status-tag :deep(.el-icon) {
  margin-right: 4px;
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.config-path {
  font-size: 13px;
  color: #606266;
  font-family: 'Courier New', monospace;
}

.action-right {
  display: flex;
  gap: 8px;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 配置分组 */
.config-section {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  border-bottom: 1px solid #e4e7ed;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.section-count {
  font-size: 12px;
  color: #909399;
  background-color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
}

.section-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 0;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
}

.form-item:nth-last-child(-n+2) {
  border-bottom: none;
}

.item-label {
  flex: 0 0 140px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-icon {
  font-size: 14px;
  color: #c0c4cc;
  cursor: help;
}

.info-icon:hover {
  color: #409eff;
}

.item-input {
  flex: 1;
  min-width: 0;
}

/* 输入框宽度控制 */
.input-compact {
  width: 140px;
}

.input-full {
  width: 100%;
  max-width: 280px;
}

/* 数组输入样式 */
.array-input-wrapper {
  flex: 1;
  min-width: 0;
}

.array-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  min-height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
}

.array-tags:focus-within {
  border-color: #409eff;
}

.array-tag {
  margin: 0;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 响应式 */
@media (max-width: 768px) {
  .section-items {
    grid-template-columns: 1fr;
  }

  .form-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .item-label {
    flex: none;
  }

  .action-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .action-right {
    justify-content: flex-end;
  }
}
</style>
