/**
 * 参数验证方法
 */

/**
 * 验证并解析ID参数
 * @param {string} id - ID字符串
 * @param {string} fieldName - 字段名称，用于错误消息
 * @returns {number|null} 解析后的ID，如果无效返回null
 */
export function validateId(id, fieldName = 'ID') {
    const parsedId = parseInt(id);
    if (!parsedId || parsedId <= 0) {
        return null;
    }
    return parsedId;
}

/**
 * 验证必需的参数
 * @param {*} value - 参数值
 * @param {string} fieldName - 字段名称，用于错误消息
 * @returns {boolean} 是否有效
 */
export function validateRequired(value, fieldName) {
    if (value === null || value === undefined) {
        return false;
    }

    if (typeof value === 'string' && !value.trim()) {
        return false;
    }

    return true;
}

/**
 * 验证枚举值
 * @param {*} value - 参数值
 * @param {Array} allowedValues - 允许的值数组
 * @param {string} fieldName - 字段名称，用于错误消息
 * @returns {boolean} 是否有效
 */
export function validateEnum(value, allowedValues, fieldName) {
    return allowedValues.includes(value);
}

/**
 * 验证数字范围
 * @param {number} value - 数值
 * @param {number} min - 最小值（包含）
 * @param {number} max - 最大值（包含）
 * @param {string} fieldName - 字段名称，用于错误消息
 * @returns {boolean} 是否有效
 */
export function validateRange(value, min, max, fieldName) {
    return typeof value === 'number' && value >= min && value <= max;
}

/**
 * 验证权限值 (1=超级管理员, 2=管理员, 3=普通用户)
 * @param {number} permission - 权限值
 * @returns {boolean} 是否有效
 */
export function validatePermission(permission) {
    return validateEnum(permission, [1, 2, 3], 'permission');
}

/**
 * 验证审核状态值 (0=待审核, 1=审核通过, 2=审核不通过)
 * @param {number} isReview - 审核状态值
 * @returns {boolean} 是否有效
 */
export function validateReviewStatus(isReview) {
    return validateEnum(isReview, [0, 1, 2], 'is_review');
}

/**
 * 验证布尔值 (0或1)
 * @param {number} value - 布尔值
 * @param {string} fieldName - 字段名称
 * @returns {boolean} 是否有效
 */
export function validateBoolean(value, fieldName = 'boolean') {
    return validateEnum(value, [0, 1], fieldName);
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 验证字符串长度
 * @param {string} value - 字符串值
 * @param {number} minLength - 最小长度
 * @param {number} maxLength - 最大长度
 * @param {string} fieldName - 字段名称
 * @returns {boolean} 是否有效
 */
export function validateLength(value, minLength, maxLength, fieldName) {
    if (typeof value !== 'string') {
        return false;
    }

    const length = value.trim().length;
    return length >= minLength && length <= maxLength;
}

/**
 * 创建参数验证中间件
 * @param {object} validations - 验证规则对象
 * @returns {function} Express中间件函数
 */
export function createValidationMiddleware(validations) {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(validations)) {
            let value;

            // 获取字段值
            if (rules.source === 'params') {
                value = req.params[field];
            } else if (rules.source === 'query') {
                value = req.query[field];
            } else {
                value = req.body[field];
            }

            // 必需验证
            if (rules.required && !validateRequired(value, field)) {
                errors.push(`${field}不能为空`);
                continue;
            }

            // 如果字段是可选的且为空，跳过其他验证
            if (!rules.required && !validateRequired(value, field)) {
                continue;
            }

            // 类型转换
            if (rules.type === 'number') {
                value = Number(value);
                if (isNaN(value)) {
                    errors.push(`${field}必须是数字`);
                    continue;
                }
            } else if (rules.type === 'id') {
                value = validateId(value, field);
                if (value === null) {
                    errors.push(`${field}无效`);
                    continue;
                }
            }

            // 枚举验证
            if (rules.enum && !validateEnum(value, rules.enum, field)) {
                errors.push(`${field}必须是以下值之一: ${rules.enum.join(', ')}`);
                continue;
            }

            // 范围验证
            if (rules.min !== undefined || rules.max !== undefined) {
                const min = rules.min !== undefined ? rules.min : Number.MIN_SAFE_INTEGER;
                const max = rules.max !== undefined ? rules.max : Number.MAX_SAFE_INTEGER;
                if (!validateRange(value, min, max, field)) {
                    errors.push(`${field}必须在${min}-${max}之间`);
                    continue;
                }
            }

            // 长度验证
            if (rules.minLength !== undefined || rules.maxLength !== undefined) {
                const minLength = rules.minLength || 0;
                const maxLength = rules.maxLength || Number.MAX_SAFE_INTEGER;
                if (!validateLength(value, minLength, maxLength, field)) {
                    errors.push(`${field}长度必须在${minLength}-${maxLength}之间`);
                    continue;
                }
            }

            // 自定义验证
            if (rules.custom && typeof rules.custom === 'function') {
                const customResult = rules.custom(value);
                if (customResult !== true) {
                    errors.push(typeof customResult === 'string' ? customResult : `${field}验证失败`);
                    continue;
                }
            }

            // 将处理后的值放回请求对象
            if (rules.source === 'params') {
                req.params[field] = value;
            } else if (rules.source === 'query') {
                req.query[field] = value;
            } else {
                req.body[field] = value;
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                code: 400,
                message: errors.join('; ')
            });
        }

        next();
    };
}
