import express from 'express';
import { createAdminValidatedRouteHandler, createAdminRoute } from '../method/route-helpers.js';
import {
    getUsers,
    banUser,
    updateUserPermission,
    resetUserPassword,
    deleteUser
} from '../services/user.js';
import { getDashboardStats } from '../services/dashboard.js';

const router = express.Router();

// 超级管理员专用路由

// 获取仪表盘数据
router.get('/dashboard', ...createAdminRoute(async () => {
    return await getDashboardStats();
}, 1, { logName: '获取仪表盘数据' }));

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

export default router;
