import {
    syncFansToRedis,
    getAllBilibiliBoundUsers,
    updateUserFanInfo,
    getFanInfoFromRedis
} from '../services/bilibiliFans.js';
import { queryOne } from '../method/database.js';

const logger = global.logger;

/**
 * B站粉丝信息定时同步任务
 *
 * 功能：
 * 1. 每天凌晨3点同步主播的粉丝列表到Redis
 * 2. 异步处理所有绑定用户的粉丝信息更新
 * 3. 防止风控：每次API调用有1-3秒随机延时
 *
 * 执行策略：
 * - 先同步主播的粉丝列表到Redis（一次性遍历所有粉丝）
 * - 然后批量更新所有绑定用户的数据库记录
 */

/**
 * 获取配置中的主播UID
 * @returns {string|null} 主播UID
 */
function getAnchorRuid() {
    try {
        const config = global.appConfig;
        // 优先使用bilibili.userId作为主播UID
        if (config?.bilibili?.userId) {
            return config.bilibili.userId.toString();
        }
        return null;
    } catch (error) {
        logger.error('[粉丝同步] 获取主播UID失败:', error);
        return null;
    }
}

/**
 * 同步所有绑定用户的粉丝信息
 * @param {string} ruid - 主播UID
 * @param {Array} users - 绑定用户列表
 */
async function syncAllUsersFanInfo(ruid, users) {
    logger.info(`[粉丝同步] 开始更新 ${users.length} 位用户的粉丝牌信息...`);

    let successCount = 0;
    let failCount = 0;
    let extinguishedCount = 0;
    let notFoundCount = 0;

    for (const user of users) {
        try {
            const fanInfo = await getFanInfoFromRedis(ruid, user.bilibili_uid);

            if (fanInfo) {
                // 在粉丝列表中，粉丝牌正常，更新数据库
                await updateUserFanInfo(user.id, fanInfo, false);
                successCount++;
            } else {
                // 不在粉丝列表中
                // 检查用户之前是否有数据
                const userRecord = queryOne(
                    `SELECT fan_level, captain_type FROM user WHERE id = ?`,
                    [user.id]
                );

                if (userRecord && userRecord.fan_level > 0) {
                    // 之前有数据，标记为熄灭状态，保留历史等级
                    await updateUserFanInfo(user.id, {
                        level: userRecord.fan_level,
                        guardLevel: userRecord.captain_type
                    }, true);
                    logger.debug(`[粉丝同步] 用户 ${user.id} 粉丝牌已熄灭`);
                    extinguishedCount++;
                } else {
                    // 之前没有数据，设置为0（从未有过粉丝牌）
                    await updateUserFanInfo(user.id, { level: 0, guardLevel: 0 }, false);
                    notFoundCount++;
                }
            }
        } catch (error) {
            logger.error(`[粉丝同步] 用户 ${user.id} 更新失败: ${error.message}`);
            failCount++;
        }
    }

    logger.info(`[粉丝同步] 用户更新完成: 正常 ${successCount} 人, 熄灭 ${extinguishedCount} 人, 无牌 ${notFoundCount} 人, 失败 ${failCount} 人`);
}

/**
 * 执行粉丝信息同步任务
 */
async function runFansSyncTask() {
    const startTime = Date.now();
    logger.info('[粉丝同步] 开始执行粉丝牌信息同步任务');

    try {
        // 1. 获取主播UID
        const ruid = getAnchorRuid();
        if (!ruid) {
            logger.error('[粉丝同步] 未配置主播UID，跳过任务');
            return;
        }
        logger.info(`[粉丝同步] 主播UID: ${ruid}`);

        // 2. 获取所有绑定B站的用户
        const users = await getAllBilibiliBoundUsers();
        logger.info(`[粉丝同步] 当前共有 ${users.length} 位用户绑定了B站账号`);

        // 3. 同步主播的粉丝列表到Redis（核心步骤，带延时防风控）
        logger.info('[粉丝同步] 正在同步粉丝列表到缓存...');
        const syncResult = await syncFansToRedis(ruid);

        if (!syncResult.success) {
            logger.error('[粉丝同步] 同步粉丝列表失败，任务中断');
            return;
        }

        logger.info(`[粉丝同步] 粉丝列表已同步，共 ${syncResult.count} 人`);

        // 4. 更新所有绑定用户的数据库记录
        await syncAllUsersFanInfo(ruid, users);

        const duration = (Date.now() - startTime) / 1000;
        logger.info(`[粉丝同步] 任务完成，耗时 ${duration.toFixed(2)} 秒`);

    } catch (error) {
        logger.error('[粉丝同步] 任务执行失败:', error);
        throw error;
    }
}

/**
 * 定时任务配置
 * cron: 每天凌晨3:00执行
 * 格式: 秒 分 时 日 月 周
 */
export default {
    // 每天凌晨3:00执行
    // cron: '0 0 15 * * *',
    cron: '0 0 3 * * *',
    task: runFansSyncTask
};
