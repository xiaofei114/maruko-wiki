# 小猫丸子 Wiki

一个面向猫丸子社区的前后端一体项目，包含内容展示、公告系统、相册/音声/企划表与管理后台能力。

> 提示：当前仓库数据可能为清空状态（0 相册 / 0 音声 / 0 企划 / 0 用户），但功能代码完整可用。

## 功能说明（按当前代码）

### 前台页面
- 首页（`/`）：主播信息、直播状态、粉丝数、舰长数、直播时长统计。
- 相册（`/photo-album`、`/photo-album/:id`）：相册与照片浏览。
- 音声（`/audio`）：音频分类与播放。
- 公告（`/announcement`）：公告列表与内容展示。
- 企划表（`/plan-document`）：Word 文档列表、选中联动实时预览（支持文档内图片渲染）。
- 登录（`/login`）、个人页（`/profile`）、后台（`/admin`）。

### 管理后台
- 音频管理：审核、编辑、删除。
- 相册管理：审核、编辑、删除。
- 企划表管理：设置当前文档、删除、右侧实时预览。
- 用户管理（超管可见）：权限调整、封禁/解封、重置密码、删除。

### 后端服务
- JWT 鉴权与权限校验。
- SQLite 数据存储（`maruko-sql.db` 为主库）。
- 文件访问接口（`/api/file/*`）。
- 公告、相册、音声、企划表、用户、Bilibili 代理、AI 路由。

## 技术栈

### 前端
- Vue 3 + Vite
- Element Plus + Pinia + Vue Router
- Axios
- `docx-preview`（当前文档预览主方案）
- `@vue-office/docx`（历史依赖，仍在 `package.json` 中）

### 后端
- Node.js + Express
- better-sqlite3
- Redis（ioredis）
- jsonwebtoken / bcrypt / multer / nodemailer / log4js

## 项目结构

```text
maruko-wiki-kx/
├── frontend/
│   ├── src/
│   │   ├── views/            # 页面
│   │   ├── components/       # 组件（含 DocxPreview）
│   │   ├── api/              # 前端接口封装
│   │   ├── router/
│   │   └── stores/
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/           # 路由层
│   │   ├── services/         # 业务层
│   │   ├── method/           # 工具方法
│   │   └── components/       # 启动组件
│   ├── configs/
│   ├── data/
│   │   ├── document/         # 文件存储目录（audios/images/plans）
│   │   ├── maruko-sql.db     # 主数据库
│   │   └── maruko-wiki.db    # 额外数据库
│   └── package.json
├── sql.sql
├── sql.yaml
└── README.md
```

## 本地开发

### 1. 环境要求
- Node.js `>= 20`
- pnpm
- Redis
- SQLite3（可选，用于手动导入 SQL）

### 2. 安装依赖

```bash
cd backend
pnpm install

cd ../frontend
pnpm install
```

### 3. 准备配置

在 `backend/configs/` 放置配置文件（可参考 `backend/examples/config.yaml`）。

### 4. 初始化数据库（可选）

首次部署或重建库时可执行：

```bash
cd backend
sqlite3 data/maruko-sql.db < ../sql.sql
```

### 5. 启动项目

```bash
# 终端1：后端
cd backend
pnpm run dev

# 终端2：前端
cd frontend
pnpm run dev
```

默认地址：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:6660`

## 部署说明（修正版）

### 后端部署

```bash
cd backend
pnpm install --prod
pnpm run start
```

建议使用 PM2 托管：

```bash
pnpm add -g pm2
pm2 start app.js --name maruko-backend
pm2 save
```

### 前端部署

```bash
cd frontend
pnpm install
pnpm run build
```

将构建产物 `frontend/dist` 部署到 Nginx 静态目录。

### Nginx 参考配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /var/www/maruko/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:6660;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 常见问题

### 1) 原生模块安装失败（better-sqlite3 / bcrypt）
- Windows 需安装 Python 与 C++ Build Tools。
- 建议删除 `node_modules` 后重新安装。

### 2) Redis 连接失败
- 检查 Redis 服务是否启动，配置是否正确。

### 3) 页面显示空数据
- 当前仓库可能已清空业务数据，属正常现象；可通过后台创建或导入数据库数据。

## 许可证

BSD 3-Clause，详见 `LICENSE`。