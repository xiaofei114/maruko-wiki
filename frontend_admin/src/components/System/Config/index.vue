<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getConfig, getConfigMetadata, saveConfig, getPM2Status, triggerRestart } from '@/api/config.js'
import { getTaskConfig, getTaskConfigMetadata, saveTaskConfig, resetTaskConfig, executeTask } from '@/api/taskConfig.js'
import CronGenerator from '@/components/Common/CronGenerator/index.vue'

// 当前激活的配置类型
const activeTab = ref('system')

// ========== 系统配置相关 ==========
const config = ref({})
const originalConfig = ref({})
const configMetadata = ref({ groups: [], fields: {} })

// ========== 任务配置相关 ==========// 任务配置相关
const taskConfig = ref({ tasks: {} })
const originalTaskConfig = ref({ tasks: {} })
const taskConfigMetadata = ref({ tasks: {} })

// Cron 生成器相关
const cronDialogVisible = ref(false)
const currentEditingTask = ref('')
const currentCronValue = ref('0 0 * * * *')

const loading = ref(false)
const saving = ref(false)
const restarting = ref(false)
const resetting = ref(false)
const executingTasks = ref(new Set())

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

// 计算是否有修改
const hasChanges = computed(() => {
  if (activeTab.value === 'system') {
    for (const key of Object.keys(config.value)) {
      if (String(config.value[key]) !== String(originalConfig.value[key])) {
        return true
      }
    }
  } else {
    return JSON.stringify(taskConfig.value) !== JSON.stringify(originalTaskConfig.value)
  }
  return false
})

// 安全获取 PM2 状态
const isPM2Running = () => pm2Status.value?.running || false

// 获取系统配置
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

// 获取任务配置
const fetchTaskConfig = async () => {
  loading.value = true
  try {
    const [configRes, metadataRes] = await Promise.all([
      getTaskConfig(),
      getTaskConfigMetadata()
    ])

    if (metadataRes.code === 200 && metadataRes.data) {
      taskConfigMetadata.value = metadataRes.data
    }

    if (configRes.code === 200 && configRes.data) {
      // 确保数据结构完整
      if (!configRes.data.tasks) {
        configRes.data = { tasks: configRes.data }
      }
      taskConfig.value = configRes.data
      originalTaskConfig.value = JSON.parse(JSON.stringify(configRes.data))
    }
  } catch (error) {
    ElMessage.error('获取任务配置失败: ' + error.message)
    console.error('获取任务配置错误:', error)
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
    if (activeTab.value === 'system') {
      // 准备提交的数据
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
    } else {
      // 保存任务配置
      const res = await saveTaskConfig(taskConfig.value)
      if (res.code === 200) {
        ElMessage.success(res.message)
        originalTaskConfig.value = JSON.parse(JSON.stringify(taskConfig.value))
      } else {
        ElMessage.error(res.message)
      }
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

// 重启服务
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
    if (activeTab.value === 'system') {
      config.value = { ...originalConfig.value }
    } else {
      taskConfig.value = JSON.parse(JSON.stringify(originalTaskConfig.value))
    }
    ElMessage.success('已重置')
  }).catch(() => {})
}

// 重置任务配置为默认值
const handleResetTaskConfig = () => {
  ElMessageBox.confirm(
    '确定要重置为默认配置吗？这将恢复所有定时任务的默认设置。',
    '警告',
    {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'danger'
    }
  ).then(async () => {
    resetting.value = true
    try {
      const res = await resetTaskConfig()
      if (res.code === 200) {
        ElMessage.success(res.message)
        await fetchTaskConfig()
      } else {
        ElMessage.error(res.message)
      }
    } catch (error) {
      ElMessage.error('重置失败: ' + error.message)
    } finally {
      resetting.value = false
    }
  }).catch(() => {})
}

// 切换标签
const handleTabChange = (tab) => {
  activeTab.value = tab
  if (tab === 'system' && Object.keys(config.value).length === 0) {
    fetchConfig()
  } else if (tab === 'task' && Object.keys(taskConfig.value.tasks || {}).length === 0) {
    fetchTaskConfig()
  }
}

