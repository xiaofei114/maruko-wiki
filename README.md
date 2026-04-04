# 小猫丸子Wiki

一个面向小猫丸子社区的前后端一体项目，包含内容展示、公告系统、相册/音声/企划表与管理后台能力。

> 提示：当前仓库数据可能为清空状态（0 相册 / 0 音声 / 0 企划 / 0 用户），但功能代码完整可用。

## 功能说明

### 前台页面

- 首页（`/`）：主播信息、直播状态、粉丝数、舰长数、直播时长统计
- 相册（`/photo-album`、`/photo-album/:id`）：相册与照片浏览
- 音声（`/audio`）：音频分类与播放
- 公告（`/announcement`）：公告列表与内容展示
- 企划表（`/plan-document`）：Word 文档列表、选中联动实时预览
- 登录（`/login`）、个人页（`/profile`）、后台（`/admin`）

### 管理后台

- 音频管理：审核、编辑、删除
- 相册管理：审核、编辑、删除
- 企划表管理：设置当前文档、删除、实时预览
- 用户管理（超管可见）：权限调整、封禁/解封、重置密码、删除

### 后端服务

- JWT 鉴权与权限校验
- SQLite 数据存储
- 文件访问接口（`/api/file/*`）
- 公告、相册、音声、企划表、用户、Bilibili 代理、AI 路由

## 技术栈

| 类型 | 技术 |
|-----|------|
| 前端 | Vue 3 + Vite + Element Plus + Pinia + Vue Router + Axios |
| 文档预览 | docx-preview |
| 后端 | Node.js + Express + better-sqlite3 |
| 缓存 | Redis（ioredis） |
| 其他 | jsonwebtoken / bcrypt / multer / nodemailer / log4js |

## 环境要求

- Node.js `>= 20`
- npm 或 pnpm
- Redis
- SQLite3（可选）

## 快速开始

### 1. 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. 准备配置

在 `backend/configs/` 放置配置文件（可参考 `backend/examples/config.yaml`）。

### 3. 启动项目

```bash
# 终端1：后端
cd backend && npm start

# 终端2：前端（开发模式）
cd frontend && npm run dev
```

默认地址：
- 前端：`http://localhost:5173`
- 后端：`http://localhost:6660`

---

## 部署方案

### 1. 后端部署

```bash
cd backend
npm install --production
npm start
```

### 2. PM2 持续运行（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
cd backend
pm2 start app.js --name maruko-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs maruko-backend

# 设置开机自启
pm2 startup
pm2 save

# 其他命令
pm2 restart maruko-backend    # 重启
pm2 stop maruko-backend       # 停止
pm2 delete maruko-backend     # 删除
pm2 monit                     # 监控面板
```

```bash
pm2 start ecosystem.config.js
pm2 save
```

### 3. 前端部署

```bash
cd frontend
npm install
npm run build
```

将构建产物 `frontend/dist` 部署到 Nginx 静态目录。

### 4. Nginx 配置

#### 4.1 本地开发环境（Windows）

**文件位置：**  `nginxconf_environment/nginx.conf`

```nginx
worker_processes auto;
error_log logs/error.log warn;
pid logs/nginx.pid;

events {
    worker_connections 2048;
}

http {
    include mime.types;
    default_type application/octet-stream;
    sendfile on;

    server {
        listen 8080;
        server_name maruko.test;
        # 在 C:/windows/system32/drivers/etc/hosts 中添加：
        # 127.0.0.1 maruko.test
        client_max_body_size 100M;

        location = /login {
            limit_except POST { deny all; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location = /register {
            limit_except POST { deny all; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location = /sendVerification {
            limit_except POST { deny all; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location = /verifyCode {
            limit_except POST { deny all; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /api/ {
            limit_except GET POST PUT DELETE { deny all; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location / {
            root D:/Code/Maruko/maruko-wiki-kx/frontend/dist;
            limit_except GET HEAD { deny all; }
            try_files $uri $uri/ /index.html;
        }
    }
}
```

#### 4.2 生产环境（Ubuntu Server）

**文件位置：** `nginxconf_environment/nginx_services.conf`

```nginx
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 2048;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;

    # 速率限制（防暴力破解）
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=10r/m;
    limit_req_zone $binary_remote_addr zone=verify_limit:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=register_limit:10m rate=5r/m;

    server {
        listen 80;
        server_name your-domain.com;
        client_max_body_size 100M;

        # 安全头部
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        location = /login {
            limit_req zone=login_limit burst=3 nodelay;
            limit_except POST { deny all; access_log /var/log/nginx/illegal_requests.log; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location = /sendVerification {
            limit_req zone=verify_limit burst=2 nodelay;
            limit_except POST { deny all; access_log /var/log/nginx/illegal_requests.log; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location = /verifyCode {
            limit_req zone=verify_limit burst=2 nodelay;
            limit_except POST { deny all; access_log /var/log/nginx/illegal_requests.log; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location = /register {
            limit_req zone=register_limit burst=2 nodelay;
            limit_except POST { deny all; access_log /var/log/nginx/illegal_requests.log; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location /api/ {
            limit_except GET POST PUT DELETE { deny all; access_log /var/log/nginx/illegal_requests.log; }
            proxy_pass http://127.0.0.1:6660;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        location / {
            root /var/www/maruko-wiki/frontend/dist;
            limit_except GET HEAD { deny all; access_log /var/log/nginx/illegal_requests.log; }
            try_files $uri $uri/ /index.html;
            
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }
    }
}
```

#### 4.3 Ubuntu 部署命令

```bash
# 复制配置文件
sudo cp nginx_services.conf /etc/nginx/sites-available/maruko-wiki

# 启用配置
sudo ln -s /etc/nginx/sites-available/maruko-wiki /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx

# 开机自启
sudo systemctl enable nginx
```

### 5. 部署检查清单

- [ ] 后端配置 `backend/configs/config.yaml` 中的 domainName 已添加域名
- [ ] 前端已构建 `npm run build`
- [ ] Nginx 已配置 `client_max_body_size`
- [ ] Redis 服务已启动
- [ ] PM2 已配置并启动后端服务
- [ ] 防火墙已开放端口（80/443）

---

## 常见问题

### 1) 原生模块安装失败（better-sqlite3 / bcrypt）

- Windows 需安装 Python 与 C++ Build Tools
- 删除 `node_modules` 后重新安装
- 使用 pnpm 时运行 `pnpm approve-builds`

### 2) Redis 连接失败

检查 Redis 服务是否启动，配置是否正确。

### 3) 413 文件过大错误

检查 Nginx 配置中的 `client_max_body_size` 是否足够大。

### 4) CORS 跨域错误

检查 `backend/configs/config.yaml` 中的 domainName 白名单。

### 5) Token 无效/未授权

清除浏览器 localStorage 重新登录。

### 6) PM2 启动失败

检查 Node.js 版本是否 >= 20，检查端口是否被占用。

---

## 附录

### 用户权限说明

| permission值 | 角色 | 说明 |
|------------|------|------|
| 1 | 超级管理员 | 最高权限 |
| 2 | 管理员 | 管理权限 |
| 3 | 普通用户 | 基本权限 |

### 创建用户

```bash
node create-user.js [用户名] [账号] [密码] [权限]
# 示例
node create-user.js 管理员 admin@123.com 123456 2
```

### 个性化修改指南

详细的自定义修改指南请参考 [Extension.md](./Extension.md)。

## 许可证

BSD 3-Clause，详见 `LICENSE`。
