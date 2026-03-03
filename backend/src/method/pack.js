import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

/**
 * 生成打包缓存键
 * @param {string} classificationName - 分类名称
 * @returns {string} 缓存键
 */
function generateCacheKey(classificationName) {
    return `pack:${classificationName}`;
}

/**
 * 打包音声文件为zip
 * @param {array} audios - 音声数据数组
 * @param {string} classificationName - 分类名称，用于zip文件名
 * @returns {object} 打包结果
 */
export async function packAudios(audios, classificationName) {
    try {
        // 生成本次打包的音声ID数组（排序）
        const currentAudioIds = audios.map(audio => audio.id).sort((a, b) => a - b);
        const cacheKey = generateCacheKey(classificationName);

        // 检查Redis缓存
        let cachedData = null;
        try {
            if (global.redis) {
                logger.debug(`尝试从Redis获取打包缓存: ${cacheKey}`);
                cachedData = await global.redis.get(cacheKey);
                logger.debug(`Redis缓存读取结果: ${cachedData ? '命中' : '未命中'}`);
            }
        } catch (redisError) {
            logger.error('Redis缓存读取失败:', redisError);
            // Redis失败不影响打包，继续执行
        }

        // 检查缓存是否有效
        if (cachedData) {
            try {
                const { audioIds, zipFilePath, zipFileName, fileSize } = JSON.parse(cachedData);
                // 对比音声ID数组
                const isSame = JSON.stringify(audioIds) === JSON.stringify(currentAudioIds);
                logger.debug(`缓存音声ID: ${audioIds.join(', ')}`);
                logger.debug(`当前音声ID: ${currentAudioIds.join(', ')}`);
                logger.debug(`ID数组是否相同: ${isSame}`);

                // 如果ID数组相同且文件存在，直接返回缓存结果
                if (isSame && fs.existsSync(zipFilePath)) {
                    logger.debug(`使用缓存的打包文件: ${zipFileName}`);
                    return {
                        success: true,
                        zipFilePath,
                        zipFileName,
                        fileSize
                    };
                }

                // 如果ID数组不同，删除旧缓存和旧文件
                if (fs.existsSync(zipFilePath)) {
                    try {
                        cleanupTempFile(zipFilePath)
                        logger.info(`删除旧打包文件: ${zipFilePath}`);
                    } catch (unlinkError) {
                        logger.error('删除旧打包文件失败:', unlinkError);
                    }
                }
            } catch (parseError) {
                logger.error('缓存数据解析失败:', parseError);
                // 解析失败，继续执行
            }
        }

        // 开始打包
        logger.debug(`开始打包音声文件，分类: ${classificationName}，数量: ${audios.length}`);
        const zip = new AdmZip();
        const audioDir = path.join(process.cwd(), 'data', 'document', 'audios');

        // 为每个音声创建目录结构并添加到zip
        for (const audio of audios) {
            const audioPath = path.join(audioDir, path.basename(audio.url));

            // 检查文件是否存在
            if (fs.existsSync(audioPath)) {
                let zipEntryName;

                // 根据是否是全部音声下载来调整目录结构
                if (classificationName === '全部音声') {
                    // 全部音声下载：全部音声/音声标签/音声.mp3
                    const dirPath = path.join('全部音声', audio.classification_name || '未分类');
                    zipEntryName = path.join(dirPath, `${audio.name}.mp3`);
                } else {
                    // 按标签下载：音声标签/音声.mp3
                    zipEntryName = path.join(classificationName, `${audio.name}.mp3`);
                }

                logger.debug(`添加文件到zip: ${zipEntryName}`);
                // 读取文件并添加到zip
                const fileContent = fs.readFileSync(audioPath);
                zip.addFile(zipEntryName, fileContent);
            } else {
                logger.warn(`音声文件不存在: ${audioPath}`);
            }
        }

        // 生成zip文件路径
        const tempDir = path.join(process.cwd(), 'data', 'temp');
        if (!fs.existsSync(tempDir)) {
            logger.debug(`创建临时目录: ${tempDir}`);
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const zipFileName = `${classificationName || '全部音声'}_${Date.now()}.zip`;
        const zipFilePath = path.join(tempDir, zipFileName);

        // 写入zip文件
        logger.debug(`写入zip文件: ${zipFilePath}`);
        zip.writeZip(zipFilePath);

        const packResult = {
            success: true,
            zipFilePath,
            zipFileName,
            fileSize: fs.statSync(zipFilePath).size
        };

        logger.info(`打包完成: ${zipFileName}，大小: ${(packResult.fileSize / 1024 / 1024).toFixed(2)}MB`);

        // 缓存打包结果到Redis（无有效期）
        try {
            if (global.redis) {
                const cacheData = {
                    audioIds: currentAudioIds,
                    ...packResult
                };
                logger.debug(`缓存打包结果到Redis: ${cacheKey}`);
                await global.redis.set(cacheKey, JSON.stringify(cacheData));
                logger.debug(`Redis缓存写入成功`);
            }
        } catch (redisError) {
            logger.error('Redis缓存写入失败:', redisError);
            // Redis失败不影响打包，继续执行
        }

        return packResult;
    } catch (error) {
        logger.error('打包音声文件失败:', error);
        throw error;
    }
}

/**
 * 清理临时文件
 * @param {string} filePath - 文件路径
 */
export function cleanupTempFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`清理成功: ${filePath}`);
        }
    } catch (error) {
        logger.error('清理失败:', error);
    }
}
