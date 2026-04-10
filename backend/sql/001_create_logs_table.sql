-- 创建日志表
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_type TEXT,
    log_name TEXT,
    log_content TEXT,
    log_return TEXT,
    user_name TEXT,
    user_ip TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);