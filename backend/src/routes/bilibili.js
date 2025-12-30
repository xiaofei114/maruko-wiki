import express from 'express';
import { proxyBilibiliRequest } from '../services/bilibili.js';

const router = express.Router();

// Bilibili API 代理路由
// 支持所有 HTTP 方法和任意路径
async function handleBilibiliProxy(req, res) {
    try {
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
