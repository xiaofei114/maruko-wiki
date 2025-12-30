<script setup>
import { ref, reactive, computed, onBeforeUnmount, onMounted } from 'vue'
import { ElMessageBox, ElMessage, ElLoading } from 'element-plus'
import { UploadFilled, Loading, Warning, VideoPlay } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import Top from '@/components/Top.vue'
import { getAudioList, uploadAudio } from '@/api/audio'

// 音声数据
const audioSections = ref([])
const loading = ref(false)
const error = ref(null)

// 获取音声列表
async function fetchAudioList() {
    try {
        loading.value = true
        error.value = null
        const response = await getAudioList()
        audioSections.value = response.data
    } catch (err) {
        console.error('获取音声列表失败:', err)
        error.value = '获取音声列表失败，请稍后重试'
        ElMessage.error('获取音声列表失败，请稍后重试')
        // 设置默认空数据
        audioSections.value = []
    } finally {
        loading.value = false
    }
}

// 播放状态
const audio = ref(null) // HTMLAudioElement
const currentSectionIndex = ref(-1)
const currentTrackIndex = ref(-1)
const isPlaying = ref(false)
const volume = ref(0.9)
const audioUnlocked = ref(false)

// 地狱绘卷模式
const hellScrollAudios = ref([]) // 存储多个音频实例
const isHellScrollMode = ref(false)

// 用户状态
const userStore = useUserStore()
const { isAuthenticated } = storeToRefs(userStore)

// 控制选项
const loopPlaylist = ref(false)     // 列表循环（到末尾回到开头）
const shuffle = ref(false)          // 随机播放
const brainwash = ref(false)        // 洗脑循环：当前曲目无限循环

// 上传音声相关
const uploadDialogVisible = ref(false)
const uploadRef = ref(null)
const uploadForm = reactive({
    audioFile: null,
    audioName: '',
    audioTag: '',
    newTagName: '' // 保存新标签的原始名称
})

// 音声标签选项（基于现有分类）
const tagOptions = computed(() => {
    const tags = []
    audioSections.value.forEach(section => {
        tags.push({
            label: section.title,
            value: section.id
        })
    })
    return tags
})

// 表单验证规则
const uploadFormRules = {
    audioFile: [
        { required: true, message: '请选择音频文件', trigger: 'change' }
    ],
    audioName: [
        { required: true, message: '请输入音声名称', trigger: 'blur' },
        { min: 1, max: 50, message: '音声名称长度应在1-50个字符', trigger: 'blur' }
    ],
    audioTag: [
        { required: true, message: '请选择或输入音声标签', trigger: 'change' }
    ]
}

// 播放队列（基于 audioSections 展开为扁平索引），用于随机/顺序播放逻辑
const flattened = computed(() => {
    const arr = []
    audioSections.value.forEach((sec, sidx) => {
        sec.items.forEach((it, tidx) => {
            arr.push({ sidx, tidx, name: it.name, url: it.url })
        })
    })
    return arr
})

// 播放器控制函数
function createAudioIfNeeded() {
    if (!audio.value) {
        audio.value = new Audio()
        audio.value.preload = 'auto'
        audio.value.volume = volume.value
        audio.value.addEventListener('ended', onTrackEnded)
    }
}

function unlockAudio() {
    if (audioUnlocked.value) return

    // 创建一个静音音频来解锁音频播放
    const unlockAudio = new Audio()
    unlockAudio.volume = 0.01
    unlockAudio.play().then(() => {
        audioUnlocked.value = true
    }).catch(() => {
        // 忽略错误
    })
}

function playByFlatIndex(flatIndex) {
    if (flatIndex < 0 || flatIndex >= flattened.value.length) return
    // 如果地狱绘卷模式开启，先停止它
    if (isHellScrollMode.value) {
        stopHellScroll()
    }
    const entry = flattened.value[flatIndex]
    currentSectionIndex.value = entry.sidx
    currentTrackIndex.value = entry.tidx
    playCurrent()
}

