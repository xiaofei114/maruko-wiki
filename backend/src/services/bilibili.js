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
async function setCachedData(cacheKey, data, ttl = 60) {
    try {
        const cacheValue = JSON.stringify(data);
        await global.redis.setex(cacheKey, ttl, cacheValue);
        logger.debug(`已缓存到Redis (${ttl}秒): ${cacheKey}`);
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
