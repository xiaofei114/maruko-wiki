import { readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';
import { getTaskCron, isTaskEnabled } from '../services/taskConfigManager.js';

// 获取当前文件的目录路径
const __dirname = dirname(fileURLToPath(import.meta.url));

export default async () => {
    await loadAllMethods()
    logger.info(chalk.white(`定时任务初始化完成`))
}

/**
 * 递归读取目录下的所有 JS 文件
 * @param {string} dir - 目录路径
 * @returns {Promise<string[]>} JS文件路径数组
 */
async function getAllJsFiles(dir) {
    const files = await readdir(dir);
    const jsFiles = [];
    for (const file of files) {
        const filePath = join(dir, file);
        const stats = await stat(filePath);
        if (stats.isDirectory()) {
            const subFiles = await getAllJsFiles(filePath);
            jsFiles.push(...subFiles);
        } else if (file.endsWith('.js')) {
            jsFiles.push(filePath);
        }
    }
    return jsFiles;
}

/**
 * 从文件路径提取任务名称
 * @param {string} filePath - 文件路径
 * @returns {string} 任务名称
 */
function getTaskNameFromFile(filePath) {
    // 从路径中提取文件名（不含扩展名）
    const fileName = filePath.split(/[\\/]/).pop().replace('.js', '');
    return fileName;
}

/**
 * 动态导入模块并合并方法
 * @returns {Promise<{get: Object, post: Object}>}
 */
async function loadAllMethods() {
    const gmDir = join(__dirname, '../systemTasks');
    const jsFiles = await getAllJsFiles(gmDir);

    for (const file of jsFiles) {
        try {
            const module = await import(`file://${file}`);
            const defaultExport = module.default;
            const taskName = getTaskNameFromFile(file);

            // 从配置读取 cron 表达式和启用状态
            const configCron = getTaskCron(taskName, defaultExport.cron);
            const enabled = isTaskEnabled(taskName);

            if (!enabled) {
                logger.info(`[定时任务] ${taskName} 已禁用，跳过加载`);
                continue;
            }

            // 验证 cron 表达式
            if (!cron.validate(configCron)) {
                logger.error(`[定时任务] ${taskName} 的 cron 表达式无效: ${configCron}`);
                continue;
            }

            // 注册定时任务
            const scheduledTask = cron.schedule(configCron, defaultExport.task, {
                scheduled: true,
                timezone: 'Asia/Shanghai'
            });

            // 监听 missed execution 事件，手动补执行（node-cron v4.1.0 不支持 recoverMissedExecutions）
            scheduledTask.on('execution:missed', (executionDate) => {
                logger.warn(`[定时任务] ${taskName} 错过了预定执行时间: ${executionDate}，尝试补执行`);
                // 使用 setImmediate 确保不阻塞事件循环
                setImmediate(async () => {
                    try {
                        // 直接执行任务，执行锁在任务内部处理
                        // 如果任务正在执行，执行锁会跳过，但不会报错
                        await defaultExport.task();
                        logger.info(`[定时任务] ${taskName} 补执行完成`);
                    } catch (error) {
                        logger.error(`[定时任务] ${taskName} 补执行失败:`, error);
                    }
                });
            });

            logger.info(`[定时任务] ${taskName} 已加载，执行周期: ${configCron}`);
        } catch (error) {
            logger.error(`[定时任务] 加载模块失败: ${file}`, error);
        }
    }
}
