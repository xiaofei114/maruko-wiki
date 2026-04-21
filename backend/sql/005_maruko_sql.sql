-- ==================== 舰长礼物表升级 ====================
-- 添加礼物类型和包含关系字段，支持舰长/提督/总督礼物区分

-- 添加礼物类型字段 (1=舰长礼, 2=提督礼, 3=总督礼)
ALTER TABLE captain_gifts ADD COLUMN gift_type INTEGER DEFAULT 1;

-- 添加包含关系字段 (bitmap: 1=包含舰长礼, 2=包含提督礼, 4=包含总督礼)
-- 例如: 提督礼包含舰长礼 = 1, 总督礼包含提督礼和舰长礼 = 1+2 = 3
ALTER TABLE captain_gifts ADD COLUMN includes INTEGER DEFAULT 0;

-- 添加显示进度条标记 (0=不显示, 1=显示)
ALTER TABLE captain_gifts ADD COLUMN show_progress INTEGER DEFAULT 1;

-- 创建索引加速按类型查询
CREATE INDEX IF NOT EXISTS idx_captain_gifts_type ON captain_gifts(year, month, gift_type);

-- 更新现有数据：默认都是舰长礼，显示进度条
UPDATE captain_gifts SET gift_type = 1, includes = 0, show_progress = 1;

INSERT INTO "dictionary_type" ("name", "dict_type") VALUES ('礼物类型', 'gift_type');
INSERT INTO "dictionary_type" ("name", "dict_type") VALUES ('舰礼包含关系', 'includes_type');
INSERT INTO "dictionary_type" ("name", "dict_type") VALUES ('舰礼显示进度', 'show_progress');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('gift_type', '舰长礼', '1', NULL, 1, 'primary');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('gift_type', '提督礼', '2', NULL, 2, 'warning');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('gift_type', '总督礼', '3', NULL, 3, 'danger');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('includes_type', '包含舰长礼', '1', NULL, 1, 'primary');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('includes_type', '包含提督礼', '2', NULL, 2, 'success');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('show_progress', '隐藏', '0', NULL, 1, 'info');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('show_progress', '显示', '1', NULL, 2, 'success');