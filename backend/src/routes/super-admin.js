import express from 'express';
import { createAdminValidatedRouteHandler, createAdminRoute } from '../method/route-helpers.js';
import {
    getUsers,
    banUser,
    updateUserPermission,
    resetUserPassword,
    deleteUser,
    adminResetUserName,
    adminResetUserAvatar
} from '../services/user.js';
import { getDashboardStats } from '../services/dashboard.js';
import { getUploadLimit } from "../method/read.js"
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 配置 multer 存储
const AVATAR_DIR = path.join(process.cwd(), 'data', 'document', 'avatar');
if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, AVATAR_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substring(2, 10);
        const ext = path.extname(file.originalname) || '.jpg';
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: getUploadLimit('avatar') },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('只允许上传图片文件'));
    }
});

const router = express.Router();

// 超级管理员专用路由

// 获取仪表盘数据
router.get('/dashboard', ...createAdminRoute(async () => {
    return await getDashboardStats();
}, 2, { logName: '获取仪表盘数据' }));

// 获取用户列表
router.get('/users', ...createAdminRoute(async (req) => {
    const { page, pageSize, sortBy, sortOrder } = req.query;
    return await getUsers({ page, pageSize, sortBy, sortOrder });
}, 1, { logName: '获取用户列表' }));

// 封禁/解封用户
router.post('/users/:id/ban', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    is_banned: { type: 'number', required: true, enum: [0, 1] }
}, async (req) => {
    return await banUser(req.params.id, req.body.is_banned, req.user.id);
}, 1, 500, { logName: '封禁/解封用户' }));

// 修改用户权限
router.put('/users/:id/permission', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    permission: { type: 'number', required: true, enum: [1, 2, 3] }
}, async (req) => {
    return await updateUserPermission(req.params.id, req.body.permission, req.user.id);
}, 1, 500, { logName: '修改用户权限' }));

// 重置用户密码
router.post('/users/:id/reset-password', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await resetUserPassword(req.params.id, req.user.id);
}, 1, 500, { logName: '重置用户密码' }));

// 删除用户
router.delete('/users/:id', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await deleteUser(req.params.id, req.user.id);
}, 1, 500, { logName: '删除用户' }));

// 管理员重置用户名称
router.post('/users/:id/reset-name', ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true },
    name: { type: 'string', required: true, min: 1, max: 20 }
}, async (req) => {
    return await adminResetUserName(req.params.id, req.body.name, req.user.id);
}, 1, 500, { logName: '重置用户名称' }));

// 管理员重置用户头像
router.post('/users/:id/reset-avatar', upload.single('avatar'), ...createAdminValidatedRouteHandler({
    id: { source: 'params', type: 'id', required: true }
}, async (req) => {
    return await adminResetUserAvatar(req.params.id, req.file, req.user.id);
}, 1, 500, { logName: '重置用户头像' }));

export default router;