function playCurrent() {
    const secIdx = currentSectionIndex.value
    const trIdx = currentTrackIndex.value
    if (secIdx < 0 || trIdx < 0 || secIdx >= audioSections.value.length ||
        trIdx >= audioSections.value[secIdx].items.length) return
    const track = audioSections.value[secIdx].items[trIdx]
    createAudioIfNeeded()

    // 将相对路径转换为完整的URL
    const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:6660/api'
    const fullUrl = track.url.startsWith('http') ? track.url : baseUrl + track.url
    audio.value.src = fullUrl
    audio.value.loop = !!brainwash.value // 洗脑模式：当前曲目循环
    audio.value.volume = volume.value
    // 确保音频已解锁
    if (!audioUnlocked.value) {
        unlockAudio()
    }
    audio.value.play().then(() => {
        isPlaying.value = true
    }).catch((error) => {
        console.error('播放失败:', error)
        ElMessage.error('播放失败，请联系管理员')
        // 如果播放失败，尝试解锁音频
        if (!audioUnlocked.value) {
            unlockAudio()
        }
        isPlaying.value = false
    })
}

function playTrack(sectionIdx, trackIdx) {
    // 如果地狱绘卷模式开启，先停止它
    if (isHellScrollMode.value) {
        stopHellScroll()
    }
    // 检查索引是否有效
    if (sectionIdx < 0 || sectionIdx >= audioSections.value.length ||
        trackIdx < 0 || trackIdx >= audioSections.value[sectionIdx].items.length) {
        return
    }
    currentSectionIndex.value = sectionIdx
    currentTrackIndex.value = trackIdx
    playCurrent()
}

function stopPlayback(resetModes = true) {
    // 优先停止地狱绘卷模式
    if (isHellScrollMode.value) {
        stopHellScroll()
    }

    // 停止普通播放器
    if (audio.value) {
        audio.value.pause()
        audio.value.currentTime = 0
        audio.value.loop = false
    }
    isPlaying.value = false

    // 可选择是否重置播放模式
    if (resetModes) {
        loopPlaylist.value = false
        shuffle.value = false
        brainwash.value = false
    }
}

function toggleLoopPlaylist() {
    // 如果地狱绘卷模式开启，不允许切换其他模式
    if (isHellScrollMode.value) return

    // 确保音频已解锁
    if (!audioUnlocked.value) {
        unlockAudio()
    }
    // 开启列表循环模式，关闭其他模式
    loopPlaylist.value = true
    shuffle.value = false
    brainwash.value = false
    if (audio.value) {
        audio.value.loop = false
    }
    // 如果有选中的曲目且正在播放，开始播放
    if (currentSectionIndex.value >= 0 && currentTrackIndex.value >= 0 && isPlaying.value) {
        playCurrent()
    } else {
        // 如果当前没有在播放，自动播放第一首歌曲
        playByFlatIndex(0)
    }
}

function toggleShuffle() {
    // 如果地狱绘卷模式开启，不允许切换其他模式
    if (isHellScrollMode.value) return

    // 确保音频已解锁
    if (!audioUnlocked.value) {
        unlockAudio()
    }
    // 开启随机播放模式，关闭其他模式
    shuffle.value = true
    loopPlaylist.value = false
    brainwash.value = false
    if (audio.value) {
        audio.value.loop = false
    }
    // 如果有选中的曲目且正在播放，开始播放
    if (currentSectionIndex.value >= 0 && currentTrackIndex.value >= 0 && isPlaying.value) {
        playCurrent()
    } else {
        // 如果当前没有在播放，自动播放第一首歌曲
        playByFlatIndex(0)
    }
}

function toggleBrainwash() {
    // 如果地狱绘卷模式开启，不允许切换其他模式
    if (isHellScrollMode.value) return

    // 如果开启了列表循环或随机播放，不允许开启洗脑循环
    if (loopPlaylist.value || shuffle.value) {
        return
    }
    brainwash.value = !brainwash.value
    if (audio.value) {
        audio.value.loop = !!brainwash.value
    }
}

