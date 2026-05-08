import chalk from 'chalk';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

// 获取应用名称
const getAppName = () => {
    try {
        const config = YAML.parse(fs.readFileSync(path.join(process.cwd(), 'configs', 'config.yaml'), 'utf8'));
        return config.log?.prefix || 'maruko-node';
    } catch {
        return 'maruko-node';
    }
};

// PM2 命令
const [, , cmd, ...args] = process.argv;
const appName = getAppName();

switch (cmd) {
    case 'stop':
        execSync(`pm2 stop ${appName}`, { stdio: 'inherit' });
        process.exit(0);
    case 'restart':
        execSync(`pm2 restart ${appName}`, { stdio: 'inherit' });
        process.exit(0);
    case 'logs':
        execSync(`pm2 logs ${appName} ${args.join(' ')}`, { stdio: 'inherit' });
        process.exit(0);
}

// 启动应用
(async () => {
    global.chalk = chalk;
    await (await import('./src/components/config.js')).default();
    await (await import('./src/components/log4.js')).default();

    logger.info(chalk.white("        ‌ฅ^•ﻌ•^ฅ‌         "));
    logger.info(chalk.white("——————小猫丸子启动中——————"));

    (await import('./src/components/config.js')).flushConfigLogs();

    await Promise.all([
        './src/components/sql.js',
        './src/components/redis.js',
        './src/components/email.js',
        './src/components/http.js',
        './src/components/initialize.js'
    ].map(m => import(m).then(mod => mod.default())));

    logger.info(chalk.white("———————起来干活惹喵———————"));
    logger.info(chalk.white("          ᜊ•͈⌔•͈ᜊ         "));
})();
