import http from '@/utils/http.js'

/**
 * 获取主播统计数据
 * @param {string} range - 时间范围：'week'(1周), 'month'(1月), 'year'(1年)
 * @returns {Promise}
 */
export function getAnchorStats(range = 'month') {
    return http.get('/api/anchor-stats', { params: { range } })
}

/**
 * 获取最新的主播统计数据
 * @returns {Promise}
 */
export function getLatestAnchorStats() {
    return http.get('/api/anchor-stats/latest')
}

/**
 * 获取本月最高舰长数
 * @returns {Promise}
 */
export function getCurrentMonthMaxCaptainCount() {
    return http.get('/api/anchor-stats/max-captain')
}
