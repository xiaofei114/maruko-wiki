import http from '@/utils/http'

/**
 * 获取相册和最新照片
 * @returns {Promise<Object>} 包含相册列表和最新照片的数据
 */
export function getAlbums() {
    return http.get('/api/albums')
}

/**
 * 获取指定相册的照片列表
 * @param {number} albumId - 相册ID
 * @returns {Promise<Object>} 包含相册信息和照片列表的数据
 */
export function getAlbumPhotos(albumId) {
    return http.get('/api/photos', {
        params: { album_id: albumId }
    })
}

/**
 * 创建新相册
 * @param {Object} albumData - 相册数据
 * @param {string} albumData.name - 相册名称
 * @param {string} albumData.introduction - 相册简介（可选）
 * @returns {Promise<Object>} 创建结果
 */
export function createAlbum(albumData) {
    return http.post('/api/albums', albumData)
}

/**
 * 上传照片到指定相册
 * @param {FormData} formData - 包含照片文件和参数的FormData对象
 * @returns {Promise<Object>} 上传结果
 */
export function uploadPhoto(formData) {
    return http.post('/api/photos', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}
