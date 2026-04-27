import express from 'express';
import cors from "cors";
import { read_json } from "../method/read.js"
import { getFile } from '../services/file.js';
import audioRoutes from '../routes/audio.js';
import albumRoutes from '../routes/album.js';
import adminRoutes from '../routes/admin.js';
import superAdminRoutes from '../routes/super-admin.js';
import userRoutes from '../routes/user.js';
import userProfileRoutes from '../routes/userProfile.js';
import bilibiliRoutes from '../routes/bilibili.js';
import aiRoutes from '../routes/ai.js';
import announcementRoutes from '../routes/announcement.js';
import planDocumentRoutes from '../routes/planDocument.js';
import logsRoutes from '../routes/logs.js';
import dictionaryRoutes from '../routes/dictionary.js';
import anchorStatsRoutes from '../routes/anchorStats.js';
import captainGiftRoutes from '../routes/captainGift.js';
import redisAdminRoutes from '../routes/redisAdmin.js';
import chalk from 'chalk';

export default async () => {
    const appConfig = read_json("configs", "config")

    const App = express();

    // 信任代理，以便正确获取客户端真实IP
    App.set('trust proxy', true);

    App.use(cors({
        origin: (origin, callback) => {
            const domainName = appConfig.domainName; //允许的域名
            const allow = !origin || domainName.includes(origin)
            if (!allow) logger.warn(`拒绝跨域请求:${origin}`);
            callback(null, allow);
        }
    }));
    App.use(express.json());
    App.use(express.urlencoded({ extended: false }));
    // 请求日志中间件
    App.use((req, res, next) => {
        const clientIp = req.headers["x-forwarded-for"] || req.ip;
        logger.info(`${req.method}://${clientIp}${req.url}`);
        // 只在未设置Content-Type时设置为text/plain，避免覆盖文件服务的MIME类型
        if (!res.get('Content-Type')) {
            res.set("Content-Type", "text/plain; charset=utf-8");
        }
        next();
    });

    // 集成路由
    App.use('/api', audioRoutes);
    App.use('/api', albumRoutes);
    App.use('/api', announcementRoutes); // 公告相关路由
    App.use('/api', planDocumentRoutes); // 企划文档相关路由
    App.use('/api/admin', adminRoutes);
    App.use('/api/admin', logsRoutes); // 日志查询路由
    App.use('/api/admin', dictionaryRoutes); // 字典管理路由
    App.use('/api/super-admin', superAdminRoutes);
    App.use('/api/bilibili', bilibiliRoutes); // Bilibili API 代理路由
    App.use('/api/ai', aiRoutes); // AI相关路由
    App.use('/api', anchorStatsRoutes); // 主播统计数据路由
    App.use('/api', captainGiftRoutes); // 舰长礼物路由
    App.use('/api', redisAdminRoutes); // Redis 管理路由（超级管理员）

    // 通过url获取/data/document下的文件 - 必须在用户路由之前
    App.get('/api/file/*', async (req, res) => {
        const filePath = req.params[0]; // 获取路径参数
        const result = await getFile(filePath, req, res);

        // 如果服务失败，返回错误信息
        if (!result.success) {
            return res.status(result.code).json({
                code: result.code,
                message: result.message
            });
        }
    });

    // 兼容nginx代理后的请求（/api前缀被nginx去掉）
    App.get('/file/*', async (req, res) => {
        const filePath = req.params[0]; // 获取路径参数
        const result = await getFile(filePath, req, res);

        // 如果服务失败，返回错误信息
        if (!result.success) {
            return res.status(result.code).json({
                code: result.code,
                message: result.message
            });
        }
    });

    App.use('/', userRoutes); // 用户相关路由（登录、注册等）
    App.use('/api/user', userProfileRoutes); // 用户个人中心路由

    // ============================================
    // TODO: 消息通知触发点 - 待实现
    // ============================================
    // 
    // 1. 创建账号后发欢迎消息
    //    位置: backend/src/services/user.js -> register() 函数
    //    实现: 注册成功后调用 createNotification(userId, '欢迎加入', '欢迎...', 'system')
    //
    // 2. 审核状态变更通知（普通成员）
    //    位置: backend/src/services/photo.js, audio.js, album.js 等
    //    触发: 内容审核通过/失败/撤销时
    //    实现: 调用 createNotification(userId, '审核通知', '您的xxx已审核通过', 'review')
    //
    // 3. 新的待审核信息通知（管理员）
    //    位置: backend/src/services/photo.js, audio.js, album.js 等
    //    触发: 有新内容提交审核时
    //    实现: 查询所有管理员/超级管理员，发送通知
    //
    // 4. 新公告通知
    //    位置: backend/src/services/announcement.js
    //    触发: 创建新公告时
    //    实现: 给所有用户发送通知
    //
    // 5. 账号信息修改通知
    //    位置: backend/src/services/userProfile.js
    //    触发: 修改密码/绑定账号/修改名称/修改头像后
    //    实现: 调用 createNotification(userId, '安全提醒', '您的xxx已修改', 'security')
    //
    // 6. 管理员重置信息通知
    //    位置: backend/src/services/user.js -> resetUserInfo() 等
    //    触发: 管理员重置用户名称/头像后
    //    实现: 调用 createNotification(userId, '账号变更', '管理员已重置您的xxx', 'admin')
    //
    // ============================================

    const PORT = appConfig.httpPort;
    App.listen(PORT, () => {
        logger.info(chalk.white('HTTP服务启动成功: ' + chalk.blue(`http://localhost:${PORT}`)))
    });
}