# 小猫丸子 Wiki

一个专为哔哩哔哩主播 [猫丸子 Maruko](https://space.bilibili.com/3546938511198692) 创建的粉丝互动网站。「北立交桥 · 妖精管理局 · 猫猫祟祟」

## 项目特色

### 实时数据追踪
- 粉丝数统计（目标：10万粉里程碑）
- 舰长数统计（目标：千舰成就）
- 直播状态实时监控
- 主播信息动态展示

### 丰富多彩的内容
- **丸子相簿** 
- **丸子音声** 

### 完善的管理系统
- 管理员后台
- 用户管理系统
- 文件上传管理
- 内容审核功能

## 技术架构

### 前端 (Frontend)
- **框架**: Vue 3.5.25 + Composition API
- **UI库**: Element Plus 2.11.9
- **构建工具**: Vite 7.2.4
- **状态管理**: Pinia 3.0.4
- **路由**: Vue Router 4.6.4
- **HTTP客户端**: Axios 1.13.2

### 后端 (Backend)
- **运行环境**: Node.js 20+
- **框架**: Express 4.21.2
- **数据库**: SQLite (better-sqlite3)
- **认证**: JWT (jsonwebtoken)
- **加密**: bcrypt 5.1.1
- **缓存**: Redis (ioredis)
- **日志**: log4js 6.9.1
- **邮件**: nodemailer 7.0.12

### 开发工具
- **包管理**: pnpm
- **代码检查**: ESLint
- **版本控制**: Git

### 数据库文件说明

#### sql.sql
完整的SQLite数据库初始化脚本，包含：
- 5个核心数据表的建表语句
- 自动时间戳更新触发器
- 性能优化索引
- 外键约束和数据完整性保证

#### sql.yaml
数据库结构说明文档，提供：
- 各表字段的中文含义解释
- 字段类型和约束说明
- 表间关系描述
- 业务逻辑说明

## 快速开始

### 环境要求

#### 基础环境
- Node.js >= 20.19.0 || >= 22.12.0
- pnpm >= 8.0.0
- Redis >= 6.0（用于缓存和会话存储）

#### 编译环境（Windows）
由于项目使用了 better-sqlite3 和 bcrypt 等需要编译的原生模块，需要以下编译环境：

**Python 环境：**
- Python >= 3.8（推荐 3.10+）
- pip 包管理器

**C/C++ 编译环境：**
- Visual Studio Build Tools 2022 或 Visual Studio 2019/2022
- Windows SDK（包含在 Visual Studio 中）
- 或安装 windows-build-tools：
  ```bash
  npm install --global windows-build-tools
  ```

**Linux/macOS：**
- gcc/g++ >= 8.0
- make
- Python >= 3.8

#### 验证编译环境
安装完成后，可以运行以下命令验证环境：
```bash
# 检查 Node.js 和 npm
node --version
npm --version

# 检查 Python
python --version
# 或
python3 --version

# 检查 Redis（如果安装了）
redis-server --version
```

### 安装步骤

1. **安装编译环境**

   **Windows 用户：**
   ```bash
   # 方法1：使用 windows-build-tools（推荐）
   npm install --global windows-build-tools

   # 方法2：手动安装 Visual Studio Build Tools
   # 下载并安装 Visual Studio Build Tools 2022
   # 选择 "Desktop development with C++" 工作负载
   ```

   **Linux 用户（Ubuntu/Debian）：**
   ```bash
   sudo apt update
   sudo apt install build-essential python3 python3-dev
   ```

   **macOS 用户：**
   ```bash
   # 安装 Xcode Command Line Tools
   xcode-select --install

   # 或使用 Homebrew 安装
   brew install python3
   ```

2. **启动 Redis 服务**

   **Windows：**
   ```bash
   # 如果使用 Redis for Windows
   redis-server.exe

   # 或使用 Chocolatey 安装的服务
   net start redis
   ```

   **Linux/macOS：**
   ```bash
   redis-server
   ```

3. **克隆项目**
   ```bash
   git clone --depth=1 https://gitee.com/xiaofeiawa/maruko-wiki.git
   cd maruko-wiki
   ```

4. **安装依赖**
   ```bash
   # 安装后端依赖（可能需要较长时间编译原生模块）
   cd backend
   pnpm install

   # 安装前端依赖
   cd ../frontend
   pnpm install
   ```

5. **配置环境**
   ```bash
   # 复制后端配置文件
   cd backend
   cp examples/config.yaml configs/config.yaml

   # 编辑配置文件（根据需要修改数据库路径、端口等）
   # configs/config.yaml

   # 初始化数据库（如果需要手动创建）
   # sqlite3 data/maruko-sql.db < ../../sql.sql
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
   - 后端API: http://localhost:3000

## 项目结构

```
maruko-wiki/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── components/         # 工具组件
│   │   ├── method/            # 业务方法
│   │   ├── routes/            # API路由
│   │   ├── services/          # 业务服务
│   │   └── ...
│   ├── configs/               # 配置文件
│   ├── data/                  # 数据存储
│   │   ├── document/          # 文档资源
│   │   └── maruko-sql.db      # SQLite数据库
│   ├── logs/                  # 日志文件
│   └── package.json
├── frontend/                   # 前端应用
│   ├── src/
│   │   ├── api/               # API接口
│   │   ├── components/        # Vue组件
│   │   ├── views/             # 页面视图
│   │   ├── router/            # 路由配置
│   │   ├── stores/            # 状态管理
│   │   └── ...
│   ├── public/                # 静态资源
│   └── package.json
├── sql.sql                     # SQLite数据库建表脚本和初始化数据
├── sql.yaml                    # 数据库结构说明文档
├── LICENSE                     # 许可证
└── README.md                   # 项目说明
```

## 部署说明

### 开发环境
```bash
# 使用 concurrently 同时启动前后端
cd backend
pnpm run dev

cd frontend
pnpm run dev
```

### 生产环境
```bash
# 后端部署
cd backend
pnpm run start

# 前端构建
cd frontend
pnpm run build
pnpm run preview
```

## 贡献指南

欢迎为小猫丸子 Wiki 贡献代码！

## 许可证

本项目采用 BSD 3-Clause 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 致谢

- 感谢所有为项目贡献代码的开发者
- 感谢 [猫丸子 Maruko](https://space.bilibili.com/3546938511198692) 带来的欢乐

---

Made with love for 猫丸子 Maruko  
