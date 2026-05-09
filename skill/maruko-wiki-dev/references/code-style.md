# 代码编写规范

## 目录

1. [后端代码规范](#后端代码规范)
2. [前端代码规范](#前端代码规范)
3. [数据库规范](#数据库规范)
4. [Git提交规范](#git提交规范)

---

## 后端代码规范

### 0. 通用函数规范

**通用函数必须放在 `backend/src/method/` 目录下**

```javascript
// ✅ 正确：通用函数放在method目录
// backend/src/method/date-utils.js
export function formatDate(date, format = 'YYYY-MM-DD') {
    // 实现
}

export function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

// backend/src/method/string-utils.js
export function truncate(str, length) {
    return str.length > length ? str.slice(0, length) + '...' : str;
}
```

**何时创建新的method文件**：
- 函数被3个及以上不同模块使用
- 函数是纯工具函数，与业务无关
- 函数涉及特定领域的操作（日期、字符串、文件等）

### 1. 模块导入规范

```javascript
// ✅ 正确：按类别分组，空行分隔
import fs from 'fs';
import path from 'path';

import { queryOne, queryAll } from '../method/database.js';
import { createRouteHandler } from '../method/route-helpers.js';
import { logger } from '../components/log4.js';

// ❌ 错误：混在一起，无分组
import fs from 'fs';
import { queryOne } from '../method/database.js';
import path from 'path';
import { createRouteHandler } from '../method/route-helpers.js';
```

### 2. 路由编写规范

```javascript
import { createRouteHandler, createValidatedRouteHandler } from '../method/route-helpers.js';

// ✅ 正确：使用 createRouteHandler 包装
router.get('/users',
    authenticateToken,
    createRouteHandler(async (req) => {
        const users = await getUsers();
        return {
            success: true,
            code: 200,
            data: users,
            message: '获取成功'
        };
    })
);

// ✅ 正确：使用 createValidatedRouteHandler 进行参数验证
router.post('/users',
    authenticateToken,
    createValidatedRouteHandler({
        name: { type: 'string', required: true, maxLength: 50 },
        email: { type: 'email', required: true }
    }, async (req) => {
        const user = await createUser(req.body);
        return {
            success: true,
            code: 200,
            data: user,
            message: '创建成功'
        };
    })
);
```

### 3. Service层规范

```javascript
// ✅ 正确：Service层处理业务逻辑，不直接操作HTTP
export async function getUserById(id) {
    // 参数验证
    if (!id || isNaN(id)) {
        throw new Error('无效的用户ID');
    }

    // 业务逻辑
    const user = queryOne('SELECT * FROM user WHERE id = ?', [id]);
    if (!user) {
        return null;
    }

    // 数据处理
    return {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.create_time
    };
}

// ✅ 正确：批量操作使用事务
export async function batchUpdateUsers(userIds, data) {
    const db = getDatabase();
    try {
        db.prepare('BEGIN TRANSACTION').run();

        for (const id of userIds) {
            update('UPDATE user SET status = ? WHERE id = ?', [data.status, id]);
        }

        db.prepare('COMMIT').run();
        return { success: true };
    } catch (error) {
        db.prepare('ROLLBACK').run();
        throw error;
    }
}
```

### 4. 数据库操作规范

```javascript
import { queryOne, queryAll, insert, update, del } from '../method/database.js';

// ✅ 正确：使用参数化查询，防止SQL注入
const user = queryOne('SELECT * FROM user WHERE id = ? AND status = ?', [id, status]);

// ❌ 错误：字符串拼接SQL
const user = queryOne(`SELECT * FROM user WHERE id = ${id}`);

// ✅ 正确：批量查询使用IN
const users = queryAll('SELECT * FROM user WHERE id IN (' + ids.map(() => '?').join(',') + ')', ids);

// ✅ 正确：查询字段明确指定
const user = queryOne('SELECT id, name, email FROM user WHERE id = ?', [id]);

// ❌ 错误：使用SELECT *
const user = queryOne('SELECT * FROM user WHERE id = ?', [id]);
```

### 5. 错误处理规范

```javascript
// ✅ 正确：统一错误处理
try {
    const result = await someAsyncOperation();
    return { success: true, data: result };
} catch (error) {
    logger.error('操作失败:', error);
    return {
        success: false,
        code: 500,
        message: '操作失败: ' + error.message
    };
}

// ✅ 正确：路由层统一错误处理由 createRouteHandler 处理
// 不需要在每个路由中写 try-catch
```

### 6. 日志规范

```javascript
import { logger } from '../components/log4.js';

// ✅ 正确：使用分级日志
logger.debug('调试信息');
logger.info('普通信息');
logger.warn('警告信息');
logger.error('错误信息');

// ✅ 正确：日志包含上下文
logger.info(`[用户模块] 创建用户成功: ${userId}`);
logger.error(`[订单模块] 处理订单失败: ${orderId}`, error);

// ❌ 错误：无上下文的日志
logger.info('成功');
logger.error('失败');
```

### 7. 定时任务规范

```javascript
// 任务执行锁
let isRunning = false;
let taskStartTime = 0;
const TASK_TIMEOUT = 10 * 60 * 1000; // 10分钟超时

async function runTask() {
    // ✅ 正确：检查执行锁，带超时检测
    if (isRunning) {
        const elapsed = Date.now() - taskStartTime;
        if (elapsed < TASK_TIMEOUT) {
            logger.warn(`[任务名] 任务正在执行中（已执行 ${Math.floor(elapsed / 1000)} 秒），跳过本次执行`);
            return;
        } else {
            logger.warn(`[任务名] 任务执行超过 ${TASK_TIMEOUT / 60000} 分钟，可能已卡住，强制重新执行`);
        }
    }

    isRunning = true;
    taskStartTime = Date.now();

    try {
        // 任务逻辑
        logger.info('[任务名] 开始执行任务');
        await doSomething();
        logger.info('[任务名] 任务执行成功');
    } catch (error) {
        logger.error('[任务名] 任务执行失败:', error);
        throw error;
    } finally {
        isRunning = false;
        taskStartTime = 0;
    }
}

export default {
    cron: '0 0 3 * * *',  // 每天3点执行
    task: runTask
};
```

---

## 前端代码规范

### 0. 管理后台选择规范

**重要：功能优先往新管理后台写**

| 后台类型 | 路径 | 使用场景 |
|---------|------|----------|
| **新管理后台** | `frontend_admin/` | **默认选择**，所有新功能优先写这里 |
| **旧管理后台** | `frontend/src/components/Admin/index.vue` | 除非用户特殊提及，否则不写这里 |
| **用户端** | `frontend/` | 面向普通用户的功能 |

### 1. 组件模块化规范

**可复用组件必须抽离封装**

```
frontend_admin/src/components/
├── Common/                 # 通用组件（跨模块复用）
│   ├── CronGenerator/      # Cron表达式生成器
│   ├── ImageUploader/      # 图片上传组件
│   ├── DataTable/          # 数据表格组件
│   └── SearchFilter/       # 搜索筛选组件
├── ComponentStyle/         # 样式组件
└── [模块]/                 # 业务组件
```

**何时抽离为通用组件**：
- 在2个及以上页面使用
- 逻辑复杂，独立维护更方便
- 需要统一交互/样式规范

**通用组件示例**：

```vue
<!-- frontend_admin/src/components/Common/ImageUploader/index.vue -->
<template>
  <div class="image-uploader">
    <el-upload
      :action="uploadUrl"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
    >
      <el-button type="primary">上传图片</el-button>
    </el-upload>
    <div v-if="modelValue" class="preview">
      <img :src="modelValue" />
      <el-icon @click="removeImage"><Delete /></el-icon>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: String,
  maxSize: { type: Number, default: 5 }, // MB
  accept: { type: String, default: 'image/*' }
});

const emit = defineEmits(['update:modelValue']);

// 组件逻辑...
</script>
```

### 2. 主题色规范

**主题色配置位置**：
- `frontend/src/assets/_theme.scss` - 定义Sass变量（仅在此文件使用Sass）
- `frontend/src/assets/index.scss` - 生成CSS变量供全局使用

**使用方式**：
```css
/* 在Vue文件中使用CSS变量（不写Sass） */
.my-button {
  background-color: var(--color-primary);
  color: var(--color-primary-light);
}
```

**重要约定**：
- 只有 `_theme.scss` 和 `index.scss` 使用Sass
- Vue文件中使用CSS变量，不写Sass
- 按钮等组件可以不使用主题色，根据设计需求决定

### 3. Vue3 组合式API规范

```vue
<script setup>
// ✅ 正确：按顺序组织代码
import { ref, computed, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

// 1. 导入
import { getUsers } from '@/api/user.js';

// 2. 响应式数据
const users = ref([]);
const loading = ref(false);
const searchQuery = ref('');

// 3. 计算属性
const filteredUsers = computed(() => {
    if (!searchQuery.value) return users.value;
    return users.value.filter(u => u.name.includes(searchQuery.value));
});

// 4. 方法
const fetchUsers = async () => {
    loading.value = true;
    try {
        const res = await getUsers();
        if (res.code === 200) {
            users.value = res.data;
        }
    } catch (error) {
        ElMessage.error('获取用户失败');
    } finally {
        loading.value = false;
    }
};

// 5. 生命周期
onMounted(() => {
    fetchUsers();
});
</script>
```

### 2. API调用规范

```javascript
// ✅ 正确：统一封装API
import { Client } from '@/utils/HttpClient.js';

export function getUsers(params) {
    return Client.get('/api/users', { params });
}

export function createUser(data) {
    return Client.post('/api/users', data);
}

export function updateUser(id, data) {
    return Client.put(`/api/users/${id}`, data);
}

export function deleteUser(id) {
    return Client.delete(`/api/users/${id}`);
}
```

### 3. 组件Props规范

```vue
<script setup>
// ✅ 正确：定义Props
const props = defineProps({
    // 基础类型
    title: {
        type: String,
        required: true
    },
    // 带默认值
    pageSize: {
        type: Number,
        default: 10
    },
    // 对象类型
    user: {
        type: Object,
        default: () => ({})
    },
    // 数组类型
    items: {
        type: Array,
        default: () => []
    },
    // 枚举类型
    type: {
        type: String,
        validator: (value) => ['primary', 'success', 'warning', 'danger'].includes(value)
    }
});

// ✅ 正确：定义Emits
const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

// 触发事件
const handleSubmit = () => {
    emit('submit', formData);
};
</script>
```

### 4. 样式规范

```vue
<style scoped>
/* ✅ 正确：使用scoped限定作用域 */
.user-card {
    padding: 16px;
    border-radius: 8px;
    background: #fff;
}

/* ✅ 正确：BEM命名规范 */
.user-card__header {
    font-size: 16px;
    font-weight: bold;
}

.user-card__body {
    margin-top: 12px;
}

/* ✅ 正确：使用CSS变量 */
.user-card {
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color);
}

/* ❌ 错误：使用标签选择器 */
div {
    padding: 10px;
}

/* ❌ 错误：过深的嵌套 */
.user-card .header .title span {
    color: red;
}
</style>
```

---

## 数据库规范

### 1. 表命名规范

- 表名使用小写下划线命名：`user_profile`, `bilibili_binding`
- 表名使用单数形式：`user` 而不是 `users`
- 关联表使用双方表名：`user_role` 而不是 `user_roles`

### 2. 字段命名规范

- 主键统一使用 `id`
- 外键使用 `表名_id`：`user_id`, `role_id`
- 时间字段：`create_time`, `update_time`
- 状态字段：`status`, `is_deleted`, `is_enabled`
- 布尔字段使用 `is_` 前缀：`is_vip`, `is_bilibili_bound`

### 3. SQL编写规范

```sql
-- ✅ 正确：关键字大写，表名/字段名小写
SELECT id, name, email
FROM user
WHERE status = 1
  AND create_time > '2024-01-01'
ORDER BY create_time DESC
LIMIT 10;

-- ✅ 正确：创建表语句
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    status INTEGER DEFAULT 1,
    is_deleted INTEGER DEFAULT 0,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ✅ 正确：添加索引
CREATE INDEX idx_user_status ON user(status);
CREATE INDEX idx_user_create_time ON user(create_time);
```

---

## Git提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复bug |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |

### 示例

```
feat(user): 添加用户批量导入功能

- 支持Excel文件导入
- 支持数据验证
- 支持导入结果导出

Closes #123
```

```
fix(bilibili): 修复粉丝同步任务超时问题

- 添加任务执行超时检测
- 优化API调用频率控制

Fixes #456
```

---

## 代码审查清单

### 后端代码审查

- [ ] 是否使用参数化查询防止SQL注入
- [ ] 是否正确处理错误和异常
- [ ] 是否添加适当的日志记录
- [ ] 是否有执行锁防止定时任务重复执行
- [ ] 是否遵循三层架构（Route→Service→Method）

### 前端代码审查

- [ ] 是否正确使用Vue3组合式API
- [ ] 是否有适当的加载状态和错误处理
- [ ] 是否使用scoped样式
- [ ] 是否正确处理组件Props
- [ ] 是否有内存泄漏风险（未清理的定时器/事件监听）

### 通用审查

- [ ] 代码是否符合命名规范
- [ ] 是否有重复代码需要提取
- [ ] 注释是否清晰必要
- [ ] 是否有过长的函数需要拆分
