/**
 * 安全中间件 - 防护扫描攻击和敏感文件访问
 */

// 敏感路径列表（攻击者常扫描的路径）
const SENSITIVE_PATHS = [
    // 密钥文件
    /\.key$/i,
    /\.pem$/i,
    /id_rsa/i,
    /id_ed25519/i,
    /private/i,
    /server\.crt/i,
    // 数据库文件
    /\.sql$/i,
    /\.db$/i,
    /\.sqlite/i,
    // 配置文件
    /\.env/i,
    /\.npmrc/i,
    /\.aws/i,
    /\.ssh/i,
    /wp-config/i,
    /composer\.lock/i,
    // 版本控制
    /\.git/i,
    /\.svn/i,
    // 服务器状态
    /server-status/i,
    /actuator/i,
    /phpinfo/i,
    /admin\.php/i,
    /xmlrpc\.php/i,
    // 备份文件
    /backup/i,
    /dump/i,
    /\.bak$/i,
    /\.old$/i,
    /\.swp$/i,
    // 其他敏感文件
    /config\.yaml/i,
    /config\.json/i,
    /\.htaccess/i,
    /\.htpasswd/i,
];

// 可疑 IP 记录（内存缓存，重启后清空）
const suspiciousIPs = new Map();

// 清理过期记录（每小时）
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of suspiciousIPs.entries()) {
        if (now - data.lastTime > 3600000) { // 1小时过期
            suspiciousIPs.delete(ip);
        }
    }
}, 3600000);

/**
 * 检查路径是否敏感
 */
function isSensitivePath(path) {
    const lowerPath = path.toLowerCase();
    return SENSITIVE_PATHS.some(pattern => pattern.test(lowerPath));
}

/**
 * 获取客户端 IP
 */
function getClientIP(req) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || req.connection.remoteAddress;
}

/**
 * 记录可疑行为
 */
function recordSuspiciousBehavior(ip, path) {
    const now = Date.now();
    const data = suspiciousIPs.get(ip) || { count: 0, lastTime: now, paths: [] };
    data.count++;
    data.lastTime = now;
    data.lastPath = path;
    data.paths.push({ path, time: now });
    suspiciousIPs.set(ip, data);

    // 每次访问都记录日志
    logger.warn(`[安全拦截] IP ${ip} 尝试访问敏感路径: ${path} (累计: ${data.count}次)`);
}

/**
 * 安全中间件
 */
export function securityMiddleware(req, res, next) {
    const path = req.path || req.url;
    const clientIP = getClientIP(req);

    // 检查是否是敏感路径
    if (isSensitivePath(path)) {
        recordSuspiciousBehavior(clientIP, path);

        // 直接返回 404，不暴露任何信息
        return res.status(404).end();
    }

    next();
}

/**
 * 获取可疑 IP 列表（用于管理后台查看）
 */
export function getSuspiciousIPs() {
    const result = [];
    for (const [ip, data] of suspiciousIPs.entries()) {
        result.push({
            ip,
            count: data.count,
            lastTime: new Date(data.lastTime).toISOString(),
            lastPath: data.lastPath
        });
    }
    return result.sort((a, b) => b.count - a.count);
}
