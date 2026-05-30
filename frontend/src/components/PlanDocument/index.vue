<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Warning, Document, Delete, Download } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { getPlanDocuments, uploadPlanDocument, deletePlanDocument, setCurrentPlanDocument } from '@/api/planDocument'
import PageHero from '@/components/ComponentStyle/PageHero.vue'
import DocxPreview from '@/components/ComponentStyle/DocxPreview.vue'

const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)

// 是否为管理员或超级管理员（有权限设置当前文档）
const canSetCurrent = computed(() => {
    const permission = userStore.user?.permission
    return permission === 1 || permission === 2
})

const nickName = import.meta.env.VITE_APP_NICK_NAME;

const planDocuments = ref([])
const loading = ref(false)
const error = ref(null)
const selectedDocument = ref(null)
const previewError = ref('')
const previewRenderKey = ref(0)

const baseUrl = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : (import.meta.env.VITE_APP_BASE_URL?.replace(/\/api\/?$/, '') || '')
const selectedPreviewUrl = computed(() => {
  if (!selectedDocument.value?.filePath) return ''
  const apiPrefix = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : '/api'
  return `${baseUrl}${apiPrefix}/file/${selectedDocument.value.filePath}`
})

const uploadDialogVisible = ref(false)
const uploadForm = ref({
  documentFile: null,
  documentName: ''
})

function syncSelectedDocument() {
  if (planDocuments.value.length === 0) {
    selectedDocument.value = null
    return
  }

  if (selectedDocument.value) {
    const matched = planDocuments.value.find(item => item.id === selectedDocument.value.id)
    if (matched) {
      selectedDocument.value = matched
      return
    }
  }

  selectedDocument.value = planDocuments.value.find(item => item.isCurrent) || planDocuments.value[0]
}

function selectDocument(doc) {
  selectedDocument.value = doc
  previewError.value = ''
  previewRenderKey.value += 1
}

async function fetchPlanDocuments() {
  try {
    loading.value = true
    error.value = null
    const response = await getPlanDocuments()
    if (response.code === 200) {
      planDocuments.value = response.data || []
      syncSelectedDocument()
    } else {
      throw new Error(response.message || '获取失败')
    }
  } catch (err) {
    error.value = '获取企划表列表失败，请稍后重试'
    ElMessage.error('获取企划表列表失败，请稍后重试')
    planDocuments.value = []
  } finally {
    loading.value = false
  }
}

async function handleUpload() {
  try {
    if (!uploadForm.value.documentFile) {
      ElMessage.error('请选择文档文件')
      return
    }
    if (!uploadForm.value.documentName.trim()) {
      ElMessage.error('请输入文档名称')
      return
    }

    const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const allowedExtensions = ['.docx']
    const fileExtension = uploadForm.value.documentFile.name.split('.').pop().toLowerCase()

    if (!allowedTypes.includes(uploadForm.value.documentFile.type) && !allowedExtensions.includes('.' + fileExtension)) {
      ElMessage.error('只支持 Word 格式（.docx）')
      return
    }

    const formData = new FormData()
    formData.append('document', uploadForm.value.documentFile)
    formData.append('title', uploadForm.value.documentName.trim())
    formData.append('is_current', '1')

    const response = await uploadPlanDocument(formData)
    if (response.code === 200) {
      ElMessage.success('文档上传成功')
      uploadDialogVisible.value = false
      
      await fetchPlanDocuments()
      
      uploadForm.value.documentFile = null
      uploadForm.value.documentName = ''
    } else {
      throw new Error(response.message || '上传失败')
    }
  } catch (err) {
    ElMessage.error('上传失败，请稍后重试')
  }
}

