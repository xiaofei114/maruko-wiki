import http from '@/utils/http'

export function getPlanList(params = {}) {
    return http.get('/api/plan/list', { params })
}

export function createPlan(formData) {
    return http.post('/api/plan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export function deletePlan(id) {
    return http.delete(`/api/plan/${id}`)
}
