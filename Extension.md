# WIKI 个性化修改指南

本文档包含 WIKI 项目的所有个性化配置修改项，包括环境配置、前端自定义、后端配置、图片资源、文本内容、主题颜色等。

***

## 目录

1. [环境配置](#1-环境配置)
2. [需要修改的内容清单](#2-需要修改的内容清单)
3. [前端自定义修改](#3-前端自定义修改)
4. [后端配置](#4-后端配置)
5. [图片资源修改](#5-图片资源修改)
6. [文本内容修改](#6-文本内容修改)
7. [主题颜色修改](#7-主题颜色修改)

***

## 1. 环境配置

### 1.1 前端环境配置

**开发环境：** `frontend/.env.development`

```bash
# 后端API地址（开发环境连接本地后端）
VITE_APP_BASE_URL=http://localhost:6660

# Bilibili直播间房间号
VITE_APP_ROOM_ID=你的房间号

# Bilibili用户ID（主播UID）
VITE_APP_USER_ID=你的用户ID
```

**生产环境：** `frontend/.env.production`

```bash
# 方式一：使用nginx代理（推荐）
# 前端请求 /api/* 会被nginx转发到后端，无需考虑跨域
VITE_APP_BASE_URL=/api

# 方式二：直接连接后端（需要后端配置CORS白名单）
# VITE_APP_BASE_URL=http://你的域名:6660

# Bilibili直播间房间号
VITE_APP_ROOM_ID=你的房间号

# Bilibili用户ID（主播UID）
VITE_APP_USER_ID=你的用户ID
```

### 1.2 后端配置文件

**文件位置：** `backend/configs/config.yaml`

```yaml
# 后端服务端口
httpPort: 6660

# 跨域白名单配置（允许访问的域名/地址）
domainName:
  - http://localhost:6660         # 本地后端
  - http://localhost:5173         # 本地开发前端 (Vite dev)
  - http://localhost:4173         # 本地预览前端 (Vite preview)
  # 添加你的实际域名，例如：
  # - http://your-domain.com
  # - https://your-domain.com

# JWT签名密钥
token: your-secret-key

# 日志配置
log:
  cmd: info      # 命令行日志级别: debug, info, warn, error
  file: all      # 文件日志级别: all, debug, info, warn, error

# Redis配置
redis:
  host: localhost
  port: 6379
  password: null   # 如有密码请填写

# 邮件配置（用于发送验证码等）
email:
  # 见邮件配置章节
```

***

## 2. 需要修改的内容清单

### 2.1 直播间信息

| 文件位置                              | 配置项                | 说明           |
| --------------------------------- | ------------------ | ------------ |
| `backend/configs/config.yaml`      | `bilibili.roomId`  | Bilibili房间号  |
| `backend/configs/config.yaml`      | `bilibili.userId`  | Bilibili用户ID |
| `frontend/.env.development`       | `VITE_APP_ROOM_ID` | Bilibili房间号  |
| `frontend/.env.development`       | `VITE_APP_USER_ID` | Bilibili用户ID |
| `frontend/.env.production`        | `VITE_APP_ROOM_ID` | Bilibili房间号  |
| `frontend/.env.production`        | `VITE_APP_USER_ID` | Bilibili用户ID |
| `frontend/src/views/Home.vue`     | 主播主页链接             | 用户ID         |
| `frontend/src/views/Home.vue`     | 直播间链接              | 房间号          |

### 2.2 网站名称

| 文件位置                                 | 当前名称      |
| ------------------------------------ | --------- |
| `frontend/index.html`                | 小猫丸子Wiki  |
| `frontend/src/components/Top.vue`    | 小猫丸子Wiki  |
| `frontend/src/components/Bottom.vue` | 小猫丸子Wiki  |
| `frontend/src/views/Home.vue`        | 小猫丸子      |
| `frontend/src/views/Login.vue`       | 小猫丸子      |

### 2.3 主播信息（Home.vue）

| 修改项        | 文件位置                       | 说明       |
| ---------- | -------------------------- | -------- |
| 主播名字       | Home.vue 第11行 `anchorName` | 修改为主播名字  |
| 粉丝文案       | Home.vue 第596-606行         | 粉丝相关文案   |
| 直播时长目标     | Home.vue 第22行 `ct` / 第657行 | 时长目标配置   |
| Bilibili主页 | Home.vue 第568行             | 主播主页链接   |
| 直播间链接      | Home.vue 第770行             | 直播间链接    |

### 2.4 备案号

| 文件位置                                 | 配置项   |
| ------------------------------------ | ----- |
| `frontend/src/components/Bottom.vue` | 你的备案号 |

### 2.5 主题颜色

项目主色调为蓝色系 `#409eff`，如需修改粉色主题（`#FF85A2`），请在以下文件中搜索并替换：

- `frontend/src/components/Top.vue`
- `frontend/src/views/Home.vue`
- `frontend/src/views/Admin.vue`
- `frontend/src/views/Announcement.vue`
- `frontend/src/views/Audio.vue`
- `frontend/src/views/PhotoAlbum.vue`
- `frontend/src/views/PhotoAlbumDetail.vue`
- `frontend/src/views/PlanDocument.vue`
- `frontend/src/views/Profile.vue`

### 2.6 图片资源

| 修改项  | 文件位置                              | 说明                      |
| ---- | --------------------------------- | ----------------------- |
| 用户头像 | `frontend/src/components/Top.vue` | 导入 `@/assets/猫玩伴.png`   |
| 首页背景 | `frontend/src/views/Home.vue` CSS | 修改 background-image URL |

### 2.7 Token Key

| 文件位置                          | Key          |
| ----------------------------- | ------------ |
| `frontend/src/stores/user.js` | maruko_token |
| `frontend/src/utils/http.js`  | maruko_token |
| `frontend/src/api/audio.js`   | maruko_token |

### 2.8 第三方链接

| 文件位置                                 | 链接     |
| ------------------------------------ | ------ |
| `frontend/src/components/Bottom.vue` | 你的仓库链接 |

### 2.9 页面文字

| 文件位置                                | 内容   |
| ----------------------------------- | ---- |
| `frontend/src/views/Home.vue`       | 粉丝文案 |
| `frontend/src/views/Audio.vue`      | 音声标题 |
| `frontend/src/views/PhotoAlbum.vue` | 相册标题 |

***

## 3. 前端自定义修改

### 3.1 主播信息修改

**文件位置**: `frontend/src/views/Home.vue`

| 修改项     | 行号 | 代码位置                             | 说明        |
| ------- | -- | -------------------------------- | --------- |
| 主播名字    | 11 | `const anchorName = ref('主播名字')` | 修改为主播名字   |
| 默认头像URL | 12 | `const defaultAvatar = ref('')`  | 留空则显示加载动画 |

### 3.2 页面标题和名称

**文件位置**: `frontend/src/components/Top.vue`

| 修改项    | 行号  | 代码位置                                        |
| ------ | --- | ------------------------------------------- |
| 顶部导航标题 | 258 | `<span class="brand-text">小猫丸子Wiki</span>` |
| 移动端标题  | 319 | `<h3>小猫丸子Wiki</h3>`                        |

**文件位置**: `frontend/src/views/Home.vue`

| 修改项     | 行号  | 代码位置                          | 默认值         |
| ------- | --- | ----------------------------- | ----------- |
| 粉丝数量标题  | 596 | 根据粉丝数显示不同文案                   | 粉丝相关文案      |
| 1w粉达成文案 | 603 | 1万粉庆祝文案                       | 1万粉目标文案     |
| 距离1w粉文案 | 606 | 1万粉目标文案                       | 1万粉目标文案     |

### 3.3 直播数据配置

**文件位置**: `frontend/src/views/Home.vue`

| 修改项      | 行号  | 默认值  | 说明         |
| -------- | --- | ---- | ---------- |
| 月度直播时长目标 | 657 | `90` | 每月直播90小时目标 |
| 有效天数目标   | 22  | `22` | 每月22天有效直播  |

```javascript
// 修改月度时长目标 (行657)
<template #suffix>小时/90小时</template>

// 修改有效天目标 (Home.vue 第22行)
const ct = 22  // 有效天目标
```

### 3.4 首页模块标题

**文件位置**: `frontend/src/views/Home.vue`

| 模块    | 行号     | 默认值   |
| ----- | ------ | ----- |
| 相册模块  | ~1529  | 相册模块名 |
| 音声模块  | ~1530  | 音声模块名 |
| 公告模块  | ~1531  | 公告中心  |
| 企划表模块 | ~1532  | 企划表   |

***

## 4. 后端配置

### 4.1 服务端口

**文件位置**: `backend/configs/config.yaml`

```yaml
httpPort: 6660
```

### 4.2 CORS跨域配置

**文件位置**: `backend/configs/config.yaml`

```yaml
domainName:
  - http://localhost:6660
  - http://localhost:5173
  - http://localhost:4173
  - http://你的域名:端口
  - https://你的域名
```

### 4.3 数据库自动建表

**文件位置**: `backend/src/components/sql.js`

后端启动时自动创建以下表：

| 表名                    | 说明    |
| --------------------- | ----- |
| user                  | 用户表   |
| photo_album           | 相册分类表 |
| photo                 | 照片表   |
| audio_classification  | 音声分类表 |
| audio                 | 音声表   |
| live_duration         | 直播记录表 |
| announcement          | 公告表   |
| plan_document         | 企划文档表 |

***

## 5. 图片资源修改

### 5.1 用户头像

**文件位置**: `frontend/src/components/Top.vue`

```javascript
// 第7行 - 修改为你的图片
import img from '@/assets/猫玩伴.png'
```

**放置图片**: `frontend/src/assets/猫玩伴.png`

### 5.2 背景图片

首页背景图在 `frontend/src/views/Home.vue` 中定义：

```css
/* 行1536-1540 */
background-image:
    url('你的背景图片URL'),
    linear-gradient(135deg, #f5f7fa 0%, #e4e9f2 100%);
```

如需修改，替换URL即可。

***

## 6. 文本内容修改

### 6.1 首页文本

**文件位置**: `frontend/src/views/Home.vue`

| 文本内容   | 行号范围       | 说明           |
| ------ | ---------- | ------------ |
| 主播名字   | 11         | `anchorName` |
| 粉丝文案   | 596-606    | 根据粉丝数显示不同文案  |
| 直播时长目标 | 657        | 90小时目标       |
| 模块标题   | 1529-1532  | 相册、音声、公告、企划表 |
| 模块描述   | 约1533-1536 | 各模块的描述文字     |

### 6.2 Bilibili链接

**文件位置**: `frontend/src/views/Home.vue`

| 链接   | 行号  | 说明    |
| ---- | --- | ----- |
| 主播主页 | 568 | 主播主页链接 |
| 直播间  | 770 | 直播间链接  |

***

## 7. 主题颜色修改

### 7.1 主色调

项目主色调为蓝色系 `#409eff`，如需修改全局色调，需要修改以下位置：

**常用颜色位置** (直接在CSS中搜索 `#409eff`):

```css
/* Top.vue */
background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);

/* 其他页面 */
color: #409eff;              /* 各种文字颜色 */
background: #409eff;         /* 背景色 */
border-color: #409eff;       /* 边框色 */
```

如需修改为粉色主题（`#FF85A2`），请在以下文件中搜索 `#409eff` 并替换：

- `frontend/src/components/Top.vue`
- `frontend/src/views/Home.vue`
- `frontend/src/views/Admin.vue`
- `frontend/src/views/Announcement.vue`
- `frontend/src/views/Audio.vue`
- `frontend/src/views/PhotoAlbum.vue`
- `frontend/src/views/PhotoAlbumDetail.vue`
- `frontend/src/views/PlanDocument.vue`
- `frontend/src/views/Profile.vue`

### 7.2 Element Plus 主题色

如果需要修改 Element Plus 组件的主题色，需要在 `frontend/src/main.js` 中添加自定义主题配置，或使用CSS覆盖。

***

## 附录

### A. 用户权限说明

| permission值 | 角色    | 说明   |
| ----------- | ----- | ---- |
| 1           | 超级管理员 | 最高权限 |
| 2           | 管理员   | 管理权限 |
| 3           | 普通用户  | 基本权限 |

### B. 创建用户脚本

**文件位置**: `backend/create-user.js`

```bash
# 使用方法
node create-user.js [用户名] [账号] [密码] [权限]

# 示例
node create-user.js 管理员 admin@123.com 123456 2
```

### C. 友情链接配置

**文件位置**: `frontend/src/components/Top.vue`

```javascript
// 第17-26行
const friendlyLinks = [
  { name: '梨按钮', url: 'https://www.shanerubian.online/' },
  { name: '虎按钮', url: 'https://zhaoshihu.shanerubian.online/' },
  // 添加你的友情链接
]
```

***

*本文档最后更新于 2026-04-04*
