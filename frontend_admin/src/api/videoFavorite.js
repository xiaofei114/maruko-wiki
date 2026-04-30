import { Client } from "@/utils/HttpClient.js"

// 获取视频列表
export function getVideoList(data) {
    return Client.get('/api/video-favorite/admin/list', data)
}

// 获取待审核视频列表
export function getPendingVideos(data) {
    return Client.get('/api/video-favorite/admin/pending', data)
}

// 审核视频
export function reviewVideo(videoId, status) {
    return Client.post(`/api/video-favorite/admin/${videoId}/review`, {
        status: status
    })
}

// 撤销视频审核
export function revokeVideoReview(videoId) {
    return Client.post(`/api/video-favorite/admin/${videoId}/revoke`)
}

// 删除视频
export function deleteVideo(videoId) {
    return Client.delete(`/api/video-favorite/${videoId}`)
}

// 获取收藏夹列表
export function getFavorites() {
    return Client.get('/api/video-favorite/favorites')
}

// 获取收藏夹详情
export function getFavoriteDetail(favoriteId) {
    return Client.get(`/api/video-favorite/favorites/${favoriteId}`)
}

// 移动视频到收藏夹
export function moveVideoToFavorite(videoId, favoriteId) {
    return Client.post(`/api/video-favorite/${videoId}/move`, {
        favoriteId: favoriteId
    })
}

// 更新收藏夹
export function updateFavorite(favoriteId, data) {
    return Client.put(`/api/video-favorite/favorites/${favoriteId}`, data)
}

// 删除收藏夹
export function deleteFavorite(favoriteId) {
    return Client.delete(`/api/video-favorite/favorites/${favoriteId}`)
}
