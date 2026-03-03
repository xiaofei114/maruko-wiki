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

/**
 * AI音频匹配
 * @param {string} description - 用户对所需音频的描述文本
 * @returns {Promise<Object>} 匹配结果
 */
export function matchAudiosByAI(description) {
    return http.post('/api/ai/match-audios', {
        description
    })
}
export async function downloadAudios(classificationId) {
    const params = classificationId ? `?classification_id=${classificationId}` : '';
    const url = `${import.meta.env.VITE_APP_BASE_URL}/api/audios/download${params}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('maruko_token')}`
            // 移除错误的 Content-Type
        }
    });
    
    if (!response.ok) {
        // 增强错误处理
        const errorText = await response.text().catch(() => "未知错误");
        throw new Error(`下载失败: ${response.status} - ${errorText}`);
    }
    
    // 直接获取 Blob（自动处理流）
    return await response.blob();
}