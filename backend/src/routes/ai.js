import express from 'express';
import { optionalAuth } from '../method/auth.js';
import { createRouteHandler } from '../method/route-helpers.js';
import { getAudioMatches } from '../services/ai.js';
import { read_json } from '../method/read.js';

const router = express.Router();

/**
 * 获取客户端IP地址
 */
function getClientIP(req) {
    // 优先使用x-forwarded-for，如果有多个IP，取第一个
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    // 回退到req.ip
    return req.ip || req.connection.remoteAddress;
}

/**
 * 检查IP是否被封禁
 */
async function isIPBlocked(clientIP) {
    const blockKey = `ai_blocked:${clientIP.replace(/\./g, '_')}`;
    const blockedUntil = await global.redis.get(blockKey);

    if (blockedUntil) {
        const now = Math.floor(Date.now() / 1000);
        if (parseInt(blockedUntil) > now) {
            return true;
        } else {
            // 封禁已过期，删除键
            await global.redis.del(blockKey);
        }
    }

    return false;
}

/**
 * 记录可疑行为
 */
async function recordSuspiciousActivity(clientIP, reason) {
    const config = read_json("configs", "config");
    const suspiciousKey = `ai_suspicious:${clientIP.replace(/\./g, '_')}`;
    const failureCount = await global.redis.incr(suspiciousKey);

    // 设置过期时间为1小时
    await global.redis.expire(suspiciousKey, 3600);

    // 如果失败次数超过阈值，封禁IP
    if (failureCount >= config.ai.security.suspiciousThreshold) {
        const blockKey = `ai_blocked:${clientIP.replace(/\./g, '_')}`;
        const blockedUntil = Math.floor(Date.now() / 1000) + config.ai.security.blockDuration;
        await global.redis.setex(blockKey, config.ai.security.blockDuration, blockedUntil);

        logger.warn(`IP ${clientIP} 因可疑行为被封禁，原因: ${reason}, 失败次数: ${failureCount}`);
        return true; // 返回true表示已封禁
    }

    return false;
}

/**
 * AI音频匹配中间件 - 实现访问频率限制和安全保护
 */
const aiRateLimit = async (req, res, next) => {
    try {
        const config = read_json("configs", "config");
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
        const clientIP = getClientIP(req);

        // 1. 检查IP是否被封禁
        if (await isIPBlocked(clientIP)) {
            logger.warn(`被封禁的IP尝试访问AI接口: ${clientIP}`);
            return res.status(403).json({
                code: 403,
                message: '您的IP已被暂时封禁，请稍后再试'
            });
        }

        // 2. 检查每分钟请求限制（IP级别）
        const minuteKey = `ai_ip_minute:${clientIP.replace(/\./g, '_')}:${Math.floor(Date.now() / 60000)}`;
        const minuteRequests = parseInt(await global.redis.get(minuteKey) || '0');

        if (minuteRequests >= config.ai.security.maxRequestsPerMinute) {
            await recordSuspiciousActivity(clientIP, '每分钟请求过多');
            return res.status(429).json({
                code: 429,
                message: '请求过于频繁，请稍后再试'
            });
        }

        // 3. 检查每小时请求限制（IP级别）
        const hourKey = `ai_ip_hour:${clientIP.replace(/\./g, '_')}:${Math.floor(Date.now() / 3600000)}`;
        const hourRequests = parseInt(await global.redis.get(hourKey) || '0');

        if (hourRequests >= config.ai.security.maxRequestsPerHour) {
            const blocked = await recordSuspiciousActivity(clientIP, '每小时请求过多');
            if (blocked) {
                return res.status(403).json({
                    code: 403,
                    message: '您的IP已被暂时封禁，请稍后再试'
                });
            }
            return res.status(429).json({
                code: 429,
                message: '请求过于频繁，请稍后再试'
            });
        }

        let userKey;
        let maxRequests;
        let limitMessage;

        if (req.user) {
            // 已登录用户
            userKey = `ai_usage:user:${req.user.id}:${today}`;
            maxRequests = config.ai.limits.authenticated;
            limitMessage = `今日AI使用次数已达上限（${maxRequests}次），请明天再试`;
        } else {
            // 未登录用户 - 使用IP地址作为标识
            userKey = `ai_usage:guest:${clientIP.replace(/\./g, '_')}:${today}`;
            maxRequests = config.ai.limits.guest;
            limitMessage = `游客每日最多可使用AI ${maxRequests}次，请登录后继续使用`;
        }

        // 4. 检查每日使用限制
        const currentUsage = parseInt(await global.redis.get(userKey) || '0');

        if (currentUsage >= maxRequests) {
            await recordSuspiciousActivity(clientIP, '超过每日使用限制');
            return res.status(429).json({
                code: 429,
                message: limitMessage
            });
        }

        // 5. 更新计数器
        await global.redis.incr(userKey);
        await global.redis.expire(userKey, getSecondsUntilTomorrow());

        await global.redis.incr(minuteKey);
        await global.redis.expire(minuteKey, 60); // 60秒过期

        await global.redis.incr(hourKey);
        await global.redis.expire(hourKey, 3600); // 1小时过期

        next();
    } catch (error) {
        logger.error('AI访问限制检查失败:', error);
        return res.status(500).json({
            code: 500,
            message: '服务器错误，请稍后再试'
        });
    }
};

/**
 * 获取距离明天凌晨的秒数
 */
function getSecondsUntilTomorrow() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return Math.floor((tomorrow - now) / 1000);
}

/**
 * AI音频匹配接口
 * POST /api/ai/match-audios
 */
router.post('/match-audios', optionalAuth, aiRateLimit, createRouteHandler(async (req) => {
    const { description } = req.body;

    // 验证输入参数
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return {
            success: false,
            message: '请提供有效的音频描述',
            code: 400
        };
    }

    if (description.length > 500) {
        return {
            success: false,
            message: '描述文本过长，请控制在500字符以内',
            code: 400
        };
    }

    // 调用AI匹配服务
    const result = await getAudioMatches(description.trim());
    return result;
}));

export default router;
