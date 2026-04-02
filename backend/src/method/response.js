export function sendSuccess(res, result, statusCode = 200) {
    const code = result.code || statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(code).json({
        code: code,
        message: result.message,
        data: result.data
    });
}

export function sendError(res, code, message) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(code).json({
        code: code,
        message: message
    });
}

export function handleServiceResult(res, result, defaultErrorCode = 500) {
    if (!result.success) {
        return sendError(res, result.code || defaultErrorCode, result.message);
    }

    return sendSuccess(res, result);
}

export function sendParamError(res, message) {
    return sendError(res, 400, message);
}

export function sendPermissionError(res, message) {
    return sendError(res, 403, message);
}

export function sendNotFoundError(res, message) {
    return sendError(res, 404, message);
}
