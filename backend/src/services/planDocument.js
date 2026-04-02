import fs from 'fs';
import path from 'path';
import { queryOne, queryAll, insert, update, remove } from '../method/database.js';

const logger = global.logger;

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
    const filePath = path.join('plans', fileName).replace(/\\/g, '/');
    const displayName = originalName || file.originalname;

    if (documentData.isCurrent) {
      update('UPDATE plan_document SET is_current = 0');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const result = insert(
      `INSERT INTO plan_document (title, file_path, file_name, upload_time, uploader_id, is_current)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        documentData.title.trim(),
        filePath,
        displayName,
        currentTime,
        userId,
        documentData.isCurrent ? 1 : 0
      ]
    );

    logger.info(`文档上传成功: ${documentData.title} (${displayName}) by user ${userId}`);

    return {
      success: true,
      message: '文档上传成功',
      data: {
        id: result.lastInsertRowid,
        title: documentData.title.trim(),
        fileName: displayName,
        filePath: filePath,
        uploadTime: currentTime,
        uploaderId: userId,
        isCurrent: documentData.isCurrent ? 1 : 0
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

export async function getPlanDocuments() {
  try {
    const documents = queryAll(
      `SELECT id, title, file_name, file_path, upload_time, uploader_id, is_current
       FROM plan_document
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

export async function deletePlanDocument(documentId, userId, permission) {
  try {
    const document = queryOne(`
        SELECT id, title, file_path
        FROM plan_document
        WHERE id = ?
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

    const deleteResult = remove('DELETE FROM plan_document WHERE id = ?', [documentId]);

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

export async function setCurrentPlanDocument(documentId, userId, permission) {
  try {
    const document = queryOne(
      'SELECT id FROM plan_document WHERE id = ?',
      [documentId]
    );

    if (!document) {
      return { success: false, message: '文档不存在', code: 404 };
    }

    update('UPDATE plan_document SET is_current = 0');
    update('UPDATE plan_document SET is_current = 1 WHERE id = ?', [documentId]);

    return { success: true, message: '已设置为当前文档' };
  } catch (error) {
    logger.error('设置当前文档失败:', error);
    return { success: false, message: '设置失败，请稍后重试', code: 500 };
  }
}

export async function getCurrentPlanDocument() {
  try {
    const document = queryOne(
      `SELECT id, title, file_name, file_path, upload_time, uploader_id, is_current
       FROM plan_document
       WHERE is_current = 1
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

export async function getPlanDocumentsForAdmin() {
  try {
    const documents = queryAll(
      `SELECT pd.id, pd.title, pd.file_name, pd.file_path, pd.upload_time, pd.uploader_id, pd.is_current,
              u.name as uploader_name
       FROM plan_document pd
       LEFT JOIN user u ON pd.uploader_id = u.id
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
      isCurrent: doc.is_current === 1
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
