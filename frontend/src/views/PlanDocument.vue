<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Warning, Document, Delete, Download } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { getPlanDocuments, uploadPlanDocument, deletePlanDocument, setCurrentPlanDocument } from '@/api/planDocument'

const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)

const planDocuments = ref([])
const loading = ref(false)
const error = ref(null)

const uploadDialogVisible = ref(false)
const uploadForm = ref({
  documentFile: null,
  documentName: ''
})

async function fetchPlanDocuments() {
  try {
    loading.value = true
    error.value = null
    const response = await getPlanDocuments()
    if (response.code === 200) {
      planDocuments.value = response.data || []
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

    const allowedTypes = ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const allowedExtensions = ['.doc', '.docx']
    const fileExtension = uploadForm.value.documentFile.name.split('.').pop().toLowerCase()

    if (!allowedTypes.includes(uploadForm.value.documentFile.type) && !allowedExtensions.includes('.' + fileExtension)) {
      ElMessage.error('只支持Word文档格式（.doc, .docx）')
      return
    }

    const formData = new FormData()
    formData.append('document', uploadForm.value.documentFile)
    formData.append('title', uploadForm.value.documentName.trim())
    formData.append('is_current', '1')

    const response = await uploadPlanDocument(formData)
    if (response.code === 201) {
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

function downloadDocument(doc) {
  if (!doc || !doc.filePath) return
  const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:6660'
  const url = `${baseUrl}/api/file/${doc.filePath}`
  const link = document.createElement('a')
  link.href = url
  link.download = doc.fileName || 'document.docx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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
      <section class="page-hero">
        <div class="hero-content">
          <h1 class="hero-title">企划表</h1>
          <p class="hero-subtitle">查看和管理企划文档，规划未来方向</p>
        </div>
      </section>

      <div class="controls-card">
        <div class="controls-main">
          <el-button v-if="isAuthenticated" @click="openUploadDialog" type="primary" plain>
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

      <div v-else class="document-grid">
        <div 
          v-for="doc in planDocuments" 
          :key="doc.id" 
          class="document-card"
          :class="{ 'current-document': doc.isCurrent }"
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
            <el-button @click="downloadDocument(doc)" type="primary" size="small" plain>
              <el-icon><Download /></el-icon>
              下载
            </el-button>
            <el-button 
              v-if="!doc.isCurrent" 
              @click="setAsCurrent(doc)" 
              type="success" 
              size="small" 
              plain
            >
              设置为当前
            </el-button>
            <el-button 
              v-if="isAuthenticated" 
              @click="deleteDocument(doc)" 
              type="danger" 
              size="small" 
              plain
            >
              <el-icon><Delete /></el-icon>
            </el-button>
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
              accept=".doc,.docx" 
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
                  只支持 Word 格式（.doc, .docx）
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

.page-hero {
  text-align: center;
  margin-bottom: 40px;
  padding: 60px 20px;
  background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
  border-radius: 20px;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.page-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.05) 0%, transparent 70%);
  animation: float 20s infinite linear;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3rem);
  color: #409eff;
  margin-bottom: 10px;
  font-weight: 700;
  font-family: 'Comic Sans MS', cursive;
  text-shadow: 0 2px 10px rgba(64, 158, 255, 0.2);
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #666;
  max-width: 500px;
  margin: 0 auto;
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
  border-top: 5px solid #409eff;
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
  box-shadow: 0 12px 30px rgba(64, 158, 255, 0.15);
}

.document-card.current-document {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9eb 0%, white 100%);
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

@media (max-width: 768px) {
  .container {
    padding: 15px;
  }

  .page-hero {
    padding: 40px 20px;
    margin-bottom: 30px;
  }

  .hero-title {
    font-size: 2.2rem;
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
}
</style>
