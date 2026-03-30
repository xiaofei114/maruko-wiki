import { readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cron from 'node-cron';

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

            cron.schedule(defaultExport.cron, defaultExport.task);

            logger.debug(`成功加载模块: ${file}`);
        } catch (error) {
            logger.error(`加载模块失败: ${file}`, error);
        }
    }
}