import { queryOne, queryAll, update, insert, remove } from '../method/database.js';
import { hashPassword } from '../method/business-utils.js';
import { createNotification, notifyAdminsForReview } from '../method/notification.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const logger = global.logger;
const AVATAR_DIR = path.join(process.cwd(), 'data', 'document', 'avatar');

// 确保头像目录存在
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

/**
 * 下载并保存头像
 * @param {string} avatarUrl - 头像URL
 * @param {number} userId - 用户ID
 * @returns {string} 保存后的文件名
 */
async function downloadAvatar(avatarUrl, userId) {
  try {
    if (!avatarUrl || avatarUrl.trim().length === 0) {
      return null;
    }

    const response = await axios.get(avatarUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    // 根据内容类型确定扩展名
    const contentType = response.headers['content-type'];
    let ext = '.jpg';
    if (contentType) {
      if (contentType.includes('png')) ext = '.png';
      else if (contentType.includes('gif')) ext = '.gif';
      else if (contentType.includes('webp')) ext = '.webp';
    }

    const fileName = `avatar_${userId}_${Date.now()}${ext}`;
    const filePath = path.join(AVATAR_DIR, fileName);

    fs.writeFileSync(filePath, response.data);

    return fileName;
  } catch (error) {
    logger.error(`下载头像失败: ${error.message}`);
    return null;
  }
}

/**
 * 获取用户个人信息
 * @param {number} userId - 用户ID
 * @returns {Object} 用户信息
 */
export async function getUserProfile(userId) {
  try {
    const user = queryOne(
      `SELECT id, name, account_number as accountNumber, permission, 
              bilibili_uid as bilibiliUid, avatar, fan_level as fanLevel, 
              captain_type as captainType, is_bilibili_bound as isBilibiliBound,
              create_time as createTime 
       FROM user WHERE id = ? AND is_deleted = 0`,
      [userId]
    );

    if (!user) {
      return { success: false, message: '用户不存在', code: 404 };
    }

    // 构建头像URL（不包含/api前缀，由前端根据环境添加）
    // 数据库中存储的是 avatar/xxx.jpg 格式
    let avatarUrl = null;
    if (user.avatar) {
      avatarUrl = `/file/${user.avatar}`;
    }

    return {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        accountNumber: user.accountNumber,
        permission: user.permission,
        bilibiliUid: user.bilibiliUid,
        avatar: avatarUrl,
        fanLevel: user.fanLevel,
        captainType: user.captainType,
        isBilibiliBound: user.isBilibiliBound === 1,
        createTime: user.createTime
      }
    };
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    return { success: false, message: '获取用户信息失败', code: 500 };
  }
}

/**
 * 获取用户上传的照片列表
 * @param {number} userId - 用户ID
 * @param {Object} pagination - 分页参数
 * @returns {Object} 照片列表
 */
