import { queryOne, queryAll, update } from '../method/database.js';

/**
 * 音频播放量服务
 * 使用Redis存储7天内的播放数据，SQLite存储总播放量
 */

/**
 * 获取客户端IP地址
 * @param {object} req - 请求对象
 * @returns {string} 客户端IP
 */
function getClientIP(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.connection.remoteAddress;
}

/**
 * 生成Redis键名（将IP中的点替换为下划线，避免Redis键名问题）
 * @param {string} ip - IP地址
 * @returns {string} 处理后的IP
 */
function sanitizeIP(ip) {
    return ip.replace(/[.:]/g, '_');
}

/**
 * 检查是否可以记录播放量（频率限制）
 * @param {number} audioId - 音频ID
 * @param {string} clientIP - 客户端IP
 * @param {object|null} user - 用户信息（null表示未登录）
 * @returns {Promise<{allowed: boolean, limit: number}>} 是否允许记录及限制数量
 */
async function checkPlayCountLimit(audioId, clientIP, user) {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000); // 当前分钟时间戳
    
    let redisKey;
    let limit;
    
    if (user) {
        // 已登录用户：每分钟每个音频10条
        redisKey = `audio_play:${user.id}:${audioId}:${currentMinute}`;
        limit = 10;
    } else {
        // 未登录用户：每分钟每个音频5条
        redisKey = `audio_play:ip:${sanitizeIP(clientIP)}:${audioId}:${currentMinute}`;
        limit = 5;
    }
    
    try {
        const currentCount = await global.redis.get(redisKey);
        const count = parseInt(currentCount || '0');
        
        if (count >= limit) {
            return { allowed: false, limit };
        }
        
        return { allowed: true, limit };
    } catch (error) {
        logger.error('检查播放量限制失败:', error);
        // 出错时允许记录，避免影响用户体验
        return { allowed: true, limit };
    }
}

/**
 * 记录播放量到Redis
 * @param {number} audioId - 音频ID
 * @param {string} clientIP - 客户端IP
 * @param {object|null} user - 用户信息
 */
async function recordPlayCountToRedis(audioId, clientIP, user) {
    const now = Date.now();
    const currentMinute = Math.floor(now / 60000);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    let userRedisKey;
    
    if (user) {
        userRedisKey = `audio_play:${user.id}:${audioId}:${currentMinute}`;
    } else {
        userRedisKey = `audio_play:ip:${sanitizeIP(clientIP)}:${audioId}:${currentMinute}`;
    }
    
    const dailyKey = `audio_play_count:daily:${audioId}:${today}`;
    const weeklyKey = `audio_play_count:weekly:${audioId}`;
    const weeklyZSetKey = 'audio:weekly_popular'; // 用于排序的ZSet
    
    try {
        // 1. 增加用户分钟计数（用于限流，60秒过期）
        await global.redis.incr(userRedisKey);
        await global.redis.expire(userRedisKey, 60);
        
        // 2. 增加每日播放计数（24小时过期）
        await global.redis.incr(dailyKey);
        await global.redis.expire(dailyKey, 7 * 24 * 3600); // 7天过期
        
        // 3. 增加7天总计数（使用ZSet，方便排序）
        await global.redis.zincrby(weeklyZSetKey, 1, audioId.toString());
        // 设置ZSet的过期时间为7天
        await global.redis.expire(weeklyZSetKey, 7 * 24 * 3600);
        
        logger.debug(`播放量记录成功: audioId=${audioId}, user=${user ? user.id : 'guest'}`);
    } catch (error) {
        logger.error('Redis播放量记录失败:', error);
        throw error;
    }
}

/**
 * 更新SQLite中的总播放量
 * @param {number} audioId - 音频ID
 */
