import path from 'path';
import { fileExists } from '../method/file-utils.js';
import { queryOne, queryAll, insert, update, remove, softDelete } from '../method/database.js';

/**
 * 相册服务 - 处理相册和照片相关的业务逻辑
 */

/**
 * 获取相册和最新照片数据
 * @returns {object} 包含相册列表和最新照片的数据
 */
export async function getAlbumsWithLatestPhotos() {
    try {
        // 获取所有审核通过且未删除的相册
        const albums = queryAll(`
            SELECT
                pa.id,
                pa.name,
                pa.introduction,
                pa.create_time,
                u.name as user_name
            FROM photo_album pa
            LEFT JOIN user u ON pa.user_id = u.id
            WHERE pa.is_deleted = 0 AND pa.is_review = 1
            ORDER BY pa.create_time DESC
        `);

        // 为每个相册获取最新一张审核通过的照片和照片总数
        const photoAlbums = [];
        for (const album of albums) {
            // 获取该相册下审核通过且未删除的照片总数
            const photoCountResult = queryOne(`
                SELECT COUNT(*) as count
                FROM photo
                WHERE album_id = ? AND is_deleted = 0 AND is_review = 1
            `, [album.id]);
            const photoCount = photoCountResult ? photoCountResult.count : 0;

            // 获取该相册下审核通过且未删除的最新照片
            const latestPhoto = queryOne(`
                SELECT url
                FROM photo
                WHERE album_id = ? AND is_deleted = 0 AND is_review = 1
                ORDER BY create_time DESC
                LIMIT 1
            `, [album.id]);

            let img = '';
            if (latestPhoto && fileExists(latestPhoto.url)) {
                img = `/api/file/${latestPhoto.url}`;
            }

            photoAlbums.push({
                id: album.id,
                title: album.name,
                img: img,
                tip: album.introduction || '',
                photoCount: photoCount
            });
        }

        // 获取最新的10张审核通过的照片
        const latestPhotos = queryAll(`
            SELECT
                p.id,
                p.album_id,
                p.name,
                p.url,
                pa.name as album_name
            FROM photo p
            LEFT JOIN photo_album pa ON p.album_id = pa.id
            WHERE p.is_deleted = 0 AND p.is_review = 1
            AND pa.is_deleted = 0 AND pa.is_review = 1
            ORDER BY p.create_time DESC
            LIMIT 10
        `);

        // 处理最新照片数据
        const processedLatestPhotos = latestPhotos
            .filter(photo => fileExists(photo.url))
            .map(photo => ({
                id: photo.id,
                photoAlbumId: photo.album_id,
                title: photo.name,
                img: `/api/file/${photo.url}`
            }));

        const result = {
            photoAlbum: photoAlbums,
            latestPhotos: processedLatestPhotos
        };

        logger.info(`获取相册数据: ${photoAlbums.length}个相册, ${processedLatestPhotos.length}张最新照片`);

        return {
            success: true,
            message: '获取相册数据成功',
            data: result
        };

    } catch (error) {
        logger.error('获取相册数据失败:', error);
        return {
            success: false,
            message: '获取相册数据失败',
            code: 500
        };
    }
}

/**
 * 获取指定相册的照片列表
 * @param {number} albumId - 相册ID (必需)
 * @returns {object} 照片列表
 */
export async function getPhotos(albumId) {
    try {
        // 验证相册是否存在且审核通过
        const album = queryOne(`
            SELECT id, name, introduction, is_deleted, is_review
            FROM photo_album
            WHERE id = ? AND is_deleted = 0 AND is_review = 1
        `, [albumId]);

        if (!album) {
            return {
                success: false,
                message: '相册不存在或未审核通过',
                code: 404
            };
        }

        // 获取相册中的所有审核通过的照片
        const photos = queryAll(`
            SELECT
                p.id,
                p.name,
                p.url
            FROM photo p
            WHERE p.album_id = ?
            AND p.is_deleted = 0 AND p.is_review = 1
            ORDER BY p.create_time DESC
        `, [albumId]);

        // 处理照片URL，确保文件存在
        const processedPhotos = photos
            .filter(photo => fileExists(photo.url))
            .map(photo => ({
                id: photo.id,
                name: photo.name,
                url: `/api/file/${photo.url}`
            }));

        logger.info(`获取照片列表: 相册 ${albumId}(${album.name}), 共${processedPhotos.length}张照片`);

        return {
            success: true,
            message: '获取照片列表成功',
            data: {
                album: {
                    id: album.id,
                    name: album.name,
                    introduction: album.introduction || ''
                },
                photos: processedPhotos
            }
        };

    } catch (error) {
        logger.error('获取照片列表失败:', error);
        return {
            success: false,
            message: '获取照片列表失败',
            code: 500
        };
    }
}

