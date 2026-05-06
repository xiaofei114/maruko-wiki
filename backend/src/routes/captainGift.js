import express from 'express';
import { createPublicRoute, createValidatedRouteHandler } from '../method/route-helpers.js';
import { addLog } from '../services/logs.js';
import { 
    getGiftsByMonth, 
    getCurrentMonthGifts, 
    addGift, 
    updateGift, 
    deleteGift,
    batchAddGifts 
} from '../services/captainGift.js';

const router = express.Router();

/**
 * 记录舰礼操作日志
 * @param {object} req - 请求对象
 * @param {string} action - 操作名称
 * @param {object} details - 操作详情
 */
const logGiftOperation = (req, action, details) => {
    try {
        const user = req.user || {};
        addLog({
            logType: req.method,
            logName: `舰礼管理-${action}`,
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
        logger.error('记录舰礼操作日志失败:', error);
    }
};

/**
 * 获取当前月份的舰礼列表（公开接口，用于前端展示）
 */
router.get('/captain-gifts/current', ...createPublicRoute(getCurrentMonthGifts));

/**
 * 批量添加/更新某月舰礼（需要管理员权限）
 * 注意：这个路由必须在 /captain-gifts/:id 之前定义
 */
router.post('/captain-gifts/batch', ...createValidatedRouteHandler({
    year: { source: 'body', type: 'number', required: true },
    month: { source: 'body', type: 'number', required: true },
    gifts: { source: 'body', type: 'array', required: true }
}, async (req) => {
    const { year, month, gifts } = req.body;

    // 验证月份
    if (month < 1 || month > 12) {
        return {
            success: false,
            message: '月份必须在1-12之间',
            code: 400
        };
    }

    // 验证gifts数组
    if (!Array.isArray(gifts)) {
        return {
            success: false,
            message: 'gifts必须是数组',
            code: 400
        };
    }

    const result = await batchAddGifts(year, month, gifts);

    // 记录高危操作日志
    if (result.success) {
        logGiftOperation(req, '批量更新', {
            year,
            month,
            giftCount: gifts.length,
            giftNames: gifts.map(g => g.giftName)
        });
    }

    return result;
}));

/**
 * 获取指定年月的舰礼列表（需要登录）
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 */
router.get('/captain-gifts', ...createValidatedRouteHandler({
    year: { source: 'query', type: 'number', required: true },
    month: { source: 'query', type: 'number', required: true }
}, async (req) => {
    const { year, month } = req.query;
    
    // 验证月份
    if (month < 1 || month > 12) {
        return {
            success: false,
            message: '月份必须在1-12之间',
            code: 400
        };
    }
    
    return await getGiftsByMonth(parseInt(year), parseInt(month));
}));

/**
 * 添加舰礼（需要管理员权限）
 */
router.post('/captain-gifts', ...createValidatedRouteHandler({
    year: { source: 'body', type: 'number', required: true },
    month: { source: 'body', type: 'number', required: true },
    giftName: { source: 'body', type: 'string', required: true },
    giftContent: { source: 'body', type: 'string', required: false },
    requiredFansCount: { source: 'body', type: 'number', required: false },
    giftType: { source: 'body', type: 'number', required: false },
    includes: { source: 'body', type: 'number', required: false },
    showProgress: { source: 'body', type: 'number', required: false },
    startDate: { source: 'body', type: 'string', required: false },
    endDate: { source: 'body', type: 'string', required: false }
}, async (req) => {
    // 验证月份
    if (req.body.month < 1 || req.body.month > 12) {
        return {
            success: false,
            message: '月份必须在1-12之间',
            code: 400
        };
    }

    // 验证礼物类型
    if (req.body.giftType && ![1, 2, 3].includes(req.body.giftType)) {
        return {
            success: false,
            message: '礼物类型必须是1(舰长)、2(提督)或3(总督)',
            code: 400
        };
    }

    // 验证日期格式
    if (req.body.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.startDate)) {
        return {
            success: false,
            message: '开始日期格式不正确，应为YYYY-MM-DD',
            code: 400
        };
    }
    if (req.body.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.endDate)) {
        return {
            success: false,
            message: '结束日期格式不正确，应为YYYY-MM-DD',
            code: 400
        };
    }

    const result = await addGift(req.body);

    // 记录高危操作日志
    if (result.success) {
        logGiftOperation(req, '添加', {
            giftName: req.body.giftName,
            year: req.body.year,
            month: req.body.month,
            giftType: req.body.giftType || 1,
            startDate: req.body.startDate,
            endDate: req.body.endDate
        });
    }

    return result;
}));

/**
 * 更新舰礼（需要管理员权限）
 */
router.put('/captain-gifts/:id', ...createValidatedRouteHandler({
    id: { source: 'params', type: 'number', required: true },
    giftName: { source: 'body', type: 'string', required: true },
    giftContent: { source: 'body', type: 'string', required: false },
    requiredFansCount: { source: 'body', type: 'number', required: false },
    giftType: { source: 'body', type: 'number', required: false },
    includes: { source: 'body', type: 'number', required: false },
    showProgress: { source: 'body', type: 'number', required: false },
    startDate: { source: 'body', type: 'string', required: false },
    endDate: { source: 'body', type: 'string', required: false }
}, async (req) => {
    // 验证礼物类型
    if (req.body.giftType && ![1, 2, 3].includes(req.body.giftType)) {
        return {
            success: false,
            message: '礼物类型必须是1(舰长)、2(提督)或3(总督)',
            code: 400
        };
    }

    // 验证日期格式
    if (req.body.startDate && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.startDate)) {
        return {
            success: false,
            message: '开始日期格式不正确，应为YYYY-MM-DD',
            code: 400
        };
    }
    if (req.body.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(req.body.endDate)) {
        return {
            success: false,
            message: '结束日期格式不正确，应为YYYY-MM-DD',
            code: 400
        };
    }

    logger.debug(`路由层 - req.body.showProgress: ${req.body.showProgress}, 类型: ${typeof req.body.showProgress}`);
    const result = await updateGift(parseInt(req.params.id), req.body);

    // 记录高危操作日志
    if (result.success) {
        logGiftOperation(req, '编辑', {
            giftId: req.params.id,
            giftName: req.body.giftName,
            giftType: req.body.giftType,
            startDate: req.body.startDate,
            endDate: req.body.endDate
        });
    }

    return result;
}));

/**
 * 删除舰礼（需要管理员权限）
 */
router.delete('/captain-gifts/:id', ...createValidatedRouteHandler({
    id: { source: 'params', type: 'number', required: true }
}, async (req) => {
    // 先获取礼物信息用于日志记录
    const giftInfo = await getGiftsByMonth(req.query?.year || new Date().getFullYear(), req.query?.month || new Date().getMonth() + 1);
    const gift = giftInfo.data?.gifts?.find(g => g.id === parseInt(req.params.id));

    const result = await deleteGift(parseInt(req.params.id));

    // 记录高危操作日志
    if (result.success) {
        logGiftOperation(req, '删除', {
            giftId: req.params.id,
            giftName: gift?.giftName || '未知礼物',
            giftType: gift?.giftType
        });
    }

    return result;
}));

export default router;