async function updateTotalPlayCount(audioId) {
    try {
        const result = update(
            'UPDATE audio SET play_count = play_count + 1, update_time = ? WHERE id = ?',
            [Math.floor(Date.now() / 1000), audioId]
        );
        
        if (result.changes === 0) {
            logger.warn(`更新总播放量失败，音频不存在: ${audioId}`);
        }
    } catch (error) {
        logger.error('更新总播放量失败:', error);
        throw error;
    }
}

/**
 * 记录音频播放量（主入口）
 * @param {number} audioId - 音频ID
 * @param {object} req - 请求对象
 * @param {object|null} user - 用户信息（可选认证）
 * @returns {Promise<object>} 记录结果
 */
export async function recordPlayCount(audioId, req, user) {
    try {
        // 1. 验证音频是否存在
        const audio = queryOne(
            'SELECT id, name, is_deleted, is_review FROM audio WHERE id = ?',
            [audioId]
        );
        
        if (!audio) {
            return {
                success: false,
                message: '音频不存在',
                code: 404
            };
        }
        
        if (audio.is_deleted) {
            return {
                success: false,
                message: '音频已被删除',
                code: 404
            };
        }
        
        if (audio.is_review !== 1) {
            return {
                success: false,
                message: '音频未通过审核',
                code: 403
            };
        }
        
        // 2. 获取客户端IP
        const clientIP = getClientIP(req);
        
        // 3. 检查频率限制
        const { allowed, limit } = await checkPlayCountLimit(audioId, clientIP, user);
        
        if (!allowed) {
            const userType = user ? '已登录用户' : '未登录用户';
            logger.debug(`${userType}播放频率超限: audioId=${audioId}, ip=${clientIP}`);
            return {
                success: true,
                message: '播放记录已跳过（频率限制）',
                data: {
                    recorded: false,
                    reason: 'rate_limit',
                    limit: limit,
                    userType: user ? 'authenticated' : 'guest'
                }
            };
        }
        
        // 4. 记录到Redis
        await recordPlayCountToRedis(audioId, clientIP, user);
        
        // 5. 更新SQLite总播放量（异步，不影响响应速度）
        // 使用 setImmediate 让其在事件循环的下一轮执行
        setImmediate(() => {
            updateTotalPlayCount(audioId).catch(err => {
                logger.error('异步更新总播放量失败:', err);
            });
        });
        
        return {
            success: true,
            message: '播放记录成功',
            data: {
                recorded: true,
                audioId: audioId,
                audioName: audio.name,
                userType: user ? 'authenticated' : 'guest'
            }
        };
        
    } catch (error) {
        logger.error('记录播放量失败:', error);
        return {
            success: false,
            message: '记录播放量失败',
            code: 500
        };
    }
}

/**
 * 获取Redis中7天内最热门的音频（按7天播放量排序）
 * @param {number} limit - 返回数量，默认10
 * @returns {Promise<object>} 热门音频列表
 */
export async function getWeeklyPopularAudios(limit = 10) {
    try {
        const weeklyZSetKey = 'audio:weekly_popular';
        
        // 1. 从Redis获取热门音频ID列表（按播放量排序）
        let popularAudioIds = [];
        try {
            popularAudioIds = await global.redis.zrevrange(weeklyZSetKey, 0, limit - 1, 'WITHSCORES');
        } catch (error) {
            logger.warn('从Redis获取热门音频失败:', error);
        }
        
        // 2. 如果没有Redis数据，返回空数组
        if (!popularAudioIds || popularAudioIds.length === 0) {
            return {
                success: true,
                message: '获取热门音频成功',
                data: {
                    audios: []
                }
            };
        }
        
        // 3. 解析Redis返回的数据（格式：[id1, score1, id2, score2, ...]）
        const audioScores = [];
        for (let i = 0; i < popularAudioIds.length; i += 2) {
            audioScores.push({
                id: parseInt(popularAudioIds[i]),
                weeklyPlays: parseInt(popularAudioIds[i + 1])
            });
        }
        
        // 4. 从SQLite获取音频详细信息
        const audioDetails = [];
        for (const item of audioScores) {
            const audio = queryOne(`
                SELECT 
                    a.id,
                    a.name,
                    a.url,
                    a.play_count as totalPlayCount,
                    ac.id as classificationId,
                    ac.name as classificationName
                FROM audio a
                LEFT JOIN audio_classification ac ON a.classification_id = ac.id
                WHERE a.id = ? AND a.is_deleted = 0 AND a.is_review = 1
            `, [item.id]);
            
            if (audio) {
                audioDetails.push({
                    id: audio.id,
                    name: audio.name,
                    url: `/api/file/${audio.url}`,
                    weeklyPlays: item.weeklyPlays,
                    totalPlayCount: audio.totalPlayCount,
                    classification: {
                        id: audio.classificationId,
                        name: audio.classificationName
                    }
                });
            }
        }
        
        return {
            success: true,
            message: '获取热门音频成功',
            data: {
                audios: audioDetails
            }
        };
        
    } catch (error) {
        logger.error('获取热门音频失败:', error);
        return {
            success: false,
            message: '获取热门音频失败',
            code: 500
        };
    }
}

