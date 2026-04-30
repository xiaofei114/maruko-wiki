import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { fileExists, ensureDirectory } from '../method/file-utils.js';
import { queryOne, queryAll, insert, update, remove } from '../method/database.js';
import { createNotification, notifyAdminsForReview } from '../method/notification.js';
import { createSuccessResponse, createErrorResponse, getCurrentTimestamp } from '../method/business-utils.js';

/**
 * 视频收藏夹服务 - 处理B站视频收藏和推荐相关的业务逻辑
 * 参考相簿设计：收藏夹类似于相册，视频类似于照片
 */

const VIDEO_COVER_DIR = 'video_cover';

/**
 * 获取本周开始时间（周一0点）
 * @returns {number} Unix时间戳（秒）
 */
function getWeekStartTimestamp() {
    const now = new Date();
    const day = now.getDay(); // 0是周日，1-6是周一到周六
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return Math.floor(monday.getTime() / 1000);
}

/**
 * 获取Redis键名
 * @param {string} type - 键类型
 * @param {number} weekStart - 周开始时间
 * @returns {string} Redis键名
 */
function getRedisKey(type, weekStart) {
    return `video_favorite:${type}:${weekStart}`;
}

/**
 * 从B站获取视频信息
 * @param {string} bvid - 视频BV号
 * @returns {Promise<object>} 视频信息
 */
async function getBilibiliVideoInfo(bvid) {
    try {
        const response = await axios({
            method: 'GET',
            url: 'https://api.bilibili.com/x/web-interface/view',
            params: { bvid },
            timeout: 10000,
            validateStatus: () => true,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.bilibili.com'
            }
        });

        if (response.data?.code !== 0) {
            throw new Error(response.data?.message || '获取视频信息失败');
        }

        const data = response.data.data;
        return {
            bvid: data.bvid,
            title: data.title,
            coverUrl: data.pic,
            uploaderName: data.owner?.name || ''
        };
    } catch (error) {
        logger.error('获取B站视频信息失败:', error);
        throw error;
    }
}

/**
 * 下载视频封面到本地
 * @param {string} coverUrl - 封面URL
 * @param {string} bvid - 视频BV号
 * @returns {Promise<string>} 本地文件路径
 */
async function downloadCover(coverUrl, bvid) {
    try {
        // 使用相对路径创建目录
        ensureDirectory(VIDEO_COVER_DIR);

        // 从URL获取文件扩展名
        const urlObj = new URL(coverUrl);
        const ext = path.extname(urlObj.pathname) || '.jpg';
        const filename = `${bvid}${ext}`;
        const localPath = path.join(VIDEO_COVER_DIR, filename);
        const fullPath = path.join(process.cwd(), 'data', 'document', VIDEO_COVER_DIR, filename);

        // 如果文件已存在，直接返回
        if (fs.existsSync(fullPath)) {
            return localPath;
        }

        // 下载封面
        const response = await axios({
            method: 'GET',
            url: coverUrl,
            responseType: 'stream',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.bilibili.com'
            }
        });

        const writer = fs.createWriteStream(fullPath);
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        logger.info(`视频封面下载成功: ${bvid} -> ${localPath}`);
        return localPath;
    } catch (error) {
        logger.error('下载视频封面失败:', error);
        // 下载失败不影响主流程，返回空字符串
        return '';
    }
}

// ==================== 收藏夹管理 ====================

/**
 * 获取单个收藏夹详情
 * @param {number} favoriteId - 收藏夹ID
 * @returns {Promise<object>} 收藏夹详情
 */
export async function getFavoriteDetail(favoriteId) {
    try {
        const favorite = queryOne(
            `SELECT
                f.id, f.name, f.description, f.is_public, f.create_time,
                u.name as user_name
            FROM favorite f
            LEFT JOIN user u ON f.user_id = u.id
            WHERE f.id = ? AND f.is_deleted = 0`,
            [favoriteId]
        );

        if (!favorite) {
            return createErrorResponse('收藏夹不存在');
        }

        const videoCount = queryOne(
            'SELECT COUNT(*) as count FROM video_favorite WHERE favorite_id = ? AND is_deleted = 0',
            [favoriteId]
        );

        const latestCover = queryOne(
            `SELECT cover_local FROM video_favorite
            WHERE favorite_id = ? AND is_deleted = 0
            ORDER BY create_time DESC LIMIT 1`,
            [favoriteId]
        );

        return createSuccessResponse('获取收藏夹详情成功', {
            id: favorite.id,
            name: favorite.name,
            description: favorite.description || '',
            isPublic: favorite.is_public,
            userName: favorite.user_name,
            videoCount: videoCount?.count || 0,
            cover: latestCover?.cover_local && fileExists(latestCover.cover_local)
                ? `/api/file/${latestCover.cover_local}`
                : '',
            createTime: favorite.create_time
        });
    } catch (error) {
        logger.error('获取收藏夹详情失败:', error);
        return createErrorResponse('获取收藏夹详情失败');
    }
}

