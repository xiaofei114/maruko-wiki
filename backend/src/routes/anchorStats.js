import express from 'express';
import { createPublicRoute, createValidatedRouteHandler } from '../method/route-helpers.js';
import { getStatsByRange, getLatestStats, getCurrentMonthMaxCaptainCount } from '../services/anchorStats.js';

const router = express.Router();

/**
 * 获取指定时间范围内的主播统计数据
 * @param {string} range - 时间范围：'week'(1周), 'month'(1月), 'year'(1年)
 */
router.get('/anchor-stats', ...createValidatedRouteHandler({
    range: { source: 'query', type: 'string', required: false }
}, async (req) => {
    const range = req.query.range || 'month';
    // 验证range参数
    const validRanges = ['week', 'month', 'year'];
    if (!validRanges.includes(range)) {
        return {
            success: false,
            message: '无效的时间范围参数，可选值: week, month, year',
            code: 400
        };
    }
    return await getStatsByRange(range);
}));

/**
 * 获取最新的主播统计数据
 */
router.get('/anchor-stats/latest', ...createPublicRoute(getLatestStats));

/**
 * 获取本月最高舰长数
 */
router.get('/anchor-stats/max-captain', ...createPublicRoute(getCurrentMonthMaxCaptainCount));

export default router;
