const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

// 读取配置文件
function loadConfig() {
    try {
        const configPath = path.join(__dirname, 'configs', 'config.yaml');
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = YAML.parse(configContent);
        return config;
    } catch (error) {
        console.error('读取配置文件失败:', error);
        return { log: { prefix: 'maruko-node' } };
    }
}

const config = loadConfig();
const appName = config.log?.prefix || 'maruko-node';

module.exports = {
    apps: [{
        name: appName,
        script: './app.js',
        cwd: __dirname,

        // 进程配置
        instances: 1,
        exec_mode: 'fork',

        // 自动重启
        autorestart: true,
        max_restarts: 10,
        min_uptime: '10s',

        // 内存限制
        max_memory_restart: '1G',

        // 日志配置
        log_file: './logs/pm2/combined.log',
        out_file: './logs/pm2/out.log',
        error_file: './logs/pm2/error.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss.SSS',

        // 环境变量
        env: {
            NODE_ENV: 'development'
        },
        env_production: {
            NODE_ENV: 'production'
        },

        // 监控
        watch: false,
        ignore_watch: ['node_modules', 'logs', 'data'],

        // 启动配置
        kill_timeout: 5000,
        listen_timeout: 10000,

        // 错误处理
        exp_backoff_restart_delay: 100
    }]
};
