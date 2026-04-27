import http from '@/utils/http'

/**
 * 获取用户个人信息
 * @returns {Promise}
 */
export function getUserProfile() {
  return http.get('/api/user/profile')
}

/**
 * 获取用户上传的照片列表
 * @param {Object} params - 分页参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise}
 */
export function getUserPhotos(params = { page: 1, pageSize: 12 }) {
  return http.get('/api/user/photos', { params })
}

/**
 * 获取用户上传的音声列表
 * @param {Object} params - 分页参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise}
 */
export function getUserAudios(params = { page: 1, pageSize: 10 }) {
  return http.get('/api/user/audios', { params })
}

/**
 * 获取用户上传的企划列表
 * @param {Object} params - 分页参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise}
 */
export function getUserPlans(params = { page: 1, pageSize: 10 }) {
  return http.get('/api/user/plans', { params })
}

/**
 * 获取用户的相册列表（用于编辑照片时选择相册）
 * @returns {Promise}
 */
export function getUserAlbums() {
  return http.get('/api/user/albums')
}

/**
 * 获取用户的音声分类列表（用于编辑音声时选择分类）
 * @returns {Promise}
 */
export function getUserAudioClassifications() {
  return http.get('/api/user/audio-classifications')
}

/**
 * 更新照片信息
 * @param {number} id - 照片ID
 * @param {Object} data - 更新数据
 * @param {string} data.name - 照片名称
 * @param {number} data.albumId - 相册ID
 * @returns {Promise}
 */
export function updatePhoto(id, data) {
  return http.put(`/api/user/photos/${id}`, data)
}

/**
 * 更新音声信息
 * @param {number} id - 音声ID
 * @param {Object} data - 更新数据
 * @param {string} data.name - 音声名称
 * @param {number} data.classificationId - 分类ID
 * @returns {Promise}
 */
export function updateAudio(id, data) {
  return http.put(`/api/user/audios/${id}`, data)
}

/**
 * 更新企划信息
 * @param {number} id - 企划ID
 * @param {Object} data - 更新数据
 * @param {string} data.title - 企划标题
 * @returns {Promise}
 */
export function updatePlan(id, data) {
  return http.put(`/api/user/plans/${id}`, data)
}

/**
 * 删除照片
 * @param {number} id - 照片ID
 * @returns {Promise}
 */
export function deletePhoto(id) {
  return http.delete(`/api/user/photos/${id}`)
}

/**
 * 删除音声
 * @param {number} id - 音声ID
 * @returns {Promise}
 */
export function deleteAudio(id) {
  return http.delete(`/api/user/audios/${id}`)
}

/**
 * 删除企划
 * @param {number} id - 企划ID
 * @returns {Promise}
 */
export function deletePlan(id) {
  return http.delete(`/api/user/plans/${id}`)
}

/**
 * 更新用户头像（文件上传）
 * @param {File} file - 头像文件
 * @returns {Promise}
 */
export function updateUserAvatar(file) {
  const formData = new FormData()
  formData.append('avatar', file)
  return http.post('/api/user/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 更新用户名
 * @param {string} name - 新用户名
 * @returns {Promise}
 */
export function updateUserName(name) {
  return http.put('/api/user/name', { name })
}

/**
 * 修改用户密码
 * @param {string} newPassword - 新密码
 * @param {string} confirmPassword - 确认密码
 * @returns {Promise}
 */
export function updateUserPassword(newPassword, confirmPassword) {
  return http.put('/api/user/password', { newPassword, confirmPassword })
}

/**
 * 获取B站绑定信息
 * @returns {Promise}
 */
export function getBilibiliBindInfo() {
  return http.get('/api/user/bilibili/bind')
}

/**
 * 绑定B站账号
 * @param {string} uid - B站UID
 * @returns {Promise}
 */
export function bindBilibiliAccount(uid) {
  return http.post('/api/user/bilibili/bind', { uid })
}

/**
 * 解绑B站账号
 * @returns {Promise}
 */
export function unbindBilibiliAccount() {
  return http.delete('/api/user/bilibili/bind')
}

/**
 * 获取用户消息列表
 * @param {Object} params - 分页参数
 * @param {number} params.page - 页码
 * @param {number} params.pageSize - 每页数量
 * @returns {Promise}
 */
export function getUserNotifications(params = { page: 1, pageSize: 10 }) {
  return http.get('/api/user/notifications', { params })
}

/**
 * 标记消息为已读
 * @param {number} id - 消息ID
 * @returns {Promise}
 */
export function markNotificationAsRead(id) {
  return http.put(`/api/user/notifications/${id}/read`)
}

/**
 * 标记所有消息为已读
 * @returns {Promise}
 */
export function markAllNotificationsAsRead() {
  return http.put('/api/user/notifications/read-all')
}

/**
 * 获取未读消息数量
 * @returns {Promise}
 */
export function getUnreadNotificationCount() {
  return http.get('/api/user/notifications/unread-count')
}
