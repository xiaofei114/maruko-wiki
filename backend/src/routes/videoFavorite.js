import { Router } from 'express';
import {
    // 收藏夹管理
    getFavoriteList,
    getFavoriteDetail,
    createFavorite,
    updateFavorite,
    deleteFavorite,
    getUserFavorites,
    // 视频管理
    uploadVideo,
    getVideoList,
    getAdminVideoList,
    getWeeklyTopVideos,
    recommendVideo,
    hasUserRecommended,
    moveVideoToFavorite,
    getPendingVideos,
    reviewVideo,
    revokeVideoReview,
    deleteVideo,
    getVideoDetail
} from '../services/videoFavorite.js';
import { authenticateToken, requirePermission } from '../method/auth.js';

const router = Router();

// ==================== 收藏夹管理接口 ====================

/**
 * @route GET /api/video-favorite/favorites
 * @desc 获取收藏夹列表（带视频数量和最新封面）
 * @access Public
 */
router.get('/video-favorite/favorites', async (req, res) => {
    try {
        const result = await getFavoriteList();
        res.json(result);
    } catch (error) {
        logger.error('获取收藏夹列表接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取收藏夹列表失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/video-favorite/favorites/:id
 * @desc 获取单个收藏夹详情
 * @access Public
 */
router.get('/video-favorite/favorites/:id', async (req, res) => {
    try {
        const favoriteId = parseInt(req.params.id);

        if (isNaN(favoriteId)) {
            return res.status(400).json({
                success: false,
                message: '收藏夹ID无效',
                code: 400
            });
        }

        const result = await getFavoriteDetail(favoriteId);
        res.json(result);
    } catch (error) {
        logger.error('获取收藏夹详情接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取收藏夹详情失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/video-favorite/my-favorites
 * @desc 获取当前用户的收藏夹列表（用于上传时选择）
 * @access Private
 */
router.get('/video-favorite/my-favorites', authenticateToken, async (req, res) => {
    try {
        const result = await getUserFavorites(req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('获取用户收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取收藏夹失败',
            code: 500
        });
    }
});

/**
 * @route POST /api/video-favorite/favorites
 * @desc 创建收藏夹
 * @access Private
 */
router.post('/video-favorite/favorites', authenticateToken, async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;
        const result = await createFavorite({ name, description, isPublic }, req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('创建收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '创建收藏夹失败',
            code: 500
        });
    }
});

/**
 * @route PUT /api/video-favorite/favorites/:id
 * @desc 更新收藏夹
 * @access Private
 */
router.put('/video-favorite/favorites/:id', authenticateToken, async (req, res) => {
    try {
        const favoriteId = parseInt(req.params.id);
        const { name, description, isPublic } = req.body;
        const isAdmin = req.user.permission === 1 || req.user.permission === 2;

        if (isNaN(favoriteId)) {
            return res.status(400).json({
                success: false,
                message: '收藏夹ID无效',
                code: 400
            });
        }

        const result = await updateFavorite(favoriteId, { name, description, isPublic }, req.user.id, isAdmin);
        res.json(result);
    } catch (error) {
        logger.error('更新收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '更新收藏夹失败',
            code: 500
        });
    }
});

/**
 * @route DELETE /api/video-favorite/favorites/:id
 * @desc 删除收藏夹
 * @access Private
 */
router.delete('/video-favorite/favorites/:id', authenticateToken, async (req, res) => {
    try {
        const favoriteId = parseInt(req.params.id);
        const isAdmin = req.user.permission === 1 || req.user.permission === 2;

        if (isNaN(favoriteId)) {
            return res.status(400).json({
                success: false,
                message: '收藏夹ID无效',
                code: 400
            });
        }

        const result = await deleteFavorite(favoriteId, req.user.id, isAdmin);
        res.json(result);
    } catch (error) {
        logger.error('删除收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '删除收藏夹失败',
            code: 500
        });
    }
});

// ==================== 视频管理接口 ====================

/**
 * @route POST /api/video-favorite/upload
 * @desc 上传视频到收藏夹
 * @access Private
 */
router.post('/video-favorite/upload', authenticateToken, async (req, res) => {
    try {
        const { bvid, favoriteId } = req.body;
        const userId = req.user.id;
        const userPermission = req.user.permission || 0;

        if (!bvid) {
            return res.status(400).json({
                success: false,
                message: '请提供视频BV号',
                code: 400
            });
        }

        // 验证BV号格式（B站BV号通常是10位，以BV开头）
        const bvPattern = /^BV[a-zA-Z0-9]{10}$/;
        if (!bvPattern.test(bvid)) {
            return res.status(400).json({
                success: false,
                message: 'BV号格式不正确',
                code: 400
            });
        }

        const result = await uploadVideo(bvid, favoriteId ? parseInt(favoriteId) : null, userId, userPermission);
        res.json(result);
    } catch (error) {
        logger.error('上传视频接口错误:', error);
        res.status(500).json({
            success: false,
            message: '上传失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/video-favorite/list
 * @desc 获取视频列表（分页），支持按收藏夹筛选
 * @access Public
 */
router.get('/video-favorite/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const favoriteId = req.query.favoriteId ? parseInt(req.query.favoriteId) : null;

        const result = await getVideoList(favoriteId, page, pageSize);
        res.json(result);
    } catch (error) {
        logger.error('获取视频列表接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取列表失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/video-favorite/weekly-top
 * @desc 获取本周推荐排行榜
 * @access Public
 */
router.get('/video-favorite/weekly-top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const result = await getWeeklyTopVideos(limit);
        res.json(result);
    } catch (error) {
        logger.error('获取排行榜接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取排行榜失败',
            code: 500
        });
    }
});

/**
 * @route POST /api/video-favorite/:id/recommend
 * @desc 推荐视频
 * @access Private
 */
router.post('/video-favorite/:id/recommend', authenticateToken, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const userId = req.user.id;

        if (isNaN(videoId)) {
            return res.status(400).json({
                success: false,
                message: '视频ID无效',
                code: 400
            });
        }

        const result = await recommendVideo(videoId, userId);
        res.json(result);
    } catch (error) {
        logger.error('推荐视频接口错误:', error);
        res.status(500).json({
            success: false,
            message: '推荐失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/video-favorite/:id/has-recommended
 * @desc 检查用户是否已推荐过该视频
 * @access Private
 */
router.get('/video-favorite/:id/has-recommended', authenticateToken, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const userId = req.user.id;

        if (isNaN(videoId)) {
            return res.status(400).json({
                success: false,
                message: '视频ID无效',
                code: 400
            });
        }

        const hasRecommended = await hasUserRecommended(videoId, userId);
        res.json({
            success: true,
            message: '获取成功',
            data: { hasRecommended }
        });
    } catch (error) {
        logger.error('检查推荐状态接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取失败',
            code: 500
        });
    }
});

/**
 * @route POST /api/video-favorite/:id/move
 * @desc 移动视频到另一个收藏夹
 * @access Private
 */
router.post('/video-favorite/:id/move', authenticateToken, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const { favoriteId } = req.body;
        const isAdmin = req.user.permission === 1 || req.user.permission === 2;

        if (isNaN(videoId)) {
            return res.status(400).json({
                success: false,
                message: '视频ID无效',
                code: 400
            });
        }

        const result = await moveVideoToFavorite(videoId, favoriteId ? parseInt(favoriteId) : null, req.user.id, isAdmin);
        res.json(result);
    } catch (error) {
        logger.error('移动视频接口错误:', error);
        res.status(500).json({
            success: false,
            message: '移动失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/video-favorite/:id
 * @desc 获取视频详情
 * @access Public
 */
router.get('/video-favorite/:id', async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);

        if (isNaN(videoId)) {
            return res.status(400).json({
                success: false,
                message: '视频ID无效',
                code: 400
            });
        }

        const result = await getVideoDetail(videoId);
        res.json(result);
    } catch (error) {
        logger.error('获取视频详情接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取详情失败',
            code: 500
        });
    }
});

/**
 * @route DELETE /api/video-favorite/:id
 * @desc 删除视频（软删除）
 * @access Private
 */
router.delete('/video-favorite/:id', authenticateToken, async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const isAdmin = req.user.permission === 1 || req.user.permission === 2;

        if (isNaN(videoId)) {
            return res.status(400).json({
                success: false,
                message: '视频ID无效',
                code: 400
            });
        }

        const result = await deleteVideo(videoId, req.user.id, isAdmin);
        res.json(result);
    } catch (error) {
        logger.error('删除视频接口错误:', error);
        res.status(500).json({
            success: false,
            message: '删除失败',
            code: 500
        });
    }
});

// ==================== 管理员接口 ====================

/**
 * @route GET /api/video-favorite/admin/list
 * @desc 获取所有视频列表（管理员）
 * @access Private (Admin/SuperAdmin)
 */
router.get('/video-favorite/admin/list', authenticateToken, requirePermission(2), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;

        const result = await getAdminVideoList(null, page, pageSize);
        res.json(result);
    } catch (error) {
        logger.error('获取视频列表接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取列表失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/video-favorite/admin/pending
 * @desc 获取待审核视频列表（管理员）
 * @access Private (Admin/SuperAdmin)
 */
router.get('/video-favorite/admin/pending', authenticateToken, requirePermission(2), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;

        const result = await getPendingVideos(page, pageSize);
        res.json(result);
    } catch (error) {
        logger.error('获取待审核列表接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取列表失败',
            code: 500
        });
    }
});

/**
 * @route POST /api/video-favorite/admin/:id/review
 * @desc 审核视频（管理员）
 * @access Private (Admin/SuperAdmin)
 */
router.post('/video-favorite/admin/:id/review', authenticateToken, requirePermission(2), async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const { status } = req.body;
        const adminId = req.user.id;

        if (isNaN(videoId)) {
            return res.status(400).json({
                success: false,
                message: '视频ID无效',
                code: 400
            });
        }

        if (![1, 2].includes(status)) {
            return res.status(400).json({
                success: false,
                message: '审核状态无效（1-通过，2-拒绝）',
                code: 400
            });
        }

        const result = await reviewVideo(videoId, status, adminId);
        res.json(result);
    } catch (error) {
        logger.error('审核视频接口错误:', error);
        res.status(500).json({
            success: false,
            message: '审核失败',
            code: 500
        });
    }
});

/**
 * @route POST /api/video-favorite/admin/:id/revoke
 * @desc 撤销视频审核（重置为待审核状态）
 * @access Private (Admin/SuperAdmin)
 */
router.post('/video-favorite/admin/:id/revoke', authenticateToken, requirePermission(2), async (req, res) => {
    try {
        const videoId = parseInt(req.params.id);
        const adminId = req.user.id;

        if (isNaN(videoId)) {
            return res.status(400).json({
                success: false,
                message: '视频ID无效',
                code: 400
            });
        }

        const result = await revokeVideoReview(videoId, adminId);
        res.json(result);
    } catch (error) {
        logger.error('撤销视频审核接口错误:', error);
        res.status(500).json({
            success: false,
            message: '撤销审核失败',
            code: 500
        });
    }
});

export default router;
