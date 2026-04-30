-- ==================== 收藏夹表 ====================
-- 用于存储用户的收藏夹（1对多：一个收藏夹包含多个视频）

CREATE TABLE IF NOT EXISTS favorite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                     -- 收藏夹名称
    description TEXT,                       -- 收藏夹描述
    user_id INTEGER NOT NULL,               -- 创建用户ID
    is_public INTEGER DEFAULT 1,            -- 是否公开：0-私密，1-公开
    is_deleted INTEGER DEFAULT 0,           -- 软删除标记：0-未删除，1-已删除
    create_time INTEGER DEFAULT 0,          -- 创建时间
    update_time INTEGER DEFAULT 0,          -- 更新时间
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_favorite_user_id ON favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_public ON favorite(is_public);
CREATE INDEX IF NOT EXISTS idx_favorite_deleted ON favorite(is_deleted);

-- 收藏夹表：插入时自动设置时间戳
CREATE TRIGGER IF NOT EXISTS favorite_insert_timestamp 
AFTER INSERT ON favorite
BEGIN
    UPDATE favorite 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 收藏夹表：更新时自动更新时间戳
CREATE TRIGGER IF NOT EXISTS favorite_update_timestamp 
AFTER UPDATE ON favorite
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE favorite 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- ==================== 视频收藏夹表 ====================
-- 用于存储用户上传的B站视频链接（每个视频属于一个收藏夹）

CREATE TABLE IF NOT EXISTS video_favorite (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bvid TEXT NOT NULL UNIQUE,              -- B站视频BV号
    title TEXT NOT NULL,                    -- 视频标题
    cover_url TEXT,                         -- 视频封面URL（B站原始URL）
    cover_local TEXT,                       -- 本地封面路径（下载到本地）
    uploader_name TEXT,                     -- 视频UP主昵称
    user_id INTEGER NOT NULL,               -- 上传用户ID
    favorite_id INTEGER,                    -- 所属收藏夹ID（可为空）
    is_review INTEGER DEFAULT 0,            -- 审核状态：0-待审核，1-已通过，2-已拒绝
    total_recommend INTEGER DEFAULT 0,      -- 总推荐数（累计）
    is_deleted INTEGER DEFAULT 0,           -- 软删除标记：0-未删除，1-已删除
    create_time INTEGER DEFAULT 0,          -- 创建时间
    update_time INTEGER DEFAULT 0,          -- 更新时间
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (favorite_id) REFERENCES favorite(id) ON DELETE SET NULL
);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_video_favorite_bvid ON video_favorite(bvid);
CREATE INDEX IF NOT EXISTS idx_video_favorite_user_id ON video_favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_video_favorite_favorite_id ON video_favorite(favorite_id);
CREATE INDEX IF NOT EXISTS idx_video_favorite_review ON video_favorite(is_review);
CREATE INDEX IF NOT EXISTS idx_video_favorite_deleted ON video_favorite(is_deleted);
CREATE INDEX IF NOT EXISTS idx_video_favorite_create_time ON video_favorite(create_time);

-- ==================== 视频每周推荐记录表 ====================
-- 用于记录每周视频的推荐情况（持久化备份，主要数据在Redis）

CREATE TABLE IF NOT EXISTS video_weekly_recommend (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,              -- 视频ID
    user_id INTEGER NOT NULL,               -- 推荐用户ID
    week_start INTEGER NOT NULL,            -- 周开始时间（周一0点的Unix时间戳）
    create_time INTEGER DEFAULT 0,          -- 创建时间
    FOREIGN KEY (video_id) REFERENCES video_favorite(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 创建唯一索引，确保用户每周只能推荐一次同一个视频
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_weekly_recommend_unique 
ON video_weekly_recommend(video_id, user_id, week_start);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_video_weekly_recommend_video_id ON video_weekly_recommend(video_id);
CREATE INDEX IF NOT EXISTS idx_video_weekly_recommend_user_id ON video_weekly_recommend(user_id);
CREATE INDEX IF NOT EXISTS idx_video_weekly_recommend_week ON video_weekly_recommend(week_start);

-- ==================== 时间戳触发器 ====================

-- 视频收藏夹表：插入时自动设置时间戳
CREATE TRIGGER IF NOT EXISTS video_favorite_insert_timestamp 
AFTER INSERT ON video_favorite
BEGIN
    UPDATE video_favorite 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 视频收藏夹表：更新时自动更新时间戳
CREATE TRIGGER IF NOT EXISTS video_favorite_update_timestamp 
AFTER UPDATE ON video_favorite
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE video_favorite 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 每周推荐表：插入时自动设置时间戳
CREATE TRIGGER IF NOT EXISTS video_weekly_recommend_insert_timestamp 
AFTER INSERT ON video_weekly_recommend
BEGIN
    UPDATE video_weekly_recommend 
    SET create_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;
