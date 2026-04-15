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