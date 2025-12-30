import fs from 'fs';
import path from 'path';

/**
 * 文件处理通用方法
 */

// MIME类型映射
export const MIME_TYPES = {
    // 图片
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
    '.svg': 'image/svg+xml',

    // 音频
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.flac': 'audio/flac',
    '.webm': 'audio/webm',

    // 视频
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',

    // 文档
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // 文本
    '.txt': 'text/plain',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript'
};

/**
 * 验证文件路径安全性
 * @param {string} filePath - 文件路径
 * @returns {boolean} 是否安全
 */
export function isPathSafe(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return false;
    }

    // 检查路径遍历攻击
    if (filePath.includes('..') || filePath.includes('../') || filePath.includes('..\\')) {
        return false;
    }

    // 检查绝对路径
    if (path.isAbsolute(filePath)) {
        return false;
    }

    // 检查以/或\开头的路径
    if (filePath.startsWith('/') || filePath.startsWith('\\')) {
        return false;
    }

    // 检查Windows盘符路径
    if (/^[A-Za-z]:/.test(filePath)) {
        return false;
    }

    return true;
}

/**
 * 标准化文件路径（统一使用正斜杠）
 * @param {string} filePath - 文件路径
 * @returns {string} 标准化后的路径
 */
export function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}

/**
 * 获取文件的完整路径
 * @param {string} relativePath - 相对路径
 * @param {string} baseDir - 基础目录，默认为 'data/document'
 * @returns {string} 完整路径
 */
export function getFullPath(relativePath, baseDir = 'data/document') {
    if (!isPathSafe(relativePath)) {
        throw new Error('不安全的文件路径');
    }

    return path.join(process.cwd(), baseDir, relativePath);
}

/**
 * 检查文件是否存在且是文件
 * @param {string} relativePath - 相对路径
 * @param {string} baseDir - 基础目录
 * @returns {boolean} 是否存在
 */
export function fileExists(relativePath, baseDir = 'data/document') {
    try {
        const fullPath = getFullPath(relativePath, baseDir);
        return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
    } catch (error) {
        return false;
    }
}

/**
 * 获取文件信息
 * @param {string} relativePath - 相对路径
 * @param {string} baseDir - 基础目录
 * @returns {object|null} 文件信息
 */
export function getFileInfo(relativePath, baseDir = 'data/document') {
    try {
        if (!fileExists(relativePath, baseDir)) {
            return null;
        }

        const fullPath = getFullPath(relativePath, baseDir);
        const stat = fs.statSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();

        return {
            path: fullPath,
            relativePath: normalizePath(relativePath),
            size: stat.size,
            mtime: stat.mtime,
            ctime: stat.ctime,
            contentType: MIME_TYPES[ext] || 'application/octet-stream',
            extension: ext,
            isImage: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext),
            isAudio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'].includes(ext),
            isVideo: ['.mp4', '.avi', '.mov', '.wmv'].includes(ext)
        };
    } catch (error) {
        return null;
    }
}

/**
 * 获取目录中的所有文件
 * @param {string} relativeDir - 相对目录路径
 * @param {object} options - 选项
 * @param {Array} options.extensions - 文件扩展名过滤
 * @param {boolean} options.recursive - 是否递归查找
 * @param {string} options.baseDir - 基础目录
 * @returns {Array} 文件列表
 */
export function getFilesInDirectory(relativeDir, options = {}) {
    const { extensions, recursive = false, baseDir = 'data/document' } = options;

    try {
        if (!isPathSafe(relativeDir)) {
            return [];
        }

        const fullDir = getFullPath(relativeDir, baseDir);

        if (!fs.existsSync(fullDir)) {
            return [];
        }

        const files = [];

        function scanDirectory(dirPath, relativePath) {
            const items = fs.readdirSync(dirPath);

            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const itemRelativePath = path.join(relativePath, item).replace(/\\/g, '/');
                const stat = fs.statSync(itemPath);

                if (stat.isDirectory() && recursive) {
                    scanDirectory(itemPath, itemRelativePath);
                } else if (stat.isFile()) {
                    const ext = path.extname(item).toLowerCase();

                    // 扩展名过滤
                    if (extensions && extensions.length > 0) {
                        if (!extensions.includes(ext)) {
                            continue;
                        }
                    }

                    files.push({
                        name: item,
                        path: itemRelativePath,
                        fullPath: itemPath,
                        size: stat.size,
                        mtime: stat.mtime,
                        extension: ext,
                        contentType: MIME_TYPES[ext] || 'application/octet-stream'
                    });
                }
            }
        }

        scanDirectory(fullDir, relativeDir);
        return files;
    } catch (error) {
        logger.error('获取目录文件列表错误:', error);
        return [];
    }
}

/**
 * 创建目录（递归创建）
 * @param {string} relativeDir - 相对目录路径
 * @param {string} baseDir - 基础目录
 */
export function ensureDirectory(relativeDir, baseDir = 'data/document') {
    try {
        if (!isPathSafe(relativeDir)) {
            throw new Error('不安全的目录路径');
        }

        const fullPath = getFullPath(relativeDir, baseDir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
    } catch (error) {
        logger.error('创建目录错误:', error);
        throw error;
    }
}

/**
 * 删除文件
 * @param {string} relativePath - 相对文件路径
 * @param {string} baseDir - 基础目录
 * @returns {boolean} 是否删除成功
 */
export function deleteFile(relativePath, baseDir = 'data/document') {
    try {
        if (!fileExists(relativePath, baseDir)) {
            return false;
        }

        const fullPath = getFullPath(relativePath, baseDir);
        fs.unlinkSync(fullPath);
        return true;
    } catch (error) {
        logger.error('删除文件错误:', error);
        return false;
    }
}

/**
 * 获取文件大小的可读格式
 * @param {number} bytes - 字节数
 * @returns {string} 可读的文件大小
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证文件大小
 * @param {number} size - 文件大小（字节）
 * @param {number} maxSize - 最大允许大小（字节）
 * @returns {boolean} 是否有效
 */
export function validateFileSize(size, maxSize) {
    return size > 0 && size <= maxSize;
}

/**
 * 验证文件类型
 * @param {string} filename - 文件名
 * @param {Array} allowedExtensions - 允许的扩展名
 * @returns {boolean} 是否有效
 */
export function validateFileType(filename, allowedExtensions) {
    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
}

/**
 * 生成唯一的文件名
 * @param {string} originalName - 原始文件名
 * @returns {string} 唯一文件名
 */
export function generateUniqueFilename(originalName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const ext = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, ext);

    return `${nameWithoutExt}_${timestamp}_${random}${ext}`;
}

/**
 * 获取文件扩展名对应的分类
 * @param {string} extension - 文件扩展名
 * @returns {string} 文件分类
 */
export function getFileCategory(extension) {
    const categories = {
        image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.svg'],
        audio: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'],
        video: ['.mp4', '.avi', '.mov', '.wmv', '.webm'],
        document: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
        text: ['.txt', '.json', '.xml', '.html', '.css', '.js']
    };

    for (const [category, extensions] of Object.entries(categories)) {
        if (extensions.includes(extension.toLowerCase())) {
            return category;
        }
    }

    return 'other';
}
