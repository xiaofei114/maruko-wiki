<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElDialog, ElButton } from 'element-plus'
import { getVersion } from '@/api/version'

const VERSION_STORAGE_KEY = import.meta.env.VITE_VERSION_STORAGE_KEY
const POLLING_INTERVAL = 60 * 1000 // 1分钟
let pollingTimer = null
let pendingServerVersion = null // 待更新的版本号

const dialogVisible = ref(false)
const dialogMessage = ref('')
let closeCount = 0 // 关闭次数计数

// 文案序列
const messageSequence = [
  {
    title: '版本更新提示',
    className: 'dialog-normal',
    color: '#606266',
    message: '检测到系统已更新，请刷新页面以获取最新版本。'
  },
  {
    title: '哼，不许无视我！',
    className: 'dialog-tsundere',
    color: '#e6a23c',
    message: '哼~才不是特意提醒你呢！只是刚好有新版本而已……快、快刷新啦！'
  },
  {
    title: '你又关掉了呢❤',
    className: 'dialog-yandere',
    color: '#ff4d8f',
    message: '诶？又把我关掉了吗？❤ 真有趣呢~ 明明都已经提醒过你了，却还是假装没看见。'
  },
  {
    title: '看来需要一点惩罚呢♪',
    className: 'dialog-dark',
    color: '#ff6666',
    message: '啊啦，看来你已经决定继续无视我了呢~ 那么从现在开始，后果就要由你自己承担啦❤'
  }
]

// 获取后端版本号
async function fetchVersion() {
  try {
    const result = await getVersion()
    if (result?.success && result.data?.version) {
      return result.data.version
    }
  } catch (error) {
    console.error('获取版本号失败:', error)
  }
  return null
}

// 清除缓存并刷新
function clearCacheAndReload() {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('static') || name.includes('assets') || name.includes('build')) {
          caches.delete(name)
        }
      })
    })
  }
  window.location.reload(true)
}

// 执行刷新
function doRefresh() {
  localStorage.setItem(VERSION_STORAGE_KEY, pendingServerVersion)
  clearCacheAndReload()
}

// 显示更新弹窗
function showUpdateDialog(serverVersion) {
  pendingServerVersion = serverVersion
  closeCount = 0
  dialogMessage.value = messageSequence[0]
  dialogVisible.value = true
}

// 关闭弹窗（点X）
function handleBeforeClose() {
  closeCount++
  if (closeCount >= messageSequence.length) {
    // 第3次关闭，直接刷新
    doRefresh()
  } else {
    dialogVisible.value = false
    setTimeout(() => {
      // 更新文案
      dialogMessage.value = messageSequence[closeCount]
      dialogVisible.value = true
    }, 500)
  }
}

// 检查版本更新
async function checkVersion(isInitialCheck = false) {
  const serverVersion = await fetchVersion()
  if (!serverVersion) return

  const localVersion = localStorage.getItem(VERSION_STORAGE_KEY)

  if (!localVersion) {
    localStorage.setItem(VERSION_STORAGE_KEY, serverVersion)
    window.location.reload()
    return
  }

  if (localVersion !== serverVersion) {
    if (isInitialCheck) {
      localStorage.setItem(VERSION_STORAGE_KEY, serverVersion)
      clearCacheAndReload()
    } else {
      showUpdateDialog(serverVersion)
    }
  }
}

// 启动轮询
function startPolling() {
  pollingTimer = setInterval(() => {
    if (!dialogVisible.value) {
      checkVersion(false)
    }
  }, POLLING_INTERVAL)
}

onMounted(() => {
  checkVersion(true)
  startPolling()
})

onUnmounted(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
})
</script>

<template>
  <div>
    <RouterView />

    <ElDialog v-model="dialogVisible" :title="dialogMessage.title" :class="dialogMessage.className" align-center
      :close-on-click-modal="false" :close-on-press-escape="false" :before-close="handleBeforeClose" :teleported="false" width="480px">
      <p style="font-size: 16px; line-height: 1.6;" :style="{ color: dialogMessage.color }">
        {{ dialogMessage.message }}
      </p>

      <template #footer>
        <div style="display: flex; justify-content: flex-end;">
          <ElButton type="primary" @click="doRefresh" plain>立即刷新</ElButton>
          <ElButton type="warning" @click="doRefresh" plain>马上刷新</ElButton>
          <ElButton type="danger" @click="doRefresh" plain>现在刷新</ElButton>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
/* ========================================
动画定义
======================================== */

@keyframes tsundereShake {

  0%,
  100% {
    transform: translateX(0);
  }

  20% {
    transform: translateX(-3px);
  }

  40% {
    transform: translateX(3px);
  }

  60% {
    transform: translateX(-2px);
  }

  80% {
    transform: translateX(2px);
  }
}

