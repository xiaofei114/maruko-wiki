import request from '@/utils/http'

// ==================== 收藏夹管理接口 ====================

/**
 * 获取收藏夹列表（带视频数量和最新封面）
 */
export function getFavoriteList() {
  return request({
    url: '/api/video-favorite/favorites',
    method: 'get'
  })
}

/**
 * 获取单个收藏夹详情
 * @param {number} id - 收藏夹ID
 */
export function getFavoriteDetail(id) {
  return request({
    url: `/api/video-favorite/favorites/${id}`,
    method: 'get'
  })
}

/**
 * 获取当前用户的收藏夹列表（用于上传时选择）
 */
export function getMyFavorites() {
  return request({
    url: '/api/video-favorite/my-favorites',
    method: 'get'
  })
}

/**
 * 创建收藏夹
 * @param {object} data - 收藏夹数据
 * @param {string} data.name - 收藏夹名称
 * @param {string} data.description - 收藏夹描述
 * @param {number} data.isPublic - 是否公开（0-私密，1-公开）
 */
export function createFavorite(data) {
  return request({
    url: '/api/video-favorite/favorites',
    method: 'post',
    data
  })
}

/**
 * 更新收藏夹
 * @param {number} id - 收藏夹ID
 * @param {object} data - 收藏夹数据
 */
export function updateFavorite(id, data) {
  return request({
    url: `/api/video-favorite/favorites/${id}`,
    method: 'put',
    data
  })
}

/**
 * 删除收藏夹
 * @param {number} id - 收藏夹ID
 */
export function deleteFavorite(id) {
  return request({
    url: `/api/video-favorite/favorites/${id}`,
    method: 'delete'
  })
}

// ==================== 视频管理接口 ====================

/**
 * 获取视频列表
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {number} favoriteId - 收藏夹ID（可选）
 */
export function getVideoList(page = 1, pageSize = 20, favoriteId = null) {
  return request({
    url: '/api/video-favorite/list',
    method: 'get',
    params: { page, pageSize, favoriteId }
  })
}

/**
 * 获取本周推荐排行榜
 * @param {number} limit - 返回数量
 */
export function getWeeklyTop(limit = 10) {
  return request({
    url: '/api/video-favorite/weekly-top',
    method: 'get',
    params: { limit }
  })
}

/**
 * 上传视频
 * @param {string} bvid - B站视频BV号
 * @param {number} favoriteId - 收藏夹ID（可选）
 */
export function uploadVideo(bvid, favoriteId = null) {
  return request({
    url: '/api/video-favorite/upload',
    method: 'post',
    data: { bvid, favoriteId }
  })
}

/**
 * 推荐视频
 * @param {number} id - 视频ID
 */
export function recommendVideo(id) {
  return request({
    url: `/api/video-favorite/${id}/recommend`,
    method: 'post'
  })
}

/**
 * 检查用户是否已推荐过该视频
 * @param {number} id - 视频ID
 */
export function checkHasRecommended(id) {
  return request({
    url: `/api/video-favorite/${id}/has-recommended`,
    method: 'get'
  })
}

/**
 * 移动视频到另一个收藏夹
 * @param {number} id - 视频ID
 * @param {number} favoriteId - 目标收藏夹ID
 */
export function moveVideoToFavorite(id, favoriteId) {
  return request({
    url: `/api/video-favorite/${id}/move`,
    method: 'post',
    data: { favoriteId }
  })
}

/**
 * 获取视频详情
 * @param {number} id - 视频ID
 */
export function getVideoDetail(id) {
  return request({
    url: `/api/video-favorite/${id}`,
    method: 'get'
  })
}

/**
 * 删除视频
 * @param {number} id - 视频ID
 */
export function deleteVideo(id) {
  return request({
    url: `/api/video-favorite/${id}`,
    method: 'delete'
  })
}

// ==================== 管理员接口 ====================

/**
 * 获取待审核视频列表（管理员）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 */
export function getPendingVideos(page = 1, pageSize = 20) {
  return request({
    url: '/api/video-favorite/admin/pending',
    method: 'get',
    params: { page, pageSize }
  })
}

/**
 * 审核视频（管理员）
 * @param {number} id - 视频ID
 * @param {number} status - 审核状态（1-通过，2-拒绝）
 */
export function reviewVideo(id, status) {
  return request({
    url: `/api/video-favorite/admin/${id}/review`,
    method: 'post',
    data: { status }
  })
}
