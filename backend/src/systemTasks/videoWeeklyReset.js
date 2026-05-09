import { update } from '../method/database.js';

/**
 * 视频收藏夹每周推荐数据重置任务
 * 每周一 00:00 执行
 * 1. 将Redis中的推荐数据持久化到数据库（备份）
 * 2. 清空Redis中的本周推荐数据
 * 3. 清空数据库中的本周推荐记录
 */

// 任务执行锁，防止重复执行
let isRunning = false;
let taskStartTime = 0;
const TASK_TIMEOUT = 10 * 60 * 1000; // 10分钟超时

const VIDEO_WEEKLY_RECOMMEND_KEY = 'video:weekly:recommend';
const VIDEO_USER_RECOMMEND_KEY = 'video:user:recommend';

/**
 * 获取本周开始时间戳
 * @returns {number} 本周一0点的Unix时间戳
 */
function getWeekStartTimestamp() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return Math.floor(monday.getTime() / 1000);
}

/**
 * 获取上周开始时间戳
 * @returns {number} 上周一0点的Unix时间戳
 */
function getLastWeekStartTimestamp() {
    return getWeekStartTimestamp() - 7 * 24 * 3600;
}

/**
 * 持久化上周推荐数据到数据库
 */
async function persistLastWeekData() {
    try {
        const lastWeekStart = getLastWeekStartTimestamp();
        const recommendKey = `${VIDEO_WEEKLY_RECOMMEND_KEY}:${lastWeekStart}`;

        // 从Redis获取上周的推荐数据
        const recommendData = await global.redis.hgetall(recommendKey);

        if (!recommendData || Object.keys(recommendData).length === 0) {
            logger.info('上周没有推荐数据需要持久化');
            return;
        }

        // 更新数据库中的总推荐数
        for (const [videoId, count] of Object.entries(recommendData)) {
            const countNum = parseInt(count) || 0;
            if (countNum > 0) {
                update(
                    'UPDATE video_favorite SET total_recommend = total_recommend + ? WHERE id = ?',
                    [countNum, videoId]
                );
            }
        }

        logger.info(`上周推荐数据已持久化，共 ${Object.keys(recommendData).length} 个视频`);
    } catch (error) {
        logger.error('持久化上周推荐数据失败:', error);
        throw error;
    }
}

/**
 * 清空Redis中的过期数据
 */
async function cleanRedisData() {
    try {
        const lastWeekStart = getLastWeekStartTimestamp();
        const recommendKey = `${VIDEO_WEEKLY_RECOMMEND_KEY}:${lastWeekStart}`;
        const userRecommendKey = `${VIDEO_USER_RECOMMEND_KEY}:${lastWeekStart}`;

        // 删除上周的推荐数据
        await global.redis.del(recommendKey);
        await global.redis.del(userRecommendKey);

        logger.info('Redis上周推荐数据已清空');
    } catch (error) {
        logger.error('清空Redis数据失败:', error);
        throw error;
    }
}

/**
 * 清空数据库中的本周推荐记录
 */
async function cleanDatabaseRecords() {
    try {
        const lastWeekStart = getLastWeekStartTimestamp();

        // 删除上周的推荐记录
        const result = update(
            'DELETE FROM video_weekly_recommend WHERE week_start = ?',
            [lastWeekStart]
        );

        logger.info(`数据库上周推荐记录已清空，影响行数: ${result?.changes || 0}`);
    } catch (error) {
        logger.error('清空数据库记录失败:', error);
        throw error;
    }
}

/**
 * 执行每周重置任务
 */
async function runWeeklyReset() {
    // 检查是否正在执行，防止重复执行
    // 但如果任务执行超过超时时间，则允许重新执行（可能卡住了）
    if (isRunning) {
        const elapsed = Date.now() - taskStartTime;
        if (elapsed < TASK_TIMEOUT) {
            logger.warn(`[每周重置] 任务正在执行中（已执行 ${Math.floor(elapsed / 1000)} 秒），跳过本次执行`);
            return;
        } else {
            logger.warn(`[每周重置] 任务执行超过 ${TASK_TIMEOUT / 60000} 分钟，可能已卡住，强制重新执行`);
        }
    }

    isRunning = true;
    taskStartTime = Date.now();
    logger.info('========== 开始执行视频收藏夹每周重置任务 ==========');

    try {
        // 1. 持久化上周数据
        await persistLastWeekData();

        // 2. 清空Redis数据
        await cleanRedisData();

        // 3. 清空数据库记录
        await cleanDatabaseRecords();

        logger.info('========== 视频收藏夹每周重置任务完成 ==========');
    } catch (error) {
        logger.error('视频收藏夹每周重置任务失败:', error);
        throw error;
    } finally {
        isRunning = false;
        taskStartTime = 0;
    }
}

/**
 * 定时任务配置
 * cron: 每周一 00:00 执行
 * task: 执行的任务函数
 */
export default {
    // 每周一 00:00 执行
    cron: '0 0 * * 1',
    task: runWeeklyReset
};
