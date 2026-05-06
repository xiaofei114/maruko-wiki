# 小猫丸子Wiki - 配置与部署指南

本文档包含 WIKI 项目的详细配置说明、部署指南和个性化修改教程。

***

## 目录

1. [环境要求](#1-环境要求)
2. [安装指南](#2-安装指南)
3. [配置说明](#3-配置说明)
4. [部署方案](#4-部署方案)
5. [功能模块配置](#5-功能模块配置)
6. [数据库说明](#6-数据库说明)
7. [常见问题](#7-常见问题)

***

## 1. 环境要求

### 1.1 基础环境

| 依赖 | 版本要求 | 说明 |
|-----|---------|------|
| [Node.js](https://nodejs.org/) | >= 20 | JavaScript 运行时 |
| [Redis](https://redis.io/) | >= 6.0 | 缓存服务 |
| [Git](https://git-scm.com/) | 最新版 | 版本控制 |

### 1.2 原生模块编译环境

本项目使用 `better-sqlite3` 和 `bcrypt` 等原生 Node.js 模块，**需要编译环境**。

#### Windows 用户

需要安装以下工具：

1. **Python 3.x**
   - 下载地址：https://www.python.org/downloads/
   - 安装时勾选 "Add Python to PATH"

2. **Visual Studio Build Tools** 或 **Visual Studio Community**
   - 推荐安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - 安装时选择 **"使用 C++ 的桌面开发"** 工作负载
   - 或单独安装 **Windows SDK** 和 **MSVC v143 - VS 2022 C++ x64/x86 生成工具**

3. **Node.js 原生模块工具**
   ```bash
   npm install -g node-gyp
   ```

#### macOS 用户

```bash
# 安装 Xcode Command Line Tools
xcode-select --install
```

#### Linux 用户 (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

#### Linux 用户 (CentOS/RHEL)

```bash
sudo yum groupinstall -y "Development Tools"
sudo yum install -y python3
```

### 1.3 验证编译环境

```bash
# 验证 Python
python --version

# 验证 node-gyp
node-gyp --version
```

***

## 2. 安装指南

### 2.1 克隆项目

```bash
git clone https://github.com/your-username/maruko-wiki.git
cd maruko-wiki
```

### 2.2 安装后端依赖

```bash
cd backend

# 安装依赖（会自动编译 better-sqlite3 和 bcrypt）
npm install

# 如果使用 pnpm，需要批准构建原生模块
# pnpm approve-builds
```

**安装失败处理：**

如果安装过程中出现编译错误，请检查：

1. 是否已安装 [编译环境](#12-原生模块编译环境)
2. Node.js 版本是否 >= 20
3. 尝试删除 node_modules 重新安装：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### 2.3 安装前端依赖

```bash
cd ../frontend
npm install
```

### 2.4 安装管理后台依赖

```bash
cd ../frontend_admin
npm install
```

***

## 3. 配置说明

### 3.1 后端配置

**配置文件位置：** `backend/configs/config.yaml`

```bash
# 复制示例配置
cp backend/examples/config.yaml backend/configs/config.yaml

# 编辑配置
nano backend/configs/config.yaml
```

**配置项说明：**

```yaml
# 服务端口
httpPort: 6660

# 跨域白名单
domainName:
  - http://localhost:5173
  - http://localhost:5174
  # - https://your-domain.com

# JWT 密钥（生产环境请修改为强密码）
token: your-secret-key

# Redis 配置
redis:
  host: localhost
  port: 6379
  password: null

# Bilibili 配置
bilibili:
  roomId: 1929354869      # 直播间ID
  userId: 3546938511198692  # 主播B站UID

# DeepSeek AI 配置
deepseek:
  apiKey: your-api-key

# 用户配置
user:
  defaultName: '猫丸伴'   # 重置用户名时的默认值
```

### 3.2 前端配置

**开发环境：** `frontend/.env.development`

```bash
cp frontend/.env.example frontend/.env.development
```

```bash
# API 地址
VITE_APP_BASE_URL=http://localhost:6660

# B站配置
VITE_APP_ROOM_ID=1929354869
VITE_APP_USER_ID=3546938511198692

# 主播信息
VITE_APP_NICK_NAME=主播昵称
VITE_APP_HOST_NAME=主播名字

# Token Key
VITE_APP_TOKEN=maruko_token

# 默认用户名
VITE_APP_DD_NAME=猫丸伴
```

**生产环境：** `frontend/.env.production`

```bash
VITE_APP_BASE_URL=/api
# 其他配置与开发环境相同
```

### 3.3 管理后台配置

**配置文件：** `frontend_admin/.env.development`

```bash
VITE_APP_BASE_URL=http://localhost:6660
VITE_APP_TOKEN=maruko_token
```

### 3.4 主题颜色

项目使用 SCSS 主题配置文件，修改主题色非常简单：

**修改方法：**

编辑 `frontend/src/assets/_theme.scss`：

```scss
// 💡 主色调 - 只需要修改这一个值！
$theme-color: #409EFF;  // 修改为你想要的颜色，如 #FF85A2（粉色）
```

**推荐主题色：**

| 颜色 | 色值 | 效果 |
|-----|------|------|
| 默认蓝 | `#409EFF` | Element Plus 默认蓝色 |
| 少女粉 | `#FF85A2` | 粉色主题 |
| 薄荷绿 | `#67C23A` | 绿色主题 |
| 活力橙 | `#E6A23C` | 橙色主题 |
| 优雅紫 | `#9B59B6` | 紫色主题 |

**高级自定义（可选）：**

如果需要更精细的控制，可以修改 Element Plus 的 CSS 变量：

```scss
// frontend/src/styles/element-variables.scss
:root {
  --el-color-primary: #409EFF;
  --el-color-primary-light-3: #79bbff;
  --el-color-primary-light-5: #a0cfff;
  --el-color-primary-light-7: #c6e2ff;
  --el-color-primary-light-8: #d9ecff;
  --el-color-primary-light-9: #ecf5ff;
  --el-color-primary-dark-2: #337ecc;
}
```

***

## 4. 部署方案

### 4.1 开发环境启动

**终端 1 - 启动后端：**

```bash
cd backend
npm start
# 服务运行在 http://localhost:6660
```

**终端 2 - 启动用户前台：**

```bash
cd frontend
npm run dev
# 服务运行在 http://localhost:5173
```

**终端 3 - 启动管理后台（可选）：**

```bash
cd frontend_admin
npm run dev
# 服务运行在 http://localhost:5174
```

### 4.2 生产环境部署

#### 后端部署（PM2）

```bash
cd backend

# 安装生产依赖
npm install --production

# 使用 PM2 启动
pm2 start app.js --name maruko-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs maruko-backend

# 设置开机自启
pm2 startup
pm2 save
```

#### 前端构建

**用户前台：**

```bash
cd frontend
npm install
npm run build
# 构建产物在 dist/ 目录
```

**管理后台：**

```bash
cd frontend_admin
npm install
npm run build
# 构建产物在 dist/ 目录
```

#### Nginx 配置

**开发环境：** `nginxconf_environment/nginx.conf`

```nginx
server {
    listen 8080;
    server_name maruko.test;
    client_max_body_size 100M;

    location /api/ {
        proxy_pass http://127.0.0.1:6660;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /path/to/maruko-wiki/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

**生产环境：** `nginxconf_environment/nginx_services.conf`

```nginx
server {
    listen 80;
    server_name your-domain.com;
    client_max_body_size 100M;

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location /api/ {
        proxy_pass http://127.0.0.1:6660;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /var/www/maruko-wiki/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

#### Docker 部署（可选）

```dockerfile
# Dockerfile
FROM node:20-alpine

# 安装编译依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 6660

CMD ["npm", "start"]
```

***

## 5. 功能模块配置

### 5.1 舰礼系统

舰礼系统支持三级礼物类型：

| 类型 | gift_type | 说明 |
|-----|-----------|------|
| 舰长礼 | 1 | 普通舰长可解锁 |
| 提督礼 | 2 | 提督可解锁 |
| 总督礼 | 3 | 总督可解锁 |

**包含关系** (includes 字段，bitmap)：

| 值 | 说明 |
|---|------|
| 0 | 不包含其他礼物 |
| 1 | 包含舰长礼 |
| 2 | 包含提督礼 |
| 3 | 同时包含舰长礼和提督礼 |

**日期区间舰礼：**

- `start_date`: 开始日期 (YYYY-MM-DD)
- `end_date`: 结束日期 (YYYY-MM-DD)
- 为空表示整月有效

### 5.2 视频推荐

- 用户每周可推荐一次视频
- 本周热门视频按推荐数排序
- 推荐数据存储在 `video_weekly_recommend` 表

### 5.3 AI 助手

配置 DeepSeek API：

```yaml
deepseek:
  apiKey: your-api-key

ai:
  limits:
    authenticated: 100  # 登录用户每日限额
    guest: 5            # 游客每日限额
```

### 5.4 数据统计

自动抓取 B站数据：

- 粉丝数、舰长数、提督数、总督数
- 粉丝团成员数
- 每日自动记录到 `anchor_stats` 表

***

## 6. 数据库说明

### 6.1 数据库文件

- **位置**: `backend/data/database.db`
- **类型**: SQLite3
- **备份**: 建议定期备份数据库文件

### 6.2 数据库结构

详见 `sql.yaml` 文件，主要表结构：

| 表名 | 说明 |
|-----|------|
| user | 用户表 |
| photo_album | 相册表 |
| photo | 照片表 |
| audio_classification | 音声分类表 |
| audio | 音声表 |
| announcement | 公告表 |
| plan_document | 企划文档表 |
| favorite | 收藏夹表 |
| video_favorite | 视频收藏表 |
| video_weekly_recommend | 视频每周推荐表 |
| captain_gifts | 舰礼表 |
| anchor_stats | 主播数据统计表 |
| notification | 消息通知表 |
| logs | 日志表 |
| dictionary_type | 字典类型表 |
| dictionary_item | 字典项表 |

### 6.3 数据库迁移

后端启动时会自动执行 `backend/sql/` 目录下的 SQL 文件进行数据库初始化。

***

## 7. 常见问题

### 7.1 安装问题

#### Q: better-sqlite3 安装失败

**错误信息：**
```
gyp ERR! find Python
gyp ERR! find VS
gyp ERR! build error
```

**解决方案：**

1. 确保已安装 [编译环境](#12-原生模块编译环境)
2. Windows 用户安装 Visual Studio Build Tools
3. 设置 Python 路径：
   ```bash
   npm config set python python3
   ```
4. 重新安装：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

#### Q: bcrypt 编译失败

**解决方案：**

```bash
# 使用 pnpm 时
pnpm approve-builds

# 或使用 npm
npm rebuild bcrypt --build-from-source
```

#### Q: 安装速度很慢

**解决方案：**

```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com

# 或使用 nrm 管理镜像
npm install -g nrm
nrm use taobao
```

### 7.2 运行问题

#### Q: Redis 连接失败

**错误信息：**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**解决方案：**

```bash
# 检查 Redis 是否运行
redis-cli ping

# 启动 Redis
redis-server

# 或修改配置使用内存存储（仅开发环境）
# backend/configs/config.yaml
redis:
  host: localhost
  port: 6379
```

#### Q: CORS 跨域错误

**错误信息：**
```
Access to XMLHttpRequest has been blocked by CORS policy
```

**解决方案：**

编辑 `backend/configs/config.yaml`，添加前端域名到白名单：

```yaml
domainName:
  - http://localhost:5173
  - http://your-domain.com  # 添加你的域名
```

#### Q: 413 文件过大错误

**解决方案：**

Nginx 配置中添加：

```nginx
server {
    client_max_body_size 100M;  # 根据需求调整
}
```

#### Q: Token 无效/未授权

**解决方案：**

1. 清除浏览器 localStorage
2. 重新登录
3. 检查后端 `token` 配置是否一致

### 7.3 部署问题

#### Q: PM2 启动失败

**解决方案：**

```bash
# 检查 Node.js 版本
node --version  # 需要 >= 20

# 检查端口占用
lsof -i :6660

# 查看详细错误
pm2 logs maruko-backend
```

#### Q: 前端资源 404

**解决方案：**

检查 Nginx 配置中的 `try_files`：

```nginx
location / {
    root /var/www/maruko-wiki/frontend/dist;
    try_files $uri $uri/ /index.html;  # 确保这行存在
}
```

#### Q: 页面刷新后 404

**解决方案：**

确保 Nginx 配置正确，所有路由都指向 `index.html`：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

***

## 附录

### A. 用户权限说明

| permission | 角色 | 权限 |
|-----------|------|------|
| 1 | 超级管理员 | 用户管理、内容审核、系统配置 |
| 2 | 管理员 | 内容审核、内容管理 |
| 3 | 普通用户 | 上传内容、查看内容 |

### B. 友情链接

编辑 `frontend/src/components/Top.vue`：

```javascript
const friendlyLinks = [
  { name: '友站名称', url: 'https://example.com' },
]
```

***

*本文档最后更新于 2026-05-06*
