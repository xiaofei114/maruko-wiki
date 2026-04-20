import { Client } from '@/utils/HttpClient.js'

/**
 * 获取当前月份的舰礼列表
 */
export function getCurrentMonthGifts() {
  return Client.get('/api/captain-gifts/current')
}

/**
 * 获取指定年月的舰礼列表
 * @param {number} year - 年份
 * @param {number} month - 月份
 */
export function getGiftsByMonth(year, month) {
  return Client.get('/api/captain-gifts', { year, month })
}

/**
 * 添加舰礼
 * @param {object} data - 舰礼数据
 */
export function addGift(data) {
  return Client.post('/api/captain-gifts', data)
}

/**
 * 更新舰礼
 * @param {number} id - 舰礼ID
 * @param {object} data - 舰礼数据
 */
export function updateGift(id, data) {
  return Client.put(`/api/captain-gifts/${id}`, data)
}

/**
 * 删除舰礼
 * @param {number} id - 舰礼ID
 */
export function deleteGift(id) {
  return Client.delete(`/api/captain-gifts/${id}`)
}

/**
 * 批量添加舰礼
 * @param {object} data - 包含year, month, gifts的数据
 */
export function batchAddGifts(data) {
  return Client.post('/api/captain-gifts/batch', data)
}