export async function getUserPhotos(userId, pagination = { page: 1, pageSize: 12 }) {
  try {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const photos = queryAll(
      `SELECT p.id, p.name, p.url, p.album_id as albumId, pa.name as albumName,
              p.is_review as status, p.create_time as uploadTime
       FROM photo p
       LEFT JOIN photo_album pa ON p.album_id = pa.id
       WHERE p.user_id = ? AND p.is_deleted = 0
       ORDER BY p.create_time DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    const totalResult = queryOne(
      `SELECT COUNT(*) as total FROM photo WHERE user_id = ? AND is_deleted = 0`,
      [userId]
    );

    return {
      success: true,
      data: {
        list: photos.map(p => ({
          id: p.id,
          name: p.name,
          url: `/api/file/${p.url}`,
          albumId: p.albumId,
          albumName: p.albumName || '未分类',
          status: p.status,
          uploadTime: p.uploadTime
        })),
        pagination: {
          currentPage: page,
          pageSize,
          total: totalResult?.total || 0
        }
      }
    };
  } catch (error) {
    logger.error('获取用户照片失败:', error);
    return { success: false, message: '获取照片列表失败', code: 500 };
  }
}

/**
 * 获取用户上传的音声列表
 * @param {number} userId - 用户ID
 * @param {Object} pagination - 分页参数
 * @returns {Object} 音声列表
 */
export async function getUserAudios(userId, pagination = { page: 1, pageSize: 10 }) {
  try {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const audios = queryAll(
      `SELECT a.id, a.name, a.url, a.classification_id as classificationId, 
              ac.name as classificationName, a.is_review as status, a.create_time as uploadTime
       FROM audio a
       LEFT JOIN audio_classification ac ON a.classification_id = ac.id
       WHERE a.user_id = ? AND a.is_deleted = 0
       ORDER BY a.create_time DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    const totalResult = queryOne(
      `SELECT COUNT(*) as total FROM audio WHERE user_id = ? AND is_deleted = 0`,
      [userId]
    );

    return {
      success: true,
      data: {
        list: audios.map(a => ({
          id: a.id,
          name: a.name,
          url: `/api/file/${a.url}`,
          classificationId: a.classificationId,
          classificationName: a.classificationName || '未分类',
          status: a.status,
          uploadTime: a.uploadTime
        })),
        pagination: {
          currentPage: page,
          pageSize,
          total: totalResult?.total || 0
        }
      }
    };
  } catch (error) {
    logger.error('获取用户音声失败:', error);
    return { success: false, message: '获取音声列表失败', code: 500 };
  }
}

/**
 * 获取用户上传的企划列表
 * @param {number} userId - 用户ID
 * @param {Object} pagination - 分页参数
 * @returns {Object} 企划列表
 */
export async function getUserPlans(userId, pagination = { page: 1, pageSize: 10 }) {
  try {
    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    const plans = queryAll(
      `SELECT id, title, file_name as fileName, upload_time as uploadTime, 
              is_current as isCurrent, is_review as status
       FROM plan_document
       WHERE uploader_id = ? AND deleted = 0
       ORDER BY upload_time DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    const totalResult = queryOne(
      `SELECT COUNT(*) as total FROM plan_document WHERE uploader_id = ? AND deleted = 0`,
      [userId]
    );

    return {
      success: true,
      data: {
        list: plans.map(p => ({
          id: p.id,
          title: p.title,
          fileName: p.fileName,
          uploadTime: p.uploadTime,
          isCurrent: p.isCurrent === 1,
          status: p.status
        })),
        pagination: {
          currentPage: page,
          pageSize,
          total: totalResult?.total || 0
        }
      }
    };
  } catch (error) {
    logger.error('获取用户企划失败:', error);
    return { success: false, message: '获取企划列表失败', code: 500 };
  }
}

/**
 * 更新照片信息
 * @param {number} photoId - 照片ID
 * @param {number} userId - 用户ID
 * @param {Object} data - 更新数据
 * @returns {Object} 更新结果
 */
export async function updatePhoto(photoId, userId, data) {
  try {
    // 验证照片是否属于该用户
    const photo = queryOne(
      `SELECT id, name FROM photo WHERE id = ? AND user_id = ? AND is_deleted = 0`,
      [photoId, userId]
    );

    if (!photo) {
      return { success: false, message: '照片不存在或无权限修改', code: 403 };
    }

    // 获取用户权限
    const user = queryOne(
      `SELECT permission FROM user WHERE id = ?`,
      [userId]
    );
    const isAdmin = user && (user.permission === 1 || user.permission === 2);

    const { name, albumId } = data;
    const updateTime = Math.floor(Date.now() / 1000);

    // 普通用户修改后需要重新审核，管理员直接通过
    const isReview = isAdmin ? 1 : 0;

    update(
      `UPDATE photo SET name = ?, album_id = ?, update_time = ?, is_review = ? WHERE id = ?`,
      [name, albumId, updateTime, isReview, photoId]
    );

    // 如果是普通用户修改，通知管理员审核
    if (!isAdmin) {
      notifyAdminsForReview('照片', name || photo.name).catch(err => {
        logger.error('发送管理员审核通知失败:', err);
      });
    }

    logger.info(`用户 ${userId} 更新了照片 ${photoId}`);
    return {
      success: true,
      message: isAdmin ? '照片信息更新成功' : '照片信息更新成功，等待管理员审核',
      data: { isReview }
    };
  } catch (error) {
    logger.error('更新照片失败:', error);
    return { success: false, message: '更新失败', code: 500 };
  }
}

/**
 * 更新音声信息
 * @param {number} audioId - 音声ID
 * @param {number} userId - 用户ID
 * @param {Object} data - 更新数据
 * @returns {Object} 更新结果
 */
export async function updateAudio(audioId, userId, data) {
  try {
    // 验证音声是否属于该用户
    const audio = queryOne(
      `SELECT id, name FROM audio WHERE id = ? AND user_id = ? AND is_deleted = 0`,
      [audioId, userId]
    );

    if (!audio) {
      return { success: false, message: '音声不存在或无权限修改', code: 403 };
    }

    // 获取用户权限
    const user = queryOne(
      `SELECT permission FROM user WHERE id = ?`,
      [userId]
    );
    const isAdmin = user && (user.permission === 1 || user.permission === 2);

    const { name, classificationId } = data;
    const updateTime = Math.floor(Date.now() / 1000);

    // 普通用户修改后需要重新审核，管理员直接通过
    const isReview = isAdmin ? 1 : 0;

    update(
      `UPDATE audio SET name = ?, classification_id = ?, update_time = ?, is_review = ? WHERE id = ?`,
      [name, classificationId, updateTime, isReview, audioId]
    );

    // 如果是普通用户修改，通知管理员审核
    if (!isAdmin) {
      notifyAdminsForReview('音声', name || audio.name).catch(err => {
        logger.error('发送管理员审核通知失败:', err);
      });
    }

    logger.info(`用户 ${userId} 更新了音声 ${audioId}`);
    return {
      success: true,
      message: isAdmin ? '音声信息更新成功' : '音声信息更新成功，等待管理员审核',
      data: { isReview }
    };
  } catch (error) {
    logger.error('更新音声失败:', error);
    return { success: false, message: '更新失败', code: 500 };
  }
}

/**
 * 更新企划信息
 * @param {number} planId - 企划ID
 * @param {number} userId - 用户ID
 * @param {Object} data - 更新数据
 * @returns {Object} 更新结果
 */
export async function updatePlan(planId, userId, data) {
  try {
    // 验证企划是否属于该用户
    const plan = queryOne(
      `SELECT id, title FROM plan_document WHERE id = ? AND uploader_id = ? AND deleted = 0`,
      [planId, userId]
    );

    if (!plan) {
      return { success: false, message: '企划不存在或无权限修改', code: 403 };
    }

    // 获取用户权限
    const user = queryOne(
      `SELECT permission FROM user WHERE id = ?`,
      [userId]
    );
    const isAdmin = user && (user.permission === 1 || user.permission === 2);

    const { title } = data;
    const updateTime = Math.floor(Date.now() / 1000);

    // 普通用户修改后需要重新审核，管理员直接通过
    const isReview = isAdmin ? 1 : 0;

    update(
      `UPDATE plan_document SET title = ?, update_time = ?, is_review = ? WHERE id = ?`,
      [title, updateTime, isReview, planId]
    );

    // 如果是普通用户修改，通知管理员审核
    if (!isAdmin) {
      notifyAdminsForReview('企划', title || plan.title).catch(err => {
        logger.error('发送管理员审核通知失败:', err);
      });
    }

    logger.info(`用户 ${userId} 更新了企划 ${planId}`);
    return {
      success: true,
      message: isAdmin ? '企划信息更新成功' : '企划信息更新成功，等待管理员审核',
      data: { isReview }
    };
  } catch (error) {
    logger.error('更新企划失败:', error);
    return { success: false, message: '更新失败', code: 500 };
  }
}

/**
 * 删除照片
 * @param {number} photoId - 照片ID
 * @param {number} userId - 用户ID
 * @returns {Object} 删除结果
 */
export async function deletePhoto(photoId, userId) {
  try {
    // 验证照片是否属于该用户
    const photo = queryOne(
      `SELECT id FROM photo WHERE id = ? AND user_id = ? AND is_deleted = 0`,
      [photoId, userId]
    );

    if (!photo) {
      return { success: false, message: '照片不存在或无权限删除', code: 403 };
    }

    const updateTime = Math.floor(Date.now() / 1000);
    update(
      `UPDATE photo SET is_deleted = 1, update_time = ? WHERE id = ?`,
      [updateTime, photoId]
    );

    logger.info(`用户 ${userId} 删除了照片 ${photoId}`);
    return { success: true, message: '照片删除成功' };
  } catch (error) {
    logger.error('删除照片失败:', error);
    return { success: false, message: '删除失败', code: 500 };
  }
}

/**
 * 删除音声
 * @param {number} audioId - 音声ID
 * @param {number} userId - 用户ID
 * @returns {Object} 删除结果
 */
export async function deleteAudio(audioId, userId) {
  try {
    // 验证音声是否属于该用户
    const audio = queryOne(
      `SELECT id FROM audio WHERE id = ? AND user_id = ? AND is_deleted = 0`,
      [audioId, userId]
    );

    if (!audio) {
      return { success: false, message: '音声不存在或无权限删除', code: 403 };
    }

    const updateTime = Math.floor(Date.now() / 1000);
    update(
      `UPDATE audio SET is_deleted = 1, update_time = ? WHERE id = ?`,
      [updateTime, audioId]
    );

    logger.info(`用户 ${userId} 删除了音声 ${audioId}`);
    return { success: true, message: '音声删除成功' };
  } catch (error) {
    logger.error('删除音声失败:', error);
    return { success: false, message: '删除失败', code: 500 };
  }
}

/**
 * 删除企划
 * @param {number} planId - 企划ID
 * @param {number} userId - 用户ID
 * @returns {Object} 删除结果
 */
export async function deletePlan(planId, userId) {
  try {
    // 验证企划是否属于该用户
    const plan = queryOne(
      `SELECT id FROM plan_document WHERE id = ? AND uploader_id = ? AND deleted = 0`,
      [planId, userId]
    );

    if (!plan) {
      return { success: false, message: '企划不存在或无权限删除', code: 403 };
    }

    const updateTime = Math.floor(Date.now() / 1000);
    update(
      `UPDATE plan_document SET deleted = 1, update_time = ? WHERE id = ?`,
      [updateTime, planId]
    );

    logger.info(`用户 ${userId} 删除了企划 ${planId}`);
    return { success: true, message: '企划删除成功' };
  } catch (error) {
    logger.error('删除企划失败:', error);
    return { success: false, message: '删除失败', code: 500 };
  }
}

/**
 * 更新用户头像
 * @param {number} userId - 用户ID
 * @param {object} file - multer文件对象
 * @returns {Object} 更新结果
 */
export async function updateUserAvatar(userId, file) {
  try {
    if (!file) {
      return { success: false, message: '请选择头像文件' };
    }

    // multer已经保存文件到 data/document/avatar 目录
    // 构建数据库路径: avatar/xxx.jpg
    const avatarFileName = file.filename;
    const filePath = path.join('avatar', avatarFileName).replace(/\\/g, '/');

    update(
      `UPDATE user SET avatar = ?, update_time = ? WHERE id = ?`,
      [filePath, Math.floor(Date.now() / 1000), userId]
    );

    logger.info(`用户 ${userId} 更新了头像: ${filePath}`);

    // 发送账号信息变更通知
    await createNotification(
      userId,
      '账号信息变更',
      '您的头像已更新',
      'security'
    );

    return {
      success: true,
      message: '头像更新成功',
      data: { avatar: `/file/${filePath}` }
    };
  } catch (error) {
    logger.error('更新头像失败:', error);
    return { success: false, message: '头像更新失败', code: 500 };
  }
}

/**
 * 使用B站头像作为用户头像
 * @param {number} userId - 用户ID
 * @returns {Object} 更新结果
 */
export async function useBilibiliAvatar(userId) {
  try {
    // 获取用户的B站绑定信息
    const user = queryOne(
      `SELECT bilibili_uid FROM user WHERE id = ? AND is_bilibili_bound = 1`,
      [userId]
    );

    if (!user || !user.bilibili_uid) {
      return { success: false, message: '未绑定B站账号', code: 400 };
    }

    // 获取B站用户信息
    const { getBilibiliUserInfo } = await import('./bilibiliBind.js');
    const bilibiliInfo = await getBilibiliUserInfo(user.bilibili_uid);

    if (!bilibiliInfo || !bilibiliInfo.avatar) {
      return { success: false, message: '无法获取B站头像', code: 400 };
    }

    // 下载B站头像到本地
    const avatarFileName = await downloadAvatar(bilibiliInfo.avatar, userId);
    if (!avatarFileName) {
      return { success: false, message: '下载B站头像失败', code: 500 };
    }

    // 构建数据库存储路径
    const filePath = path.join('avatar', avatarFileName).replace(/\\/g, '/');
    const updateTime = Math.floor(Date.now() / 1000);

    // 获取旧头像路径
    const oldUser = queryOne('SELECT avatar FROM user WHERE id = ?', [userId]);

    // 更新用户头像
    update(
      `UPDATE user SET avatar = ?, update_time = ? WHERE id = ?`,
      [filePath, updateTime, userId]
    );

    // 删除旧头像文件（如果存在且不是B站默认头像）
    if (oldUser?.avatar && !oldUser.avatar.includes('bilibili')) {
      try {
        const oldFileName = path.basename(oldUser.avatar);
        const oldFilePath = path.join(AVATAR_DIR, oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
          logger.info(`删除旧头像文件: ${oldFilePath}`);
        }
      } catch (err) {
        logger.warn('删除旧头像文件失败:', err);
      }
    }

    logger.info(`用户 ${userId} 使用了B站头像`);

    // 发送账号信息变更通知
    await createNotification(
      userId,
      '账号信息变更',
      '您的头像已更新为B站头像',
      'security'
    );

    return {
      success: true,
      message: 'B站头像设置成功',
      data: { avatar: `/file/${filePath}` }
    };
  } catch (error) {
    logger.error('使用B站头像失败:', error);
    return { success: false, message: '设置B站头像失败', code: 500 };
  }
}

/**
 * 更新用户名
 * @param {number} userId - 用户ID
 * @param {string} newName - 新用户名
 * @returns {Object} 更新结果
 */
export async function updateUserName(userId, newName) {
  try {
    if (!newName || newName.trim().length === 0) {
      return { success: false, message: '用户名不能为空' };
    }

    if (newName.trim().length > 20) {
      return { success: false, message: '用户名不能超过20个字符' };
    }

    const updateTime = Math.floor(Date.now() / 1000);
    update(
      `UPDATE user SET name = ?, update_time = ? WHERE id = ?`,
      [newName.trim(), updateTime, userId]
    );

    logger.info(`用户 ${userId} 修改了用户名为 ${newName}`);

    // 发送账号信息变更通知
    await createNotification(
      userId,
      '账号信息变更',
      `您的用户名已修改为「${newName.trim()}」`,
      'security'
    );

    return { success: true, message: '用户名修改成功' };
  } catch (error) {
    logger.error('修改用户名失败:', error);
    return { success: false, message: '修改失败', code: 500 };
  }
}

/**
 * 修改用户密码
 * @param {number} userId - 用户ID
 * @param {string} newPassword - 新密码
 * @returns {Object} 修改结果
 */
export async function updateUserPassword(userId, newPassword) {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: '密码长度不能少于6位' };
    }

    // 使用 bcrypt 加密密码（与系统其他部分保持一致）
    const hashedPassword = await hashPassword(newPassword);

    const updateTime = Math.floor(Date.now() / 1000);
    update(
      `UPDATE user SET password = ?, update_time = ? WHERE id = ?`,
      [hashedPassword, updateTime, userId]
    );

    logger.info(`用户 ${userId} 修改了密码`);

    // 发送安全提醒通知
    await createNotification(
      userId,
      '安全提醒',
      '您的登录密码已修改。如非本人操作，请立即联系管理员。',
      'security'
    );

    return { success: true, message: '密码修改成功，请重新登录' };
  } catch (error) {
    logger.error('修改密码失败:', error);
    return { success: false, message: '修改密码失败', code: 500 };
  }
}
