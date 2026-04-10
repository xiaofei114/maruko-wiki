import express from 'express';
import { createAdminValidatedRouteHandler, createAdminRoute } from '../method/route-helpers.js';
import {
    getAudiosForAdmin,
    reviewAudio,
    updateAudio,
    deleteAudio,
    updateAudioClassification,
    deleteAudioClassification,
    createAudioClassification
} from '../services/audio.js';
import {
    getAlbumsForAdmin,
    reviewAlbum,
    updateAlbum,
    deleteAlbum,
    reviewPhoto,
    updatePhoto,
    deletePhoto,
    createAlbum
} from '../services/album.js';

const router = express.Router();

// 音声管理
router.get('/audios', ...createAdminRoute(getAudiosForAdmin, 2, { logName: '获取音声列表' }));

router.post('/audios/:id/review', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    is_review: { type: 'number', required: true, enum: [0, 1, 2] }
}, async (req) => {
    return await reviewAudio(req.params.id, req.body.is_review, req.user.id);
}, 2, 500, { logName: '审核音声' }));

router.put('/audios/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    name: { required: false, minLength: 1, maxLength: 100 },
    classification_id: { type: 'id', required: false },
    new_classification_name: { required: false, minLength: 1, maxLength: 50 }
}, async (req) => {
    const { name, classification_id, new_classification_name } = req.body;

    let finalClassificationId = classification_id;

    // 如果提供了新分类名称，创建新分类
    if (new_classification_name?.trim()) {
        const createResult = await createAudioClassification(new_classification_name.trim(), req.user.id);
        if (!createResult.success) {
            return createResult;
        }
        finalClassificationId = createResult.data.classificationId;
    }

    // 如果既没有提供新分类名称，也没有提供现有分类ID，且没有要更新的其他字段，返回错误
    if (!finalClassificationId && !name?.trim()) {
        return {
            success: false,
            message: '请提供要更新的字段（名称、新分类名称或现有分类ID）',
            code: 400
        };
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (finalClassificationId !== undefined) updateData.classification_id = finalClassificationId;

    return await updateAudio(req.params.id, updateData, req.user.id);
}, 2, 500, { logName: '更新音声' }));

router.delete('/audios/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deleteAudio(req.params.id, req.user.id);
}, 2, 500, { logName: '删除音声' }));

// 音声分类管理
router.put('/audio-classifications/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    name: { required: true, minLength: 1, maxLength: 50 }
}, async (req) => {
    return await updateAudioClassification(req.params.id, { name: req.body.name }, req.user.id);
}, 2, 500, { logName: '更新音声分类' }));

router.delete('/audio-classifications/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deleteAudioClassification(req.params.id, req.user.id);
}, 2, 500, { logName: '删除音声分类' }));

// 相册管理
router.get('/albums', ...createAdminRoute(getAlbumsForAdmin, 2, { logName: '获取相册列表' }));

router.post('/albums/:id/review', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    is_review: { type: 'number', required: true, enum: [0, 1, 2] }
}, async (req) => {
    return await reviewAlbum(req.params.id, req.body.is_review, req.user.id);
}, 2, 500, { logName: '审核相册' }));

router.put('/albums/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    name: { required: false, minLength: 1, maxLength: 100 },
    introduction: { required: false, maxLength: 500 }
}, async (req) => {
    return await updateAlbum(req.params.id, req.body, req.user.id);
}, 2, 500, { logName: '更新相册' }));

router.delete('/albums/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deleteAlbum(req.params.id, req.user.id);
}, 2, 500, { logName: '删除相册' }));

// 照片管理
router.post('/photos/:id/review', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    is_review: { type: 'number', required: true, enum: [0, 1, 2] }
}, async (req) => {
    return await reviewPhoto(req.params.id, req.body.is_review, req.user.id);
}, 2, 500, { logName: '审核照片' }));

router.put('/photos/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    name: { required: false, minLength: 1, maxLength: 100 },
    album_id: { type: 'id', required: false },
    new_album_name: { required: false, minLength: 1, maxLength: 100 },
    new_album_introduction: { required: false, maxLength: 500 }
}, async (req) => {
    const { name, album_id, new_album_name, new_album_introduction } = req.body;

    let finalAlbumId = album_id;

    // 如果提供了新相册名称，创建新相册
    if (new_album_name?.trim()) {
        const albumData = {
            name: new_album_name.trim(),
            introduction: new_album_introduction?.trim() || ''
        };
        const createResult = await createAlbum(albumData, req.user.id);
        if (!createResult.success) {
            return createResult;
        }
        finalAlbumId = createResult.data.albumId;
    }

    // 如果既没有提供新相册名称，也没有提供现有相册ID，且没有要更新的其他字段，返回错误
    if (!finalAlbumId && !name?.trim()) {
        return {
            success: false,
            message: '请提供要更新的字段（名称、新相册名称或现有相册ID）',
            code: 400
        };
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (finalAlbumId !== undefined) updateData.album_id = finalAlbumId;

    return await updatePhoto(req.params.id, updateData, req.user.id);
}, 2, 500, { logName: '更新照片' }));

router.delete('/photos/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deletePhoto(req.params.id, req.user.id);
}, 2, 500, { logName: '删除照片' }));

export default router;
