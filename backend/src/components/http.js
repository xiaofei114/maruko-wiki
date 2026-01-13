import express from 'express';
import cors from "cors";
import { read_json } from "../method/read.js"
import { getFile } from '../services/file.js';
import audioRoutes from '../routes/audio.js';
import albumRoutes from '../routes/album.js';
import adminRoutes from '../routes/admin.js';
import superAdminRoutes from '../routes/super-admin.js';
import userRoutes from '../routes/user.js';
import bilibiliRoutes from '../routes/bilibili.js';
import aiRoutes from '../routes/ai.js';

export default async () => {
    const appConfig = read_json("configs", "config")

    const App = express();

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
    App.use((req, res, next) => {
        const clientIp = req.headers["x-forwarded-for"] || req.ip;
        logger.info(`${req.method}://${clientIp}${req.url}`);
        // 只在未设置Content-Type时设置为text/plain，避免覆盖文件服务的MIME类型
        if (!res.get('Content-Type')) {
            res.set("Content-Type", "text/plain");
        }
        next();
    });

    // 集成路由
    App.use('/api', audioRoutes);
    App.use('/api', albumRoutes);
    App.use('/api/admin', adminRoutes);
    App.use('/api/super-admin', superAdminRoutes);
    App.use('/api/bilibili', bilibiliRoutes); // Bilibili API 代理路由
    App.use('/api/ai', aiRoutes); // AI相关路由
    App.use('/', userRoutes); // 用户相关路由（登录、注册等）

    // 通过url获取/data/document下的文件
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


    const PORT = appConfig.httpPort;
    App.listen(PORT, () => {
        logger.info(chalk.white('HTTP服务器启动成功: ' + chalk.blue(`http://localhost:${PORT}`)))
    });
}