import fs from 'fs';
import path from 'path';
import { queryOne, queryAll, insert, update, remove } from '../method/database.js';
import { createNotification } from '../method/notification.js';

const logger = global.logger;

/**
 * 上传企划文档
 * @param {object} file - 上传的文件对象
 * @param {object} documentData - 文档数据
 * @param {number} userId - 上传者ID
 * @param {number} permission - 上传者权限
 * @param {string} originalName - 原始文件名
 * @returns {object} 上传结果
 */
export async function uploadPlanDocument(file, documentData, userId, permission, originalName = null) {
  try {
    if (!file) {
      return {
        success: false,
        message: '请上传文档文件'
      };
    }

    if (!documentData.title || documentData.title.trim().length === 0) {
      return {
        success: false,
        message: '文档标题不能为空'
      };
    }

    const allowedTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        success: false,
        message: '不支持的文件类型，只允许上传Word文档'
      };
    }

    const fileName = path.basename(file.path);
    const filePath = path.join('docs', fileName).replace(/\\/g, '/');
    const displayName = originalName || file.originalname;

    // 权限判断：管理员(1)和超级管理员(2)上传直接通过审核，普通成员(3)需要审核
    const isReview = (permission === 1 || permission === 2) ? 1 : 0;

    if (documentData.isCurrent) {
      update('UPDATE plan_document SET is_current = 0');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const result = insert(
      `INSERT INTO plan_document (title, file_path, file_name, upload_time, uploader_id, is_current, is_review)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        documentData.title.trim(),
        filePath,
        displayName,
        currentTime,
        userId,
        documentData.isCurrent ? 1 : 0,
        isReview
      ]
    );

    logger.info(`文档上传成功: ${documentData.title} (${displayName}) by user ${userId}, 审核状态: ${isReview}`);

    return {
      success: true,
      message: isReview === 1 ? '文档上传成功' : '文档上传成功，等待管理员审核',
      data: {
        id: result.lastInsertRowid,
        title: documentData.title.trim(),
        fileName: displayName,
        filePath: filePath,
        uploadTime: currentTime,
        uploaderId: userId,
        isCurrent: documentData.isCurrent ? 1 : 0,
        isReview: isReview
      }
    };

  } catch (error) {
    logger.error('文档上传失败:', error);
    return {
      success: false,
      message: '文档上传失败，请稍后重试',
      code: 500
    };
  }
}

/**
 * 获取企划文档列表（公开接口，只返回审核通过的）
 * @returns {object} 文档列表
 */
export async function getPlanDocuments() {
  try {
    const documents = queryAll(
      `SELECT id, title, file_name, file_path, upload_time, uploader_id, is_current
       FROM plan_document
       WHERE deleted = 0 AND is_review = 1
       ORDER BY upload_time DESC`
    );

    const processedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.file_name,
      filePath: doc.file_path,
      uploadTime: doc.upload_time,
      uploaderId: doc.uploader_id,
      isCurrent: doc.is_current === 1
    }));

    return {
      success: true,
      message: '获取企划文档列表成功',
      data: processedDocuments
    };
  } catch (error) {
    logger.error('获取企划文档列表失败:', error);
    return { success: false, message: '获取失败，请稍后重试', code: 500 };
  }
}

/**
 * 删除企划文档
 * @param {number} documentId - 文档ID
 * @param {number} userId - 操作者ID
 * @param {number} permission - 操作者权限
 * @returns {object} 删除结果
 */
export async function deletePlanDocument(documentId, userId, permission) {
  try {
    const document = queryOne(`
        SELECT id, title, file_path
        FROM plan_document
        WHERE id = ? AND deleted = 0
    `, [documentId]);

    if (!document) {
      return {
        success: false,
        message: '文档不存在',
        code: 404
      };
    }

    const filePath = path.join(process.cwd(), 'data', 'document', document.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const deleteResult = update(
      'UPDATE plan_document SET deleted = 1, update_time = ? WHERE id = ?',
      [currentTime, documentId]
    );

    if (deleteResult.changes === 0) {
      return {
        success: false,
        message: '文档删除失败'
      };
    }

    logger.info(`文档删除: ID ${documentId} (${document.title}) by user ${userId}`);

    return {
      success: true,
      message: '文档删除成功'
    };

  } catch (error) {
    logger.error('文档删除失败:', error);
    return {
      success: false,
      message: '文档删除失败',
      code: 500
    };
  }
}

/**
 * 设置当前企划文档
 * @param {number} documentId - 文档ID
 * @param {number} userId - 操作者ID
 * @param {number} permission - 操作者权限
 * @returns {object} 设置结果
 */
export async function setCurrentPlanDocument(documentId, userId, permission) {
  try {
    const document = queryOne(
      'SELECT id, is_review FROM plan_document WHERE id = ? AND deleted = 0',
      [documentId]
    );

    if (!document) {
      return { success: false, message: '文档不存在', code: 404 };
    }

    // 只有审核通过的文档才能设为当前文档
    if (document.is_review !== 1) {
      return { success: false, message: '只有审核通过的文档才能设为当前文档', code: 400 };
    }

    update('UPDATE plan_document SET is_current = 0 WHERE deleted = 0');
    update('UPDATE plan_document SET is_current = 1 WHERE id = ? AND deleted = 0', [documentId]);

    return { success: true, message: '已设置为当前文档' };
  } catch (error) {
    logger.error('设置当前文档失败:', error);
    return { success: false, message: '设置失败，请稍后再试', code: 500 };
  }
}

/**
 * 获取当前企划文档
 * @returns {object} 当前文档
 */
export async function getCurrentPlanDocument() {
  try {
    const document = queryOne(
      `SELECT id, title, file_name, file_path, upload_time, uploader_id, is_current
       FROM plan_document
       WHERE is_current = 1 AND deleted = 0 AND is_review = 1
       LIMIT 1`
    );

    if (!document) {
      return {
        success: true,
        data: null
      };
    }

    return {
      success: true,
      message: '获取当前文档成功',
      data: {
        id: document.id,
        title: document.title,
        fileName: document.file_name,
        filePath: document.file_path,
        uploadTime: document.upload_time,
        uploaderId: document.uploader_id,
        isCurrent: document.is_current === 1
      }
    };
  } catch (error) {
    logger.error('获取当前文档失败:', error);
    return { success: false, message: '获取失败，请稍后重试', code: 500 };
  }
}

/**
 * 获取企划文档管理列表（管理员用，包含所有审核状态）
 * @returns {object} 文档列表
 */
export async function getPlanDocumentsForAdmin() {
  try {
    const documents = queryAll(
      `SELECT pd.id, pd.title, pd.file_name, pd.file_path, pd.upload_time, pd.uploader_id, 
              pd.is_current, pd.is_review, u.name as uploader_name
       FROM plan_document pd
       LEFT JOIN user u ON pd.uploader_id = u.id
       WHERE pd.deleted = 0
       ORDER BY pd.upload_time DESC`
    );

    const processedDocuments = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.file_name,
      filePath: doc.file_path,
      uploadTime: doc.upload_time,
      uploaderId: doc.uploader_id,
      uploaderName: doc.uploader_name,
      isCurrent: doc.is_current === 1,
      isReview: doc.is_review
    }));

    return {
      success: true,
      message: '获取企划文档管理数据成功',
      data: processedDocuments
    };
  } catch (error) {
    logger.error('获取企划文档管理数据失败:', error);
    return { success: false, message: '获取失败，请稍后重试', code: 500 };
  }
}

/**
 * 审核企划文档
 * @param {number} documentId - 文档ID
 * @param {number} isReview - 审核状态：1-通过，2-拒绝
 * @param {number} adminId - 管理员ID
 * @returns {object} 审核结果
 */
export async function reviewPlanDocument(documentId, isReview, adminId) {
  try {
    // 验证参数
    if (![1, 2].includes(isReview)) {
      return {
        success: false,
        message: '无效的审核状态',
        code: 400
      };
    }

    // 检查文档是否存在
    const document = queryOne(`
      SELECT id, title, uploader_id, is_review
      FROM plan_document
      WHERE id = ? AND deleted = 0
    `, [documentId]);

    if (!document) {
      return {
        success: false,
        message: '文档不存在',
        code: 404
      };
    }

    // 更新审核状态
    const updateResult = update(`
      UPDATE plan_document
      SET is_review = ?, update_time = ?
      WHERE id = ?
    `, [isReview, Math.floor(Date.now() / 1000), documentId]);

    if (updateResult.changes === 0) {
      return {
        success: false,
        message: '审核失败'
      };
    }

    logger.info(`企划文档审核: ID ${documentId} 状态 ${document.is_review} -> ${isReview} by admin ${adminId}`);

    // 发送审核通知给用户
    const statusText = { 0: '待审核', 1: '审核通过', 2: '审核未通过' };
    const statusDesc = {
      0: '您的企划文档已撤销审核，请修改后重新提交',
      1: '恭喜！您的企划文档已通过审核，现在可以被其他用户查看',
      2: '您的企划文档未通过审核，请修改后重新提交'
    };

    await createNotification(
      document.uploader_id,
      '企划文档审核通知',
      `您的企划文档「${document.title}」${statusDesc[isReview] || statusText[isReview]}`,
      'review'
    );

    return {
      success: true,
      message: '审核成功',
      data: {
        documentId: documentId,
        oldReview: document.is_review,
        newReview: isReview
      }
    };

  } catch (error) {
    logger.error('企划文档审核失败:', error);
    return {
      success: false,
      message: '审核失败',
      code: 500
    };
  }
}

/**
 * 修改企划文档信息
 * @param {number} documentId - 文档ID
 * @param {object} updateData - 更新数据
 * @param {number} adminId - 管理员ID
 * @returns {object} 修改结果
 */
export async function updatePlanDocument(documentId, updateData, adminId) {
  try {
    const { title } = updateData;

    // 验证参数
    if (!title || title.trim().length === 0) {
      return {
        success: false,
        message: '文档标题不能为空'
      };
    }

    // 检查文档是否存在
    const document = queryOne(`
      SELECT id, title
      FROM plan_document
      WHERE id = ? AND deleted = 0
    `, [documentId]);

    if (!document) {
      return {
        success: false,
        message: '文档不存在',
        code: 404
      };
    }

    // 更新文档信息
    const updateResult = update(`
      UPDATE plan_document
      SET title = ?, update_time = ?
      WHERE id = ?
    `, [title.trim(), Math.floor(Date.now() / 1000), documentId]);

    if (updateResult.changes === 0) {
      return {
        success: false,
        message: '修改失败'
      };
    }

    logger.info(`企划文档修改: ID ${documentId} (${document.title} -> ${title.trim()}) by admin ${adminId}`);

    return {
      success: true,
      message: '修改成功',
      data: {
        documentId: documentId,
        oldTitle: document.title,
        newTitle: title.trim()
      }
    };

  } catch (error) {
    logger.error('企划文档修改失败:', error);
    return {
      success: false,
      message: '修改失败',
      code: 500
    };
  }
}
