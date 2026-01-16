<script setup>
import gitee from '@/assets/gitee.png'
import github from '@/assets/github.png'
import aifadian from '@/assets/aifadian.png'
// 平台链接
const platformLinks = [
    { name: 'Gitee', icon: gitee, url: 'https://gitee.com/xiaofeiawa/maruko-wiki/' },
    { name: 'GitHub', icon: github, url: 'https://github.com/xiaofei114/maruko-wiki/' },
    { name: '爱发电', icon: aifadian, url: 'https://afdian.com/a/xiaofeiqwq/' }
]

const currentYear = new Date().getFullYear()
</script>

<template>
    <footer class="bottom-bar">
        <div class="container">
            <!-- 主要内容 -->
            <div class="footer-main">
                <!-- 左侧：品牌 -->
                <div class="footer-brand">
                    <div class="brand-text">
                        <span class="brand-name">小猫丸子Wiki</span>
                        <span class="brand-tag">分享奇妙回响</span>
                    </div>
                </div>

                <!-- 中间：平台链接 -->
                <div class="footer-platforms">
                    <a v-for="platform in platformLinks" :key="platform.name" :href="platform.url" target="_blank"
                        :title="platform.name" class="platform-link">
                        <img :src="platform.icon" alt="" class="platform-icon">
                    </a>
                </div>

                <!-- 右侧：版权 -->
                <div class="footer-copyright">
                    <div>&copy; {{ currentYear }} 小猫丸子Wiki</div>
                    <a href="https://beian.miit.gov.cn" target="_blank" class="beian-link">辽ICP备2024032879号</a>
                </div>
            </div>
        </div>
    </footer>
</template>

<style scoped>
.bottom-bar {
    width: 100%;
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    position: relative;
    margin-top: auto;
    overflow: hidden;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
    position: relative;
    z-index: 1;
}

/* 主要内容水平布局 */
.footer-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 22px 0;
}

/* 品牌区域 */
.footer-brand {
    display: flex;
    align-items: center;
    gap: 15px;
}

.brand-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.brand-name {
    font-size: 20px;
    font-weight: 700;
    font-family: 'Comic Sans MS', cursive;
    color: #ecf0f1;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.brand-tag {
    font-size: 13px;
    color: #bdc3c7;
    font-weight: 400;
}

/* 平台链接区域 */
.footer-platforms {
    display: flex;
    align-items: center;
    gap: 24px;
}

.platform-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    color: #ecf0f1;
    text-decoration: none;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.platform-link:hover {
    transform: translateY(-3px) scale(1.1);
    background: rgba(52, 152, 219, 0.8);
    border-color: #3498db;
    box-shadow: 0 4px 16px rgba(52, 152, 219, 0.4);
}

.platform-icon {
    width: 75%;
    height: 75%;
    filter: brightness(0) invert(1);
    transition: filter 0.3s ease;
}

.platform-link:hover .platform-icon {
    filter: brightness(0) invert(1) brightness(1.2);
}

/* 版权信息 */
.footer-copyright {
    font-size: 14px;
    color: #bdc3c7;
    font-weight: 400;
    text-align: right;
}

.beian-link {
    color: #95a5a6;
    text-decoration: none;
    transition: all 0.3s ease;
    font-size: 13px;
}

.beian-link:hover {
    color: #3498db;
    text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .container {
        padding: 0 15px;
    }

    .footer-main {
        flex-direction: column;
        gap: 20px;
        padding: 28px 0;
        text-align: center;
    }

    .footer-main::before {
        display: none;
    }

    .footer-brand {
        justify-content: center;
    }

    .footer-platforms {
        justify-content: center;
    }

    .footer-copyright {
        font-size: 13px;
        text-align: center;
    }

    .brand-name {
        font-size: 18px;
    }
}

@media (max-width: 480px) {
    .footer-main {
        padding: 24px 0;
        gap: 16px;
    }

    .footer-brand {
        gap: 10px;
    }

    .brand-name {
        font-size: 16px;
    }

    .platform-link {
        width: 36px;
        height: 36px;
    }

    .platform-icon {
        width: 18px;
        height: 18px;
    }

    .footer-copyright {
        font-size: 12px;
    }

    .beian-link {
        font-size: 12px;
    }
}
</style>
