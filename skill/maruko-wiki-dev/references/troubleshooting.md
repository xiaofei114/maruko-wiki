# 排错指南

## 目录

1. [后端常见问题](#后端常见问题)
2. [前端常见问题](#前端常见问题)
3. [数据库常见问题](#数据库常见问题)
4. [部署常见问题](#部署常见问题)

---

## 后端常见问题

### 1. 服务启动失败

#### 症状
```
Error: Cannot find module 'xxx'
```

#### 解决方案
```bash
# 1. 检查依赖是否安装
cd backend && npm install

# 2. 检查Node版本（需要v18+）
node --version

# 3. 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

### 2. 数据库连接失败

#### 症状
```
Error: SQLITE_CANTOPEN: unable to open database file
```

#### 解决方案
```bash
# 1. 检查数据库文件路径
# 查看 configs/config.yaml 中的 database.path

# 2. 检查目录权限
ls -la data/

# 3. 创建数据目录
mkdir -p data/document
chmod 755 data/

# 4. 检查配置文件格式
# 确保 config.yaml 格式正确，无语法错误
```

### 3. Redis连接失败

#### 症状
```
Error: Redis connection to localhost:6379 failed
```

#### 解决方案
```bash
# 1. 检查Redis是否运行
redis-cli ping

# 2. 启动Redis
redis-server

# 3. 检查配置
# 查看 configs/config.yaml 中的 redis 配置
```

### 4. 定时任务不执行

#### 症状
- 定时任务配置正确但无日志输出
- 任务执行时间不对

#### 排查步骤
```bash
# 1. 检查任务配置
cat configs/task.yaml

# 2. 检查任务是否加载
# 查看 logs/app.log 中的初始化日志
grep "定时任务" logs/app.log

# 3. 检查Cron表达式格式
# 使用在线工具验证: https://crontab.guru/

# 4. 手动触发测试
# 通过管理后台的"立即执行"按钮测试
```

#### 常见问题

**问题**: 任务执行锁导致任务跳过
```
[任务名] 任务正在执行中，跳过本次执行
```

**解决**: 
- 检查任务是否卡住（查看日志是否有"任务完成"）
- 重启服务重置执行锁
- 检查任务超时配置

### 5. API返回500错误

#### 排查步骤

1. **查看错误日志**
```bash
tail -f logs/error.log
```

2. **常见错误及解决**

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| `Cannot read properties of undefined` | 访问未定义对象的属性 | 添加空值检查 |
| `SQLITE_CONSTRAINT: UNIQUE constraint failed` | 唯一约束冲突 | 检查重复数据 |
| `SQLITE_BUSY: database is locked` | 数据库被锁定 | 检查并发操作，优化事务 |
| `JWT expired` | Token过期 | 重新登录获取新Token |
| `Permission denied` | 权限不足 | 检查用户角色和权限 |

### 6. B站API调用失败

#### 症状
```
[粉丝同步] API调用失败: Request failed with status code 412
```

#### 解决方案
```javascript
// 1. 检查Cookie是否有效
// 查看 configs/config.yaml 中的 bilibili.cookie

// 2. 添加请求频率控制
await sleep(Math.random() * 2000 + 1000); // 1-3秒随机延时

// 3. 检查IP是否被风控
// 使用代理或更换IP

// 4. 更新Cookie
// 登录B站获取新Cookie
```

### 7. 内存泄漏

#### 症状
- 服务运行一段时间后内存持续增长
- PM2自动重启

#### 排查方法
```bash
# 1. 查看内存使用
pm2 monit

# 2. 检查是否有未关闭的连接
# - 数据库连接
# - Redis连接
# - 文件句柄

# 3. 检查定时器/监听器
# 确保组件卸载时清理
```

#### 常见原因
- 未清理的setInterval/setTimeout
- 未关闭的数据库连接
- 全局缓存无限增长

---

## 前端常见问题

### 1. 开发服务器启动失败

#### 症状
```
Error: Port 5173 is already in use
```

#### 解决方案
```bash
# 1. 查找占用端口的进程
lsof -i :5173

# 2. 更换端口
npm run dev -- --port 3000

# 3. 或修改 vite.config.js
export default {
  server: {
    port: 3000
  }
}
```

### 2. API请求失败

#### 症状
```
Network Error
CORS error
```

#### 解决方案

**开发环境**:
```javascript
// vite.config.js
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
}
```

**生产环境**:
- 检查Nginx配置
- 确认后端CORS配置正确

### 3. ElementPlus组件不显示

#### 症状
- 组件无样式
- 图标不显示

#### 解决方案
```javascript
// main.js
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
```

### 4. 路由跳转失败

#### 症状
```
No match found for location with path "/xxx"
```

#### 解决方案
```javascript
// 1. 检查路由配置
const routes = [
  {
    path: '/xxx',
    name: 'Xxx',
    component: () => import('@/components/Xxx/index.vue')
  }
]

// 2. 检查组件文件是否存在
// 3. 检查路径大小写（Linux区分大小写）
```

### 5. Pinia状态管理问题

#### 症状
- 状态不更新
- 页面刷新后状态丢失

#### 解决方案
```javascript
// stores/user.js
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null
  }),
  
  actions: {
    setUserInfo(info) {
      this.userInfo = info
      // 持久化到localStorage
      localStorage.setItem('userInfo', JSON.stringify(info))
    },
    
    loadUserInfo() {
      const info = localStorage.getItem('userInfo')
      if (info) {
        this.userInfo = JSON.parse(info)
      }
    }
  }
})
```

---

## 数据库常见问题

### 1. 数据库迁移失败

#### 症状
```
Error: table xxx already exists
```

#### 解决方案
```bash
# 1. 检查SQL文件版本号
cat sql/001_maruko_sql.sql

