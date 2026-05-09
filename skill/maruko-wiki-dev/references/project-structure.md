# 项目结构说明

## 目录概览

```
maruko-wiki/
├── backend/              # Node.js 后端服务
├── frontend/             # Vue3 用户前端
├── frontend_admin/       # Vue3 管理后台
├── nginxconf_environment/# Nginx配置示例
├── sql.yaml             # SQL执行配置
└── Extension.md         # 项目扩展说明
```

---

## Backend 目录结构

### 核心目录

```
backend/
├── src/
│   ├── components/      # 系统组件初始化
│   ├── method/          # 基础方法/工具函数
│   ├── middleware/      # Express中间件
│   ├── routes/          # API路由定义
│   ├── services/        # 业务逻辑层
│   └── systemTasks/     # 定时任务
├── configs/             # 配置文件目录
├── data/                # 数据文件目录
├── sql/                 # 数据库迁移脚本
├── logs/                # 日志文件目录
├── examples/            # 配置文件示例
├── app.js               # PM2启动脚本
└── ecosystem.config.cjs # PM2配置文件
```

### 详细说明

#### src/components/ - 系统组件

| 文件 | 用途 |
|------|------|
| `config.js` | 配置加载与管理 |
| `email.js` | 邮件服务初始化 |
| `http.js` | HTTP服务初始化 |
| `initialize.js` | 系统初始化（路由、定时任务） |
| `log4.js` | 日志系统配置 |
| `redis.js` | Redis连接管理 |
| `sql.js` | 数据库连接池管理 |

#### src/method/ - 基础方法（通用函数）

**所有通用函数必须放在此目录下**

| 文件 | 用途 |
|------|------|
| `auth.js` | JWT认证相关 |
| `business-utils.js` | 业务工具函数 |
| `database.js` | 数据库操作方法 |
| `file-utils.js` | 文件操作工具 |
| `notification.js` | 通知系统 |
| `pack.js` | 数据打包工具 |
| `read.js` | 文件读取工具 |
| `response.js` | 统一响应格式 |
| `route-helpers.js` | 路由辅助函数 |
| `validation.js` | 参数验证 |

**新增通用函数原则**：
- 被3个及以上模块使用的函数
- 与业务无关的纯工具函数
- 按功能分类创建新文件（如 `date-utils.js`, `string-utils.js`）

#### src/routes/ - 路由层

| 文件 | 用途 |
|------|------|
| `admin.js` | 管理员相关API |
| `ai.js` | AI功能API |
| `album.js` | 相册管理API |
| `anchorStats.js` | 主播统计数据API |
| `announcement.js` | 公告管理API |
| `audio.js` | 音频管理API |
| `bilibili.js` | B站相关API |
| `captainGift.js` | 舰长礼物API |
| `config.js` | 系统配置API |
| `dictionary.js` | 字典管理API |
| `favorite.js` | 收藏管理API |
| `homeModules.js` | 首页模块API |
| `logs.js` | 日志查看API |
| `planDocument.js` | 计划文档API |
| `redisAdmin.js` | Redis管理API |
| `super-admin.js` | 超级管理员API |
| `taskConfig.js` | 任务配置API |
| `user.js` | 用户管理API |
| `userProfile.js` | 用户资料API |
| `videoFavorite.js` | 视频收藏API |

#### src/services/ - 业务层

| 文件 | 用途 |
|------|------|
| `ai.js` | AI服务逻辑 |
| `album.js` | 相册业务逻辑 |
| `anchorStats.js` | 主播统计业务 |
| `announcement.js` | 公告业务逻辑 |
| `audio.js` | 音频业务逻辑 |
| `audioPlayCount.js` | 播放统计逻辑 |
| `bilibili.js` | B站API调用 |
| `bilibiliBind.js` | B站绑定逻辑 |
| `bilibiliFans.js` | 粉丝数据获取 |
| `captainGift.js` | 舰长礼物逻辑 |
| `configManager.js` | 配置管理 |
| `dashboard.js` | 仪表盘数据 |
| `dictionary.js` | 字典管理逻辑 |
| `favorite.js` | 收藏业务逻辑 |
| `file.js` | 文件处理逻辑 |
| `homeModules.js` | 首页模块逻辑 |
| `liveDuration.js` | 直播时长统计 |
| `logs.js` | 日志管理逻辑 |
| `notification.js` | 通知服务逻辑 |
| `planDocument.js` | 计划文档逻辑 |
| `redisAdmin.js` | Redis管理逻辑 |
| `taskConfigManager.js` | 任务配置管理 |
| `taskExecutor.js` | 任务执行器 |
| `user.js` | 用户业务逻辑 |
| `userProfile.js` | 用户资料逻辑 |
| `videoFavorite.js` | 视频收藏逻辑 |

#### src/systemTasks/ - 定时任务

| 文件 | 用途 | 执行时间 |
|------|------|----------|
| `anchorStats.js` | 主播统计数据记录 | 每天4:00 |
| `bilibiliFansSync.js` | 粉丝信息同步 | 每天3:00 |
| `liveDuration.js` | 直播时长监控 | 每分钟检查 |
| `videoWeeklyReset.js` | 视频收藏每周重置 | 每周一00:00 |

#### configs/ - 配置文件

| 文件 | 用途 |
|------|------|
| `config.yaml` | 系统主配置（数据库、Redis等） |
| `task.yaml` | 定时任务配置 |

#### data/ - 数据文件

| 目录/文件 | 用途 |
|-----------|------|
| `backupConfigs/` | 配置备份 |
| `document/` | 上传的文档 |
| `configFields.json` | 配置字段映射定义 |

