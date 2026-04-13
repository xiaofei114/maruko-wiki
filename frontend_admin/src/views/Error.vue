<script setup>
import { ElButton } from 'element-plus';
import { useRouter } from 'vue-router';

const router = useRouter();

function goHome() {
    router.push('/home/things');
}

</script>

<template>
    <div class="error-container">
        <h1 class="error-code"> 404 </h1>
        <h2 class="error-title"> 页面未找到 </h2>
        <p class="error-message"> 您访问的页面不存在或已被移除。 </p>
        <el-button type="primary" @click="goHome" class="home-button"> 返回首页 </el-button>
    </div>
</template>

<style scoped>
/* 将内联样式移至此处，并添加高大上的 CSS 动画 */
.error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100vh;
    background: linear-gradient(135deg, #f5f7fa, #e4e7ed);
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    animation: fadeIn 1.5s ease-in-out;
    /* 背景渐变动画 */
    position: relative;
    /* 为背景装饰定位 */
    overflow: hidden;
    /* 防止背景装饰溢出 */
}

/* 添加一个半透明、模糊效果的圆形渐变背景装饰，以填充空白 */
.error-container::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(64, 158, 255, 0.1) 0%, rgba(64, 158, 255, 0.05) 50%, transparent 70%);
    filter: blur(40px);
    z-index: 0;
}

/* 确保内容在背景装饰之上 */
.error-code,
.error-title,
.error-message,
.home-button {
    position: relative;
    z-index: 1;
}

.error-code {
    font-size: 6rem;
    margin-bottom: 0;
    color: #409EFF;
    font-weight: 300;
    letter-spacing: 2px;
    animation: fadeIn 1.5s ease-in-out;
    /* 淡入动画 */
}

.error-title {
    font-size: 2.5rem;
    margin-top: 0;
    color: #606266;
    font-weight: 300;
    letter-spacing: 1px;
    animation: fadeIn 1.5s ease-in-out 0.5s;
    /* 渐入动画，延迟 0.5s */
}

.error-message {
    font-size: 1.2rem;
    color: #909399;
    margin: 20px 0;
    letter-spacing: 0.5px;
    animation: fadeIn 1.5s ease-in-out 1s;
    /* 渐入动画，延迟 1s */
}

.home-button {
    font-size: 1.2rem;
    padding: 12px 24px;
    letter-spacing: 1px;
    border-radius: 4px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    transition: transform 0.3s, box-shadow 0.3s;
    /* 悬浮动画 */
}

.home-button:hover {
    transform: translateY(- 5px);
    box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.2);
    /* 悬浮时上移并增加阴影 */
}

@keyframes fadeIn {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

/* 可以在此处添加全局样式或覆盖 Element Plus 样式，例如： */
/* :deep(.el-button) { font-weight: 500; } */
</style>