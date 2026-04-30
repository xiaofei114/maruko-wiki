module.exports = {
    apps: [{
        name: 'maruko-node',
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

        // 文件监听（用于配置热更新）
        watch: false,  // 默认关闭，通过配置管理开启
        watch_delay: 2000,
        ignore_watch: ['node_modules', 'logs', 'data', 'uploads', '.git'],

        // 优雅关闭
        kill_timeout: 5000,
        listen_timeout: 10000,

        // 重启延迟
        restart_delay: 2000,

        // 错误处理
        stop_exit_codes: [0],

        // 元数据
        instance_var: 'INSTANCE_ID',
        merge_logs: true,

        // 启动参数
        node_args: [],

        // PM2 模块配置
        pmx: false,
        automation: false,

        // 健康检查
        // health_check_grace_period: 30000,

        // 自定义指标
        // metrics: {
        //     http_latency: {
        //         type: 'histogram',
        //         name: 'http_request_duration_seconds',
        //         help: 'Duration of HTTP requests in seconds',
        //         labelNames: ['method', 'route', 'status_code'],
        //         buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
        //     }
        // }
    }]
};
