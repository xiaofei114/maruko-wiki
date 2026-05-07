import axios from 'axios';
import { queryAll, queryOne, update } from '../method/database.js';

const logger = global.logger;

// Redis Key 前缀
const REDIS_KEY_PREFIX = 'bilibili:fans';

/**
 * 生成Redis Key
 * @param {string} ruid - 主播UID
 * @returns {string} Redis Key
 */
function getFansRedisKey(ruid) {
    return `${REDIS_KEY_PREFIX}:${ruid}`;
}

/**
 * 延时函数
 * @param {number} ms - 毫秒
 * @returns {Promise}
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取随机延时时间（1-3秒）
 * @returns {number} 毫秒数
 */
function getRandomDelay() {
    return Math.floor(Math.random() * 2000) + 1000; // 1-3秒随机延时
}

/**
 * 调用B站粉丝列表API
 * @param {string} ruid - 主播UID
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<object>} API响应数据
 */
async function fetchFansList(ruid, page = 1, pageSize = 30) {
    const url = 'https://api.live.bilibili.com/xlive/general-interface/v1/rank/getFansMembersRank';

    try {
        const response = await axios.get(url, {
            params: {
                ruid: ruid,
                page: page,
                page_size: pageSize
            },
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://live.bilibili.com'
            }
        });

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.data;
    } catch (error) {
        logger.error(`[粉丝同步] 获取粉丝列表失败: ruid=${ruid}, page=${page}, error=${error.message}`);
        throw error;
    }
}

/**
 * 获取所有粉丝信息（带分页和延时）
 * @param {string} ruid - 主播UID
 * @returns {Promise<Map<string, object>>} 粉丝信息Map (key: uid, value: fanInfo)
 */
async function fetchAllFans(ruid) {
    const fansMap = new Map();
    const pageSize = 30;
    let page = 1;
    let total = 0;
    let hasMore = true;

    logger.info(`[粉丝同步] 开始获取主播 ${ruid} 的粉丝列表...`);

    while (hasMore) {
        try {
            const data = await fetchFansList(ruid, page, pageSize);

            if (data?.code !== 0) {
                logger.warn(`[粉丝同步] API返回错误: ${data?.message || '未知错误'}`);
                break;
            }

            // 根据接口文档，粉丝列表在 data.item 中
            const items = data.data?.item || [];

            // 第一页获取总数 (data.num 是总粉丝数)
            if (page === 1) {
                total = data.data?.num || 0;
                logger.info(`[粉丝同步] 主播共有 ${total} 位粉丝`);
            }

            // 处理粉丝列表数据
            // 接口文档格式: [data.item].uid, [data.item].name, [data.item].level, [data.item].guard_level
            for (const item of items) {
                const uid = item?.uid?.toString();
                if (uid) {
                    fansMap.set(uid, {
                        uid: uid,
                        name: item?.name || '',
                        level: item?.level || 0,
                        guardLevel: item?.guard_level || 0,
                        updateTime: Date.now()
                    });
                }
            }

            logger.debug(`[粉丝同步] 已获取第 ${page} 页，累计 ${fansMap.size} 人`);

            // 判断是否还有更多数据
            if (items.length < pageSize || fansMap.size >= total) {
                hasMore = false;
            } else {
                page++;
                // 添加随机延时，防止被风控
                const waitTime = getRandomDelay();
                logger.debug(`[粉丝同步] 等待 ${waitTime}ms 后继续获取...`);
                await delay(waitTime);
            }

        } catch (error) {
            logger.error(`[粉丝同步] 获取第 ${page} 页失败: ${error.message}`);
            // 出错后等待更长时间再重试
            await delay(5000);
            // 如果连续失败，可以选择中断或继续
            if (page > 5 && fansMap.size === 0) {
                throw error;
            }
            page++;
        }
    }

    logger.info(`[粉丝同步] 粉丝列表获取完成，共 ${fansMap.size} 人`);
    return fansMap;
}

