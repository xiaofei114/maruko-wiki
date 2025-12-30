/**
 * 数据库操作通用方法
 * 提供统一的数据库操作接口，封装SQLite查询、插入、更新、删除等操作
 */

/**
 * 执行查询并返回单个结果
 * @param {string} sql - SQL查询语句
 * @param {Array} params - 查询参数数组
 * @returns {*} 查询结果对象或null
 * @throws {Error} 数据库查询错误
 */
export function queryOne(sql, params = []) {
    try {
        const stmt = global.db.prepare(sql);
        return stmt.get(...params);
    } catch (error) {
        logger.error('数据库查询错误:', error);
        throw error;
    }
}

/**
 * 执行查询并返回多个结果
 * @param {string} sql - SQL查询语句
 * @param {Array} params - 查询参数
 * @returns {Array} 查询结果数组
 */
export function queryAll(sql, params = []) {
    try {
        const stmt = global.db.prepare(sql);
        return stmt.all(...params);
    } catch (error) {
        logger.error('数据库查询错误:', error);
        throw error;
    }
}

/**
 * 执行插入操作
 * @param {string} sql - SQL插入语句
 * @param {Array} params - 插入参数
 * @returns {object} 插入结果，包含lastInsertRowid
 */
export function insert(sql, params = []) {
    try {
        const stmt = global.db.prepare(sql);
        const result = stmt.run(...params);
        return result;
    } catch (error) {
        logger.error('数据库插入错误:', error);
        throw error;
    }
}

/**
 * 执行更新操作
 * @param {string} sql - SQL更新语句
 * @param {Array} params - 更新参数
 * @returns {object} 更新结果，包含changes
 */
export function update(sql, params = []) {
    try {
        const stmt = global.db.prepare(sql);
        const result = stmt.run(...params);
        return result;
    } catch (error) {
        logger.error('数据库更新错误:', error);
        throw error;
    }
}

/**
 * 执行删除操作
 * @param {string} sql - SQL删除语句
 * @param {Array} params - 删除参数
 * @returns {object} 删除结果，包含changes
 */
export function remove(sql, params = []) {
    try {
        const stmt = global.db.prepare(sql);
        const result = stmt.run(...params);
        return result;
    } catch (error) {
        logger.error('数据库删除错误:', error);
        throw error;
    }
}

/**
 * 检查记录是否存在
 * @param {string} tableName - 表名
 * @param {object} conditions - 查询条件 {field: value}
 * @returns {boolean} 是否存在
 */
export function exists(tableName, conditions) {
    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    const values = Object.values(conditions);

    const sql = `SELECT 1 FROM ${tableName} WHERE ${whereClause} LIMIT 1`;
    const result = queryOne(sql, values);

    return result !== undefined;
}

/**
 * 获取记录数量
 * @param {string} tableName - 表名
 * @param {object} conditions - 查询条件 {field: value}
 * @returns {number} 记录数量
 */
export function count(tableName, conditions = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${tableName}`;
    const values = [];

    if (Object.keys(conditions).length > 0) {
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
        sql += ` WHERE ${whereClause}`;
        values.push(...Object.values(conditions));
    }

    const result = queryOne(sql, values);
    return result ? result.count : 0;
}

/**
 * 开始事务
 */
export function beginTransaction() {
    global.db.exec('BEGIN TRANSACTION');
}

/**
 * 提交事务
 */
export function commitTransaction() {
    global.db.exec('COMMIT');
}

/**
 * 回滚事务
 */
export function rollbackTransaction() {
    global.db.exec('ROLLBACK');
}

/**
 * 在事务中执行操作 - 确保数据一致性
 * @param {function} callback - 要执行的操作函数，无参数
 * @returns {*} 操作结果
 * @throws {Error} 操作失败时自动回滚事务并抛出错误
 */
export function executeInTransaction(callback) {
    beginTransaction();
    try {
        const result = callback();
        commitTransaction();
        return result;
    } catch (error) {
        rollbackTransaction();
        throw error;
    }
}

/**
 * 批量插入数据
 * @param {string} tableName - 表名
 * @param {Array} dataArray - 数据数组，每个元素是包含字段值的对象
 * @returns {Array} 插入结果数组
 */
export function batchInsert(tableName, dataArray) {
    if (!dataArray || dataArray.length === 0) {
        return [];
    }

    const results = [];
    const firstItem = dataArray[0];
    const fields = Object.keys(firstItem);
    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;

    const stmt = global.db.prepare(sql);

    for (const data of dataArray) {
        try {
            const values = fields.map(field => data[field]);
            const result = stmt.run(...values);
            results.push(result);
        } catch (error) {
            logger.error('批量插入错误:', error);
            throw error;
        }
    }

    return results;
}

/**
 * 批量更新数据
 * @param {string} tableName - 表名
 * @param {Array} updates - 更新数组，每个元素包含 {conditions: {}, data: {}}
 * @returns {Array} 更新结果数组
 */
export function batchUpdate(tableName, updates) {
    if (!updates || updates.length === 0) {
        return [];
    }

    const results = [];

    for (const update of updates) {
        const { conditions, data } = update;
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');

        const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${whereClause}`;
        const values = [...Object.values(data), ...Object.values(conditions)];

        try {
            const result = update(sql, values);
            results.push(result);
        } catch (error) {
            logger.error('批量更新错误:', error);
            throw error;
        }
    }

    return results;
}

/**
 * 软删除记录（更新is_deleted字段）
 * @param {string} tableName - 表名
 * @param {object} conditions - 删除条件
 * @param {number} adminId - 操作管理员ID（用于记录操作人）
 * @returns {object} 删除结果
 */
export function softDelete(tableName, conditions, adminId = null) {
    const setClause = ['is_deleted = 1', 'update_time = ?'];
    const values = [Math.floor(Date.now() / 1000)];

    // 注意：当前数据库表结构中没有 updated_by 字段，所以暂时不设置此字段
    // if (adminId && tableHasColumn(tableName, 'updated_by')) {
    //     setClause.push('updated_by = ?');
    //     values.push(adminId);
    // }

    const whereClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
    values.push(...Object.values(conditions));

    const sql = `UPDATE ${tableName} SET ${setClause.join(', ')} WHERE ${whereClause}`;
    return update(sql, values);
}

/**
 * 获取分页数据
 * @param {string} sql - 基础查询SQL（不包含LIMIT）
 * @param {Array} params - 查询参数
 * @param {number} page - 页码（从1开始）
 * @param {number} pageSize - 每页大小
 * @returns {object} 分页结果 {data: [], total: 0, page: 1, pageSize: 10, totalPages: 0}
 */
export function getPaginatedData(sql, params = [], page = 1, pageSize = 10) {
    // 获取总数
    const countSql = sql.replace(/SELECT .* FROM/i, 'SELECT COUNT(*) as total FROM');
    const totalResult = queryOne(countSql, params);
    const total = totalResult ? totalResult.total : 0;

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const paginatedSql = `${sql} LIMIT ? OFFSET ?`;
    const data = queryAll(paginatedSql, [...params, pageSize, offset]);

    return {
        data,
        total,
        page,
        pageSize,
        totalPages
    };
}
