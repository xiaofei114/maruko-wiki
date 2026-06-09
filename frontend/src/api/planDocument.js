import http from '@/utils/http'

/**
 * 获取企划列表
 */
export const getPlanList = () => {
  return http.get('/api/plan/list')
}

/**
 * 创建企划
 * @param {FormData} formData - 表单数据
 */
export const createPlan = (formData) => {
  return http.post('/api/plan', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 删除企划
 * @param {number} id - 企划ID
 */
export const deletePlan = (id) => {
  return http.delete(`/api/plan/${id}`)
}
