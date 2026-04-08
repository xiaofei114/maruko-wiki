<script setup>
import { ref, reactive, computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { ElMessageBox, ElMessage, ElLoading } from 'element-plus'
import { UploadFilled, Warning, VideoPlay, Download, TrendCharts } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { getAudioList, uploadAudio, matchAudiosByAI, downloadAudios, recordAudioPlay, getWeeklyPopularAudios, getTotalPopularAudios } from '@/api/audio'
import PageHero from '@/components/ComponentStyle/PageHero.vue'

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
const audioPlayPromise = ref(null) // 追踪当前播放 Promise，用于取消
const currentSectionIndex = ref(-1)
const currentTrackIndex = ref(-1)
const isPlaying = ref(false)
const volume = ref(0.9)
const audioUnlocked = ref(false)
const backgroundAudios = ref([]) // 存储后台音频实例（当不自动停止时使用）

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
const autoStopOnSwitch = ref(true)  // 切换音频时自动停止当前播放，默认开启

// 上传音声相关
const uploadDialogVisible = ref(false)
const uploadRef = ref(null)
const uploadForm = reactive({
    audioFile: null,
    audioName: '',
    audioTag: '',
    newTagName: '' // 保存新标签的原始名称
})

// AI音频匹配相关
const aiMatchDialogVisible = ref(false)
const aiMatchLoading = ref(false)
const aiMatchForm = reactive({
    description: ''
})
const aiMatchResults = ref([])
const aiMatchMessage = ref('')
const aiMatchReason = ref('') // AI匹配原因
const aiMatchReasonDisplay = ref('') // 用于打字机效果的显示文本
const isTypingReason = ref(false) // 是否正在打字
const aiAutoPlayIndex = ref(-1) // AI自动播放的当前索引
const isAiAutoPlaying = ref(false) // 是否正在AI自动播放模式

// 最热音声相关
const hotAudioSortType = ref('week') // 'week' | 'total'
const hotAudioLimit = ref(10)
const hotAudioList = ref([])
const hotAudioLoading = ref(false)

// 获取最热音声列表
async function fetchHotAudios() {
    try {
        hotAudioLoading.value = true
        let response
        if (hotAudioSortType.value === 'week') {
            response = await getWeeklyPopularAudios(hotAudioLimit.value)
        } else {
            response = await getTotalPopularAudios(hotAudioLimit.value)
        }
        
        if (response.data && response.data.audios) {
            hotAudioList.value = response.data.audios.map((item, index) => ({
                id: item.id,
                name: item.name,
                url: item.url,
                tagName: item.classification?.name || '未知分类',
                classificationId: item.classification?.id,
                playCount: hotAudioSortType.value === 'week' ? (item.weeklyPlays || 0) : (item.totalPlayCount || 0)
            }))
        } else {
            hotAudioList.value = []
        }
    } catch (err) {
        console.error('获取热门音频失败:', err)
        hotAudioList.value = []
    } finally {
        hotAudioLoading.value = false
    }
}

// 监听排序类型和数量变化，自动重新获取
watch([hotAudioSortType, hotAudioLimit], () => {
    fetchHotAudios()
}, { immediate: true })

// 格式化播放量数字
function formatCount(count) {
    if (count >= 10000) {
        return (count / 10000).toFixed(1) + '万'
    }
    return count.toString()
}

// 播放最热音声
async function playHotAudio(item) {
    // 根据分类ID找到对应的section
    const sectionIndex = audioSections.value.findIndex(s => s.id === item.classificationId)
    if (sectionIndex === -1) {
        // 如果本地没有该分类，直接播放URL
        playByUrl(item.url, item.name)
        // 记录播放量
        try {
            await recordAudioPlay(item.id)
        } catch (e) {
            // 忽略记录失败
        }
        return
    }
    
    const trackIndex = audioSections.value[sectionIndex].items.findIndex(
        t => (t.id || t.audioId) === item.id
    )
    if (trackIndex === -1) {
        // 如果本地列表中没有该音频，直接播放URL
        playByUrl(item.url, item.name)
        // 记录播放量
        try {
            await recordAudioPlay(item.id)
        } catch (e) {
            // 忽略记录失败
        }
        return
    }
    
    currentSectionIndex.value = sectionIndex
    currentTrackIndex.value = trackIndex
    playCurrent()
}

// 通过URL直接播放
function playByUrl(url, name) {
    createAudioIfNeeded()
    
    const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:6660/api'
    const fullUrl = url.startsWith('http') ? url : baseUrl + url
    
    if (autoStopOnSwitch.value) {
        audio.value.pause()
        audio.value.currentTime = 0
        isPlaying.value = false
        
        audio.value.src = fullUrl
        audio.value.loop = !!brainwash.value
        audio.value.volume = volume.value
        
        if (!audioUnlocked.value) {
            unlockAudio()
        }
        
        // 设置当前播放信息
        currentSectionIndex.value = -1
        currentTrackIndex.value = -1
        
        audio.value.play().then(() => {
            isPlaying.value = true
        }).catch((error) => {
            console.error('播放失败:', error)
            ElMessage.error('播放失败，请联系管理员')
            isPlaying.value = false
        })
    } else {
        // 不自动停止模式：创建新音频实例
        const newAudio = new Audio(fullUrl)
        newAudio.volume = volume.value
        newAudio.loop = !!brainwash.value
        backgroundAudios.value.push(newAudio)
        
        if (!audioUnlocked.value) {
            unlockAudio()
        }
        
        newAudio.play().catch((error) => {
            console.error('后台播放失败:', error)
        })
    }
}

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

// AI匹配表单验证规则
const aiMatchFormRules = {
    description: [
        { required: true, message: '请输入音频描述', trigger: 'blur' },
        { min: 1, max: 500, message: '描述长度应在1-500个字符', trigger: 'blur' }
    ]
}

// 播放队列（基于 audioSections 展开为扁平索引），用于随机/顺序播放逻辑
const flattened = computed(() => {
    const arr = []
    audioSections.value.forEach((sec, sidx) => {
        sec.items.forEach((it, tidx) => {
            arr.push({
                sidx,
                tidx,
                id: it.id || it.audioId || tidx.toString(), // 尝试多种可能的id字段名
                name: it.name,
                url: it.url
            })
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

async function playCurrent() {
    const secIdx = currentSectionIndex.value
    const trIdx = currentTrackIndex.value
    if (secIdx < 0 || trIdx < 0 || secIdx >= audioSections.value.length ||
        trIdx >= audioSections.value[secIdx].items.length) return
    const track = audioSections.value[secIdx].items[trIdx]
    createAudioIfNeeded()

    // 将相对路径转换为完整的URL
    const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:6660/api'
    const fullUrl = track.url.startsWith('http') ? track.url : baseUrl + track.url

    // 记录播放量
    const audioId = track.id || track.audioId
    if (audioId) {
        try {
            await recordAudioPlay(audioId)
        } catch (e) {
            // 忽略记录失败
        }
    }

    if (autoStopOnSwitch.value) {
        // 自动停止模式：停止当前播放并播放新音频
        audio.value.pause()
        audio.value.currentTime = 0
        isPlaying.value = false

        audio.value.src = fullUrl
        audio.value.loop = !!brainwash.value // 洗脑模式：当前曲目循环
        audio.value.volume = volume.value
        // 确保音频已解锁
        if (!audioUnlocked.value) {
            unlockAudio()
        }
        audioPlayPromise.value = audio.value.play()
        audioPlayPromise.value.then(() => {
            isPlaying.value = true
        }).catch((error) => {
            // 忽略 AbortError，只在非中止错误时提示
            if (error.name !== 'AbortError') {
                console.error('播放失败:', error)
                ElMessage.error('播放失败，请联系管理员')
            }
            isPlaying.value = false
        })
    } else {
        // 不自动停止模式：让当前音频继续播放，新音频作为后台音频
        const backgroundAudio = new Audio(fullUrl)
        backgroundAudio.volume = volume.value
        backgroundAudio.loop = !!brainwash.value // 洗脑循环：后台音频也参与循环
        backgroundAudio.preload = 'auto'

        // 添加播放结束时的清理逻辑
        backgroundAudio.addEventListener('ended', () => {
            const index = backgroundAudios.value.indexOf(backgroundAudio)
            if (index > -1) {
                backgroundAudios.value.splice(index, 1)
            }
        })

        // 尝试播放后台音频
        backgroundAudio.play().catch((error) => {
            console.error('后台音频播放失败:', error)
        })

        // 存储后台音频实例以便管理
        backgroundAudios.value.push(backgroundAudio)
    }
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

function stopPlayback(resetModes = true, keepAiAutoPlay = false) {
    // 优先停止地狱绘卷模式
    if (isHellScrollMode.value) {
        stopHellScroll()
    }

    // 停止AI自动播放（除非明确要求保持）
    if (isAiAutoPlaying.value && !keepAiAutoPlay) {
        stopAiAutoPlay()
    }

    // 停止普通播放器
    if (audio.value) {
        audio.value.pause()
        audio.value.currentTime = 0
        audio.value.loop = false
    }
    audioPlayPromise.value = null
    isPlaying.value = false

    // 停止所有后台音频
    backgroundAudios.value.forEach(bgAudio => {
        bgAudio.pause()
        bgAudio.currentTime = 0
    })
    backgroundAudios.value = []

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

    // 更新主音频的循环状态
    if (audio.value) {
        audio.value.loop = !!brainwash.value
    }

    // 更新所有后台音频的循环状态
    backgroundAudios.value.forEach(bgAudio => {
        bgAudio.loop = !!brainwash.value
    })
}

function toggleAutoStopOnSwitch() {
    // 如果地狱绘卷模式开启，不允许切换其他模式
    if (isHellScrollMode.value) return

    autoStopOnSwitch.value = !autoStopOnSwitch.value
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

    // 如果正在AI自动播放模式，继续播放下一个
    if (isAiAutoPlaying.value) {
        aiAutoPlayIndex.value++
        playAiAutoPlayCurrent()
        return
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
    if (isAiAutoPlaying.value) {
        const audioId = aiMatchResults.value[aiAutoPlayIndex.value]
        return `AI播放中: ${getAudioNameById(audioId)} (${aiAutoPlayIndex.value + 1}/${aiMatchResults.value.length})`
    }
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

// ============================================================================
// AI音频匹配相关函数
// ============================================================================

/**
 * 打字机效果显示AI匹配原因
 */
function startTypingReason() {
    aiMatchReasonDisplay.value = ''
    isTypingReason.value = true

    const fullText = aiMatchReason.value
    let currentIndex = 0

    const typeInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
            aiMatchReasonDisplay.value += fullText[currentIndex]
            currentIndex++
        } else {
            clearInterval(typeInterval)
            isTypingReason.value = false
        }
    }, 50) // 每个字符50ms
}

/**
 * AI自动顺序播放匹配的音频
 */
function startAiAutoPlay() {
    if (aiMatchResults.value.length === 0) return

    isAiAutoPlaying.value = true
    aiAutoPlayIndex.value = 0

    // 停止当前播放，但不停止AI自动播放
    stopPlayback(false, true)

    // 开始播放第一个匹配的音频
    playAiAutoPlayCurrent()
}

// 播放AI自动播放队列中的当前音频
function playAiAutoPlayCurrent() {
    if (!isAiAutoPlaying.value || aiAutoPlayIndex.value >= aiMatchResults.value.length) {
        // 播放完毕
        stopAiAutoPlay()
        return
    }

    const audioId = aiMatchResults.value[aiAutoPlayIndex.value]
    const audioIndex = flattened.value.findIndex(item => item.id == audioId)

    if (audioIndex >= 0) {
        // 使用现有的播放逻辑，但设置特殊的回调
        const entry = flattened.value[audioIndex]
        currentSectionIndex.value = entry.sidx
        currentTrackIndex.value = entry.tidx

        createAudioIfNeeded()

        const baseUrl = import.meta.env.VITE_APP_BASE_URL || 'http://localhost:6660/api'
        const fullUrl = entry.url.startsWith('http') ? entry.url : baseUrl + entry.url

        audio.value.src = fullUrl
        audio.value.loop = false // AI自动播放不循环
        audio.value.volume = volume.value

        if (!audioUnlocked.value) {
            unlockAudio()
        }

        audio.value.play().then(() => {
            isPlaying.value = true
        }).catch((error) => {
            // 忽略 AbortError
            if (error.name !== 'AbortError') {
                console.error('AI自动播放失败:', error)
            }
            // 播放失败时继续下一个
            aiAutoPlayIndex.value++
            playAiAutoPlayCurrent()
        })
    } else {
        // 找不到音频，继续下一个
        aiAutoPlayIndex.value++
        playAiAutoPlayCurrent()
    }
}

// 停止AI自动播放
function stopAiAutoPlay() {
    isAiAutoPlaying.value = false
    aiAutoPlayIndex.value = -1
}

// AI音频匹配相关函数
function openAIMatchDialog() {
    aiMatchDialogVisible.value = true
    // 重置表单
    aiMatchForm.description = ''
    aiMatchResults.value = []
    aiMatchMessage.value = ''
}

function closeAIMatchDialog() {
    aiMatchDialogVisible.value = false
    // 停止AI自动播放
    if (isAiAutoPlaying.value) {
        stopAiAutoPlay()
    }
    // 清理状态
    aiMatchResults.value = []
    aiMatchMessage.value = ''
    aiMatchReason.value = ''
    aiMatchReasonDisplay.value = ''
    isTypingReason.value = false
}

async function handleAIMatch() {
    try {
        // 表单验证
        if (!aiMatchForm.description.trim()) {
            ElMessage.error('请输入音频描述')
            return
        }

        if (aiMatchForm.description.length > 500) {
            ElMessage.error('描述长度不能超过500字符')
            return
        }

        aiMatchLoading.value = true
        aiMatchResults.value = []
        aiMatchMessage.value = ''

        const response = await matchAudiosByAI(aiMatchForm.description.trim())

        if (response.code === 200) {
            aiMatchResults.value = response.data.matched_audios || []
            aiMatchMessage.value = response.data.message || `找到 ${response.data.count || 0} 个匹配的音频`
            aiMatchReason.value = response.data.reason || ''

            if (aiMatchResults.value.length === 0) {
                ElMessage.info('未找到匹配的音频，请尝试其他描述')
            } else {
                ElMessage.success(`成功匹配到 ${aiMatchResults.value.length} 个音频！`)
                // 启动打字机效果显示reason
                if (aiMatchReason.value) {
                    startTypingReason()
                }
                // 启动自动顺序播放
                startAiAutoPlay()
            }
        } else {
            ElMessage.error(response.message || '匹配失败，请稍后重试')
        }
    } catch (error) {
        console.error('AI匹配失败:', error)
        let errorMessage = '匹配过程中发生错误'

        if (error.response) {
            const { status, data } = error.response
            switch (status) {
                case 400:
                    errorMessage = data.message || '请求参数错误'
                    break
                case 402:
                    errorMessage = 'AI服务余额不足'
                    break
                case 429:
                    errorMessage = '请求过于频繁，请稍后再试'
                    break
                case 500:
                    errorMessage = '服务器内部错误'
                    break
                case 503:
                    errorMessage = 'AI服务暂时不可用'
                    break
                default:
                    errorMessage = `匹配失败: ${status}`
            }
        } else if (error.request) {
            errorMessage = '网络错误，请检查网络连接'
        }

        ElMessage.error(errorMessage)
        aiMatchResults.value = []
        aiMatchMessage.value = ''
    } finally {
        aiMatchLoading.value = false
    }
}

function getAudioNameById(audioId) {
    // 从flattened数组中找到对应的音频
    // 优先通过id字段匹配
    const audio = flattened.value.find(item => {
        return item.id == audioId
    })
    // 如果找到，返回音频名称；否则返回ID
    return audio ? audio.name : `音频 ${audioId}`
}

function playMatchedAudio(audioId) {
    // 找到对应的音频在flattened数组中的索引
    // 通过id字段匹配
    const audioIndex = flattened.value.findIndex(item => item.id == audioId)

    if (audioIndex >= 0) {
        playByFlatIndex(audioIndex)
        ElMessage.success(`开始播放: ${getAudioNameById(audioId)}`)
    } else {
        ElMessage.warning(`未找到音频文件: ${audioId}`)
    }
}

// 监听音量变化，同步更新所有活跃音频
watch(volume, (newVolume) => {
    // 更新主音频音量
    if (audio.value) {
        audio.value.volume = newVolume
    }
    // 更新所有后台音频音量
    backgroundAudios.value.forEach(bgAudio => {
        bgAudio.volume = newVolume
    })
    // 更新地狱绘卷音频音量（如果在播放）
    if (isHellScrollMode.value) {
        hellScrollAudios.value.forEach(hellAudio => {
            hellAudio.volume = newVolume * 0.3 // 保持地狱绘卷的音量比例
        })
    }
})

// 组件挂载时获取音声列表
onMounted(() => {
    fetchAudioList()
})

// 下载全部音声
async function downloadAllAudios() {
    try {
        await ElMessageBox.confirm(
            `确定要下载所有 ${flattened.value.length} 个音声吗？`,
            '下载全部音声确认',
            {
                confirmButtonText: '确定下载',
                cancelButtonText: '取消',
                type: 'warning',
            }
        )

        // 调用封装的API，直接触发浏览器下载
        downloadAudios(null);

        ElMessage.success(`正在下载全部 ${flattened.value.length} 个音声...`)
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('下载失败，请稍后重试');
        }
        // 用户取消下载
    }
}

// 按标签下载音声
async function downloadAudiosByTag(section) {
    try {
        await ElMessageBox.confirm(
            `确定要下载标签 "${section.title}" 的所有 ${section.items.length} 个音声吗？`,
            '下载标签音声确认',
            {
                confirmButtonText: '确定下载',
                cancelButtonText: '取消',
                type: 'info',
            }
        )

        // 调用封装的API，直接触发浏览器下载
        downloadAudios(section.id);

        ElMessage.success(`正在下载标签 "${section.title}" 的所有音声...`)
    } catch (error) {
        if (error !== 'cancel') {
            ElMessage.error('下载失败，请稍后重试');
        }
        // 用户取消下载
    }
}

// 清理
onBeforeUnmount(() => {
    if (audio.value) {
        audio.value.pause()
        audio.value.removeEventListener('ended', onTrackEnded)
        audio.value = null
    }

    // 清理所有后台音频实例
    backgroundAudios.value.forEach(bgAudio => {
        bgAudio.pause()
        bgAudio.removeEventListener('ended', () => { })
    })
    backgroundAudios.value = []

    // 清理地狱绘卷音频实例
    stopHellScroll()
})
</script>

<template>
    <div class="audio-page" @click="unlockAudio">
        <div class="container">
            <PageHero title="丸子音声" subtitle="聆听奇妙回响，与你分享此刻欢愉" />

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
                        <el-button :type="autoStopOnSwitch ? 'success' : 'default'" @click="toggleAutoStopOnSwitch"
                            :disabled="isHellScrollMode" plain>
                            切换时停止: {{ autoStopOnSwitch ? '开' : '关' }}
                        </el-button>
                        <el-button type="danger" @click="startHellScroll" :disabled="isHellScrollMode" plain>
                            🔥 地狱绘卷模式
                        </el-button>
                        <el-button @click="openAIMatchDialog" type="info" plain>
                            AI智能匹配
                        </el-button>
                        <el-button v-if="isAuthenticated" @click="downloadAllAudios" type="success" plain>
                            下载音声
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

            <div class="controls-card hot-audio-card">
                <div class="hot-audio-header">
                    <h3 class="hot-audio-title">
                        <el-icon><TrendCharts /></el-icon>
                        最热音声
                    </h3>
                    <div class="hot-audio-controls">
                        <el-radio-group v-model="hotAudioSortType" size="small">
                            <el-radio-button label="week">本周播放</el-radio-button>
                            <el-radio-button label="total">总播放量</el-radio-button>
                        </el-radio-group>
                        <el-select v-model="hotAudioLimit" size="small" style="width: 80px; margin-left: 12px;">
                            <el-option label="10条" :value="10" />
                            <el-option label="20条" :value="20" />
                            <el-option label="30条" :value="30" />
                            <el-option label="40条" :value="40" />
                            <el-option label="50条" :value="50" />
                        </el-select>
                    </div>
                </div>
                <el-scrollbar class="hot-audio-scrollbar" max-height="320px">
                    <div class="hot-audio-grid">
                        <div 
                            v-for="(item, index) in hotAudioList" 
                            :key="item.id" 
                            class="hot-audio-item"
                            @click="playHotAudio(item)"
                        >
                            <span class="hot-audio-rank" :class="{ 'top-three': index < 3 }">{{ index + 1 }}</span>
                            <div class="hot-audio-info">
                                <span class="hot-audio-name" :title="item.name">{{ item.name }}</span>
                                <span class="hot-audio-tag">{{ item.tagName }}</span>
                            </div>
                            <span class="hot-audio-count">
                                <el-icon><VideoPlay /></el-icon>
                                {{ formatCount(item.playCount) }}
                            </span>
                        </div>
                    </div>
                    <el-empty v-if="hotAudioList.length === 0" description="暂无数据" :image-size="60" />
                </el-scrollbar>
            </div>

            <div v-if="loading" class="loading-container">
                <div class="loading-spinner"></div>
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
                        <div class="section-actions">
                            <div class="section-count">{{ section.items.length }} 个</div>
                            <el-button v-if="isAuthenticated" @click="downloadAudiosByTag(section)" type="primary"
                                size="small" plain>
                                <el-icon>
                                    <Download />
                                </el-icon>
                            </el-button>
                        </div>
                    </div>
                    <div class="section-body">
                        <div v-for="(item, tidx) in section.items" :key="item.url" class="track-row">
                            <div class="track-info">
                                <el-button
                                    :type="currentSectionIndex === sidx && currentTrackIndex === tidx ? 'danger' : 'primary'"
                                    @click="playTrack(sidx, tidx)" class="audio-tag" plain round>
                                    {{ item.name }}
                                </el-button>
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

            <!-- AI音频匹配对话框 -->
            <el-dialog v-model="aiMatchDialogVisible" title="AI智能音频匹配" width="700px" :close-on-click-modal="false">
                <div class="ai-match-intro">
                    <p>描述你想要的音频类型，AI将智能匹配最适合的音频文件</p>
                    <p class="ai-match-tip">💡 例如：笨蛋小猫，奇妙小动静等</p>
                </div>

                <el-form :model="aiMatchForm" :rules="aiMatchFormRules" ref="aiMatchFormRef">
                    <el-form-item label="" prop="description">
                        <el-input v-model="aiMatchForm.description" type="textarea" :rows="4"
                            placeholder="请描述你想要的音频类型、风格或用途..." maxlength="500" show-word-limit resize="none" />
                    </el-form-item>
                </el-form>

                <!-- 匹配结果显示 -->
                <div v-if="aiMatchResults.length > 0">
                    <!-- AI匹配原因 -->
                    <div v-if="aiMatchReason" class="ai-reason-section">
                        <div class="reason-header">
                            <span class="reason-title">AI分析结果</span>
                            <span v-if="isTypingReason" class="typing-indicator">
                                <span class="typing-dot">.</span>
                                <span class="typing-dot">.</span>
                                <span class="typing-dot">.</span>
                            </span>
                        </div>
                        <div class="reason-content">
                            {{ aiMatchReasonDisplay }}
                            <span v-if="isTypingReason" class="cursor">|</span>
                        </div>
                    </div>

                    <div class="matched-audios">
                        <div v-for="audioId in aiMatchResults" :key="audioId" class="matched-audio-item">
                            <el-button @click="playMatchedAudio(audioId)" type="success" plain round>
                                {{ getAudioNameById(audioId) }}
                            </el-button>
                        </div>
                    </div>
                </div>

                <template #footer>
                    <span class="dialog-footer">
                        <el-button @click="closeAIMatchDialog">取消</el-button>
                        <el-button type="primary" @click="handleAIMatch" :loading="aiMatchLoading"
                            :disabled="!aiMatchForm.description.trim()">
                            开始匹配
                        </el-button>
                    </span>
                </template>
            </el-dialog>
        </div>
    </div>
</template>

<style scoped>
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 50px 20px;
    text-align: center;
    margin-bottom: 22px;
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
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.audio-page {
    min-height: 100vh;
    background: #f5f7fa;
}

.container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px 20px 40px;
}

.audio-tag {
    padding: 8px 12px;
    font-size: 14px;
    cursor: pointer;
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
    color: var(--color-primary);
}


.sections {
    column-count: 3;
    column-gap: 20px;
    column-rule: 1px solid rgba(0, 0, 0, 0.05);
}

.section-card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.8);
    transition: all 0.3s ease;
    overflow: hidden;
    break-inside: avoid;
    page-break-inside: avoid;
    margin-bottom: 20px;
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

.section-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.section-count {
    background: #f8f9fa;
    color: #6c757d;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

/* 最热音声栏样式 */
.hot-audio-card {
    flex-direction: column;
    align-items: stretch;
    padding: 20px 24px;
}

.hot-audio-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #f5f7fa;
}

.hot-audio-title {
    margin: 0;
    color: #2c3e50;
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
}

.hot-audio-title .el-icon {
    color: #e6a23c;
    font-size: 20px;
}

.hot-audio-controls {
    display: flex;
    align-items: center;
}

.hot-audio-scrollbar {
    width: 100%;
}

.hot-audio-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding-right: 8px;
}

.hot-audio-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #f8f9fa;
    min-width: 0;
}

.hot-audio-item:hover {
    background: #ecf5ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.hot-audio-rank {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-weight: 600;
    font-size: 12px;
    color: #606266;
    background: #e4e7ed;
    flex-shrink: 0;
}

.hot-audio-rank.top-three {
    background: linear-gradient(135deg, #ffd700, #ffaa00);
    color: white;
}

.hot-audio-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    overflow: hidden;
}

.hot-audio-name {
    font-size: 13px;
    color: #303133;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.hot-audio-tag {
    font-size: 11px;
    color: #909399;
    background: #f4f4f5;
    padding: 1px 6px;
    border-radius: 4px;
    align-self: flex-start;
}

.hot-audio-count {
    font-size: 12px;
    color: #606266;
    display: flex;
    align-items: center;
    gap: 3px;
    flex-shrink: 0;
}

.hot-audio-count .el-icon {
    color: var(--color-primary);
    font-size: 12px;
}

/* 响应式：平板显示2列 */
@media (max-width: 1200px) {
    .hot-audio-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* 响应式：手机显示1列 */
@media (max-width: 768px) {
    .hot-audio-grid {
        grid-template-columns: 1fr;
    }
    
    .hot-audio-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
    }
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
        column-count: 1;
        column-gap: 16px;
        column-rule: 1px solid rgba(0, 0, 0, 0.03);
    }

    .section-card {
        padding: 16px;
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
}

/* 平板端列数设置 */
@media (min-width: 769px) and (max-width: 1200px) {
    .sections {
        column-count: 2;
        column-gap: 18px;
    }
}

@media (max-width: 480px) {
    .page-hero {
        padding: 30px 15px;
        margin-bottom: 20px;
    }

    .hero-title {
        font-size: 2.2rem;
    }
}

@media (max-width: 375px) {
    .page-hero {
        padding: 25px 12px;
        margin-bottom: 15px;
    }

    .hero-title {
        font-size: 1.8rem;
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

/* AI匹配对话框样式 */
.ai-match-intro {
    margin-bottom: 20px;
    padding: 16px;
    background: linear-gradient(135deg, #f0f8ff 0%, #e6f3ff 100%);
    border-radius: 12px;
    border-left: 4px solid var(--color-primary);
}

.ai-match-intro p {
    margin: 0 0 8px 0;
    color: #2c3e50;
    font-weight: 500;
}

.ai-match-tip {
    color: #666;
    font-size: 14px;
    margin: 0 !important;
}

.ai-match-results {
    margin-top: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 12px;
    border: 1px solid #e9ecef;
}

.results-header h4 {
    margin: 0 0 16px 0;
    color: #2c3e50;
    font-size: 16px;
    font-weight: 600;
}

.matched-audios {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.matched-audio-item {
    flex: 0 0 auto;
}

/* AI匹配原因样式 */
.ai-reason-section {
    margin-top: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%);
    border-radius: 12px;
    border: 1px solid #bae7ff;
    position: relative;
    margin-bottom: 15px;
}

.reason-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.ai-icon {
    font-size: 18px;
    animation: aiPulse 2s infinite;
}

.reason-title {
    font-weight: 600;
    color: #1890ff;
    font-size: 14px;
}

.typing-indicator {
    margin-left: auto;
    display: flex;
    gap: 2px;
}

.typing-dot {
    width: 4px;
    height: 4px;
    background: #1890ff;
    border-radius: 50%;
    animation: typingBounce 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(1) {
    animation-delay: -0.32s;
}

.typing-dot:nth-child(2) {
    animation-delay: -0.16s;
}

.typing-dot:nth-child(3) {
    animation-delay: 0s;
}

.reason-content {
    color: #2c3e50;
    line-height: 1.6;
    font-size: 14px;
    min-height: 20px;
    position: relative;
}

.cursor {
    animation: blink 1s infinite;
    color: #1890ff;
    font-weight: bold;
}

/* 动画 */
@keyframes aiPulse {

    0%,
    100% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.1);
        opacity: 0.8;
    }
}

@keyframes typingBounce {

    0%,
    80%,
    100% {
        transform: scale(0);
        opacity: 0.5;
    }

    40% {
        transform: scale(1);
        opacity: 1;
    }
}

@keyframes blink {

    0%,
    50% {
        opacity: 1;
    }

    51%,
    100% {
        opacity: 0;
    }
}
</style>
