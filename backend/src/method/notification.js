import { insert } from './database.js';

const logger = global.logger;

/**
 * 创建系统通知
 * @param {number} userId - 用户ID
 * @param {string} title - 标题
 * @param {string} content - 内容
 * @param {string} type - 类型: system|review|announcement|security|admin
 * @returns {Object} 创建结果
 */
export async function createNotification(userId, title, content, type = 'system') {
  try {
    const currentTime = Math.floor(Date.now() / 1000);

    insert(
      `INSERT INTO notification (user_id, title, content, type, is_read, is_deleted, create_time, update_time)
       VALUES (?, ?, ?, ?, 0, 0, ?, ?)`,
      [userId, title, content, type, currentTime, currentTime]
    );

    return { success: true, message: '通知创建成功' };
  } catch (error) {
    logger.error('创建通知失败:', error);
    return { success: false, message: '创建失败', code: 500 };
  }
}

/**
 * 通知所有管理员有新内容待审核
 * @param {string} contentType - 内容类型（音声/相册/照片等）
 * @param {string} contentName - 内容名称
 */
export async function notifyAdminsForReview(contentType, contentName) {
  try {
    const { queryAll } = await import('./database.js');

    // 获取所有管理员和超级管理员
    const admins = queryAll(`
      SELECT id FROM user
      WHERE permission IN (1, 2) AND is_deleted = 0 AND is_banned = 0
    `);

    // 批量发送通知
    const notificationPromises = admins.map(admin =>
      createNotification(
        admin.id,
        '待审核提醒',
        `有新的${contentType}「${contentName}」需要审核`,
        'review'
      )
    );

    await Promise.all(notificationPromises);
    logger.info(`待审核通知已发送给 ${admins.length} 位管理员`);
  } catch (error) {
    logger.error('发送管理员审核通知失败:', error);
  }
}

/**
 * 发送新公告通知给所有用户
 * @param {string} title - 公告标题
 */
export async function sendAnnouncementNotificationToAllUsers(title) {
  try {
    const { queryAll } = await import('./database.js');

    // 获取所有未删除的用户ID
    const users = queryAll('SELECT id FROM user WHERE is_deleted = 0');

    // 批量发送通知
    const notificationPromises = users.map(user =>
      createNotification(
        user.id,
        '新公告',
        `发布了新公告「${title}」，请前往查看`,
        'announcement'
      )
    );

    await Promise.all(notificationPromises);
    logger.info(`新公告通知已发送给 ${users.length} 位用户`);
  } catch (error) {
    logger.error('发送公告通知失败:', error);
  }
}
