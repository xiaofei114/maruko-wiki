import express from 'express';
import { createPublicRoute } from '../method/route-helpers.js';
import { getHomeModulesData } from '../services/homeModules.js';

const router = express.Router();

// 获取首页功能模块数据 (游客可访问)
router.get('/home-modules', ...createPublicRoute(getHomeModulesData));

export default router;
