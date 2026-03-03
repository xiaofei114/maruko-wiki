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
 * 下载音声（流式下载）
 * @param {number} classificationId - 分类ID，为null时下载全部
 * @returns {Promise<Blob>} 音声ZIP文件
 */
export async function downloadAudios(classificationId) {
    const params = classificationId ? `?classification_id=${classificationId}` : '';
    const url = `${import.meta.env.VITE_APP_BASE_URL}/api/audios/download${params}`;
    
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('maruko_token')}`,
            'Content-Type': 'application/json'
        }
    });
    
    // 检查响应状态
    if (!response.ok) {
        // 尝试解析为JSON错误信息
        try {
            const errorData = await response.json();
            throw new Error(errorData.message || '下载失败');
        } catch (e) {
            throw new Error('下载失败，请稍后重试');
        }
    }
    
    // 检查响应类型
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/zip')) {
        // 是ZIP文件，使用流式下载
        const reader = response.body.getReader();
        const chunks = [];
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        
        // 将chunks合并为一个Uint8Array
        const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalSize);
        let offset = 0;
        
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        // 创建Blob
        return new Blob([result], { type: 'application/zip' });
    } else {
        // 不是ZIP文件，尝试解析为JSON
        const data = await response.json();
        throw new Error(data.message || '下载失败');
    }
}