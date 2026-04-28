import express from 'express';
import path from 'path';
import { createPublicRoute, createAdminUploadRouteHandler, createAdminRoute, createAdminValidatedRouteHandler } from '../method/route-helpers.js';
import { uploadPlanDocument, getPlanDocuments, deletePlanDocument, setCurrentPlanDocument, getCurrentPlanDocument, getPlanDocumentsForAdmin } from '../services/planDocument.js';
import { getUploadLimit } from "../method/read.js"

const router = express.Router();

router.get('/plan-documents', ...createPublicRoute(getPlanDocuments));

router.get('/plan-documents/current', ...createPublicRoute(getCurrentPlanDocument));

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

router.delete('/plan-documents/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    const documentId = parseInt(req.params.id);
    return await deletePlanDocument(documentId, req.user.id, req.user.permission);
}, 2, 500, { logName: '删除企划文档' }));

router.put('/plan-documents/:id/current', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    const documentId = parseInt(req.params.id);
    return await setCurrentPlanDocument(documentId, req.user.id, req.user.permission);
}, 2, 500, { logName: '设置当前企划文档' }));

router.get('/admin/plan-documents', ...createAdminRoute(getPlanDocumentsForAdmin, 2, { logName: '获取企划文档列表' }));

export default router;
