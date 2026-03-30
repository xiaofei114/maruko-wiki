import express from 'express';
import { getRoomInfo, getMasterInfo, getTopListNew } from '../services/bilibili.js';
import { getLiveDurationByMonth } from '../services/liveDuration.js';
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

/**
 * 获取直播记录
 * @param {string} month - 月份，格式：YYYY-MM，不传则获取当前月
 */
router.get('/live/duration', async (req, res) => {
    try {
        const { month } = req.query;
        const result = await getLiveDurationByMonth(month);
        sendSuccess(res, result);
    } catch (error) {
        logger.error('获取直播记录失败:', error);
        sendError(res, '获取直播记录失败');
    }
});

export default router;
