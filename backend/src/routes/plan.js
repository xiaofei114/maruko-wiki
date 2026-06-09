import express from 'express';
import path from 'path';
import { createPublicRoute, createAdminUploadRouteHandler, createAdminValidatedRouteHandler, createRouteHandler, createAdminRoute } from '../method/route-helpers.js';
import { optionalAuth } from '../method/auth.js';
import { getPlanList, getPlanListForAdmin, createPlan, updatePlan, deletePlan } from '../services/plan.js';
import { getUploadLimit } from "../method/read.js"

const router = express.Router();

// 获取企划列表（未登录看不到DD内部企划）
router.get('/plan/list', optionalAuth, createRouteHandler(async (req) => {
    const { year, month } = req.query;
    return await getPlanList(req.user, { year, month });
}));

// 上传企划（需要登录，上传权限等级2）
router.post('/plan', ...createAdminUploadRouteHandler({
    destination: path.join(process.cwd(), 'data', 'document', 'docs'),
    maxSize: getUploadLimit('document'),
    allowedTypes: [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'text/plain'
    ],
    allowedExtensions: ['.docx', '.DOCX', '.pdf', '.PDF', '.txt', '.TXT']
}, 'file', async (req) => {
    const { title, type, anchorCategory, ddVisibility, timeType, date, startDate, endDate } = req.body;
    const file = req.file || null;

    return await createPlan(file, {
        title: title?.trim(),
        type,
        anchorCategory,
        ddVisibility,
        timeType,
        date,
        startDate,
        endDate
    });
}));

// 删除企划（需要管理员权限2）
router.delete('/plan/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deletePlan(parseInt(req.params.id));
}, 2, 500, { logName: '删除企划' }));

// 管理后台 - 获取企划列表（分页，支持筛选）
router.get('/admin/plan/list', ...createAdminRoute(async (req) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const filters = {
        title: req.query.title || '',
        type: req.query.type || '',
        anchorCategory: req.query.anchorCategory || '',
        ddVisibility: req.query.ddVisibility || '',
        timeType: req.query.timeType || ''
    };
    const result = await getPlanListForAdmin({ page, pageSize }, filters);
    // 把 pagination 放进 data 里一起返回
    if (result.success && result.pagination) {
        result.data = {
            list: result.data,
            pagination: result.pagination
        };
        delete result.pagination;
    }
    return result;
}, 2, { logName: '获取企划管理列表' }));

// 管理后台 - 更新企划
router.put('/plan/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    title: { source: 'body', type: 'string', required: true }
}, async (req) => {
    return await updatePlan(parseInt(req.params.id), req.body);
}, 2, 500, { logName: '修改企划' }));

export default router;
