import { queryOne, queryAll } from '../method/database.js';
import { createSuccessResponse, getCurrentTimestamp } from '../method/business-utils.js';

/**
 * 获取仪表盘统计数据
 * @returns {object} 统计数据
 */
export async function getDashboardStats() {
    try {
        const now = getCurrentTimestamp();
        const todayStart = now - (now % 86400);
        const weekStart = todayStart - (new Date().getDay() * 86400);
        const monthStart = new Date(new Date().setDate(1)).setHours(0, 0, 0, 0) / 1000;

        // 用户统计
        const userStats = queryOne(`
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN create_time >= ? THEN 1 ELSE 0 END) as today_new,
                SUM(CASE WHEN create_time >= ? THEN 1 ELSE 0 END) as week_new,
                SUM(CASE WHEN create_time >= ? THEN 1 ELSE 0 END) as month_new
            FROM user WHERE is_deleted = 0
        `, [todayStart, weekStart, monthStart]);

        // 待审核统计 (is_review = 0 表示待审核)
        const pendingAudio = queryOne(`SELECT COUNT(*) as count FROM audio WHERE is_deleted = 0 AND is_review = 0`);
        const pendingAlbum = queryOne(`SELECT COUNT(*) as count FROM photo_album WHERE is_deleted = 0 AND is_review = 0`);
        const pendingPhoto = queryOne(`SELECT COUNT(*) as count FROM photo WHERE is_deleted = 0 AND is_review = 0`);

        // 音声/相册统计
        const audioClassification = queryOne(`SELECT COUNT(*) as count FROM audio_classification WHERE is_deleted = 0`);
        const audioCount = queryOne(`SELECT COUNT(*) as count FROM audio WHERE is_deleted = 0`);
        const albumCount = queryOne(`SELECT COUNT(*) as count FROM photo_album WHERE is_deleted = 0`);
        const photoCount = queryOne(`SELECT COUNT(*) as count FROM photo WHERE is_deleted = 0`);

        // 公告统计
        const announcementCount = queryOne(`SELECT COUNT(*) as count FROM announcement WHERE is_deleted = 0`);

        // 企划文档统计
        const planDocCount = queryOne(`SELECT COUNT(*) as count FROM plan_document WHERE deleted = 0`);

        // 直播时长统计
        const liveStats = queryOne(`
            SELECT
                COUNT(*) as total_streams,
                SUM(CASE WHEN end_time IS NOT NULL THEN (end_time - start_time) ELSE 0 END) as total_duration,
                SUM(CASE WHEN end_time IS NULL THEN 1 ELSE 0 END) as live_now
            FROM live_duration
        `);

        // 格式化直播时长（小时）
        const totalHours = liveStats.total_duration ? Math.floor(liveStats.total_duration / 3600000) : 0;

        return createSuccessResponse('获取仪表盘数据成功', {
            users: {
                total: userStats.total,
                todayNew: userStats.today_new,
                weekNew: userStats.week_new,
                monthNew: userStats.month_new
            },
            pending: {
                audio: pendingAudio.count,
                album: pendingAlbum.count,
                photo: pendingPhoto.count,
                total: pendingAudio.count + pendingAlbum.count + pendingPhoto.count
            },
            contents: {
                audioClassification: audioClassification.count,
                audio: audioCount.count,
                album: albumCount.count,
                photo: photoCount.count
            },
            announcements: announcementCount.count,
            planDocuments: planDocCount.count,
            liveStream: {
                totalStreams: liveStats.total_streams,
                totalHours: totalHours,
                isLive: liveStats.live_now > 0
            }
        });

    } catch (error) {
        logger.error('获取仪表盘数据失败:', error);
        return {
            success: false,
            message: '获取仪��盘数据失败',
            code: 500
        };
    }
}
