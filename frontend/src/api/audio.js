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

/**
 * 下载音声（直接触发浏览器下载）
 * @param {number} classificationId - 分类ID，为null时下载全部
 */
export function downloadAudios(classificationId) {
    const params = classificationId ? `classification_id=${classificationId}` : '';
    const token = localStorage.getItem('maruko_token');
    const url = `${import.meta.env.VITE_APP_BASE_URL}/api/audios/download/${token}?${params}`;
    
    // 创建隐藏的链接并触发下载
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}