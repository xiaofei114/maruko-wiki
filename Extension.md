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
# 唯一域名（用户端、管理端、API 同源部署）
VITE_APP_BASE_URL=https://your-domain.com
# 管理后台挂在同一域名的 /admin/ 子路径
VITE_APP_ADMIN_URL=https://your-domain.com/admin
# 其他配置与开发环境相同
```

### 3.3 管理后台配置

**开发环境：** `frontend_admin/.env.development`

```bash
# API 地址
VITE_APP_API_BASE=http://localhost:6660
# 主页面地址
VITE_APP_PAGE_URL=http://localhost:5173
# 与用户端共享同一个 Token Key，同源直接复用登录态
VITE_APP_TOKEN=maruko_token
# 与用户端共享用户信息，切换账号时身份保持一致
VITE_APP_USER=maruko_user
```

**生产环境：** `frontend_admin/.env.production`

```bash
VITE_APP_API_BASE=https://your-domain.com
VITE_APP_PAGE_URL=https://your-domain.com
VITE_APP_TOKEN=maruko_token
VITE_APP_USER=maruko_user
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
# 服务运行在 http://localhost:5174/admin/ （管理端挂载在 /admin/ 子路径）
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
# 构建产物在 dist/ 目录，Vite base 已固定为 /admin/
# build 结束后会自动把 dist/ 同步到 <仓库根>/frontend/dist/admin，并先删掉旧的管理端产物
```

脚本是 `frontend_admin/scripts/deploy-dist.js`，相关命令：

| 命令 | 作用 |
| --- | --- |
| `pnpm run build`（或 `npm run build`） | 构建 + 自动同步（会先删除旧的 `admin/`，再复制新产物） |
| `pnpm run build:only` | 只构建，不同步 |
| `pnpm run deploy` | 不重新构建，把现有 `dist/` 再同步一次 |
| `node scripts/deploy-dist.js --target=/var/www/xxx/frontend/dist/admin` | 目标不在默认位置时手动指定（Windows 用 `--target=D:\...`） |
| `ADMIN_DEPLOY_TARGET=/var/www/xxx/frontend/dist/admin pnpm run build` | 连构建带同步，目标用环境变量指定 |
| `node scripts/deploy-dist.js --force` | 目标目录看起来不像管理端产物时强制覆盖 |

默认目标固定为「仓库根 `/frontend/dist/admin`」，所以 maruko 和 huhu 两份仓库各自执行即可，不需要改脚本；脚本会自动跳过仓库根、`frontend/`、`frontend/dist` 这类危险目录。

#### 单域名部署（用户端 + 管理端 + API 同源）

生产环境只保留一个域名和一张证书，把两个前端产物放到同一个站点目录：

```bash
# /var/www/oiwiki/frontend/dist 是 nginx 配置里的站点根目录，服务器路径不同时同步修改 nginx 的 root
# 用户端产物同步要排除 admin/，否则 --delete 会把管理端产物一起删掉
rsync -a --delete --exclude=admin frontend/dist/ /var/www/oiwiki/frontend/dist/

# 管理端：仓库不在站点根下（Linux 常见），需要用 --target 指定，或用环境变量
cd frontend_admin
ADMIN_DEPLOY_TARGET=/var/www/oiwiki/frontend/dist/admin node scripts/deploy-dist.js
# 也可以：node scripts/deploy-dist.js --target=/var/www/oiwiki/frontend/dist/admin
```

`deploy-dist.js` 是跨平台的，Windows 和 Linux 都能用，只依赖 Node 内置模块（`fs.rmSync` / `fs.cpSync`，需要 Node >= 16.7）。Windows 的 junction 和 Linux 的 symlink 都会被识别成链接、只删链接本身；Linux 下目标目录属主不是构建用户时记得先 `chown`，否则会报 EACCES。

最终目录结构：

```
/var/www/oiwiki/frontend/dist/
├── index.html          # 用户端
├── assets/
└── admin/
    ├── index.html      # 管理后台
    └── assets/
```

访问路径：

- `https://your-domain.com/` → 用户端
- `https://your-domain.com/admin/` → 新管理后台
- `https://your-domain.com/api/...` → 反代后端

