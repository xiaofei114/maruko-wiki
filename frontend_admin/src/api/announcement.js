import { Client } from "@/utils/HttpClient.js"

// 获取公告列表
export function getAnnouncements() {
    return Client.get('/api/announcements')
}

// 创建公告
export function createAnnouncement(data) {
    return Client.post('/api/admin/announcements', data)
}

// 更新公告
export function updateAnnouncement(id, data) {
    return Client.put(`/api/admin/announcements/${id}`, data)
}

// 删除公告
export function deleteAnnouncement(id) {
    return Client.delete(`/api/admin/announcements/${id}`)
}