async function startHellScroll() {
    try {
        await ElMessageBox.confirm(
            '⚠️ 警告：地狱绘卷模式将同时播放所有音频并开启洗脑循环！\n\n这可能会导致严重的性能问题和听力损伤。\n\n确定要继续吗？',
            '地狱绘卷警告',
            {
                confirmButtonText: '确定开启',
                cancelButtonText: '取消',
                type: 'warning',
                confirmButtonClass: 'el-button--danger',
            }
        )

        // 停止当前播放
        stopPlayback(true)

        // 确保音频已解锁
        if (!audioUnlocked.value) {
            unlockAudio()
        }

        // 清理之前的音频实例
        hellScrollAudios.value.forEach(audio => {
            audio.pause()
            audio.removeEventListener('ended', onTrackEnded)
        })
        hellScrollAudios.value = []

        // 创建所有音频实例并同时播放
        const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:6660/api'
        flattened.value.forEach(track => {
            const fullUrl = track.url.startsWith('http') ? track.url : baseUrl + track.url
            const audioInstance = new Audio(fullUrl)
            audioInstance.volume = volume.value * 0.3 // 降低音量避免过载
            audioInstance.loop = true // 开启洗脑循环
            audioInstance.preload = 'auto'

            // 添加错误处理
            audioInstance.addEventListener('error', (e) => {
                console.warn(`Failed to load audio: ${track.name}`, e)
            })

            // 尝试播放
            audioInstance.play().catch((error) => {
                console.warn(`Failed to play audio ${track.name}:`, error)
            })

            hellScrollAudios.value.push(audioInstance)
        })

        isHellScrollMode.value = true

    } catch (error) {
        // 用户取消了操作
        console.log('用户取消了地狱绘卷模式')
    }
}

function stopHellScroll() {
    // 停止所有地狱绘卷音频
    hellScrollAudios.value.forEach(audio => {
        audio.pause()
        audio.currentTime = 0
        // 移除所有事件监听器
        audio.removeEventListener('ended', onTrackEnded)
        audio.removeEventListener('error', () => {
        })
        audio.removeEventListener('canplay', () => {
        })
        // 释放音频资源
        audio.src = ''
    })
    hellScrollAudios.value = []
    isHellScrollMode.value = false
}

// 当一首歌播放结束时的逻辑：默认单曲播放，开启对应模式时才继续播放
function onTrackEnded() {
    if (brainwash.value) {
        // 如果洗脑模式已经将 audio.loop 设为 true，浏览器可能不会再触发 ended，但我们保证 behavior
        if (audio.value.loop) return
    }

    // 如果开启了随机播放，继续随机播放下一首
    if (shuffle.value) {
        const flatIndex = flattened.value.findIndex(e => e.sidx === currentSectionIndex.value && e.tidx === currentTrackIndex.value)
        if (flattened.value.length <= 1) return

        let next = flatIndex
        while (next === flatIndex) {
            next = Math.floor(Math.random() * flattened.value.length)
        }
        playByFlatIndex(next)
        return
    }

    // 如果开启了列表循环，继续顺序播放下一首
    if (loopPlaylist.value) {
        const flatIndex = flattened.value.findIndex(e => e.sidx === currentSectionIndex.value && e.tidx === currentTrackIndex.value)
        let nextIndex = flatIndex + 1
        if (nextIndex >= flattened.value.length) nextIndex = 0
        playByFlatIndex(nextIndex)
        return
    }

    // 默认单曲播放：播放完就停止（不重置播放模式）
    stopPlayback(false)
}

// 展示信息
const currentTrackName = computed(() => {
    if (isHellScrollMode.value) return '🔥 地狱绘卷模式'
    if (currentSectionIndex.value < 0 || currentTrackIndex.value < 0 ||
        currentSectionIndex.value >= audioSections.value.length ||
        currentTrackIndex.value >= audioSections.value[currentSectionIndex.value].items.length) return '— 未选择 —'
    const t = audioSections.value[currentSectionIndex.value].items[currentTrackIndex.value]
    return t ? t.name : '— 未选择 —'
})

// 上传音声相关函数
function openUploadDialog() {
    // 如果音频数据还没有加载，先加载数据
    if (audioSections.value.length === 0 && !loading.value) {
        console.log('🎵 上传对话框打开时重新加载音频数据')
        fetchAudioList()
    }

    uploadDialogVisible.value = true
    // 重置表单
    uploadForm.audioFile = null
    uploadForm.audioName = ''
    uploadForm.audioTag = ''
    uploadForm.newTagName = ''
}

function closeUploadDialog() {
    uploadDialogVisible.value = false
}

// 处理文件数量超过限制
function handleFileExceed(files, fileList) {
    ElMessage.warning('只能选择一个音频文件，请先移除当前文件后再选择新的文件')
}

// 处理文件选择
function handleFileChange(file, fileList) {
    // 总是只处理最新的文件，实现自动替换
    if (fileList.length > 0) {
        // 获取当前选择的文件
        const selectedFile = file.raw || file

        // 设置表单数据
        uploadForm.audioFile = selectedFile

        // 如果没有输入名称，使用文件名
        if (!uploadForm.audioName) {
            uploadForm.audioName = selectedFile.name.replace(/\.[^/.]+$/, '')
        }
    } else {
        // 如果没有文件，清空表单
        uploadForm.audioFile = null
        uploadForm.audioName = ''
    }
}