/**
 * 创建相册
 * @param {object} albumData - 相册数据
 * @param {string} albumData.name - 相册名称
 * @param {string} albumData.introduction - 相册简介
 * @param {number} userId - 创建者用户ID
 * @returns {object} 创建结果
 */
export async function createAlbum(albumData, userId) {
    const { name, introduction } = albumData;

    try {
        // 验证参数
        if (!name || name.trim().length === 0) {
            return {
                success: false,
                message: '相册名称不能为空'
            };
        }

        if (name.length > 100) {
            return {
                success: false,
                message: '相册名称不能超过100个字符'
            };
        }

        if (introduction && introduction.length > 500) {
            return {
                success: false,
                message: '相册简介不能超过500个字符'
            };
        }

        // 检查用户是否已经创建过同名相册
        const existingAlbum = queryOne(`
            SELECT id FROM photo_album
            WHERE name = ? AND user_id = ? AND is_deleted = 0
        `, [name.trim(), userId]);

        if (existingAlbum) {
            return {
                success: false,
                message: '您已经创建过同名的相册'
            };
        }

        // 创建相册
        const currentTime = Math.floor(Date.now() / 1000);
        const result = insert(`
            INSERT INTO photo_album (user_id, name, introduction, is_review, create_time, update_time)
            VALUES (?, ?, ?, 1, ?, ?)
        `, [userId, name.trim(), introduction?.trim() || '', currentTime, currentTime]);

        logger.info(`相册创建成功: ${name} by user ${userId}`);

        return {
            success: true,
            message: '相册创建成功',
            data: {
                albumId: result.lastInsertRowid,
                name: name.trim(),
                introduction: introduction?.trim() || ''
            }
        };

    } catch (error) {
        logger.error('相册创建失败:', error);
        return {
            success: false,
            message: '相册创建失败，请稍后重试',
            code: 500
        };
    }
}

/**
 * 上传照片
 * @param {object} file - 上传的文件对象
 * @param {object} photoData - 照片数据
 * @param {number} photoData.albumId - 相册ID
 * @param {string} photoData.name - 照片名称
 * @param {number} userId - 上传者用户ID
 * @param {number} userPermission - 上传者权限等级
 * @returns {object} 上传结果
 */
