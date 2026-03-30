import http from '@/utils/http.js'

/**
 * 获取房间信息
 * @returns {Promise}
 */
export function getRoomInfo() {
    return http.get('/api/bilibili/room/v1/Room/get_info')
}

/**
 * 获取主播信息
 * @returns {Promise}
 */
export function getMasterInfo() {
    return http.get('/api/bilibili/live_user/v1/Master/info')
}

/**
 * 获取排行榜数据
 * @param {number} page - 页码
 * @returns {Promise}
 */
export function getTopListNew() {
    return http.get('/api/bilibili/xlive/app-room/v2/guardTab/topListNew')
}

/**
 * 获取直播记录列表
 * @param {string} month - 查询月份，格式：YYYY-MM。不传则默认查询当前月
 * @returns {Promise}
 */
export function getLiveDuration(month) {
    const params = month ? { month } : {}
    return http.get('/api/bilibili/live/duration', { params })
}