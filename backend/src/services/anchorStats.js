import { queryOne, queryAll, insert, update } from '../method/database.js';
import { getRoomInfo, getGuardLevelStats, getFansMembersRank } from './bilibili.js';
import { createSuccessResponse, createErrorResponse } from '../method/business-utils.js';

/**
 * 主播统计服务 - 处理粉丝数、舰长数、粉丝团成员数等数据的记录和查询
 */

/**
 * 获取当天的0点时间戳（秒级）
 * @returns {number} 当天0点的Unix时间戳（秒）
 */
function getTodayStartTimestamp() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 1000;
}

/**
 * 获取指定日期范围的开始和结束时间戳
 * @param {string} range - 时间范围：'week'(1周), 'month'(1月), 'year'(1年)
 * @returns {object} {startTime, endTime} 秒级时间戳
 */
function getDateRange(range) {
    const now = new Date();
    const endTime = Math.floor(now.getTime() / 1000);
    let startTime;

    switch (range) {
        case 'week':
            // 7天前
            startTime = endTime - (7 * 24 * 60 * 60);
            break;
        case 'month':
            // 30天前
            startTime = endTime - (30 * 24 * 60 * 60);
            break;
        case 'year':
            // 365天前
            startTime = endTime - (365 * 24 * 60 * 60);
            break;
        default:
            // 默认30天
            startTime = endTime - (30 * 24 * 60 * 60);
    }

    return { startTime, endTime };
}

/**
 * 从B站API获取当前粉丝数、舰长数（含总督、提督、舰长细分）和粉丝团成员数
 * @returns {Promise<object>} {fansCount, captainCount, commanderCount, viceCommanderCount, fansMemberCount}
 */
export async function fetchCurrentStatsFromBilibili() {
    try {
        // 获取房间信息（包含粉丝数）
        const roomInfo = await getRoomInfo();
        const fansCount = roomInfo?.data?.attention || 0;

        // 获取大航海等级统计（总督、提督、舰长）
        const guardStats = await getGuardLevelStats();
        const captainCount = guardStats.captainCount;
        const commanderCount = guardStats.commanderCount;
        const viceCommanderCount = guardStats.viceCommanderCount;

        // 获取粉丝团成员数
        const fansMembersData = await getFansMembersRank();
        const fansMemberCount = fansMembersData?.data?.num || 0;

        return {
            fansCount,
            captainCount,
            commanderCount,
            viceCommanderCount,
            fansMemberCount
        };
    } catch (error) {
        logger.error('从B站获取统计数据失败:', error);
        throw error;
    }
}

/**
 * 记录当天的统计数据
 * 如果当天已有记录则更新，否则插入新记录
 * @returns {Promise<object>} 操作结果
 */