export async function uploadPhoto(file, photoData, userId, userPermission) {
    const { albumId, name } = photoData;

    try {
        // 验证参数
        if (!albumId) {
            return {
                success: false,
                message: '相册ID不能为空'
            };
        }

        if (!name || name.trim().length === 0) {
            return {
                success: false,
                message: '照片名称不能为空'
            };
        }

        // 验证相册是否存在且审核通过
        const album = queryOne(`
            SELECT id, name, is_deleted, is_review
            FROM photo_album
            WHERE id = ? AND is_deleted = 0 AND is_review = 1
        `, [albumId]);

        if (!album) {
            return {
                success: false,
                message: '相册不存在或未审核通过'
            };
        }

        // 处理文件上传
        if (!file) {
            return {
                success: false,
                message: '请上传照片文件'
            };
        }

        // 验证文件类型
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return {
                success: false,
                message: '不支持的文件类型，只允许上传图片文件'
            };
        }

        // 文件已经由multer保存，使用实际保存的路径
        const fileName = path.basename(file.path); // 获取文件名
        const filePath = path.join('images', fileName).replace(/\\/g, '/');

        // 根据用户权限决定是否需要审核
        // 管理员(2)和超级管理员(1)直接通过审核，普通用户(3)需要审核
        const isReview = userPermission <= 2 ? 1 : 0;

        // 插入数据库
        const currentTime = Math.floor(Date.now() / 1000);
        const result = insert(`
            INSERT INTO photo (album_id, user_id, name, url, is_review, create_time, update_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [albumId, userId, name.trim(), filePath, isReview, currentTime, currentTime]);

        const message = isReview === 1 ? '照片上传成功' : '照片上传成功，等待审核';

        logger.info(`照片上传成功: ${name} (${fileName}) to album ${albumId} by user ${userId} (审核状态: ${isReview})`);

        return {
            success: true,
            message: message,
            data: {
                photoId: result.lastInsertRowid,
                name: name.trim(),
                url: filePath,
                album: album.name,
                isReview: isReview
            }
        };

    } catch (error) {
        logger.error('照片上传失败:', error);
        return {
            success: false,
            message: '照片上传失败，请稍后重试',
            code: 500
        };
    }
}

/**
 * 获取相册管理数据（包含相册和照片列表）- 管理员专用
 * @returns {object} 相册及照片数据
 */
export async function getAlbumsForAdmin() {
    try {
        // 获取所有相册（包括待审核的）
        const albums = queryAll(`
            SELECT
                pa.id,
                pa.user_id,
                pa.name,
                pa.introduction,
                pa.is_review,
                pa.create_time,
                pa.update_time,
                u.name as user_name
            FROM photo_album pa
            LEFT JOIN user u ON pa.user_id = u.id
            WHERE pa.is_deleted = 0
            ORDER BY pa.create_time DESC
        `);

        // 为每个相册获取其照片
        const albumTags = [];
        for (const album of albums) {
            const photos = queryAll(`
                SELECT
                    p.id,
                    p.album_id,
                    p.user_id,
                    p.name,
                    p.url,
                    p.is_review,
                    p.create_time,
                    p.update_time,
                    u.name as user_name
                FROM photo p
                LEFT JOIN user u ON p.user_id = u.id
                WHERE p.album_id = ? AND p.is_deleted = 0
                ORDER BY p.create_time DESC
            `, [album.id]);

            // 处理照片URL
            const processedPhotos = photos.map(photo => ({
                id: photo.id,
                album_id: photo.album_id,
                user_id: photo.user_id,
                user_name: photo.user_name,
                name: photo.name,
                url: `/api/file/${photo.url}`,
                is_review: photo.is_review,
                create_time: photo.create_time,
                update_time: photo.update_time
            }));

            albumTags.push({
                id: album.id,
                user_id: album.user_id,
                user_name: album.user_name,
                name: album.name,
                introduction: album.introduction || '',
                is_review: album.is_review,
                create_time: album.create_time,
                update_time: album.update_time,
                photos: processedPhotos
            });
        }

        logger.info(`获取相册管理数据: ${albumTags.length}个相册`);

        return {
            success: true,
            message: '获取相册管理数据成功',
            data: albumTags
        };

    } catch (error) {
        logger.error('获取相册管理数据失败:', error);
        return {
            success: false,
            message: '获取相册管理数据失败',
            code: 500
        };
    }
}

/**
 * 审核相册
 * @param {number} albumId - 相册ID
 * @param {number} isReview - 审核状态 (0:未审核, 1:审核通过, 2:审核不通过)
 * @param {number} adminId - 管理员ID
 * @returns {object} 审核结果
 */
export async function reviewAlbum(albumId, isReview, adminId) {
    try {
        // 验证参数
        if (![0, 1, 2].includes(isReview)) {
            return {
                success: false,
                message: '无效的审核状态'
            };
        }

        // 检查相册是否存在
        const album = queryOne(`
            SELECT id, name, is_review
            FROM photo_album
            WHERE id = ? AND is_deleted = 0
        `, [albumId]);

        if (!album) {
            return {
                success: false,
                message: '相册不存在',
                code: 404
            };
        }

        // 更新审核状态
        const updateResult = update(`
            UPDATE photo_album
            SET is_review = ?, update_time = ?
            WHERE id = ?
        `, [isReview, Math.floor(Date.now() / 1000), albumId]);

        if (updateResult.changes === 0) {
            return {
                success: false,
                message: '审核失败'
            };
        }

        logger.info(`相册审核: ID ${albumId} 状态 ${album.is_review} -> ${isReview} by admin ${adminId}`);

        return {
            success: true,
            message: '相册审核成功',
            data: {
                albumId: albumId,
                oldReview: album.is_review,
                newReview: isReview
            }
        };

    } catch (error) {
        logger.error('相册审核失败:', error);
        return {
            success: false,
            message: '相册审核失败',
            code: 500
        };
    }
}

/**
 * 修改相册信息
 * @param {number} albumId - 相册ID
 * @param {object} updateData - 更新数据
 * @param {string} updateData.name - 相册名称
 * @param {string} updateData.introduction - 相册简介
 * @param {number} adminId - 管理员ID
 * @returns {object} 修改结果
 */
export async function updateAlbum(albumId, updateData, adminId) {
    try {
        const { name, introduction } = updateData;

        // 验证参数
        if (!name || name.trim().length === 0) {
            return {
                success: false,
                message: '相册名称不能为空'
            };
        }

        // 检查相册是否存在
        const album = queryOne(`
            SELECT id, name, introduction
            FROM photo_album
            WHERE id = ? AND is_deleted = 0
        `, [albumId]);

        if (!album) {
            return {
                success: false,
                message: '相册不存在',
                code: 404
            };
        }

        // 更新相册信息
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name.trim());
        }

        if (introduction !== undefined) {
            updateFields.push('introduction = ?');
            updateValues.push(introduction.trim());
        }

        if (updateFields.length === 0) {
            return {
                success: false,
                message: '没有需要更新的字段'
            };
        }

        updateFields.push('update_time = ?');
        updateValues.push(Math.floor(Date.now() / 1000));
        updateValues.push(albumId);

        const updateResult = update(`
            UPDATE photo_album
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        if (updateResult.changes === 0) {
            return {
                success: false,
                message: '相册更新失败'
            };
        }

        logger.info(`相册更新: ID ${albumId} by admin ${adminId}`);

        return {
            success: true,
            message: '相册更新成功',
            data: {
                albumId: albumId,
                updatedFields: updateFields.filter(field => !field.includes('update_time'))
            }
        };

    } catch (error) {
        logger.error('相册更新失败:', error);
        return {
            success: false,
            message: '相册更新失败',
            code: 500
        };
    }
}

