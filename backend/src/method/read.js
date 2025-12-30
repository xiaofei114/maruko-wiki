import fs from 'fs';
import path from "path";
import yaml from 'yaml';

export function getPath_config(paths, name) {
    // 优先检查 YAML 文件
    const yamlPath = path.join(path.resolve(), paths, `${name}.yaml`);
    if (fs.existsSync(yamlPath)) {
        return yamlPath;
    }

    // 回退到 JSON 文件
    const jsonPath = path.join(path.resolve(), paths, `${name}.json`);
    if (fs.existsSync(jsonPath)) {
        return jsonPath;
    }

    // 默认返回 YAML 路径（用于创建新文件）
    return yamlPath;
}

export function read_json(paths, name) {
    try {
        // 特殊处理 configs/config.* 文件，使用全局缓存
        if (paths === 'configs' && (name === 'config' || name === 'config.yaml' || name === 'config.yml')) {
            if (global.appConfig) {
                return global.appConfig;
            }
            // 如果缓存不存在，尝试读取文件
        }

        let filePath = getPath_config(paths, name);

        // 如果目标配置文件不存在，尝试从 examples 目录读取
        if (!fs.existsSync(filePath)) {
            const examplePath = path.join(path.resolve(), 'examples', name + (filePath.endsWith('.json') ? '.json' : '.yaml'));
            if (fs.existsSync(examplePath)) {
                if (typeof logger !== 'undefined') {
                    logger.warn(`配置文件 ${filePath} 不存在，使用示例配置 ${examplePath}`);
                } else {
                    console.warn(`配置文件 ${filePath} 不存在，使用示例配置 ${examplePath}`);
                }
                filePath = examplePath;
            } else {
                throw new Error(`配置文件不存在: ${filePath}，且示例配置也不存在`);
            }
        }

        const data = fs.readFileSync(filePath, "utf8");

        // 根据文件扩展名决定解析方式
        if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
            return yaml.parse(data);
        } else {
            return JSON.parse(data);
        }
    } catch (error) {
        // 在 logger 初始化之前，使用 console.error
        if (typeof logger !== 'undefined') {
            logger.error('读取配置文件失败:', error);
        } else {
            console.error('读取配置文件失败:', error);
        }
        throw error;
    }
}