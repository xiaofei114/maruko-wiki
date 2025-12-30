import fs from 'fs';
import path from 'path';
import { MIME_TYPES, isPathSafe, getFullPath, getFileInfo as getFileInfoUtil } from '../method/file-utils.js';

/**
 * 文件服务 - 处理文件下载和访问
 */

/**
 * 获取文件服务
 * @param {string} filePath - 请求的文件路径
 * @param {object} req - Express 请求对象 (保留以兼容)
 * @param {object} res - Express 响应对象
 * @returns {object} 结果对象
 */
export async function getFile(filePath, req, res) {  // 添加 req 参数
    try {
        // 验证文件路径安全性
        if (!isPathSafe(filePath)) {
            return {
                success: false,
                code: 400,
                message: '无效的文件路径'
            };
        }

        // 构建完整路径
        const fullPath = getFullPath(filePath);

        // 检查文件是否存在
        if (!fs.existsSync(fullPath)) {
            return {
                success: false,
                code: 404,
                message: '文件不存在'
            };
        }

        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) {
            return {
                success: false,
                code: 400,
                message: '路径不是文件'
            };
        }

        // 设置 Content-Type
        const ext = path.extname(fullPath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        // 记录访问日志
        logger.info(`文件访问: ${filePath} (${contentType})`);

        // 设置 CORS 头，允许跨域访问媒体文件
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

        // 对于音频和视频文件，设置额外的头以支持范围请求
        if (contentType.startsWith('audio/') || contentType.startsWith('video/')) {
            res.setHeader('Accept-Ranges', 'bytes');
        }

        // 简单直接返回文件
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stat.size);
        const fileStream = fs.createReadStream(fullPath);
        fileStream.pipe(res);

        return {
            success: true,
            message: '文件服务成功'
        };
        
    } catch (error) {
        logger.error('文件服务错误:', error);
        
        if (!res.headersSent) {
            return {
                success: false,
                code: 500,
                message: '服务器内部错误'
            };
        }
    }
}

/**
 * 检查文件是否存在
 * @param {string} filePath - 文件路径
 * @returns {boolean} 是否存在
 */
export function fileExists(filePath) {
    return fileExistsUtil(filePath);
}

/**
 * 获取文件信息
 * @param {string} filePath - 文件路径
 * @returns {object|null} 文件信息或null
 */
export function getFileInfo(filePath) {
    return getFileInfoUtil(filePath);
}
