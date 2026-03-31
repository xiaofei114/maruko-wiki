import http from '@/utils/http'

/**
 * 获取公告列表
 * @returns {Promise<{success: boolean, message: string, data: Array}>}
 */
export function getAnnouncements() {
    return http.get('/api/announcements')
}

/**
 * 创建公告（管理员）
 * @param {Object} data - 公告数据
 * @param {string} data.title - 公告标题
 * @param {string} data.content - 公告内容（HTML字符串）
 * @param {string} [data.author] - 作者名称，默认"管理员"
 * @param {boolean} [data.isPinned] - 是否置顶，默认false
 * @param {string} [data.category] - 分类：system/feature/update/holiday，默认"system"
 * @returns {Promise<{success: boolean, message: string, data: {id: number, title: string}}>}
 */
export function createAnnouncement(data) {
    return http.post('/api/admin/announcements', data)
}

/**
 * 更新公告（管理员）
 * @param {number} id - 公告ID
 * @param {Object} data - 公告数据
 * @param {string} [data.title] - 公告标题
 * @param {string} [data.content] - 公告内容（HTML字符串）
 * @param {string} [data.author] - 作者名称
 * @param {boolean} [data.isPinned] - 是否置顶
 * @param {string} [data.category] - 分类
 * @returns {Promise<{success: boolean, message: string}>}
 */
export function updateAnnouncement(id, data) {
    return http.put(`/api/admin/announcements/${id}`, data)
}

/**
 * 删除公告（管理员）
 * @param {number} id - 公告ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export function deleteAnnouncement(id) {
    return http.delete(`/api/admin/announcements/${id}`)
}
