import express from 'express';
import { createAdminValidatedRouteHandler, createAdminRoute } from '../method/route-helpers.js';
import {
    getAudiosForAdmin,
    reviewAudio,
    updateAudio,
    deleteAudio,
    updateAudioClassification,
    deleteAudioClassification
} from '../services/audio.js';
import {
    getAlbumsForAdmin,
    reviewAlbum,
    updateAlbum,
    deleteAlbum,
    reviewPhoto,
    updatePhoto,
    deletePhoto
} from '../services/album.js';

const router = express.Router();

// 音声管理
router.get('/audios', ...createAdminRoute(getAudiosForAdmin, 2));

router.post('/audios/:id/review', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    is_review: { type: 'number', required: true, enum: [0, 1, 2] }
}, async (req) => {
    return await reviewAudio(req.params.id, req.body.is_review, req.user.id);
}, 2));

router.put('/audios/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    name: { required: false, minLength: 1, maxLength: 100 },
    classification_id: { type: 'id', required: false }
}, async (req) => {
    return await updateAudio(req.params.id, req.body, req.user.id);
}, 2));

router.delete('/audios/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deleteAudio(req.params.id, req.user.id);
}, 2));

// 音声分类管理
router.put('/audio-classifications/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    name: { required: true, minLength: 1, maxLength: 50 }
}, async (req) => {
    return await updateAudioClassification(req.params.id, { name: req.body.name }, req.user.id);
}, 2));

router.delete('/audio-classifications/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deleteAudioClassification(req.params.id, req.user.id);
}, 2));

// 相册管理
router.get('/albums', ...createAdminRoute(getAlbumsForAdmin, 2));

router.post('/albums/:id/review', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    is_review: { type: 'number', required: true, enum: [0, 1, 2] }
}, async (req) => {
    return await reviewAlbum(req.params.id, req.body.is_review, req.user.id);
}, 2));

router.put('/albums/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    name: { required: false, minLength: 1, maxLength: 100 },
    introduction: { required: false, maxLength: 500 }
}, async (req) => {
    return await updateAlbum(req.params.id, req.body, req.user.id);
}, 2));

router.delete('/albums/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deleteAlbum(req.params.id, req.user.id);
}, 2));

// 照片管理
router.post('/photos/:id/review', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    is_review: { type: 'number', required: true, enum: [0, 1, 2] }
}, async (req) => {
    return await reviewPhoto(req.params.id, req.body.is_review, req.user.id);
}, 2));

router.put('/photos/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    name: { required: false, minLength: 1, maxLength: 100 },
    album_id: { type: 'id', required: false }
}, async (req) => {
    return await updatePhoto(req.params.id, req.body, req.user.id);
}, 2));

router.delete('/photos/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deletePhoto(req.params.id, req.user.id);
}, 2));

export default router;