#### sql/ - 数据库迁移

| 文件 | 用途 |
|------|------|
| `000_maruko_sql.sql` | 初始数据库结构 |
| `001_maruko_sql.sql` | 添加用户相关表 |
| `002_maruko_sql.sql` | 添加内容管理表 |
| `003_maruko_sql.sql` | 添加B站绑定相关字段 |
| `004_maruko_sql.sql` | 添加系统配置表 |
| `005_maruko_sql.sql` | 添加定时任务相关表 |
| `006_maruko_sql.sql` | 添加日志相关表 |
| `007_maruko_sql.sql` | 添加通知相关表 |
| `008_maruko_sql.sql` | 添加舰长礼物相关表 |
| `009_maruko_sql.sql` | 添加粉丝牌熄灭状态字段 |

**注意**: 
- 新增SQL文件后，必须同步更新项目根目录的 `sql.yaml` 文件（添加表结构注释）
- `sql.yaml` 是数据库文档，不是执行配置，格式为YAML注释风格

---

## Frontend 目录结构

```
frontend/
├── src/
│   ├── api/            # API接口定义
│   ├── assets/         # 静态资源
│   ├── components/     # Vue组件
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia状态管理
│   ├── utils/          # 工具函数
│   ├── views/          # 页面视图
│   ├── App.vue         # 根组件
│   └── main.js         # 入口文件
├── public/             # 公共资源
├── .env.development    # 开发环境变量
├── .env.production     # 生产环境变量
├── index.html          # HTML模板
└── vite.config.js      # Vite配置
```

### 组件结构

```
components/
├── Admin/              # 管理页面
├── Announcement/       # 公告组件
├── Audio/              # 音频组件
├── ComponentStyle/     # 通用样式组件
├── Home/               # 首页
├── PhotoAlbum/         # 相册组件
├── PlanDocument/       # 计划文档
├── User/Profile/       # 用户资料
├── VideoFavorite/      # 视频收藏
├── Bottom.vue          # 底部组件
└── Top.vue             # 顶部导航
```

---

## Frontend Admin 目录结构

```
frontend_admin/
├── src/
│   ├── api/            # API接口定义
│   ├── assets/         # 静态资源
│   ├── components/     # Vue组件
│   │   ├── Common/     # 通用组件
│   │   ├── Content/    # 内容管理
│   │   ├── Home/       # 首页
│   │   ├── Operation/  # 运营管理
│   │   └── System/     # 系统管理
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia状态管理
│   ├── utils/          # 工具函数
│   ├── views/          # 页面视图
│   ├── App.vue         # 根组件
│   └── main.js         # 入口文件
├── public/             # 公共资源
└── ...配置文件
```

### 组件结构

```
components/
├── Common/                 # 通用组件（跨模块复用）
│   └── CronGenerator/      # Cron表达式生成器（目前唯一通用组件）
├── Content/                # 内容管理
│   ├── Album/              # 相册管理
│   ├── Audio/              # 音频管理
│   ├── PlanDocument/       # 计划文档管理
│   └── VideoFavorite/      # 视频收藏管理
├── Home/                   # 首页仪表盘
├── Operation/              # 运营管理
│   ├── Announcement/       # 公告管理
│   └── CaptainGift/        # 舰长礼物管理
└── System/                 # 系统管理
    ├── Config/             # 系统配置
    ├── Dictionary/         # 字典管理
    ├── RedisAdmin/         # Redis管理
    ├── User/               # 用户管理
    └── logs/               # 日志查看

#### componentStyle/ - 样式组件

| 文件 | 用途 |
|------|------|
| `dictionary.vue` | 字典项样式组件 |

**组件开发原则**：
- 可复用组件放在 `Common/` 目录
- 2个及以上页面使用的组件应抽离为通用组件
- 通用组件需有完整的Props定义和事件暴露

---

## 关键文件说明

### Backend 关键文件

| 文件路径 | 说明 |
|----------|------|
| `backend/src/components/initialize.js` | 系统初始化入口，注册路由和定时任务 |
| `backend/src/method/database.js` | 数据库操作方法封装 |
| `backend/src/method/route-helpers.js` | 路由辅助函数，包含 `createRouteHandler` |
| `backend/configs/config.yaml` | 系统配置文件 |
| `backend/configs/task.yaml` | 定时任务配置文件 |
| `backend/app.js` | PM2启动脚本 |
| `backend/ecosystem.config.cjs` | PM2生态系统配置 |

### Frontend 关键文件

| 文件路径 | 说明 |
|----------|------|
| `frontend/src/utils/http.js` | HTTP请求封装（Axios） |
| `frontend/src/router/index.js` | 路由配置 |
| `frontend/src/stores/user.js` | 用户状态管理 |
| `frontend_admin/src/utils/HttpClient.js` | 管理端HTTP封装 |
| `frontend_admin/src/router/index.js` | 管理端路由配置 |

---

## 文件命名规范

### Backend

- **路由文件**: 小写驼峰，如 `userProfile.js`
- **服务文件**: 小写驼峰，与路由对应
- **方法文件**: 小写驼峰，如 `route-helpers.js`
- **任务文件**: 小写驼峰，如 `bilibiliFansSync.js`

### Frontend

- **组件文件**: 大写驼峰，如 `UserProfile.vue`
- **API文件**: 小写驼峰，如 `userProfile.js`
- **工具文件**: 小写驼峰，如 `httpClient.js`
- **目录**: 小写，如 `components/`, `utils/`

### SQL 文件

- 格式: `XXX_maruko_sql.sql`
- 序号从000开始递增
