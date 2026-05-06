-- ==================== 舰长礼物表升级：添加日期区间支持 ====================
-- 用于设置特殊日期区间的舰礼，如5月1-5日有特殊舰礼

-- 添加开始日期字段 (格式: YYYY-MM-DD，为空表示整个月都有效)
ALTER TABLE captain_gifts ADD COLUMN start_date TEXT;

-- 添加结束日期字段 (格式: YYYY-MM-DD，为空表示持续到月底)
ALTER TABLE captain_gifts ADD COLUMN end_date TEXT;

-- 创建索引加速日期查询
CREATE INDEX IF NOT EXISTS idx_captain_gifts_dates ON captain_gifts(year, month, start_date, end_date);

-- 更新现有数据：默认无日期限制（整个月有效）
UPDATE captain_gifts SET start_date = NULL, end_date = NULL;

-- 添加字典项：舰礼日期类型
INSERT INTO "dictionary_type" ("name", "dict_type") VALUES ('舰礼日期类型', 'gift_date_type');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('gift_date_type', '整月有效', '0', NULL, 1, 'success');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('gift_date_type', '日期区间', '1', NULL, 2, 'warning');
