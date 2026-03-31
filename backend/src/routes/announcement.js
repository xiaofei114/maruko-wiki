import express from 'express';
import { createPublicRoute, createAdminRoute } from '../method/route-helpers.js';
import { 
    getAnnouncements, 
    createAnnouncement, 
    updateAnnouncement, 
    deleteAnnouncement
} from '../services/announcement.js';

const router = express.Router();

/**
 * 获取公告列表（公开接口，游客可访问）
 * GET /api/announcements
 * 返回数据已按置顶和时间排序
 */
router.get('/announcements', ...createPublicRoute(async () => {
    return await getAnnouncements();
}));

/**
 * 创建公告（管理员）
 * POST /api/admin/announcements
 */
router.post('/admin/announcements', ...createAdminRoute(async (req) => {
    const { title, content, author, isPinned, category } = req.body;
    
    // 验证必填字段
    if (!title?.trim()) {
        return {
            success: false,
            message: '公告标题不能为空',
            code: 400
        };
    }
    
    if (!content?.trim()) {
        return {
            success: false,
            message: '公告内容不能为空',
            code: 400
        };
    }
    
    // 验证分类
    const validCategories = ['system', 'feature', 'update', 'holiday'];
    if (category && !validCategories.includes(category)) {
        return {
            success: false,
            message: '无效的分类，可选值：system, feature, update, holiday',
            code: 400
        };
    }
    
    return await createAnnouncement({
        title,
        content,
        author,
        isPinned,
        category
    }, req.user.id);
}, 2));

/**
 * 更新公告（管理员）
 * PUT /api/admin/announcements/:id
 */
router.put('/admin/announcements/:id', ...createAdminRoute(async (req) => {
    const id = parseInt(req.params.id);
    
    if (!id || id <= 0) {
        return {
            success: false,
            message: '无效的公告ID',
            code: 400
        };
    }
    
    const { title, content, author, isPinned, category } = req.body;
    
    // 验证分类
    if (category) {
        const validCategories = ['system', 'feature', 'update', 'holiday'];
        if (!validCategories.includes(category)) {
            return {
                success: false,
                message: '无效的分类，可选值：system, feature, update, holiday',
                code: 400
            };
        }
    }
    
    return await updateAnnouncement(id, {
        title,
        content,
        author,
        isPinned,
        category
    }, req.user.id);
}, 2));

/**
 * 删除公告（管理员，软删除）
 * DELETE /api/admin/announcements/:id
 */
router.delete('/admin/announcements/:id', ...createAdminRoute(async (req) => {
    const id = parseInt(req.params.id);
    
    if (!id || id <= 0) {
        return {
            success: false,
            message: '无效的公告ID',
            code: 400
        };
    }
    
    return await deleteAnnouncement(id, req.user.id);
}, 2));

export default router;
