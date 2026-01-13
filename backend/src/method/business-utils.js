import bcrypt from 'bcrypt';
import { queryOne, exists } from './database.js';

/**
 * 业务逻辑通用方法
 */

/**
 * 权限级别常量
 */
export const PERMISSIONS = {
    SUPER_ADMIN: 1,  // 超级管理员
    ADMIN: 2,        // 管理员
    USER: 3          // 普通用户
};

/**
 * 审核状态常量
 */
export const REVIEW_STATUS = {
    PENDING: 0,      // 待审核
    APPROVED: 1,     // 已审核通过
    REJECTED: 2      // 已审核拒绝
};

/**
 * 获取当前Unix时间戳
 * @returns {number} Unix时间戳（秒）
 */
export function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

/**
 * 生成随机密码
 * @param {number} length - 密码长度，默认为8
 * @returns {string} 随机密码
 */
export function generateRandomPassword(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

/**
 * 哈希密码
 * @param {string} password - 明文密码
 * @returns {Promise<string>} 哈希后的密码
 */
export async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

/**
 * 验证密码
 * @param {string} password - 明文密码
 * @param {string} hashedPassword - 哈希密码
 * @returns {Promise<boolean>} 密码是否匹配
 */
export async function verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export function validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 检查用户权限
 * @param {number} userPermission - 用户权限级别
 * @param {number} requiredPermission - 需要的权限级别
 * @returns {boolean} 是否有权限
 */
export function hasPermission(userPermission, requiredPermission) {
    return userPermission <= requiredPermission;
}

/**
 * 检查是否是超级管理员
 * @param {number} permission - 权限级别
 * @returns {boolean} 是否是超级管理员
 */
export function isSuperAdmin(permission) {
    return permission === PERMISSIONS.SUPER_ADMIN;
}

/**
 * 检查是否是管理员或以上
 * @param {number} permission - 权限级别
 * @returns {boolean} 是否是管理员或以上
 */
export function isAdminOrAbove(permission) {
    return permission <= PERMISSIONS.ADMIN;
}

/**
 * 根据用户权限决定审核状态
 * @param {number} userPermission - 用户权限级别
 * @returns {number} 审核状态
 */
export function getReviewStatusByPermission(userPermission) {
    return isAdminOrAbove(userPermission) ? REVIEW_STATUS.APPROVED : REVIEW_STATUS.PENDING;
}

/**
 * 检查用户是否存在
 * @param {number} userId - 用户ID
 * @returns {boolean} 用户是否存在
 */
export function userExists(userId) {
    return exists('user', { id: userId });
}

/**
 * 检查用户是否被封禁
 * @param {number} userId - 用户ID
 * @returns {boolean} 用户是否被封禁
 */
export function isUserBanned(userId) {
    const user = queryOne('SELECT is_banned FROM user WHERE id = ?', [userId]);
    return user ? user.is_banned === 1 : false;
}

/**
 * 获取用户信息
 * @param {number} userId - 用户ID
 * @returns {object|null} 用户信息
 */
export function getUserInfo(userId) {
    return queryOne(`
        SELECT id, name, account_number, permission, is_banned, create_time
        FROM user
        WHERE id = ?
    `, [userId]);
}

/**
 * 检查资源是否存在且未被删除
 * @param {string} tableName - 表名
 * @param {number} resourceId - 资源ID
 * @returns {boolean} 资源是否存在
 */
export function resourceExists(tableName, resourceId) {
    return exists(tableName, { id: resourceId, is_deleted: 0 });
}

/**
 * 检查资源是否属于用户
 * @param {string} tableName - 表名
 * @param {number} resourceId - 资源ID
 * @param {number} userId - 用户ID
 * @returns {boolean} 资源是否属于用户
 */
export function resourceBelongsToUser(tableName, resourceId, userId) {
    return exists(tableName, { id: resourceId, user_id: userId, is_deleted: 0 });
}

/**
 * 创建标准的成功响应
 * @param {string|*} messageOrData - 消息字符串，或直接传入数据对象
 * @param {*} data - 数据（当第一个参数是消息时）
 * @returns {object} 响应对象
 */
export function createSuccessResponse(messageOrData, data = null) {
    // 如果第一个参数不是字符串，则将其当作data，message使用默认值
    if (typeof messageOrData !== 'string') {
        return {
            success: true,
            message: '操作成功',
            data: messageOrData
        };
    }

    // 原来的调用方式：message, data
    return {
        success: true,
        message: messageOrData,
        data
    };
}

/**
 * 创建标准的错误响应
 * @param {string} message - 错误消息
 * @param {number} code - 错误码，默认为500
 * @returns {object} 响应对象
 */
export function createErrorResponse(message, code = 500) {
    return {
        success: false,
        message,
        code
    };
}

/**
 * 验证字符串长度
 * @param {string} str - 字符串
 * @param {number} minLength - 最小长度
 * @param {number} maxLength - 最大长度
 * @param {string} fieldName - 字段名，用于错误消息
 * @returns {object} 验证结果 {valid: boolean, message?: string}
 */
export function validateStringLength(str, minLength, maxLength, fieldName = '字段') {
    if (typeof str !== 'string') {
        return { valid: false, message: `${fieldName}必须是字符串` };
    }

    const length = str.trim().length;
    if (length < minLength) {
        return { valid: false, message: `${fieldName}长度不能少于${minLength}个字符` };
    }

    if (length > maxLength) {
        return { valid: false, message: `${fieldName}长度不能超过${maxLength}个字符` };
    }

    return { valid: true };
}

/**
 * 验证必需字段
 * @param {*} value - 字段值
 * @param {string} fieldName - 字段名
 * @returns {object} 验证结果 {valid: boolean, message?: string}
 */
export function validateRequired(value, fieldName) {
    if (value === null || value === undefined) {
        return { valid: false, message: `${fieldName}不能为空` };
    }

    if (typeof value === 'string' && !value.trim()) {
        return { valid: false, message: `${fieldName}不能为空` };
    }

    return { valid: true };
}

/**
 * 验证枚举值
 * @param {*} value - 值
 * @param {Array} allowedValues - 允许的值
 * @param {string} fieldName - 字段名
 * @returns {object} 验证结果 {valid: boolean, message?: string}
 */
export function validateEnum(value, allowedValues, fieldName) {
    if (!allowedValues.includes(value)) {
        return { valid: false, message: `${fieldName}必须是以下值之一: ${allowedValues.join(', ')}` };
    }

    return { valid: true };
}

/**
 * 验证ID格式
 * @param {*} id - ID值
 * @param {string} fieldName - 字段名
 * @returns {object} 验证结果 {valid: boolean, message?: string}
 */
export function validateId(id, fieldName = 'ID') {
    const parsedId = parseInt(id);
    if (!parsedId || parsedId <= 0) {
        return { valid: false, message: `无效的${fieldName}` };
    }

    return { valid: true };
}

/**
 * 生成验证码
 * @param {number} length - 验证码长度，默认为6
 * @returns {string} 验证码
 */
export function generateVerificationCode(length = 6) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}

/**
 * 格式化时间戳为可读格式
 * @param {number} timestamp - Unix时间戳
 * @returns {string} 格式化的时间字符串
 */
export function formatTimestamp(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * 清理对象中的空值和undefined
 * @param {object} obj - 要清理的对象
 * @returns {object} 清理后的对象
 */
export function cleanObject(obj) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined && value !== '') {
            cleaned[key] = value;
        }
    }
    return cleaned;
}

/**
 * 深度合并对象
 * @param {object} target - 目标对象
 * @param {object} source - 源对象
 * @returns {object} 合并后的对象
 */
export function deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }

    return result;
}
