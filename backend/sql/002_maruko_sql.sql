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
