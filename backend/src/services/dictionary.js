import { queryOne, queryAll, insert, update } from '../method/database.js';

/**
 * 字典服务 - 处理字典类型和字典项相关业务逻辑
 */

/**
 * 统一处理数据库错误
 * @param {Error} error
 * @returns 标准化错误对象
 */
function handleDbError(error) {
    logger.error('数据库操作错误:', error);

    const isUniqueError = error.message.includes('UNIQUE constraint');
    return {
        success: false,
        message: isUniqueError ? '数据唯一性冲突' : `数据库操作失败: ${error.message}`,
        code: 500
    };
}

// ======================== 字典类型操作 ========================

/**
 * 分页获取字典类型
 * @param {object} params - 查询参数
 * @param {number} params.page - 页码，默认1
 * @param {number} params.pageSize - 每页数量，默认10
 * @param {boolean} params.includeBanned - 包含已禁用项，默认false
 * @returns {object} 字典类型列表和分页信息
 */
export async function getTypesPaged({ page = 1, pageSize = 10, includeBanned = false }) {
    try {
        // 参数校验
        page = Math.max(1, parseInt(page)) || 1;
        pageSize = Math.max(1, parseInt(pageSize)) || 10;

        // 获取总数（排除软删除的记录）
        const countSql = `SELECT COUNT(*) as total FROM dictionary_type WHERE is_deleted = 0 ${includeBanned ? '' : 'AND is_banned = 0'}`;
        const { total } = queryOne(countSql);

        // 获取分页数据
        const dataSql = `
           SELECT * FROM dictionary_type
           WHERE is_deleted = 0
           ${includeBanned ? '' : 'AND is_banned = 0'}
           ORDER BY id
           LIMIT ? OFFSET ?
       `;
        const offset = (page - 1) * pageSize;
        const data = queryAll(dataSql, [pageSize, offset]);

        return {
            success: true,
            message: '获取字典类型列表成功',
            data: {
                pagination: {
                    total,
                    page,
                    pageSize,
                    totalPages: Math.ceil(total / pageSize)
                },
                data: data.map(row => ({
                    ...row,
                    is_banned: !!row.is_banned
                }))
            }
        };
    } catch (error) {
        return handleDbError(error);
    }
}

/**
 * 添加字典类型
 * @param {object} typeData - 字典类型数据
 * @param {string} typeData.name - 类型名称
 * @param {string} typeData.dict_type - 类型标识
 * @returns {object} 操作结果
 */
export async function addType(typeData) {
    const { name, dict_type } = typeData;

    if (!name || !dict_type) {
        return {
            success: false,
            message: '缺少必要参数 name 或 dict_type',
            code: 400
        };
    }

    try {
        // 检查是否存在相同 dict_type 的记录（包括软删除的）
        const existing = queryOne(
            'SELECT id, is_deleted FROM dictionary_type WHERE dict_type = ?',
            [dict_type]
        );

        if (existing) {
            if (existing.is_deleted) {
                // 如果已被软删除，则恢复并更新
                update(`
                    UPDATE dictionary_type
                    SET name = ?, is_deleted = 0, is_banned = 0
                    WHERE id = ?
                `, [name, existing.id]);

                return {
                    success: true,
                    message: '字典类型已恢复并更新',
                    data: { id: existing.id }
                };
            } else {
                // 已存在且未删除，返回错误
                return {
                    success: false,
                    message: '该字典类型标识已存在',
                    code: 400
                };
            }
        }

        // 不存在，正常插入
        const result = insert(`
            INSERT INTO dictionary_type (name, dict_type)
            VALUES (?, ?)
        `, [name, dict_type]);

        return {
            success: true,
            message: '创建字典类型成功',
            data: { id: result.lastInsertRowid }
        };
    } catch (error) {
        return handleDbError(error);
    }
}

/**
 * 删除字典类型（软删除，同时删除关联的字典项）
 * @param {number} typeId - 字典类型ID
 * @returns {object} 操作结果
 */