/**
 * 删除相册（软删除）
 * @param {number} albumId - 相册ID
 * @param {number} adminId - 管理员ID
 * @returns {object} 删除结果
 */
export async function deleteAlbum(albumId, adminId) {
    try {
        // 检查相册是否存在
        const album = queryOne(`
            SELECT id, name, is_deleted
            FROM photo_album
            WHERE id = ?
        `, [albumId]);

        if (!album) {
            return {
                success: false,
                message: '相册不存在',
                code: 404
            };
        }

        if (album.is_deleted) {
            return {
                success: false,
                message: '相册已被删除'
            };
        }

        // 开始事务，确保同时删除相册和其下的所有照片
        const transaction = global.db.transaction(() => {
            // 软删除相册
            softDelete('photo_album', { id: albumId });

            // 软删除相册下的所有照片
            // 软删除相册下的所有照片
            update(`
                UPDATE photo
                SET is_deleted = 1, update_time = ?
                WHERE album_id = ?
            `, [Math.floor(Date.now() / 1000), albumId]);
        });

        transaction();

        logger.info(`相册软删除: ID ${albumId} (${album.name}) by admin ${adminId}`);

        return {
            success: true,
            message: '相册删除成功'
        };

    } catch (error) {
        logger.error('相册删除失败:', error);
        return {
            success: false,
            message: '相册删除失败',
            code: 500
        };
    }
}

/**
 * 审核照片
 * @param {number} photoId - 照片ID
 * @param {number} isReview - 审核状态 (0:未审核, 1:审核通过, 2:审核不通过)
 * @param {number} adminId - 管理员ID
 * @returns {object} 审核结果
 */
