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
import { addLog } from '../services/logs.js';

/**
 * 记录配置管理操作日志
 * @param {object} req - 请求对象
 * @param {string} action - 操作名称
 * @param {object} details - 操作详情
 */
const logConfigOperation = (req, action, details) => {
    try {
        const user = req.user || {};
        addLog({
            logType: req.method,
            logName: `配置管理-${action}`,
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
        logger.error('记录配置管理操作日志失败:', error);
    }
};

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

        // 记录高危操作日志
        logConfigOperation(req, '保存配置', {
            operatorId: req.user.id,
            operatorName: req.user.name,
            configKeys: Object.keys(flatConfig)
        });

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

        // 记录高危操作日志
        logConfigOperation(req, '触发服务重启', {
            operatorId: req.user.id,
            operatorName: req.user.name,
            pm2Running: pm2Status.running
        });

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
