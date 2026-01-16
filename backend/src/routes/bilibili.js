import express from 'express';
import { getRoomInfo, getMasterInfo, getTopListNew } from '../services/bilibili.js';
import { sendSuccess, sendError } from '../method/response.js';

const router = express.Router();

/**
 * 获取房间信息
 */
router.get('/room/v1/Room/get_info', async (req, res) => {
    try {
        const data = await getRoomInfo();
        sendSuccess(res, data);
    } catch (error) {
        logger.error('获取房间信息失败:', error);
        sendError(res, '获取房间信息失败');
    }
});

/**
 * 获取主播信息
 */
router.get('/live_user/v1/Master/info', async (req, res) => {
    try {
        const data = await getMasterInfo();
        sendSuccess(res, data);
    } catch (error) {
        logger.error('获取主播信息失败:', error);
        sendError(res, '获取主播信息失败');
    }
});

/**
 * 获取排行榜数据
 */
router.get('/xlive/app-room/v2/guardTab/topListNew', async (req, res) => {
    try {
        const data = await getTopListNew();
        sendSuccess(res, data);
    } catch (error) {
        logger.error('获取排行榜数据失败:', error);
        sendError(res, '获取排行榜数据失败');
    }
});

export default router;
