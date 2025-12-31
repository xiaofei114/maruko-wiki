<script setup>
import Top from '@/components/Top.vue'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Bell, Clock, User, Star } from '@element-plus/icons-vue'

// 展开的公告ID集合
const expandedAnnouncements = ref(new Set())

// 切换公告展开状态
const toggleExpanded = (announcementId) => {
    if (expandedAnnouncements.value.has(announcementId)) {
        expandedAnnouncements.value.delete(announcementId)
    } else {
        expandedAnnouncements.value.add(announcementId)
    }
}

// 检查公告是否展开
const isExpanded = (announcementId) => {
    return expandedAnnouncements.value.has(announcementId)
}

// 判断公告内容是否需要折叠（超过2个段落或总字符数超过150）
const shouldCollapse = (content) => {
    const totalChars = content.join('').length
    return content.length > 2 || totalChars > 150
}

// 获取折叠显示的内容（前1-2个段落，根据内容长度智能判断）
const getCollapsedContent = (content) => {
    if (content.length <= 1) return content

    // 如果只有一个段落但很长，则截取前120个字符
    if (content.length === 1 && content[0].length > 120) {
        return [content[0].substring(0, 120) + '...']
    }

    // 如果有两个段落，检查总长度
    if (content.length >= 2) {
        const firstTwo = content.slice(0, 2)
        const combined = firstTwo.join('')
        if (combined.length <= 120) return firstTwo

        // 如果太长，只显示第一个段落
        return [content[0].substring(0, 120) + '...']
    }

    return content
}

// 模拟公告数据 TODO 暂时写死，后面接后端
const announcements = ref([
    {
        id: 1,
        title: '【小猫丸子Wiki】社区公告与上传规范',
        content: [
            '<strong>各位喜爱猫丸伴，大家好！</strong>',
            '欢迎来到这个由粉丝自发创建的Wiki。为了维护这个属于我们的小天地，确保网站能够长久、安全、健康地运行，并充分尊重与保护主播猫丸子及所有支持者的权益，请务必仔细阅读并遵守以下社区规则。',
            '<h4>一、关于内容上传的核心规定</h4>',
            '所有登录用户均可上传公开的音声与图片，但所有内容都必须先通过<strong>人工审核</strong>才会公开显示。审核时间通常为<strong>1-3个工作日</strong>，请耐心等待。请注意，以下内容<strong style="color: #f56c6c;">严格禁止</strong>上传：',
            '<strong>1. 严禁上传与传播任何"舰长"专属的未公开内容。</strong>',
            '包括舰长群内发布的专属动态壁纸、专属音声、专属图片、未公开的直播录像/剪辑，以及任何明确标识为仅限舰长福利的资源，这些内容是猫丸子对舰长们真诚支持的<strong>专属回馈</strong>，是彼此间的信任与约定。擅自对外传播会严重损害舰长们的权益，也违背了主播与粉丝之间宝贵的情谊。请让我们一起守护这份特别的<strong>"契约"</strong>。',
            '<strong>2. 严禁上传任何违法违规及敏感内容。</strong>',
            '一切涉及<strong>R18/色情</strong>、<strong>成人内容</strong>、<strong>血腥暴力</strong>、<strong>政治敏感</strong>的内容，以及任何违反中国法律法规和社会主义核心价值观的内容。同时，也严禁上传任何形式的<strong>盗版</strong>、<strong>侵权材料</strong>，<span style="color: #e6a23c;">请注意：本网站受中国法律管辖，审核将以此为标准严格执行。违规内容将直接删除，并可能导致账号被禁用。</span>',
            '<strong>3. 严禁泄露任何与舰长群相关的隐私信息。</strong>',
            '禁止以任何形式公开舰长群的群聊名称、群号、加群方式、内部聊天记录截图。同时，也请勿详细描述或公开舰长福利的具体获取渠道、未公开的福利细节等，<span style="color: #e6a23c;">请注意：讨论群内趣事或"内部梗"时，也请务必进行脱敏处理，避免因细节泄露而间接暴露隐私。</span>',
            '<h4>二、审核、反馈与共同监督</h4>',
            '审核并非刁难，而是为了确保网站安全和<strong>内容合规</strong>的必要流程。如果您的上传长时间未通过，可能是因为内容涉及上述禁止事项，或属于非公开内容。',
            '如果对审核结果有疑问，或认为内容被误判，可以进行<strong>反馈申诉</strong>，我们会进行复核。',
            '我们鼓励大家共同维护社区环境。如果您在浏览时发现任何违规内容，请及时举报，帮助我们及时发现和处理。',
            '<h4>三、一些心里话</h4>',
            '创建这个Wiki的初衷，是为了集中保存那些关于猫丸子的美好、有趣的<strong>公开瞬间</strong>，是一个<strong>用爱发电</strong>的存档站。它不是一个资源下载站，更不是内部福利的传播渠道。',
            '我们每一位用户，都是这个小小花园的<strong>园丁</strong>。只有大家都遵守规则，尊重主播，尊重彼此，这个角落才能持续成为干净、温暖、值得信赖的应援之地。',
            '<em>感谢你的理解、支持与配合。让我们继续猫猫祟祟地，一起记录更多快乐吧！</em>',
            '<div style="text-align: right; margin-top: 16px; color: #666; font-style: italic;">—— 晓飞 谨上</div>'
        ],
        author: '晓飞吖',
        publishTime: '2025-12-31 11:00',
        isPinned: true,
        category: 'system'
    },
    {
        id: 2,
        title: '公告系统上线！',
        content: [
            '为了更好地与大家沟通，我们全新打造了<strong>公告中心</strong>！',
            '<h4>主要功能：</h4>',
            '<strong>• 智能内容展示：</strong>支持长文本自动折叠，点击"展开全文"查看完整内容',
            '<strong>• 富文本格式：</strong>支持<strong>加粗</strong>、<em>斜体</em>、标题分层等多种格式，让公告更易阅读',
            '<strong>• 置顶功能：</strong>重要公告会以⭐星标显示，并自动排在最前面',
            '<strong>• 分类标签：</strong>不同类型的公告有专属颜色标识，一目了然',
            '<strong>• 移动端优化：</strong>完美适配手机和平板，触摸体验流畅',
            '现在就来<strong>公告中心</strong>看看吧！我们会在这里发布重要通知、新功能介绍、活动预告等各种信息。',
            '<em>感谢大家的支持与反馈！让我们一起建设更好的小猫丸子Wiki社区~</em>'
        ],
        author: '晓飞吖',
        publishTime: '2025-12-31 11:00',
        isPinned: false,
        category: 'feature'
    },
])

