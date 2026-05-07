import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const projectRoot = path.resolve(__dirname, '../..');
const taskConfigFile = path.join(projectRoot, 'configs', 'task.yaml');
const exampleTaskFile = path.join(projectRoot, 'examples', 'task.yaml');

/**
 * 获取定时任务配置
 * @returns {object} 配置对象
 */
export function getTaskConfig() {
    try {
        if (fs.existsSync(taskConfigFile)) {
            const configData = fs.readFileSync(taskConfigFile, 'utf8');
            return yaml.parse(configData);
        }
        return null;
    } catch (error) {
        logger.error('[任务配置] 读取配置失败:', error);
        throw error;
    }
}

/**
 * 保存定时任务配置
 * @param {object} config - 配置对象
 */
export function saveTaskConfig(config) {
    try {
        const yamlContent = yaml.stringify(config, {
            indent: 2,
            lineWidth: 0
        });
        fs.writeFileSync(taskConfigFile, yamlContent, 'utf8');

        // 更新全局配置缓存
        global.taskConfig = config;

        logger.info('[任务配置] 配置文件已保存');
        return true;
    } catch (error) {
        logger.error('[任务配置] 保存配置失败:', error);
        throw error;
    }
}

/**
 * 获取指定任务的配置
 * @param {string} taskName - 任务名称
 * @returns {object|null} 任务配置
 */
export function getTaskByName(taskName) {
    try {
        const config = getTaskConfig();
        if (config && config.tasks && config.tasks[taskName]) {
            return config.tasks[taskName];
        }
        return null;
    } catch (error) {
        logger.error(`[任务配置] 获取任务 ${taskName} 配置失败:`, error);
        return null;
    }
}

/**
 * 获取任务的cron表达式
 * @param {string} taskName - 任务名称
 * @param {string} defaultCron - 默认cron表达式
 * @returns {string} cron表达式
 */
export function getTaskCron(taskName, defaultCron = '') {
    const task = getTaskByName(taskName);
    if (task && task.enabled !== false && task.cron) {
        return task.cron;
    }
    return defaultCron;
}

/**
 * 检查任务是否启用
 * @param {string} taskName - 任务名称
 * @returns {boolean} 是否启用
 */
export function isTaskEnabled(taskName) {
    const task = getTaskByName(taskName);
    return task ? task.enabled !== false : false;
}

/**
 * 验证任务配置
 * @param {object} config - 配置对象
 * @returns {object} 验证结果
 */
export function validateTaskConfig(config) {
    const errors = [];

    if (!config || typeof config !== 'object') {
        return { valid: false, errors: ['配置格式错误'] };
    }

    if (!config.tasks || typeof config.tasks !== 'object') {
        return { valid: false, errors: ['缺少 tasks 字段'] };
    }

    // 验证每个任务的配置
    for (const [taskName, taskConfig] of Object.entries(config.tasks)) {
        if (!taskConfig.cron || typeof taskConfig.cron !== 'string') {
            errors.push(`任务 ${taskName} 的 cron 表达式无效`);
        }

        if (taskConfig.enabled !== undefined && typeof taskConfig.enabled !== 'boolean') {
            errors.push(`任务 ${taskName} 的 enabled 必须是布尔值`);
        }
    }

    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * 获取任务配置的元数据（用于前端表单）
 * @returns {object} 元数据
 */
export function getTaskConfigMetadata() {
    try {
        const config = getTaskConfig();
        if (!config || !config.tasks) {
            return { tasks: {} };
        }

        const tasks = {};
        for (const [taskName, taskConfig] of Object.entries(config.tasks)) {
            tasks[taskName] = {
                name: taskConfig.name || taskName,
                cron: taskConfig.cron || '',
                enabled: taskConfig.enabled !== false,
                description: taskConfig.description || ''
            };
        }

        return { tasks };
    } catch (error) {
        logger.error('[任务配置] 获取元数据失败:', error);
        return { tasks: {} };
    }
}

/**
 * 重置任务配置为默认值（从examples复制）
 * @returns {boolean} 是否成功
 */
export function resetTaskConfig() {
    try {
        if (fs.existsSync(exampleTaskFile)) {
            fs.copyFileSync(exampleTaskFile, taskConfigFile);

            // 重新加载全局配置
            const configData = fs.readFileSync(taskConfigFile, 'utf8');
            global.taskConfig = yaml.parse(configData);

            logger.info('[任务配置] 已重置为默认配置');
            return true;
        }
        logger.warn('[任务配置] 示例配置文件不存在');
        return false;
    } catch (error) {
        logger.error('[任务配置] 重置配置失败:', error);
        return false;
    }
}
