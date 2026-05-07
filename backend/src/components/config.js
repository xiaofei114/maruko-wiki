import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 项目根目录
const projectRoot = path.resolve(__dirname, '../..');

// 目录路径
const configDir = path.join(projectRoot, 'configs');
const exampleDir = path.join(projectRoot, 'examples');

// 配置文件路径
const configFile = path.join(configDir, 'config.yaml');
const taskConfigFile = path.join(configDir, 'task.yaml');

// 全局配置缓存
// 注意：配置在启动时加载一次，不支持热更新，修改配置后需要重启服务
global.appConfig = null;
global.taskConfig = null;

// 日志缓存（在 logger 初始化前缓存日志，初始化后输出）
const logCache = [];

// 统一的日志函数（支持 logger 和 console 回退）
function log(level, message) {
    if (typeof logger !== 'undefined') {
        // logger 已初始化，直接使用
        logger[level](message);
    } else {
        // logger 未初始化，缓存日志（只存级别和消息，不存时间戳）
        logCache.push({ level, message });
    }
}

// 刷新缓存的日志到 logger（在 logger 初始化后调用）
export function flushConfigLogs() {
    if (typeof logger === 'undefined' || logCache.length === 0) {
        return;
    }

    for (const { level, message } of logCache) {
        if (logger[level]) {
            logger[level](chalk.white(message));
        } else {
            logger.info(chalk.white(message));
        }
    }

    // 清空缓存
    logCache.length = 0;
}

// 复制目录内容的函数（只复制文件，不递归复制子目录）
function copyDirectoryContents(source, target) {
    let copiedCount = 0;

    // 确保目标目录存在
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    // 只复制源目录下的直接文件，不递归处理子目录
    const items = fs.readdirSync(source);

    for (const item of items) {
        const sourcePath = path.join(source, item);
        const targetPath = path.join(target, item);

        const stat = fs.statSync(sourcePath);

        // 只处理文件，跳过目录
        if (stat.isFile()) {
            // 只复制不存在的文件
            if (!fs.existsSync(targetPath)) {
                fs.copyFileSync(sourcePath, targetPath);
                log('info', `已复制文件: ${path.relative(projectRoot, targetPath)}`);
                copiedCount++;
            }
        }
        // 跳过目录，不递归复制
    }

    return copiedCount;
}

// 深度合并对象（将默认值合并到现有配置）
function deepMerge(target, source) {
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                // 如果是对象，递归合并
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                deepMerge(target[key], source[key]);
            } else if (!(key in target)) {
                // 如果目标中不存在该字段，使用默认值
                target[key] = source[key];
            }
        }
    }
    return target;
}

// 检查并补充缺失的配置字段
function checkAndFillMissingConfig() {
    try {
        const exampleFile = path.join(exampleDir, 'config.yaml');

        // 如果示例文件不存在，跳过检查
        if (!fs.existsSync(exampleFile)) {
            return false;
        }

        // 读取示例配置（作为默认值）
        const exampleData = fs.readFileSync(exampleFile, 'utf8');
        const exampleConfig = yaml.parse(exampleData);

        // 读取当前配置
        const configData = fs.readFileSync(configFile, 'utf8');
        const currentConfig = yaml.parse(configData);

        // 复制当前配置用于合并
        const mergedConfig = JSON.parse(JSON.stringify(currentConfig));

        // 深度合并，补充缺失字段
        deepMerge(mergedConfig, exampleConfig);

        // 检查是否有新增字段
        const hasNewFields = JSON.stringify(currentConfig) !== JSON.stringify(mergedConfig);

        if (hasNewFields) {
            // 备份原配置到 data/backupConfigs
            const backupDir = path.join(projectRoot, 'data', 'backupConfigs');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const backupFile = path.join(backupDir, `config.yaml.backup.${Date.now()}`);
            fs.copyFileSync(configFile, backupFile);
            log('info', `已备份原配置到: ${path.relative(projectRoot, backupFile)}`);

            // 写入合并后的配置
            const mergedYaml = yaml.stringify(mergedConfig, {
                indent: 2,
                lineWidth: 0
            });
            fs.writeFileSync(configFile, mergedYaml, 'utf8');

            log('info', '已自动补充缺失的配置字段，请检查新添加的配置项');
            return true;
        }

        return false;
    } catch (error) {
        log('error', '检查配置字段失败: ' + error.message);
        return false;
    }
}

