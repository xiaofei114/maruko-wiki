import path from 'path';
import { queryOne, queryAll, insert, update, remove, softDelete } from '../method/database.js';

/**
 * 音声服务 - 处理音声相关的业务逻辑
 */

/**
 * 创建音声分类
 * @param {string} classificationName - 分类名称
 * @param {number} userId - 创建者用户ID
 * @returns {object} 创建结果
 */
export async function createAudioClassification(classificationName, userId) {
    try {
        // 验证参数
        if (!classificationName || classificationName.trim().length === 0) {
            return {
                success: false,
                message: '分类名称不能为空'
            };
        }

        if (classificationName.length > 50) {
            return {
                success: false,
                message: '分类名称不能超过50个字符'
            };
        }

        // 检查分类名称是否已存在（审核通过的）
        const existingClassification = queryOne(`
            SELECT id FROM audio_classification
            WHERE name = ? AND is_deleted = 0 AND is_review = 1
        `, [classificationName.trim()]);

        if (existingClassification) {
            return {
                success: false,
                message: '该分类名称已存在'
            };
        }

        // 检查用户是否已经创建过同名分类（包括待审核的）
        const userExistingClassification = queryOne(`
            SELECT id FROM audio_classification
            WHERE name = ? AND user_id = ? AND is_deleted = 0
        `, [classificationName.trim(), userId]);

        if (userExistingClassification) {
            return {
                success: false,
                message: '您已经创建过同名的分类'
            };
        }

        // 创建新分类
        const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp
        const result = insert(`
            INSERT INTO audio_classification (user_id, name, is_review, create_time, update_time)
            VALUES (?, ?, 1, ?, ?)
        `, [userId, classificationName.trim(), currentTime, currentTime]);

        logger.info(`音声分类创建成功: ${classificationName} by user ${userId}`);

        return {
            success: true,
            message: '音声分类创建成功',
            data: {
                classificationId: result.lastInsertRowid,
                name: classificationName.trim()
            }
        };

    } catch (error) {
        logger.error('音声分类创建失败:', error);
        return {
            success: false,
            message: '音声分类创建失败，请稍后重试',
            code: 500
        };
    }
}

/**
 * 获取按分类分组的音声列表（前端reactive格式）
 * @returns {object} 按分类分组的音声数据
 */
export async function getAudiosGrouped() {
    try {
        // 获取所有审核通过的分类
        const classifications = queryAll(`
            SELECT id, name
            FROM audio_classification
            WHERE is_deleted = 0 AND is_review = 1
            ORDER BY create_time ASC
        `);

        // 为每个分类获取音声
        const audioSections = [];

        for (const classification of classifications) {
            const audios = queryAll(`
                SELECT
                    a.id,
                    a.name,
                    a.url
                FROM audio a
                WHERE a.classification_id = ?
                AND a.is_deleted = 0
                AND a.is_review = 1
                ORDER BY a.create_time DESC
            `, [classification.id]);

            // 处理音声URL，确保文件存在
            const processedAudios = audios
                .map(audio => ({
                    name: audio.name,
                    url: `/api/file/${audio.url}` // 转换为API路径
                }));

            // 只添加有音声的分类
            if (processedAudios.length > 0) {
                audioSections.push({
                    id: classification.id, // 直接使用数据库中的ID
                    title: classification.name,
                    items: processedAudios
                });
            }
        }

        logger.info(`获取分组音声列表: ${audioSections.length}个分类`);

        return {
            success: true,
            message: '获取分组音声列表成功',
            data: audioSections
        };

    } catch (error) {
        logger.error('获取分组音声列表失败:', error);
        return {
            success: false,
            message: '获取分组音声列表失败',
            code: 500
        };
    }
}

/**
 * 上传音声文件
 * @param {object} file - 上传的文件对象
 * @param {object} audioData - 音声数据
 * @param {number} userId - 用户ID
 * @param {number} userPermission - 用户权限等级
 * @returns {object} 上传结果
 */
