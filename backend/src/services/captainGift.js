import { queryOne, queryAll, insert, update, remove } from '../method/database.js';
import { createSuccessResponse, createErrorResponse } from '../method/business-utils.js';

/**
 * 舰长礼物服务 - 处理舰礼的增删改查
 */

/**
 * 检查当前日期是否在舰礼有效期内
 * @param {string} startDate - 开始日期 (YYYY-MM-DD)
 * @param {string} endDate - 结束日期 (YYYY-MM-DD)
 * @param {Date} currentDate - 当前日期，默认为今天
 * @returns {object} { isValid: boolean, isSpecial: boolean, status: string }
 */
function checkGiftDateValidity(startDate, endDate, currentDate = new Date()) {
    // 没有设置日期限制，整月有效
    if (!startDate && !endDate) {
        return { isValid: true, isSpecial: false, status: 'whole_month' };
    }

    const current = new Date(currentDate);
    current.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 解析开始日期
    let start = null;
    if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
    }

    // 解析结束日期
    let end = null;
    if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
    }

    // 判断是否在当前日期范围内
    let isValid = true;
    if (start && current < start) {
        isValid = false; // 还未开始
    }
    if (end && current > end) {
        isValid = false; // 已结束
    }

    // 判断是否是特殊日期区间（有日期限制的）
    const isSpecial = !!(startDate || endDate);

    // 判断状态
    let status = 'whole_month';
    if (isSpecial) {
        if (end && today > end) {
            status = 'expired'; // 已过期
        } else if (start && today < start) {
            status = 'upcoming'; // 即将开始
        } else {
            status = 'active'; // 进行中
        }
    }

    return { isValid, isSpecial, status, startDate, endDate };
}

/**
 * 获取指定年月的舰礼列表
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @param {boolean} filterByCurrentDate - 是否只返回当前日期有效的舰礼
 * @returns {Promise<object>} 舰礼列表
 */
