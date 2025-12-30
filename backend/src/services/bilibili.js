import axios from 'axios';
import crypto from 'crypto';

/**
 * 生成缓存key的函数
 * @param {string} method - 请求方法
 * @param {string} path - 请求路径
 * @param {object} query - 查询参数
 * @param {object} body - 请求体
 * @returns {string} 缓存key
 */
function generateCacheKey(method, path, query, body) {
    const cleanQuery = cleanObject(query);
    const cleanBody = cleanObject(body);

    // 创建按键排序的对象，确保相同请求生成相同key
    const sortedKeyData = {
        method: method.toUpperCase(),
        path: path,
        query: cleanQuery,
        body: cleanBody
    };

    // 序列化排序后的对象
    const jsonString = JSON.stringify(sortedKeyData);
    const hash = crypto.createHash('md5').update(jsonString).digest('hex');

    return `bilibili_api:${hash}`;
}

/**
 * 清理对象，只保留自有属性
 * @param {object} obj - 要清理的对象
 * @returns {object} 清理后的对象
 */
function cleanObject(obj) {
    const cleaned = {};
    if (obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cleaned[key] = obj[key];
            }
        }
    }
    return cleaned;
}

/**
 * 调试用：生成可读的缓存key描述
 * @param {string} method - 请求方法
 * @param {string} path - 请求路径
 * @param {object} query - 查询参数
 * @param {object} body - 请求体
 * @returns {string} 可读的key描述
 */
function generateReadableCacheKey(method, path, query, body) {
    const cleanQuery = cleanObject(query);
    const cleanBody = cleanObject(body);

    const queryStr = Object.keys(cleanQuery).length > 0
        ? '?' + new URLSearchParams(cleanQuery).toString()
        : '';
    const bodyStr = Object.keys(cleanBody).length > 0
        ? ` body:${JSON.stringify(cleanBody)}`
        : '';
    return `${method.toUpperCase()} ${path}${queryStr}${bodyStr}`;
}

/**
 * 代理 Bilibili API 请求
 * @param {string} method - 请求方法
 * @param {string} path - 请求路径
 * @param {object} query - 查询参数
 * @param {object} body - 请求体
 * @param {object} headers - 请求头
 * @returns {object} 代理结果
 */
export async function proxyBilibiliRequest(method, path, query, body, headers) {
    try {
        const baseURL = 'https://api.live.bilibili.com';

        const cacheKey = generateCacheKey(method, path, query, body);
        const readableKey = generateReadableCacheKey(method, path, query, body);

        // 尝试从缓存中获取数据
        const cachedData = await global.redis.get(cacheKey);
        if (cachedData) {
            logger.debug(`${readableKey} - 命中缓存`);
            return JSON.parse(cachedData);
        }

        logger.debug(`${readableKey} - 请求Bilibili API`);

        // 构建目标URL
        const targetURL = baseURL + path;

        logger.info(`${method} ${targetURL}`);

        // 转发请求
        const response = await axios({
            method: method,
            url: targetURL,
            params: query,
            data: body,
            headers: {
                ...headers,
                host: new URL(baseURL).host,
                'content-length': undefined,
                origin: baseURL,
                referer: baseURL,
            },
            timeout: 10000,
            validateStatus: () => true,
        });

        // 将响应数据缓存到Redis，过期时间1分钟
        const cacheValue = JSON.stringify({
            status: response.status,
            data: response.data
        });
        await global.redis.setex(cacheKey, 60, cacheValue); // 60秒 = 1分钟
        logger.debug(`${readableKey} - 已缓存到Redis (60秒)`);

        return {
            status: response.status,
            data: response.data
        };

    } catch (error) {
        logger.error('Bilibili API 代理请求失败:', error);
        throw error;
    }
}
