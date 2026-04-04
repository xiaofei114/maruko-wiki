import http from '@/utils/http'

/**
 * 获取企划文档列表
 */
export const getPlanDocuments = () => {
  return http.get('/api/plan-documents')
}

/**
 * 获取当前文档
 */
export const getCurrentPlanDocument = () => {
  return http.get('/api/plan-documents/current')
}

/**
 * 上传企划文档
 * @param {FormData} formData - 表单数据
 */
export const uploadPlanDocument = (formData) => {
  return http.post('/api/plan-documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 删除企划文档
 * @param {number} id - 文档ID
 */
export const deletePlanDocument = (id) => {
  return http.delete(`/api/plan-documents/${id}`)
}

/**
 * 设置为当前文档
 * @param {number} id - 文档ID
 */
export const setCurrentPlanDocument = (id) => {
  return http.put(`/api/plan-documents/${id}/current`)
}