/**
 * 获取SQLite中总播放量排行的音频（按总播放量排序）
 * @param {number} limit - 返回数量，默认10
 * @returns {Promise<object>} 热门音频列表
 */
export async function getTotalPopularAudios(limit = 10) {
    try {
        const audios = queryAll(`
            SELECT 
                a.id,
                a.name,
                a.url,
                a.play_count as totalPlayCount,
                ac.id as classificationId,
                ac.name as classificationName
            FROM audio a
            LEFT JOIN audio_classification ac ON a.classification_id = ac.id
            WHERE a.is_deleted = 0 AND a.is_review = 1
            ORDER BY a.play_count DESC
            LIMIT ?
        `, [limit]);
        
        return {
            success: true,
            message: '获取总播放量排行成功',
            data: {
                audios: audios.map(audio => ({
                    id: audio.id,
                    name: audio.name,
                    url: `/api/file/${audio.url}`,
                    totalPlayCount: audio.totalPlayCount,
                    classification: {
                        id: audio.classificationId,
                        name: audio.classificationName
                    }
                }))
            }
        };
        
    } catch (error) {
        logger.error('获取总播放量排行失败:', error);
        return {
            success: false,
            message: '获取总播放量排行失败',
            code: 500
        };
    }
}

/**
 * 获取音频的播放统计信息（管理员用）
 * @param {number} audioId - 音频ID
 * @returns {Promise<object>} 播放统计
 */
export async function getAudioPlayStats(audioId) {
    try {
        // 1. 获取总播放量
        const audio = queryOne(
            'SELECT id, name, play_count FROM audio WHERE id = ? AND is_deleted = 0',
            [audioId]
        );
        
        if (!audio) {
            return {
                success: false,
                message: '音频不存在',
                code: 404
            };
        }
        
        // 2. 获取最近7天每日播放量
        const dailyStats = [];
        const today = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const dailyKey = `audio_play_count:daily:${audioId}:${dateStr}`;
            let count = 0;
            
            try {
                const redisCount = await global.redis.get(dailyKey);
                count = parseInt(redisCount || '0');
            } catch (error) {
                logger.debug(`获取每日播放量失败: ${dailyKey}`);
            }
            
            dailyStats.push({
                date: dateStr,
                count: count
            });
        }
        
        // 3. 计算7天总播放量
        const weeklyTotal = dailyStats.reduce((sum, day) => sum + day.count, 0);
        
        return {
            success: true,
            message: '获取播放统计成功',
            data: {
                audioId: audio.id,
                audioName: audio.name,
                totalPlayCount: audio.play_count,
                weeklyPlayCount: weeklyTotal,
                dailyStats: dailyStats
            }
        };
        
    } catch (error) {
        logger.error('获取播放统计失败:', error);
        return {
            success: false,
            message: '获取播放统计失败',
            code: 500
        };
    }
}
