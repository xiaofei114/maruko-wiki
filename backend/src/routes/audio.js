import express from 'express';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { queryOne } from '../method/database.js';
import { createPublicRoute, createAdminUploadRouteHandler, createRouteHandler } from '../method/route-helpers.js';
import { authenticateToken, optionalAuth } from '../method/auth.js';
import { uploadAudio, getAudiosGrouped, createAudioClassification, getAudiosForDownload, getUserAudioClassifications } from '../services/audio.js';
import { recordPlayCount, getWeeklyPopularAudios, getTotalPopularAudios } from '../services/audioPlayCount.js';
import { packAudios } from '../method/pack.js';
import { read_json } from "../method/read.js"

const router = express.Router();


// 获取音声列表 (游客可访问) - 返回按分类分组的数据
router.get('/audios', ...createPublicRoute(getAudiosGrouped));

// 获取当前用户的音声分类（包括待审核的）- 需要登录
router.get('/audios/classifications/my', authenticateToken, createRouteHandler(async (req) => {
    return await getUserAudioClassifications(req.user.id);
}));

// 上传音声 (需要登录)
router.post('/audios', ...createAdminUploadRouteHandler({
    destination: path.join(process.cwd(), 'data', 'document', 'audios'),
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['audio/mpeg', 'audio/mp3'],
    allowedExtensions: ['.mp3', '.MP3']
}, 'audio', async (req) => {
    const { name, classification_id, new_classification_name } = req.body;
    const file = req.file;

    // 验证必填参数
    if (!name?.trim()) {
        return { success: false, message: '音声名称不能为空', code: 400 };
    }

    let finalClassificationId;

    // 如果提供了新分类名称，创建新分类
    if (new_classification_name?.trim()) {
        const createResult = await createAudioClassification(new_classification_name.trim(), req.user.id);
        if (!createResult.success) {
            return createResult;
        }
        finalClassificationId = createResult.data.classificationId;
    }
    // 否则使用提供的现有分类ID
    else if (classification_id) {
        finalClassificationId = parseInt(classification_id);
        if (!finalClassificationId || finalClassificationId <= 0) {
            return { success: false, message: '无效的分类ID', code: 400 };
        }
    }
    // 两者都没有提供
    else {
        return { success: false, message: '请提供分类ID或新分类名称', code: 400 };
    }

    const audioData = {
        name: name.trim(),
        classificationId: finalClassificationId
    };

    const result = await uploadAudio(file, audioData, req.user.id, req.user.permission);
    if (result.success) {
        result.code = 201; // 创建成功
    }
    return result;
}));

