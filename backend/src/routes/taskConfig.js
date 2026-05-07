import express from 'express';
import { authenticateToken, requirePermission } from '../method/auth.js';
import { createRouteHandler } from '../method/route-helpers.js';
import {
    getTaskConfig,
    saveTaskConfig,
    validateTaskConfig,
    getTaskConfigMetadata,
    resetTaskConfig
} from '../services/taskConfigManager.js';
import { executeTask, getAvailableTasks } from '../services/taskExecutor.js';
import { addLog } from '../services/logs.js';

/**
 * 记录任务配置管理操作日志
 * @param {object} req - 请求对象
 * @param {string} action - 操作名称
 * @param {object} details - 操作详情
 */
const logTaskConfigOperation = (req, action, details) => {
    try {
        const user = req.user || {};
        addLog({
            logType: req.method,
            logName: `任务配置管理-${action}`,
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
        logger.error('记录任务配置管理操作日志失败:', error);
    }
};

const router = express.Router();

// 仅超级管理员可以访问任务配置管理
const requireSuperAdmin = requirePermission(1);

/**
 * 获取当前任务配置
 * GET /api/admin/task-config
 */
router.get('/',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const config = getTaskConfig();
        return {
            success: true,
            code: 200,
            data: config,
            message: '获取任务配置成功'
        };
    })
);

/**
 * 获取任务配置元数据（用于前端表单）
 * GET /api/admin/task-config/metadata
 */
router.get('/metadata',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const metadata = getTaskConfigMetadata();
        return {
            success: true,
            code: 200,
            data: metadata,
            message: '获取任务配置元数据成功'
        };
    })
);

/**
 * 保存任务配置
 * POST /api/admin/task-config
 */
router.post('/',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const config = req.body;

        // 验证配置
        const validation = validateTaskConfig(config);
        if (!validation.valid) {
            return {
                success: false,
                code: 400,
                message: '配置验证失败: ' + validation.errors.join(', ')
            };
        }

        // 保存配置
        saveTaskConfig(config);

        // 记录操作日志
        logTaskConfigOperation(req, '保存配置', { tasks: Object.keys(config.tasks || {}) });

        return {
            success: true,
            code: 200,
            message: '任务配置已保存，重启服务后生效'
        };
    })
);

/**
 * 重置任务配置为默认值
 * POST /api/admin/task-config/reset
 */
router.post('/reset',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const result = resetTaskConfig();

        if (result) {
            // 记录操作日志
            logTaskConfigOperation(req, '重置配置', {});

            return {
                success: true,
                code: 200,
                message: '任务配置已重置为默认值，重启服务后生效'
            };
        } else {
            return {
                success: false,
                code: 500,
                message: '重置配置失败'
            };
        }
    })
);

/**
 * 获取可用任务列表
 * GET /api/admin/task-config/tasks
 */
router.get('/tasks',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const tasks = await getAvailableTasks();
        return {
            success: true,
            code: 200,
            data: tasks,
            message: '获取可用任务列表成功'
        };
    })
);

/**
 * 立即执行指定任务
 * POST /api/admin/task-config/execute/:taskName
 */
router.post('/execute/:taskName',
    authenticateToken,
    requireSuperAdmin,
    createRouteHandler(async (req) => {
        const { taskName } = req.params;

        if (!taskName) {
            return {
                success: false,
                code: 400,
                message: '任务名称不能为空'
            };
        }

        // 记录操作日志
        logTaskConfigOperation(req, '立即执行任务', { taskName });

        // 执行任务
        const result = await executeTask(taskName);
        return result;
    })
);

export default router;
