import express from 'express';
import fs from 'fs';
import path from 'path';
import { createSuccessResponse, createErrorResponse } from '../method/business-utils.js';

const router = express.Router();

// 获取当前版本号
router.get('/version', (req, res) => {
    try {
        const versionPath = path.join(process.cwd(), 'data', 'version.json');
        const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        
        return res.json(createSuccessResponse('获取版本号成功', {
            version: versionData.version
        }));
    } catch (error) {
        logger.error('获取版本号失败:', error);
        return res.json(createErrorResponse('获取版本号失败'));
    }
});

export default router;
