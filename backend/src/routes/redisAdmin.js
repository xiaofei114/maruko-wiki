import express from 'express';
import { createValidatedRouteHandler } from '../method/route-helpers.js';
import { 
    getRedisKeys, 
    getRedisValue, 
    setRedisValue, 
    deleteRedisKeys,
    getRedisInfo 
} from '../services/redisAdmin.js';

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
    return await setRedisValue(key, value, ttl);
}));

/**
 * 删除 Redis 键
 * DELETE /api/admin/redis/keys
 */
router.delete('/admin/redis/keys', ...createValidatedRouteHandler({
    keys: { source: 'body', type: 'array', required: true }
}, async (req) => {
    const { keys } = req.body;
    return await deleteRedisKeys(keys);
}));

/**
 * 获取 Redis 服务器信息
 * GET /api/admin/redis/info
 */
router.get('/admin/redis/info', ...createValidatedRouteHandler({}, async () => {
    return await getRedisInfo();
}));

export default router;
