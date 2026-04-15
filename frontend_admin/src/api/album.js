import { Client } from "@/utils/HttpClient.js"

// 获取相册列表
export function getAlbums(data) {
    return Client.get('/api/admin/albums', data)
}

// 审核相册
export function reviewAlbum(albumId, isReview) {
    return Client.post(`/api/admin/albums/${albumId}/review`, {
        is_review: isReview
    })
}

// 修改相册信息
export function updateAlbum(albumId, data) {
    return Client.put(`/api/admin/albums/${albumId}`, data)
}

// 删除相册
export function deleteAlbum(albumId) {
    return Client.delete(`/api/admin/albums/${albumId}`)
}

// 审核照片
export function reviewPhoto(photoId, isReview) {
    return Client.post(`/api/admin/photos/${photoId}/review`, {
        is_review: isReview
    })
}

// 修改照片信息
export function updatePhoto(photoId, data) {
    return Client.put(`/api/admin/photos/${photoId}`, data)
}

// 删除照片
export function deletePhoto(photoId) {
    return Client.delete(`/api/admin/photos/${photoId}`)
}
