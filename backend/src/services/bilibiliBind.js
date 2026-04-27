import { queryOne, update } from '../method/database.js';
import { createNotification } from '../method/notification.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

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
 * 从B站API获取用户信息
 * @param {string} uid - B站UID
 * @returns {Object} 用户信息
 */
async function fetchBilibiliUserInfo(uid) {
  try {
    // 使用B站API获取用户信息
    const response = await axios.get(`https://api.bilibili.com/x/web-interface/card`, {
      params: { mid: uid },
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data && response.data.data && response.data.data.card) {
      const card = response.data.data.card;
      return {
        username: card.name,
        avatar: card.face,
        fanLevel: 0 // B站API不直接提供粉丝等级，需要额外获取
      };
    }

    throw new Error('无法获取B站用户信息');
  } catch (error) {
    logger.error(`获取B站用户信息失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取B站绑定信息
 * @param {number} userId - 用户ID
 * @returns {Object} 绑定信息
 */
export async function getBilibiliBindInfo(userId) {
  try {
    const user = queryOne(
      `SELECT bilibili_uid as bilibiliUid, avatar, fan_level as fanLevel, 
              captain_type as captainType, is_bilibili_bound as isBilibiliBound
       FROM user WHERE id = ?`,
      [userId]
    );

    if (!user || !user.isBilibiliBound) {
      return {
        success: true,
        data: {
          isBound: false,
          bilibiliUid: '',
          username: '',
          avatar: '',
          fanLevel: 0,
          captainType: 0
        }
      };
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
        isBound: true,
        bilibiliUid: user.bilibiliUid,
        username: '', // 可以从其他表获取或缓存
        avatar: avatarUrl,
        fanLevel: user.fanLevel,
        captainType: user.captainType
      }
    };
  } catch (error) {
    logger.error('获取B站绑定信息失败:', error);
    return { success: false, message: '获取绑定信息失败', code: 500 };
  }
}

/**
 * 绑定B站账号
 * @param {number} userId - 用户ID
 * @param {string} uid - B站UID
 * @returns {Object} 绑定结果
 */
export async function bindBilibiliAccount(userId, uid) {
  try {
    if (!uid || uid.trim().length === 0) {
      return { success: false, message: '请输入B站UID' };
    }

    // 检查是否已被其他用户绑定
    const existingBind = queryOne(
      `SELECT id FROM user WHERE bilibili_uid = ? AND is_bilibili_bound = 1 AND id != ?`,
      [uid.trim(), userId]
    );

    if (existingBind) {
      return { success: false, message: '该B站账号已被其他用户绑定' };
    }

    // 尝试获取B站用户信息
    let bilibiliInfo;
    try {
      bilibiliInfo = await fetchBilibiliUserInfo(uid.trim());
    } catch (error) {
      logger.warn(`获取B站用户信息失败: ${error.message}`);
      // 如果获取失败，使用默认信息
      bilibiliInfo = {
        username: `B站用户${uid.slice(-4)}`,
        avatar: '',
        fanLevel: 0
      };
    }

    // 下载头像到本地
    let avatarFileName = null;
    let avatarDbPath = null;
    if (bilibiliInfo.avatar) {
      // 删除旧头像
      const oldUser = queryOne('SELECT avatar FROM user WHERE id = ?', [userId]);
      if (oldUser?.avatar) {
        const oldFileName = path.basename(oldUser.avatar);
        const oldAvatarPath = path.join(AVATAR_DIR, oldFileName);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }
      avatarFileName = await downloadAvatar(bilibiliInfo.avatar, userId);
      // 构建数据库存储路径: avatar/xxx.jpg
      if (avatarFileName) {
        avatarDbPath = path.join('avatar', avatarFileName).replace(/\\/g, '/');
      }
    }

    const currentTime = Math.floor(Date.now() / 1000);

    update(
      `UPDATE user SET 
        bilibili_uid = ?, 
        avatar = ?, 
        fan_level = ?, 
        is_bilibili_bound = 1, 
        update_time = ?
       WHERE id = ?`,
      [uid.trim(), avatarDbPath, bilibiliInfo.fanLevel, currentTime, userId]
    );

    logger.info(`用户 ${userId} 绑定了B站账号 ${uid}`);

    // 发送账号绑定通知
    await createNotification(
      userId,
      '账号绑定成功',
      `您已成功绑定B站账号（UID: ${uid.trim()}）`,
      'security'
    );

    return {
      success: true,
      message: 'B站账号绑定成功',
      data: {
        bilibiliUid: uid.trim(),
        username: bilibiliInfo.username,
        avatar: avatarDbPath ? `/file/${avatarDbPath}` : null,
        fanLevel: bilibiliInfo.fanLevel
      }
    };
  } catch (error) {
    logger.error('绑定B站账号失败:', error);
    return { success: false, message: '绑定失败', code: 500 };
  }
}

/**
 * 解绑B站账号
 * @param {number} userId - 用户ID
 * @returns {Object} 解绑结果
 */
export async function unbindBilibiliAccount(userId) {
  try {
    const user = queryOne(
      `SELECT is_bilibili_bound, avatar FROM user WHERE id = ?`,
      [userId]
    );

    if (!user || !user.isBilibiliBound) {
      return { success: false, message: '未绑定B站账号' };
    }

    // 删除头像文件
    if (user.avatar) {
      const fileName = path.basename(user.avatar);
      const avatarPath = path.join(AVATAR_DIR, fileName);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    const currentTime = Math.floor(Date.now() / 1000);
    update(
      `UPDATE user SET 
        bilibili_uid = NULL, 
        avatar = NULL, 
        fan_level = 0, 
        captain_type = 0,
        is_bilibili_bound = 0, 
        update_time = ?
       WHERE id = ?`,
      [currentTime, userId]
    );

    logger.info(`用户 ${userId} 解绑了B站账号`);

    // 发送账号解绑通知
    await createNotification(
      userId,
      '账号解绑通知',
      '您已成功解绑B站账号',
      'security'
    );

    return { success: true, message: 'B站账号解绑成功' };
  } catch (error) {
    logger.error('解绑B站账号失败:', error);
    return { success: false, message: '解绑失败', code: 500 };
  }
}
