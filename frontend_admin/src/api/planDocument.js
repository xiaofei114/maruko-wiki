import { Client } from "@/utils/HttpClient.js"

// 获取企划列表（管理员用）
export function getPlanList(data) {
    return Client.get('/api/admin/plan/list', data)
}

// 更新企划
export function updatePlan(planId, data) {
    return Client.put(`/api/plan/${planId}`, data)
}

// 删除企划
export function deletePlan(planId) {
    return Client.delete(`/api/plan/${planId}`)
}
