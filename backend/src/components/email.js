import nodemailer from 'nodemailer';
import { read_json } from '../method/read.js';

export default async () => {
    try {
        const config = read_json('configs', 'config');

        // 检查邮件配置是否存在
        const emailConfig = config.email;
        if (!emailConfig || !emailConfig.host || !emailConfig.port || !emailConfig.auth?.user || !emailConfig.auth?.pass) {
            logger.warn('邮件配置不完整，邮件功能将被禁用');
            if (!emailConfig) {
                logger.warn('  - 缺少 email 配置对象');
            } else {
                if (!emailConfig.host) logger.warn('  - 缺少 email.host 配置');
                if (!emailConfig.port) logger.warn('  - 缺少 email.port 配置');
                if (!emailConfig.auth?.user) logger.warn('  - 缺少 email.auth.user 配置');
                if (!emailConfig.auth?.pass) logger.warn('  - 缺少 email.auth.pass 配置');
            }
            global.emailTransporter = null;
            return;
        }

        // 创建邮件传输器
        const transporter = nodemailer.createTransport({
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure || false, // true for 465, false for other ports
            auth: {
                user: emailConfig.auth.user,
                pass: emailConfig.auth.pass
            }
        });

        // 验证连接
        try {
            await transporter.verify();
            global.emailTransporter = transporter;
            logger.info(chalk.white('邮件传输器初始化成功'));
        } catch (verifyError) {
            // 连接验证失败，但不影响应用启动
            logger.warn('邮件连接验证失败，可能是账户信息有误。邮件功能将被禁用。');
            logger.debug('邮件验证错误:', verifyError.message);
            global.emailTransporter = null; // 验证失败时不保存传输器
        }
    } catch (error) {
        logger.warn('邮件传输器初始化失败，邮件功能将被禁用');
        logger.debug('邮件初始化错误详情:', error.message);
        global.emailTransporter = null;
    }
};
