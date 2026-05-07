import express from 'express';
import path from 'path';
import { createRouteHandler, createAdminUploadRouteHandler } from '../method/route-helpers.js';
import { authenticateToken } from '../method/auth.js';
import {
  getUserProfile,
  getUserPhotos,
  getUserAudios,
  getUserPlans,
  getUserVideos,
  updatePhoto,
  updateAudio,
  updatePlan,
  deletePhoto,
  deleteAudio,
  deletePlan,
  updateUserAvatar,
  updateUserName,
  updateUserPassword,
  useBilibiliAvatar
} from '../services/userProfile.js';
import { getBilibiliBindInfo, bindBilibiliAccount, unbindBilibiliAccount } from '../services/bilibiliBind.js';
import { getFansDataStats, hasFansDataInRedis } from '../services/bilibiliFans.js';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount } from '../services/notification.js';
import { getUserAlbums } from '../services/album.js';
import { getUserAudioClassifications } from '../services/audio.js';
import { getUploadLimit } from "../method/read.js"

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取用户个人信息
 * GET /api/user/profile
 */
router.get('/profile', createRouteHandler(async (req) => {
  return await getUserProfile(req.user.id);
}));

/**
 * 获取用户上传的照片列表
 * GET /api/user/photos?page=1&pageSize=12
 */
router.get('/photos', createRouteHandler(async (req) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 12;
  return await getUserPhotos(req.user.id, { page, pageSize });
}));

/**
 * 获取用户上传的音声列表
 * GET /api/user/audios?page=1&pageSize=10
 */
router.get('/audios', createRouteHandler(async (req) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  return await getUserAudios(req.user.id, { page, pageSize });
}));

/**
 * 获取用户上传的企划列表
 * GET /api/user/plans?page=1&pageSize=10
 */
router.get('/plans', createRouteHandler(async (req) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  return await getUserPlans(req.user.id, { page, pageSize });
}));

/**
 * 获取用户上传的视频列表
 * GET /api/user/videos?page=1&pageSize=10
 */
router.get('/videos', createRouteHandler(async (req) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  return await getUserVideos(req.user.id, { page, pageSize });
}));

/**
 * 获取相册列表（用于编辑照片时选择相册）
 * GET /api/user/albums
 */
router.get('/albums', createRouteHandler(async (req) => {
  return await getUserAlbums();
}));

/**
 * 获取用户的音声分类列表（用于编辑音声时选择分类）
 * GET /api/user/audio-classifications
 */
router.get('/audio-classifications', createRouteHandler(async (req) => {
  return await getUserAudioClassifications(req.user.id);
}));

/**
 * 更新照片信息
 * PUT /api/user/photos/:id
 */
router.put('/photos/:id', createRouteHandler(async (req) => {
  const photoId = parseInt(req.params.id);
  const { name, albumId } = req.body;

  if (!name || name.trim().length === 0) {
    return { success: false, message: '照片名称不能为空' };
  }
  if (!albumId) {
    return { success: false, message: '相册ID不能为空' };
  }

  return await updatePhoto(photoId, req.user.id, { name, albumId });
}));

/**
 * 更新音声信息
 * PUT /api/user/audios/:id
 */
router.put('/audios/:id', createRouteHandler(async (req) => {
  const audioId = parseInt(req.params.id);
  const { name, classificationId } = req.body;

  if (!name || name.trim().length === 0) {
    return { success: false, message: '音声名称不能为空' };
  }
  if (!classificationId) {
    return { success: false, message: '分类ID不能为空' };
  }

  return await updateAudio(audioId, req.user.id, { name, classificationId });
}));

/**
 * 更新企划信息
 * PUT /api/user/plans/:id
 */
router.put('/plans/:id', createRouteHandler(async (req) => {
  const planId = parseInt(req.params.id);
  const { title } = req.body;

  if (!title || title.trim().length === 0) {
    return { success: false, message: '企划标题不能为空' };
  }

  return await updatePlan(planId, req.user.id, { title });
}));

/**
 * 删除照片
 * DELETE /api/user/photos/:id
 */
router.delete('/photos/:id', createRouteHandler(async (req) => {
  const photoId = parseInt(req.params.id);
  return await deletePhoto(photoId, req.user.id);
}));

