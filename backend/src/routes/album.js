import express from 'express';
import path from 'path';
import { createPublicRoute, createValidatedRouteHandler, createAdminValidatedRouteHandler, createAdminUploadRouteHandler } from '../method/route-helpers.js';
import { addLog } from '../services/logs.js';
import { getAlbumsWithLatestPhotos, getPhotos, createAlbum, uploadPhoto } from '../services/album.js';
import { getUploadLimit } from "../method/read.js"

/**
 * 记录相册管理操作日志
 * @param {object} req - 请求对象
 * @param {string} action - 操作名称
 * @param {object} details - 操作详情
 */
const logAlbumOperation = (req, action, details) => {
    try {
        const user = req.user || {};
        addLog({
            logType: req.method,
            logName: `相册管理-${action}`,
            logContent: req.originalUrl || req.url,
            requestParams: JSON.stringify({
                body: req.body,
                params: req.params,
                query: req.query,
                details: details
            }),
            userName: user.username || user.name || '未知用户',
            userIp: req.ip || req.connection?.remoteAddress || '',
            logReturn: null
        });
    } catch (error) {
        logger.error('记录相册管理操作日志失败:', error);
    }
};

const router = express.Router();


// 获取相册和最新照片数据 (游客可访问)
router.get('/albums', ...createPublicRoute(getAlbumsWithLatestPhotos));

// 获取照片列表 (游客可访问)
router.get('/photos', ...createValidatedRouteHandler({
    album_id: { source: 'query', type: 'id', required: true }
}, async (req) => {
    return await getPhotos(req.query.album_id);
}));

// 创建相册 (需要登录)
router.post('/albums', ...createAdminValidatedRouteHandler({
    name: { required: true, minLength: 1, maxLength: 100 },
    introduction: { required: false, maxLength: 500 }
}, async (req) => {
    const albumData = {
        name: req.body.name?.trim(),
        introduction: req.body.introduction?.trim()
    };

    const result = await createAlbum(albumData, req.user.id);
    if (result.success) {
        result.code = 201; // 创建成功
        
        // 记录操作日志
        logAlbumOperation(req, '创建相册', {
            albumId: result.data?.albumId,
            albumName: albumData.name,
            userId: req.user.id,
            userName: req.user.name
        });
    }
    return result;
}, 3)); // 普通用户权限

// 上传照片 (需要登录)
router.post('/photos', ...createAdminUploadRouteHandler({
    destination: path.join(process.cwd(), 'data', 'document', 'images'),
    maxSize: getUploadLimit('photo'),
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP']
}, 'photo', async (req) => {
    const { album_id, name } = req.body;
    const file = req.file;

    const photoData = {
        albumId: parseInt(album_id),
        name: name?.trim()
    };

    const result = await uploadPhoto(file, photoData, req.user.id, req.user.permission);
    if (result.success) {
        result.code = 201; // 创建成功
        
        // 记录操作日志
        logAlbumOperation(req, '上传照片', {
            photoId: result.data?.photoId,
            photoName: photoData.name,
            albumId: photoData.albumId,
            fileName: file?.originalname,
            userId: req.user.id,
            userName: req.user.name
        });
    }
    return result;
}));

export default router;
