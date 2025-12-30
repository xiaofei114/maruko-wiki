<script setup>
import Top from '@/components/Top.vue'
import {ref} from 'vue'
import {ElMessage} from 'element-plus'
import {Download} from '@element-plus/icons-vue'

// 模拟下载数据
const downloadItems = ref([
  {
    id: 1,
    name: '音频合集.zip',
    type: 'audio',
    size: '25.3 MB',
    date: '2024-01-15',
    description: '包含所有音声文件的压缩包'
  },
  {
    id: 2,
    name: '相册图片合集.zip',
    type: 'image',
    size: '45.8 MB',
    date: '2024-01-10',
    description: '包含所有相册图片的压缩包'
  },
  {
    id: 3,
    name: '猫丸子表情包.png',
    type: 'image',
    size: '2.1 MB',
    date: '2024-01-05',
    description: '可爱的猫丸子表情包'
  }
])

// 下载文件
const downloadFile = (item) => {
  // 模拟下载
  ElMessage.success(`正在下载: ${item.name}`)

  // 在实际项目中，这里会调用真实的下载API
  // 例如：window.open(item.downloadUrl)
}

// 获取文件类型图标
const getFileIcon = (type) => {
  switch (type) {
    case 'audio':
      return 'fas fa-music'
    case 'image':
      return 'fas fa-image'
    default:
      return 'fas fa-file'
  }
}

// 获取文件类型名称
const getFileTypeName = (type) => {
  switch (type) {
    case 'audio':
      return '音频'
    case 'image':
      return '图片'
    default:
      return '文件'
  }
}
</script>

<template>
  <div class="download-page">
    <!-- 顶部导航栏 -->
    <Top/>

    <div class="content-wrapper">
      <!-- 页面头部 -->
      <div class="page-hero">
        <div class="hero-content">
          <h1 class="hero-title">下载中心</h1>
          <p class="hero-subtitle">记录精彩时刻，与你分享美好时光</p>
        </div>
      </div>

      <!-- 下载列表 -->
      <div class="download-section">
        <div class="download-grid">
          <div v-for="item in downloadItems" :key="item.id" class="download-card" @click="downloadFile(item)">
            <div class="card-icon">
              <i :class="getFileIcon(item.type)"></i>
            </div>
            <div class="card-content">
              <h3 class="card-title">{{ item.name }}</h3>
              <p class="card-description">{{ item.description }}</p>
              <div class="card-meta">
                <span class="file-type">{{ getFileTypeName(item.type) }}</span>
                <span class="file-size">{{ item.size }}</span>
                <span class="file-date">{{ item.date }}</span>
              </div>
            </div>
            <div class="card-action">
              <el-button type="primary" size="small">
                <i class="fas fa-download"></i>
                下载
              </el-button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="downloadItems.length === 0" class="empty-state">
          <el-empty description="暂无下载资源" :image-size="80">
            <template #image>
              <el-icon size="80" class="empty-icon">
                <Download/>
              </el-icon>
            </template>
          </el-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.download-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

/* 页面头部 */
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

/* 下载区域 */
.download-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.download-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.download-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.download-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
  transform: translateY(-2px);
}

.card-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #409eff;
  color: white;
  border-radius: 8px;
  font-size: 20px;
  margin-right: 15px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-description {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.card-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #999;
}

.card-action {
  margin-left: 15px;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  color: #c0c4cc;
}

@keyframes float {
  0% {
    transform: translateY(0px) rotate(0deg);
  }

  50% {
    transform: translateY(-20px) rotate(180deg);
  }

  100% {
    transform: translateY(0px) rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .content-wrapper {
    padding: 15px;
  }

  .page-hero {
    padding: 40px 20px;
    margin-bottom: 30px;
  }

  .hero-title {
    font-size: 2.2rem;
  }

  .download-section {
    padding: 20px;
  }

  .download-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .download-card {
    flex-direction: column;
    text-align: center;
    gap: 15px;
  }

  .card-icon {
    margin-right: 0;
    align-self: center;
  }

  .card-action {
    margin-left: 0;
    align-self: stretch;
  }

  .card-meta {
    justify-content: center;
    flex-wrap: wrap;
  }
}
</style>
