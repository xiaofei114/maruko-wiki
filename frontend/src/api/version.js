import http from '@/utils/http'

/**
 * 获取当前版本号
 * @returns {Promise<{success: boolean, message: string, data: {version: string}}>}
 */
export function getVersion() {
    return http.get('/api/version')
}