@keyframes yanderePulse {
  0% {
    box-shadow:
      0 0 10px rgba(255, 105, 180, 0.25),
      0 0 20px rgba(255, 105, 180, 0.12);
  }

  50% {
    box-shadow:
      0 0 35px rgba(255, 105, 180, 0.75),
      0 0 70px rgba(255, 105, 180, 0.4);
  }

  100% {
    box-shadow:
      0 0 10px rgba(255, 105, 180, 0.25),
      0 0 20px rgba(255, 105, 180, 0.12);
  }
}

@keyframes darkWarning {
  0% {
    box-shadow:
      0 0 10px rgba(255, 0, 0, 0.3),
      0 0 20px rgba(255, 0, 0, 0.15);
  }

  50% {
    box-shadow:
      0 0 40px rgba(255, 0, 0, 0.9),
      0 0 80px rgba(255, 0, 0, 0.45);
  }

  100% {
    box-shadow:
      0 0 10px rgba(255, 0, 0, 0.3),
      0 0 20px rgba(255, 0, 0, 0.15);
  }
}

@keyframes floating {
  0% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-6px);
  }

  100% {
    transform: translateY(0);
  }
}

@keyframes evilTitle {
  0% {
    color: #ff6666;
    text-shadow: 0 0 5px rgba(255, 0, 0, 0.3);
  }

  50% {
    color: #ff0000;
    text-shadow: 0 0 20px rgba(255, 0, 0, 0.9);
  }

  100% {
    color: #ff6666;
    text-shadow: 0 0 5px rgba(255, 0, 0, 0.3);
  }
}

/* ========================================
第一阶段：正常系统
======================================== */

:deep(.dialog-normal .el-dialog) {
  border-radius: 12px;
  border: 1px solid #dcdfe6;
}

:deep(.dialog-normal .el-dialog__title) {
  font-weight: 600;
}

/* ========================================
第二阶段：傲娇
======================================== */

:deep(.dialog-tsundere .el-dialog) {
  border-radius: 18px;

  border: 2px solid #e6a23c;

  background: linear-gradient(180deg,
      #fffdf8 0%,
      #fff8e8 100%);

  box-shadow:
    0 0 15px rgba(230, 162, 60, 0.25),
    0 0 30px rgba(230, 162, 60, 0.15);

  animation: tsundereShake 0.5s ease;
}

:deep(.dialog-tsundere .el-dialog__title) {
  color: #e6a23c;
  font-weight: 700;
}

:deep(.dialog-tsundere .el-dialog__close) {
  color: #e6a23c;
  transition: 0.2s;
}

:deep(.dialog-tsundere .el-dialog__close:hover) {
  transform: scale(1.2);
}

/* ========================================
第三阶段：腹黑
======================================== */

:deep(.dialog-yandere .el-dialog) {
  border-radius: 18px;

  border: 2px solid #ff6fa9;

  background: linear-gradient(180deg,
      #fff8fc 0%,
      #fff1f6 100%);

  animation: yanderePulse 2s infinite;

  box-shadow:
    0 0 15px rgba(255, 111, 169, 0.3),
    0 0 30px rgba(255, 111, 169, 0.15);
}

:deep(.dialog-yandere .el-dialog__title) {
  color: #ff4d8f;
  font-weight: 700;
}

:deep(.dialog-yandere .el-dialog__close) {
  color: #ff4d8f;
}

:deep(.dialog-yandere .el-dialog__close:hover) {
  transform: rotate(15deg) scale(1.2);
}

/* ========================================
第四阶段：黑化
======================================== */

:deep(.dialog-dark .el-dialog) {
  border-radius: 18px;

  background: #181818;

  border: 2px solid #ff4444;

  color: white;

  animation:
    darkWarning 1.2s infinite,
    floating 3s ease-in-out infinite;
}

:deep(.dialog-dark .el-dialog__header) {
  border-bottom: 1px solid rgba(255, 0, 0, 0.25);
}

:deep(.dialog-dark .el-dialog__footer) {
  border-top: 1px solid rgba(255, 0, 0, 0.25);
}

:deep(.dialog-dark .el-dialog__body) {
  color: #f5f5f5;
}

:deep(.dialog-dark .el-dialog__title) {
  animation: evilTitle 1.5s infinite;
  font-weight: 700;
}

:deep(.dialog-dark .el-dialog__close) {
  color: #ff6666;
  transition: 0.3s;
}

:deep(.dialog-dark .el-dialog__close:hover) {
  transform: rotate(180deg) scale(1.3);
  color: #ff0000;
}

/* ========================================
黑化按钮
======================================== */

:deep(.dialog-dark .el-button--primary) {
  border-color: #ff6666;
  color: #ff6666;
}

:deep(.dialog-dark .el-button--warning) {
  border-color: #ff8844;
  color: #ff8844;
}

:deep(.dialog-dark .el-button--danger) {
  border-color: #ff4444;
  color: #ff4444;
}

:deep(.dialog-dark .el-button:hover) {
  transform: scale(1.05);
}
</style>