export async function getGiftsByMonth(year, month, filterByCurrentDate = false) {
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
                start_date,
                end_date,
                create_time,
                update_time
            FROM captain_gifts 
            WHERE year = ? AND month = ?
            ORDER BY gift_type ASC, required_fans_count ASC, id ASC`,
            [year, month]
        );

        // 处理每个舰礼的日期信息
        const processedGifts = gifts.map(item => {
            const dateInfo = checkGiftDateValidity(item.start_date, item.end_date);
            return {
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
                startDate: item.start_date,
                endDate: item.end_date,
                isSpecial: dateInfo.isSpecial,
                dateStatus: dateInfo.status,
                isCurrentlyValid: dateInfo.isValid,
                createTime: item.create_time,
                updateTime: item.update_time
            };
        });

        // 如果设置了只返回当前日期有效的舰礼，进行过滤
        const filteredGifts = filterByCurrentDate 
            ? processedGifts.filter(g => g.isCurrentlyValid)
            : processedGifts;

        return createSuccessResponse('获取舰礼列表成功', {
            year,
            month,
            gifts: filteredGifts
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
        const { year, month, giftName, giftContent, requiredFansCount, giftType, includes, showProgress, sortOrder, startDate, endDate } = giftData;

        // 检查是否已存在（同一月份、同名、同日期区间）
        let checkSql = 'SELECT id FROM captain_gifts WHERE year = ? AND month = ? AND gift_name = ?';
        let checkParams = [year, month, giftName];
        
        // 如果设置了日期区间，需要检查是否有重叠
        if (startDate || endDate) {
            checkSql += ' AND (start_date = ? OR (start_date IS NULL AND ? IS NULL)) AND (end_date = ? OR (end_date IS NULL AND ? IS NULL))';
            checkParams.push(startDate, startDate, endDate, endDate);
        } else {
            checkSql += ' AND start_date IS NULL AND end_date IS NULL';
        }
        
        const existing = queryOne(checkSql, checkParams);

        if (existing) {
            return createErrorResponse('该月份已存在同名舰礼');
        }

        // 处理 showProgress，确保能正确保存 0 值
        const finalShowProgress = showProgress !== undefined && showProgress !== null ? Number(showProgress) : 1;

        const id = insert(
            `INSERT INTO captain_gifts (year, month, gift_name, gift_content, required_fans_count, gift_type, includes, show_progress, sort_order, start_date, end_date) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [year, month, giftName, giftContent || '', requiredFansCount || 0, giftType || 1, includes || 0, finalShowProgress, sortOrder || 0, startDate || null, endDate || null]
        );

        logger.info(`添加舰礼成功: ${giftName}, ${year}年${month}月, 日期: ${startDate || '整月'} ~ ${endDate || '月底'}`);
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
        const { giftName, giftContent, requiredFansCount, giftType, includes, showProgress, sortOrder, startDate, endDate } = giftData;

        // 检查是否存在
        const existing = queryOne(
            'SELECT year, month, start_date, end_date FROM captain_gifts WHERE id = ?',
            [id]
        );

        if (!existing) {
            return createErrorResponse('舰礼不存在');
        }

        // 如果修改了名称或日期，检查是否与其他舰礼重名
        if (giftName) {
            let checkSql = 'SELECT id FROM captain_gifts WHERE year = ? AND month = ? AND gift_name = ? AND id != ?';
            let checkParams = [existing.year, existing.month, giftName, id];
            
            // 检查日期区间是否冲突
            const newStartDate = startDate !== undefined ? startDate : existing.start_date;
            const newEndDate = endDate !== undefined ? endDate : existing.end_date;
            
            if (newStartDate || newEndDate) {
                checkSql += ' AND (start_date = ? OR (start_date IS NULL AND ? IS NULL)) AND (end_date = ? OR (end_date IS NULL AND ? IS NULL))';
                checkParams.push(newStartDate, newStartDate, newEndDate, newEndDate);
            } else {
                checkSql += ' AND start_date IS NULL AND end_date IS NULL';
            }
            
            const duplicate = queryOne(checkSql, checkParams);

            if (duplicate) {
                return createErrorResponse('该月份已存在同名舰礼');
            }
        }

        // 处理 showProgress，确保能正确保存 0 值
        logger.debug(`更新舰礼 - 接收到的 showProgress: ${showProgress}, 类型: ${typeof showProgress}`);
        const finalShowProgress = showProgress !== undefined && showProgress !== null ? Number(showProgress) : 1;
        logger.debug(`更新舰礼 - 处理后的 finalShowProgress: ${finalShowProgress}`);

        // 处理日期字段
        const finalStartDate = startDate !== undefined ? (startDate || null) : existing.start_date;
        const finalEndDate = endDate !== undefined ? (endDate || null) : existing.end_date;

        const updateResult = update(
            `UPDATE captain_gifts 
             SET gift_name = ?, gift_content = ?, required_fans_count = ?, gift_type = ?, includes = ?, show_progress = ?, sort_order = ?, start_date = ?, end_date = ?
             WHERE id = ?`,
            [giftName, giftContent || '', requiredFansCount || 0, giftType || 1, includes || 0, finalShowProgress, sortOrder || 0, finalStartDate, finalEndDate, id]
        );

        logger.info(`更新舰礼成功: ID ${id}, 影响行数: ${updateResult.changes}, 日期: ${finalStartDate || '整月'} ~ ${finalEndDate || '月底'}`);
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
                `INSERT INTO captain_gifts (year, month, gift_name, gift_content, required_fans_count, gift_type, includes, show_progress, sort_order, start_date, end_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [year, month, gift.giftName, gift.giftContent || '', gift.requiredFansCount || 0, gift.giftType || 1, gift.includes || 0, gift.showProgress !== undefined ? gift.showProgress : 1, i, gift.startDate || null, gift.endDate || null]
            );
        }

        logger.info(`批量添加舰礼成功: ${year}年${month}月, 共${gifts.length}个`);
        return createSuccessResponse('批量添加舰礼成功', { count: gifts.length });
    } catch (error) {
        logger.error('批量添加舰礼失败:', error);
        return createErrorResponse('批量添加舰礼失败: ' + error.message);
    }
}