/**
 * 将粉丝数据保存到Redis
 * @param {string} ruid - 主播UID
 * @param {Map<string, object>} fansMap - 粉丝信息Map
 */
async function saveFansToRedis(ruid, fansMap) {
    try {
        const redisKey = getFansRedisKey(ruid);
        const fansObject = {};

        for (const [uid, fanInfo] of fansMap) {
            fansObject[uid] = JSON.stringify(fanInfo);
        }

        // 使用pipeline批量写入
        const pipeline = global.redis.pipeline();

        // 先删除旧数据
        pipeline.del(redisKey);

        // 批量写入新数据
        if (Object.keys(fansObject).length > 0) {
            pipeline.hset(redisKey, fansObject);
        }

        // 设置过期时间（25小时，确保第二天定时任务前不会过期）
        pipeline.expire(redisKey, 25 * 60 * 60);

        await pipeline.exec();

        logger.info(`[粉丝同步] 粉丝数据已写入缓存: ${fansMap.size} 人`);
    } catch (error) {
        logger.error(`[粉丝同步] 写入缓存失败: ${error.message}`);
        throw error;
    }
}

/**
 * 从Redis获取粉丝信息
 * @param {string} ruid - 主播UID
 * @param {string} uid - 用户UID
 * @returns {Promise<object|null>} 粉丝信息
 */
export async function getFanInfoFromRedis(ruid, uid) {
    try {
        const redisKey = getFansRedisKey(ruid);
        const fanData = await global.redis.hget(redisKey, uid.toString());

        if (fanData) {
            return JSON.parse(fanData);
        }
        return null;
    } catch (error) {
        logger.error(`[粉丝同步] 从缓存读取失败: ${error.message}`);
        return null;
    }
}

/**
 * 检查Redis中是否存在粉丝数据
 * @param {string} ruid - 主播UID
 * @returns {Promise<boolean>} 是否存在
 */
export async function hasFansDataInRedis(ruid) {
    try {
        const redisKey = getFansRedisKey(ruid);
        const exists = await global.redis.exists(redisKey);
        return exists === 1;
    } catch (error) {
        logger.error(`[粉丝同步] 检查缓存失败: ${error.message}`);
        return false;
    }
}

/**
 * 获取Redis中粉丝数据的统计信息
 * @param {string} ruid - 主播UID
 * @returns {Promise<object>} 统计信息
 */
export async function getFansDataStats(ruid) {
    try {
        const redisKey = getFansRedisKey(ruid);
        const count = await global.redis.hlen(redisKey);
        const ttl = await global.redis.ttl(redisKey);

        return {
            exists: count > 0,
            count: count,
            ttl: ttl,
            expireTime: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null
        };
    } catch (error) {
        logger.error(`[粉丝同步] 获取缓存统计失败: ${error.message}`);
        return { exists: false, count: 0, ttl: 0, expireTime: null };
    }
}

/**
 * 同步主播的所有粉丝数据到Redis
 * @param {string} ruid - 主播UID
 * @returns {Promise<object>} 同步结果
 */
export async function syncFansToRedis(ruid) {
    try {
        logger.info(`[粉丝同步] 开始同步主播 ${ruid} 的粉丝数据...`);
        const startTime = Date.now();

        const fansMap = await fetchAllFans(ruid);
        await saveFansToRedis(ruid, fansMap);

        const duration = (Date.now() - startTime) / 1000;
        logger.info(`[粉丝同步] 主播 ${ruid} 数据同步完成，耗时 ${duration.toFixed(2)} 秒`);

        return {
            success: true,
            ruid: ruid,
            count: fansMap.size,
            duration: duration
        };
    } catch (error) {
        logger.error(`[粉丝同步] 同步失败: ${error.message}`);
        return {
            success: false,
            ruid: ruid,
            error: error.message
        };
    }
}

