import express from 'express';
import { createPublicRoute, createValidatedRouteHandler } from '../method/route-helpers.js';
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
    
    return await batchAddGifts(year, month, gifts);
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
    requiredFansCount: { source: 'body', type: 'number', required: false }
}, async (req) => {
    // 验证月份
    if (req.body.month < 1 || req.body.month > 12) {
        return {
            success: false,
            message: '月份必须在1-12之间',
            code: 400
        };
    }
    
    return await addGift(req.body);
}));

/**
 * 更新舰礼（需要管理员权限）
 */
router.put('/captain-gifts/:id', ...createValidatedRouteHandler({
    id: { source: 'params', type: 'number', required: true },
    giftName: { source: 'body', type: 'string', required: true },
    giftContent: { source: 'body', type: 'string', required: false },
    requiredFansCount: { source: 'body', type: 'number', required: false }
}, async (req) => {
    return await updateGift(parseInt(req.params.id), req.body);
}));

/**
 * 删除舰礼（需要管理员权限）
 */
router.delete('/captain-gifts/:id', ...createValidatedRouteHandler({
    id: { source: 'params', type: 'number', required: true }
}, async (req) => {
    return await deleteGift(parseInt(req.params.id));
}));

export default router;