export async function reviewPhoto(photoId, isReview, adminId) {
    try {
        // 验证参数
        if (![0, 1, 2].includes(isReview)) {
            return {
                success: false,
                message: '无效的审核状态'
            };
        }

        // 检查照片是否存在
        const photo = queryOne(`
            SELECT id, name, is_review
            FROM photo
            WHERE id = ? AND is_deleted = 0
        `, [photoId]);

        if (!photo) {
            return {
                success: false,
                message: '照片不存在',
                code: 404
            };
        }

        // 更新审核状态
        const updateResult = update(`
            UPDATE photo
            SET is_review = ?, update_time = ?
            WHERE id = ?
        `, [isReview, Math.floor(Date.now() / 1000), photoId]);

        if (updateResult.changes === 0) {
            return {
                success: false,
                message: '审核失败'
            };
        }

        logger.info(`照片审核: ID ${photoId} 状态 ${photo.is_review} -> ${isReview} by admin ${adminId}`);

        return {
            success: true,
            message: '照片审核成功',
            data: {
                photoId: photoId,
                oldReview: photo.is_review,
                newReview: isReview
            }
        };

    } catch (error) {
        logger.error('照片审核失败:', error);
        return {
            success: false,
            message: '照片审核失败',
            code: 500
        };
    }
}

/**
 * 修改照片信息
 * @param {number} photoId - 照片ID
 * @param {object} updateData - 更新数据
 * @param {string} updateData.name - 照片名称
 * @param {number} updateData.album_id - 相册ID
 * @param {number} adminId - 管理员ID
 * @returns {object} 修改结果
 */
export async function updatePhoto(photoId, updateData, adminId) {
    try {
        const { name, album_id } = updateData;

        // 验证参数
        if (!name || name.trim().length === 0) {
            return {
                success: false,
                message: '照片名称不能为空'
            };
        }

        // 检查照片是否存在
        const photo = queryOne(`
            SELECT id, name, album_id
            FROM photo
            WHERE id = ? AND is_deleted = 0
        `, [photoId]);

        if (!photo) {
            return {
                success: false,
                message: '照片不存在',
                code: 404
            };
        }

        // 如果提供了相册ID，检查相册是否存在
        if (album_id !== undefined) {
            const album = queryOne(`
                SELECT id FROM photo_album
                WHERE id = ? AND is_deleted = 0
            `, [album_id]);

            if (!album) {
                return {
                    success: false,
                    message: '相册不存在'
                };
            }
        }

        // 更新照片信息
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name.trim());
        }

        if (album_id !== undefined) {
            updateFields.push('album_id = ?');
            updateValues.push(album_id);
        }

        if (updateFields.length === 0) {
            return {
                success: false,
                message: '没有需要更新的字段'
            };
        }

        updateFields.push('update_time = ?');
        updateValues.push(Math.floor(Date.now() / 1000));
        updateValues.push(photoId);

        const updateResult = update(`
            UPDATE photo
            SET ${updateFields.join(', ')}
            WHERE id = ?
        `, updateValues);

        if (updateResult.changes === 0) {
            return {
                success: false,
                message: '照片更新失败'
            };
        }

        logger.info(`照片更新: ID ${photoId} by admin ${adminId}`);

        return {
            success: true,
            message: '照片更新成功',
            data: {
                photoId: photoId,
                updatedFields: updateFields.filter(field => !field.includes('update_time'))
            }
        };

    } catch (error) {
        logger.error('照片更新失败:', error);
        return {
            success: false,
            message: '照片更新失败',
            code: 500
        };
    }
}

/**
 * 删除照片（软删除）
 * @param {number} photoId - 照片ID
 * @param {number} adminId - 管理员ID
 * @returns {object} 删除结果
 */
export async function deletePhoto(photoId, adminId) {
    try {
        // 检查照片是否存在
        const photo = queryOne(`
            SELECT id, name, is_deleted
            FROM photo
            WHERE id = ?
        `, [photoId]);

        if (!photo) {
            return {
                success: false,
                message: '照片不存在',
                code: 404
            };
        }

        if (photo.is_deleted) {
            return {
                success: false,
                message: '照片已被删除'
            };
        }

        // 软删除照片
        const deleteResult = softDelete('photo', { id: photoId });

        if (deleteResult.changes === 0) {
            return {
                success: false,
                message: '照片删除失败'
            };
        }

        logger.info(`照片软删除: ID ${photoId} (${photo.name}) by admin ${adminId}`);

        return {
            success: true,
            message: '照片删除成功'
        };

    } catch (error) {
        logger.error('照片删除失败:', error);
        return {
            success: false,
            message: '照片删除失败',
            code: 500
        };
    }
}