/**
 * 获取所有绑定了B站的用户（用于定时任务）
 * @returns {Promise<Array>} 用户列表
 */
export async function getAllBilibiliBoundUsers() {
    try {
        const users = queryAll(
            `SELECT id, bilibili_uid FROM user
             WHERE is_bilibili_bound = 1 AND bilibili_uid IS NOT NULL`
        );
        return users || [];
    } catch (error) {
        logger.error(`[粉丝同步] 获取绑定用户失败: ${error.message}`);
        return [];
    }
}

/**
 * 更新用户的粉丝等级和舰长信息
 * @param {number} userId - 用户ID
 * @param {object} fanInfo - 粉丝信息
 * @param {boolean} isExtinguished - 是否熄灭
 */
export async function updateUserFanInfo(userId, fanInfo, isExtinguished = false) {
    try {
        const currentTime = Math.floor(Date.now() / 1000);

        update(
            `UPDATE user SET
                fan_level = ?,
                captain_type = ?,
                fan_medal_extinguished = ?,
                update_time = ?
             WHERE id = ?`,
            [fanInfo.level, fanInfo.guardLevel, isExtinguished ? 1 : 0, currentTime, userId]
        );

        logger.debug(`[粉丝同步] 用户 ${userId} 信息更新: 等级=${fanInfo.level}, 舰长=${fanInfo.guardLevel}, 熄灭=${isExtinguished}`);
    } catch (error) {
        logger.error(`[粉丝同步] 用户 ${userId} 更新失败: ${error.message}`);
    }
}

/**
 * 处理用户绑定B站时的粉丝信息获取
 * @param {number} userId - 用户ID
 * @param {string} uid - B站UID
 * @param {string} ruid - 主播UID（从配置获取）
 * @returns {Promise<object>} 粉丝信息
 */
export async function getFanInfoOnBind(userId, uid, ruid) {
    try {
        // 1. 先尝试从Redis获取
        let fanInfo = await getFanInfoFromRedis(ruid, uid);

        if (fanInfo) {
            logger.info(`[粉丝同步] 用户 ${userId} 从缓存获取到粉丝信息`);
            // 更新数据库，粉丝牌正常
            await updateUserFanInfo(userId, fanInfo, false);
            return {
                success: true,
                fromCache: true,
                fanLevel: fanInfo.level,
                guardLevel: fanInfo.guardLevel,
                isExtinguished: false,
                fanInfo: fanInfo
            };
        }

        // 2. Redis中没有，说明不在粉丝列表中
        logger.info(`[粉丝同步] 用户 ${userId} (UID: ${uid}) 不在粉丝列表中`);

        // 检查用户之前是否有数据
        const user = queryOne(
            `SELECT fan_level, captain_type, fan_medal_extinguished FROM user WHERE id = ?`,
            [userId]
        );

        // 如果之前有数据（fan_level > 0），说明粉丝牌灭了，保留之前的等级
        if (user && user.fan_level > 0) {
            logger.info(`[粉丝同步] 用户 ${userId} 粉丝牌已熄灭，保留历史等级 ${user.fan_level}`);
            // 更新为熄灭状态
            await updateUserFanInfo(userId, {
                level: user.fan_level,
                guardLevel: user.captain_type
            }, true);
            return {
                success: true,
                fromCache: false,
                fanLevel: user.fan_level,
                guardLevel: user.captain_type,
                isExtinguished: true,
                note: '粉丝牌已熄灭，保留历史数据'
            };
        }

        // 3. 之前没有数据，说明没有粉丝牌
        logger.info(`[粉丝同步] 用户 ${userId} 无粉丝牌`);
        return {
            success: true,
            fromCache: false,
            fanLevel: 0,
            guardLevel: 0,
            isExtinguished: false,
            note: '无粉丝牌'
        };

    } catch (error) {
        logger.error(`[粉丝同步] 获取用户 ${userId} 粉丝信息失败: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}
