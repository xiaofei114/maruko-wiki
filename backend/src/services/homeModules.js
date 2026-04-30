import { queryOne, queryAll } from '../method/database.js';
import { fileExists } from '../method/file-utils.js';

const logger = global.logger;

/**
 * 获取首页功能模块数据
 * 聚合相簿、音声、企划、视频的展示数据
 * @returns {object} 各模块展示数据
 */
export async function getHomeModulesData() {
    try {
        const result = {
            photo: null,
            audio: null,
            plan: null,
            video: null
        };

        // 1. 获取最新相片
        const latestPhoto = queryOne(`
            SELECT p.id, p.name, p.url, pa.name as album_name
            FROM photo p
            LEFT JOIN photo_album pa ON p.album_id = pa.id
            WHERE p.is_deleted = 0 AND p.is_review = 1
            AND pa.is_deleted = 0 AND pa.is_review = 1
            ORDER BY p.create_time DESC
            LIMIT 1
        `);

        if (latestPhoto) {
            result.photo = {
                id: latestPhoto.id,
                title: latestPhoto.name,
                url: `/api/file/${latestPhoto.url}`,
                albumName: latestPhoto.album_name
            };
        }

        // 2. 获取本周最热音声（按7天播放量）
        const audioSetKey = 'audio:all_ids';
        let hotAudio = null;
        
        try {
            // 获取所有音频ID
            const allAudioIds = await global.redis.smembers(audioSetKey);
            
            if (allAudioIds && allAudioIds.length > 0) {
                // 计算每个音频最近7天的播放量
                const audioScores = [];
                const now = new Date();
                
                for (const audioIdStr of allAudioIds) {
                    const audioId = parseInt(audioIdStr);
                    let weeklyCount = 0;
                    
                    // 获取最近7天的播放量
                    for (let i = 0; i < 7; i++) {
                        const date = new Date(now);
                        date.setDate(date.getDate() - i);
                        const dateStr = date.toISOString().split('T')[0];
                        const key = `audio:daily:${audioId}:${dateStr}`;
                        const count = await global.redis.get(key);
                        weeklyCount += parseInt(count || '0');
                    }
                    
                    if (weeklyCount > 0) {
                        audioScores.push({ id: audioId, weeklyPlays: weeklyCount });
                    }
                }
                
                // 按播放量排序，取第一个
                if (audioScores.length > 0) {
                    audioScores.sort((a, b) => b.weeklyPlays - a.weeklyPlays);
                    const topAudioId = audioScores[0].id;
                    
                    // 获取音频详细信息
                    const audio = queryOne(`
                        SELECT a.id, a.name, a.url
                        FROM audio a
                        WHERE a.id = ? AND a.is_deleted = 0 AND a.is_review = 1
                    `, [topAudioId]);
                    
                    if (audio) {
                        hotAudio = {
                            id: audio.id,
                            title: audio.name,
                            cover: `/api/file/${audio.url}`
                        };
                    }
                }
            }
        } catch (error) {
            logger.warn('获取热门音声失败:', error);
        }
        
        // 如果没有播放量数据，取最新的一个
        if (!hotAudio) {
            const latestAudio = queryOne(`
                SELECT a.id, a.name, a.url
                FROM audio a
                WHERE a.is_deleted = 0 AND a.is_review = 1
                ORDER BY a.create_time DESC
                LIMIT 1
            `);
            
            if (latestAudio) {
                hotAudio = {
                    id: latestAudio.id,
                    title: latestAudio.name,
                    cover: `/api/file/${latestAudio.url}`
                };
            }
        }
        
        result.audio = hotAudio;

        // 3. 获取当前企划
        const currentPlan = queryOne(`
            SELECT id, title, file_path, file_name
            FROM plan_document
            WHERE is_current = 1 AND deleted = 0 AND is_review = 1
            LIMIT 1
        `);

        if (currentPlan) {
            result.plan = {
                id: currentPlan.id,
                title: currentPlan.title,
                filePath: currentPlan.file_path,
                fileName: currentPlan.file_name
            };
        }

        // 4. 获取本周最热视频（按总推荐数）
        const hotVideo = queryOne(`
            SELECT v.id, v.title, v.cover_local, v.bvid
            FROM video_favorite v
            WHERE v.is_deleted = 0 AND v.is_review = 1
            ORDER BY v.total_recommend DESC, v.create_time DESC
            LIMIT 1
        `);

        if (hotVideo) {
            result.video = {
                id: hotVideo.id,
                title: hotVideo.title,
                cover: hotVideo.cover_local ? `/api/file/${hotVideo.cover_local}` : '',
                bvid: hotVideo.bvid
            };
        }

        logger.info('获取首页模块数据成功');

        return {
            success: true,
            message: '获取首页模块数据成功',
            data: result
        };

    } catch (error) {
        logger.error('获取首页模块数据失败:', error);
        return {
            success: false,
            message: '获取首页模块数据失败',
            code: 500
        };
    }
}
