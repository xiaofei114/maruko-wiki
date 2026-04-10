import { queryOne, queryAll } from '../method/database.js';

/**
 * 日志服务 - 处理日志查询相关业务逻辑
 */

/**
 * 添加操作日志
 * @param {object} params - 日志参数
 * @param {string} params.logType - 日志类型
 * @param {string} params.logName - 日志名称
 * @param {string} params.logContent - 日志内容
 * @param {string} params.userName - 用户名
 * @param {string} params.userIp - 用户IP
 * @param {any} params.logReturn - 返回值
 */
export function addLog({ logType, logName, logContent, userName, userIp, logReturn }) {
    try {
        const stmt = global.db.prepare(`
            INSERT INTO logs (log_type, log_name, log_content, log_return, user_name, user_ip)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(logType, logName, logContent, logReturn ? JSON.stringify(logReturn) : '', userName || '', userIp || '');
    } catch (error) {
        logger.error('记录日志失败:', error);
    }
}

/**
 * 查询日志列表（分页）
 * @param {object} params - 查询参数
 * @param {number} params.page - 当前页码，默认1
 * @param {number} params.pageSize - 每页数量，默认10
 * @param {boolean} params.showUserIp - 是否显示用户IP，默认false
 * @returns {object} 日志列表和分页信息
 */
export async function getQueryLogs({ page = 1, pageSize = 10, showUserIp = false }) {
    try {
        // 参数校验
        page = Number(page) || 1;
        pageSize = Number(pageSize) || 10;

        if (page < 1 || pageSize < 1) {
            return {
                success: false,
                message: '分页参数不合法',
                code: 400
            };
        }

        // 动态字段选择
        const fields = [
            'id',
            'log_type',
            'log_name',
            'log_content',
            'log_return',
            'user_name',
            'created_at',
            ...(showUserIp === true || showUserIp === 'true' ? ['user_ip'] : [])
        ];

        // 计算总数
        const totalResult = queryOne(`SELECT COUNT(*) AS total FROM logs`);
        const total = totalResult ? totalResult.total : 0;

        // 分页查询
        const offset = (page - 1) * pageSize;
        const data = queryAll(`
            SELECT ${fields.join(',')}
            FROM logs
            ORDER BY id DESC
            LIMIT ? OFFSET ?
        `, [pageSize, offset]);

        // 计算分页元数据
        const totalPages = Math.ceil(total / pageSize);

        return {
            success: true,
            message: '获取日志列表成功',
            data: {
                pagination: {
                    total,
                    totalPages,
                    currentPage: page,
                    pageSize,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                },
                data: data
            }
        };
    } catch (error) {
        logger.error('查询日志失败:', error);
        return {
            success: false,
            message: error.message || '查询日志失败',
            code: 500
        };
    }
}

export default {
    get: {
        getQueryLogs
    }
};
