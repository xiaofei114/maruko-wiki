import express from 'express';
import cors from "cors";

import { getFile } from '../services/file.js';
import { securityMiddleware } from '../middleware/security.js';
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
import videoFavoriteRoutes from '../routes/videoFavorite.js';
import favoriteRoutes from '../routes/favorite.js';
import logsRoutes from '../routes/logs.js';
import dictionaryRoutes from '../routes/dictionary.js';
import anchorStatsRoutes from '../routes/anchorStats.js';
import captainGiftRoutes from '../routes/captainGift.js';
import redisAdminRoutes from '../routes/redisAdmin.js';
import configRoutes from '../routes/config.js';
import homeModulesRoutes from '../routes/homeModules.js';
import chalk from 'chalk';

export default async () => {
    const appConfig = global.appConfig

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

    // 安全中间件 - 防护扫描攻击（放在日志之前，避免记录过多垃圾日志）
    App.use(securityMiddleware);

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

    // 集成路由 - 所有 :id 参数已添加正则约束 (\d+)，只匹配数字，避免与其他路由冲突
    App.use('/api', audioRoutes);
    App.use('/api', albumRoutes);
    App.use('/api', announcementRoutes); // 公告相关路由
    App.use('/api', planDocumentRoutes); // 企划文档相关路由
    App.use('/api', captainGiftRoutes); // 舰长礼物路由
    App.use('/api', anchorStatsRoutes); // 主播统计数据路由
    App.use('/api', homeModulesRoutes); // 首页功能模块数据路由
    App.use('/api', videoFavoriteRoutes); // 视频收藏夹相关路由（:id 已约束为数字）
    App.use('/api', favoriteRoutes); // 收藏夹相关路由（:id 已约束为数字）
    App.use('/api/admin', adminRoutes);
    App.use('/api/admin', logsRoutes); // 日志查询路由
    App.use('/api/admin', dictionaryRoutes); // 字典管理路由
    App.use('/api/super-admin', superAdminRoutes);
    App.use('/api/bilibili', bilibiliRoutes); // Bilibili API 代理路由
    App.use('/api/ai', aiRoutes); // AI相关路由
    App.use('/api', redisAdminRoutes); // Redis 管理路由（超级管理员）
    App.use('/api/admin/config', configRoutes); // 系统配置管理路由

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

    const PORT = appConfig.httpPort;
    App.listen(PORT, () => {
        logger.info(chalk.white('HTTP服务启动成功: ' + chalk.blue(`http://localhost:${PORT}`)))
    });
}