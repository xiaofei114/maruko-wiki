import { Client } from "@/utils/HttpClient.js"

// 获取企划文档列表（管理员用，包含所有审核状态）
export function getPlanDocuments(data) {
    return Client.get('/api/admin/plan-documents', data)
}

// 审核企划文档
export function reviewPlanDocument(documentId, isReview) {
    return Client.post(`/api/plan-documents/${documentId}/review`, {
        is_review: isReview
    })
}

// 修改企划文档信息
export function updatePlanDocument(documentId, data) {
    return Client.put(`/api/plan-documents/${documentId}`, data)
}

// 删除企划文档
export function deletePlanDocument(documentId) {
    return Client.delete(`/api/plan-documents/${documentId}`)
}

// 设置当前企划文档
export function setCurrentPlanDocument(documentId) {
    return Client.put(`/api/plan-documents/${documentId}/current`)
}
