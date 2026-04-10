import Database from 'better-sqlite3';
import fs from 'fs';
import path from "path";
import yaml from "yaml";

export default () => {
    const dbPath = path.join(path.resolve(), "data", "maruko-sql.db");
    const db = new Database(dbPath, {
        readonly: false,
        fileMustExist: false,
        foreign_keys: true
    });
    global.db = db;
    logger.info(chalk.white('数据库连接成功: ' + chalk.blue(dbPath)))

    executeSqlMigrations(db);
}

/**
 * 执行 SQL 数据库初始化文件
 * @param {Database} db - 数据库实例
 */
function executeSqlMigrations(db) {
    const sqlDir = path.join(path.resolve(), "sql");
    const configsDir = path.join(path.resolve(), "configs");
    const dbInitFile = path.join(configsDir, "sql-init.yaml");

    // 确保目录存在
    if (!fs.existsSync(sqlDir)) {
        logger.info(chalk.yellow('SQL 目录不存在，跳过数据库初始化'));
        return;
    }

    // 读取已执行的初始化记录
    let executedMigrations = [];
    if (fs.existsSync(dbInitFile)) {
        try {
            const config = yaml.parse(fs.readFileSync(dbInitFile, 'utf8'));
            executedMigrations = config?.executed || [];
        } catch (e) {
            logger.warn(chalk.yellow('读取数据库配置文件失败，将从头开始: ' + e.message));
        }
    }

    // 读取 sql 目录下的所有 .sql 文件并排序
    const sqlFiles = fs.readdirSync(sqlDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

    const newMigrations = sqlFiles.filter(file => !executedMigrations.includes(file));

    if (newMigrations.length === 0) {
        logger.info(chalk.green('所有 SQL 文件已执行完毕'));
        return;
    }

    logger.info(chalk.white(`发现 ${newMigrations.length} 个待执行的 SQL 文件`));

    // 执行未执行的初始化文件
    for (const file of newMigrations) {
        const filePath = path.join(sqlDir, file);
        try {
            const sqlContent = fs.readFileSync(filePath, 'utf8');
            db.exec(sqlContent);
            executedMigrations.push(file);
            logger.info(chalk.green(`✓ 已执行: ${file}`));
        } catch (e) {
            logger.error(chalk.red(`✗ 执行失败: ${file} - ${e.message}`));
            throw e;
        }
    }

    // 保存初始化记录
    fs.writeFileSync(dbInitFile, yaml.stringify({ executed: executedMigrations }));
    logger.info(chalk.green(`数据库初始化完成，共执行 ${newMigrations.length} 个文件`));
}