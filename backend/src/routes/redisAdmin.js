import express from 'express';
import { createValidatedRouteHandler } from '../method/route-helpers.js';
import { addLog } from '../services/logs.js';
import { 
    getRedisKeys, 
    getRedisValue, 
    setRedisValue, 
    deleteRedisKeys,
    getRedisInfo 
} from '../services/redisAdmin.js';

/**
 * 记录Redis管理操作日志
 * @param {object} req - 请求对象
 * @param {string} action - 操作名称
 * @param {object} details - 操作详情
 */
const logRedisOperation = (req, action, details) => {
    try {
        const user = req.user || {};
        addLog({
            logType: req.method,
            logName: `Redis管理-${action}`,
            logContent: req.originalUrl || req.url,
            requestParams: JSON.stringify({
                body: req.body,
                params: req.params,
                query: req.query,
                details: details
            }),
            userName: user.username || user.name || '未知用户',
            userIp: req.ip || req.connection?.remoteAddress || '',
            logReturn: null
        });
    } catch (error) {
        logger.error('记录Redis管理操作日志失败:', error);
    }
};

const router = express.Router();

/**
 * 获取 Redis 键列表
 * GET /api/admin/redis/keys?pattern=*&limit=100
 */
router.get('/admin/redis/keys', ...createValidatedRouteHandler({
    pattern: { source: 'query', type: 'string', required: false },
    limit: { source: 'query', type: 'number', required: false }
}, async (req) => {
    const pattern = req.query.pattern || '*';
    const limit = parseInt(req.query.limit) || 100;
    return await getRedisKeys(pattern, limit);
}));

/**
 * 获取 Redis 键值详情
 * GET /api/admin/redis/value/:key
 */
router.get('/admin/redis/value/:key', ...createValidatedRouteHandler({
    key: { source: 'params', type: 'string', required: true }
}, async (req) => {
    const key = decodeURIComponent(req.params.key);
    return await getRedisValue(key);
}));

/**
 * 设置 Redis 键值
 * POST /api/admin/redis/value
 */
router.post('/admin/redis/value', ...createValidatedRouteHandler({
    key: { source: 'body', type: 'string', required: true },
    value: { source: 'body', type: 'string', required: true },
    ttl: { source: 'body', type: 'number', required: false }
}, async (req) => {
    const { key, value, ttl } = req.body;
    const result = await setRedisValue(key, value, ttl);
    
    // 记录高危操作日志
    if (result.success) {
        logRedisOperation(req, '设置键值', {
            key,
            hasTtl: !!ttl,
            ttl: ttl || null
        });
    }
    
    return result;
}));

/**
 * 删除 Redis 键
 * DELETE /api/admin/redis/keys
 */
router.delete('/admin/redis/keys', ...createValidatedRouteHandler({
    keys: { source: 'body', type: 'array', required: true }
}, async (req) => {
    const { keys } = req.body;
    const result = await deleteRedisKeys(keys);
    
    // 记录高危操作日志
    if (result.success) {
        logRedisOperation(req, '删除键', {
            deletedKeys: keys,
            deletedCount: keys.length
        });
    }
    
    return result;
}));

/**
 * 获取 Redis 服务器信息
 * GET /api/admin/redis/info
 */
router.get('/admin/redis/info', ...createValidatedRouteHandler({}, async () => {
    return await getRedisInfo();
}));

export default router;
