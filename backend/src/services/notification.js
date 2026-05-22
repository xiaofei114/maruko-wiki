import { queryOne, queryAll, insert, update } from '../method/database.js';

const logger = global.logger;

/**
 * 获取用户消息列表
 * @param {number} userId - 用户ID
 * @param {Object} pagination - 分页参数
 * @returns {Object} 消息列表
 */
export async function getUserNotifications(userId, pagination = { page: 1, pageSize: 10 }) {
  try {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const notifications = queryAll(
      `SELECT id, title, content, is_read as isRead, 
              create_time as createTime, type
       FROM notification
       WHERE user_id = ? AND is_deleted = 0
       ORDER BY create_time DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    const totalResult = queryOne(
      `SELECT COUNT(*) as total FROM notification WHERE user_id = ? AND is_deleted = 0`,
      [userId]
    );

    const unreadResult = queryOne(
      `SELECT COUNT(*) as count FROM notification WHERE user_id = ? AND is_read = 0 AND is_deleted = 0`,
      [userId]
    );

    return {
      success: true,
      data: {
        list: notifications.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          read: n.isRead === 1,
          time: n.createTime,
          type: n.type || 'system'
        })),
        pagination: {
          currentPage: page,
          pageSize,
          total: totalResult?.total || 0
        },
        unreadCount: unreadResult?.count || 0
      }
    };
  } catch (error) {
    logger.error('获取消息列表失败:', error);
    return { success: false, message: '获取消息列表失败', code: 500 };
  }
}

/**
 * 获取用户未读消息数量
 * @param {number} userId - 用户ID
 * @returns {Object} 未读消息数
 */
export async function getUnreadNotificationCount(userId) {
  try {
    const result = queryOne(
      `SELECT COUNT(*) as count FROM notification WHERE user_id = ? AND is_read = 0 AND is_deleted = 0`,
      [userId]
    );

    return {
      success: true,
      data: {
        count: result?.count || 0
      }
    };
  } catch (error) {
    logger.error('获取未读消息数失败:', error);
    return { success: false, message: '获取未读消息数失败', code: 500 };
  }
}

/**
 * 标记消息为已读
 * @param {number} notificationId - 消息ID
 * @param {number} userId - 用户ID
 * @returns {Object} 操作结果
 */
export async function markNotificationAsRead(notificationId, userId) {
  try {
    // 验证消息是否属于该用户
    const notification = queryOne(
      `SELECT id FROM notification WHERE id = ? AND user_id = ? AND is_deleted = 0`,
      [notificationId, userId]
    );

    if (!notification) {
      return { success: false, message: '消息不存在', code: 404 };
    }

    update(
      `UPDATE notification SET is_read = 1, update_time = ? WHERE id = ?`,
      [Math.floor(Date.now() / 1000), notificationId]
    );

    return { success: true, message: '标记已读成功' };
  } catch (error) {
    logger.error('标记消息已读失败:', error);
    return { success: false, message: '操作失败', code: 500 };
  }
}

/**
 * 标记所有消息为已读
 * @param {number} userId - 用户ID
 * @returns {Object} 操作结果
 */
export async function markAllNotificationsAsRead(userId) {
  try {
    update(
      `UPDATE notification SET is_read = 1, update_time = ? 
       WHERE user_id = ? AND is_read = 0 AND is_deleted = 0`,
      [Math.floor(Date.now() / 1000), userId]
    );

    return { success: true, message: '全部标记已读成功' };
  } catch (error) {
    logger.error('标记全部已读失败:', error);
    return { success: false, message: '操作失败', code: 500 };
  }
}

/**
 * 创建系统通知
 * @param {number} userId - 用户ID
 * @param {string} title - 标题
 * @param {string} content - 内容
 * @param {string} type - 类型
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
