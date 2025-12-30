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

// 全局配置缓存
global.appConfig = null;

// 日志辅助函数（在 logger 初始化前使用 console）
function logInfo(message) {
    if (typeof logger !== 'undefined') {
        logger.info(message);
    } else {
        console.log(message);
    }
}

function logWarn(message) {
    if (typeof logger !== 'undefined') {
        logger.warn(message);
    } else {
        console.warn(message);
    }
}

function logError(message) {
    if (typeof logger !== 'undefined') {
        logger.error(message);
    } else {
        console.error(message);
    }
}

function logDebug(message) {
    if (typeof logger !== 'undefined') {
        logger.debug(message);
    } else {
        console.debug(message);
    }
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
                logInfo(`已复制文件: ${path.relative(projectRoot, targetPath)}`);
                copiedCount++;
            } else {
                logDebug(`跳过已存在的文件: ${path.relative(projectRoot, targetPath)}`);
            }
        }
        // 跳过目录，不递归复制
    }

    return copiedCount;
}

// 重启依赖服务的函数
async function restartServices(newConfig) {
    try {
        logInfo('开始重启依赖服务...');

        // 重启邮件服务（如果配置有变化）
        if (global.emailTransporter) {
            const oldConfig = global.appConfig?.email;
            const newEmailConfig = newConfig?.email;

            // 检查邮件配置是否有变化
            const configChanged = !oldConfig || !newEmailConfig ||
                oldConfig.host !== newEmailConfig.host ||
                oldConfig.port !== newEmailConfig.port ||
                oldConfig.auth?.user !== newEmailConfig.auth?.user ||
                oldConfig.auth?.pass !== newEmailConfig.auth?.pass;

            if (configChanged) {
                logInfo('邮件配置发生变化，重启邮件服务');
                global.emailTransporter = null; // 清理旧的传输器

                // 这里可以重新初始化邮件服务
                // 由于邮件服务在 email.js 中初始化，这里暂时只是清理
                // 实际应用中可能需要重新调用 email.js 的初始化逻辑
            }
        }

        // 可以在这里添加其他服务的重启逻辑
        // 例如：Redis、数据库连接等（如果需要的话）

        logInfo('服务重启完成');
    } catch (error) {
        logError('重启服务失败: ' + error);
    }
}

// 加载配置文件的函数
function loadConfig() {
    try {
        if (fs.existsSync(configFile)) {
            // 读取新的配置
            const configData = fs.readFileSync(configFile, 'utf8');
            const newConfig = yaml.parse(configData);

            // 缓存旧配置用于比较
            const oldConfig = global.appConfig;

            // 更新全局配置缓存
            global.appConfig = newConfig;

            logDebug('配置文件已重新加载: configs/config.yaml');

            // 如果是热重载（不是首次加载），检查是否需要重启服务
            if (oldConfig !== null) {
                // 异步重启服务，避免阻塞文件监听器
                setImmediate(() => restartServices(newConfig));
            }

            return true;
        } else {
            logWarn('配置文件不存在');
            return false;
        }
    } catch (error) {
        logError('加载配置文件失败: ' + error);
        return false;
    }
}

// 设置配置文件监听
function setupConfigWatcher() {
    if (!fs.existsSync(configDir)) {
        logWarn('configs 目录不存在，无法设置文件监听');
        return;
    }

    try {
        const watcher = fs.watch(configDir, { recursive: true }, (eventType, filename) => {
            if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
                // 避免重复触发（有些系统会发送多次事件）
                const fullPath = path.join(configDir, filename);
                if (fullPath === configFile) {
                    logInfo(`配置文件发生变化: ${filename}, 触发热重载`);
                    // 延迟一小段时间再重新加载，避免读取正在写入的文件
                    setTimeout(() => {
                        loadConfig();
                    }, 100);
                }
            }
        });

        logInfo(chalk.white('配置文件初始化完成'));
        return watcher;
    } catch (error) {
        logWarn('无法设置配置文件监听: ' + error.message);
        return null;
    }
}

export default async () => {
    try {
        // 确保 configs 目录存在
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
            logInfo('创建 configs 目录');
        }

        // 复制 examples 目录下的所有内容到 configs（跳过已存在的文件）
        if (fs.existsSync(exampleDir)) {
            const copiedCount = copyDirectoryContents(exampleDir, configDir);

            if (copiedCount > 0) {
                logInfo(`示例配置文件复制完成，共复制了 ${copiedCount} 个文件`);
            } else {
                logDebug('示例配置文件复制完成，没有新文件需要复制');
            }
        } else {
            logWarn('examples 目录不存在，无法复制示例配置');
        }

        // 加载配置文件
        const loadResult = loadConfig();
        if (!loadResult) {
            logWarn('配置文件加载失败，请检查配置文件');
        }

        // 设置配置文件热重载
        const watcher = setupConfigWatcher();

        // 存储 watcher 引用以便后续清理（如果需要）
        global.configWatcher = watcher;

        return true;
    } catch (error) {
        logError('配置文件初始化失败: ' + error);
        return false;
    }
};
