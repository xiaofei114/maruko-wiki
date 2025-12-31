import { read_json } from '../method/read.js';
import jwt from 'jsonwebtoken';
import {
    hashPassword, verifyPassword, validateEmailFormat,
    generateVerificationCode, getCurrentTimestamp,
    createSuccessResponse, createErrorResponse,
    validateStringLength, validateRequired, validateEnum, validateId,
    PERMISSIONS, getUserInfo, isUserBanned
} from '../method/business-utils.js';
import { queryOne, queryAll, insert, update, exists } from '../method/database.js';

/**
 * 发送验证码服务
 * @param {string} email - 邮箱地址
 * @param {object} emailTransporter - 邮件传输器
 * @param {object} appConfig - 应用配置
 * @returns {object} 发送结果
 */
export async function sendVerificationCode(email, emailTransporter, appConfig) {
    // 验证邮箱格式
    if (!validateEmailFormat(email)) {
        return createErrorResponse('请提供有效的邮箱地址', 400);
    }

    // 生成6位数字验证码
    const verificationCode = generateVerificationCode(6);

    // 将验证码存储到Redis，3分钟过期
    const redisKey = `verification_code:${email}`;
    await global.redis.setex(redisKey, 300, verificationCode);

    // 发送邮件
    const mailOptions = {
        from: appConfig.email.from,
        to: email,
        subject: '小猫丸子Wiki 验证码',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <p>您好！</p>
                <p>您的验证码是：<strong style="font-size: 24px; color: #007bff;">${verificationCode}</strong></p>
                <p>验证码将在3分钟后过期，请及时使用。</p>
                <p>如果这不是您的操作，请忽略此邮件。</p>
                <hr>
                <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
            </div>
        `
    };

    await emailTransporter.sendMail(mailOptions);

    logger.info(`验证码已发送到邮箱: ${email}`);
    return createSuccessResponse('验证码已发送到您的邮箱');
}

// 验证验证码服务
export async function verifyCode(email, code) {
    // 验证参数
    const emailValidation = validateRequired(email, '邮箱');
    if (!emailValidation.valid) {
        return createErrorResponse(emailValidation.message, 400);
    }

    const codeValidation = validateRequired(code, '验证码');
    if (!codeValidation.valid) {
        return createErrorResponse(codeValidation.message, 400);
    }

    // 从Redis获取验证码
    const redisKey = `verification_code:${email}`;
    const storedCode = await global.redis.get(redisKey);

    if (!storedCode) {
        return createErrorResponse('验证码已过期或不存在', 400);
    }

    if (storedCode !== code) {
        return createErrorResponse('验证码错误', 400);
    }

    logger.info(`邮箱 ${email} 验证码验证成功`);
    return createSuccessResponse('验证码验证成功');
}

/**
 * 用户登录服务
 * @param {string} accountNumber - 账号（邮箱）
 * @param {string} password - 密码
 * @param {string} token - JWT token（可选，用于续期）
 * @returns {object} 登录结果
 */
export async function login(accountNumber, password, token) {
    // 获取配置
    const config = read_json('configs', 'config');
    const jwtSecret = config.token;

    // 如果传入了token，进行token验证
    if (token) {
        try {
            const decoded = jwt.verify(token, jwtSecret);

            // 检查用户是否存在
            const user = getUserInfo(decoded.userId);
            if (!user) {
                return createErrorResponse('用户不存在', 401);
            }

            // 检查用户是否被封禁
            if (isUserBanned(decoded.userId)) {
                return createErrorResponse('账号已被封禁', 403);
            }

            // 生成新的token（续期）
            const newToken = jwt.sign(
                { userId: user.id, accountNumber: decoded.accountNumber },
                jwtSecret,
                { expiresIn: '3d' }
            );

            return createSuccessResponse('登录成功', {
                token: newToken,
                permission: user.permission,
                name: user.name
            });

        } catch (error) {
            return createErrorResponse('token无效或已过期', 401);
        }
    }

    // 如果没有token，进行账号密码登录
    const accountValidation = validateRequired(accountNumber, '账号');
    if (!accountValidation.valid) {
        return createErrorResponse(accountValidation.message, 400);
    }

    const passwordValidation = validateRequired(password, '密码');
    if (!passwordValidation.valid) {
        return createErrorResponse(passwordValidation.message, 400);
    }

    try {
        // 查找用户
        const user = queryOne('SELECT * FROM user WHERE account_number = ?', [accountNumber]);
        if (!user) {
            return createErrorResponse('账号或密码错误', 401);
        }

        // 检查用户是否被封禁
        if (isUserBanned(user.id)) {
            return createErrorResponse('账号已被封禁', 403);
        }

        // 验证密码
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return createErrorResponse('账号或密码错误', 401);
        }

        // 生成JWT token
        const token = jwt.sign(
            { userId: user.id, accountNumber: user.account_number },
            jwtSecret,
            { expiresIn: '3d' }
        );

        logger.info(`用户登录成功: ${user.name} (${accountNumber})`);

        return createSuccessResponse('登录成功', {
            token: token,
            permission: user.permission,
            name: user.name
        });

    } catch (error) {
        logger.error('登录失败:', error);
        return createErrorResponse('登录失败，请稍后重试', 500);
    }
}

/**
 * 用户注册服务
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} email - 邮箱地址
 * @param {string} verificationCode - 验证码
 * @returns {object} 注册结果
 */
export async function register(username, password, email, verificationCode) {
    // 验证参数
    const usernameValidation = validateRequired(username, '用户名');
    if (!usernameValidation.valid) {
        return createErrorResponse(usernameValidation.message, 400);
    }

    const passwordValidation = validateRequired(password, '密码');
    if (!passwordValidation.valid) {
        return createErrorResponse(passwordValidation.message, 400);
    }

    const emailValidation = validateRequired(email, '邮箱');
    if (!emailValidation.valid) {
        return createErrorResponse(emailValidation.message, 400);
    }

    const codeValidation = validateRequired(verificationCode, '验证码');
    if (!codeValidation.valid) {
        return createErrorResponse(codeValidation.message, 400);
    }

    // 验证用户名长度
    const usernameLengthValidation = validateStringLength(username, 2, 20, '用户名');
    if (!usernameLengthValidation.valid) {
        return createErrorResponse(usernameLengthValidation.message, 400);
    }

    // 验证密码强度
    const passwordLengthValidation = validateStringLength(password, 6, 100, '密码');
    if (!passwordLengthValidation.valid) {
        return createErrorResponse(passwordLengthValidation.message, 400);
    }

    // 验证邮箱格式
    if (!validateEmailFormat(email)) {
        return createErrorResponse('请提供有效的邮箱地址', 400);
    }

    // 先验证验证码
    const codeResult = await verifyCode(email, verificationCode);
    if (!codeResult.success) {
        return createErrorResponse('验证码验证失败: ' + codeResult.message, 400);
    }

    try {
        // 检查用户名是否已存在
        if (exists('user', { name: username })) {
            return createErrorResponse('用户名已存在', 400);
        }

        // 检查邮箱是否已被注册
        if (exists('user', { account_number: email })) {
            return createErrorResponse('该邮箱已被注册', 400);
        }

        // 密码加密
        const hashedPassword = await hashPassword(password);

        // 创建用户记录
        const result = insert(`
            INSERT INTO user (name, account_number, password, permission, is_banned, create_time, update_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [username, email, hashedPassword, PERMISSIONS.USER, 0, getCurrentTimestamp(), getCurrentTimestamp()]);

        logger.info(`新用户注册成功: ${username} (${email})`);
        return createSuccessResponse('注册成功', { userId: result.lastInsertRowid });

    } catch (error) {
        logger.error('注册失败:', error);
        return createErrorResponse('注册失败，请稍后重试', 500);
    }
}

