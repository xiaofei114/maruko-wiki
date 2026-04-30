import http from '@/utils/http.js'

/**
 * 获取首页功能模块数据
 * @returns {Promise<Object>} 包含相簿、音声、企划、视频的数据
 */
export function getHomeModules() {
    return http.get('/api/home-modules')
}