function handleTagSelect(value) {
    console.log('🎵 handleTagSelect 被调用:', { value, currentAudioTag: uploadForm.audioTag })

    if (!value) {
        console.log('🎵 清空选择')
        uploadForm.newTagName = ''
        return
    }

    // 检查是否是新创建的标签
    const existingTag = tagOptions.value.find(tag => tag.value === value)
    console.log('🎵 查找现有标签结果:', existingTag)

    if (!existingTag) {
        // 创建新标签（前端临时创建，实际会在上传时发送到后端）
        console.log('🎵 创建新标签:', value)
        const newTagId = `new_${Date.now()}`
        audioSections.value.push({
            id: newTagId,
            title: value,
            items: []
        })
        uploadForm.audioTag = newTagId
        uploadForm.newTagName = value // 保存原始标签名称
        ElMessage.success(`新标签 "${value}" 已创建`)
    } else {
        // 如果是选择现有标签，清空新标签名称
        console.log('🎵 选择现有标签:', existingTag)
        uploadForm.newTagName = ''
    }
}

// 上传音声文件到服务器
async function uploadAudioFile(formData, file) {
    try {
        // 创建FormData对象
        const uploadData = new FormData()
        uploadData.append('audio', file)

        // 使用用户输入的名称
        uploadData.append('name', formData.audioName)

        // 检查是选择现有分类还是创建新分类
        const isNewTag = formData.audioTag && typeof formData.audioTag === 'string' && formData.audioTag.startsWith('new_')
        if (isNewTag) {
            // 创建新分类，使用保存的原始标签名称
            uploadData.append('new_classification_name', formData.newTagName || formData.audioTag.replace('new_', ''))
        } else if (formData.audioTag) {
            // 使用现有分类
            uploadData.append('classification_id', formData.audioTag)
        } else {
            // 没有选择分类，使用默认分类或抛出错误
            throw new Error('请选择音声分类')
        }

        const response = await uploadAudio(uploadData)
        return {
            success: true,
            message: '上传成功',
            data: {
                id: response.data.audioId,
                name: response.data.name,
                tag: formData.audioTag,
                url: response.data.url
            }
        }
    } catch (error) {
        console.error('上传失败:', error)
        let errorMessage = `文件 "${file.name}" 上传失败`

        if (error.response) {
            const { status, data } = error.response
            switch (status) {
                case 400:
                    errorMessage = data.message || '请求参数错误'
                    break
                case 401:
                    errorMessage = '未认证，请先登录'
                    break
                case 403:
                    errorMessage = 'Token无效或权限不足'
                    break
                case 413:
                    errorMessage = '文件过大，超过5MB限制'
                    break
                case 500:
                    errorMessage = '服务器内部错误'
                    break
                default:
                    errorMessage = `上传失败: ${status}`
            }
        } else if (error.request) {
            errorMessage = '网络错误，请检查网络连接'
        }

        throw new Error(errorMessage)
    }
}

async function handleUpload() {
    try {
        // 表单验证
        if (!uploadForm.audioFile) {
            ElMessage.error('请选择音频文件')
            return
        }
        if (!uploadForm.audioName.trim()) {
            ElMessage.error('请输入音声名称')
            return
        }
        if (!uploadForm.audioTag) {
            ElMessage.error('请选择音声标签')
            return
        }

        // 检查文件
        const allowedTypes = ['audio/mpeg', 'audio/mp3']
        const maxSize = 5 * 1024 * 1024

        if (!allowedTypes.includes(uploadForm.audioFile.type)) {
            ElMessage.error(`文件 "${uploadForm.audioFile.name}" 不是 MP3 格式`)
            return
        }
        if (uploadForm.audioFile.size > maxSize) {
            ElMessage.error(`文件 "${uploadForm.audioFile.name}" 超过 5MB 限制`)
            return
        }

        // 显示上传进度
        const loading = ElLoading.service({
            lock: true,
            text: '正在上传中...',
            background: 'rgba(0, 0, 0, 0.7)'
        })

        try {
            await uploadAudioFile({
                audioName: uploadForm.audioName.trim(),
                audioTag: uploadForm.audioTag,
                newTagName: uploadForm.newTagName
            }, uploadForm.audioFile)

            loading.close()

            ElMessage.success('音声上传成功，等待管理员审核！')
            closeUploadDialog()

            // 上传成功后刷新音声列表
            await fetchAudioList()

            // 清理表单数据
            uploadForm.audioFile = null
            uploadForm.audioName = ''
            uploadForm.newTagName = ''
            if (uploadRef.value) {
                uploadRef.value.clearFiles()
            }
        } catch (error) {
            loading.close()
            ElMessage.error(error.message || '上传过程中发生错误')
        }
    } catch (error) {
        console.log(error);
        ElMessage.error('上传过程中发生错误')
    }
}

