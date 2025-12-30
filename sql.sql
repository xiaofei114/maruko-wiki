-- 用户账号表
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    account_number TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    permission INTEGER NOT NULL DEFAULT 3,
    is_banned INTEGER NOT NULL DEFAULT 0 CHECK(is_banned IN (0, 1)),
    create_time INTEGER DEFAULT 0,
    update_time INTEGER DEFAULT 0
);

-- 相册表
CREATE TABLE photo_album (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    introduction TEXT,
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),
    is_review INTEGER NOT NULL DEFAULT 0 CHECK(is_review IN (0, 1, 2)),
    create_time INTEGER NOT NULL DEFAULT 0,
    update_time INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 照片表
CREATE TABLE photo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),
    is_review INTEGER NOT NULL DEFAULT 0 CHECK(is_review IN (0, 1, 2)),
    create_time INTEGER NOT NULL DEFAULT 0,
    update_time INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (album_id) REFERENCES photo_album(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 音声分类表
CREATE TABLE audio_classification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),
    is_review INTEGER NOT NULL DEFAULT 0 CHECK(is_review IN (0, 1, 2)),
    create_time INTEGER NOT NULL,
    update_time INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 音声表
CREATE TABLE audio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    classification_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0 CHECK(is_deleted IN (0, 1)),
    is_review INTEGER NOT NULL DEFAULT 0 CHECK(is_review IN (0, 1, 2)),
    create_time INTEGER NOT NULL,
    update_time INTEGER NOT NULL,
    FOREIGN KEY (classification_id) REFERENCES audio_classification(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- ==================== 时间戳触发器 ====================

-- 用户表的触发器
CREATE TRIGGER user_insert_timestamp 
AFTER INSERT ON user
BEGIN
    UPDATE user 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER user_update_timestamp 
AFTER UPDATE ON user
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE user 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 相册表的触发器
CREATE TRIGGER photo_album_insert_timestamp 
AFTER INSERT ON photo_album
BEGIN
    UPDATE photo_album 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER photo_album_update_timestamp 
AFTER UPDATE ON photo_album
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE photo_album 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 照片表的触发器
CREATE TRIGGER photo_insert_timestamp 
AFTER INSERT ON photo
BEGIN
    UPDATE photo 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER photo_update_timestamp 
AFTER UPDATE ON photo
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE photo 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 音声分类表的触发器
CREATE TRIGGER audio_classification_insert_timestamp 
AFTER INSERT ON audio_classification
BEGIN
    UPDATE audio_classification 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER audio_classification_update_timestamp 
AFTER UPDATE ON audio_classification
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE audio_classification 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- 音声表的触发器
CREATE TRIGGER audio_insert_timestamp 
AFTER INSERT ON audio
BEGIN
    UPDATE audio 
    SET create_time = strftime('%s', 'now'),
        update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

CREATE TRIGGER audio_update_timestamp 
AFTER UPDATE ON audio
WHEN OLD.update_time = NEW.update_time
BEGIN
    UPDATE audio 
    SET update_time = strftime('%s', 'now')
    WHERE id = NEW.id;
END;

-- ==================== 索引 ====================

-- 用户表索引
CREATE INDEX idx_user_account ON user(account_number);
CREATE INDEX idx_user_permission ON user(permission);
CREATE INDEX idx_user_create_time ON user(create_time);

-- 相册表索引
CREATE INDEX idx_photo_album_user ON photo_album(user_id);
CREATE INDEX idx_photo_album_deleted ON photo_album(is_deleted);
CREATE INDEX idx_photo_album_review ON photo_album(is_review);
CREATE INDEX idx_photo_album_create_time ON photo_album(create_time);

-- 照片表索引
CREATE INDEX idx_photo_album ON photo(album_id);
CREATE INDEX idx_photo_user ON photo(user_id);
CREATE INDEX idx_photo_deleted ON photo(is_deleted);
CREATE INDEX idx_photo_review ON photo(is_review);
CREATE INDEX idx_photo_create_time ON photo(create_time);

-- 音声分类表索引
CREATE INDEX idx_audio_classification_user ON audio_classification(user_id);
CREATE INDEX idx_audio_classification_deleted ON audio_classification(is_deleted);
CREATE INDEX idx_audio_classification_review ON audio_classification(is_review);
CREATE INDEX idx_audio_classification_create_time ON audio_classification(create_time);

-- 音声表索引
CREATE INDEX idx_audio_classification ON audio(classification_id);
CREATE INDEX idx_audio_user ON audio(user_id);
CREATE INDEX idx_audio_deleted ON audio(is_deleted);
CREATE INDEX idx_audio_review ON audio(is_review);
CREATE INDEX idx_audio_create_time ON audio(create_time);