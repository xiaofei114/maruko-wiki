import express from 'express';
import { authenticateToken, requirePermission } from '../method/auth.js';
import { createRouteHandler } from '../method/route-helpers.js';
import {
    getConfig,
    saveConfig,
    saveFlatConfig,
    restartWithPM2,
    getPM2Status,
    getConfigMetadata,
    validateConfig
} from '../services/configManager.js';

const router = express.Router();

// 仅超级管理员可以访问配置管理
const requireSuperAdmin = requirePermission(1);

/**
 * 获取当前配置
 * GET /api/admin/config
 */
router.get('/',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const config = getConfig();
        return {
            success: true,
            code: 200,
            data: config,
            message: '获取配置成功'
        };
    })
);

/**
 * 获取配置元数据（用于前端表单）
 * GET /api/admin/config/metadata
 */
router.get('/metadata',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const metadata = getConfigMetadata();
        return {
            success: true,
            code: 200,
            data: metadata,
            message: '获取配置元数据成功'
        };
    })
);

/**
 * 保存配置（展平格式）
 * POST /api/admin/config
 */
router.post('/',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const flatConfig = req.body;

        // 验证配置
        const validation = validateConfig(flatConfig);
        if (!validation.valid) {
            return {
                success: false,
                code: 400,
                message: '配置验证失败: ' + validation.errors.join(', ')
            };
        }

        // 保存展平配置（会自动转换类型并还原嵌套结构）
        saveFlatConfig(flatConfig);

        return {
            success: true,
            code: 200,
            message: '配置已保存，请手动重启服务以应用更改'
        };
    })
);

/**
 * 获取 PM2 状态
 * GET /api/admin/config/pm2-status
 */
router.get('/pm2-status',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const status = await getPM2Status();
        return {
            success: true,
            code: 200,
            data: status,
            message: '获取 PM2 状态成功'
        };
    })
);

/**
 * 手动触发重启
 * POST /api/admin/config/trigger-restart
 */
router.post('/trigger-restart',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const pm2Status = await getPM2Status();

        if (!pm2Status.running) {
            return {
                success: false,
                code: 400,
                message: '当前未在 PM2 环境下运行，无法自动重启'
            };
        }

        // 异步重启
        setTimeout(() => {
            restartWithPM2().catch(err => {
                logger.error('PM2 重启失败:', err);
            });
        }, 1000);

        return {
            success: true,
            code: 200,
            message: '服务将在 1 秒后重启'
        };
    })
);

export default router;
