import { queryOne, insert, update } from '../method/database.js';

// 直播状态：0-未开播，1-直播中
let lastLiveStatus = 0;
let currentLiveRecordId = null;

/**
 * 获取B站直播间信息
 * @returns {Promise<object|null>} 直播间信息
 */
async function fetchLiveRoomInfo() {
    try {
        const roomId = global.appConfig?.bilibili?.roomId;
        if (!roomId) {
            logger.error('未配置bilibili.roomId');
            return null;
        }

        const response = await fetch(
            `https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://live.bilibili.com'
                }
            }
        );

        const data = await response.json();
        
        if (data.code !== 0) {
            logger.error(`B站API返回错误: ${data.message || data.msg}`);
            return null;
        }

        return data.data;
    } catch (error) {
        logger.error('获取直播间信息失败:', error);
        return null;
    }
}

/**
 * 解析直播开始时间为时间戳
 * @param {string} liveTimeStr - 直播开始时间字符串 (YYYY-MM-DD HH:mm:ss)
 * @returns {number} 时间戳（毫秒）
 */
function parseLiveTime(liveTimeStr) {
    if (!liveTimeStr || liveTimeStr === '0000-00-00 00:00:00') {
        return Date.now();
    }
    return new Date(liveTimeStr).getTime();
}

/**
 * 检查是否有未结束的直播记录（用于程序重启后恢复状态）
 */
async function checkUnfinishedLive() {
    try {
        const unfinishedRecord = queryOne(
            `SELECT id, start_time FROM live_duration 
             WHERE end_time IS NULL 
             ORDER BY start_time DESC LIMIT 1`
        );

        if (unfinishedRecord) {
            currentLiveRecordId = unfinishedRecord.id;
            lastLiveStatus = 1;
            logger.info(`发现未结束的直播记录，ID: ${currentLiveRecordId}，继续监控`);
        }
    } catch (error) {
        logger.error('检查未结束直播记录失败:', error);
    }
}

/**
 * 处理开播逻辑
 * @param {object} roomInfo - 直播间信息
 */
async function handleLiveStart(roomInfo) {
    try {
        const startTime = parseLiveTime(roomInfo.live_time);
        const title = roomInfo.title || '';

        // 插入新的直播记录
        const result = insert(
            `INSERT INTO live_duration (start_time, title, create_time) 
             VALUES (?, ?, ?)`,
            [startTime, title, Date.now()]
        );

        currentLiveRecordId = result.lastInsertRowid;
        lastLiveStatus = 1;

        logger.info(`检测到开播，已创建直播记录，ID: ${currentLiveRecordId}，标题: ${title}`);
    } catch (error) {
        logger.error('处理开播逻辑失败:', error);
    }
}

/**
 * 处理下播逻辑
 * @param {object} roomInfo - 直播间信息
 */
async function handleLiveEnd(roomInfo) {
    try {
        if (!currentLiveRecordId) {
            // 尝试查找最近的未结束记录
            const unfinishedRecord = queryOne(
                `SELECT id FROM live_duration 
                 WHERE end_time IS NULL 
                 ORDER BY start_time DESC LIMIT 1`
            );
            
            if (unfinishedRecord) {
                currentLiveRecordId = unfinishedRecord.id;
            } else {
                logger.warn('检测到下播，但未找到对应的直播记录');
                lastLiveStatus = 0;
                return;
            }
        }

        const endTime = Date.now();

        update(
            `UPDATE live_duration 
             SET end_time = ?, update_time = ? 
             WHERE id = ?`,
            [endTime, Date.now(), currentLiveRecordId]
        );

        logger.info(`检测到下播，已更新直播记录，ID: ${currentLiveRecordId}，结束时间: ${new Date(endTime).toLocaleString()}`);

        currentLiveRecordId = null;
        lastLiveStatus = 0;
    } catch (error) {
        logger.error('处理下播逻辑失败:', error);
    }
}

/**
 * 更新当前直播的标题（如果标题有变化）
 * @param {object} roomInfo - 直播间信息
 */
async function updateLiveTitle(roomInfo) {
    try {
        if (!currentLiveRecordId) return;

        const currentRecord = queryOne(
            `SELECT title FROM live_duration WHERE id = ?`,
            [currentLiveRecordId]
        );

        if (currentRecord && currentRecord.title !== roomInfo.title) {
            update(
                `UPDATE live_duration 
                 SET title = ?, update_time = ? 
                 WHERE id = ?`,
                [roomInfo.title, Date.now(), currentLiveRecordId]
            );
            logger.info(`直播标题已更新: ${roomInfo.title}`);
        }
    } catch (error) {
        logger.error('更新直播标题失败:', error);
    }
}

/**
 * 主任务函数
 */
async function task() {
    // 首次运行时检查是否有未结束的直播
    if (lastLiveStatus === 0 && currentLiveRecordId === null) {
        await checkUnfinishedLive();
    }

    const roomInfo = await fetchLiveRoomInfo();
    if (!roomInfo) return;

    const currentLiveStatus = roomInfo.live_status === 1 ? 1 : 0;

    // 状态变化检测
    if (currentLiveStatus === 1 && lastLiveStatus === 0) {
        // 从未开播变为开播
        await handleLiveStart(roomInfo);
    } else if (currentLiveStatus === 0 && lastLiveStatus === 1) {
        // 从开播变为未开播
        await handleLiveEnd(roomInfo);
    } else if (currentLiveStatus === 1 && lastLiveStatus === 1) {
        // 持续直播中，检查标题是否有变化
        await updateLiveTitle(roomInfo);
    }

    // 记录当前状态用于调试
    logger.info(`直播状态检查完成，当前状态: ${currentLiveStatus === 1 ? '直播中' : '未开播'}`);
}

/**
 * 带频率控制的包装任务
 */
let lastCheckTime = 0;
const OFFLINE_INTERVAL = 30 * 60 * 1000; // 未开播时30分钟
const ONLINE_INTERVAL = 3 * 60 * 1000;   // 开播后3分钟
const TOLERANCE = 5000;                  // 允许5秒误差

async function controlledTask() {
    const now = Date.now();
    const interval = lastLiveStatus === 1 ? ONLINE_INTERVAL : OFFLINE_INTERVAL;

    // 检查是否到了执行时间（允许5秒误差）
    if (now - lastCheckTime < interval - TOLERANCE) {
        logger.debug(`跳过本次检查，距离下次检查还有 ${Math.ceil((interval - (now - lastCheckTime)) / 1000)} 秒`);
        return;
    }

    lastCheckTime = now;
    await task();
}

export default {
    cron: '*/1 * * * *', // 每分钟检查一次，由 controlledTask 控制实际执行频率
    async task() {
        await controlledTask();
    }
};
