import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件路径
const projectRoot = path.resolve(__dirname, '../..');
const configFile = path.join(projectRoot, 'configs', 'config.yaml');
const configFieldsFile = path.join(projectRoot, 'data', 'configFields.json');

// 字段类型映射表（从 JSON 文件加载）
let FIELD_TYPE_MAP = {};
let GROUP_ORDER = [];

/**
 * 加载字段映射配置
 */
function loadFieldConfig() {
    try {
        if (fs.existsSync(configFieldsFile)) {
            const data = fs.readFileSync(configFieldsFile, 'utf8');
            const config = JSON.parse(data);
            FIELD_TYPE_MAP = config.fields || {};
            GROUP_ORDER = config._order || ['服务器', '安全', '日志', 'Redis', '邮件', 'Bilibili', 'DeepSeek', 'AI', '下载', '上传', '其他'];
        } else {
            logger.warn('configFields.json 不存在，使用默认配置');
            FIELD_TYPE_MAP = {};
            GROUP_ORDER = ['其他'];
        }
    } catch (error) {
        logger.error('加载 configFields.json 失败:', error);
        FIELD_TYPE_MAP = {};
        GROUP_ORDER = ['其他'];
    }
}

// 初始化加载
loadFieldConfig();

/**
 * 获取当前配置
 * @returns {object} 配置对象
 */
export function getConfig() {
    try {
        if (fs.existsSync(configFile)) {
            const configData = fs.readFileSync(configFile, 'utf8');
            return yaml.parse(configData);
        }
        return null;
    } catch (error) {
        logger.error('读取配置失败:', error);
        throw error;
    }
}

/**
 * 保存配置
 * @param {object} config - 配置对象
 */
export function saveConfig(config) {
    try {
        const yamlContent = yaml.stringify(config);
        fs.writeFileSync(configFile, yamlContent, 'utf8');
        logger.info('配置文件已保存');
        return true;
    } catch (error) {
        logger.error('保存配置失败:', error);
        throw error;
    }
}

/**
 * 触发 PM2 重启
 * @returns {Promise<boolean>}
 */
export async function restartWithPM2() {
    try {
        // 检查是否在 PM2 环境下运行
        if (process.env.PM2_USAGE) {
            logger.info('正在通过 PM2 重启服务...');
            await execAsync('pm2 restart maruko-node');
            return true;
        } else {
            logger.warn('当前不在 PM2 环境下运行，无法自动重启');
            return false;
        }
    } catch (error) {
        logger.error('PM2 重启失败:', error);
        throw error;
    }
}

/**
 * 检查 PM2 状态
 * @returns {Promise<object>}
 */
export async function getPM2Status() {
    try {
        const { stdout } = await execAsync('pm2 jlist');
        const processes = JSON.parse(stdout);
        const marukoProcess = processes.find(p => p.name === 'maruko-node');

        if (marukoProcess) {
            return {
                running: marukoProcess.pm2_env.status === 'online',
                status: marukoProcess.pm2_env.status,
                pid: marukoProcess.pid,
                uptime: marukoProcess.pm2_env.pm_uptime,
                restartCount: marukoProcess.pm2_env.restart_time,
                memory: marukoProcess.monit?.memory,
                cpu: marukoProcess.monit?.cpu,
            };
        }

        return { running: false, status: 'not_found' };
    } catch (error) {
        return { running: false, status: 'error', error: error.message };
    }
}

/**
 * 根据值推断类型
 * @param {*} value - 配置值
 * @returns {string} 类型
 */
function inferType(value) {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
}

/**
 * 展平配置对象为路径形式
 * @param {object} obj - 配置对象
 * @param {string} prefix - 前缀
 * @returns {object} 展平后的对象
 */
function flattenConfig(obj, prefix = '') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            Object.assign(result, flattenConfig(value, fullKey));
        } else {
            result[fullKey] = value;
        }
    }
    return result;
}

/**
 * 获取配置项的元数据（用于前端表单）
 * 动态读取配置文件并生成元数据
 * @returns {object}
 */
