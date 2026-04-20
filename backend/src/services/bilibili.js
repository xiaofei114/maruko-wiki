import axios from 'axios';
import crypto from 'crypto';
import { read_json } from '../method/read.js';

/**
 * 生成缓存key的函数
 * @param {string} path - 请求路径
 * @param {object} params - 查询参数
 * @returns {string} 缓存key
 */
function generateCacheKey(path, params = {}) {
    // 创建按键排序的对象，确保相同请求生成相同key
    const sortedParams = {};
    Object.keys(params).sort().forEach(key => {
        sortedParams[key] = params[key];
    });

    const keyData = {
        path: path,
        params: sortedParams
    };

    // 序列化排序后的对象
    const jsonString = JSON.stringify(keyData);
    const hash = crypto.createHash('md5').update(jsonString).digest('hex');

    return `bilibili_api:${hash}`;
}

/**
 * 获取缓存数据
 * @param {string} cacheKey - 缓存key
 * @returns {object|null} 缓存的数据
 */
async function getCachedData(cacheKey) {
    try {
        const cachedData = await global.redis.get(cacheKey);
        if (cachedData) {
            logger.debug(`缓存命中: ${cacheKey}`);
            return JSON.parse(cachedData);
        }
    } catch (error) {
        logger.warn('获取缓存失败:', error);
    }
    return null;
}

/**
 * 设置缓存数据
 * @param {string} cacheKey - 缓存key
 * @param {object} data - 要缓存的数据
 * @param {number} ttl - 过期时间(秒)
 */
async function setCachedData(cacheKey, data) {
    try {
        const cacheValue = JSON.stringify(data);
        const config = read_json('configs', 'config');
        await global.redis.setex(cacheKey, config.bilibili.ttl, cacheValue);
        logger.debug(`已缓存到Redis (${config.bilibili.ttl}秒): ${cacheKey}`);
    } catch (error) {
        logger.warn('设置缓存失败:', error);
    }
}

/**
 * 调用 Bilibili API
 * @param {string} path - API路径
 * @param {object} params - 查询参数
 * @returns {Promise<object>} API响应数据
 */
async function callBilibiliAPI(path, params = {}) {
    const baseURL = 'https://api.live.bilibili.com';
    const targetURL = baseURL + path;

    logger.info(`请求Bilibili API: ${targetURL}`, params);

    const response = await axios({
        method: 'GET',
        url: targetURL,
        params: params,
        timeout: 10000,
        validateStatus: () => true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://live.bilibili.com'
        }
    });

    if (response.status !== 200) {
        throw new Error(`Bilibili API 请求失败: ${response.status} ${response.statusText}`);
    }

    return response.data;
}

/**
 * 获取房间信息
 * @returns {Promise<object>} 房间信息
 */
export async function getRoomInfo() {
    const config = read_json('configs', 'config');
    const path = '/room/v1/Room/get_info';
    const params = {
        room_id: config.bilibili.roomId
    };

    const cacheKey = generateCacheKey(path, params);
    let data = await getCachedData(cacheKey);

    if (!data) {
        data = await callBilibiliAPI(path, params);
        await setCachedData(cacheKey, data);
    }

    return data;
}

/**
 * 获取主播信息
 * @returns {Promise<object>} 主播信息
 */
export async function getMasterInfo() {
    const config = read_json('configs', 'config');
    const path = '/live_user/v1/Master/info';
    const params = {
        uid: config.bilibili.userId
    };

    const cacheKey = generateCacheKey(path, params);
    let data = await getCachedData(cacheKey);

    if (!data) {
        data = await callBilibiliAPI(path, params);
        await setCachedData(cacheKey, data);
    }

    return data;
}

/**
 * 获取排行榜数据
 * @returns {Promise<object>} 排行榜数据
 */
export async function getTopListNew() {
    const config = read_json('configs', 'config');
    const path = '/xlive/app-room/v2/guardTab/topListNew';
    const params = {
        roomid: config.bilibili.roomId,
        ruid: config.bilibili.userId,
        page: 1,
        page_size: 30
    };

    const cacheKey = generateCacheKey(path, params);
    let data = await getCachedData(cacheKey);

    if (!data) {
        data = await callBilibiliAPI(path, params);
        await setCachedData(cacheKey, data);
    }

    return data;
}

