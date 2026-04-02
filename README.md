# 小猫丸子 Wiki

一个专为哔哩哔哩主播 [猫丸子 Maruko](https://space.bilibili.com/3546938511198692) 创建的粉丝互动网站。「北立交桥 · 妖精管理局 · 猫猫祟祟」

## 项目特色

### 实时数据追踪
- 粉丝数统计（目标：10万粉里程碑）
- 舰长数统计（目标：千舰成就）
- 直播状态实时监控
- 主播信息动态展示

### 丰富多彩的内容
- **丸子相簿** - 粉丝上传的精彩瞬间
- **丸子音声** - 有趣的音频合集
- **企划表** - 未来规划文档展示

### 完善的管理系统
- 管理员后台
- 用户管理系统
- 文件上传管理
- 内容审核功能

## 技术架构

### 前端 (Frontend)
| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | 3.5.25 | 渐进式 JavaScript 框架 |
| Element Plus | 2.11.9 | Vue 3 UI 组件库 |
| Vite | 7.2.4 | 下一代前端构建工具 |
| Pinia | 3.0.4 | Vue 状态管理库 |
| Vue Router | 4.6.4 | Vue.js 官方路由 |
| Axios | 1.13.2 | HTTP 客户端 |
| @vue-office/docx | 1.6.3 | Word 文档预览组件 |

### 后端 (Backend)
| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | 20+ | JavaScript 运行时 |
| Express | 4.21.2 | Web 应用框架 |
| better-sqlite3 | 11.9.0 | SQLite 数据库 |
| jsonwebtoken | 9.0.2 | JWT 认证 |
| bcrypt | 5.1.1 | 密码加密 |
| ioredis | 5.6.1 | Redis 客户端 |
| log4js | 6.9.1 | 日志管理 |
| nodemailer | 7.0.12 | 邮件发送 |
| multer | 1.4.5-lts.1 | 文件上传处理 |

### 开发工具
- **包管理**: pnpm
- **代码检查**: ESLint
- **版本控制**: Git

## 数据库结构

### 数据表
| 表名 | 说明 |
|------|------|
| user | 用户账号表 |
| photo_album | 相册表 |
| photo | 照片表 |
| audio_classification | 音声分类表 |
| audio | 音声表 |
| live_duration | 直播时长表 |
| announcement | 公告表 |
| plan_document | 企划文档表 |

### 数据库文件
- `sql.sql` - 完整的 SQLite 数据库初始化脚本（模板）
- `sql.yaml` - 数据库结构说明文档

## 快速开始

### 环境要求

#### 基础环境
- Node.js >= 20.19.0 || >= 22.12.0
- pnpm >= 8.0.0
- Redis >= 6.0

#### 编译环境（Windows）
由于项目使用了 better-sqlite3 和 bcrypt 等需要编译的原生模块，需要以下编译环境：

**Python 环境：**
- Python >= 3.8（推荐 3.10+）

**C/C++ 编译环境：**
- Visual Studio Build Tools 2022 或 Visual Studio 2019/2022
- Windows SDK（包含在 Visual Studio 中）

**Linux/macOS：**
- gcc/g++ >= 8.0
- make
- Python >= 3.8

### 安装步骤

1. **克隆项目**
   ```bash
   git clone --depth=1 https://gitee.com/xiaofeiawa/maruko-wiki.git
   cd maruko-wiki
   ```

2. **安装依赖**
   ```bash
   # 安装后端依赖
   cd backend
   pnpm install

   # 安装前端依赖
   cd ../frontend
   pnpm install
   ```

3. **配置环境**
   ```bash
   # 复制后端配置文件
   cd backend
   cp examples/config.yaml configs/config.yaml
   
   # 编辑配置文件，修改以下内容：
   # - 数据库路径
   # - JWT 密钥
   # - Redis 连接信息
   # - 邮件服务配置（可选）
   ```

4. **初始化数据库**
   ```bash
   # 方法1：使用 SQL 脚本初始化
   cd backend
   sqlite3 data/maruko-sql.db < ../sql.sql
   
   # 方法2：启动后端服务时自动创建表结构
   pnpm run dev
   ```

5. **启动 Redis 服务**
   ```bash
   # Windows
   redis-server.exe
   
   # Linux/macOS
   redis-server
   ```

6. **启动服务**
   ```bash
   # 启动后端服务
   cd backend
   pnpm run dev

   # 启动前端服务（新终端）
   cd frontend
   pnpm run dev
   ```

7. **访问应用**
   - 前端: http://localhost:5173
   - 后端API: http://localhost:6660

## 项目结构

```
maruko-wiki/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── components/         # 核心组件
│   │   ├── method/            # 工具方法
│   │   ├── routes/            # API 路由
│   │   ├── services/          # 业务服务
│   │   └── ...
│   ├── configs/               # 配置文件
│   │   └── config.yaml        # 主配置文件
│   ├── data/                  # 数据存储
│   │   ├── document/          # 文档资源
│   │   │   └── plans/         # 企划文档
│   │   ├── images/            # 图片资源
│   │   ├── audios/            # 音频资源
│   │   └── maruko-sql.db      # SQLite 数据库
│   ├── logs/                  # 日志文件
│   └── package.json
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── api/               # API 接口
│   │   ├── components/        # Vue 组件
│   │   ├── views/             # 页面视图
│   │   │   ├── Home.vue       # 首页
│   │   │   ├── PhotoAlbum.vue # 相簿页
│   │   │   ├── Audio.vue      # 音声页
│   │   │   ├── PlanDocument.vue # 企划表页
│   │   │   └── Admin.vue      # 管理后台
│   │   ├── router/            # 路由配置
│   │   ├── stores/            # 状态管理
│   │   └── ...
│   ├── public/                # 静态资源
│   └── package.json
├── sql.sql                     # 数据库初始化脚本
├── sql.yaml                    # 数据库结构说明
├── LICENSE                     # 许可证
└── README.md                   # 项目说明
```

## 部署说明

### 开发环境
```bash
# 终端1：启动后端
cd backend
pnpm run dev

# 终端2：启动前端
cd frontend
pnpm run dev
```

### 生产环境

#### 后端部署
```bash
cd backend
# 使用 PM2 管理进程
pnpm install -g pm2
pm2 start app.js --name maruko-backend
```

#### 前端部署
```bash
cd frontend
# 构建
pnpm run build

# 使用 nginx 或其他静态服务器托管 dist 目录
# 或使用
pnpm run preview
```

#### Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 前端静态文件
    location / {
        root /path/to/maruko-wiki/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # 后端 API 代理
    location /api {
        proxy_pass http://127.0.0.1:6660;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 功能模块

### 用户权限
| 权限等级 | 说明 |
|---------|------|
| 1 | 管理员 - 拥有所有权限 |
| 2 | 编辑 - 可上传和管理内容 |
| 3 | 普通用户 - 可浏览和上传 |

### 文件上传
- **图片**: 支持 jpg、png、gif 格式
- **音频**: 支持 mp3、wav、ogg 格式
- **文档**: 支持 doc、docx 格式

## 常见问题

### 1. 原生模块编译失败
```bash
# 清除缓存重新安装
pnpm store prune
rm -rf node_modules
pnpm install
```

### 2. Redis 连接失败
确保 Redis 服务已启动：
```bash
# Windows
redis-server.exe

# Linux/macOS
redis-server
```

### 3. 数据库初始化
如果数据库文件不存在，可以手动创建：
```bash
sqlite3 data/maruko-sql.db < sql.sql
```

## 贡献指南

欢迎为小猫丸子 Wiki 贡献代码！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 许可证

本项目采用 BSD 3-Clause 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 致谢

- 感谢所有为项目贡献代码的开发者
- 感谢 [猫丸子 Maruko](https://space.bilibili.com/3546938511198692) 带来的欢乐

---

Made with love for 猫丸子 Maruko