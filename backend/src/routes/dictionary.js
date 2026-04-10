import express from 'express';
import { createAdminValidatedRouteHandler, createAdminRoute, createRouteHandler } from '../method/route-helpers.js';
import { authenticateToken, requirePermission } from '../method/auth.js';
import { handleServiceResult, sendError } from '../method/response.js';
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
router.post('/dictionary/types', authenticateToken, requirePermission(2), async (req, res) => {
    try {
        const { typeId, name, dict_type } = req.body;

        const result = await addOrUpdateType({
            typeId: typeId ? parseInt(typeId) : undefined,
            name,
            dict_type
        });

        return handleServiceResult(res, result);
    } catch (error) {
        logger.error('创建/更新字典类型失败:', error);
        return sendError(res, 500, '服务器内部错误');
    }
});

/**
 * 删除字典类型
 * DELETE /api/admin/dictionary/types/:id
 */
router.delete('/dictionary/types/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deleteType(req.params.id);
}, 2));

/**
 * 禁用/启用字典类型
 * PUT /api/admin/dictionary/types/:id/ban
 * Body参数:
 * - banned: 是否禁用 (true/false)
 */
router.put('/dictionary/types/:id/ban', authenticateToken, requirePermission(2), async (req, res) => {
    try {
        const { banned } = req.body;
        const id = parseInt(req.params.id);

        if (!id || id <= 0) {
            return sendError(res, 400, '无效的类型ID');
        }

        const result = await banType(id, banned);
        return handleServiceResult(res, result);
    } catch (error) {
        logger.error('禁用/启用字典类型失败:', error);
        return sendError(res, 500, '服务器内部错误');
    }
});

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
router.post('/dictionary/items', authenticateToken, requirePermission(2), async (req, res) => {
    try {
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

        return handleServiceResult(res, result);
    } catch (error) {
        logger.error('创建/更新字典项失败:', error);
        return sendError(res, 500, '服务器内部错误');
    }
});

/**
 * 删除字典项
 * DELETE /api/admin/dictionary/items/:id
 */
router.delete('/dictionary/items/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deleteItem(req.params.id);
}, 2));

/**
 * 禁用/启用字典项
 * PUT /api/admin/dictionary/items/:id/ban
 * Body参数:
 * - banned: 是否禁用 (true/false)
 */
router.put('/dictionary/items/:id/ban', authenticateToken, requirePermission(2), async (req, res) => {
    try {
        const { banned } = req.body;
        const id = parseInt(req.params.id);

        if (!id || id <= 0) {
            return sendError(res, 400, '无效的字典项ID');
        }

        const result = await banItem(id, banned);
        return handleServiceResult(res, result);
    } catch (error) {
        logger.error('禁用/启用字典项失败:', error);
        return sendError(res, 500, '服务器内部错误');
    }
});

export default router;