export async function deleteType(typeId) {
    try {
        // 先获取该字典类型的 dict_type
        const type = queryOne('SELECT dict_type FROM dictionary_type WHERE id = ? AND is_deleted = 0', [Number(typeId)]);

        if (!type) {
            return {
                success: false,
                message: '未找到对应字典类型或已删除',
                code: 404
            };
        }

        // 软删除字典类型
        update(`
            UPDATE dictionary_type
            SET is_deleted = 1
            WHERE id = ? AND is_deleted = 0
        `, [Number(typeId)]);

        // 同时软删除关联的字典项
        update(`
            UPDATE dictionary_item
            SET is_deleted = 1
            WHERE dict_type = ? AND is_deleted = 0
        `, [type.dict_type]);

        return {
            success: true,
            message: '删除字典类型成功'
        };
    } catch (error) {
        return handleDbError(error);
    }
}

/**
 * 更新字典类型
 * @param {object} data - 更新数据
 * @param {number} data.typeId - 类型ID
 * @param {string} data.name - 类型名称
 * @param {string} data.dict_type - 类型标识
 * @returns {object} 操作结果
 */
export async function updateType(data) {
    const { typeId, name, dict_type } = data;
    const allowedFields = ['name', 'dict_type'];
    const fieldsToUpdate = [];

    if (name !== undefined) fieldsToUpdate.push({ key: 'name', value: name });
    if (dict_type !== undefined) fieldsToUpdate.push({ key: 'dict_type', value: dict_type });

    if (fieldsToUpdate.length === 0) {
        return {
            success: false,
            message: '无有效更新字段',
            code: 400
        };
    }

    try {
        // 获取当前字典类型信息（只能更新未删除的）
        const currentType = queryOne('SELECT dict_type FROM dictionary_type WHERE id = ? AND is_deleted = 0', [typeId]);

        if (!currentType) {
            return {
                success: false,
                message: '字典类型不存在',
                code: 404
            };
        }

        const oldDictType = currentType.dict_type;

        // 更新字典类型表
        const setClause = fieldsToUpdate.map(f => `${f.key} = ?`).join(', ');
        const params = fieldsToUpdate.map(f => f.value);
        params.push(typeId);

        const updateResult = update(`
            UPDATE dictionary_type
            SET ${setClause}
            WHERE id = ? AND is_deleted = 0
        `, params);

        if (updateResult.changes === 0) {
            return {
                success: false,
                message: '字典类型不存在或已被删除',
                code: 404
            };
        }

        // 如果更新了dict_type，同步更新字典项
        if (dict_type && dict_type !== oldDictType) {
            update(`
                UPDATE dictionary_item
                SET dict_type = ?
                WHERE dict_type = ?
            `, [dict_type, oldDictType]);
        }

        return {
            success: true,
            message: '更新字典类型成功'
        };
    } catch (error) {
        return handleDbError(error);
    }
}

/**
 * 禁用/启用字典类型
 * @param {number} typeId - 类型ID
 * @param {boolean} banned - 是否禁用
 * @returns {object} 操作结果
 */
export async function banType(typeId, banned = true) {
    try {
        const result = update(`
            UPDATE dictionary_type
            SET is_banned = ?
            WHERE id = ? AND is_deleted = 0
        `, [banned ? 1 : 0, Number(typeId)]);

        if (result.changes === 0) {
            return {
                success: false,
                message: '字典类型不存在或已被删除',
                code: 404
            };
        }

        return {
            success: true,
            message: banned ? '禁用字典类型成功' : '启用字典类型成功'
        };
    } catch (error) {
        return handleDbError(error);
    }
}

// ======================== 字典项操作 ========================