onMounted(() => {
  fetchConfig()
  fetchPM2Status()
})

// ========== 数组操作相关方法 ==========

const getArrayItems = (value) => {
  if (!value) return []
  return value.split(',').filter(item => item.trim() !== '')
}

const showArrayInput = (fieldKey) => {
  arrayInputVisible.value[fieldKey] = true
  arrayInputValue.value[fieldKey] = ''
  nextTick(() => {
    arrayInputRefs.value[fieldKey]?.focus()
  })
}

const setArrayInputRef = (el, fieldKey) => {
  if (el) {
    arrayInputRefs.value[fieldKey] = el
  }
}

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

const removeArrayItem = (fieldKey, index) => {
  const currentItems = getArrayItems(config.value[fieldKey])
  currentItems.splice(index, 1)
  config.value[fieldKey] = currentItems.join(',')
}

// ========== 任务配置相关方法 ==========

const updateTaskCron = (taskName, value) => {
  if (taskConfig.value.tasks && taskConfig.value.tasks[taskName]) {
    taskConfig.value.tasks[taskName].cron = value
  }
}

const updateTaskEnabled = (taskName, value) => {
  if (taskConfig.value.tasks && taskConfig.value.tasks[taskName]) {
    taskConfig.value.tasks[taskName].enabled = value
  }
}

// 任务名称显示映射


// 获取任务显示名称
const getTaskDisplayName = (taskName) => {
  return taskConfigMetadata.value.tasks?.[taskName]?.name || taskName
}

// 初始化任务配置（如果不存在）
const initTaskConfig = (taskName) => {
  if (!taskConfig.value.tasks) {
    taskConfig.value.tasks = {}
  }
  if (!taskConfig.value.tasks[taskName]) {
    taskConfig.value.tasks[taskName] = {
      cron: '',
      enabled: true,
      description: ''
    }
  }
}

// 打开 Cron 生成器
const openCronGenerator = (taskName) => {
  currentEditingTask.value = taskName
  currentCronValue.value = taskConfig.value.tasks?.[taskName]?.cron || '0 0 * * * *'
  cronDialogVisible.value = true
}

// 确认使用生成的 Cron 表达式
const handleCronConfirm = (cron) => {
  if (currentEditingTask.value && taskConfig.value.tasks?.[currentEditingTask.value]) {
    taskConfig.value.tasks[currentEditingTask.value].cron = cron
  }
  cronDialogVisible.value = false
  ElMessage.success('Cron 表达式已应用')
}