// 组件挂载时获取音声列表
onMounted(() => {
    fetchAudioList()
})

// 清理
onBeforeUnmount(() => {
    if (audio.value) {
        audio.value.pause()
        audio.value.removeEventListener('ended', onTrackEnded)
        audio.value = null
    }

    // 清理地狱绘卷音频实例
    stopHellScroll()
})
</script>

<template>
    <div class="audio-page" @click="unlockAudio">
        <Top />
        <div class="container">
            <section class="page-hero">
                <div class="hero-content">
                    <h1 class="hero-title">丸子音声</h1>
                    <p class="hero-subtitle">聆听奇妙回响，与你分享此刻欢愉</p>
                </div>
            </section>

            <div class="controls-card">
                <div class="controls-main">
                    <div class="control-group">
                        <el-button @click="stopPlayback" type="warning" plain>
                            停止播放
                        </el-button>
                        <el-button :type="loopPlaylist ? 'primary' : 'default'" @click="toggleLoopPlaylist"
                            :disabled="isHellScrollMode" plain>
                            列表循环
                        </el-button>
                        <el-button :type="shuffle ? 'primary' : 'default'" @click="toggleShuffle"
                            :disabled="isHellScrollMode" plain>
                            随机播放
                        </el-button>
                        <el-button :type="brainwash ? 'danger' : 'default'" @click="toggleBrainwash"
                            :disabled="isHellScrollMode" plain>
                            洗脑循环: {{ brainwash ? '开' : '关' }}
                        </el-button>
                        <el-button type="danger" @click="startHellScroll" :disabled="isHellScrollMode" plain>
                            🔥 地狱绘卷模式
                        </el-button>
                        <el-button v-if="isAuthenticated" @click="openUploadDialog" type="primary" plain>
                            上传音声
                        </el-button>
                    </div>
                </div>
                <div class="controls-status">
                    <div class="now-playing">
                        当前播放: <strong>{{ currentTrackName }}</strong>
                    </div>
                </div>
            </div>

            <div v-if="loading" class="loading-state">
                <el-icon class="is-loading">
                    <Loading />
                </el-icon>
                <p>正在加载音声列表...</p>
            </div>
            <div v-else-if="error" class="error-state">
                <el-empty description="加载失败" :image-size="80">
                    <template #image>
                        <el-icon size="80" class="error-icon">
                            <Warning />
                        </el-icon>
                    </template>
                    <el-button @click="fetchAudioList" type="primary">重试</el-button>
                </el-empty>
            </div>
            <div v-else-if="audioSections.length === 0" class="empty-state">
                <el-empty description="暂无音声数据" :image-size="80">
                    <template #image>
                        <el-icon size="80" class="empty-icon">
                            <VideoPlay />
                        </el-icon>
                    </template>
                </el-empty>
            </div>
            <div v-else class="sections">
                <div v-for="(section, sidx) in audioSections" :key="section.id" class="section-card">
                    <div class="section-header">
                        <h3>{{ section.title }}</h3>
                        <div class="section-count">{{ section.items.length }} 个</div>
                    </div>
                    <div class="section-body">
                        <div v-for="(item, tidx) in section.items" :key="item.url" class="track-row">
                            <div class="track-info">
                                <el-tag
                                    :type="currentSectionIndex === sidx && currentTrackIndex === tidx ? 'error' : 'primary'"
                                    @click="playTrack(sidx, tidx)" class="audio-tag">
                                    {{ item.name }}
                                </el-tag>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 上传音声对话框 -->
            <el-dialog v-model="uploadDialogVisible" title="上传音声" width="600px" :close-on-click-modal="false">
                <el-form :model="uploadForm" :rules="uploadFormRules" ref="uploadFormRef">
                    <el-form-item label="" prop="audioFile">
                        <el-upload ref="uploadRef" :on-change="handleFileChange" :auto-upload="false"
                            :show-file-list="true" accept="audio/mpeg,audio/mp3" action="" drag :limit="1"
                            :on-exceed="handleFileExceed" style="width: 100%;">
                            <el-icon class="el-icon--upload">
                                <component :is="UploadFilled" />
                            </el-icon>
                            <div class="el-upload__text">
                                将 MP3 文件拖到此处，或 <em>点击选择</em>
                            </div>
                            <template #tip>
                                <div class="el-upload__tip">
                                    只支持 MP3 格式，单个文件大小不超过 5MB
                                </div>
                            </template>
                        </el-upload>
                    </el-form-item>

                    <el-form-item label="音声名称" prop="audioName">
                        <el-input v-model="uploadForm.audioName" placeholder="请输入音声名称" maxlength="50" show-word-limit />
                    </el-form-item>

                    <el-form-item label="音声标签" prop="audioTag">
                        <el-select v-model="uploadForm.audioTag" placeholder="请选择或输入音声标签" style="width: 100%"
                            @change="handleTagSelect" filterable allow-create>
                            <el-option v-for="tag in tagOptions" :key="tag.value" :label="tag.label"
                                :value="tag.value" />
                        </el-select>
                        <div class="tag-tip">
                            💡 输入新标签名称可自动创建新分类
                        </div>
                    </el-form-item>
                </el-form>

                <template #footer>
                    <span class="dialog-footer">
                        <el-button @click="closeUploadDialog">取消</el-button>
                        <el-button type="primary" @click="handleUpload" :loading="false">
                            确定上传
                        </el-button>
                    </span>
                </template>
            </el-dialog>
        </div>
    </div>
