import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { handleServiceResult, sendError } from './response.js';
import { optionalAuth, authenticateToken, requirePermission } from './auth.js';
import { validateId, validateRequired, validateEnum, validateRange, validateLength } from './validation.js';

/**
 * 创建标准路由处理包装器
 * @param {function} serviceFunction - 服务层函数
 * @param {number} defaultErrorCode - 默认错误码
 * @returns {function} Express路由处理函数
 */
export function createRouteHandler(serviceFunction, defaultErrorCode = 500) {
    return async (req, res) => {
        try {
            // 服务函数通常只需要 req 参数
            const result = await serviceFunction(req);
            return handleServiceResult(res, result, defaultErrorCode);
        } catch (error) {
            logger.error('路由处理错误:', error);
            return sendError(res, 500, '服务器内部错误');
        }
    };
}

/**
 * 创建带参数验证的路由处理包装器
 * @param {object} validations - 验证规则
 * @param {function} serviceFunction - 服务层函数
 * @param {number} defaultErrorCode - 默认错误码
 * @returns {function} Express中间件数组
 */
export function createValidatedRouteHandler(validations, serviceFunction, defaultErrorCode = 500) {
    return [
        (req, res, next) => {
            // 简单的参数验证逻辑
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
        },
        createRouteHandler(serviceFunction, defaultErrorCode)
    ];
}

/**
 * 创建文件上传中间件
 * @param {object} config - 上传配置
 * @param {string} config.destination - 文件保存目录
 * @param {number} config.maxSize - 最大文件大小（字节）
 * @param {Array} config.allowedTypes - 允许的文件类型
 * @param {Array} config.allowedExtensions - 允许的文件扩展名
 * @returns {function} multer中间件
 */
export function createUploadMiddleware(config) {
    const {
        destination,
        maxSize = 10 * 1024 * 1024, // 默认10MB
        allowedTypes = [],
        allowedExtensions = []
    } = config;

    // 确保目录存在
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, destination);
        },
        filename: (req, file, cb) => {
            const uniqueName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
            cb(null, uniqueName);
        }
    });

    const multerInstance = multer({
        storage,
        limits: {
            fileSize: maxSize
        },
        fileFilter: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();

            // 检查文件类型
            if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
                return cb(new Error(`只允许上传${allowedTypes.join('、')}格式的文件`), false);
            }

            // 检查文件扩展名
            if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
                return cb(new Error(`只允许上传${allowedExtensions.join('、')}格式的文件`), false);
            }

            cb(null, true);
        }
    });

    return multerInstance;
}

/**
 * 创建带文件上传的路由处理包装器
 * @param {object} uploadConfig - 上传配置
 * @param {string} fieldName - 表单字段名
 * @param {function} serviceFunction - 服务层函数
 * @returns {Array} Express中间件数组
 */
export function createUploadRouteHandler(uploadConfig, fieldName, serviceFunction) {
    const upload = createUploadMiddleware(uploadConfig);

    return [
        (req, res, next) => {
            upload.single(fieldName)(req, res, (err) => {
                if (err) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        const maxSizeMB = Math.round(uploadConfig.maxSize / (1024 * 1024));
                        return sendError(res, 400, `文件过大，最大支持${maxSizeMB}MB`);
                    }
                    return sendError(res, 400, '文件上传失败: ' + err.message);
                }
                next();
            });
        },
        createRouteHandler(serviceFunction)
    ];
}

/**
 * 创建带认证和文件上传的管理接口路由处理包装器
 * @param {object} uploadConfig - 上传配置
 * @param {string} fieldName - 表单字段名
 * @param {function} serviceFunction - 服务层函数
 * @param {number} requiredPermission - 需要的权限级别
 * @returns {Array} Express中间件数组
 */
export function createAdminUploadRouteHandler(uploadConfig, fieldName, serviceFunction, requiredPermission = 3) {
    const upload = createUploadMiddleware(uploadConfig);

    return [
        authenticateToken,
        requirePermission(requiredPermission),
        (req, res, next) => {
            upload.single(fieldName)(req, res, (err) => {
                if (err) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        const maxSizeMB = Math.round(uploadConfig.maxSize / (1024 * 1024));
                        return sendError(res, 400, `文件过大，最大支持${maxSizeMB}MB`);
                    }
                    return sendError(res, 400, '文件上传失败: ' + err.message);
                }
                next();
            });
        },
        createRouteHandler(serviceFunction)
    ];
}

/**
 * 创建简单的CRUD路由处理包装器
 * @param {object} options - 配置选项
 * @param {function} options.getAll - 获取所有数据的服务函数
 * @param {function} options.getById - 根据ID获取数据的服务函数
 * @param {function} options.create - 创建数据的服务函数
 * @param {function} options.update - 更新数据的服务函数
 * @param {function} options.delete - 删除数据的服务函数
 * @returns {object} 路由处理函数对象
 */
export function createCrudHandlers(options) {
    const { getAll, getById, create, update, remove } = options;

    return {
        getAll: getAll ? createRouteHandler(getAll) : null,
        getById: getById ? (req, res) => {
            const id = parseInt(req.params.id);
            return createRouteHandler(() => getById(id))(req, res);
        } : null,
        create: create ? createRouteHandler(create) : null,
        update: update ? (req, res) => {
            const id = parseInt(req.params.id);
            const data = req.body;
            return createRouteHandler(() => update(id, data, req.user?.id))(req, res);
        } : null,
        delete: remove ? (req, res) => {
            const id = parseInt(req.params.id);
            return createRouteHandler(() => remove(id, req.user?.id))(req, res);
        } : null
    };
}

/**
 * 创建管理接口的路由处理包装器
 * @param {function} serviceFunction - 服务函数
 * @param {number} requiredPermission - 需要的权限级别
 * @returns {Array} 中间件数组 [authenticateToken, requirePermission, handler]
 */
export function createAdminRoute(serviceFunction, requiredPermission = 2) {
    return [
        authenticateToken,
        requirePermission(requiredPermission),
        createRouteHandler(serviceFunction)
    ];
}

/**
 * 创建带认证和参数验证的管理接口路由处理包装器
 * @param {object} validations - 验证规则
 * @param {function} serviceFunction - 服务层函数
 * @param {number} requiredPermission - 需要的权限级别
 * @param {number} defaultErrorCode - 默认错误码
 * @returns {function} Express中间件数组
 */
export function createAdminValidatedRouteHandler(validations, serviceFunction, requiredPermission = 2, defaultErrorCode = 500) {
    return [
        authenticateToken,
        requirePermission(requiredPermission),
        (req, res, next) => {
            // 简单的参数验证逻辑
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
        },
        createRouteHandler(serviceFunction, defaultErrorCode)
    ];
}

/**
 * 创建公共接口的路由处理包装器（可选认证）
 * @param {function} serviceFunction - 服务函数
 * @returns {Array} 中间件数组 [optionalAuth, handler]
 */
export function createPublicRoute(serviceFunction) {
    return [
        optionalAuth,
        createRouteHandler(serviceFunction)
    ];
}

/**
 * 创建认证接口的路由处理包装器
 * @param {function} serviceFunction - 服务函数
 * @returns {Array} 中间件数组 [authenticateToken, handler]
 */
export function createAuthRoute(serviceFunction) {
    return [
        authenticateToken,
        createRouteHandler(serviceFunction)
    ];
}
