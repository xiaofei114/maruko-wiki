---
name: maruko-wiki-dev
description: 喵丸Wiki项目开发指南。用于开发基于Node.js + Vue3的B站主播粉丝管理系统。包含项目结构说明、代码编写规范、常见错误排查方法。当用户需要开发、维护或排错喵丸Wiki项目时触发此skill。
---

# 喵丸Wiki项目开发指南

## 项目概述

喵丸Wiki是一个B站主播粉丝管理系统，包含：
- **backend**: Node.js + Express 后端API服务
- **frontend**: Vue3 + ElementPlus 用户前端
- **frontend_admin**: Vue3 + ElementPlus 管理后台（新管理后台）

## 重要约定

### 服务启动
**除非用户明确要求，否则不要尝试启动服务**。服务启动会导致：
- 端口号冲突（3000、5173等）
- PM2进程管理混乱
- 数据库连接冲突

**正确做法**: 编写完代码后，告知用户如何自行启动排查。

### 前端开发
- **新管理后台**: `frontend_admin`（功能优先写这里）
- **旧管理后台**: `frontend/src/components/Admin/index.vue`（除非特殊提及，否则不写这里）
- **组件模块化**: 可复用的场景提炼封装成通用组件

### 后端开发
- **通用函数**: 放在 `backend/src/method/` 目录下
- **数据库修改**: 见下方"数据库修改流程"

## 快速导航

- **项目结构**: 参见 [references/project-structure.md](references/project-structure.md)
- **代码规范**: 参见 [references/code-style.md](references/code-style.md)
- **排错指南**: 参见 [references/troubleshooting.md](references/troubleshooting.md)
- **API规范**: 参见 [references/api-guidelines.md](references/api-guidelines.md)

## 核心开发原则

### 1. 三层架构

```
Route (路由层) → Service (业务层) → Method (数据层)
```

- **Route**: 只处理HTTP请求/响应，不直接操作数据库
- **Service**: 处理业务逻辑，调用Method层方法
- **Method**: 提供基础数据操作方法（database.js直接操作SQLite）

### 2. 配置管理

- 系统配置: `backend/configs/config.yaml`
- 任务配置: `backend/configs/task.yaml`
- 配置字段映射: `backend/data/configFields.json`

**重要**: 修改配置后需要重启服务才能生效

### 3. 定时任务

定时任务位于 `backend/src/systemTasks/`，每个任务文件导出：

```javascript
export default {
    cron: '0 0 3 * * *',  // Cron表达式
    task: async () => {    // 任务函数
        // 任务逻辑
    }
}
```

**任务执行锁**: 每个任务必须实现执行锁，防止重复执行

### 4. 数据库操作

使用 `backend/src/method/database.js` 提供的方法：

```javascript
import { queryOne, queryAll, insert, update, del } from '../method/database.js';

// 查询单条
const user = queryOne('SELECT * FROM user WHERE id = ?', [id]);

// 查询多条
const users = queryAll('SELECT * FROM user WHERE status = ?', [status]);

// 插入
const id = insert('INSERT INTO user (name, email) VALUES (?, ?)', [name, email]);

// 更新
update('UPDATE user SET name = ? WHERE id = ?', [name, id]);
```

## 常见开发场景

### 场景1: 添加新API接口

1. 在 `backend/src/routes/` 创建或修改路由文件
2. 在 `backend/src/services/` 创建对应的service
3. 使用 `createRouteHandler` 包装路由处理函数
4. 在 `backend/src/components/initialize.js` 注册路由

### 场景2: 添加新页面

**用户端 (frontend)**:
1. 在 `frontend/src/components/` 创建组件
2. 在 `frontend/src/router/index.js` 添加路由
3. 在 `frontend/src/api/` 创建API调用

**管理端 (frontend_admin)**:
1. 在 `frontend_admin/src/components/` 创建组件
2. 在 `frontend_admin/src/router/index.js` 添加路由
3. 在 `frontend_admin/src/api/` 创建API调用

### 场景3: 修改数据库结构（数据库修改流程）

**必须按以下步骤执行**：

1. **创建SQL文件**
   - 在 `backend/sql/` 创建新的SQL文件
   - 按序号命名，如 `010_maruko_sql.sql`（查看目录中最大序号+1）
   - 文件内容包含完整的ALTER TABLE或CREATE TABLE语句

2. **更新sql.yaml**
   - 打开项目根目录的 `sql.yaml`
   - 在文件末尾添加新表的注释说明
   - 示例：
     ```yaml
     # ==================== 新功能表 ====================
     new_table:
       id: 主键
       name: 名称
       create_time: 创建时间
     ```

3. **AI只负责编写SQL文件**
   - **项目启动时会自动执行SQL更新**
   - AI只需确保SQL文件语法正确
   - 无需手动执行SQL命令

4. **更新代码**
   - 更新对应的Service代码
   - 更新相关API接口

5. **更新skill文档**
   - 修改 `references/project-structure.md` 中的SQL文件列表
   - 确保文档与实际文件一致

### 场景4: 添加定时任务

1. 在 `backend/src/systemTasks/` 创建任务文件
2. 实现任务执行锁和超时检测
3. 在 `backend/configs/task.yaml` 添加配置
4. 重启服务加载任务

## 调试技巧

### 查看日志

```bash
# 实时查看日志
tail -f backend/logs/app.log

# 查看错误日志
tail -f backend/logs/error.log
```

### PM2调试

```bash
# 查看PM2状态
pm2 status

# 查看PM2日志（使用实际的应用名称）
pm2 logs <app-name>

# 重启服务（使用实际的应用名称）
pm2 restart <app-name>
```

**注意**: 应用名称从 `configs/config.yaml` 的 `log.prefix` 读取，默认为 `maruko-node`

### 前端调试

```bash
# 用户端开发服务器
cd frontend && npm run dev

# 管理端开发服务器
cd frontend_admin && npm run dev
```

## 部署检查清单

- [ ] 配置文件已更新 (`configs/config.yaml`)
- [ ] 任务配置已检查 (`configs/task.yaml`)
- [ ] 数据库迁移已执行
- [ ] 依赖已安装 (`npm install`)
- [ ] 服务已重启 (`pm2 restart`)
- [ ] 日志无错误

## 重要文件路径

```
backend/
├── configs/config.yaml          # 系统配置
├── configs/task.yaml            # 任务配置
├── data/configFields.json       # 配置字段映射
├── src/components/initialize.js # 服务初始化
├── src/method/database.js       # 数据库操作
└── src/systemTasks/             # 定时任务

frontend/ & frontend_admin/
├── src/api/                     # API接口
├── src/components/              # 页面组件
├── src/router/index.js          # 路由配置
└── src/stores/                  # Pinia状态管理
```
