import { queryOne, queryAll, insert, update, remove } from '../method/database.js';
import { createSuccessResponse, createErrorResponse } from '../method/business-utils.js';

/**
 * 舰长礼物服务 - 处理舰礼的增删改查
 */

/**
 * 获取指定年月的舰礼列表
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @returns {Promise<object>} 舰礼列表
 */
export async function getGiftsByMonth(year, month) {
    try {
        const gifts = queryAll(
            `SELECT 
                id,
                year,
                month,
                gift_name,
                gift_content,
                required_fans_count,
                gift_type,
                includes,
                show_progress,
                sort_order,
                create_time,
                update_time
            FROM captain_gifts 
            WHERE year = ? AND month = ?
            ORDER BY gift_type ASC, required_fans_count ASC, id ASC`,
            [year, month]
        );

        return createSuccessResponse('获取舰礼列表成功', {
            year,
            month,
            gifts: gifts.map(item => ({
                id: item.id,
                year: item.year,
                month: item.month,
                giftName: item.gift_name,
                giftContent: item.gift_content,
                requiredFansCount: item.required_fans_count,
                giftType: item.gift_type || 1,
                includes: item.includes || 0,
                showProgress: item.show_progress !== undefined && item.show_progress !== null ? item.show_progress : 1,
                sortOrder: item.sort_order,
                createTime: item.create_time,
                updateTime: item.update_time
            }))
        });
    } catch (error) {
        logger.error('获取舰礼列表失败:', error);
        return createErrorResponse('获取舰礼列表失败: ' + error.message);
    }
}

/**
 * 获取当前月份的舰礼列表（用于前端展示）
 * @returns {Promise<object>} 舰礼列表
 */
export async function getCurrentMonthGifts() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return await getGiftsByMonth(year, month);
}

/**
 * 添加舰礼
 * @param {object} giftData - 舰礼数据
 * @returns {Promise<object>} 操作结果
 */
export async function addGift(giftData) {
    try {
        const { year, month, giftName, giftContent, requiredFansCount, giftType, includes, showProgress, sortOrder } = giftData;

        // 检查是否已存在
        const existing = queryOne(
            'SELECT id FROM captain_gifts WHERE year = ? AND month = ? AND gift_name = ?',
            [year, month, giftName]
        );

        if (existing) {
            return createErrorResponse('该月份已存在同名舰礼');
        }

        // 处理 showProgress，确保能正确保存 0 值
        const finalShowProgress = showProgress !== undefined && showProgress !== null ? Number(showProgress) : 1;

        const id = insert(
            `INSERT INTO captain_gifts (year, month, gift_name, gift_content, required_fans_count, gift_type, includes, show_progress, sort_order) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [year, month, giftName, giftContent || '', requiredFansCount || 0, giftType || 1, includes || 0, finalShowProgress, sortOrder || 0]
        );

        logger.info(`添加舰礼成功: ${giftName}, ${year}年${month}月`);
        return createSuccessResponse('添加舰礼成功', { id });
    } catch (error) {
        logger.error('添加舰礼失败:', error);
        return createErrorResponse('添加舰礼失败: ' + error.message);
    }
}

/**
 * 更新舰礼
 * @param {number} id - 舰礼ID
 * @param {object} giftData - 舰礼数据
 * @returns {Promise<object>} 操作结果
 */
export async function updateGift(id, giftData) {
    try {
        const { giftName, giftContent, requiredFansCount, giftType, includes, showProgress, sortOrder } = giftData;

        // 检查是否存在
        const existing = queryOne(
            'SELECT year, month FROM captain_gifts WHERE id = ?',
            [id]
        );

        if (!existing) {
            return createErrorResponse('舰礼不存在');
        }

        // 如果修改了名称，检查是否与其他舰礼重名
        if (giftName) {
            const duplicate = queryOne(
                'SELECT id FROM captain_gifts WHERE year = ? AND month = ? AND gift_name = ? AND id != ?',
                [existing.year, existing.month, giftName, id]
            );

            if (duplicate) {
                return createErrorResponse('该月份已存在同名舰礼');
            }
        }

        // 处理 showProgress，确保能正确保存 0 值
        logger.debug(`更新舰礼 - 接收到的 showProgress: ${showProgress}, 类型: ${typeof showProgress}`);
        const finalShowProgress = showProgress !== undefined && showProgress !== null ? Number(showProgress) : 1;
        logger.debug(`更新舰礼 - 处理后的 finalShowProgress: ${finalShowProgress}`);

        const updateResult = update(
            `UPDATE captain_gifts 
             SET gift_name = ?, gift_content = ?, required_fans_count = ?, gift_type = ?, includes = ?, show_progress = ?, sort_order = ?
             WHERE id = ?`,
            [giftName, giftContent || '', requiredFansCount || 0, giftType || 1, includes || 0, finalShowProgress, sortOrder || 0, id]
        );

        logger.info(`更新舰礼成功: ID ${id}, 影响行数: ${updateResult.changes}`);
        return createSuccessResponse('更新舰礼成功');
    } catch (error) {
        logger.error('更新舰礼失败:', error);
        return createErrorResponse('更新舰礼失败: ' + error.message);
    }
}

/**
 * 删除舰礼
 * @param {number} id - 舰礼ID
 * @returns {Promise<object>} 操作结果
 */
export async function deleteGift(id) {
    try {
        const existing = queryOne(
            'SELECT id FROM captain_gifts WHERE id = ?',
            [id]
        );

        if (!existing) {
            return createErrorResponse('舰礼不存在');
        }

        remove('DELETE FROM captain_gifts WHERE id = ?', [id]);

        logger.info(`删除舰礼成功: ID ${id}`);
        return createSuccessResponse('删除舰礼成功');
    } catch (error) {
        logger.error('删除舰礼失败:', error);
        return createErrorResponse('删除舰礼失败: ' + error.message);
    }
}

/**
 * 批量添加舰礼（用于初始化某月舰礼）
 * @param {number} year - 年份
 * @param {number} month - 月份
 * @param {Array} gifts - 舰礼列表
 * @returns {Promise<object>} 操作结果
 */
export async function batchAddGifts(year, month, gifts) {
    try {
        // 先删除该月所有舰礼
        remove('DELETE FROM captain_gifts WHERE year = ? AND month = ?', [year, month]);

        // 批量插入新舰礼
        for (let i = 0; i < gifts.length; i++) {
            const gift = gifts[i];
            insert(
                `INSERT INTO captain_gifts (year, month, gift_name, gift_content, required_fans_count, gift_type, includes, show_progress, sort_order) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [year, month, gift.giftName, gift.giftContent || '', gift.requiredFansCount || 0, gift.giftType || 1, gift.includes || 0, gift.showProgress !== undefined ? gift.showProgress : 1, i]
            );
        }

        logger.info(`批量添加舰礼成功: ${year}年${month}月, 共${gifts.length}个`);
        return createSuccessResponse('批量添加舰礼成功', { count: gifts.length });
    } catch (error) {
        logger.error('批量添加舰礼失败:', error);
        return createErrorResponse('批量添加舰礼失败: ' + error.message);
    }
}
