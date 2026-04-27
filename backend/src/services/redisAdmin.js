import { createSuccessResponse, createErrorResponse } from '../method/business-utils.js';

/**
 * Redis 管理服务 - 超级管理员专用
 * 提供查看、修改、删除 Redis 数据的功能
 * 只能操作本应用前缀的键
 * 
 * 注意：ioredis 配置了 keyPrefix，会自动添加前缀
 * 所以在使用 Redis 命令时，需要使用 stripPrefix 去除前缀
 */

// 获取 Redis 键前缀配置（从全局配置读取）
const KEY_PREFIX = global.appConfig?.redis?.keyPrefix || 'maruko';
const FULL_PREFIX = `${KEY_PREFIX}:`;

/**
 * 去除 Redis 键的前缀（ioredis 返回的键包含前缀）
 * @param {string} key - Redis 键（可能包含前缀）
 * @returns {string} 去除前缀后的键
 */
function stripPrefix(key) {
    if (key.startsWith(FULL_PREFIX)) {
        return key.substring(FULL_PREFIX.length);
    }
    return key;
}

/**
 * 检查键是否属于本应用（以前缀开头）
 * @param {string} key - Redis 键
 * @returns {boolean} 是否属于本应用
 */
function isAppKey(key) {
    return key.startsWith(FULL_PREFIX);
}

/**
 * 获取 Redis 键列表（支持前缀匹配，仅限本应用键）
 * @param {string} pattern - 匹配模式，默认 *
 * @param {number} limit - 返回数量限制，默认 100
 * @returns {Promise<object>} 键列表
 */
export async function getRedisKeys(pattern = '*', limit = 100) {
    try {
        const redis = global.redis;
        if (!redis) {
            return createErrorResponse('Redis 连接未初始化');
        }

        // 强制添加应用前缀，确保只能查看本应用的键
        const fullPattern = pattern === '*' 
            ? `${FULL_PREFIX}*` 
            : pattern.startsWith(FULL_PREFIX) 
                ? pattern 
                : `${FULL_PREFIX}${pattern}`;

        // 使用 SCAN 命令避免阻塞 Redis
        const keys = [];
        let cursor = '0';
        
        do {
            const result = await redis.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
            cursor = result[0];
            keys.push(...result[1]);
            
            // 如果超过限制，停止扫描
            if (keys.length >= limit) {
                keys.length = limit;
                break;
            }
        } while (cursor !== '0');

        // 获取每个键的类型和过期时间
        const keysWithInfo = [];
        for (const key of keys.slice(0, limit)) {
            try {
                // ioredis 配置了 keyPrefix，scan 返回的键包含完整前缀
                // 但调用其他命令时，ioredis 会再次添加前缀
                // 所以需要去除前缀后再调用命令
                const keyWithoutPrefix = stripPrefix(key);
                
                const type = await redis.type(keyWithoutPrefix);
                const ttl = await redis.ttl(keyWithoutPrefix);
                
                // 获取值预览（根据类型）
                let preview = null;
                let size = 0;
                
                switch (type) {
                    case 'string':
                        const strValue = await redis.get(keyWithoutPrefix);
                        preview = strValue ? strValue.substring(0, 100) : '';
                        size = strValue ? strValue.length : 0;
                        break;
                    case 'hash':
                        const hashLen = await redis.hlen(keyWithoutPrefix);
                        size = hashLen;
                        preview = `Hash (${hashLen} fields)`;
                        break;
                    case 'list':
                        const listLen = await redis.llen(keyWithoutPrefix);
                        size = listLen;
                        preview = `List (${listLen} items)`;
                        break;
                    case 'set':
                        const setLen = await redis.scard(keyWithoutPrefix);
                        size = setLen;
                        preview = `Set (${setLen} members)`;
                        break;
                    case 'zset':
                        const zsetLen = await redis.zcard(keyWithoutPrefix);
                        size = zsetLen;
                        preview = `Sorted Set (${zsetLen} members)`;
                        break;
                    default:
                        preview = `Type: ${type}`;
                }

                keysWithInfo.push({
                    key: keyWithoutPrefix,  // 返回给前端的是不带前缀的键名
                    type,
                    ttl: ttl > 0 ? ttl : -1, // -1 表示永不过期，-2 表示已过期
                    size,
                    preview
                });
            } catch (e) {
                keysWithInfo.push({
                    key,
                    type: 'unknown',
                    ttl: -1,
                    size: 0,
                    preview: 'Error reading key'
                });
            }
        }

        return createSuccessResponse('获取 Redis 键列表成功', {
            keys: keysWithInfo,
            total: keys.length,
            pattern,
            limit
        });
    } catch (error) {
        logger.error('获取 Redis 键列表失败:', error);
        return createErrorResponse('获取 Redis 键列表失败: ' + error.message);
    }
}

/**
 * 获取 Redis 键的详细值
 * @param {string} key - Redis 键
 * @returns {Promise<object>} 键的详细值
 */
