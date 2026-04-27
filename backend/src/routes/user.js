import express from 'express';
import { createRouteHandler } from '../method/route-helpers.js';
import { sendVerificationCode, verifyCode, register, login, resetPasswordByEmail } from '../services/user.js';
import { read_json } from '../method/read.js';

const router = express.Router();

// 登录接口
router.post('/login', createRouteHandler(async (req, res) => {
    const { accountNumber, password, token } = req.body;
    return await login(accountNumber, password, token);
}));

// 注册接口
router.post('/register', createRouteHandler(async (req, res) => {
    const { username, password, email, verificationCode } = req.body;
    return await register(username, password, email, verificationCode);
}));

// 发送验证码接口
router.post('/sendVerification', createRouteHandler(async (req, res) => {
    const appConfig = read_json('configs', 'config');

    // 检查邮件传输器是否已初始化
    if (!global.emailTransporter) {
        return {
            success: false,
            message: '邮件服务不可用',
            code: 503
        };
    }

    const { email, scene = 'register' } = req.body;
    return await sendVerificationCode(email, global.emailTransporter, appConfig, scene);
}));

// 验证验证码接口
router.post('/verifyCode', createRouteHandler(async (req, res) => {
    const { email, code } = req.body;
    return await verifyCode(email, code);
}));

// 重置密码接口
router.post('/resetPassword', createRouteHandler(async (req, res) => {
    const { email, verificationCode, newPassword } = req.body;
    return await resetPasswordByEmail(email, verificationCode, newPassword);
}));

export default router;
