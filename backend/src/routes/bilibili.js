import express from 'express';
import { proxyBilibiliRequest } from '../services/bilibili.js';

const router = express.Router();

// 允许的代理路由列表
const ALLOWED_ROUTES = [
    '/room/v1/Room/get_info',
    '/live_user/v1/Master/info',
    '/xlive/app-room/v2/guardTab/topListNew',
];

// Bilibili API 代理路由
// 支持所有 HTTP 方法和任意路径
async function handleBilibiliProxy(req, res) {
    try {
        // 检查请求路径是否在允许的路由列表中
        const isAllowed = ALLOWED_ROUTES.some(route => req.path.startsWith(route));
        if (!isAllowed) {
            return res.status(403).json({
                code: 403,
                message: 'Forbidden: Route not allowed'
            });
        }

        const result = await proxyBilibiliRequest(
            req.method,
            req.path,
            req.query,
            req.body,
            req.headers
        );

        res.status(result.status).send(result.data);
    } catch (error) {
        res.status(500).json({
            code: 1,
            message: 'Internal Server Error'
        });
    }
}

// 使用通配符路由匹配所有请求
router.get('/*', handleBilibiliProxy);
router.post('/*', handleBilibiliProxy);
router.put('/*', handleBilibiliProxy);
router.delete('/*', handleBilibiliProxy);
router.patch('/*', handleBilibiliProxy);
router.options('/*', handleBilibiliProxy);

export default router;
