import OpenAI from "openai";
import { read_json } from '../method/read.js';
import { createSuccessResponse, createErrorResponse } from '../method/business-utils.js';
import { queryAll } from '../method/database.js';

/**
 * 获取AI客户端实例
 * @returns {OpenAI|null} OpenAI客户端实例或null（如果API Key未配置）
 */
function getAIClient() {
    const config = read_json("configs", "config");

    // 检查API Key是否配置
    if (!config.deepseek || !config.deepseek.apiKey || config.deepseek.apiKey === 'null' || config.deepseek.apiKey === null) {
        return null;
    }

    return new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: config.deepseek.apiKey,
    });
}

/**
 * 根据用户描述匹配音频
 * @param {Array} audioList - 音频列表，格式: [{id: string, name: string}]
 * @param {string} userInput - 用户描述文本
 * @returns {Promise<object>} 返回匹配结果
 */
export async function matchAudiosByDescription(audioList, userInput) {
    const openai = getAIClient();

    // 检查AI客户端是否可用
    if (!openai) {
        return createErrorResponse('AI服务未配置，请联系管理员', 503);
    }

    try {
        // 1. 准备系统角色设定
        const systemMessage =
            `你是一个音频匹配助手，请根据用户描述，从猫丸子的音频库中挑选最合适的音频。

            你的任务：
            1. 理解用户想要表达的内容、情感或场景
            2. 从音频库中选择最能匹配用户描述的音频
            3. 输出JSON格式，包含音频ID数组
            4. 每次匹配的音频尽量不要超过5个，但是如果用户强调全部或是指定数量，则尽可能多选
            5. 选择的音频的顺序尽量保证一定的连贯性

            输出格式要求：
            {
              "matched_audios": ["audio_id1", "audio_id2", ...],
              "reason": "选择这些音频的原因简述"
            }

            选择规则：
            - 优先选择名称与用户描述直接相关的音频
            - 如果没有完全匹配，选择情感、氛围相似的音频
            - 可以选择多个音频，按逻辑顺序排列
            - 如果找不到任何匹配，返回空数组`;

        // 2. 构建音频库描述字符串
        const audioLibraryDescription = audioList
            .map(audio => `ID: ${audio.id}, 名称: ${audio.name}`)
            .join('\n');

        // 3. 构建完整的prompt
        const messages = [
            {
                role: "system",
                content: systemMessage
            },
            {
                role: "user",
                content: `我有以下音频库：

                        ${audioLibraryDescription}

                        用户需求：${userInput}

                        请根据用户需求，从音频库中选择最合适的音频，并按播放顺序输出ID。`
            }
        ];

        // 4. 调用AI
        const completion = await openai.chat.completions.create({
            messages: messages,
            model: "deepseek-chat",
            temperature: 0.1, // 降低随机性，提高稳定性
            response_format: { type: "json_object" } // 确保返回JSON格式
        });

        // 5. 解析AI的回复
        const aiResponse = completion.choices[0].message.content;
        logger.debug("AI原始回复:", aiResponse);

        try {
            const result = JSON.parse(aiResponse);

            // 验证返回的格式
            if (result && Array.isArray(result.matched_audios)) {
                logger.debug("匹配原因:", result.reason || "未提供原因");
                return createSuccessResponse({
                    matched_audios: result.matched_audios,
                    reason: result.reason || "AI匹配完成"
                });
            } else {
                logger.warn("返回格式不正确，尝试从文本中提取");
                const extractedIds = extractAudioIdsFromText(aiResponse, audioList);
                return createSuccessResponse({
                    matched_audios: extractedIds,
                    reason: "从文本中提取的匹配结果"
                });
            }
        } catch (parseError) {
            logger.warn("JSON解析失败，尝试从文本中提取音频ID:", parseError.message);
            const extractedIds = extractAudioIdsFromText(aiResponse, audioList);
            return createSuccessResponse({
                matched_audios: extractedIds,
                reason: "解析失败，从文本中提取的结果"
            });
        }

    } catch (error) {
        logger.error("AI音频匹配失败:", error);

        // 处理不同的AI API错误
        if (error.status === 402) {
            // 余额不足
            return createErrorResponse('AI服务余额不足，请联系管理员', 402);
        } else if (error.status === 429) {
            // 请求过于频繁
            return createErrorResponse('AI服务请求过于频繁，请稍后再试', 429);
        } else if (error.status >= 500) {
            // 服务器错误
            return createErrorResponse('AI服务暂时不可用，请稍后再试', 503);
        } else {
            // 其他错误
            return createErrorResponse('AI匹配服务暂时不可用', 500);
        }
    }
}

/**
 * 从文本中提取音频ID（如果AI返回的不是标准JSON）
 * @param {string} text - AI返回的文本
 * @param {Array} audioList - 音频列表
 * @returns {Array} 提取的音频ID数组
 */
function extractAudioIdsFromText(text, audioList) {
    const ids = [];

    // 方法1：在文本中查找已知的音频ID
    audioList.forEach(audio => {
        if (text.includes(audio.id)) ids.push(audio.id);
    });

    // 方法2：如果没找到，尝试正则匹配
    if (ids.length === 0) {
        const idRegex = /["']?([a-zA-Z0-9_\-]+)["']?/g;
        const potentialIds = text.match(idRegex) || [];

        // 验证这些ID是否在音频库中
        potentialIds.forEach(id => {
            const cleanId = id.replace(/['"]/g, '');
            if (audioList.some(audio => audio.id === cleanId)) ids.push(cleanId);
        });
    }

    return ids;
}

/**
 * 获取音频库并进行AI匹配
 * @param {string} userInput - 用户描述文本
 * @returns {Promise<object>} 匹配结果
 */
export async function getAudioMatches(userInput) {
    try {
        // 检查AI服务是否可用
        const aiClient = getAIClient();
        if (!aiClient) {
            return createErrorResponse('AI服务未配置，请联系管理员', 503);
        }

        // 从数据库获取音频库
        const audioList = queryAll("SELECT id, name FROM audio WHERE is_deleted = 0 AND is_review = 1");

        if (audioList.length === 0) {
            return createErrorResponse('音频库为空，请联系管理员', 503);
        }

        logger.info(`开始AI匹配，用户输入: ${userInput}, 音频库大小: ${audioList.length}`);

        // 调用AI匹配音频
        const matchResult = await matchAudiosByDescription(audioList, userInput);

        if (!matchResult.success) {
            return matchResult; // 返回错误结果
        }

        const matchedAudios = matchResult.data.matched_audios;

        logger.info(`AI匹配完成，匹配到 ${matchedAudios.length} 个音频`);

        if (matchedAudios.length === 0) {
            return createSuccessResponse({
                matched_audios: [],
                count: 0,
                message: '未找到匹配的音频'
            });
        }

        return createSuccessResponse({
            matched_audios: matchedAudios,
            count: matchedAudios.length,
            message: `找到 ${matchedAudios.length} 个匹配的音频`,
            reason: matchResult.data.reason
        });

    } catch (error) {
        logger.error('获取音频匹配失败:', error);
        return createErrorResponse('音频匹配服务暂时不可用', 500);
    }
}
