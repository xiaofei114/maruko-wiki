import express from 'express';
import path from 'path';
import { createPublicRoute, createAdminUploadRouteHandler } from '../method/route-helpers.js';
import { uploadAudio, getAudiosGrouped, createAudioClassification } from '../services/audio.js';

const router = express.Router();


// 获取音声列表 (游客可访问) - 返回按分类分组的数据
router.get('/audios', ...createPublicRoute(getAudiosGrouped));

// 上传音声 (需要登录)
router.post('/audios', ...createAdminUploadRouteHandler({
    destination: path.join(process.cwd(), 'data', 'document', 'audios'),
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['audio/mpeg', 'audio/mp3'],
    allowedExtensions: ['.mp3', '.MP3']
}, 'audio', async (req) => {
    const { name, classification_id, new_classification_name } = req.body;
    const file = req.file;

    // 验证必填参数
    if (!name?.trim()) {
        return { success: false, message: '音声名称不能为空', code: 400 };
    }

    let finalClassificationId;

    // 如果提供了新分类名称，创建新分类
    if (new_classification_name?.trim()) {
        const createResult = await createAudioClassification(new_classification_name.trim(), req.user.id);
        if (!createResult.success) {
            return createResult;
        }
        finalClassificationId = createResult.data.classificationId;
    }
    // 否则使用提供的现有分类ID
    else if (classification_id) {
        finalClassificationId = parseInt(classification_id);
        if (!finalClassificationId || finalClassificationId <= 0) {
            return { success: false, message: '无效的分类ID', code: 400 };
        }
    }
    // 两者都没有提供
    else {
        return { success: false, message: '请提供分类ID或新分类名称', code: 400 };
    }

    const audioData = {
        name: name.trim(),
        classificationId: finalClassificationId
    };

    const result = await uploadAudio(file, audioData, req.user.id, req.user.permission);
    if (result.success) {
        result.code = 201; // 创建成功
    }
    return result;
}));

export default router;
