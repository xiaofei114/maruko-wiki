import jwt from 'jsonwebtoken';
import { queryOne } from './database.js';

/**
 * 鉴权中间件方法
 */

/**
 * JWT Token 验证中间件
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 * @param {function} next - 下一个中间件
 */
export async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            code: 401,
            message: '访问令牌缺失'
        });
    }

    try {
        const config = global.appConfig;
        const jwtSecret = config.token;

        const decoded = jwt.verify(token, jwtSecret);

        // 检查用户是否还存在且未被封禁
        const user = queryOne('SELECT id, name, permission, is_banned FROM user WHERE id = ?', [decoded.userId]);
        if (!user) {
            return res.status(401).json({
                code: 401,
                message: '用户不存在'
            });
        }

        if (user.is_banned) {
            return res.status(403).json({
                code: 403,
                message: '账号已被封禁'
            });
        }

        // 将用户信息添加到请求对象中
        req.user = {
            id: user.id,
            name: user.name,
            permission: user.permission,
            accountNumber: decoded.accountNumber
        };

        next();
    } catch (error) {
        logger.warn('Token验证失败:', error.message);
        return res.status(403).json({
            code: 403,
            message: '访问令牌无效或已过期'
        });
    }
}

/**
 * 权限检查中间件
 * @param {number} requiredPermission - 所需的最低权限级别
 * @returns {function} 中间件函数
 */
export function requirePermission(requiredPermission) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                code: 401,
                message: '未认证的用户'
            });
        }

        if (req.user.permission > requiredPermission) {
            return res.status(requiredPermission === 1 ? 403 : 401).json({
                code: requiredPermission === 1 ? 403 : 401,
                message: `需要${requiredPermission === 1 ? '超级管理员' : requiredPermission === 2 ? '管理员及以上' : '登录用户'}权限`
            });
        }

        next();
    };
}

/**
 * 可选认证中间件（用于游客也可访问的接口）
 * @param {object} req - 请求对象
 * @param {object} res - 响应对象
 * @param {function} next - 下一个中间件
 */
export async function optionalAuth(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const config = global.appConfig;
            const jwtSecret = config.token;

            const decoded = jwt.verify(token, jwtSecret);
            const user = queryOne('SELECT id, name, permission, is_banned FROM user WHERE id = ?', [decoded.userId]);

            if (user && !user.is_banned) {
                req.user = {
                    id: user.id,
                    name: user.name,
                    permission: user.permission,
                    accountNumber: decoded.accountNumber
                };
            }
        } catch (error) {
            // Token无效，忽略，继续作为游客处理
            logger.debug('可选认证失败，继续作为游客:', error.message);
        }
    }

    next();
}

/**
 * 权限级别常量
 */
export const PERMISSIONS = {
    SUPER_ADMIN: 1,  // 超级管理员
    ADMIN: 2,        // 管理员
    USER: 3          // 普通用户
};