本机服务器是 Windows，实际站点目录和配置如下：

| 站点 | 站点根目录 | 后端端口 |
| --- | --- | --- |
| maruko | `C:/data/web/maruko-wiki/frontend/dist` | 6662 |
| huhu | `C:/data/web/maruko-wiki-huhu/frontend/dist` | 6660 |

对应 nginx 配置是 `nginxconf_environment/nginx copy.conf`；`nginx_services.conf` 是 Linux 通用模板。Windows 上管理端不需要再手动复制，`pnpm run build` 会自动同步到 `<仓库根>\frontend\dist\admin`：

```powershell
cd C:\data\web\maruko-wiki\frontend_admin
pnpm run build
# 产出 C:\data\web\maruko-wiki\frontend\dist\admin，旧的 admin 产物会被先删掉
```

huhu 站点同理，在 `C:\data\web\maruko-wiki-huhu\frontend_admin` 下执行即可，产物落到 `C:\data\web\maruko-wiki-huhu\frontend\dist\admin`。

用户端产物本来就在仓库的 `frontend/dist`，就是 nginx 的站点根，不需要移动。如果是从别的机器同步用户端产物，记得排除 `admin/`，否则会把管理端产物覆盖掉：

```powershell
robocopy <构建机>\frontend\dist C:\data\web\maruko-wiki\frontend\dist /MIR /XD admin
```

#### Nginx 配置

本机实际配置见 `nginxconf_environment/nginx copy.conf`，需要重点确认：

1. `location /api/` 的 `proxy_pass` **末尾不要加 `/`**，否则会丢掉 `/api` 前缀导致后端 404；maruko 是 `6662`，huhu 是 `6660`。
2. 根级认证接口 `/login`、`/register`、`/sendVerification`、`/verifyCode`、`/resetPassword` 不在 `/api` 下，必须单独反代，否则会被静态规则拦截成 405。
3. `/admin/` 用 `/admin/index.html` 兜底，`/` 用 `/index.html` 兜底，两个 SPA 的 history 路由互不影响。
4. `location = /admin` 跳转到 `/admin/`，同源部署下登录态走 `localStorage`，不需要在 URL 中透传 token。
5. `marukoadmin`/`huhuadmin`/`marukonode`/`huhunode` 这些旧域名的 server 块已从配置中移除，确保证书目录不再引用后，可以连同 DNS 解析一起删除；外部系统（B站回调、旧脚本、旧链接）如仍需访问，请直接改成 `https://maruko.xiaofei.icu/api/...` 或 `https://huhu.xiaofei.icu/api/...`。
6. `location /file/` 必须保留：后端部分接口仍会返回 `/file/xxx` 形式的头像等资源路径。

**共享登录态：** 用户端和管理端使用同一个 `maruko_token` 和 `maruko_user`（见两端 `.env.*`）。在用户端登录后直接打开 `/admin/` 即可自动识别登录态，不再通过 URL 传 token；后台登录或续期时也会同步写回用户信息，切换账号后主站身份保持一致。需要注意两边共用同一个会话：管理员在后台退出登录时，主站的 token 和用户信息也会被清除；普通用户误入 `/admin/` 只会提示无权限，不会被清掉主站登录态。旧版管理页已从 `/admin` 挪到 `/admin-legacy`，不会和新后台冲突。

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

同源部署后前后端在同一个域名下，一般不会再触发跨域；但 POST 请求仍会携带 Origin，建议把唯一域名加入白名单，避免日志出现“拒绝跨域请求”：

```yaml
domainName:
  - http://localhost:5173
  - https://your-domain.com  # 唯一域名
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
    root /var/www/oiwiki/frontend/dist;
    try_files $uri $uri/ /index.html;  # 确保这行存在
}
```

管理端资源 404 时，检查站点根目录下的 `admin/` 是否存在，以及 `/admin/` 是否用 `/admin/index.html` 兜底。

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

从[友链接口网站](https://www.maruko-wiki.com/)获取友情链接。

***

*本文档最后更新于 2026-05-07*
