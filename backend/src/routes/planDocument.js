import express from 'express';
import path from 'path';
import { createPublicRoute, createAdminUploadRouteHandler, createAdminRoute, createRouteHandler } from '../method/route-helpers.js';
import { authenticateToken } from '../method/auth.js';
import { uploadPlanDocument, getPlanDocuments, deletePlanDocument, setCurrentPlanDocument, getCurrentPlanDocument, getPlanDocumentsForAdmin } from '../services/planDocument.js';

const router = express.Router();

router.get('/plan-documents', ...createPublicRoute(getPlanDocuments));

router.get('/plan-documents/current', ...createPublicRoute(getCurrentPlanDocument));

router.post('/plan-documents', ...createAdminUploadRouteHandler({
    destination: path.join(process.cwd(), 'data', 'document', 'docs'),
    maxSize: 20 * 1024 * 1024,
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

router.delete('/plan-documents/:id', authenticateToken, createRouteHandler(async (req) => {
    const documentId = parseInt(req.params.id);
    
    if (!documentId || documentId <= 0) {
        return {
            success: false,
            message: '无效的文档ID',
            code: 400
        };
    }
    
    return await deletePlanDocument(documentId, req.user.id, req.user.permission);
}));

router.put('/plan-documents/:id/current', authenticateToken, createRouteHandler(async (req) => {
    const documentId = parseInt(req.params.id);
    
    if (!documentId || documentId <= 0) {
        return {
            success: false,
            message: '无效的文档ID',
            code: 400
        };
    }
    
    return await setCurrentPlanDocument(documentId, req.user.id, req.user.permission);
}));

router.get('/admin/plan-documents', ...createAdminRoute(getPlanDocumentsForAdmin));

export default router;