/**
 * 获取收藏夹列表（带最新视频封面和视频数量）
 * @returns {Promise<object>} 收藏夹列表数据
 */
export async function getFavoriteList() {
    try {
        // 使用子查询一次性获取所有收藏夹数据（包括视频数量和最新视频封面）
        const favorites = queryAll(`
            SELECT
                f.id,
                f.name,
                f.description,
                f.create_time,
                u.name as user_name,
                -- 视频数量子查询（包含所有未删除视频）
                (
                    SELECT COUNT(*)
                    FROM video_favorite vf
                    WHERE vf.favorite_id = f.id AND vf.is_deleted = 0
                ) as video_count,
                -- 最新视频封面子查询（包含所有未删除视频）
                (
                    SELECT vf.cover_local
                    FROM video_favorite vf
                    WHERE vf.favorite_id = f.id AND vf.is_deleted = 0
                    ORDER BY vf.create_time DESC
                    LIMIT 1
                ) as latest_video_cover
            FROM favorite f
            LEFT JOIN user u ON f.user_id = u.id
            WHERE f.is_deleted = 0 AND f.is_public = 1
            ORDER BY f.create_time DESC
        `);

        // 处理收藏夹数据
        const processedFavorites = favorites.map(favorite => {
            let cover = '';
            if (favorite.latest_video_cover && fileExists(favorite.latest_video_cover)) {
                cover = `/api/file/${favorite.latest_video_cover}`;
            }

            return {
                id: favorite.id,
                name: favorite.name,
                description: favorite.description || '',
                userName: favorite.user_name,
                videoCount: favorite.video_count || 0,
                cover: cover,
                createTime: favorite.create_time
            };
        });

        // 获取最新的24个视频（跨收藏夹）
        const latestVideos = queryAll(`
            SELECT
                vf.id,
                vf.favorite_id,
                vf.bvid,
                vf.title,
                vf.cover_local,
                f.name as favorite_name
            FROM video_favorite vf
            LEFT JOIN favorite f ON vf.favorite_id = f.id
            WHERE vf.is_deleted = 0 AND vf.is_review = 1
            AND (f.is_deleted = 0 OR f.id IS NULL)
            ORDER BY vf.create_time DESC
            LIMIT 24
        `);

        const processedLatestVideos = latestVideos
            .filter(video => fileExists(video.cover_local))
            .map(video => ({
                id: video.id,
                favoriteId: video.favorite_id,
                bvid: video.bvid,
                title: video.title,
                cover: `/api/file/${video.cover_local}`,
                favoriteName: video.favorite_name || '默认收藏夹'
            }));

        return createSuccessResponse('获取收藏夹列表成功', {
            favorites: processedFavorites,
            latestVideos: processedLatestVideos
        });
    } catch (error) {
        logger.error('获取收藏夹列表失败:', error);
        return createErrorResponse('获取收藏夹列表失败');
    }
}

/**
 * 创建收藏夹
 * @param {object} favoriteData - 收藏夹数据
 * @param {number} userId - 创建用户ID
 * @returns {Promise<object>} 创建结果
 */
