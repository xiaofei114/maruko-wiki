import { Client } from '@/utils/HttpClient.js'

/**
 * 获取当前配置
 */
export function getConfig() {
  return Client.get('/api/admin/config')
}

/**
 * 获取配置元数据
 */
export function getConfigMetadata() {
  return Client.get('/api/admin/config/metadata')
}

/**
 * 保存配置
 * @param {object} config - 配置对象
 */
export function saveConfig(config) {
  return Client.post('/api/admin/config', config)
}

/**
 * 获取 PM2 状态
 */
export function getPM2Status() {
  return Client.get('/api/admin/config/pm2-status')
}

/**
 * 触发重启
 */
export function triggerRestart() {
  return Client.post('/api/admin/config/trigger-restart')
}
