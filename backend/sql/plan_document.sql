-- 企划文档表
CREATE TABLE IF NOT EXISTS plan_document (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                    -- 文档标题
    file_path TEXT NOT NULL,                -- 文件存储路径
    file_name TEXT NOT NULL,                -- 原始文件名
    upload_time INTEGER NOT NULL,            -- 上传时间（Unix时间戳）
    uploader_id INTEGER NOT NULL,            -- 上传者ID
    is_current INTEGER DEFAULT 0,            -- 是否为当前显示文档：0-否，1-是
    create_time INTEGER DEFAULT 0,           -- 记录创建时间
    update_time INTEGER DEFAULT 0,           -- 记录更新时间
    FOREIGN KEY (uploader_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 企划文档表索引
CREATE INDEX IF NOT EXISTS idx_plan_document_uploader ON plan_document(uploader_id);
CREATE INDEX IF NOT EXISTS idx_plan_document_current ON plan_document(is_current);
CREATE INDEX IF NOT EXISTS idx_plan_document_upload_time ON plan_document(upload_time);

-- 企划文档表触发器
CREATE TRIGGER IF NOT EXISTS plan_document_insert_timestamp 
AFTER INSERT ON plan_document
BEGIN
    UPDATE plan_document 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS plan_document_update_timestamp 
AFTER UPDATE ON plan_document
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE plan_document 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;