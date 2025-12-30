import Redis from 'ioredis';
import { read_json } from '../method/read.js'

export default async () => {
    const config = read_json("configs", "config");
    const redisdata = config.redis;

    const redis = new Redis({
        host: redisdata.host,
        port: redisdata.port,
        password: redisdata.password,
        keyPrefix: "maruko:", // 自动键前缀
        enableReadyCheck: true,
        connectTimeout: 5000
    });

    redis.on('error', (err) => {
        logger.fatal('Redis 连接错误:');
        logger.fatal(err);
        process.exit(1) // 立即退出进程
    });

    try {
        // 带超时的连接
        await Promise.race([
            new Promise((resolve) => redis.on('ready', resolve)),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Redis 连接超时')), 5000))
        ]);

        logger.info(chalk.white('Redis连接成功: ' + chalk.blue(`redis://${redisdata.host}:${redisdata.port}`)));
    } catch (err) {
        logger.fatal('Redis 连接失败:', err)
        await redis.quit().catch(() => { }) // 尝试安全关闭
        process.exit(1) // 退出进程
    }

    // 心跳检测（可选增强）
    const interval = setInterval(async () => {
        try {
            await redis.ping()
        } catch (err) {
            logger.fatal('Redis 连接超时:', err)
            clearInterval(interval)
            process.exit(1)
        }
    }, 60000) // 每分钟检测一次

    global.redis = redis;
}