import { recordDailyStats } from '../services/anchorStats.js';

/**
 * 主播统计数据定时任务
 * 每天凌晨4点执行，记录当天的粉丝数和舰长数
 * 
 * cron表达式说明:
 * '0 4 * * *' = 每天凌晨4:00执行
 * 格式: 分钟 小时 日期 月份 星期
 */

export default {
    // 每天凌晨4点执行
    // cron: '*/30 * * * * *',
    cron: '0 4 * * *',
    
    // 任务描述
    description: '记录主播每日粉丝数和舰长数',
    
    // 任务执行函数
    task: () => {
        logger.info('========== 开始执行主播统计数据记录任务 ==========');

        // 使用 setImmediate 让任务在事件循环的下一个 tick 执行，避免阻塞 cron
        setImmediate(async () => {
            try {
                const result = await recordDailyStats();
                if (result.success) {
                    logger.info('主播统计数据记录成功:', result.data);
                } else {
                    logger.error('主播统计数据记录失败:', result.message);
                }
            } catch (error) {
                logger.error('主播统计数据定时任务执行异常:', error);
            }
            logger.info('========== 主播统计数据记录任务执行完毕 ==========');
        });
    }
};
