import { queryOne, queryAll, insert, update, softDelete } from '../method/database.js';

/**
 * 公告服务 - 处理公告相关的业务逻辑
 */

/**
 * 获取公告列表（前端展示用，已排序）
 * @returns {object} 公告列表
 */
export async function getAnnouncements() {
    try {
        // 获取所有未删除的公告
        const announcements = queryAll(`
            SELECT 
                id,
                title,
                content_html as content,
                author,
                publish_time as publishTime,
                is_pinned as isPinned,
                category
            FROM announcement
            WHERE is_deleted = 0
            ORDER BY 
                is_pinned DESC,      -- 置顶的先排前面
                publish_time DESC    -- 时间倒序，最新的在前
        `);

        // 转换数据格式以匹配前端需求
        const formattedAnnouncements = announcements.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content,  // 直接返回字符串
            author: item.author,
            publishTime: formatDateTime(item.publishTime),
            isPinned: item.isPinned === 1,
            category: item.category
        }));

        return {
            success: true,
            message: '获取公告列表成功',
            data: formattedAnnouncements
        };

    } catch (error) {
        logger.error('获取公告列表失败:', error);
        return {
            success: false,
            message: '获取公告列表失败',
            code: 500
        };
    }
}

/**
 * 创建公告（管理员）
 * @param {object} data - 公告数据
 * @param {number} adminId - 管理员ID
 * @returns {object} 创建结果
 */
export async function createAnnouncement(data, adminId) {
    try {
        const { title, content, author, isPinned, category } = data;

        // 验证必填字段
        if (!title || !title.trim()) {
            return {
                success: false,
                message: '公告标题不能为空'
            };
        }

        if (!content || !content.trim()) {
            return {
                success: false,
                message: '公告内容不能为空'
            };
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const finalAuthor = author || '管理员';
        const finalCategory = category || 'system';
        const finalIsPinned = isPinned ? 1 : 0;

        const result = insert(`
            INSERT INTO announcement 
            (title, content_html, author, publish_time, is_pinned, category, create_time, update_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title.trim(),
            content.trim(),
            finalAuthor,
            currentTime,
            finalIsPinned,
            finalCategory,
            currentTime,
            currentTime
        ]);

        logger.info(`公告创建成功: ${title} by admin ${adminId}`);

        return {
            success: true,
            message: '公告创建成功',
            data: {
                id: result.lastInsertRowid,
                title: title.trim()
            }
        };

    } catch (error) {
        logger.error('创建公告失败:', error);
        return {
            success: false,
            message: '创建公告失败',
            code: 500
        };
    }
}

/**
 * 更新公告（管理员）
 * @param {number} id - 公告ID
 * @param {object} data - 更新数据
 * @param {number} adminId - 管理员ID
 * @returns {object} 更新结果
 */
export async function updateAnnouncement(id, data, adminId) {
    try {
        const { title, content, author, isPinned, category } = data;

        // 检查公告是否存在
        const existing = queryOne(`
            SELECT id FROM announcement WHERE id = ? AND is_deleted = 0
        `, [id]);

        if (!existing) {
            return {
                success: false,
                message: '公告不存在',
                code: 404
            };
        }

        // 构建更新字段
        const updateFields = [];
        const updateValues = [];

        if (title !== undefined) {
            if (!title.trim()) {
                return {
                    success: false,
                    message: '公告标题不能为空'
                };
            }
            updateFields.push('title = ?');
            updateValues.push(title.trim());
        }

        if (content !== undefined) {
            if (!content.trim()) {
                return {
                    success: false,
                    message: '公告内容不能为空'
                };
            }
            updateFields.push('content_html = ?');
            updateValues.push(content.trim());
        }

        if (author !== undefined) {
            updateFields.push('author = ?');
            updateValues.push(author);
        }

        if (isPinned !== undefined) {
            updateFields.push('is_pinned = ?');
            updateValues.push(isPinned ? 1 : 0);
        }

        if (category !== undefined) {
            updateFields.push('category = ?');
            updateValues.push(category);
        }

        if (updateFields.length === 0) {
            return {
                success: false,
                message: '没有需要更新的字段'
            };
        }

        updateFields.push('update_time = ?');
        updateValues.push(Math.floor(Date.now() / 1000));
        updateValues.push(id);

        const updateResult = update(`
            UPDATE announcement
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        if (updateResult.changes === 0) {
            return {
                success: false,
                message: '公告更新失败'
            };
        }

        logger.info(`公告更新成功: ID ${id} by admin ${adminId}`);

        return {
            success: true,
            message: '公告更新成功'
        };

    } catch (error) {
        logger.error('更新公告失败:', error);
        return {
            success: false,
            message: '更新公告失败',
            code: 500
        };
    }
}

/**
 * 删除公告（软删除，管理员）
 * @param {number} id - 公告ID
 * @param {number} adminId - 管理员ID
 * @returns {object} 删除结果
 */
export async function deleteAnnouncement(id, adminId) {
    try {
        // 检查公告是否存在
        const existing = queryOne(`
            SELECT id, title FROM announcement WHERE id = ? AND is_deleted = 0
        `, [id]);

        if (!existing) {
            return {
                success: false,
                message: '公告不存在',
                code: 404
            };
        }

        // 软删除
        const deleteResult = softDelete('announcement', { id });

        if (deleteResult.changes === 0) {
            return {
                success: false,
                message: '公告删除失败'
            };
        }

        logger.info(`公告删除成功: ID ${id} (${existing.title}) by admin ${adminId}`);

        return {
            success: true,
            message: '公告删除成功'
        };

    } catch (error) {
        logger.error('删除公告失败:', error);
        return {
            success: false,
            message: '删除公告失败',
            code: 500
        };
    }
}

/**
 * 工具函数：Unix时间戳转日期时间字符串
 * @param {number} timestamp - Unix时间戳
 * @returns {string} 格式化的日期时间字符串
 */
function formatDateTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}