// 检查并补充缺失的定时任务配置字段
function checkAndFillMissingTaskConfig() {
    try {
        const exampleFile = path.join(exampleDir, 'task.yaml');

        // 如果示例文件不存在，跳过检查
        if (!fs.existsSync(exampleFile)) {
            return false;
        }

        // 读取示例配置（作为默认值）
        const exampleData = fs.readFileSync(exampleFile, 'utf8');
        const exampleConfig = yaml.parse(exampleData);

        // 读取当前配置
        const configData = fs.readFileSync(taskConfigFile, 'utf8');
        const currentConfig = yaml.parse(configData);

        // 复制当前配置用于合并
        const mergedConfig = JSON.parse(JSON.stringify(currentConfig));

        // 深度合并，补充缺失字段
        deepMerge(mergedConfig, exampleConfig);

        // 检查是否有新增字段
        const hasNewFields = JSON.stringify(currentConfig) !== JSON.stringify(mergedConfig);

        if (hasNewFields) {
            // 备份原配置到 data/backupConfigs
            const backupDir = path.join(projectRoot, 'data', 'backupConfigs');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const backupFile = path.join(backupDir, `task.yaml.backup.${Date.now()}`);
            fs.copyFileSync(taskConfigFile, backupFile);
            log('info', `已备份原定时任务配置到: ${path.relative(projectRoot, backupFile)}`);

            // 写入合并后的配置
            const mergedYaml = yaml.stringify(mergedConfig, {
                indent: 2,
                lineWidth: 0
            });
            fs.writeFileSync(taskConfigFile, mergedYaml, 'utf8');

            log('info', '已自动补充缺失的定时任务配置字段');
            return true;
        }

        return false;
    } catch (error) {
        log('error', '检查定时任务配置字段失败: ' + error.message);
        return false;
    }
}

// 加载配置文件的函数
function loadConfig() {
    try {
        if (fs.existsSync(configFile)) {
            // 先检查并补充缺失字段
            checkAndFillMissingConfig();

            // 读取配置
            const configData = fs.readFileSync(configFile, 'utf8');
            const config = yaml.parse(configData);

            // 更新全局配置缓存
            global.appConfig = config;

            return true;
        } else {
            log('warn', '配置文件不存在');
            return false;
        }
    } catch (error) {
        log('error', '加载配置文件失败: ' + error);
        return false;
    }
}

// 加载定时任务配置文件的函数
function loadTaskConfig() {
    try {
        if (fs.existsSync(taskConfigFile)) {
            // 先检查并补充缺失字段
            checkAndFillMissingTaskConfig();

            // 读取配置
            const configData = fs.readFileSync(taskConfigFile, 'utf8');
            const config = yaml.parse(configData);

            // 更新全局定时任务配置缓存
            global.taskConfig = config;

            log('info', '定时任务配置加载完成');
            return true;
        } else {
            log('warn', '定时任务配置文件不存在，将使用默认配置');
            // 尝试从示例文件复制
            const exampleTaskFile = path.join(exampleDir, 'task.yaml');
            if (fs.existsSync(exampleTaskFile)) {
                fs.copyFileSync(exampleTaskFile, taskConfigFile);
                log('info', '已从示例文件复制定时任务配置');
                return loadTaskConfig();
            }
            return false;
        }
    } catch (error) {
        log('error', '加载定时任务配置文件失败: ' + error);
        return false;
    }
}

export default async () => {
    try {
        // 确保 configs 目录存在
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
            log('info', '创建 configs 目录');
        }

        // 复制 examples 目录下的所有内容到 configs（跳过已存在的文件）
        if (fs.existsSync(exampleDir)) {
            const copiedCount = copyDirectoryContents(exampleDir, configDir);

            if (copiedCount > 0) {
                log('info', `示例配置文件复制完成，共复制了 ${copiedCount} 个文件`);
            }
        } else {
            log('warn', 'examples 目录不存在，无法复制示例配置');
        }

        // 加载主配置文件
        const loadResult = loadConfig();
        if (!loadResult) {
            log('warn', '配置文件加载失败，请检查配置文件');
        }

        // 加载定时任务配置文件
        const loadTaskResult = loadTaskConfig();
        if (!loadTaskResult) {
            log('warn', '定时任务配置文件加载失败');
        }

        log('info', '配置文件初始化完成');

        return true;
    } catch (error) {
        log('error', '配置文件初始化失败: ' + error);
        return false;
    }
};