export async function uploadAudio(file, audioData, userId, userPermission) {
    const { name, classificationId } = audioData;

    try {
        // 验证参数
        if (!name || !classificationId) {
            return {
                success: false,
                message: '音声名称和分类不能为空'
            };
        }

        // 验证分类是否存在且审核通过
        const classification = queryOne(`
            SELECT id, name, is_deleted, is_review
            FROM audio_classification
            WHERE id = ? AND is_deleted = 0 AND is_review = 1
        `, [classificationId]);

        if (!classification) {
            return {
                success: false,
                message: '音声分类不存在或未审核通过'
            };
        }

        // 处理文件上传
        if (!file) {
            return {
                success: false,
                message: '请上传音声文件'
            };
        }

        // 验证文件类型
        const allowedTypes = ['audio/mpeg', 'audio/mp3'];
        if (!allowedTypes.includes(file.mimetype)) {
            return {
                success: false,
                message: '不支持的文件类型，只允许上传MP3格式的音频文件'
            };
        }

        // 文件已经由multer保存到目标目录，直接使用
        const fileName = path.basename(file.path); // 获取文件名
        const filePath = path.join('audios', fileName).replace(/\\/g, '/');

        // 根据用户权限决定是否需要审核
        // 管理员(2)和超级管理员(1)直接通过审核，普通用户(3)需要审核
        const isReview = userPermission <= 2 ? 1 : 0;

        // 插入数据库
        const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp
        const result = insert(`
            INSERT INTO audio (classification_id, user_id, name, url, is_review, create_time, update_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [classificationId, userId, name, filePath, isReview, currentTime, currentTime]);

        const message = isReview === 1 ? '音声上传成功' : '音声上传成功，等待审核';

        logger.info(`音声上传成功: ${name} (${fileName}) by user ${userId} (审核状态: ${isReview})`);

        return {
            success: true,
            message: message,
            data: {
                audioId: result.lastInsertRowid,
                name: name,
                url: filePath,
                classification: classification.name,
                isReview: isReview
            }
        };

    } catch (error) {
        logger.error('音声上传失败:', error);
        return {
            success: false,
            message: '音声上传失败，请稍后重试',
            code: 500
        };
    }
}

/**
 * 获取音声管理数据（包含分类和音频列表）- 管理员专用
 * @returns {object} 音声分类及音频数据
 */
export async function getAudiosForAdmin() {
    try {
        // 获取所有音声分类（包括待审核的）
        const classifications = queryAll(`
            SELECT
                ac.id,
                ac.user_id,
                ac.name,
                ac.is_review,
                ac.create_time,
                ac.update_time,
                u.name as user_name
            FROM audio_classification ac
            LEFT JOIN user u ON ac.user_id = u.id
            WHERE ac.is_deleted = 0
            ORDER BY ac.create_time DESC
        `);

        // 为每个分类获取其音频
        const audioCategories = [];
        for (const classification of classifications) {
            const audios = queryAll(`
                SELECT
                    a.id,
                    a.classification_id,
                    a.user_id,
                    a.name,
                    a.url,
                    a.is_review,
                    a.create_time,
                    a.update_time,
                    u.name as user_name
                FROM audio a
                LEFT JOIN user u ON a.user_id = u.id
                WHERE a.classification_id = ? AND a.is_deleted = 0
                ORDER BY a.create_time DESC
            `, [classification.id]);

            // 处理音频URL，确保文件存在
            const processedAudios = audios.map(audio => ({
                id: audio.id,
                classification_id: audio.classification_id,
                user_id: audio.user_id,
                user_name: audio.user_name,
                name: audio.name,
                url: `/api/file/${audio.url}`,
                is_review: audio.is_review,
                create_time: audio.create_time,
                update_time: audio.update_time
            }));

            audioCategories.push({
                id: classification.id,
                name: classification.name,
                user_id: classification.user_id,
                user_name: classification.user_name,
                is_review: classification.is_review,
                create_time: classification.create_time,
                update_time: classification.update_time,
                audios: processedAudios
            });
        }

        logger.info(`获取音声管理数据: ${audioCategories.length}个分类`);

        return {
            success: true,
            message: '获取音声管理数据成功',
            data: audioCategories
        };

    } catch (error) {
        logger.error('获取音声管理数据失败:', error);
        return {
            success: false,
            message: '获取音声管理数据失败',
            code: 500
        };
    }
}

/**
 * 审核音声
 * @param {number} audioId - 音声ID
 * @param {number} isReview - 审核状态 (0:未审核, 1:审核通过, 2:审核不通过)
 * @param {number} adminId - 管理员ID
 * @returns {object} 审核结果
 */
export async function reviewAudio(audioId, isReview, adminId) {
    try {
        // 验证参数
        if (![0, 1, 2].includes(isReview)) {
            return {
                success: false,
                message: '无效的审核状态'
            };
        }

        // 检查音声是否存在
        const audio = queryOne(`
            SELECT id, name, is_review
            FROM audio
            WHERE id = ? AND is_deleted = 0
        `, [audioId]);

        if (!audio) {
            return {
                success: false,
                message: '音声不存在',
                code: 404
            };
        }

        // 更新审核状态
        const updateResult = update(`
            UPDATE audio
            SET is_review = ?, update_time = ?
            WHERE id = ?
        `, [isReview, Math.floor(Date.now() / 1000), audioId]);

        if (updateResult.changes === 0) {
            return {
                success: false,
                message: '审核失败'
            };
        }

        logger.info(`音声审核: ID ${audioId} 状态 ${audio.is_review} -> ${isReview} by admin ${adminId}`);

        return {
            success: true,
            message: '音声审核成功',
            data: {
                audioId: audioId,
                oldReview: audio.is_review,
                newReview: isReview
            }
        };

    } catch (error) {
        logger.error('音声审核失败:', error);
        return {
            success: false,
            message: '音声审核失败',
            code: 500
        };
    }
}

/**
 * 修改音声信息
 * @param {number} audioId - 音声ID
 * @param {object} updateData - 更新数据
 * @param {string} updateData.name - 音声名称
 * @param {number} updateData.classification_id - 分类ID
 * @param {number} adminId - 管理员ID
 * @returns {object} 修改结果
 */
export async function updateAudio(audioId, updateData, adminId) {
    try {
        const { name, classification_id } = updateData;

        // 验证参数
        if (!name || name.trim().length === 0) {
            return {
                success: false,
                message: '音声名称不能为空'
            };
        }

        // 检查音声是否存在
        const audio = queryOne(`
            SELECT id, name, classification_id
            FROM audio
            WHERE id = ? AND is_deleted = 0
        `, [audioId]);

        if (!audio) {
            return {
                success: false,
                message: '音声不存在',
                code: 404
            };
        }

        // 如果提供了分类ID，检查分类是否存在
        if (classification_id !== undefined) {
            const classification = queryOne(`
                SELECT id FROM audio_classification
                WHERE id = ? AND is_deleted = 0
            `, [classification_id]);

            if (!classification) {
                return {
                    success: false,
                    message: '音声分类不存在'
                };
            }
        }

        // 更新音声信息
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name.trim());
        }

        if (classification_id !== undefined) {
            updateFields.push('classification_id = ?');
            updateValues.push(classification_id);
        }

        if (updateFields.length === 0) {
            return {
                success: false,
                message: '没有需要更新的字段'
            };
        }

        updateFields.push('update_time = ?');
        updateValues.push(Math.floor(Date.now() / 1000));
        updateValues.push(audioId);

        const updateResult = update(`
            UPDATE audio
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        if (updateResult.changes === 0) {
            return {
                success: false,
                message: '音声更新失败'
            };
        }

        logger.info(`音声更新: ID ${audioId} by admin ${adminId}`);

        return {
            success: true,
            message: '音声更新成功',
            data: {
                audioId: audioId,
                updatedFields: updateFields.filter(field => !field.includes('update_time'))
            }
        };

    } catch (error) {
        logger.error('音声更新失败:', error);
        return {
            success: false,
            message: '音声更新失败',
            code: 500
        };
    }
}

/**
 * 删除音声（软删除）
 * @param {number} audioId - 音声ID
 * @param {number} adminId - 管理员ID
 * @returns {object} 删除结果
 */
export async function deleteAudio(audioId, adminId) {
    try {
        // 检查音声是否存在
        const audio = queryOne(`
            SELECT id, name, is_deleted
            FROM audio
            WHERE id = ?
        `, [audioId]);

        if (!audio) {
            return {
                success: false,
                message: '音声不存在',
                code: 404
            };
        }

        if (audio.is_deleted) {
            return {
                success: false,
                message: '音声已被删除'
            };
        }

        // 软删除音声
        const deleteResult = softDelete('audio', { id: audioId });

        if (deleteResult.changes === 0) {
            return {
                success: false,
                message: '音声删除失败'
            };
        }

        logger.info(`音声软删除: ID ${audioId} (${audio.name}) by admin ${adminId}`);

        return {
            success: true,
            message: '音声删除成功'
        };

    } catch (error) {
        logger.error('音声删除失败:', error);
        return {
            success: false,
            message: '音声删除失败',
            code: 500
        };
    }
}

/**
 * 修改音声分类信息
 * @param {number} classificationId - 分类ID
 * @param {object} updateData - 更新数据
 * @param {string} updateData.name - 分类名称
 * @param {number} adminId - 管理员ID
 * @returns {object} 修改结果
 */
export async function updateAudioClassification(classificationId, updateData, adminId) {
    try {
        const { name } = updateData;

        // 验证参数
        if (!name || name.trim().length === 0) {
            return {
                success: false,
                message: '分类名称不能为空'
            };
        }

        if (name.length > 50) {
            return {
                success: false,
                message: '分类名称不能超过50个字符'
            };
        }

        // 检查分类是否存在
        const classification = queryOne(`
            SELECT id, name
            FROM audio_classification
            WHERE id = ? AND is_deleted = 0
        `, [classificationId]);

        if (!classification) {
            return {
                success: false,
                message: '音声分类不存在',
                code: 404
            };
        }

        // 检查新名称是否与其他分类重复（审核通过的）
        const existingClassification = queryOne(`
            SELECT id FROM audio_classification
            WHERE name = ? AND is_deleted = 0 AND id != ?
        `, [name.trim(), classificationId]);

        if (existingClassification) {
            return {
                success: false,
                message: '该分类名称已存在'
            };
        }

        // 更新分类信息
        const updateResult = update(`
            UPDATE audio_classification
            SET name = ?, update_time = ?
            WHERE id = ?
        `, [name.trim(), Math.floor(Date.now() / 1000), classificationId]);

        if (updateResult.changes === 0) {
            return {
                success: false,
                message: '音声分类更新失败'
            };
        }

        logger.info(`音声分类更新: ID ${classificationId} (${classification.name} -> ${name.trim()}) by admin ${adminId}`);

        return {
            success: true,
            message: '音声分类更新成功',
            data: {
                classificationId: classificationId,
                oldName: classification.name,
                newName: name.trim()
            }
        };

    } catch (error) {
        logger.error('音声分类更新失败:', error);
        return {
            success: false,
            message: '音声分类更新失败',
            code: 500
        };
    }
}

/**
 * 删除音声分类（软删除）
 * @param {number} classificationId - 分类ID
 * @param {number} adminId - 管理员ID
 * @returns {object} 删除结果
 */
export async function deleteAudioClassification(classificationId, adminId) {
    try {
        // 检查分类是否存在
        const classification = queryOne(`
            SELECT id, name, is_deleted
            FROM audio_classification
            WHERE id = ?
        `, [classificationId]);

        if (!classification) {
            return {
                success: false,
                message: '音声分类不存在',
                code: 404
            };
        }

        if (classification.is_deleted) {
            return {
                success: false,
                message: '音声分类已被删除'
            };
        }

        // 检查分类下是否有音频
        const audioCountResult = queryOne(`
            SELECT COUNT(*) as count
            FROM audio
            WHERE classification_id = ? AND is_deleted = 0
        `, [classificationId]);
        const audioCount = audioCountResult ? audioCountResult.count : 0;

        if (audioCount > 0) {
            return {
                success: false,
                message: `该分类下还有${audioCount}个音频，无法删除`
            };
        }

        // 软删除分类
        const deleteResult = softDelete('audio_classification', { id: classificationId });

        if (deleteResult.changes === 0) {
            return {
                success: false,
                message: '音声分类删除失败'
            };
        }

        logger.info(`音声分类软删除: ID ${classificationId} (${classification.name}) by admin ${adminId}`);

        return {
            success: true,
            message: '音声分类删除成功'
        };

    } catch (error) {
        logger.error('音声分类删除失败:', error);
        return {
            success: false,
            message: '音声分类删除失败',
            code: 500
        };
    }
}

