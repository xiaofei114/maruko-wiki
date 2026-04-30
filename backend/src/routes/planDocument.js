import express from 'express';
import path from 'path';
import { createPublicRoute, createAdminUploadRouteHandler, createAdminRoute, createAdminValidatedRouteHandler } from '../method/route-helpers.js';
import { uploadPlanDocument, getPlanDocuments, deletePlanDocument, setCurrentPlanDocument, getCurrentPlanDocument, getPlanDocumentsForAdmin, reviewPlanDocument, updatePlanDocument } from '../services/planDocument.js';
import { getUploadLimit } from "../method/read.js"

const router = express.Router();

// 公开接口 - 只返回审核通过的文档
router.get('/plan-documents', ...createPublicRoute(getPlanDocuments));

// 公开接口 - 获取当前显示的文档（必须是审核通过的）
router.get('/plan-documents/current', ...createPublicRoute(getCurrentPlanDocument));

// 上传文档接口（需要登录）
router.post('/plan-documents', ...createAdminUploadRouteHandler({
    destination: path.join(process.cwd(), 'data', 'document', 'docs'),
    maxSize: getUploadLimit('document'),
    allowedTypes: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions: ['.docx', '.DOCX']
}, 'document', async (req) => {
    const { title, is_current } = req.body;
    const file = req.file;

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const documentData = {
        title: title?.trim(),
        isCurrent: is_current === '1' || is_current === 'true'
    };

    const result = await uploadPlanDocument(file, documentData, req.user.id, req.user.permission, originalName);
    if (result.success) {
        result.code = 201;
    }
    return result;
}));

// 删除文档接口（需要管理员权限，权限等级2）
router.delete('/plan-documents/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    const documentId = parseInt(req.params.id);
    return await deletePlanDocument(documentId, req.user.id, req.user.permission);
}, 2, 500, { logName: '删除企划文档' }));

// 设置当前文档接口（需要管理员权限，权限等级2）
router.put('/plan-documents/:id/current', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    const documentId = parseInt(req.params.id);
    return await setCurrentPlanDocument(documentId, req.user.id, req.user.permission);
}, 2, 500, { logName: '设置当前企划文档' }));

// 审核文档接口（需要管理员权限，权限等级2）
router.post('/plan-documents/:id/review', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    is_review: { source: 'body', type: 'enum', required: true, enum: [1, 2] }
}, async (req) => {
    const documentId = parseInt(req.params.id);
    const isReview = parseInt(req.body.is_review);
    return await reviewPlanDocument(documentId, isReview, req.user.id);
}, 2, 500, { logName: '审核企划文档' }));

// 修改文档信息接口（需要管理员权限，权限等级2）
router.put('/plan-documents/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    title: { source: 'body', type: 'string', required: true, min: 1, max: 100 }
}, async (req) => {
    const documentId = parseInt(req.params.id);
    const updateData = {
        title: req.body.title?.trim()
    };
    return await updatePlanDocument(documentId, updateData, req.user.id);
}, 2, 500, { logName: '修改企划文档' }));

// 管理员获取所有文档列表（包含待审核的，需要管理员权限，权限等级2）
router.get('/admin/plan-documents', ...createAdminRoute(getPlanDocumentsForAdmin, 2, { logName: '获取企划文档列表' }));

export default router;