/**
 * 删除音声
 * DELETE /api/user/audios/:id
 */
router.delete('/audios/:id', createRouteHandler(async (req) => {
  const audioId = parseInt(req.params.id);
  return await deleteAudio(audioId, req.user.id);
}));

/**
 * 删除企划
 * DELETE /api/user/plans/:id
 */
router.delete('/plans/:id', createRouteHandler(async (req) => {
  const planId = parseInt(req.params.id);
  return await deletePlan(planId, req.user.id);
}));

/**
 * 更新用户头像
 * POST /api/user/avatar (使用文件上传)
 */
router.post('/avatar', ...createAdminUploadRouteHandler({
  destination: path.join(process.cwd(), 'data', 'document', 'avatar'),
  maxSize: getUploadLimit('avatar'),
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG', '.GIF', '.WEBP']
}, 'avatar', async (req) => {
  const file = req.file;
  if (!file) {
    return { success: false, message: '请选择头像文件', code: 400 };
  }
  return await updateUserAvatar(req.user.id, file);
}));

/**
 * 使用B站头像
 * POST /api/user/avatar/bilibili
 */
router.post('/avatar/bilibili', createRouteHandler(async (req) => {
  return await useBilibiliAvatar(req.user.id);
}));

/**
 * 更新用户名
 * PUT /api/user/name
 */
router.put('/name', createRouteHandler(async (req) => {
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    return { success: false, message: '用户名不能为空' };
  }
  if (name.trim().length > 20) {
    return { success: false, message: '用户名不能超过20个字符' };
  }

  return await updateUserName(req.user.id, name);
}));

/**
 * 修改用户密码
 * PUT /api/user/password
 */
router.put('/password', createRouteHandler(async (req) => {
  const { newPassword, confirmPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: '新密码长度不能少于6位' };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, message: '两次输入的密码不一致' };
  }

  return await updateUserPassword(req.user.id, newPassword);
}));

/**
 * 获取B站绑定信息
 * GET /api/user/bilibili/bind
 */
router.get('/bilibili/bind', createRouteHandler(async (req) => {
  return await getBilibiliBindInfo(req.user.id);
}));

/**
 * 绑定B站账号
 * POST /api/user/bilibili/bind
 */
router.post('/bilibili/bind', createRouteHandler(async (req) => {
  const { uid } = req.body;

  if (!uid || uid.trim().length === 0) {
    return { success: false, message: 'B站UID不能为空' };
  }

  return await bindBilibiliAccount(req.user.id, uid);
}));

/**
 * 解绑B站账号
 * DELETE /api/user/bilibili/bind
 */
router.delete('/bilibili/bind', createRouteHandler(async (req) => {
  return await unbindBilibiliAccount(req.user.id);
}));

/**
 * 获取B站粉丝缓存状态
 * GET /api/user/bilibili/fans-status
 */
router.get('/bilibili/fans-status', createRouteHandler(async (req) => {
  const config = global.appConfig;
  const ruid = config?.bilibili?.userId?.toString();
  
  if (!ruid) {
    return { success: false, message: '未配置主播UID' };
  }
  
  const stats = await getFansDataStats(ruid);
  return { success: true, data: stats };
}));

/**
 * 获取用户消息列表
 * GET /api/user/notifications?page=1&pageSize=10
 */
router.get('/notifications', createRouteHandler(async (req) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10;
  return await getUserNotifications(req.user.id, { page, pageSize });
}));

/**
 * 获取用户未读消息数量
 * GET /api/user/notifications/unread-count
 */
router.get('/notifications/unread-count', createRouteHandler(async (req) => {
  return await getUnreadNotificationCount(req.user.id);
}));

/**
 * 标记消息为已读
 * PUT /api/user/notifications/:id/read
 */
router.put('/notifications/:id/read', createRouteHandler(async (req) => {
  const notificationId = parseInt(req.params.id);
  return await markNotificationAsRead(notificationId, req.user.id);
}));

/**
 * 标记所有消息为已读
 * PUT /api/user/notifications/read-all
 */
router.put('/notifications/read-all', createRouteHandler(async (req) => {
  return await markAllNotificationsAsRead(req.user.id);
}));

export default router;