export async function createFavorite(favoriteData, userId) {
    try {
        const { name, description = '', isPublic = 1 } = favoriteData;

        if (!name || name.trim().length === 0) {
            return createErrorResponse('收藏夹名称不能为空');
        }

        if (name.trim().length > 100) {
            return createErrorResponse('收藏夹名称不能超过100个字符');
        }

        if (description && description.length > 500) {
            return createErrorResponse('收藏夹描述不能超过500个字符');
        }

        // 检查同名收藏夹
        const existing = queryOne(
            'SELECT id FROM favorite WHERE name = ? AND user_id = ? AND is_deleted = 0',
            [name.trim(), userId]
        );

        if (existing) {
            return createErrorResponse('您已创建过同名收藏夹');
        }

        const result = insert(
            'INSERT INTO favorite (name, description, user_id, is_public) VALUES (?, ?, ?, ?)',
            [name.trim(), description.trim(), userId, isPublic]
        );

        return createSuccessResponse('收藏夹创建成功', { id: result.lastInsertRowid });
    } catch (error) {
        logger.error('创建收藏夹失败:', error);
        return createErrorResponse('创建收藏夹失败');
    }
}

/**
 * 更新收藏夹
 * @param {number} favoriteId - 收藏夹ID
 * @param {object} favoriteData - 收藏夹数据
 * @param {number} userId - 操作用户ID
 * @param {boolean} isAdmin - 是否是管理员
 * @returns {Promise<object>} 更新结果
 */
export async function updateFavorite(favoriteId, favoriteData, userId, isAdmin = false) {
    try {
        const { name, description, isPublic } = favoriteData;

        const favorite = queryOne(
            'SELECT id, user_id FROM favorite WHERE id = ? AND is_deleted = 0',
            [favoriteId]
        );

        if (!favorite) {
            return createErrorResponse('收藏夹不存在');
        }

        // 只有创建者或管理员可以修改
        if (!isAdmin && favorite.user_id !== userId) {
            return createErrorResponse('无权修改该收藏夹');
        }

        const updates = [];
        const params = [];

        if (name !== undefined) {
            if (name.trim().length === 0) {
                return createErrorResponse('收藏夹名称不能为空');
            }
            if (name.trim().length > 100) {
                return createErrorResponse('收藏夹名称不能超过100个字符');
            }
            updates.push('name = ?');
            params.push(name.trim());
        }

        if (description !== undefined) {
            if (description.length > 500) {
                return createErrorResponse('收藏夹描述不能超过500个字符');
            }
            updates.push('description = ?');
            params.push(description.trim());
        }

        if (isPublic !== undefined) {
            updates.push('is_public = ?');
            params.push(isPublic);
        }

        if (updates.length === 0) {
            return createErrorResponse('没有要更新的内容');
        }

        params.push(getCurrentTimestamp(), favoriteId);

        update(
            `UPDATE favorite SET ${updates.join(', ')}, update_time = ? WHERE id = ?`,
            params
        );

        return createSuccessResponse('收藏夹更新成功');
    } catch (error) {
        logger.error('更新收藏夹失败:', error);
        return createErrorResponse('更新收藏夹失败');
    }
}

/**
 * 删除收藏夹（软删除）
 * @param {number} favoriteId - 收藏夹ID
 * @param {number} userId - 操作用户ID
 * @param {boolean} isAdmin - 是否是管理员
 * @returns {Promise<object>} 删除结果
 */
export async function deleteFavorite(favoriteId, userId, isAdmin = false) {
    try {
        const favorite = queryOne(
            'SELECT id, user_id FROM favorite WHERE id = ? AND is_deleted = 0',
            [favoriteId]
        );

        if (!favorite) {
            return createErrorResponse('收藏夹不存在');
        }

        // 只有创建者或管理员可以删除
        if (!isAdmin && favorite.user_id !== userId) {
            return createErrorResponse('无权删除该收藏夹');
        }

        update(
            'UPDATE favorite SET is_deleted = 1, update_time = ? WHERE id = ?',
            [getCurrentTimestamp(), favoriteId]
        );

        // 将收藏夹下的视频移到默认（favorite_id设为NULL）
        update(
            'UPDATE video_favorite SET favorite_id = NULL, update_time = ? WHERE favorite_id = ?',
            [getCurrentTimestamp(), favoriteId]
        );

        return createSuccessResponse('收藏夹删除成功');
    } catch (error) {
        logger.error('删除收藏夹失败:', error);
        return createErrorResponse('删除收藏夹失败');
    }
}

/**
 * 获取用户的收藏夹列表（用于上传时选择）
 * @param {number} userId - 用户ID
 * @returns {Promise<object>} 收藏夹列表
 */
