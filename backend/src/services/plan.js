import fs from 'fs';
import path from 'path';
import { queryOne, queryAll, insert, update } from '../method/database.js';

const logger = global.logger;

/**
 * 获取企划列表（未登录看不到DD内部企划）
 * @param {object|null} user - 登录用户信息（可选）
 */
export async function getPlanList(user = null) {
    try {
        const isLoggedIn = !!(user && user.id);

        let sql, params;
        if (isLoggedIn) {
            // 已登录：返回全部
            sql = `
                SELECT id, title, type, anchor_category, dd_visibility,
                       time_type, date, start_date, end_date,
                       file_path, file_name, create_time
                FROM plan
                WHERE deleted = 0
                ORDER BY create_time DESC
            `;
            params = [];
        } else {
            // 未登录：排除DD内部企划
            sql = `
                SELECT id, title, type, anchor_category, dd_visibility,
                       time_type, date, start_date, end_date,
                       file_path, file_name, create_time
                FROM plan
                WHERE deleted = 0
                AND (type != 'dd' OR dd_visibility != 'internal')
                ORDER BY create_time DESC
            `;
            params = [];
        }

        const records = queryAll(sql, params);

        const data = records.map(r => ({
            id: r.id,
            title: r.title,
            type: r.type,
            anchorCategory: r.anchor_category,
            ddVisibility: r.dd_visibility,
            timeType: r.time_type,
            date: r.date,
            startDate: r.start_date,
            endDate: r.end_date,
            filePath: r.file_path,
            fileName: r.file_name,
            createTime: r.create_time
        }));

        return {
            success: true,
            message: '获取企划列表成功',
            data
        };
    } catch (error) {
        logger.error('获取企划列表失败:', error);
        return { success: false, message: '获取失败', code: 500 };
    }
}

/**
 * 上传企划
 * @param {object|null} file - multer文件对象
 * @param {object} planData - 企划数据
 * @returns {object}
 */
