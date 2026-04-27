-- ==================== 消息通知表 ====================
-- 用于存储用户的消息通知

CREATE TABLE IF NOT EXISTS notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,               -- 用户ID
    title TEXT NOT NULL,                    -- 消息标题
    content TEXT NOT NULL,                  -- 消息内容
    type TEXT DEFAULT 'system',             -- 消息类型：system-系统通知, review-审核通知
    is_read INTEGER DEFAULT 0,              -- 是否已读：0-未读，1-已读
    is_deleted INTEGER DEFAULT 0,           -- 软删除标记：0-未删除，1-已删除
    create_time INTEGER DEFAULT 0,          -- 创建时间
    update_time INTEGER DEFAULT 0,          -- 更新时间
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON notification(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_create_time ON notification(create_time);

-- ==================== 时间戳触发器 ====================

-- 插入时自动设置时间戳
CREATE TRIGGER IF NOT EXISTS notification_insert_timestamp 
AFTER INSERT ON notification
BEGIN
    UPDATE notification 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 更新时自动更新时间戳
CREATE TRIGGER IF NOT EXISTS notification_update_timestamp 
AFTER UPDATE ON notification
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE notification 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- ==================== 用户表B站相关字段 ====================
-- 为用户表添加B站绑定相关字段

-- B站UID
ALTER TABLE user ADD COLUMN bilibili_uid TEXT;

-- 头像文件名（存储在/data/document/avatar目录下）
ALTER TABLE user ADD COLUMN avatar TEXT;

-- 粉丝等级
ALTER TABLE user ADD COLUMN fan_level INTEGER DEFAULT 0;

-- 舰长类型：0-无, 1-舰长, 2-提督, 3-总督
ALTER TABLE user ADD COLUMN captain_type INTEGER DEFAULT 0;

-- 是否为B站绑定用户：0-否, 1-是
ALTER TABLE user ADD COLUMN is_bilibili_bound INTEGER DEFAULT 0;

-- ==================== 为企划文档表添加审核状态字段 ====================

-- 添加 is_review 字段到 plan_document 表
ALTER TABLE plan_document ADD COLUMN is_review INTEGER NOT NULL DEFAULT 0 CHECK(is_review IN (0, 1, 2));

-- 添加注释说明：0-未审核, 1-已通过, 2-已拒绝
-- SQLite 不支持 COMMENT，这里仅作说明