// 获取公告类型标签
const getCategoryLabel = (category) => {
    const labels = {
        system: '系统通知',
        feature: '新功能',
        update: '功能更新',
        holiday: 'Bug修复'
    }
    return labels[category] || '公告'
}

// 获取公告类型颜色
const getCategoryColor = (category) => {
    const colors = {
        system: '#F56C6C',
        feature: '#67C23A',
        update: '#409EFF',
        holiday: '#E6A23C'
    }
    return colors[category] || '#909399'
}

// 置顶公告排序
const sortedAnnouncements = computed(() => {
    return [...announcements.value].sort((a, b) => {
        // 置顶的公告排在前面
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        // 时间倒序排列（最新的在前）
        return new Date(b.publishTime) - new Date(a.publishTime)
    })
})
</script>

<template>
    <div class="announcement-page">
        <!-- 顶部导航栏 -->
        <Top />

        <div class="content-wrapper">
            <!-- 页面头部 -->
            <div class="page-hero">
                <div class="hero-content">
                    <h1 class="hero-title">公告中心</h1>
                    <p class="hero-subtitle">同步每份动态，与你共赴崭新旅程</p>
                </div>
            </div>

            <!-- 公告列表 -->
            <div class="announcement-section">
                <div class="announcement-list">
                    <div v-for="announcement in sortedAnnouncements" :key="announcement.id" class="announcement-card"
                        :class="{ 'pinned': announcement.isPinned }">

                        <!-- 公告头部 -->
                        <div class="announcement-header">
                            <div class="header-left">
                                <div v-if="announcement.isPinned" class="pinned-badge">
                                    <el-icon>
                                        <Star />
                                    </el-icon>
                                    置顶
                                </div>
                                <el-tag :color="getCategoryColor(announcement.category)" size="small">
                                    {{ getCategoryLabel(announcement.category) }}
                                </el-tag>
                            </div>
                            <div class="header-right">
                                <span class="publish-time">
                                    <el-icon>
                                        <Clock />
                                    </el-icon>
                                    {{ announcement.publishTime }}
                                </span>
                            </div>
                        </div>

                        <!-- 公告标题 -->
                        <h3 class="announcement-title">{{ announcement.title }}</h3>

                        <!-- 公告内容 -->
                        <div class="announcement-content">
                            <!-- 折叠状态显示内容 -->
                            <div v-if="!isExpanded(announcement.id) && shouldCollapse(announcement.content)" class="content-collapsed">
                                <p v-for="(paragraph, index) in getCollapsedContent(announcement.content)" :key="index" class="content-paragraph"
                                   v-html="paragraph">
                                </p>
                                <div class="expand-indicator">
                                    <el-button size="small" type="text" @click="toggleExpanded(announcement.id)" class="expand-btn">
                                        展开全文
                                    </el-button>
                                </div>
                            </div>

                            <!-- 展开状态显示全部内容 -->
                            <div v-else class="content-expanded">
                                <p v-for="(paragraph, index) in announcement.content" :key="index" class="content-paragraph"
                                   v-html="paragraph">
                                </p>
                                <div v-if="shouldCollapse(announcement.content)" class="collapse-indicator">
                                    <el-button size="small" type="text" @click="toggleExpanded(announcement.id)" class="collapse-btn">
                                        收起内容
                                    </el-button>
                                </div>
                            </div>
                        </div>

                        <!-- 公告底部 -->
                        <div class="announcement-footer">
                            <div class="author-info">
                                <el-icon>
                                    <User />
                                </el-icon>
                                <span>{{ announcement.author }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 空状态 -->
                <div v-if="announcements.length === 0" class="empty-state">
                    <el-empty description="暂无公告" :image-size="80">
                        <template #image>
                            <el-icon size="80" class="empty-icon">
                                <Bell />
                            </el-icon>
                        </template>
                    </el-empty>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
:deep(.el-tag.el-tag--primary) {
    --el-tag-text-color: #fff
}

.announcement-page {
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

/* 公告区域 */
.announcement-section {
    background: white;
    border-radius: 12px;
    padding: 30px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.announcement-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
    -webkit-overflow-scrolling: touch;
}

.announcement-card {
    border: 1px solid #e9ecef;
    border-radius: 12px;
    padding: 24px;
    transition: all 0.3s ease;
    position: relative;
    -webkit-tap-highlight-color: rgba(64, 158, 255, 0.1);
}

.announcement-card:hover {
    border-color: #409eff;
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.1);
    transform: translateY(-2px);
}

.announcement-card.pinned {
    border-color: #e6a23c;
    background: linear-gradient(135deg, #fdf6ec 0%, #fdf2f2 100%);
    position: relative;
}

.announcement-card.pinned:hover {
    border-color: #e6a23c;
    box-shadow: 0 4px 12px rgba(230, 162, 60, 0.1);
}

/* 移动端禁用悬停效果 */
@media (max-width: 768px) {
    .announcement-card:hover {
        transform: none;
        box-shadow: none;
    }

    .announcement-card.pinned:hover {
        box-shadow: none;
    }
}

/* 公告头部 */
.announcement-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 10px;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 12px;
}

.pinned-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #e6a23c;
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.header-right {
    display: flex;
    align-items: center;
}

.publish-time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #999;
}

