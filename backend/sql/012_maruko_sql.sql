-- ==================== 企划表（日历版） ====================
-- 替代原来的 plan_document 表

CREATE TABLE IF NOT EXISTS plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                    -- 企划名称
    type TEXT NOT NULL CHECK(type IN ('anchor', 'dd')),  -- 企划类型：anchor-主播企划, dd-DD企划
    anchor_category TEXT,                   -- 主播企划分类（字典 dict_key）
    dd_visibility TEXT CHECK(dd_visibility IN ('public', 'internal')),  -- DD企划可见范围
    time_type TEXT NOT NULL CHECK(time_type IN ('single', 'range', 'long')),  -- 企划周期
    date TEXT,                              -- 单日企划的日期（YYYY-MM-DD）
    start_date TEXT,                        -- 持续企划开始日期
    end_date TEXT,                          -- 持续企划结束日期
    file_path TEXT,                         -- 附件存储路径
    file_name TEXT,                         -- 原始文件名
    create_time INTEGER DEFAULT 0,          -- 创建时间（Unix时间戳）
    update_time INTEGER DEFAULT 0,          -- 更新时间
    deleted INTEGER DEFAULT 0               -- 软删除标记
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_plan_type ON plan(type);
CREATE INDEX IF NOT EXISTS idx_plan_time_type ON plan(time_type);
CREATE INDEX IF NOT EXISTS idx_plan_date ON plan(date);
CREATE INDEX IF NOT EXISTS idx_plan_start_date ON plan(start_date);
CREATE INDEX IF NOT EXISTS idx_plan_end_date ON plan(end_date);
CREATE INDEX IF NOT EXISTS idx_plan_deleted ON plan(deleted);

-- 触发器
CREATE TRIGGER IF NOT EXISTS plan_insert_timestamp
AFTER INSERT ON plan
BEGIN
    UPDATE plan
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS plan_update_timestamp
AFTER UPDATE ON plan
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE plan
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;
