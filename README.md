# 小猫丸子Wiki

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.4+-green.svg" alt="Vue">
  <img src="https://img.shields.io/badge/Node.js-20+-blue.svg" alt="Node.js">
  <img src="https://img.shields.io/badge/License-BSD--3--Clause-orange.svg" alt="License">
</p>

<p align="center">
  一个专为哔哩哔哩主播 猫丸子Maruko 创建的Wiki网站。「北立交桥 · 妖精管理局 · 猫猫祟祟」
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#在线演示">在线演示</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#贡献">贡献</a>
</p>

***

## 功能特性

### 前台功能

- **主播数据中心** - 实时展示粉丝数、舰长/提督/总督数、直播时长统计
- **舰礼系统** - 支持月度舰礼设置，包含舰长/提督/总督分级礼物，支持日期区间特殊舰礼
- **相册管理** - 相册分类浏览、照片展示、图片懒加载
- **音声播放** - 音频分类管理、在线播放、播放次数统计
- **公告系统** - 公告列表、分类筛选、置顶公告展示
- **企划文档** - Word 文档在线预览、实时联动选中
- **视频收藏** - B站视频收藏夹管理、本周热门视频推荐、视频推荐功能
- **AI 助手** - 基于 DeepSeek 的智能问答助手
- **个人中心** - 用户信息管理、B站账号绑定、消息通知

### 管理后台

- **内容审核** - 音频、照片、视频、企划文档的审核管理
- **舰礼配置** - 舰长/提督/总督礼物设置、日期区间舰礼、进度条展示控制
- **用户管理** - 用户列表、权限调整、封禁/解封、重置密码、重置用户名/头像
- **数据统计** - 主播数据追踪（粉丝/舰长/提督/总督）、每日数据记录、历史趋势图表
- **系统管理** - 字典管理、日志查看、Redis 管理、系统配置

***

## 在线演示

> 演示站点：<https://your-demo-site.com>

| 账号类型  | 账号                  | 密码       |
| ----- | ------------------- | -------- |
| 超级管理员 | <admin@example.com> | admin123 |
| 普通用户  | <user@example.com>  | user123  |

***

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 20
- [Redis](https://redis.io/) >= 6.0
- [SQLite3](https://www.sqlite.org/)（可选，项目使用 better-sqlite3）

### 安装

```bash
# 克隆项目
git clone https://github.com/your-username/maruko-wiki.git
cd maruko-wiki

# 安装后端依赖
cd backend && npm install

# 安装前端依赖
cd ../frontend && npm install
```

### 配置

```bash
# 后端配置
cp backend/examples/config.yaml backend/configs/config.yaml
# 编辑 backend/configs/config.yaml 进行配置

# 前端配置
cp frontend/.env.example frontend/.env.development
# 编辑 frontend/.env.development 进行配置
```

### 启动

```bash
# 启动后端（端口 6660）
cd backend && npm start

# 启动前端（端口 5173）
cd frontend && npm run dev
```

访问 <http://localhost:5173> 查看项目。

详细的配置和部署说明请参考 [Extension.md](./Extension.md)。

***

## 技术栈

### 前端

| 技术                                        | 说明                |
| ----------------------------------------- | ----------------- |
| [Vue 3](https://vuejs.org/)               | 渐进式 JavaScript 框架 |
| [Vite](https://vitejs.dev/)               | 下一代前端构建工具         |
| [Element Plus](https://element-plus.org/) | 基于 Vue 3 的组件库     |
| [Pinia](https://pinia.vuejs.org/)         | Vue 官方状态管理方案      |
| [Vue Router](https://router.vuejs.org/)   | Vue.js 官方路由       |
| [Axios](https://axios-http.com/)          | HTTP 客户端          |
| [ECharts](https://echarts.apache.org/)    | 数据可视化图表库          |

### 后端

| 技术                                                           | 说明             |
| ------------------------------------------------------------ | -------------- |
| [Node.js](https://nodejs.org/)                               | JavaScript 运行时 |
| [Express](https://expressjs.com/)                            | Web 应用框架       |
| [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) | SQLite 同步驱动    |
| [ioredis](https://github.com/redis/ioredis)                  | Redis 客户端      |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)   | JWT 实现         |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js)         | 密码哈希           |
| [multer](https://github.com/expressjs/multer)                | 文件上传处理         |

***

## 项目结构

```
maruko-wiki/
├── frontend/              # 用户前台
│   ├── src/
│   │   ├── components/    # 组件
│   │   ├── views/         # 页面
│   │   ├── api/           # API 接口
│   │   └── stores/        # Pinia 状态管理
│   └── dist/              # 构建产物
├── frontend_admin/        # 管理后台
│   └── src/
│       ├── components/    # 管理组件
│       └── api/           # 管理后台 API
├── backend/               # 后端服务
│   ├── src/
│   │   ├── routes/        # 路由
│   │   ├── services/      # 业务逻辑
│   │   └── method/        # 工具方法
│   ├── configs/           # 配置文件
│   └── sql/               # 数据库脚本
├── Extension.md           # 详细配置文档
├── sql.yaml               # 数据库结构文档
└── LICENSE                # 许可证
```

***

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

***

## 许可证

本项目基于 [BSD 3-Clause](./LICENSE) 许可证开源。

***

<p align="center">
  Made with ❤️ by 小猫丸子社区
</p>