/* 公告标题 */
.announcement-title {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    line-height: 1.4;
}

/* 公告内容 */
.announcement-content {
    color: #666;
    line-height: 1.6;
    margin-bottom: 20px;
}

.content-paragraph {
    margin: 0 0 12px 0;
    line-height: 1.6;
}

.content-paragraph:last-child {
    margin-bottom: 0;
}

.content-paragraph h4 {
    color: #409eff;
    font-size: 16px;
    font-weight: 600;
    margin: 20px 0 12px 0;
    padding-bottom: 8px;
    border-bottom: 2px solid #409eff;
}

.content-paragraph strong {
    color: #333;
    font-weight: 600;
}

.content-paragraph em {
    color: #666;
    font-style: italic;
}

/* 内容折叠相关样式 */
.content-collapsed,
.content-expanded {
    position: relative;
}

.expand-indicator,
.collapse-indicator {
    margin-top: 8px;
    text-align: center;
}


.expand-btn,
.collapse-btn {
    color: #409eff;
    font-size: 14px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: all 0.3s ease;
}

.expand-btn:hover,
.collapse-btn:hover {
    background-color: rgba(64, 158, 255, 0.1);
    color: #66b1ff;
}

/* 公告底部 */
.announcement-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
    flex-wrap: wrap;
    gap: 10px;
}

