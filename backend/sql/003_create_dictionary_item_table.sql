-- 创建字典项表
CREATE TABLE IF NOT EXISTS dictionary_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dict_type TEXT NOT NULL,
    dict_label TEXT NOT NULL,
    dict_key TEXT NOT NULL,
    dict_key2 TEXT,
    sort INTEGER DEFAULT 0,
    display_style TEXT,
    is_banned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dict_type) REFERENCES dictionary_type(dict_type) ON DELETE CASCADE
);