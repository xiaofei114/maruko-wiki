import chalk from 'chalk';
(async () => {
    global.chalk = chalk
    // 先加载配置
    const configModule = await import('./src/components/config.js');
    await configModule.default();

    // 初始化日志系统
    await import('./src/components/log4.js').then(module => module.default());

    logger.info(chalk.white("        ‌ฅ^•ﻌ•^ฅ‌         "));
    logger.info(chalk.white("——————小猫丸子启动中——————"));

    // 刷新 config 的日志到
    configModule.flushConfigLogs();
    
    // 初始化其他组件
    await import('./src/components/sql.js').then(module => module.default());
    await import('./src/components/redis.js').then(module => module.default());
    await import('./src/components/email.js').then(module => module.default());
    await import('./src/components/http.js').then(module => module.default());
    await import('./src/components/initialize.js').then(module => module.default());

    logger.info(chalk.white("———————起来干活惹喵———————"));
    logger.info(chalk.white("          ᜊ•͈⌔•͈ᜊ         "));
})();