export async function getRedisValue(key) {
    try {
        const redis = global.redis;
        if (!redis) {
            return createErrorResponse('Redis 连接未初始化');
        }

        // 检查键是否属于本应用（前端传来的键不带前缀，需要加上前缀检查）
        const fullKey = `${FULL_PREFIX}${key}`;
        
        // 去除前缀后再调用命令（因为 ioredis 会自动添加前缀）
        const keyWithoutPrefix = key;

        const type = await redis.type(keyWithoutPrefix);
        const ttl = await redis.ttl(keyWithoutPrefix);
        
        let value = null;
        let size = 0;

        switch (type) {
            case 'string':
                value = await redis.get(keyWithoutPrefix);
                size = value ? value.length : 0;
                break;
            case 'hash':
                value = await redis.hgetall(keyWithoutPrefix);
                size = Object.keys(value).length;
                break;
            case 'list':
                value = await redis.lrange(keyWithoutPrefix, 0, -1);
                size = value.length;
                break;
            case 'set':
                value = await redis.smembers(keyWithoutPrefix);
                size = value.length;
                break;
            case 'zset':
                value = await redis.zrange(keyWithoutPrefix, 0, -1, 'WITHSCORES');
                size = value.length / 2;
                break;
            default:
                value = null;
        }

        return createSuccessResponse('获取 Redis 值成功', {
            key,
            type,
            ttl: ttl > 0 ? ttl : -1,
            size,
            value
        });
    } catch (error) {
        logger.error('获取 Redis 值失败:', error);
        return createErrorResponse('获取 Redis 值失败: ' + error.message);
    }
}

/**
 * 设置 Redis 键值
 * @param {string} key - Redis 键
 * @param {string} value - 值
 * @param {number} ttl - 过期时间（秒），-1 表示永不过期
 * @returns {Promise<object>} 操作结果
 */
export async function setRedisValue(key, value, ttl = -1) {
    try {
        const redis = global.redis;
        if (!redis) {
            return createErrorResponse('Redis 连接未初始化');
        }

        // 前端传来的键不带前缀，直接使用（ioredis 会自动添加前缀）
        const keyWithoutPrefix = key;

        // 尝试解析 JSON
        let parsedValue = value;
        try {
            // 如果值是有效的 JSON，保持原样
            JSON.parse(value);
        } catch {
            // 不是 JSON，作为普通字符串存储
            parsedValue = value;
        }

        if (ttl > 0) {
            await redis.set(keyWithoutPrefix, parsedValue, 'EX', ttl);
        } else {
            await redis.set(keyWithoutPrefix, parsedValue);
        }

        return createSuccessResponse('设置 Redis 值成功', { key, ttl });
    } catch (error) {
        logger.error('设置 Redis 值失败:', error);
        return createErrorResponse('设置 Redis 值失败: ' + error.message);
    }
}

/**
 * 删除 Redis 键
 * @param {string|Array<string>} keys - 要删除的键或键数组
 * @returns {Promise<object>} 操作结果
 */
export async function deleteRedisKeys(keys) {
    try {
        const redis = global.redis;
        if (!redis) {
            return createErrorResponse('Redis 连接未初始化');
        }

        const keyArray = Array.isArray(keys) ? keys : [keys];
        
        // 前端传来的键不带前缀，直接使用（ioredis 会自动添加前缀）
        // 如果需要限制只能删除本应用的键，可以在这里添加检查
        // 但由于 scan 已经只返回本应用的键，所以这里不需要额外过滤
        
        const deletedCount = await redis.del(...keyArray);

        return createSuccessResponse('删除 Redis 键成功', {
            deletedCount,
            keys: keyArray
        });
    } catch (error) {
        logger.error('删除 Redis 键失败:', error);
        return createErrorResponse('删除 Redis 键失败: ' + error.message);
    }
}

/**
 * 获取 Redis 信息统计
 * @returns {Promise<object>} Redis 服务器信息
 */
export async function getRedisInfo() {
    try {
        const redis = global.redis;
        if (!redis) {
            return createErrorResponse('Redis 连接未初始化');
        }

        const info = await redis.info();
        
        // 只统计本应用的键数量
        let appKeyCount = 0;
        let cursor = '0';
        do {
            const result = await redis.scan(cursor, 'MATCH', `${FULL_PREFIX}*`, 'COUNT', 1000);
            cursor = result[0];
            appKeyCount += result[1].length;
        } while (cursor !== '0');

        // 解析关键信息
        const infoLines = info.split('\r\n');
        const infoObj = {};
        
        for (const line of infoLines) {
            if (line.includes(':')) {
                const [key, value] = line.split(':');
                infoObj[key] = value;
            }
        }

        return createSuccessResponse('获取 Redis 信息成功', {
            version: infoObj.redis_version,
            mode: infoObj.redis_mode,
            os: infoObj.os,
            processId: infoObj.process_id,
            uptimeInSeconds: parseInt(infoObj.uptime_in_seconds) || 0,
            usedMemory: infoObj.used_memory_human,
            usedMemoryPeak: infoObj.used_memory_peak_human,
            totalConnections: parseInt(infoObj.total_connections_received) || 0,
            totalCommands: parseInt(infoObj.total_commands_processed) || 0,
            keyCount: appKeyCount,  // 只显示本应用的键数量
            role: infoObj.role,
            prefix: FULL_PREFIX  // 显示当前前缀
        });
    } catch (error) {
        logger.error('获取 Redis 信息失败:', error);
        return createErrorResponse('获取 Redis 信息失败: ' + error.message);
    }
}
