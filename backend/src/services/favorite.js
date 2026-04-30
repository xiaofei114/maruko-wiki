import { queryAll, queryOne, insert, update } from '../method/database.js';
import { createSuccessResponse, createErrorResponse } from '../method/business-utils.js';
import logger from '../components/log4.js';

/**
 * 创建收藏夹
 * @param {object} data - 收藏夹数据
 * @param {number} userId - 用户ID
 * @returns {Promise<object>} 创建结果
 */
export async function createFavorite(data, userId) {
    try {
        const { name, description, isPublic = 1 } = data;

        if (!name || name.trim() === '') {
            return createErrorResponse('收藏夹名称不能为空');
        }

        // 检查用户收藏夹数量限制（最多20个）
        const countResult = queryOne(
            'SELECT COUNT(*) as count FROM favorite WHERE user_id = ? AND is_deleted = 0',
            [userId]
        );

        if (countResult.count >= 20) {
            return createErrorResponse('每个用户最多只能创建20个收藏夹');
        }

        // 检查名称是否重复
        const existing = queryOne(
            'SELECT id FROM favorite WHERE user_id = ? AND name = ? AND is_deleted = 0',
            [userId, name.trim()]
        );

        if (existing) {
            return createErrorResponse('收藏夹名称已存在');
        }

        const result = insert(
            'INSERT INTO favorite (name, description, user_id, is_public) VALUES (?, ?, ?, ?)',
            [name.trim(), description?.trim() || null, userId, isPublic]
        );

        return createSuccessResponse('创建成功', {
            id: result.lastInsertRowid,
            name: name.trim(),
            description: description?.trim() || null,
            isPublic
        });
    } catch (error) {
        logger.error('创建收藏夹失败:', error);
        return createErrorResponse('创建失败');
    }
}

/**
 * 获取用户的收藏夹列表
 * @param {number} userId - 用户ID
 * @param {boolean} includePrivate - 是否包含私密收藏夹
 * @returns {Promise<object>} 收藏夹列表
 */
export async function getUserFavorites(userId, includePrivate = true) {
    try {
        let sql = `
            SELECT 
                f.id,
                f.name,
                f.description,
                f.is_public as isPublic,
                f.create_time as createTime,
                COUNT(vf.id) as videoCount
            FROM favorite f
            LEFT JOIN video_favorite vf ON f.id = vf.favorite_id AND vf.is_deleted = 0 AND vf.is_review = 1
            WHERE f.user_id = ? AND f.is_deleted = 0
        `;

        if (!includePrivate) {
            sql += ' AND f.is_public = 1';
        }

        sql += ' GROUP BY f.id ORDER BY f.create_time DESC';

        const favorites = queryAll(sql, [userId]);

        return createSuccessResponse('获取成功', favorites);
    } catch (error) {
        logger.error('获取收藏夹列表失败:', error);
        return createErrorResponse('获取失败');
    }
}

/**
 * 获取公开收藏夹列表
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<object>} 收藏夹列表
 */
export async function getPublicFavorites(page = 1, pageSize = 20) {
    try {
        const offset = (page - 1) * pageSize;

        const favorites = queryAll(`
            SELECT
                f.id,
                f.name,
                f.description,
                f.create_time as createTime,
                u.nickname as userName,
                COUNT(vf.id) as videoCount
            FROM favorite f
            LEFT JOIN user u ON f.user_id = u.id
            LEFT JOIN video_favorite vf ON f.id = vf.favorite_id AND vf.is_deleted = 0 AND vf.is_review = 1
            WHERE f.is_public = 1 AND f.is_deleted = 0
            GROUP BY f.id
            ORDER BY f.create_time DESC
            LIMIT ? OFFSET ?
        `, [pageSize, offset]);

        const totalResult = queryOne(`
            SELECT COUNT(*) as total FROM favorite WHERE is_public = 1 AND is_deleted = 0
        `);

        return createSuccessResponse('获取成功', {
            list: favorites,
            total: totalResult.total,
            page,
            pageSize
        });
    } catch (error) {
        logger.error('获取公开收藏夹列表失败:', error);
        return createErrorResponse('获取失败');
    }
}

/**
 * 获取收藏夹详情
 * @param {number} favoriteId - 收藏夹ID
 * @param {number} userId - 当前用户ID（用于权限检查）
 * @returns {Promise<object>} 收藏夹详情
 */
export async function getFavoriteDetail(favoriteId, userId) {
    try {
        const favorite = queryOne(`
            SELECT 
                f.id,
                f.name,
                f.description,
                f.is_public as isPublic,
                f.user_id as userId,
                f.create_time as createTime,
                u.nickname as userName
            FROM favorite f
            LEFT JOIN user u ON f.user_id = u.id
            WHERE f.id = ? AND f.is_deleted = 0
        `, [favoriteId]);

        if (!favorite) {
            return createErrorResponse('收藏夹不存在');
        }

        // 检查权限（私密收藏夹只有创建者可以查看）
        if (!favorite.isPublic && favorite.userId !== userId) {
            return createErrorResponse('无权查看该收藏夹');
        }

        // 获取收藏夹中的视频
        const videos = queryAll(`
            SELECT
                vf.id,
                vf.bvid,
                vf.title,
                vf.cover_local as cover,
                vf.uploader_name as uploaderName,
                vf.user_id as uploadUserId,
                u.nickname as userName,
                vf.total_recommend as totalRecommend,
                vf.create_time as createTime
            FROM video_favorite vf
            LEFT JOIN user u ON vf.user_id = u.id
            WHERE vf.favorite_id = ? AND vf.is_deleted = 0 AND vf.is_review = 1
            ORDER BY vf.create_time DESC
        `, [favoriteId]);

        return createSuccessResponse('获取成功', {
            ...favorite,
            isOwner: favorite.userId === userId,
            videos
        });
    } catch (error) {
        logger.error('获取收藏夹详情失败:', error);
        return createErrorResponse('获取失败');
    }
}