export async function recordDailyStats() {
    try {
        const todayStart = getTodayStartTimestamp();

        // 从B站获取当前数据
        const stats = await fetchCurrentStatsFromBilibili();

        // 检查今天是否已有记录
        const existingRecord = queryOne(
            'SELECT id FROM anchor_stats WHERE record_date = ?',
            [todayStart]
        );

        if (existingRecord) {
            // 更新现有记录
            update(
                `UPDATE anchor_stats 
                 SET fans_count = ?, captain_count = ?, commander_count = ?, vice_commander_count = ?, fans_member_count = ?
                 WHERE record_date = ?`,
                [stats.fansCount, stats.captainCount, stats.commanderCount, stats.viceCommanderCount, stats.fansMemberCount, todayStart]
            );
            logger.info(`更新主播统计数据: 粉丝${stats.fansCount}, 舰长${stats.captainCount}, 总督${stats.commanderCount}, 提督${stats.viceCommanderCount}, 日期${new Date(todayStart * 1000).toLocaleDateString()}`);
        } else {
            // 插入新记录
            insert(
                `INSERT INTO anchor_stats (record_date, fans_count, captain_count, commander_count, vice_commander_count, fans_member_count) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [todayStart, stats.fansCount, stats.captainCount, stats.commanderCount, stats.viceCommanderCount, stats.fansMemberCount]
            );
            logger.info(`记录主播统计数据: 粉丝${stats.fansCount}, 舰长${stats.captainCount}, 总督${stats.commanderCount}, 提督${stats.viceCommanderCount}, 日期${new Date(todayStart * 1000).toLocaleDateString()}`);
        }

        return createSuccessResponse('记录统计数据成功', stats);
    } catch (error) {
        logger.error('记录每日统计数据失败:', error);
        return createErrorResponse('记录统计数据失败: ' + error.message);
    }
}

/**
 * 获取指定时间范围内的统计数据
 * @param {string} range - 时间范围：'week'(1周), 'month'(1月), 'year'(1年)
 * @returns {Promise<object>} 统计数据列表
 */
export async function getStatsByRange(range = 'month') {
    try {
        const { startTime, endTime } = getDateRange(range);

        const stats = queryAll(
            `SELECT 
                record_date,
                fans_count,
                captain_count,
                commander_count,
                vice_commander_count,
                fans_member_count,
                create_time
            FROM anchor_stats 
            WHERE record_date >= ? AND record_date <= ?
            ORDER BY record_date ASC`,
            [startTime, endTime]
        );

        // 格式化数据，将秒级时间戳转为日期字符串
        const formattedStats = stats.map(item => ({
            date: new Date(item.record_date * 1000).toLocaleDateString('zh-CN'),
            timestamp: item.record_date * 1000,
            fansCount: item.fans_count,
            captainCount: item.captain_count,
            commanderCount: item.commander_count,
            viceCommanderCount: item.vice_commander_count,
            fansMemberCount: item.fans_member_count
        }));

        // 计算本月最高舰长数（总督+提督+舰长）
        let maxCaptainCount = 0;
        if (formattedStats.length > 0) {
            maxCaptainCount = Math.max(...formattedStats.map(item => 
                (item.commanderCount || 0) + (item.viceCommanderCount || 0) + (item.captainCount || 0)
            ));
        }

        return createSuccessResponse('获取统计数据成功', {
            range,
            startDate: new Date(startTime * 1000).toLocaleDateString('zh-CN'),
            endDate: new Date(endTime * 1000).toLocaleDateString('zh-CN'),
            maxCaptainCount,
            data: formattedStats
        });
    } catch (error) {
        logger.error('获取统计数据失败:', error);
        return createErrorResponse('获取统计数据失败: ' + error.message);
    }
}

/**
 * 获取最新的统计数据（用于首页展示）
 * @returns {Promise<object>} 最新统计数据
 */
export async function getLatestStats() {
    try {
        const latest = queryOne(
            `SELECT 
                record_date,
                fans_count,
                captain_count,
                commander_count,
                vice_commander_count,
                fans_member_count
            FROM anchor_stats 
            ORDER BY record_date DESC 
            LIMIT 1`
        );

        if (!latest) {
            return createSuccessResponse('暂无历史数据', null);
        }

        return createSuccessResponse('获取最新统计数据成功', {
            date: new Date(latest.record_date * 1000).toLocaleDateString('zh-CN'),
            fansCount: latest.fans_count,
            captainCount: latest.captain_count,
            commanderCount: latest.commander_count,
            viceCommanderCount: latest.vice_commander_count,
            fansMemberCount: latest.fans_member_count
        });
    } catch (error) {
        logger.error('获取最新统计数据失败:', error);
        return createErrorResponse('获取最新统计数据失败: ' + error.message);
    }
}

/**
 * 获取本月最高舰长数（从本月1号到当前日期）
 * 计算总督 + 提督 + 舰长的总和最大值
 * @returns {Promise<object>} 本月最高舰长数
 */
export async function getCurrentMonthMaxCaptainCount() {
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11

        // 本月1号0点时间戳（秒级）
        const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0).getTime() / 1000;
        // 当前时间戳（秒级）
        const monthEnd = Math.floor(now.getTime() / 1000);

        // 使用SQL直接查询本月最高舰长数（总督+提督+舰长）
        const result = queryOne(
            `SELECT 
                MAX(commander_count + vice_commander_count + captain_count) as max_captain_count,
                COUNT(*) as record_count
            FROM anchor_stats 
            WHERE record_date >= ? AND record_date <= ?`,
            [monthStart, monthEnd]
        );

        const maxCaptainCount = result?.max_captain_count || 0;
        const recordCount = result?.record_count || 0;

        return createSuccessResponse('获取本月最高舰长数成功', {
            year: currentYear,
            month: currentMonth + 1, // 转换为1-12
            maxCaptainCount,
            recordCount,
            startDate: new Date(monthStart * 1000).toLocaleDateString('zh-CN'),
            endDate: new Date(monthEnd * 1000).toLocaleDateString('zh-CN')
        });
    } catch (error) {
        logger.error('获取本月最高舰长数失败:', error);
        return createErrorResponse('获取本月最高舰长数失败: ' + error.message);
    }
}