/**
 * 分页获取字典项
 * @param {object} params - 查询参数
 * @param {string} params.dictType - 字典类型标识
 * @param {number} params.page - 页码，默认1
 * @param {number} params.pageSize - 每页数量，默认10
 * @param {boolean} params.includeBanned - 包含已禁用项，默认false
 * @returns {object} 字典项列表和分页信息
 */
export async function getItemsPaged({ dictType, page = 1, pageSize = 10, includeBanned = false }) {
    try {
        if (!dictType) {
            return {
                success: false,
                message: '缺少必要参数 dictType',
                code: 400
            };
        }

        // 参数校验
        page = Math.max(1, parseInt(page)) || 1;
        pageSize = Math.max(1, parseInt(pageSize)) || 10;

        // 获取总数（排除软删除的记录）
        const countSql = `
            SELECT COUNT(*) as total
            FROM dictionary_item
            WHERE dict_type = ?
            AND is_deleted = 0
            ${includeBanned ? '' : 'AND is_banned = 0'}
        `;
        const { total } = queryOne(countSql, [dictType]);

        // 获取分页数据
        const dataSql = `
            SELECT * FROM dictionary_item
            WHERE dict_type = ?
            AND is_deleted = 0
            ${includeBanned ? '' : 'AND is_banned = 0'}
            ORDER BY sort ASC, id DESC
            LIMIT ? OFFSET ?
        `;
        const offset = (page - 1) * pageSize;
        const data = queryAll(dataSql, [dictType, pageSize, offset]);

        return {
            success: true,
            message: '获取字典项列表成功',
            data: {
                pagination: {
                    total,
                    page,
                    pageSize,
                    totalPages: Math.ceil(total / pageSize)
                },
                data: data.map(row => ({
                    ...row,
                    is_banned: !!row.is_banned
                }))
            }
        };
    } catch (error) {
        return handleDbError(error);
    }
}

/**
 * 添加字典项
 * @param {object} itemData - 字典项数据
 * @param {string} itemData.dict_type - 字典类型标识
 * @param {string} itemData.dict_label - 字典标签
 * @param {string} itemData.dict_key - 字典键
 * @param {string} [itemData.dict_key2] - 字典键2
 * @param {number} [itemData.sort] - 排序
 * @param {string} [itemData.display_style] - 显示样式
 * @returns {object} 操作结果
 */
