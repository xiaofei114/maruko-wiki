import express from 'express';
import { createAdminValidatedRouteHandler, createAdminRoute, createRouteHandler } from '../method/route-helpers.js';
import { authenticateToken, requirePermission } from '../method/auth.js';
import { handleServiceResult, sendError } from '../method/response.js';
import { addLog } from '../services/logs.js';
import {
    getTypesPaged,
    getItemsPaged,
    addOrUpdateType,
    addOrUpdateItem,
    deleteType,
    deleteItem,
    banType,
    banItem
} from '../services/dictionary.js';

/**
 * 记录字典管理操作日志
 * @param {object} req - 请求对象
 * @param {string} action - 操作名称
 * @param {object} details - 操作详情
 */
const logDictionaryOperation = (req, action, details) => {
    try {
        const user = req.user || {};
        addLog({
            logType: req.method,
            logName: `字典管理-${action}`,
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
        logger.error('记录字典管理操作日志失败:', error);
    }
};

const router = express.Router();

// ======================== 字典类型接口 ========================

/**
 * 分页获取字典类型列表（管理员）
 * GET /api/admin/dictionary/types
 * Query参数:
 * - page: 页码，默认1
 * - pageSize: 每页数量，默认10
 * - includeBanned: 是否包含已禁用项，默认false
 */
router.get('/dictionary/types', ...createAdminRoute(async (req) => {
    const { page, pageSize, includeBanned } = req.query;

    return await getTypesPaged({
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 10,
        includeBanned: includeBanned === 'true' || includeBanned === true
    });
}, 2));

/**
 * 创建或更新字典类型
 * POST /api/admin/dictionary/types
 * Body参数:
 * - typeId: 类型ID（更新时必填）
 * - name: 类型名称
 * - dict_type: 类型标识
 */
router.post('/dictionary/types', ...createAdminValidatedRouteHandler({
    name: { required: true, minLength: 1, maxLength: 50 },
    dict_type: { required: true, minLength: 1, maxLength: 50 },
    typeId: { required: false }
}, async (req) => {
    const { typeId, name, dict_type } = req.body;
    const result = await addOrUpdateType({
        typeId: typeId ? parseInt(typeId) : undefined,
        name,
        dict_type
    });
    
    // 记录操作日志
    if (result.success) {
        logDictionaryOperation(req, typeId ? '更新字典类型' : '创建字典类型', {
            typeId: typeId || result.data?.typeId,
            typeName: name,
            typeCode: dict_type,
            operatorId: req.user?.id,
            operatorName: req.user?.name
        });
    }
    
    return result;
}, 2, 500, { logName: '创建/更新字典类型' }));

/**
 * 删除字典类型
 * DELETE /api/admin/dictionary/types/:id
 */
router.delete('/dictionary/types/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    const result = await deleteType(req.params.id);
    
    // 记录高危操作日志
    if (result.success) {
        logDictionaryOperation(req, '删除字典类型', {
            typeId: req.params.id,
            operatorId: req.user?.id,
            operatorName: req.user?.name
        });
    }
    
    return result;
}, 2, 500, { logName: '删除字典类型' }));

/**
 * 禁用/启用字典类型
 * PUT /api/admin/dictionary/types/:id/ban
 * Body参数:
 * - banned: 是否禁用 (true/false)
 */
router.put('/dictionary/types/:id/ban', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    banned: { type: 'boolean', required: true }
}, async (req) => {
    const result = await banType(req.params.id, req.body.banned);
    
    // 记录操作日志
    if (result.success) {
        logDictionaryOperation(req, req.body.banned ? '禁用字典类型' : '启用字典类型', {
            typeId: req.params.id,
            operatorId: req.user?.id,
            operatorName: req.user?.name
        });
    }
    
    return result;
}, 2, 500, { logName: '禁用/启用字典类型' }));

// ======================== 字典项接口 ========================

/**
 * 分页获取字典项列表
 * GET /api/admin/dictionary/items
 * Query参数:
 * - dictType: 字典类型标识（必填）
 * - page: 页码，默认1
 * - pageSize: 每页数量，默认10
 * - includeBanned: 是否包含已禁用项，默认false
 */
router.get('/dictionary/items', ...createAdminRoute(async (req) => {
    const { dictType, page, pageSize, includeBanned } = req.query;

    return await getItemsPaged({
        dictType,
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 10,
        includeBanned: includeBanned === 'true' || includeBanned === true
    });
}, 2));

/**
 * 创建或更新字典项
 * POST /api/admin/dictionary/items
 * Body参数:
 * - itemId: 字典项ID（更新时必填）
 * - dict_type: 字典类型标识
 * - dict_label: 字典标签
 * - dict_key: 字典键
 * - dict_key2: 字典键2（可选）
 * - sort: 排序（可选）
 * - display_style: 显示样式（可选）
 */
router.post('/dictionary/items', ...createAdminValidatedRouteHandler({
    dict_type: { required: true, minLength: 1, maxLength: 50 },
    dict_label: { required: true, minLength: 1, maxLength: 100 },
    dict_key: { required: true },
    dict_key2: { required: false },
    sort: { required: false, type: 'number' },
    display_style: { required: false },
    itemId: { required: false }
}, async (req) => {
    const { itemId, dict_type, dict_label, dict_key, dict_key2, sort, display_style } = req.body;
    const result = await addOrUpdateItem({
        itemId: itemId ? parseInt(itemId) : undefined,
        dict_type,
        dict_label,
        dict_key,
        dict_key2,
        sort: sort ? parseInt(sort) : undefined,
        display_style
    });
    
    // 记录操作日志
    if (result.success) {
        logDictionaryOperation(req, itemId ? '更新字典项' : '创建字典项', {
            itemId: itemId || result.data?.itemId,
            dictType: dict_type,
            dictLabel: dict_label,
            dictKey: dict_key,
            operatorId: req.user?.id,
            operatorName: req.user?.name
        });
    }
    
    return result;
}, 2, 500, { logName: '创建/更新字典项' }));

/**
 * 删除字典项
 * DELETE /api/admin/dictionary/items/:id
 */
router.delete('/dictionary/items/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    const result = await deleteItem(req.params.id);
    
    // 记录高危操作日志
    if (result.success) {
        logDictionaryOperation(req, '删除字典项', {
            itemId: req.params.id,
            operatorId: req.user?.id,
            operatorName: req.user?.name
        });
    }
    
    return result;
}, 2, 500, { logName: '删除字典项' }));

/**
 * 禁用/启用字典项
 * PUT /api/admin/dictionary/items/:id/ban
 * Body参数:
 * - banned: 是否禁用 (true/false)
 */
router.put('/dictionary/items/:id/ban', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    banned: { type: 'boolean', required: true }
}, async (req) => {
    const result = await banItem(req.params.id, req.body.banned);
    
    // 记录操作日志
    if (result.success) {
        logDictionaryOperation(req, req.body.banned ? '禁用字典项' : '启用字典项', {
            itemId: req.params.id,
            operatorId: req.user?.id,
            operatorName: req.user?.name
        });
    }
    
    return result;
}, 2, 500, { logName: '禁用/启用字典项' }));

export default router;
