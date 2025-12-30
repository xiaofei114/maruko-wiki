import express from 'express';
import path from 'path';
import { createPublicRoute, createValidatedRouteHandler, createAdminValidatedRouteHandler, createAdminUploadRouteHandler } from '../method/route-helpers.js';
import { getAlbumsWithLatestPhotos, getPhotos, createAlbum, uploadPhoto } from '../services/album.js';

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
    }
    return result;
}, 3)); // 普通用户权限

// 上传照片 (需要登录)
router.post('/photos', ...createAdminUploadRouteHandler({
    destination: path.join(process.cwd(), 'data', 'document', 'images'),
    maxSize: 10 * 1024 * 1024, // 10MB
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
    }
    return result;
}));

export default router;
