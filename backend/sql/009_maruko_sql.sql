-- ==================== 用户表添加粉丝牌熄灭状态字段 ====================
-- 用于区分"从未有过粉丝牌"和"粉丝牌熄灭了"两种情况

-- 粉丝牌熄灭状态：0-未熄灭/从未有过, 1-已熄灭
ALTER TABLE user ADD COLUMN fan_medal_extinguished INTEGER DEFAULT 0;

-- 添加注释说明：
-- fan_medal_extinguished = 0: 粉丝牌正常或从未有过粉丝牌
-- fan_medal_extinguished = 1: 粉丝牌曾经点亮过但现已熄灭
-- 
-- 判断逻辑：
-- 1. fan_level = 0 且 fan_medal_extinguished = 0: 从未有过粉丝牌
-- 2. fan_level > 0 且 fan_medal_extinguished = 0: 粉丝牌正常
-- 3. fan_level > 0 且 fan_medal_extinguished = 1: 粉丝牌熄灭（保留历史等级）