export function getConfigMetadata() {
    const config = getConfig();
    if (!config) {
        return { groups: [], fields: {} };
    }

    // 展平配置
    const flatConfig = flattenConfig(config);
    const groups = new Map();
    const fields = {};

    for (const [key, value] of Object.entries(flatConfig)) {
        // 检查是否有特殊配置
        const fieldConfig = FIELD_TYPE_MAP[key];

        if (fieldConfig) {
            // 使用预定义配置
            const groupName = fieldConfig.group || '其他';
            if (!groups.has(groupName)) {
                groups.set(groupName, { label: groupName, fields: [] });
            }
            groups.get(groupName).fields.push(key);

            fields[key] = {
                key,
                label: fieldConfig.label || key,
                type: fieldConfig.type || inferType(value),
                value,
                ...fieldConfig
            };
        } else {
            // 自动推断类型
            const type = inferType(value);
            const groupName = '其他';
            if (!groups.has(groupName)) {
                groups.set(groupName, { label: groupName, fields: [] });
            }
            groups.get(groupName).fields.push(key);

            fields[key] = {
                key,
                label: key,
                type,
                value,
                group: groupName
            };

            // 数字类型添加范围限制
            if (type === 'number') {
                fields[key].min = 0;
                fields[key].max = 999999;
            }
        }
    }

    // 按 GROUP_ORDER 排序分组
    const sortedGroups = [];
    for (const groupName of GROUP_ORDER) {
        if (groups.has(groupName)) {
            sortedGroups.push({
                name: groupName,
                ...groups.get(groupName)
            });
            groups.delete(groupName);
        }
    }
    // 添加剩余分组
    for (const [name, group] of groups) {
        sortedGroups.push({ name, ...group });
    }

    return {
        groups: sortedGroups,
        fields
    };
}

/**
 * 将展平的配置还原为嵌套结构
 * @param {object} flatConfig - 展平的配置
 * @returns {object} 嵌套配置
 */
function unflattenConfig(flatConfig) {
    const result = {};
    for (const [key, value] of Object.entries(flatConfig)) {
        const keys = key.split('.');
        let current = result;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
    }
    return result;
}

/**
 * 验证配置
 * @param {object} config - 配置对象（展平格式）
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
    const errors = [];

    // 验证服务器端口
    if (config.httpPort !== undefined) {
        const port = parseInt(config.httpPort);
        if (isNaN(port) || port < 1 || port > 65535) {
            errors.push('HTTP 端口号必须在 1-65535 之间');
        }
    }

    // 验证 Redis 端口
    if (config['redis.port'] !== undefined) {
        const port = parseInt(config['redis.port']);
        if (isNaN(port) || port < 1 || port > 65535) {
            errors.push('Redis 端口号必须在 1-65535 之间');
        }
    }

    // 验证邮箱端口
    if (config['email.port'] !== undefined) {
        const port = parseInt(config['email.port']);
        if (isNaN(port) || port < 1 || port > 65535) {
            errors.push('SMTP 端口号必须在 1-65535 之间');
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * 根据字段类型转换值
 * @param {string} key - 字段键名
 * @param {string} value - 字符串值
 * @returns {any} 转换后的值
 */
function convertValueByType(key, value) {
    const fieldConfig = FIELD_TYPE_MAP[key];
    if (!fieldConfig) {
        // 没有配置的类型，尝试自动推断
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;
        if (value === '' || value === undefined || value === null) return null;
        const num = Number(value);
        if (!isNaN(num) && value !== '') return num;
        return value;
    }

    const type = fieldConfig.type;

    switch (type) {
        case 'number':
            return Number(value) || 0;
        case 'boolean':
            return value === 'true' || value === true;
        case 'array':
            // 数组类型：逗号分隔的字符串转为数组
            if (!value) return [];
            return value.split(',').map(item => item.trim()).filter(item => item !== '');
        case 'password':
        case 'string':
        default:
            // 空字符串转为 null
            return value === '' || value === undefined || value === null ? null : String(value);
    }
}

/**
 * 保存展平的配置（带类型转换）
 * @param {object} flatConfig - 展平的配置
 */
export function saveFlatConfig(flatConfig) {
    // 转换值类型
    const convertedConfig = {};
    for (const [key, value] of Object.entries(flatConfig)) {
        convertedConfig[key] = convertValueByType(key, value);
    }

    const nestedConfig = unflattenConfig(convertedConfig);
    return saveConfig(nestedConfig);
}

// 导出映射表供前端使用
export { FIELD_TYPE_MAP, GROUP_ORDER };
