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
// 注意：配置在启动时加载一次，不支持热更新，修改配置后需要重启服务
global.appConfig = null;

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

// 加载配置文件的函数
function loadConfig() {
    try {
        if (fs.existsSync(configFile)) {
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

        // 加载配置文件
        const loadResult = loadConfig();
        if (!loadResult) {
            log('warn', '配置文件加载失败，请检查配置文件');
        }

        log('info', '配置文件初始化完成');

        return true;
    } catch (error) {
        log('error', '配置文件初始化失败: ' + error);
        return false;
    }
};