// 立即执行任务
const handleExecuteTask = async (taskName) => {
  if (executingTasks.value.has(taskName)) {
    ElMessage.warning('任务正在执行中，请稍后再试')
    return
  }

  // 二次确认
  const taskDisplayName = getTaskDisplayName(taskName)
  ElMessageBox.confirm(
    `确定要立即执行任务「${taskDisplayName}」吗？`,
    '确认执行',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      executingTasks.value.add(taskName)
      const res = await executeTask(taskName)

      if (res.code === 200) {
        ElMessage.success(res.message)
      } else {
        ElMessage.error(res.message)
      }
    } catch (error) {
      ElMessage.error('执行任务失败: ' + error.message)
    } finally {
      executingTasks.value.delete(taskName)
    }
  }).catch(() => {
    // 取消执行
  })
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

    <!-- 标签切换 -->
    <div class="tab-bar">
      <el-radio-group v-model="activeTab" @change="handleTabChange">
        <el-radio-button label="system">系统配置</el-radio-button>
        <el-radio-button label="task">定时任务</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <span class="config-path">
          配置文件: configs/{{ activeTab === 'system' ? 'config.yaml' : 'task.yaml' }}
        </span>
      </div>
      <div class="action-right">
        <el-button 
          v-if="activeTab === 'task'" 
          @click="handleResetTaskConfig" 
          :loading="resetting"
        >
          <el-icon><RefreshLeft /></el-icon>
          恢复默认
        </el-button>
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

    <!-- 系统配置表单 -->
    <div v-if="activeTab === 'system'" v-loading="loading" class="config-form">
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
                  <el-input
                    v-if="configMetadata.fields[fieldKey]?.type === 'number'"
                    v-model="config[fieldKey]"
                    type="number"
                    class="input-compact"
                  />

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

                  <el-input
                    v-else-if="configMetadata.fields[fieldKey]?.type === 'password'"
                    v-model="config[fieldKey]"
                    type="password"
                    show-password
                    class="input-full"
                  />

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

                  <el-select
                    v-else-if="configMetadata.fields[fieldKey]?.type === 'boolean'"
                    v-model="config[fieldKey]"
                    style="width: 80px"
                  >
                    <el-option label="是" value="true" />
                    <el-option label="否" value="false" />
                  </el-select>

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
    </div>

    <!-- 定时任务配置表单 -->
    <div v-else v-loading="loading" class="config-form">
      <div class="config-section">
        <div class="section-header">
          <h3 class="section-title">定时任务配置</h3>
          <span class="section-count">{{ Object.keys(taskConfigMetadata.tasks || {}).length }} 个任务</span>
        </div>
        <div class="task-items">
          <div 
            v-for="(task, taskName) in taskConfigMetadata.tasks" 
            :key="taskName"
            class="task-item"
          >
            <div class="task-header">
              <div class="task-name">
                <el-tag :type="taskConfig.tasks?.[taskName]?.enabled !== false ? 'success' : 'info'" size="small">
                  {{ taskConfig.tasks?.[taskName]?.enabled !== false ? '启用' : '禁用' }}
                </el-tag>
                <span class="task-title">{{ getTaskDisplayName(taskName) }}</span>
                <span class="task-desc">{{ task.description }}</span>
              </div>
              <el-button
                type="warning"
                size="small"
                :loading="executingTasks.has(taskName)"
                @click="handleExecuteTask(taskName)"
              >
                <el-icon><VideoPlay /></el-icon>
                立即执行
              </el-button>
            </div>
            <div class="task-config">
              <div class="form-item">
                <label class="item-label">Cron 表达式</label>
                <div class="item-input">
                  <el-input
                    v-model="taskConfig.tasks[taskName].cron"
                    @focus="initTaskConfig(taskName)"
                    placeholder="0 0 3 * * *"
                    class="input-cron"
                  />
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="openCronGenerator(taskName)"
                    class="cron-btn"
                  >
                    生成器
                  </el-button>
                </div>
              </div>
              <div class="form-item">
                <label class="item-label">启用状态</label>
                <div class="item-input">
                  <el-switch
                    v-model="taskConfig.tasks[taskName].enabled"
                    @change="initTaskConfig(taskName)"
                    :active-value="true"
                    :inactive-value="false"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Cron 生成器弹窗 -->
      <el-dialog
        v-model="cronDialogVisible"
        title="Cron 表达式生成器"
        width="700px"
        destroy-on-close
      >
        <CronGenerator
          v-model="currentCronValue"
          @confirm="handleCronConfirm"
        />
      </el-dialog>
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

/* 标签切换 */
.tab-bar {
  margin-bottom: 16px;
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
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-cron {
  flex: 1;
}

.cron-btn {
  flex-shrink: 0;
}

/* 输入框宽度控制 */
.input-compact {
  width: 140px;
}

.input-full {
  width: 100%;
  max-width: 280px;
}

.input-cron {
  width: 180px;
  font-family: 'Courier New', monospace;
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

/* 任务配置样式 */
.task-items {
  display: flex;
  flex-direction: column;
}

.task-item {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.task-item:last-child {
  border-bottom: none;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.task-desc {
  font-size: 13px;
  color: #909399;
}

.task-config {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding-left: 0;
}

.task-config .form-item {
  border: none;
  padding: 8px 0;
}

/* Cron 帮助 */
.cron-help {
  padding: 16px;
}

.cron-format {
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.cron-format code {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #409eff;
}

.cron-examples {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.example-item {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}

.example-item code {
  font-family: 'Courier New', monospace;
  background-color: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  color: #606266;
  min-width: 140px;
}

.example-item span {
  color: #909399;
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

  .task-config {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