/**
 * 更新收藏夹
 * @param {number} favoriteId - 收藏夹ID
 * @param {object} data - 更新数据
 * @param {number} userId - 用户ID
 * @returns {Promise<object>} 更新结果
 */
export async function updateFavorite(favoriteId, data, userId) {
    try {
        const { name, description, isPublic } = data;

        // 检查收藏夹是否存在且属于当前用户
        const favorite = queryOne(
            'SELECT id, user_id FROM favorite WHERE id = ? AND is_deleted = 0',
            [favoriteId]
        );

        if (!favorite) {
            return createErrorResponse('收藏夹不存在');
        }

        if (favorite.user_id !== userId) {
            return createErrorResponse('无权修改该收藏夹');
        }

        // 检查名称是否重复
        if (name && name.trim() !== '') {
            const existing = queryOne(
                'SELECT id FROM favorite WHERE user_id = ? AND name = ? AND id != ? AND is_deleted = 0',
                [userId, name.trim(), favoriteId]
            );

            if (existing) {
                return createErrorResponse('收藏夹名称已存在');
            }
        }

        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name.trim());
        }

        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description?.trim() || null);
        }

        if (isPublic !== undefined) {
            updates.push('is_public = ?');
            values.push(isPublic);
        }

        if (updates.length === 0) {
            return createErrorResponse('没有要更新的内容');
        }

        values.push(favoriteId);

        update(
            `UPDATE favorite SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        return createSuccessResponse('更新成功');
    } catch (error) {
        logger.error('更新收藏夹失败:', error);
        return createErrorResponse('更新失败');
    }
}

/**
 * 删除收藏夹
 * @param {number} favoriteId - 收藏夹ID
 * @param {number} userId - 用户ID
 * @returns {Promise<object>} 删除结果
 */
export async function deleteFavorite(favoriteId, userId) {
    try {
        // 检查收藏夹是否存在且属于当前用户
        const favorite = queryOne(
            'SELECT id, user_id FROM favorite WHERE id = ? AND is_deleted = 0',
            [favoriteId]
        );

        if (!favorite) {
            return createErrorResponse('收藏夹不存在');
        }

        if (favorite.user_id !== userId) {
            return createErrorResponse('无权删除该收藏夹');
        }

        // 软删除收藏夹
        update(
            'UPDATE favorite SET is_deleted = 1 WHERE id = ?',
            [favoriteId]
        );

        // 将收藏夹中的视频设为无收藏夹
        update(
            'UPDATE video_favorite SET favorite_id = NULL WHERE favorite_id = ?',
            [favoriteId]
        );

        return createSuccessResponse('删除成功');
    } catch (error) {
        logger.error('删除收藏夹失败:', error);
        return createErrorResponse('删除失败');
    }
}

/**
 * 将视频移动到收藏夹
 * @param {number} videoId - 视频ID
 * @param {number} favoriteId - 收藏夹ID（可为null表示移出收藏夹）
 * @param {number} userId - 用户ID
 * @returns {Promise<object>} 操作结果
 */
export async function moveVideoToFavorite(videoId, favoriteId, userId) {
    try {
        // 检查视频是否存在
        const video = queryOne(
            'SELECT id, user_id, is_review FROM video_favorite WHERE id = ? AND is_deleted = 0',
            [videoId]
        );

        if (!video) {
            return createErrorResponse('视频不存在');
        }

        // 检查权限（只有视频上传者或管理员可以移动）
        if (video.user_id !== userId) {
            return createErrorResponse('无权操作该视频');
        }

        // 如果要移动到某个收藏夹，检查收藏夹是否存在且属于当前用户
        if (favoriteId) {
            const favorite = queryOne(
                'SELECT id, user_id FROM favorite WHERE id = ? AND is_deleted = 0',
                [favoriteId]
            );

            if (!favorite) {
                return createErrorResponse('收藏夹不存在');
            }

            if (favorite.user_id !== userId) {
                return createErrorResponse('无权使用该收藏夹');
            }
        }

        update(
            'UPDATE video_favorite SET favorite_id = ? WHERE id = ?',
            [favoriteId || null, videoId]
        );

        return createSuccessResponse(favoriteId ? '已添加到收藏夹' : '已移出收藏夹');
    } catch (error) {
        logger.error('移动视频到收藏夹失败:', error);
        return createErrorResponse('操作失败');
    }
}

/**
 * 获取用户的所有收藏夹（用于选择）
 * @param {number} userId - 用户ID
 * @returns {Promise<object>} 收藏夹列表
 */
export async function getUserFavoritesForSelect(userId) {
    try {
        const favorites = queryAll(`
            SELECT
                id,
                name,
                (SELECT COUNT(*) FROM video_favorite WHERE favorite_id = favorite.id AND is_deleted = 0 AND is_review = 1) as videoCount
            FROM favorite
            WHERE user_id = ? AND is_deleted = 0
            ORDER BY create_time DESC
        `, [userId]);

        return createSuccessResponse('获取成功', favorites);
    } catch (error) {
        logger.error('获取收藏夹列表失败:', error);
        return createErrorResponse('获取失败');
    }
}