export async function getUserFavorites(userId) {
    try {
        const favorites = queryAll(
            `SELECT id, name, description, is_public,
                (SELECT COUNT(*) FROM video_favorite WHERE favorite_id = f.id AND is_deleted = 0 AND is_review = 1) as video_count
            FROM favorite f
            WHERE f.user_id = ? AND f.is_deleted = 0
            ORDER BY f.create_time DESC`,
            [userId]
        );

        return createSuccessResponse('获取用户收藏夹成功', favorites.map(f => ({
            id: f.id,
            name: f.name,
            description: f.description,
            isPublic: f.is_public,
            videoCount: f.video_count
        })));
    } catch (error) {
        logger.error('获取用户收藏夹失败:', error);
        return createErrorResponse('获取用户收藏夹失败');
    }
}

// ==================== 视频管理 ====================

/**
 * 上传视频到收藏夹
 * @param {string} bvid - 视频BV号
 * @param {number} favoriteId - 收藏夹ID（可选，为空则放入默认）
 * @param {number} userId - 上传用户ID
 * @param {number} userPermission - 用户权限（1-管理员，2-超级管理员）
 * @returns {Promise<object>} 上传结果
 */
export async function uploadVideo(bvid, favoriteId, userId, userPermission = 0) {
    try {
        // 检查是否为管理员（管理员上传自动通过审核）
        const isAdmin = userPermission === 1 || userPermission === 2;
        const reviewStatus = isAdmin ? 1 : 0;

        // 如果指定了收藏夹，检查收藏夹是否存在且属于该用户
        if (favoriteId) {
            const favorite = queryOne(
                'SELECT id, user_id FROM favorite WHERE id = ? AND is_deleted = 0',
                [favoriteId]
            );
            if (!favorite) {
                return createErrorResponse('收藏夹不存在');
            }
            // 只能上传到自己的收藏夹（管理员可以上传到任意收藏夹）
            if (!isAdmin && favorite.user_id !== userId) {
                return createErrorResponse('无权上传到该收藏夹');
            }
        }

        // 检查视频是否已存在
        const existingVideo = queryOne(
            'SELECT id, is_deleted FROM video_favorite WHERE bvid = ?',
            [bvid]
        );

        if (existingVideo) {
            if (existingVideo.is_deleted === 0) {
                return createErrorResponse('该视频已经存在于收藏夹中');
            }
            // 如果已删除，恢复并更新信息
            const videoInfo = await getBilibiliVideoInfo(bvid);
            const localCover = await downloadCover(videoInfo.coverUrl, bvid);

            update(
                `UPDATE video_favorite SET
                    title = ?, cover_url = ?, cover_local = ?, uploader_name = ?,
                    favorite_id = ?, user_id = ?, is_deleted = 0, is_review = ?, update_time = ?
                WHERE bvid = ?`,
                [videoInfo.title, videoInfo.coverUrl, localCover, videoInfo.uploaderName,
                 favoriteId || null, userId, reviewStatus, getCurrentTimestamp(), bvid]
            );
        } else {
            // 获取视频信息
            const videoInfo = await getBilibiliVideoInfo(bvid);
            const localCover = await downloadCover(videoInfo.coverUrl, bvid);

            // 插入数据库
            insert(
                `INSERT INTO video_favorite (bvid, title, cover_url, cover_local, uploader_name, user_id, favorite_id, is_review)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [bvid, videoInfo.title, videoInfo.coverUrl, localCover, videoInfo.uploaderName, userId, favoriteId || null, reviewStatus]
            );
        }

        // 非管理员上传才需要通知管理员审核
        if (!isAdmin) {
            await notifyAdminsForReview('video_favorite', bvid);
            return createSuccessResponse('视频上传成功，等待审核');
        }

        return createSuccessResponse('视频上传成功');
    } catch (error) {
        logger.error('上传视频失败:', error);
        return createErrorResponse(error.message || '上传视频失败');
    }
}

/**
 * 获取收藏夹下的视频列表
 * @param {number} favoriteId - 收藏夹ID（为空则获取所有）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<object>} 视频列表
 */
export async function getVideoList(favoriteId = null, page = 1, pageSize = 20) {
    try {
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE vf.is_deleted = 0 AND vf.is_review = 1';
        let params = [];

        if (favoriteId) {
            // 检查收藏夹是否存在
            const favorite = queryOne(
                'SELECT id, name FROM favorite WHERE id = ? AND is_deleted = 0',
                [favoriteId]
            );
            if (!favorite) {
                return createErrorResponse('收藏夹不存在');
            }
            whereClause += ' AND vf.favorite_id = ?';
            params.push(favoriteId);
        }

        const videos = queryAll(
            `SELECT
                vf.id, vf.bvid, vf.title, vf.cover_local, vf.uploader_name,
                vf.total_recommend, vf.is_review, u.name as user_name, vf.create_time,
                f.name as favorite_name, f.id as favorite_id
            FROM video_favorite vf
            LEFT JOIN user u ON vf.user_id = u.id
            LEFT JOIN favorite f ON vf.favorite_id = f.id
            ${whereClause}
            ORDER BY vf.create_time DESC
            LIMIT ? OFFSET ?`,
            [...params, pageSize, offset]
        );

        const countResult = queryOne(
            `SELECT COUNT(*) as count FROM video_favorite vf ${whereClause}`,
            params
        );

        // 获取本周推荐数（从Redis）
        const weekStart = getWeekStartTimestamp();
        const videosWithRecommend = await Promise.all(videos.map(async (video) => {
            const recommendKey = getRedisKey('recommend_count', weekStart);
            const weeklyRecommend = await global.redis.hget(recommendKey, video.id.toString()) || 0;

            return {
                id: video.id,
                bvid: video.bvid,
                title: video.title,
                cover: video.cover_local ? `/api/file/${video.cover_local}` : '',
                uploaderName: video.uploader_name,
                userName: video.user_name,
                favoriteName: video.favorite_name,
                favoriteId: video.favorite_id,
                isReview: video.is_review,
                totalRecommend: video.total_recommend,
                weeklyRecommend: parseInt(weeklyRecommend),
                createTime: video.create_time
            };
        }));

        return createSuccessResponse('获取视频列表成功', {
            list: videosWithRecommend,
            total: countResult.count,
            page,
            pageSize
        });
    } catch (error) {
        logger.error('获取视频列表失败:', error);
        return createErrorResponse('获取视频列表失败');
    }
}

/**
 * 获取管理员视频列表（包含所有审核状态）
 * @param {number} favoriteId - 收藏夹ID（可选）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<object>} 视频列表
 */
export async function getAdminVideoList(favoriteId = null, page = 1, pageSize = 20) {
    try {
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE vf.is_deleted = 0';
        let params = [];

        if (favoriteId) {
            const favorite = queryOne(
                'SELECT id, name FROM favorite WHERE id = ? AND is_deleted = 0',
                [favoriteId]
            );
            if (!favorite) {
                return createErrorResponse('收藏夹不存在');
            }
            whereClause += ' AND vf.favorite_id = ?';
            params.push(favoriteId);
        }

        const videos = queryAll(
            `SELECT
                vf.id, vf.bvid, vf.title, vf.cover_local, vf.uploader_name,
                vf.total_recommend, vf.is_review, u.name as user_name, vf.create_time,
                f.name as favorite_name, f.id as favorite_id
            FROM video_favorite vf
            LEFT JOIN user u ON vf.user_id = u.id
            LEFT JOIN favorite f ON vf.favorite_id = f.id
            ${whereClause}
            ORDER BY vf.create_time DESC
            LIMIT ? OFFSET ?`,
            [...params, pageSize, offset]
        );

        const countResult = queryOne(
            `SELECT COUNT(*) as count FROM video_favorite vf ${whereClause}`,
            params
        );

        const weekStart = getWeekStartTimestamp();
        const videosWithRecommend = await Promise.all(videos.map(async (video) => {
            const recommendKey = getRedisKey('recommend_count', weekStart);
            const weeklyRecommend = await global.redis.hget(recommendKey, video.id.toString()) || 0;

            return {
                id: video.id,
                bvid: video.bvid,
                title: video.title,
                cover: video.cover_local ? `/api/file/${video.cover_local}` : '',
                uploaderName: video.uploader_name,
                userName: video.user_name,
                favoriteName: video.favorite_name,
                favoriteId: video.favorite_id,
                isReview: video.is_review,
                totalRecommend: video.total_recommend,
                weeklyRecommend: parseInt(weeklyRecommend),
                createTime: video.create_time
            };
        }));

        return createSuccessResponse('获取视频列表成功', {
            list: videosWithRecommend,
            total: countResult.count,
            page,
            pageSize
        });
    } catch (error) {
        logger.error('获取管理员视频列表失败:', error);
        return createErrorResponse('获取视频列表失败');
    }
}

/**
 * 获取本周推荐排行榜
 * @param {number} limit - 返回数量
 * @returns {Promise<object>} 排行榜数据
 */
export async function getWeeklyTopVideos(limit = 10) {
    try {
        const weekStart = getWeekStartTimestamp();
        const recommendKey = getRedisKey('recommend_count', weekStart);

        // 从Redis获取本周推荐数排序
        const recommendData = await global.redis.hgetall(recommendKey);
        const sortedVideos = Object.entries(recommendData)
            .map(([videoId, count]) => ({ videoId: parseInt(videoId), count: parseInt(count) }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);

        if (sortedVideos.length === 0) {
            return createSuccessResponse('获取排行榜成功', []);
        }

        // 获取视频详情
        const videoIds = sortedVideos.map(v => v.videoId).join(',');
        const videos = queryAll(
            `SELECT id, bvid, title, cover_local, uploader_name
            FROM video_favorite
            WHERE id IN (${videoIds}) AND is_deleted = 0 AND is_review = 1`
        );

        // 合并数据
        const result = sortedVideos.map(sorted => {
            const video = videos.find(v => v.id === sorted.videoId);
            if (!video) return null;
            return {
                id: video.id,
                bvid: video.bvid,
                title: video.title,
                cover: video.cover_local ? `/api/file/${video.cover_local}` : '',
                uploaderName: video.uploader_name,
                weeklyRecommend: sorted.count
            };
        }).filter(Boolean);

        return createSuccessResponse('获取排行榜成功', result);
    } catch (error) {
        logger.error('获取排行榜失败:', error);
        return createErrorResponse('获取排行榜失败');
    }
}

/**
 * 推荐视频
 * @param {number} videoId - 视频ID
 * @param {number} userId - 用户ID
 * @returns {Promise<object>} 推荐结果
 */
export async function recommendVideo(videoId, userId) {
    try {
        // 检查视频是否存在且已审核通过
        const video = queryOne(
            'SELECT id, is_review, is_deleted FROM video_favorite WHERE id = ?',
            [videoId]
        );

        if (!video || video.is_deleted === 1) {
            return createErrorResponse('视频不存在');
        }

        if (video.is_review !== 1) {
            return createErrorResponse('视频尚未审核通过');
        }

        const weekStart = getWeekStartTimestamp();

        // 检查用户本周是否已推荐过该视频
        const userRecommendKey = getRedisKey('user_recommend', weekStart);
        const userRecommendField = `${userId}:${videoId}`;
        const hasRecommended = await global.redis.hexists(userRecommendKey, userRecommendField);

        if (hasRecommended) {
            return createErrorResponse('您本周已经推荐过该视频了');
        }

        // 记录用户推荐（Redis）
        await global.redis.hset(userRecommendKey, userRecommendField, '1');
        // 设置过期时间（到下周自动过期）
        const expireTime = (weekStart + 7 * 24 * 3600) - getCurrentTimestamp();
        await global.redis.expire(userRecommendKey, expireTime);

        // 增加视频本周推荐数（Redis）
        const recommendKey = getRedisKey('recommend_count', weekStart);
        await global.redis.hincrby(recommendKey, videoId.toString(), 1);
        await global.redis.expire(recommendKey, expireTime);

        // 增加总推荐数（数据库）
        update(
            'UPDATE video_favorite SET total_recommend = total_recommend + 1 WHERE id = ?',
            [videoId]
        );

        // 持久化到数据库（备份）
        insert(
            'INSERT OR IGNORE INTO video_weekly_recommend (video_id, user_id, week_start) VALUES (?, ?, ?)',
            [videoId, userId, weekStart]
        );

        return createSuccessResponse('推荐成功');
    } catch (error) {
        logger.error('推荐视频失败:', error);
        return createErrorResponse('推荐失败');
    }
}

/**
 * 检查用户本周是否已推荐过某视频
 * @param {number} videoId - 视频ID
 * @param {number} userId - 用户ID
 * @returns {Promise<boolean>} 是否已推荐
 */
export async function hasUserRecommended(videoId, userId) {
    const weekStart = getWeekStartTimestamp();
    const userRecommendKey = getRedisKey('user_recommend', weekStart);
    const userRecommendField = `${userId}:${videoId}`;
    const result = await global.redis.hexists(userRecommendKey, userRecommendField);
    return result === 1;
}

/**
 * 获取待审核视频列表（管理员用）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<object>} 待审核列表
 */
export async function getPendingVideos(page = 1, pageSize = 20) {
    try {
        const offset = (page - 1) * pageSize;

        const videos = queryAll(
            `SELECT
                vf.id, vf.bvid, vf.title, vf.cover_local, vf.uploader_name,
                u.name as user_name, vf.create_time, f.name as favorite_name
            FROM video_favorite vf
            LEFT JOIN user u ON vf.user_id = u.id
            LEFT JOIN favorite f ON vf.favorite_id = f.id
            WHERE vf.is_deleted = 0 AND vf.is_review = 0
            ORDER BY vf.create_time DESC
            LIMIT ? OFFSET ?`,
            [pageSize, offset]
        );

        const total = queryOne(
            'SELECT COUNT(*) as count FROM video_favorite WHERE is_deleted = 0 AND is_review = 0'
        );

        const processedVideos = videos.map(video => ({
            id: video.id,
            bvid: video.bvid,
            title: video.title,
            cover: video.cover_local ? `/api/file/${video.cover_local}` : '',
            uploaderName: video.uploader_name,
            userName: video.user_name,
            favoriteName: video.favorite_name,
            createTime: video.create_time
        }));

        return createSuccessResponse('获取待审核列表成功', {
            list: processedVideos,
            total: total.count,
            page,
            pageSize
        });
    } catch (error) {
        logger.error('获取待审核列表失败:', error);
        return createErrorResponse('获取待审核列表失败');
    }
}

/**
 * 审核视频
 * @param {number} videoId - 视频ID
 * @param {number} status - 审核状态：1-通过，2-拒绝
 * @param {number} adminId - 管理员ID
 * @returns {Promise<object>} 审核结果
 */
export async function reviewVideo(videoId, status, adminId) {
    try {
        const video = queryOne(
            'SELECT id, user_id, title, is_review FROM video_favorite WHERE id = ? AND is_deleted = 0',
            [videoId]
        );

        if (!video) {
            return createErrorResponse('视频不存在');
        }

        if (video.is_review !== 0) {
            return createErrorResponse('该视频已经审核过了');
        }

        update(
            'UPDATE video_favorite SET is_review = ?, update_time = ? WHERE id = ?',
            [status, getCurrentTimestamp(), videoId]
        );

        // 发送通知给用户
        const message = status === 1
            ? `您上传的视频"${video.title}"已通过审核`
            : `您上传的视频"${video.title}"未通过审核`;

        await createNotification(video.user_id, '视频审核通知', message, 'review');

        return createSuccessResponse(status === 1 ? '审核通过' : '已拒绝');
    } catch (error) {
        logger.error('审核视频失败:', error);
        return createErrorResponse('审核失败');
    }
}

/**
 * 删除视频（软删除）
 * @param {number} videoId - 视频ID
 * @param {number} userId - 操作用户ID
 * @param {boolean} isAdmin - 是否是管理员
 * @returns {Promise<object>} 删除结果
 */
export async function deleteVideo(videoId, userId, isAdmin = false) {
    try {
        const video = queryOne(
            'SELECT id, user_id, title FROM video_favorite WHERE id = ? AND is_deleted = 0',
            [videoId]
        );

        if (!video) {
            return createErrorResponse('视频不存在');
        }

        // 只有上传者或管理员可以删除
        if (!isAdmin && video.user_id !== userId) {
            return createErrorResponse('无权删除该视频');
        }

        update(
            'UPDATE video_favorite SET is_deleted = 1, update_time = ? WHERE id = ?',
            [getCurrentTimestamp(), videoId]
        );

        return createSuccessResponse('删除成功');
    } catch (error) {
        logger.error('删除视频失败:', error);
        return createErrorResponse('删除失败');
    }
}

/**
 * 撤销视频审核（将状态重置为待审核）
 * @param {number} videoId - 视频ID
 * @param {number} adminId - 管理员ID
 * @returns {Promise<object>} 撤销结果
 */
export async function revokeVideoReview(videoId, adminId) {
    try {
        const video = queryOne(
            'SELECT id, user_id, title, is_review FROM video_favorite WHERE id = ? AND is_deleted = 0',
            [videoId]
        );

        if (!video) {
            return createErrorResponse('视频不存在');
        }

        if (video.is_review === 0) {
            return createErrorResponse('该视频已经是待审核状态');
        }

        update(
            'UPDATE video_favorite SET is_review = 0, update_time = ? WHERE id = ?',
            [getCurrentTimestamp(), videoId]
        );

        // 发送通知给用户
        await createNotification(
            video.user_id,
            '视频审核通知',
            `您上传的视频"${video.title}"审核状态已撤销，重新进入待审核状态`,
            'review'
        );

        return createSuccessResponse('审核已撤销');
    } catch (error) {
        logger.error('撤销视频审核失败:', error);
        return createErrorResponse('撤销审核失败');
    }
}

/**
 * 移动视频到另一个收藏夹
 * @param {number} videoId - 视频ID
 * @param {number} targetFavoriteId - 目标收藏夹ID（null表示移到默认）
 * @param {number} userId - 操作用户ID
 * @param {boolean} isAdmin - 是否是管理员
 * @returns {Promise<object>} 移动结果
 */
export async function moveVideoToFavorite(videoId, targetFavoriteId, userId, isAdmin = false) {
    try {
        const video = queryOne(
            'SELECT id, user_id, favorite_id FROM video_favorite WHERE id = ? AND is_deleted = 0',
            [videoId]
        );

        if (!video) {
            return createErrorResponse('视频不存在');
        }

        // 只有上传者或管理员可以移动
        if (!isAdmin && video.user_id !== userId) {
            return createErrorResponse('无权移动该视频');
        }

        // 如果指定了目标收藏夹，检查是否存在
        if (targetFavoriteId) {
            const targetFavorite = queryOne(
                'SELECT id, user_id FROM favorite WHERE id = ? AND is_deleted = 0',
                [targetFavoriteId]
            );
            if (!targetFavorite) {
                return createErrorResponse('目标收藏夹不存在');
            }
            // 只能移动到自己的收藏夹（管理员可以移动到任意收藏夹）
            if (!isAdmin && targetFavorite.user_id !== userId) {
                return createErrorResponse('无权移动到该收藏夹');
            }
        }

        update(
            'UPDATE video_favorite SET favorite_id = ?, update_time = ? WHERE id = ?',
            [targetFavoriteId || null, getCurrentTimestamp(), videoId]
        );

        return createSuccessResponse('移动成功');
    } catch (error) {
        logger.error('移动视频失败:', error);
        return createErrorResponse('移动失败');
    }
}

/**
 * 获取视频详情
 * @param {number} videoId - 视频ID
 * @returns {Promise<object>} 视频详情
 */
export async function getVideoDetail(videoId) {
    try {
        const video = queryOne(
            `SELECT
                vf.id, vf.bvid, vf.title, vf.cover_local, vf.uploader_name,
                vf.total_recommend, u.name as user_name, vf.create_time,
                f.id as favorite_id, f.name as favorite_name
            FROM video_favorite vf
            LEFT JOIN user u ON vf.user_id = u.id
            LEFT JOIN favorite f ON vf.favorite_id = f.id
            WHERE vf.id = ? AND vf.is_deleted = 0 AND vf.is_review = 1`,
            [videoId]
        );

        if (!video) {
            return createErrorResponse('视频不存在');
        }

        // 获取本周推荐数
        const weekStart = getWeekStartTimestamp();
        const recommendKey = getRedisKey('recommend_count', weekStart);
        const weeklyRecommend = await global.redis.hget(recommendKey, videoId.toString()) || 0;

        return createSuccessResponse('获取视频详情成功', {
            id: video.id,
            bvid: video.bvid,
            title: video.title,
            cover: video.cover_local ? `/api/file/${video.cover_local}` : '',
            uploaderName: video.uploader_name,
            userName: video.user_name,
            favoriteId: video.favorite_id,
            favoriteName: video.favorite_name,
            totalRecommend: video.total_recommend,
            weeklyRecommend: parseInt(weeklyRecommend),
            createTime: video.create_time
        });
    } catch (error) {
        logger.error('获取视频详情失败:', error);
        return createErrorResponse('获取视频详情失败');
    }
}