export async function addItem(itemData) {
    const { dict_type, dict_label, dict_key, dict_key2, sort, display_style } = itemData;

    if (!dict_type || !dict_label || !dict_key) {
        return {
            success: false,
            message: '缺少必要字段: dict_type/dict_label/dict_key',
            code: 400
        };
    }

    try {
        // 检查是否存在相同 (dict_type, dict_key) 的记录（包括软删除的）
        const existing = queryOne(
            'SELECT id, is_deleted FROM dictionary_item WHERE dict_type = ? AND dict_key = ?',
            [dict_type, dict_key]
        );

        if (existing) {
            if (existing.is_deleted) {
                // 如果已被软删除，则恢复并更新
                update(`
                    UPDATE dictionary_item
                    SET dict_label = ?, dict_key2 = ?, sort = ?, display_style = ?, is_deleted = 0, is_banned = 0
                    WHERE id = ?
                `, [dict_label, dict_key2 || null, sort || 0, display_style || null, existing.id]);

                return {
                    success: true,
                    message: '字典项已恢复并更新',
                    data: { id: existing.id }
                };
            } else {
                // 已存在且未删除，返回错误
                return {
                    success: false,
                    message: '该字典类型下的字典键已存在',
                    code: 400
                };
            }
        }

        // 不存在，正常插入
        const result = insert(`
            INSERT INTO dictionary_item
            (dict_type, dict_label, dict_key, dict_key2, sort, display_style)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            dict_type,
            dict_label,
            dict_key,
            dict_key2 || null,
            sort || 0,
            display_style || null
        ]);

        return {
            success: true,
            message: '添加字典项成功',
            data: { id: result.lastInsertRowid }
        };
    } catch (error) {
        return handleDbError(error);
    }
}

/**
 * 删除字典项（软删除）
 * @param {number} itemId - 字典项ID
 * @returns {object} 操作结果
 */
export async function deleteItem(itemId) {
    try {
        const result = update(`
            UPDATE dictionary_item
            SET is_deleted = 1
            WHERE id = ? AND is_deleted = 0
        `, [Number(itemId)]);

        if (result.changes === 0) {
            return {
                success: false,
                message: '未找到对应字典项或已删除',
                code: 404
            };
        }
        return {
            success: true,
            message: '删除字典项成功'
        };
    } catch (error) {
        return handleDbError(error);
    }
}

/**
 * 更新字典项
 * @param {object} data - 更新数据
 * @param {number} data.itemId - 字典项ID
 * @param {string} [data.dict_label] - 字典标签
 * @param {string} [data.dict_key] - 字典键
 * @param {string} [data.dict_key2] - 字典键2
 * @param {number} [data.sort] - 排序
 * @param {string} [data.display_style] - 显示样式
 * @returns {object} 操作结果
 */
export async function updateItem(data) {
    const { itemId, dict_label, dict_key, dict_key2, sort, display_style } = data;
    const allowedFields = ['dict_label', 'dict_key', 'dict_key2', 'sort', 'display_style'];
    const fieldsToUpdate = [];

    if (dict_label !== undefined) fieldsToUpdate.push({ key: 'dict_label', value: dict_label });
    if (dict_key !== undefined) fieldsToUpdate.push({ key: 'dict_key', value: dict_key });
    if (dict_key2 !== undefined) fieldsToUpdate.push({ key: 'dict_key2', value: dict_key2 });
    if (sort !== undefined) fieldsToUpdate.push({ key: 'sort', value: sort });
    if (display_style !== undefined) fieldsToUpdate.push({ key: 'display_style', value: display_style });

    if (fieldsToUpdate.length === 0) {
        return {
            success: false,
            message: '无有效更新字段',
            code: 400
        };
    }

    try {
        const setClause = fieldsToUpdate.map(f => `${f.key} = ?`).join(', ');
        const params = fieldsToUpdate.map(f => f.value);
        params.push(itemId);

        const result = update(`
            UPDATE dictionary_item
            SET ${setClause}
            WHERE id = ? AND is_deleted = 0
        `, params);

        if (result.changes === 0) {
            return {
                success: false,
                message: '字典项不存在或已被删除',
                code: 404
            };
        }

        return {
            success: true,
            message: '更新字典项成功'
        };
    } catch (error) {
        return handleDbError(error);
    }
}

/**
 * 禁用/启用字典项
 * @param {number} itemId - 字典项ID
 * @param {boolean} banned - 是否禁用
 * @returns {object} 操作结果
 */
export async function banItem(itemId, banned = true) {
    try {
        const result = update(`
            UPDATE dictionary_item
            SET is_banned = ?
            WHERE id = ? AND is_deleted = 0
        `, [banned ? 1 : 0, Number(itemId)]);

        if (result.changes === 0) {
            return {
                success: false,
                message: '字典项不存在或已被删除',
                code: 404
            };
        }

        return {
            success: true,
            message: banned ? '禁用字典项成功' : '启用字典项成功'
        };
    } catch (error) {
        return handleDbError(error);
    }
}

/**
 * 添加或更新字典类型（根据是否有typeId）
 * @param {object} data - 字典类型数据
 * @returns {object} 操作结果
 */
export async function addOrUpdateType(data) {
    if (data.typeId) {
        return await updateType(data);
    } else {
        return await addType(data);
    }
}

/**
 * 添加或更新字典项（根据是否有itemId）
 * @param {object} data - 字典项数据
 * @returns {object} 操作结果
 */
export async function addOrUpdateItem(data) {
    if (data.itemId) {
        return await updateItem(data);
    } else {
        return await addItem(data);
    }
}