/**
 * 生成随机密码
 * @param {number} length - 密码长度
 * @returns {string} 随机密码
 */
function generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * 获取所有用户列表 - 超级管理员专用
 * @returns {object} 用户列表
 */
/**
 * 获取用户列表 - 超级管理员专用
 * @returns {object} 用户列表结果
 */
export async function getUsers() {
    try {
        const users = queryAll(`
            SELECT
                id,
                name,
                account_number,
                permission,
                is_banned,
                create_time
            FROM user
            ORDER BY create_time DESC
        `);

        logger.info(`获取用户列表: ${users.length}个用户`);
        return createSuccessResponse('获取用户列表成功', users);

    } catch (error) {
        logger.error('获取用户列表失败:', error);
        return createErrorResponse('获取用户列表失败', 500);
    }
}

/**
 * 封禁/解封用户 - 超级管理员专用
 * @param {number} userId - 用户ID
 * @param {number} isBanned - 封禁状态 (0: 解封, 1: 封禁)
 * @param {number} adminId - 操作管理员ID
 * @returns {object} 操作结果
 */
export async function banUser(userId, isBanned, adminId) {
    try {
        // 验证用户ID
        const idValidation = validateId(userId, '用户ID');
        if (!idValidation.valid) {
            return createErrorResponse(idValidation.message, 400);
        }

        // 检查用户是否存在
        const user = getUserInfo(userId);
        if (!user) {
            return createErrorResponse('用户不存在', 404);
        }

        // 不能封禁自己
        if (userId === adminId) {
            return createErrorResponse('不能对自己进行封禁操作', 400);
        }

        // 验证封禁状态
        const banValidation = validateEnum(isBanned, [0, 1], 'is_banned');
        if (!banValidation.valid) {
            return createErrorResponse(banValidation.message, 400);
        }

        // 更新用户状态
        update(`
            UPDATE user
            SET is_banned = ?, update_time = ?
            WHERE id = ?
        `, [isBanned, getCurrentTimestamp(), userId]);

        const action = isBanned ? '封禁' : '解封';
        logger.info(`${action}用户成功: ${user.name}(${userId}) by admin ${adminId}`);

        return createSuccessResponse(`${action}用户成功`, {
            userId: userId,
            isBanned: isBanned
        });

    } catch (error) {
        logger.error('封禁/解封用户失败:', error);
        return {
            success: false,
            message: '操作失败',
            code: 500
        };
    }
}

