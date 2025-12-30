import http from '@/utils/http.js'

// 常量配置
const CONFIG = {
    ROOM_ID: import.meta.env.VITE_APP_ROOM_ID,
    USER_ID: import.meta.env.VITE_APP_USER_ID
}

/**
 * 获取房间信息
 * @returns {Promise}
 */
export function getRoomInfo() {
    return http.get('/api/bilibili/room/v1/Room/get_info', {
        params: {
            room_id: CONFIG.ROOM_ID
        }
    })
}

/**
 * 获取主播信息
 * @returns {Promise}
 */
export function getMasterInfo() {
    return http.get('/api/bilibili/live_user/v1/Master/info', {
        params: {
            uid: CONFIG.USER_ID
        }
    })
}

/**
 * 获取排行榜数据
 * @param {number} page - 页码
 * @returns {Promise}
 */
export function getTopListNew(page = 1) {
    return http.get('/api/bilibili/xlive/app-room/v2/guardTab/topListNew', {
        params: {
            roomid: CONFIG.ROOM_ID,
            ruid: CONFIG.USER_ID,
            page: page,
            page_size: 30
        }
    })
}