</template>

<style scoped>
.audio-page {
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

.audio-tag {
    padding: 8px 12px;
    font-size: 14px;
    cursor: pointer;
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

.header-card h1 {
    color: #7a54ff;
    margin: 0 0 6px 0;
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
    backdrop-filter: blur(10px);
}

.controls-main {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.control-group {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
}

:deep(.el-button+.el-button) {
    margin-left: 0;
}

.controls-status .now-playing {
    color: #666;
    font-size: 15px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
}

.controls-status .now-playing i {
    color: #409eff;
}


.sections {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
}

.section-card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.8);
    transition: all 0.3s ease;
    overflow: hidden;
}

.section-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #f5f7fa;
}

.section-header h3 {
    margin: 0;
    color: #2c3e50;
    font-size: 18px;
    font-weight: 600;
    flex: 1;
}

.section-count {
    background: #f8f9fa;
    color: #6c757d;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.section-body {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.track-row {
    flex: 0 0 auto;
    transition: all 0.2s ease;
}

.track-info {
    text-align: center;
}

/* 动画 */
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

/* 卡片依次出现动画 */
.section-card:nth-child(1) {
    animation: slideInUp 0.6s ease-out 0.1s both;
}

.section-card:nth-child(2) {
    animation: slideInUp 0.6s ease-out 0.2s both;
}

.section-card:nth-child(3) {
    animation: slideInUp 0.6s ease-out 0.3s both;
}

.section-card:nth-child(4) {
    animation: slideInUp 0.6s ease-out 0.4s both;
}

@keyframes slideInUp {
    from {
        opacity: 0;
        transform: translateY(40px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}


/* 响应式 */

@media (max-width: 768px) {
    .container {
        padding: 15px;
    }

    .page-hero {
        padding: 40px 20px;
        margin-bottom: 20px;
    }

    .hero-title {
        font-size: 2.5rem;
    }

    .controls-card {
        padding: 16px 20px;
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
    }

    .controls-main {
        justify-content: center;
    }

    .controls-status .now-playing {
        text-align: center;
        justify-content: center;
    }

    .sections {
        grid-template-columns: 1fr;
        gap: 16px;
    }

    .section-card {
        padding: 16px;
    }

    .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
}

/* 上传对话框样式 */

.tag-tip {
    margin-top: 6px;
    font-size: 12px;
    color: #909399;
    display: flex;
    align-items: center;
    gap: 4px;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

:deep(.el-upload__tip) {
    margin-top: 8px;
    color: #909399;
    font-size: 12px;
}
</style>