/**
 * 修改用户权限 - 超级管理员专用
 * @param {number} userId - 用户ID
 * @param {number} permission - 新权限级别 (1=超级管理员, 2=管理员, 3=普通用户)
 * @param {number} adminId - 操作管理员ID
 * @returns {object} 操作结果
 */
export async function updateUserPermission(userId, permission, adminId) {
    try {
        // 验证用户ID
        const idValidation = validateId(userId, '用户ID');
        if (!idValidation.valid) {
            return createErrorResponse(idValidation.message, 400);
        }

        // 检查用户是否存在
        const user = getUserInfo(userId);
        if (!user) {
            return createErrorResponse('用户不存在', 404);
        }

        // 验证权限参数
        const permissionValidation = validateEnum(permission, [1, 2, 3]);
        if (!permissionValidation.valid) {
            return createErrorResponse('无效的权限级别', 400);
        }

        // 不能修改自己的权限
        if (userId === adminId) {
            return {
                success: false,
                message: '不能修改自己的权限',
                code: 400
            };
        }

        // 更新用户权限
        const currentTime = Math.floor(Date.now() / 1000);
        update(`
            UPDATE user
            SET permission = ?, update_time = ?
            WHERE id = ?
        `, [permission, currentTime, userId]);

        logger.info(`修改用户权限成功: ${user.name}(${userId}) 权限从 ${user.permission} 改为 ${permission} by admin ${adminId}`);

        return {
            success: true,
            message: '修改用户权限成功',
            data: {
                userId: userId,
                permission: permission
            }
        };

    } catch (error) {
        logger.error('修改用户权限失败:', error);
        return {
            success: false,
            message: '操作失败',
            code: 500
        };
    }
}

