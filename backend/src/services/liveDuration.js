import { queryAll } from '../method/database.js';

/**
 * 获取指定月份的直播记录
 * @param {string} month - 月份，格式：YYYY-MM，不传则获取当前月
 * @returns {Promise<object>} 直播记录列表和统计信息
 */
export async function getLiveDurationByMonth(month) {
    try {
        // 处理月份参数
        let targetMonth = month;
        if (!targetMonth) {
            const now = new Date();
            targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        // 验证月份格式
        const monthRegex = /^\d{4}-\d{2}$/;
        if (!monthRegex.test(targetMonth)) {
            return {
                success: false,
                code: 400,
                message: '月份格式错误，请使用 YYYY-MM 格式'
            };
        }

        // 计算月份的开始和结束时间戳
        const [year, monthNum] = targetMonth.split('-').map(Number);
        const startOfMonth = new Date(year, monthNum - 1, 1).getTime();
        const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999).getTime();

        // 查询该月份的直播记录
        // 条件：直播开始时间在当月内，或者跨月的直播（开始时间在当月前，结束时间在当月后或进行中）
        const records = queryAll(
            `SELECT 
                id,
                start_time as startTime,
                end_time as endTime,
                title,
                create_time as createTime,
                update_time as updateTime
            FROM live_duration 
            WHERE 
                -- 直播开始时间在当月内
                (start_time >= ? AND start_time <= ?)
                OR 
                -- 跨月直播：开始时间在当月前，且（结束时间在当月后或未结束）
                (start_time < ? AND (end_time IS NULL OR end_time > ?))
            ORDER BY start_time ASC`,
            [startOfMonth, endOfMonth, startOfMonth, startOfMonth]
        );

        // 处理数据格式 - 返回前端需要的简洁格式
        const formattedRecords = records.map(record => {
            return {
                startTime: record.startTime,
                endTime: record.endTime,
                title: record.title
            };
        });

        return {
            success: true,
            message: '获取成功',
            data: formattedRecords
        };
    } catch (error) {
        logger.error('获取直播记录失败:', error);
        return {
            success: false,
            code: 500,
            message: '获取直播记录失败: ' + error.message
        };
    }
}
