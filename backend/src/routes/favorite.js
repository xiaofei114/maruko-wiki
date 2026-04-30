import { Router } from 'express';
import {
    createFavorite,
    getUserFavorites,
    getPublicFavorites,
    getFavoriteDetail,
    updateFavorite,
    deleteFavorite,
    moveVideoToFavorite,
    getUserFavoritesForSelect
} from '../services/favorite.js';
import { authenticateToken } from '../method/auth.js';

const router = Router();

/**
 * @route POST /api/favorite
 * @desc 创建收藏夹
 * @access Private
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const result = await createFavorite(req.body, req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('创建收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '创建失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/favorite/my
 * @desc 获取我的收藏夹列表
 * @access Private
 */
router.get('/my', authenticateToken, async (req, res) => {
    try {
        const result = await getUserFavorites(req.user.id, true);
        res.json(result);
    } catch (error) {
        logger.error('获取我的收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/favorite/select
 * @desc 获取收藏夹列表（用于选择框）
 * @access Private
 */
router.get('/select', authenticateToken, async (req, res) => {
    try {
        const result = await getUserFavoritesForSelect(req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('获取收藏夹选择列表接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/favorite/public
 * @desc 获取公开收藏夹列表
 * @access Public
 */
router.get('/public', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const result = await getPublicFavorites(page, pageSize);
        res.json(result);
    } catch (error) {
        logger.error('获取公开收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取失败',
            code: 500
        });
    }
});

/**
 * @route GET /api/favorite/:id
 * @desc 获取收藏夹详情
 * @access Public/Private
 */
router.get('/:id', async (req, res) => {
    try {
        const favoriteId = parseInt(req.params.id);
        const userId = req.user?.id || 0;

        if (isNaN(favoriteId)) {
            return res.status(400).json({
                success: false,
                message: '收藏夹ID无效',
                code: 400
            });
        }

        const result = await getFavoriteDetail(favoriteId, userId);
        res.json(result);
    } catch (error) {
        logger.error('获取收藏夹详情接口错误:', error);
        res.status(500).json({
            success: false,
            message: '获取失败',
            code: 500
        });
    }
});

/**
 * @route PUT /api/favorite/:id
 * @desc 更新收藏夹
 * @access Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const favoriteId = parseInt(req.params.id);

        if (isNaN(favoriteId)) {
            return res.status(400).json({
                success: false,
                message: '收藏夹ID无效',
                code: 400
            });
        }

        const result = await updateFavorite(favoriteId, req.body, req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('更新收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '更新失败',
            code: 500
        });
    }
});

/**
 * @route DELETE /api/favorite/:id
 * @desc 删除收藏夹
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const favoriteId = parseInt(req.params.id);

        if (isNaN(favoriteId)) {
            return res.status(400).json({
                success: false,
                message: '收藏夹ID无效',
                code: 400
            });
        }

        const result = await deleteFavorite(favoriteId, req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('删除收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '删除失败',
            code: 500
        });
    }
});

/**
 * @route POST /api/favorite/move-video
 * @desc 移动视频到收藏夹
 * @access Private
 */
router.post('/move-video', authenticateToken, async (req, res) => {
    try {
        const { videoId, favoriteId } = req.body;

        if (!videoId) {
            return res.status(400).json({
                success: false,
                message: '视频ID不能为空',
                code: 400
            });
        }

        const result = await moveVideoToFavorite(videoId, favoriteId, req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('移动视频到收藏夹接口错误:', error);
        res.status(500).json({
            success: false,
            message: '操作失败',
            code: 500
        });
    }
});

export default router;