/**
 * 重置用户密码 - 超级管理员专用
 * @param {number} userId - 用户ID
 * @param {number} adminId - 操作管理员ID
 * @returns {object} 操作结果
 */
export async function resetUserPassword(userId, adminId) {
    try {
        // 检查用户是否存在
        const user = queryOne('SELECT id, name, account_number FROM user WHERE id = ?', [userId]);
        if (!user) {
            return {
                success: false,
                message: '用户不存在',
                code: 404
            };
        }

        // 生成新密码
        const newPassword = generateRandomPassword(8);
        const hashedPassword = await hashPassword(newPassword);

        // 更新用户密码
        const currentTime = Math.floor(Date.now() / 1000);
        update(`
            UPDATE user
            SET password = ?, update_time = ?
            WHERE id = ?
        `, [hashedPassword, currentTime, userId]);

        // 发送邮件通知
        try {
            const config = read_json('configs', 'config');
            const emailTransporter = global.emailTransporter;

            const mailOptions = {
                from: config.email.from,
                to: user.account_number,
                subject: 'MarukoNode 密码重置通知',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">MarukoNode 密码重置通知</h2>
                        <p>您好，${user.name}！</p>
                        <p>您的密码已被管理员重置，新密码是：<strong style="font-size: 24px; color: #007bff;">${newPassword}</strong></p>
                        <p>请及时登录并修改密码。</p>
                        <p>如果这不是您的操作，请立即联系管理员。</p>
                        <hr>
                        <p style="color: #666; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
                    </div>
                `
            };

            await emailTransporter.sendMail(mailOptions);
            logger.info(`密码重置邮件已发送到: ${user.account_number}`);

        } catch (emailError) {
            logger.error('发送密码重置邮件失败:', emailError);
            // 不影响密码重置成功，只是邮件发送失败
        }

        logger.info(`重置用户密码成功: ${user.name}(${userId}) by admin ${adminId}`);

        return {
            success: true,
            message: '重置用户密码成功，新密码已发送到用户邮箱',
            data: {
                userId: userId
            }
        };

    } catch (error) {
        logger.error('重置用户密码失败:', error);
        return {
            success: false,
            message: '重置密码失败',
            code: 500
        };
    }
}

/**
 * 删除用户 - 超级管理员专用（彻底删除）
 * @param {number} userId - 用户ID
 * @param {number} adminId - 操作管理员ID
 * @returns {object} 操作结果
 */
export async function deleteUser(userId, adminId) {
    try {
        // 检查用户是否存在
        const user = queryOne('SELECT id, name FROM user WHERE id = ?', [userId]);
        if (!user) {
            return {
                success: false,
                message: '用户不存在',
                code: 404
            };
        }

        // 不能删除自己
        if (userId === adminId) {
            return {
                success: false,
                message: '不能删除自己的账号',
                code: 400
            };
        }

        // 开始事务，确保数据一致性
        const db = global.db;
        db.exec('BEGIN TRANSACTION');

        try {
            // 删除用户相关的所有数据
            // 删除用户的音频
            db.prepare('DELETE FROM audio WHERE user_id = ?').run(userId);
            // 删除用户的音频分类
            db.prepare('DELETE FROM audio_classification WHERE user_id = ?').run(userId);
            // 删除用户的相册
            db.prepare('DELETE FROM photo_album WHERE user_id = ?').run(userId);
            // 删除用户的照片
            db.prepare('DELETE FROM photo WHERE user_id = ?').run(userId);
            // 最后删除用户
            db.prepare('DELETE FROM user WHERE id = ?').run(userId);

            db.exec('COMMIT');

            logger.info(`彻底删除用户成功: ${user.name}(${userId}) by admin ${adminId}`);

            return {
                success: true,
                message: '删除用户成功',
                data: {
                    userId: userId
                }
            };

        } catch (transactionError) {
            db.exec('ROLLBACK');
            throw transactionError;
        }

    } catch (error) {
        logger.error('删除用户失败:', error);
        return {
            success: false,
            message: '删除用户失败',
            code: 500
        };
    }
}