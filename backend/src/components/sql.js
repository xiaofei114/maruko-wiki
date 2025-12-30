import Database from 'better-sqlite3';
import path from "path";

export default () => {
    const dbPath = path.join(path.resolve(), "data", "maruko-sql.db");
    const db = new Database(dbPath, {
        readonly: false,
        fileMustExist: false,
        foreign_keys: true // better-sqlite3特有配置
    });
    global.db = db;
    logger.info(chalk.white('数据库连接成功: ' + chalk.blue(dbPath)))
}