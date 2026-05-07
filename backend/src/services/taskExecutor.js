import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { addLog } from './logs.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logger = global.logger;

// 存储正在运行的任务
const runningTasks = new Map();

/**
 * 记录任务执行日志
 * @param {string} taskName - 任务名称
 * @param {string} action - 操作
 * @param {object} details - 详情
 */
const logTaskExecution = (taskName, action, details = {}) => {
    try {
        addLog({
            logType: 'TASK',
            logName: `定时任务-${action}`,
            logContent: `任务: ${taskName}`,
            requestParams: JSON.stringify(details),
            userName: 'system',
            userIp: '',
            logReturn: null
        });
    } catch (error) {
        logger.error('[任务执行] 记录日志失败:', error);
    }
};

/**
 * 立即执行指定任务
 * @param {string} taskName - 任务名称
 * @returns {Promise<object>} 执行结果
 */
export async function executeTask(taskName) {
    // 检查任务是否正在运行
    if (runningTasks.has(taskName)) {
        return {
            success: false,
            code: 409,
            message: `任务 ${taskName} 正在执行中，请稍后再试`
        };
    }

    try {
        // 构建任务文件路径
        const taskFilePath = join(__dirname, '../systemTasks', `${taskName}.js`);

        // 动态导入任务模块
        const module = await import(`file://${taskFilePath}`);
        const defaultExport = module.default;

        if (!defaultExport || typeof defaultExport.task !== 'function') {
            return {
                success: false,
                code: 404,
                message: `任务 ${taskName} 不存在或没有 task 方法`
            };
        }

        // 标记任务开始运行
        runningTasks.set(taskName, {
            startTime: new Date(),
            status: 'running'
        });

        logger.info(`[任务执行] 开始立即执行任务: ${taskName}`);
        logTaskExecution(taskName, '立即执行', { trigger: 'manual' });

        // 执行任务 - 不等待结果，直接返回
        try {
            defaultExport.task();
        } catch (error) {
            logger.error(`[任务执行] 任务 ${taskName} 执行出错:`, error);
        }

        // 延迟清理运行状态（给任务启动时间）
        setTimeout(() => {
            runningTasks.delete(taskName);
            logTaskExecution(taskName, '已启动', { duration: Date.now() - runningTasks.get(taskName)?.startTime });
        }, 100);

        return {
            success: true,
            code: 200,
            message: `任务 ${taskName} 已在后台启动执行，请查看日志了解执行结果`
        };

    } catch (error) {
        runningTasks.delete(taskName);
        logger.error(`[任务执行] 执行任务 ${taskName} 失败:`, error);
        return {
            success: false,
            code: 500,
            message: `执行任务失败: ${error.message}`
        };
    }
}

/**
 * 获取任务执行状态
 * @param {string} taskName - 任务名称
 * @returns {object|null} 任务状态
 */
export function getTaskStatus(taskName) {
    return runningTasks.get(taskName) || null;
}

/**
 * 获取所有正在运行的任务
 * @returns {Map} 正在运行的任务
 */
export function getAllRunningTasks() {
    return runningTasks;
}

/**
 * 获取可用任务列表
 * @returns {Promise<Array>} 任务列表
 */
export async function getAvailableTasks() {
    try {
        const { readdir } = await import('fs/promises');
        const { join } = await import('path');
        const tasksDir = join(__dirname, '../systemTasks');
        const files = await readdir(tasksDir);

        const tasks = [];
        for (const file of files) {
            if (file.endsWith('.js')) {
                const taskName = file.replace('.js', '');
                try {
                    const taskFilePath = join(tasksDir, file);
                    const module = await import(`file://${taskFilePath}`);
                    const defaultExport = module.default;

                    tasks.push({
                        name: taskName,
                        hasTask: typeof defaultExport?.task === 'function',
                        description: defaultExport?.description || ''
                    });
                } catch (error) {
                    logger.warn(`[任务执行] 加载任务 ${taskName} 失败:`, error.message);
                }
            }
        }

        return tasks;
    } catch (error) {
        logger.error('[任务执行] 获取可用任务列表失败:', error);
        return [];
    }
}
