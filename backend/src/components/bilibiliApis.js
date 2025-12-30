import express from 'express';
import axios from 'axios';
import cors from 'cors';
import { read_json } from '../method/read.js'

// 使用全局chalk，如果不存在则使用console
const chalk = global.chalk || { white: (s) => s, blue: (s) => s, yellow: (s) => s };

export default async function () {

    const config = read_json("configs", "config")
    const PORT = config.apiPort

    const app = express();
    const baseURLs = 'https://api.live.bilibili.com';

    // 中间件
    app.use(cors());
    app.use(express.json());

    // 代理请求处理函数
    async function proxyRequest(req, res) {
        try {
            // 构建目标URL
            const targetURL = baseURLs + req.path;

            logger.info(`${req.method} ${targetURL}`);

            // 转发请求
            const response = await axios({
                method: req.method,
                url: targetURL,
                params: req.query,
                data: req.body,
                headers: {
                    ...req.headers,
                    host: new URL(baseURLs).host,
                    'content-length': undefined,
                    origin: baseURLs,
                    referer: baseURLs,
                },
                timeout: 10000,
                validateStatus: () => true,
            });

            res.status(response.status).send(response.data);
        } catch (error) {
            logger.error(error);
            res.status(500).json({
                code: 1,
                message: 'Internal Server Error'
            });
        }
    }

    // 修复：使用正确的通配符语法
    // 方法1：使用正则表达式（推荐）
    app.get(/\/(.+)/, proxyRequest);
    app.post(/\/(.+)/, proxyRequest);
    app.put(/\/(.+)/, proxyRequest);
    app.delete(/\/(.+)/, proxyRequest);
    app.patch(/\/(.+)/, proxyRequest);
    app.options(/\/(.+)/, proxyRequest);

    // 启动服务器
    try {
        const server = app.listen(PORT, () => {
            logger.info(chalk.white('bilibili接口反代理启动成功: ' + chalk.blue(`http://localhost:${PORT}`)))
        });

        // 监听端口占用错误
        server.on('error', (error) => {
            if (error.code === 'EADDRINUSE') {
                logger.warn(chalk.yellow(`bilibili接口反代理启动失败: 端口 ${PORT} 已被占用`));
                logger.warn(chalk.yellow('主应用将继续运行，但bilibili API代理功能将不可用'));
                // 不退出进程，让主应用继续运行
            } else {
                logger.error('bilibili接口反代理启动失败:', error);
                // 对于其他错误，可以选择退出或继续运行
                // 这里选择继续运行，避免影响主应用
            }
        });

    } catch (error) {
        logger.warn(chalk.yellow('bilibili接口反代理初始化失败，但主应用将继续运行'));
        logger.warn(chalk.yellow('bilibili API代理功能将不可用'));
    }
}