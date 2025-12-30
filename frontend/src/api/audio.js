import http from '@/utils/http'

/**
 * 获取分组音声列表
 * @returns {Promise<Array>} 音声分类数组
 */
export function getAudioList() {
    return http.get('/api/audios')
}

/**
 * 上传音声文件
 * @param {FormData} formData - 包含audio文件和相关参数的FormData对象
 * @returns {Promise<Object>} 上传结果
 */
export function uploadAudio(formData) {
    return http.post('/api/audios', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}
