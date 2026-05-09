import { recordDailyStats } from '../services/anchorStats.js';

/**
 * 主播统计数据定时任务
 * 每天凌晨4点执行，记录当天的粉丝数和舰长数
 * 
 * cron表达式说明:
 * '0 4 * * *' = 每天凌晨4:00执行
 * 格式: 分钟 小时 日期 月份 星期
 */

// 重试配置
const MAX_RETRIES = 5;
const RETRY_DELAY = 30000; // 30秒

// 任务执行锁，防止重复执行
let isRunning = false;
let taskStartTime = 0;
const TASK_TIMEOUT = 10 * 60 * 1000; // 10分钟超时，超过则认为任务卡住

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 执行记录任务（带重试）
 */
async function executeWithRetry(attempt = 1) {
    logger.info(`[主播统计] 第 ${attempt}/${MAX_RETRIES} 次尝试记录数据...`);

    try {
        const result = await recordDailyStats();

        if (result.success) {
            logger.info('[主播统计] 数据记录成功:', result.data);
            return { success: true, data: result.data };
        } else {
            throw new Error(result.message || '记录失败');
        }
    } catch (error) {
        logger.error(`[主播统计] 第 ${attempt} 次尝试失败:`, error.message);

        if (attempt < MAX_RETRIES) {
            logger.info(`[主播统计] ${RETRY_DELAY / 1000} 秒后重试...`);
            await delay(RETRY_DELAY);
            return executeWithRetry(attempt + 1);
        } else {
            logger.error(`[主播统计] 已达到最大重试次数 (${MAX_RETRIES})，放弃记录`);
            throw error;
        }
    }
}

export default {
    // 每天凌晨4点执行
    // cron: '*/30 * * * * *',
    cron: '0 4 * * *',

    // 任务描述
    description: '记录主播每日粉丝数和舰长数',

    // 任务执行函数
    task: async () => {
        // 检查是否正在执行，防止重复执行
        // 但如果任务执行超过超时时间，则允许重新执行（可能卡住了）
        if (isRunning) {
            const elapsed = Date.now() - taskStartTime;
            if (elapsed < TASK_TIMEOUT) {
                logger.warn(`[主播统计] 任务正在执行中（已执行 ${Math.floor(elapsed / 1000)} 秒），跳过本次执行`);
                return;
            } else {
                logger.warn(`[主播统计] 任务执行超过 ${TASK_TIMEOUT / 60000} 分钟，可能已卡住，强制重新执行`);
            }
        }

        isRunning = true;
        taskStartTime = Date.now();
        logger.info('========== 开始执行主播统计数据记录任务 ==========');

        try {
            const result = await executeWithRetry();
            logger.info('[主播统计] 任务执行成功:', result.data);
        } catch (error) {
            logger.error('[主播统计] 任务最终执行失败:', error.message);
            // 可以在这里添加通知管理员的逻辑
        } finally {
            isRunning = false;
            taskStartTime = 0;
            logger.info('========== 主播统计数据记录任务执行完毕 ==========');
        }
    }
};
