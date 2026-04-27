import { Client as http } from '@/utils/HttpClient.js'

/**
 * 获取 Redis 键列表
 * @param {string} pattern - 匹配模式，默认 *
 * @param {number} limit - 返回数量限制，默认 100
 * @returns {Promise}
 */
export function getRedisKeys(pattern = '*', limit = 100) {
    return http.get('/api/admin/redis/keys', { params: { pattern, limit } })
}

/**
 * 获取 Redis 键值详情
 * @param {string} key - Redis 键
 * @returns {Promise}
 */
export function getRedisValue(key) {
    return http.get(`/api/admin/redis/value/${encodeURIComponent(key)}`)
}

/**
 * 设置 Redis 键值
 * @param {string} key - Redis 键
 * @param {string} value - 值
 * @param {number} ttl - 过期时间（秒），-1 表示永不过期
 * @returns {Promise}
 */
export function setRedisValue(key, value, ttl = -1) {
    return http.post('/api/admin/redis/value', { key, value, ttl })
}

/**
 * 删除 Redis 键
 * @param {Array<string>} keys - 要删除的键数组
 * @returns {Promise}
 */
export function deleteRedisKeys(keys) {
    return http.delete('/api/admin/redis/keys', {}, { data: { keys } })
}

/**
 * 获取 Redis 服务器信息
 * @returns {Promise}
 */
export function getRedisInfo() {
    return http.get('/api/admin/redis/info')
}
