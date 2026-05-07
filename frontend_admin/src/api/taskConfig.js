import { Client } from '@/utils/HttpClient.js'

/**
 * 获取定时任务配置
 */
export function getTaskConfig() {
  return Client.get('/api/admin/task-config')
}

/**
 * 获取定时任务配置元数据
 */
export function getTaskConfigMetadata() {
  return Client.get('/api/admin/task-config/metadata')
}

/**
 * 保存定时任务配置
 * @param {object} config - 配置对象
 */
export function saveTaskConfig(config) {
  return Client.post('/api/admin/task-config', config)
}

/**
 * 重置定时任务配置为默认值
 */
export function resetTaskConfig() {
  return Client.post('/api/admin/task-config/reset')
}

/**
 * 获取可用任务列表
 */
export function getAvailableTasks() {
  return Client.get('/api/admin/task-config/tasks')
}

/**
 * 立即执行指定任务
 * @param {string} taskName - 任务名称
 */
export function executeTask(taskName) {
  return Client.post(`/api/admin/task-config/execute/${taskName}`)
}
