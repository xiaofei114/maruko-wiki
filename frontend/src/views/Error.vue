<script setup>
import { ElButton } from 'element-plus';
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const router = useRouter();
const isAnimating = ref(false);

function goHome() {
  isAnimating.value = true;
  setTimeout(() => router.push('/'), 300);
}
</script>

<template>
  <div class="error-page" :class="{ 'animating': isAnimating }">

    <!-- 主要内容 -->
    <div class="error-container" role="main" aria-labelledby="error-title">

      <h1 class="error-code" id="error-code">404</h1>
      <h2 class="error-title" id="error-title">页面未找到</h2>
      <p class="error-message" role="status">
        您访问的页面不存在或已被移除。
        <br>
        请检查网址是否正确，或返回首页继续浏览。
      </p>

      <div class="action-buttons">
        <el-button type="primary" @click="goHome" class="home-button" :loading="isAnimating" size="large"
          aria-label="返回首页">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 20V14H14V20H19V12H22L12 3L2 12H5V20H10Z" fill="currentColor" />
          </svg>
          返回首页
        </el-button>

        <el-button @click="router.go(-1)" class="back-button" size="large" aria-label="返回上一页">
          <svg class="button-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 11H7.83L13.42 5.41L12 4L4 12L12 20L13.41 18.59L7.83 13H20V11Z" fill="currentColor" />
          </svg>
          返回上一页
        </el-button>
      </div>

      <!-- 装饰性元素 -->
      <div class="decorative-elements">
        <div class="floating-shape shape-1"></div>
        <div class="floating-shape shape-2"></div>
        <div class="floating-shape shape-3"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #b0e0e6 0%, #87ceeb 30%, #4682b4 70%, #1e90ff 100%);
  position: relative;
  overflow: hidden;
  font-family: 'Comic Sans MS', 'Chalkduster', 'Bradley Hand', cursive, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  transition: all 0.3s ease;
}

.error-page.animating {
  transform: scale(0.98);
  opacity: 0.8;
}
/* 主要容器 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  position: relative;
  z-index: 2;
  max-width: 600px;
  margin: 0 auto;
}

/* 错误图标 */

.error-icon svg {
  width: 100%;
  height: 100%;
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
    opacity: 0.8;
  }

  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

/* 错误代码 */
.error-code {
  font-size: clamp(4rem, 12vw, 8rem);
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 1rem 0;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.2),
    2px 2px 0px rgba(135, 206, 235, 0.3),
    -2px -2px 0px rgba(255, 255, 255, 0.1);
  animation: slideInFromTop 0.8s ease-out;
  background: linear-gradient(45deg, #ffffff, #e6f3ff, #ffffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-family: 'Comic Sans MS', 'Chalkduster', 'Bradley Hand', cursive, 'Segoe UI', sans-serif;
  letter-spacing: 2px;
}

@keyframes slideInFromTop {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 错误标题 */
.error-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1.5rem 0;
  animation: slideInFromBottom 0.8s ease-out 0.2s both;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2),
    1px 1px 0px rgba(135, 206, 235, 0.4),
    -1px -1px 0px rgba(255, 255, 255, 0.2);
  font-family: 'Comic Sans MS', 'Chalkduster', 'Bradley Hand', cursive, 'Segoe UI', sans-serif;
  letter-spacing: 1px;
}

/* 错误信息 */
.error-message {
  font-size: clamp(0.9rem, 2.5vw, 1.1rem);
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.7;
  margin: 0 0 2rem 0;
  animation: fadeInUp 0.8s ease-out 0.4s both;
  max-width: 400px;
  font-family: 'Comic Sans MS', 'Chalkduster', 'Bradley Hand', cursive, 'Segoe UI', sans-serif;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  letter-spacing: 0.5px;
}

/* 按钮组 */
.action-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  animation: fadeInUp 0.8s ease-out 0.6s both;
  margin: 0 0 5rem 0;
}

.home-button,
.back-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  border-radius: 50px;
  padding: 0.75rem 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  border: none;
  cursor: pointer;
  text-decoration: none;
  font-family: 'Comic Sans MS', 'Chalkduster', 'Bradley Hand', cursive, 'Segoe UI', sans-serif;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.home-button {
  background: linear-gradient(45deg, #0066cc, #0099ff);
  color: white;
  box-shadow: 0 4px 20px rgba(0, 102, 204, 0.3);
}

.home-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 102, 204, 0.5);
}

.back-button {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(10px);
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(255, 255, 255, 0.25);
}

.button-icon {
  width: 20px;
  height: 20px;
}

/* 装饰元素 */
.decorative-elements {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
}

.floating-shape {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: floatShape 6s infinite ease-in-out;
}

.shape-1 {
  width: 100px;
  height: 100px;
  top: 10%;
  right: 10%;
  animation-delay: 0s;
}

.shape-2 {
  width: 60px;
  height: 60px;
  top: 60%;
  left: 10%;
  animation-delay: 2s;
}

.shape-3 {
  width: 80px;
  height: 80px;
  bottom: 20%;
  right: 20%;
  animation-delay: 4s;
}

@keyframes floatShape {

  0%,
  100% {
    transform: translateY(0px) rotate(0deg);
  }

  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

@keyframes fadeInUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .error-container {
    padding: 1rem;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
  }

  .home-button,
  .back-button {
    width: 100%;
    justify-content: center;
  }

  .error-code {
    font-size: 6rem;
  }

  .error-title {
    font-size: 2rem;
  }

  .error-message {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {

  .error-code {
    font-size: 5rem;
  }

  .error-title {
    font-size: 1.8rem;
  }

  .error-message {
    font-size: 0.95rem;
  }

  .home-button,
  .back-button {
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }
}

/* 键盘导航支持 */
.home-button:focus,
.back-button:focus {
  outline: 2px solid rgba(255, 255, 255, 0.8);
  outline-offset: 2px;
}
</style>