/**
 * 获取大航海总数（仅返回总数，用于前端展示）
 * @returns {Promise<number>} 大航海总数（总督+提督+舰长）
 */
export async function getGuardTotal() {
    const config = read_json('configs', 'config');
    const path = '/xlive/app-room/v2/guardTab/topListNew';
    const params = {
        roomid: config.bilibili.roomId,
        ruid: config.bilibili.userId,
        page: 1,
        page_size: 30
    };

    const cacheKey = generateCacheKey(path + '_total', params);
    let data = await getCachedData(cacheKey);

    if (!data) {
        data = await callBilibiliAPI(path, params);
        await setCachedData(cacheKey, data);
    }

    return data?.data?.info?.num || 0;
}

/**
 * 获取大航海等级详细统计（总督、提督、舰长分别统计）
 * 仅用于定时任务记录数据
 * 优化：只遍历到第一个舰长就停止，减少请求次数
 * @returns {Promise<object>} {total, commanderCount, viceCommanderCount, captainCount}
 */
export async function getGuardLevelStats() {
    const config = read_json('configs', 'config');
    const path = '/xlive/app-room/v2/guardTab/topListNew';
    const pageSize = 30;

    // 统计总督、提督数量
    // guard_level: 1=总督, 2=提督, 3=舰长
    let commanderCount = 0;    // 总督
    let viceCommanderCount = 0; // 提督
    let total = 0;
    let page = 1;

    while (true) {
        const params = {
            roomid: config.bilibili.roomId,
            ruid: config.bilibili.userId,
            page: page,
            page_size: pageSize
        };

        const cacheKey = generateCacheKey(path + '_guard_level_' + page, params);
        let data = await getCachedData(cacheKey);

        if (!data) {
            data = await callBilibiliAPI(path, params);
            await setCachedData(cacheKey, data, 60);
        }

        if (page === 1) {
            total = data?.data?.info?.num || 0;
            // 第一页时统计top3
            const top3 = data?.data?.top3 || [];
            for (const item of top3) {
                const guardLevel = item?.uinfo?.medal?.guard_level;
                if (guardLevel === 1) commanderCount++;
                else if (guardLevel === 2) viceCommanderCount++;
            }
        }

        const list = data?.data?.list || [];

        // 如果列表为空，说明没有更多数据
        if (list.length === 0) {
            break;
        }

        // 统计list中的等级，遇到舰长立即停止
        let foundCaptain = false;
        for (const item of list) {
            const guardLevel = item?.uinfo?.medal?.guard_level;
            if (guardLevel === 1) {
                commanderCount++;
            } else if (guardLevel === 2) {
                viceCommanderCount++;
            } else if (guardLevel === 3) {
                foundCaptain = true;
                break; // 遇到舰长，立即停止遍历
            }
        }

        // 如果遇到了舰长或者数据不足一页，停止翻页
        if (foundCaptain || list.length < pageSize) {
            break;
        }

        page++;
    }

    // 舰长数 = 总数 - 总督数 - 提督数
    const captainCount = total - commanderCount - viceCommanderCount;

    return {
        total,
        commanderCount,
        viceCommanderCount,
        captainCount: captainCount > 0 ? captainCount : 0
    };
}

/**
 * 获取粉丝团成员数
 * @returns {Promise<object>} 粉丝团成员数据
 */
export async function getFansMembersRank() {
    const config = read_json('configs', 'config');
    const path = '/xlive/general-interface/v1/rank/getFansMembersRank';
    const params = {
        page: 1,
        ruid: config.bilibili.userId,
        page_size: 30
    };

    const cacheKey = generateCacheKey(path, params);
    let data = await getCachedData(cacheKey);

    if (!data) {
        data = await callBilibiliAPI(path, params);
        await setCachedData(cacheKey, data);
    }

    return data;
}