.author-info {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #999;
}


/* 空状态 */
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

    .hero-subtitle {
        font-size: 1rem;
    }

    .announcement-section {
        padding: 20px;
    }

    .announcement-card {
        padding: 20px;
    }

    .announcement-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .header-right {
        align-self: flex-end;
    }

    .announcement-title {
        font-size: 16px;
    }

    .announcement-content {
        font-size: 14px;
    }

    .content-paragraph {
        margin-bottom: 10px;
        line-height: 1.5;
    }

    .content-paragraph h4 {
        font-size: 15px;
        margin: 16px 0 10px 0;
    }

    .expand-btn,
    .collapse-btn {
        font-size: 13px;
        padding: 3px 6px;
    }

    .announcement-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .pinned-badge {
        font-size: 11px;
        padding: 3px 6px;
    }

    .publish-time {
        font-size: 13px;
    }
}

@media (max-width: 480px) {
    .content-wrapper {
        padding: 10px;
    }

    .page-hero {
        padding: 30px 15px;
        margin-bottom: 20px;
        border-radius: 15px;
    }

    .hero-title {
        font-size: 1.8rem;
        margin-bottom: 8px;
    }

    .hero-subtitle {
        font-size: 0.9rem;
        max-width: 100%;
    }

    .announcement-section {
        padding: 15px;
        border-radius: 8px;
    }

    .announcement-card {
        padding: 16px;
        border-radius: 8px;
        gap: 15px;
    }

    .announcement-header {
        margin-bottom: 12px;
        gap: 6px;
    }

    .header-left {
        flex-direction: row;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .header-right {
        align-self: flex-start;
        margin-top: 4px;
    }

    .announcement-title {
        font-size: 15px;
        margin-bottom: 12px;
        line-height: 1.3;
    }

    .announcement-content {
        font-size: 13px;
        margin-bottom: 16px;
    }

    .content-paragraph {
        margin-bottom: 8px;
        line-height: 1.4;
        font-size: 13px;
    }

    .content-paragraph h4 {
        font-size: 14px;
        margin: 14px 0 8px 0;
    }

    .expand-btn,
    .collapse-btn {
        font-size: 12px;
        padding: 2px 5px;
    }

    .announcement-footer {
        padding-top: 12px;
        gap: 8px;
    }

    .author-info {
        font-size: 13px;
    }

    .pinned-badge {
        font-size: 10px;
        padding: 2px 5px;
        gap: 3px;
    }

    .publish-time {
        font-size: 12px;
        gap: 3px;
    }
}

/* 超小屏幕优化 (≤375px) */
@media (max-width: 375px) {
    .content-wrapper {
        padding: 8px;
    }

    .page-hero {
        padding: 25px 12px;
        margin-bottom: 15px;
    }

    .hero-title {
        font-size: 1.6rem;
    }

    .hero-subtitle {
        font-size: 0.85rem;
    }

    .announcement-section {
        padding: 12px;
    }

    .announcement-card {
        padding: 14px;
    }

    .announcement-title {
        font-size: 14px;
    }

    .announcement-content {
        font-size: 12px;
    }

    .content-paragraph {
        margin-bottom: 6px;
        line-height: 1.3;
        font-size: 12px;
    }

    .content-paragraph h4 {
        font-size: 13px;
        margin: 12px 0 6px 0;
    }

    .expand-btn,
    .collapse-btn {
        font-size: 11px;
        padding: 1px 4px;
    }

    .author-info {
        font-size: 12px;
    }

    .pinned-badge {
        font-size: 9px;
        padding: 1px 4px;
    }

    .publish-time {
        font-size: 11px;
    }
}
</style>