# 2. 手动执行SQL
sqlite3 data/maruko.db < sql/001_maruko_sql.sql

# 3. 检查表结构
sqlite3 data/maruko.db ".schema user"
```

### 2. 数据查询缓慢

#### 解决方案
```sql
-- 1. 添加索引
CREATE INDEX idx_user_status ON user(status);
CREATE INDEX idx_user_create_time ON user(create_time);

-- 2. 优化查询
-- 避免SELECT *，只查询需要的字段
SELECT id, name FROM user WHERE status = 1;

-- 3. 使用EXPLAIN分析查询
EXPLAIN QUERY PLAN SELECT * FROM user WHERE name = 'test';
```

### 3. 数据库损坏

#### 症状
```
Error: database disk image is malformed
```

#### 解决方案
```bash
# 1. 备份当前数据库
cp data/maruko.db data/maruko.db.backup

# 2. 尝试修复
sqlite3 data/maruko.db ".recover" | sqlite3 data/maruko_fixed.db

# 3. 替换修复后的数据库
mv data/maruko_fixed.db data/maruko.db
```

---

## 部署常见问题

### 1. PM2启动失败

#### 症状
```
[PM2][ERROR] Script not found
```

#### 解决方案
```bash
# 1. 检查ecosystem.config.cjs配置
module.exports = {
  apps: [{
    name: 'maruko-node',
    script: './src/components/initialize.js',
    // ...
  }]
}

# 2. 使用app.js启动
cd backend
pm2 start app.js --name maruko-node

# 3. 或直接使用ecosystem配置
pm2 start ecosystem.config.cjs
```

### 2. Nginx配置错误

#### 症状
- 502 Bad Gateway
- 静态资源404

#### 解决方案
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态资源
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 上传文件
    location /document {
        alias /path/to/backend/data/document;
    }
}
```

### 3. 环境变量不生效

#### 解决方案
```bash
# 1. 检查.env文件
# .env.production
VITE_API_BASE_URL=https://api.your-domain.com

# 2. 重新构建
npm run build

# 3. 检查生成的文件
grep -r "api.your-domain" dist/
```

---

## 日志分析技巧

### 1. 按模块过滤日志
```bash
# 查看粉丝同步日志
grep "粉丝同步" logs/app.log

# 查看错误日志
grep "ERROR" logs/app.log

# 实时查看
tail -f logs/app.log | grep "主播统计"
```

### 2. 按时间范围查看
```bash
# 查看今天的日志
grep "2026-05-09" logs/app.log

# 查看特定时间段的日志
awk '/2026-05-09 10:00/,/2026-05-09 11:00/' logs/app.log
```

### 3. 统计错误数量
```bash
# 统计今天错误数
grep "$(date +%Y-%m-%d)" logs/error.log | wc -l

# 按错误类型统计
grep "ERROR" logs/app.log | awk '{print $6}' | sort | uniq -c
```

---

## 紧急恢复步骤

### 服务完全无法启动

```bash
# 1. 备份数据
cp -r backend/data backend/data.backup.$(date +%Y%m%d)

# 2. 检查配置文件语法
cd backend
node -e "require('yaml').parse(require('fs').readFileSync('configs/config.yaml', 'utf8'))"

# 3. 使用默认配置启动
cp examples/config.yaml configs/config.yaml

# 4. 手动启动（不使用PM2）
node src/components/initialize.js
```

### 数据库严重损坏

```bash
# 1. 立即停止服务
pm2 stop maruko-node

# 2. 备份损坏的数据库
cp data/maruko.db data/maruko.db.corrupted.$(date +%Y%m%d)

# 3. 从最近的备份恢复
cp data/backupConfigs/maruko.db.backup.xxx data/maruko.db

# 4. 重新执行SQL迁移
for f in sql/*.sql; do
    sqlite3 data/maruko.db < "$f"
done

# 5. 启动服务
pm2 start maruko-node
```

---

## 调试技巧

### 后端调试

```javascript
// 添加断点调试
const result = await someFunction();
console.log('Debug:', result);  // 临时调试

// 使用debugger
async function test() {
    const data = await fetchData();
    debugger;  // 在此处断点
    return process(data);
}
```

### 前端调试

```javascript
// Vue DevTools
// 安装浏览器扩展 Vue.js devtools

// 组件调试
<script setup>
const debugData = computed(() => {
    console.log('Debug data:', someData.value);
    return someData.value;
});
</script>

// 网络请求调试
// 浏览器F12 → Network → 查看请求详情
```