// 下载音声 (需要登录)
router.get('/audios/download/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const { classification_id } = req.query;

        // 验证token
        let userId;
        try {
            const config = read_json('configs', 'config');
            const jwtSecret = config.token;
            const decoded = jwt.verify(token, jwtSecret);
            userId = decoded.id;
        } catch (error) {
            logger.warn('Token验证失败:', error.message);
            return res.status(401).json({ success: false, message: 'Token无效或已过期', code: 401 });
        }

        let classificationId = null;
        let classificationName = '全部音声';

        logger.debug(`收到下载请求，用户ID: ${userId}, 分类ID: ${classification_id}`);

        // 如果提供了分类ID，验证分类是否存在
        if (classification_id) {
            classificationId = parseInt(classification_id);
            if (!classificationId || classificationId <= 0) {
                logger.warn('无效的分类ID:', classification_id);
                return res.status(400).json({ success: false, message: '无效的分类ID', code: 400 });
            }

            // 获取分类名称
            const classification = queryOne(`
                SELECT name FROM audio_classification
                WHERE id = ? AND is_deleted = 0 AND is_review = 1
            `, [classificationId]);

            if (!classification) {
                logger.warn('音声分类不存在或未审核通过:', classificationId);
                return res.status(404).json({ success: false, message: '音声分类不存在或未审核通过', code: 404 });
            }

            classificationName = classification.name;
            logger.debug(`分类名称: ${classificationName}`);
        }

        // 获取音声数据
        logger.debug('获取音声数据...');
        const audios = await getAudiosForDownload(classificationId);
        logger.debug(`获取到 ${audios.length} 个音声`);

        if (audios.length === 0) {
            logger.warn('没有可下载的音声');
            return res.status(404).json({ success: false, message: '没有可下载的音声', code: 404 });
        }

        // 打包音声文件
        logger.debug('开始打包音声文件...');
        const packResult = await packAudios(audios, classificationName);

        if (!packResult.success) {
            logger.error('打包音声文件失败');
            return res.status(500).json({ success: false, message: '打包音声文件失败', code: 500 });
        }

        // 检查用户每天下载量限制（200MB）
        const today = new Date().toISOString().split('T')[0];
        const downloadLimitKey = `download:limit:${userId}:${today}`;

        try {
            if (global.redis) {
                // 获取今天已下载的大小
                const todayDownloaded = await global.redis.get(downloadLimitKey) || 0;
                const totalDownloadSize = parseInt(todayDownloaded) + packResult.fileSize;
                const appConfig = read_json("configs", "config")
                const dailyLimit = appConfig.download.audio * 1024 * 1024;

                if (totalDownloadSize > dailyLimit) {
                    logger.warn(`用户 ${userId} 超过每日下载限制，当前: ${(totalDownloadSize / 1024 / 1024).toFixed(2)}MB，限制: 200MB`);
                    return res.status(429).json({
                        success: false,
                        message: `每日下载量不能超过${appConfig.download.audio}MB，当前已下载 ${(parseInt(todayDownloaded) / 1024 / 1024).toFixed(2)}MB`
                    });
                }

                // 更新下载量
                await global.redis.set(downloadLimitKey, totalDownloadSize, 'EX', 86400); // 24小时过期
                logger.debug(`更新用户 ${userId} 今日下载量: ${(totalDownloadSize / 1024 / 1024).toFixed(2)}MB`);
            }
        } catch (redisError) {
            logger.error('检查下载限制时Redis错误:', redisError);
            // Redis失败不影响下载，继续执行
        }

        // 设置响应头
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(packResult.zipFileName)}"`);
        res.setHeader('Content-Length', packResult.fileSize);

        logger.info(`发送下载文件: ${packResult.zipFileName}，大小: ${(packResult.fileSize / 1024 / 1024).toFixed(2)}MB`);

        // 发送文件
        const fileStream = fs.createReadStream(packResult.zipFilePath);
        fileStream.pipe(res);

        // 错误处理
        fileStream.on('error', (error) => {
            logger.error('发送文件失败:', error);
            res.status(500).json({ success: false, message: '发送文件失败', code: 500 });
        });

    } catch (error) {
        logger.error('下载音声失败:', error);
        return res.status(500).json({ success: false, message: '下载音声失败', code: 500 });
    }
});

/**
 * 记录音频播放量
 * POST /api/audios/:id/play
 * 支持游客和登录用户，有频率限制
 */
router.post('/audios/:id/play', optionalAuth, createRouteHandler(async (req) => {
    const audioId = parseInt(req.params.id);
    
    if (!audioId || audioId <= 0) {
        return {
            success: false,
            message: '无效的音频ID',
            code: 400
        };
    }
    
    return await recordPlayCount(audioId, req, req.user || null);
}));

/**
 * 获取7天内热门音频（Redis数据）
 * GET /api/audios/popular/weekly
 * 支持可选的limit参数，默认10个
 */
router.get('/audios/popular/weekly', createRouteHandler(async (req) => {
    const limit = parseInt(req.query.limit) || 10;
    
    // 限制最大返回数量
    const maxLimit = 50;
    const finalLimit = Math.min(limit, maxLimit);
    
    return await getWeeklyPopularAudios(finalLimit);
}));

/**
 * 获取总播放量排行（SQLite数据）
 * GET /api/audios/popular/total
 * 支持可选的limit参数，默认10个
 */
router.get('/audios/popular/total', createRouteHandler(async (req) => {
    const limit = parseInt(req.query.limit) || 10;
    
    // 限制最大返回数量
    const maxLimit = 50;
    const finalLimit = Math.min(limit, maxLimit);
    
    return await getTotalPopularAudios(finalLimit);
}));

export default router;