export async function createPlan(file, planData) {
    try {
        const { title, type, anchorCategory, ddVisibility, timeType, date, startDate, endDate } = planData;

        if (!title || !title.trim()) {
            return { success: false, message: '企划名称不能为空' };
        }
        if (!type || !['anchor', 'dd'].includes(type)) {
            return { success: false, message: '企划类型无效' };
        }
        if (!timeType || !['single', 'range', 'long'].includes(timeType)) {
            return { success: false, message: '企划周期无效' };
        }
        if (timeType === 'single' && !date) {
            return { success: false, message: '单日企划必须选择日期' };
        }
        if (timeType === 'range' && (!startDate || !endDate)) {
            return { success: false, message: '持续企划必须填写时间范围' };
        }
        if (type === 'anchor' && !anchorCategory) {
            return { success: false, message: '主播企划必须选择分类' };
        }
        if (type === 'dd' && !ddVisibility) {
            return { success: false, message: 'DD企划必须选择可见范围' };
        }

        let filePath = null;
        let fileName = null;

        if (file) {
            fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            filePath = path.join('docs', path.basename(file.path)).replace(/\\/g, '/');
        }

        const result = insert(`
            INSERT INTO plan (title, type, anchor_category, dd_visibility, time_type, date, start_date, end_date, file_path, file_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title.trim(),
            type,
            anchorCategory || null,
            ddVisibility || null,
            timeType,
            date || null,
            startDate || null,
            endDate || null,
            filePath,
            fileName
        ]);

        logger.info(`企划创建成功: ${title}`);

        return {
            success: true,
            message: '企划创建成功',
            data: { id: result.lastInsertRowid }
        };
    } catch (error) {
        logger.error('创建企划失败:', error);
        return { success: false, message: '创建失败', code: 500 };
    }
}

/**
 * 删除企划
 * @param {number} planId
 * @returns {object}
 */
export async function deletePlan(planId) {
    try {
        const plan = queryOne('SELECT id, file_path, title FROM plan WHERE id = ? AND deleted = 0', [planId]);
        if (!plan) {
            return { success: false, message: '企划不存在', code: 404 };
        }

        // 删除关联文件
        if (plan.file_path) {
            const fullPath = path.join(process.cwd(), 'data', 'document', plan.file_path);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        }

        update('UPDATE plan SET deleted = 1 WHERE id = ?', [planId]);

        logger.info(`企划删除: ${plan.title} (ID: ${planId})`);

        return {
            success: true,
            message: '删除成功'
        };
    } catch (error) {
        logger.error('删除企划失败:', error);
        return { success: false, message: '删除失败', code: 500 };
    }
}

/**
 * 管理后台获取企划列表（分页）
 * @param {object} pagination - { page, pageSize }
 * @returns {object}
 */
export async function getPlanListForAdmin(pagination = { page: 1, pageSize: 10 }, filters = {}) {
    try {
        const page = pagination.page || 1;
        const pageSize = pagination.pageSize || 15;
        const offset = (page - 1) * pageSize;

        let whereClause = 'WHERE deleted = 0';
        const params = [];

        if (filters.title) {
            whereClause += ' AND title LIKE ?';
            params.push(`%${filters.title}%`);
        }
        if (filters.type) {
            whereClause += ' AND type = ?';
            params.push(filters.type);
        }
        if (filters.anchorCategory) {
            whereClause += ' AND anchor_category = ?';
            params.push(filters.anchorCategory);
        }
        if (filters.ddVisibility) {
            whereClause += ' AND dd_visibility = ?';
            params.push(filters.ddVisibility);
        }
        if (filters.timeType) {
            whereClause += ' AND time_type = ?';
            params.push(filters.timeType);
        }

        const records = queryAll(`
            SELECT id, title, type, anchor_category, dd_visibility,
                   time_type, date, start_date, end_date,
                   file_path, file_name, create_time
            FROM plan
            ${whereClause}
            ORDER BY create_time DESC
            LIMIT ? OFFSET ?
        `, [...params, pageSize, offset]);

        const totalResult = queryOne(`
            SELECT COUNT(*) as total FROM plan ${whereClause}
        `, params);

        const data = records.map(r => ({
            id: r.id,
            title: r.title,
            type: r.type,
            anchorCategory: r.anchor_category,
            ddVisibility: r.dd_visibility,
            timeType: r.time_type,
            date: r.date,
            startDate: r.start_date,
            endDate: r.end_date,
            filePath: r.file_path,
            fileName: r.file_name,
            createTime: r.create_time
        }));

        return {
            success: true,
            message: '获取企划列表成功',
            data,
            pagination: {
                currentPage: page,
                pageSize,
                total: totalResult?.total || 0
            }
        };
    } catch (error) {
        logger.error('获取企划管理列表失败:', error);
        return { success: false, message: '获取失败', code: 500 };
    }
}

/**
 * 更新企划
 * @param {number} planId
 * @param {object} data - { title, type, anchorCategory, ddVisibility, timeType, date, startDate, endDate }
 * @returns {object}
 */
export async function updatePlan(planId, data) {
    try {
        const { title, type, anchorCategory, ddVisibility, timeType, date, startDate, endDate } = data;

        const plan = queryOne('SELECT id, title FROM plan WHERE id = ? AND deleted = 0', [planId]);
        if (!plan) {
            return { success: false, message: '企划不存在', code: 404 };
        }

        const updates = [];
        const vals = [];

        if (title !== undefined) { updates.push('title = ?'); vals.push(title?.trim()); }
        if (type !== undefined) { updates.push('type = ?'); vals.push(type); }
        if (anchorCategory !== undefined) { updates.push('anchor_category = ?'); vals.push(anchorCategory || null); }
        if (ddVisibility !== undefined) { updates.push('dd_visibility = ?'); vals.push(ddVisibility || null); }
        if (timeType !== undefined) { updates.push('time_type = ?'); vals.push(timeType); }
        if (date !== undefined) { updates.push('date = ?'); vals.push(date || null); }
        if (startDate !== undefined) { updates.push('start_date = ?'); vals.push(startDate || null); }
        if (endDate !== undefined) { updates.push('end_date = ?'); vals.push(endDate || null); }

        if (updates.length === 0) {
            return { success: false, message: '没有要更新的字段' };
        }

        vals.push(planId);
        update(`UPDATE plan SET ${updates.join(', ')} WHERE id = ?`, vals);

        logger.info(`企划更新: ${plan.title} -> ${title || plan.title} (ID: ${planId})`);

        return {
            success: true,
            message: '更新成功'
        };
    } catch (error) {
        logger.error('更新企划失败:', error);
        return { success: false, message: '更新失败', code: 500 };
    }
}
