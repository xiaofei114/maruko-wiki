-- ==================== 主播数据统计表 ====================
-- 用于记录每天的主播粉丝数、舰长数、粉丝团成员数等数据

CREATE TABLE IF NOT EXISTS anchor_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_date INTEGER NOT NULL,           -- 记录日期（Unix时间戳，当天0点）
    fans_count INTEGER NOT NULL DEFAULT 0,  -- 粉丝数
    captain_count INTEGER NOT NULL DEFAULT 0, -- 舰长数（普通舰长）
    commander_count INTEGER DEFAULT 0,      -- 总督数
    vice_commander_count INTEGER DEFAULT 0, -- 提督数
    fans_member_count INTEGER DEFAULT 0,    -- 粉丝团成员数
    create_time INTEGER DEFAULT 0,          -- 记录创建时间
    update_time INTEGER DEFAULT 0           -- 记录更新时间
);

-- 创建唯一索引，确保每天只有一条记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_anchor_stats_date ON anchor_stats(record_date);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_anchor_stats_create_time ON anchor_stats(create_time);

-- ==================== 时间戳触发器 ====================

-- 插入时自动设置时间戳
CREATE TRIGGER IF NOT EXISTS anchor_stats_insert_timestamp 
AFTER INSERT ON anchor_stats
BEGIN
    UPDATE anchor_stats 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 更新时自动更新时间戳
CREATE TRIGGER IF NOT EXISTS anchor_stats_update_timestamp 
AFTER UPDATE ON anchor_stats
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE anchor_stats 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- ==================== 舰长礼物表 ====================
-- 用于记录每月舰长礼物及解锁条件

CREATE TABLE IF NOT EXISTS captain_gifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,                  -- 年份
    month INTEGER NOT NULL,                 -- 月份 (1-12)
    gift_name TEXT NOT NULL,                -- 礼物名称
    gift_content TEXT,                      -- 礼物内容描述
    required_fans_count INTEGER DEFAULT 0,  -- 解锁所需粉丝数 (0表示无限制，为基础舰礼)
    sort_order INTEGER DEFAULT 0,           -- 排序顺序
    create_time INTEGER DEFAULT 0,          -- 创建时间
    update_time INTEGER DEFAULT 0           -- 更新时间
);

-- 创建唯一索引，确保每月每个礼物只出现一次
CREATE UNIQUE INDEX IF NOT EXISTS idx_captain_gifts_year_month_name ON captain_gifts(year, month, gift_name);

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_captain_gifts_year_month ON captain_gifts(year, month);
CREATE INDEX IF NOT EXISTS idx_captain_gifts_sort ON captain_gifts(year, month, sort_order);

-- ==================== 时间戳触发器 ====================

-- 插入时自动设置时间戳
CREATE TRIGGER IF NOT EXISTS captain_gifts_insert_timestamp 
AFTER INSERT ON captain_gifts
BEGIN
    UPDATE captain_gifts 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 更新时自动更新时间戳
CREATE TRIGGER IF NOT EXISTS captain_gifts_update_timestamp
AFTER UPDATE ON captain_gifts
BEGIN
    UPDATE captain_gifts 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;
