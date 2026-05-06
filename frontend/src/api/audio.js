import http from '@/utils/http'

/**
 * 获取分组音声列表
 * @returns {Promise<Array>} 音声分类数组
 */
export function getAudioList() {
    return http.get('/api/audios')
}

/**
 * 获取当前用户的音声分类（包括待审核的）
 * @returns {Promise<Object>} 音声分类列表
 */
export function getMyAudioClassifications() {
    return http.get('/api/audios/classifications/my')
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
 * 获取AI配置状态
 * @returns {Promise<Object>} AI配置状态
 */
export function getAIConfigStatus() {
    return http.get('/api/ai/config-status')
}

/**
 * 下载音声（直接触发浏览器下载）
 * @param {number} classificationId - 分类ID，为null时下载全部
 */
export function downloadAudios(classificationId) {
    const params = classificationId ? `classification_id=${classificationId}` : '';
    const token = localStorage.getItem(import.meta.env.VITE_APP_TOKEN);
    const url = `${import.meta.env.VITE_APP_BASE_URL}/api/audios/download/${token}?${params}`;
    
    // 创建隐藏的链接并触发下载
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 记录音频播放量
 * @param {number} id - 音频ID
 * @returns {Promise<Object>} 记录结果
 */
export function recordAudioPlay(id) {
    return http.post(`/api/audios/${id}/play`)
}

/**
 * 获取7天热门音频（Redis）
 * @param {number} limit - 返回数量，默认10，最大50
 * @returns {Promise<Object>} 热门音频列表
 */
export function getWeeklyPopularAudios(limit = 10) {
    return http.get('/api/audios/popular/weekly', {
        params: { limit }
    })
}

/**
 * 获取总播放量排行（SQLite）
 * @param {number} limit - 返回数量，默认10，最大50
 * @returns {Promise<Object>} 热门音频列表
 */
export function getTotalPopularAudios(limit = 10) {
    return http.get('/api/audios/popular/total', {
        params: { limit }
    })
}