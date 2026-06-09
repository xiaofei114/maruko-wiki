<script setup>
import { ref, watch, onMounted } from 'vue'
import { renderAsync } from 'docx-preview'

const props = defineProps({
  src: { type: String, default: '' }
})
const emit = defineEmits(['error'])
const containerRef = ref(null)
const loading = ref(false)

async function renderDocx() {
  if (!containerRef.value) return
  try {
    if (!props.src) { containerRef.value.innerHTML = ''; loading.value = false; return }
    loading.value = true
    containerRef.value.innerHTML = ''
    const token = localStorage.getItem(import.meta.env.VITE_APP_TOKEN)
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    const response = await fetch(props.src, { headers })
    if (!response.ok) throw new Error(`请求失败: ${response.status}`)
    const blob = await response.blob()
    await renderAsync(blob, containerRef.value, undefined, {
      useBase64URL: true, inWrapper: true, breakPages: true, ignoreLastRenderedPageBreak: true
    })
  } catch (error) {
    const errMsg = error?.message || ''
    let message = '文档渲染失败'
    if (errMsg.includes('End of data reached') || errMsg.includes('Corrupted zip')) {
      message = '当前文档为空白或内容过少，暂不支持在线预览，请下载后查看'
    } else if (error?.name === 'Error' && errMsg.includes('请求失败')) {
      message = errMsg
    }
    emit('error', { message, raw: error })
  } finally { loading.value = false }
}
watch(() => props.src, () => { renderDocx() })
onMounted(() => { renderDocx() })
</script>

<template>
  <div class="docx-preview-shell">
    <div v-if="loading" class="docx-loading">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line"></div>
      <div class="skeleton skeleton-line short"></div>
    </div>
    <div ref="containerRef" class="docx-preview-container" :style="{ display: loading ? 'none' : 'block' }"></div>
  </div>
</template>

<style scoped>
.docx-preview-shell { width: 100%; height: 100%; background: #fff; }
.docx-preview-container { width: 100%; height: 100%; overflow: auto; background: #fff; }
@media (max-width: 768px) { :deep(.docx-preview-container .docx-wrapper) { padding: 0; display: block; } }
.docx-loading { padding: 18px; }
.skeleton { height: 14px; border-radius: 8px; margin-bottom: 12px; background: linear-gradient(90deg, #f2f4f7 25%, #e5e9f2 50%, #f2f4f7 75%); background-size: 200% 100%; animation: shimmer 1.2s ease-in-out infinite; }
.skeleton-title { height: 18px; width: 38%; }
.skeleton-line { width: 100%; }
.skeleton-line.short { width: 62%; }
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
</style>
