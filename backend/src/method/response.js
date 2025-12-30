/**
 * 统一的响应处理方法
 */

/**
 * 发送成功响应
 * @param {object} res - Express响应对象
 * @param {object} result - 服务层返回的结果
 * @param {number} statusCode - HTTP状态码，默认为200
 */
export function sendSuccess(res, result, statusCode = 200) {
    return res.status(statusCode).json({
        code: statusCode,
        message: result.message,
        data: result.data
    });
}

/**
 * 发送错误响应
 * @param {object} res - Express响应对象
 * @param {number} code - 错误码
 * @param {string} message - 错误消息
 */
export function sendError(res, code, message) {
    return res.status(code).json({
        code: code,
        message: message
    });
}

/**
 * 处理服务层结果并发送响应
 * @param {object} res - Express响应对象
 * @param {object} result - 服务层返回的结果
 * @param {number} defaultErrorCode - 默认错误码，默认为500
 */
export function handleServiceResult(res, result, defaultErrorCode = 500) {
    if (!result.success) {
        return sendError(res, result.code || defaultErrorCode, result.message);
    }

    return sendSuccess(res, result);
}

/**
 * 发送参数错误响应
 * @param {object} res - Express响应对象
 * @param {string} message - 参数错误消息
 */
export function sendParamError(res, message) {
    return sendError(res, 400, message);
}

/**
 * 发送权限错误响应
 * @param {object} res - Express响应对象
 * @param {string} message - 权限错误消息
 */
export function sendPermissionError(res, message) {
    return sendError(res, 403, message);
}

/**
 * 发送未找到错误响应
 * @param {object} res - Express响应对象
 * @param {string} message - 未找到错误消息
 */
export function sendNotFoundError(res, message) {
    return sendError(res, 404, message);
}