async function deleteDocument(doc) {
  try {
    await ElMessageBox.confirm(
      `确定要删除文档 "${doc.title}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const response = await deletePlanDocument(doc.id)
    if (response.code === 200) {
      ElMessage.success('文档删除成功')
      await fetchPlanDocuments()
    } else {
      throw new Error(response.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败，请稍后重试')
    }
  }
}

async function setAsCurrent(doc) {
  try {
    const response = await setCurrentPlanDocument(doc.id)
    if (response.code === 200) {
      ElMessage.success('已设置为当前文档')
      await fetchPlanDocuments()
    } else {
      throw new Error(response.message || '设置失败')
    }
  } catch (err) {
    ElMessage.error('设置失败，请稍后重试')
  }
}

function handleFileChange(file, fileList) {
  if (fileList.length > 0) {
    const selectedFile = file.raw || file
    uploadForm.value.documentFile = selectedFile
    
    if (!uploadForm.value.documentName) {
      uploadForm.value.documentName = selectedFile.name.replace(/\.[^/.]+$/, '')
    }
  } else {
    uploadForm.value.documentFile = null
    uploadForm.value.documentName = ''
  }
}

function handleFileExceed(files, fileList) {
  ElMessage.warning('只能选择一个文档文件，请先移除当前文件后再选择新的文件')
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

async function downloadDocument(doc) {
  if (!doc || !doc.filePath) return
  const apiPrefix = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : '/api'
  const url = `${baseUrl}${apiPrefix}/file/${doc.filePath}`

  try {
    const res = await fetch(url)
    const blob = await res.blob()

    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = blobUrl
    link.download = doc.fileName

    document.body.appendChild(link)
    link.click()

    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  } catch (err) {
    ElMessage.error('下载失败，请稍后重试')
  }
}

function onPreviewError(payload) {
  const detail = payload?.message ? `（${payload.message}）` : ''
  previewError.value = `当前文档暂不支持在线预览，请下载后查看${detail}`
}

function openUploadDialog() {
  uploadDialogVisible.value = true
  uploadForm.value.documentFile = null
  uploadForm.value.documentName = ''
}

onMounted(() => {
  fetchPlanDocuments()
})
</script>

<template>
  <div class="plan-document-page">
    <div class="container">
      <PageHero :title="`${nickName}企划`" subtitle="绘出明日蓝图，邀你共同执笔未来" />

      <div class="controls-card" v-if="isAuthenticated">
        <div class="controls-main">
          <el-button @click="openUploadDialog" type="primary" plain>
            <el-icon><UploadFilled /></el-icon>
            上传文档
          </el-button>
        </div>
      </div>

      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载企划表...</p>
      </div>

      <div v-else-if="error" class="error-state">
        <el-empty description="加载失败" :image-size="80">
          <template #image>
            <el-icon size="80" class="error-icon">
              <Warning />
            </el-icon>
          </template>
          <el-button @click="fetchPlanDocuments" type="primary">重试</el-button>
        </el-empty>
      </div>

      <div v-else-if="planDocuments.length === 0" class="empty-state">
        <el-empty description="暂无企划表数据" :image-size="80">
          <template #image>
            <el-icon size="80" class="empty-icon">
              <Document />
            </el-icon>
          </template>
          <template v-if="isAuthenticated" #default>
            <el-button type="primary" @click="openUploadDialog">
              <el-icon><UploadFilled /></el-icon>
              上传第一个文档
            </el-button>
          </template>
        </el-empty>
      </div>

      <div v-else class="document-preview-page">
        <div class="document-grid">
              <div 
                v-for="doc in planDocuments" 
                :key="doc.id" 
                class="document-card"
                :class="{ 'current-document': doc.isCurrent, 'selected-document': selectedDocument?.id === doc.id }"
                @click="selectDocument(doc)"
              >
                <div class="card-header">
                  <h3>{{ doc.title }}</h3>
                  <el-tag v-if="doc.isCurrent" type="success" size="small">当前文档</el-tag>
                </div>
                <div class="card-body">
                  <div class="document-info">
                    <p class="file-name">{{ doc.fileName }}</p>
                    <p class="upload-time">{{ formatTime(doc.uploadTime) }}</p>
                  </div>
                </div>
                <div class="card-footer">
                  <el-button @click.stop="downloadDocument(doc)" type="primary" size="small" plain>
                    <el-icon><Download /></el-icon>
                    下载
                  </el-button>
                  <el-button 
                    v-if="canSetCurrent && !doc.isCurrent" 
                    @click.stop="setAsCurrent(doc)" 
                    type="success" 
                    size="small" 
                    plain
                  >
                    设置为当前
                  </el-button>
                  <el-button 
                    v-if="canSetCurrent" 
                    @click.stop="deleteDocument(doc)" 
                    type="danger" 
                    size="small" 
                    plain
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>

        <div class="bottom-preview-panel">
          <div class="preview-panel-header">
            <h3>实时预览</h3>
            <span v-if="selectedDocument">当前选中：{{ selectedDocument.fileName }}</span>
          </div>
          <div class="preview-panel-body">
            <el-empty v-if="!selectedDocument" description="请选择上方文档后自动展示" :image-size="60" />
            <el-empty v-else-if="previewError" :description="previewError" :image-size="60" />
            <docx-preview
              v-else
              :key="`bottom-${previewRenderKey}`"
              :src="selectedPreviewUrl"
              style="height: 100%"
              @error="onPreviewError"
            />
          </div>
        </div>
      </div>

      <el-dialog v-model="uploadDialogVisible" title="上传企划文档" width="600px" :close-on-click-modal="false">
        <el-form :model="uploadForm">
          <el-form-item>
            <el-upload 
              :on-change="handleFileChange" 
              :auto-upload="false"
              :show-file-list="true" 
              accept=".docx" 
              action="" 
              drag 
              :limit="1"
              :on-exceed="handleFileExceed" 
              style="width: 100%;"
            >
              <el-icon class="el-icon--upload">
                <UploadFilled />
              </el-icon>
              <div class="el-upload__text">
                将 Word 文档拖到此处，或 <em>点击选择</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  只支持 Word 格式（.docx）
                </div>
              </template>
            </el-upload>
          </el-form-item>

          <el-form-item label="文档名称">
            <el-input v-model="uploadForm.documentName" placeholder="请输入文档名称" maxlength="50" show-word-limit />
          </el-form-item>
        </el-form>

        <template #footer>
          <span class="dialog-footer">
            <el-button @click="uploadDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="handleUpload">
              确定上传
            </el-button>
          </span>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped>
.plan-document-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 20px 40px;
}

.controls-card {
  background: white;
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 25px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.8);
}

.controls-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 20px;
  text-align: center;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
  100% { transform: translateY(0px) rotate(360deg); }
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.document-preview-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.document-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.document-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 12px 30px var(--color-primary-alpha-15);
}

.document-card.current-document {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9eb 0%, white 100%);
}

.document-card.selected-document {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary-alpha-20), 0 12px 30px var(--color-primary-alpha-18);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fafbfc;
  border-bottom: 1px solid #f0f2f5;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.card-body {
  padding: 20px;
}

.document-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-name {
  margin: 0;
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-time {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  background: #fafbfc;
  border-top: 1px solid #f0f2f5;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.bottom-preview-panel {
  background: white;
  border-radius: 16px;
  border: 1px solid #ebeef5;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.preview-panel-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #f0f2f5;
  background: #fafcff;
}

.preview-panel-header h3 {
  margin: 0;
  color: #303133;
  font-size: 15px;
}

.preview-panel-header span {
  color: #606266;
  font-size: 12px;
}

.preview-panel-body {
  padding: 12px;
}

@media (max-width: 768px) {
  .container {
    padding: 15px;
  }

  .controls-card {
    padding: 16px 20px;
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .document-grid {
    grid-template-columns: 1fr;
  }

  .preview-panel-body {
    height: 360px;
  }
}
</style>
