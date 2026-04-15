-- 为字典类型表添加软删除字段
ALTER TABLE dictionary_type ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- 为字典项表添加软删除字段
ALTER TABLE dictionary_item ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- 为日志表添加请求参数JSON字段
ALTER TABLE logs ADD COLUMN request_params TEXT;

-- 为用户表添加软删除字段
ALTER TABLE user ADD COLUMN is_deleted INTEGER DEFAULT 0;

-- 修改日志表时间戳字段为Unix时间戳
UPDATE logs SET created_at = strftime('%s', created_at) WHERE typeof(created_at) = 'text' AND created_at NOT LIKE '%-%';

INSERT INTO "dictionary_type" ("name", "dict_type") VALUES ( '外显样式', 'sys_display_style');
INSERT INTO "dictionary_type" ("name", "dict_type") VALUES ('用户权限', 'sys_user_permission');

INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('sys_display_style', '无', 'none', NULL, 0, 'none');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('sys_display_style', '信息', 'info', NULL, 1, 'info');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('sys_display_style', '主要', 'primary', NULL, 2, 'primary');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('sys_display_style', '成功', 'success', NULL, 3, 'success');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('sys_display_style', '警告', 'warning', NULL, 4, 'warning');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('sys_display_style', '危险', 'danger', NULL, 5, 'danger');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('sys_user_permission', '超级管理员', '1', NULL, 0, 'danger');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('sys_user_permission', '管理员', '2', NULL, 1, 'warning');
INSERT INTO "dictionary_item" ("dict_type", "dict_label", "dict_key", "dict_key2", "sort", "display_style") VALUES ('sys_user_permission', '猫丸伴', '3', NULL, 2, 'primary');

-- ==================== 字典表更新时间触发器 ====================

-- 字典类型表更新触发器
CREATE TRIGGER IF NOT EXISTS dictionary_type_update_timestamp
AFTER UPDATE ON dictionary_type
WHEN OLD.updated_at = NEW.updated_at
BEGIN
    UPDATE dictionary_type
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;

-- 字典项表更新触发器
CREATE TRIGGER IF NOT EXISTS dictionary_item_update_timestamp
AFTER UPDATE ON dictionary_item
WHEN OLD.updated_at = NEW.updated_at
BEGIN
    UPDATE dictionary_item
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.id;
END;