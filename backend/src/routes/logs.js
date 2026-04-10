import express from 'express';
import { createAdminRoute } from '../method/route-helpers.js';
import { getQueryLogs } from '../services/logs.js';

const router = express.Router();

/**
 * 查询日志列表（管理员专用）
 * GET /api/admin/logs
 * Query参数:
 * - page: 页码，默认1
 * - pageSize: 每页数量，默认10
 * - showUserIp: 是否显示用户IP，默认false
 */
router.get('/logs', ...createAdminRoute(async (req) => {
    const { page, pageSize, showUserIp } = req.query;

    return await getQueryLogs({
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 10,
        showUserIp: showUserIp === 'true' || showUserIp === true
    });
}, 2));

export default router;
