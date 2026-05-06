<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getRoomInfo, getMasterInfo, getTopListNew, getLiveDuration } from '@/api/bilibiliApis.js'
import { Check, CircleCheckFilled, Present, UserFilled, Timer, Loading, Lock, Switch, Picture, Headset, Document, VideoPlay, VideoPause, ArrowRight, Download } from '@element-plus/icons-vue'
import { getAnchorStats, getCurrentMonthMaxCaptainCount } from '@/api/anchorStats.js'
import { getCurrentMonthGifts } from '@/api/captainGift.js'
import { getHomeModules } from '@/api/homeModules.js'
import DocxPreview from '@/components/ComponentStyle/DocxPreview.vue'

const router = useRouter()

// 响应式数据
const loading = ref(true)
const error = ref(null)
const anchorName = ref(import.meta.env.VITE_APP_HOST_NAME) // 可以在这里修改为主播名字
const defaultAvatar = ref("")
const roomInfo = ref({})
const captain = ref(0)
const requiredEffectiveDays = 22 // 每月需要的有效天数
const userId = import.meta.env.VITE_APP_USER_ID;
const roomId = import.meta.env.VITE_APP_ROOM_ID;
const nickName = import.meta.env.VITE_APP_NICK_NAME;

// 定时器引用
const roomInfoInterval = ref(null)

// 计算本月总直播时长（精确到分钟）
const liveHours = computed(() => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-based

  // 本月开始和结束时间戳
  const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0).getTime()
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime()

  let totalMinutes = 0

  // 使用 currentMonthLiveRecords 计算，不受弹窗切换月份影响
  currentMonthLiveRecords.value.forEach(session => {
    // 处理正在直播的情况（endTime为null）
    const sessionEndTime = session.endTime || Date.now()

    // 计算该直播在本月内的实际时间段
    // 取直播时间段和本月时间段的交集
    const effectiveStartTime = Math.max(session.startTime, monthStart)
    const effectiveEndTime = Math.min(sessionEndTime, monthEnd)

    // 如果直播在本月内有有效时间段
    if (effectiveStartTime < effectiveEndTime) {
      let duration = Math.floor((effectiveEndTime - effectiveStartTime) / (1000 * 60))

      // 如果不计算跨日直播，需要进一步处理
      if (liveHoursMode.value === 'sameDay') {
        const startDate = new Date(effectiveStartTime)
        const endDate = new Date(effectiveEndTime)

        // 判断是否跨日（日期不同）
        if (startDate.getDate() !== endDate.getDate()) {
          // 只计算到当天 23:59:59 的时长
          const endOfStartDay = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
            23, 59, 59
          ).getTime()
          duration = Math.floor((Math.min(endOfStartDay, effectiveEndTime) - effectiveStartTime) / (1000 * 60))
        }
      }

      totalMinutes += duration
    }
  })

  // 转换为小时（保留两位小数，精确到分钟）
  return Math.round(totalMinutes / 60 * 100) / 100
})

// 图表配置
const chartOption = computed(() => {
  const dates = statsData.value.map(item => item.date)
  
  // 粉丝详细：显示粉丝数和粉丝团成员数两条折线
  if (statsType.value === 'fans') {
    const fansValues = statsData.value.map(item => item.fansCount)
    const fansMemberValues = statsData.value.map(item => item.fansMemberCount)
    
    return {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const item = statsData.value[params[0].dataIndex]
          let html = `<div style="padding: 5px;"><div style="font-weight: bold; margin-bottom: 5px;">${params[0].name}</div>`
          params.forEach(param => {
            html += `<div style="color: ${param.color};">${param.seriesName}：${param.value.toLocaleString()}</div>`
          })
          html += '</div>'
          return html
        }
      },
      legend: {
        data: ['粉丝数', '粉丝团成员'],
        top: '2%'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          rotate: 45,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: function(value) {
            if (value >= 10000) {
              return (value / 10000).toFixed(1) + 'w'
            }
            return value
          }
        }
      },
      series: [
        {
          name: '粉丝数',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#409EFF',
            width: 3
          },
          itemStyle: {
            color: '#409EFF'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#409EFF40' },
                { offset: 1, color: '#409EFF05' }
              ]
            }
          },
          data: fansValues
        },
        {
          name: '粉丝团成员',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#67C23A',
            width: 3
          },
          itemStyle: {
            color: '#67C23A'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#67C23A40' },
                { offset: 1, color: '#67C23A05' }
              ]
            }
          },
          data: fansMemberValues
        }
      ]
    }
  }
  
  // 舰长详细：根据显示模式决定展示总数或详细
  const commanderValues = statsData.value.map(item => item.commanderCount)
  const viceCommanderValues = statsData.value.map(item => item.viceCommanderCount)
  const captainValues = statsData.value.map(item => item.captainCount)
  // 总数 = 总督 + 提督 + 舰长
  const totalValues = statsData.value.map(item => 
    (item.commanderCount || 0) + (item.viceCommanderCount || 0) + (item.captainCount || 0)
  )
  
  // 总数模式：只显示一条总数折线
  if (captainDisplayMode.value === 'total') {
    return {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const data = params[0]
          return `
            <div style="padding: 5px;">
              <div style="font-weight: bold; margin-bottom: 5px;">${data.name}</div>
              <div>大航海总数：${data.value.toLocaleString()}</div>
            </div>
          `
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLabel: {
          rotate: 45,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: function(value) {
            if (value >= 10000) {
              return (value / 10000).toFixed(1) + 'w'
            }
            return value
          }
        }
      },
      series: [
        {
          name: '大航海总数',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            color: '#E6A23C',
            width: 3
          },
          itemStyle: {
            color: '#E6A23C'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#E6A23C40' },
                { offset: 1, color: '#E6A23C05' }
              ]
            }
          },
          data: totalValues
        }
      ]
    }
  }
  
  // 详细模式：显示总督、提督、舰长三条折线
  return {
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const item = statsData.value[params[0].dataIndex]
        let html = `<div style="padding: 5px;"><div style="font-weight: bold; margin-bottom: 5px;">${params[0].name}</div>`
        params.forEach(param => {
          html += `<div style="color: ${param.color};">${param.seriesName}：${param.value.toLocaleString()}</div>`
        })
        html += '</div>'
        return html
      }
    },
    legend: {
      data: ['总督', '提督', '舰长'],
      top: '2%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        rotate: 45,
        fontSize: 11
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: function(value) {
          if (value >= 10000) {
            return (value / 10000).toFixed(1) + 'w'
          }
          return value
        }
      }
    },
    series: [
      {
        name: '总督',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#F56C6C',
          width: 3
        },
        itemStyle: {
          color: '#F56C6C'
        },
        data: commanderValues
      },
      {
        name: '提督',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#E6A23C',
          width: 3
        },
        itemStyle: {
          color: '#E6A23C'
        },
        data: viceCommanderValues
      },
      {
        name: '舰长',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          color: '#409EFF',
          width: 3
        },
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#409EFF40' },
              { offset: 1, color: '#409EFF05' }
            ]
          }
        },
        data: captainValues
      }
    ]
  }
})

// 直播详情弹窗相关
const showLiveDetailDialog = ref(false)
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const selectedDate = ref(null)
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const calendarDays = ref([])

// 主播统计数据弹窗相关
const showStatsDetailDialog = ref(false)
const statsType = ref('fans') // 'fans' 或 'captain'
const statsTimeRange = ref('month') // 'week', 'month', 'year'
const statsData = ref([])
const statsLoading = ref(false)
const captainDisplayMode = ref('total') // 'total'(总数) 或 'detail'(详细)

// 舰礼相关
const captainGifts = ref([]) // 当月舰礼列表
const maxCaptainCount = ref(0) // 当月最高舰长数
const showGiftsSection = computed(() => captainGifts.value.length > 0) // 是否有舰礼
const showGiftsDetailDialog = ref(false) // 舰礼详情弹窗

// 功能模块数据
const latestPhoto = ref(null) // 最新照片
const hotAudio = ref(null) // 本周最热音声
const currentPlan = ref(null) // 当前企划
const hotVideo = ref(null) // 本周最热视频

// 音频播放相关
const audioPlayer = ref(null)
const isPlayingAudio = ref(false)
const currentAudioUrl = ref('')

// 企划详情弹窗
const planDialogVisible = ref(false)
const planDetail = ref(null)
const planPreviewKey = ref(0)
const planPreviewError = ref('')

// 获取完整图片URL
function getFullImageUrl(relativeUrl) {
  if (!relativeUrl) return ''
  if (relativeUrl.startsWith('http')) return relativeUrl
  if (relativeUrl.startsWith('/api/')) {
    const serverUrl = import.meta.env.VITE_APP_BASE_URL?.replace('/api', '')
    return serverUrl + relativeUrl
  }
  const baseUrl = import.meta.env.VITE_APP_BASE_URL
  return baseUrl + relativeUrl
}

// 获取企划文档预览URL（与PlanDocument组件保持一致）
function getPlanPreviewUrl(filePath) {
  console.log(filePath);
  
  if (!filePath) return ''
  const baseUrl = import.meta.env.VITE_APP_BASE_URL
  // 企划文档路径需要加上 api/file 前缀
  console.log(`${baseUrl}/api/file/${filePath}`);
  
  return `${baseUrl}/api/file/${filePath}`
}

// 播放音声
function playAudio(audio) {
  if (!audio) return
  
  const audioUrl = getFullImageUrl(audio.cover)
  
  // 如果点击的是当前正在播放的音频，则暂停
  if (currentAudioUrl.value === audioUrl && isPlayingAudio.value) {
    audioPlayer.value?.pause()
    isPlayingAudio.value = false
    return
  }
  
  // 播放新音频
  currentAudioUrl.value = audioUrl
  isPlayingAudio.value = true
  
  // 使用 nextTick 确保音频元素已更新
  nextTick(() => {
    if (audioPlayer.value) {
      audioPlayer.value.play().catch(err => {
        console.error('音频播放失败:', err)
        isPlayingAudio.value = false
      })
    }
  })
}

// 查看企划详情
function viewPlanDetail(plan) {
  if (!plan) return
  planDetail.value = plan
  planPreviewKey.value += 1
  planPreviewError.value = ''
  planDialogVisible.value = true
  // 弹窗打开后强制重新渲染预览组件
  nextTick(() => {
    planPreviewKey.value += 1
  })
}

// 企划文档预览错误
function onPlanPreviewError(payload) {
  const detail = payload?.message ? `（${payload.message}）` : ''
  planPreviewError.value = `当前文档暂不支持在线预览，请下载后查看${detail}`
  console.error('企划文档预览失败:', detail)
}

// 下载企划文档
async function downloadPlanDocument(doc) {
  if (!doc || !doc.filePath) return
  
  try {
    const baseUrl = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : (import.meta.env.VITE_APP_BASE_URL?.replace(/\/api\/?$/, '') || '')
    const apiPrefix = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : '/api'
    // 企划文档路径需要加上 file 前缀
    const url = `${baseUrl}${apiPrefix}/file/${doc.filePath}`
    
    // 使用 fetch 获取文件 blob，这样才能正确设置文件名
    const token = localStorage.getItem(import.meta.env.VITE_APP_TOKEN)
    const headers = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(url, { headers })
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`)
    }
    
    const blob = await response.blob()
    const blobUrl = window.URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = doc.fileName || 'document.docx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 释放 blob URL
    window.URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('下载失败:', error)
    // 如果 fetch 失败，回退到直接打开链接
    const baseUrl = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : (import.meta.env.VITE_APP_BASE_URL?.replace(/\/api\/?$/, '') || '')
    const apiPrefix = import.meta.env.VITE_APP_BASE_URL === '/api' ? '' : '/api'
    const url = `${baseUrl}${apiPrefix}/all/file/${doc.filePath}`
    window.open(url, '_blank')
  }
}

// 舰礼进度条计数方式：'max'(本月最高舰长数，默认) 或 'current'(当前舰长数)
const giftProgressMode = ref('max')

// 当前进度条使用的舰长数（根据计数方式切换）
const progressCaptainCount = computed(() => {
  return giftProgressMode.value === 'max' ? maxCaptainCount.value : captain.value
})

// 礼物类型标签
const giftTypeLabels = {
  1: '舰长礼物',
  2: '提督礼物',
  3: '总督礼物'
}

const giftTypeColors = {
  1: '#409eff',
  2: '#e6a23c',
  3: '#f56c6c'
}

// 按礼物类型分组的舰礼
const groupedGifts = computed(() => {
  const groups = { 1: [], 2: [], 3: [] }
  captainGifts.value.forEach(gift => {
    const type = parseInt(gift.giftType) || 1
    if (groups[type]) {
      groups[type].push(gift)
    }
  })
  // 每个组内按 requiredFansCount 排序
  Object.keys(groups).forEach(key => {
    groups[key].sort((a, b) => {
      if (a.requiredFansCount === 0) return -1
      if (b.requiredFansCount === 0) return 1
      return a.requiredFansCount - b.requiredFansCount
    })
  })
  return groups
})

// 按目标舰长数排序的舰礼列表（基础舰礼排在最前面）- 只包含显示进度条的舰礼
const sortedGifts = computed(() => {
  return [...captainGifts.value]
    .filter(gift => parseInt(gift.showProgress) !== 0) // 只显示需要显示进度条的
    .sort((a, b) => {
      // 基础舰礼（requiredFansCount === 0）排在最前面
      if (a.requiredFansCount === 0) return -1
      if (b.requiredFansCount === 0) return 1
      return a.requiredFansCount - b.requiredFansCount
    })
    .map((gift, index) => ({ ...gift, index })) // 添加索引
})

// 按位置分组的舰礼（用于进度条显示）
const groupedGiftsByPosition = computed(() => {
  const groups = {}
  sortedGifts.value.forEach(gift => {
    const position = getStagePosition(gift)
    if (!groups[position]) {
      groups[position] = []
    }
    groups[position].push(gift)
  })
  return groups
})

// 最大目标舰长数（用于计算进度条位置）
const maxTargetCount = computed(() => {
  if (sortedGifts.value.length === 0) return 0
  const max = sortedGifts.value[sortedGifts.value.length - 1].requiredFansCount
  return Math.max(max, progressCaptainCount.value)
})

// 总体进度百分比
const overallProgress = computed(() => {
  if (maxTargetCount.value === 0) return 0
  return Math.min(100, Math.round((progressCaptainCount.value / maxTargetCount.value) * 100))
})

// 判断舰礼是否已解锁
const isGiftUnlocked = (gift) => {
  return gift.requiredFansCount === 0 || progressCaptainCount.value >= gift.requiredFansCount
}

// 判断是否是当前阶段（已解锁的最后一个或下一个目标）
const isCurrentStage = (gift) => {
  if (isGiftUnlocked(gift)) return false
  // 找到第一个未解锁的
  const firstUnlockedIndex = sortedGifts.value.findIndex(g => !isGiftUnlocked(g))
  const currentIndex = sortedGifts.value.findIndex(g => g.id === gift.id)
  return currentIndex === firstUnlockedIndex
}

// 获取阶段在进度条上的位置
const getStagePosition = (gift) => {
  if (maxTargetCount.value === 0) return 0
  if (gift.requiredFansCount === 0) return 0
  return Math.min(100, Math.round((gift.requiredFansCount / maxTargetCount.value) * 100))
}

// 判断是否是下一个目标（第一个未解锁的）
const isNextTarget = (gift) => {
  const firstUnlocked = sortedGifts.value.find(g => !isGiftUnlocked(g))
  return firstUnlocked && firstUnlocked.id === gift.id
}

// 下一个目标舰礼
const nextTargetGift = computed(() => {
  return sortedGifts.value.find(g => !isGiftUnlocked(g))
})

// 当前步骤索引（用于 Step 步骤条）
const currentStepIndex = computed(() => {
  const index = sortedGifts.value.findIndex(g => !isGiftUnlocked(g))
  return index === -1 ? sortedGifts.value.length : index
})

// 获取单个舰礼的进度百分比
const getGiftProgress = (gift) => {
  if (gift.requiredFansCount === 0) return 100
  if (progressCaptainCount.value >= gift.requiredFansCount) return 100
  return Math.round((progressCaptainCount.value / gift.requiredFansCount) * 100)
}

// 获取舰礼日期状态（用于样式）
const getGiftDateStatus = (startDate, endDate) => {
  if (!startDate && !endDate) return 'whole_month'
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  let start = null
  if (startDate) {
    start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
  }
  
  let end = null
  if (endDate) {
    end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
  }
  
  if (end && today > end) {
    return 'expired' // 已过期
  } else if (start && today < start) {
    return 'upcoming' // 未开始
  } else {
    return 'active' // 进行中
  }
}

// 获取舰礼日期状态样式类名
const getGiftDateStatusClass = (startDate, endDate) => {
  const status = getGiftDateStatus(startDate, endDate)
  return `gift-date-${status}`
}

// 获取舰礼日期状态文本
const getGiftDateStatusText = (startDate, endDate) => {
  const status = getGiftDateStatus(startDate, endDate)
  const statusMap = {
    'whole_month': '整月',
    'expired': '已结束',
    'upcoming': '即将开始',
    'active': '进行中'
  }
  return statusMap[status] || '限时'
}

// 格式化舰礼日期范围显示
const formatGiftDateRange = (startDate, endDate) => {
  if (!startDate && !endDate) return '整月有效'
  
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  
  // 提取日期中的日
  let startDay = ''
  let endDay = ''
  
  if (startDate) {
    const parts = startDate.split('-')
    startDay = parts[2] || ''
  }
  
  if (endDate) {
    const parts = endDate.split('-')
    endDay = parts[2] || ''
  }
  
  if (startDay && endDay) {
    return `${startDay}日-${endDay}日`
  } else if (startDay) {
    return `${startDay}日起`
  } else if (endDay) {
    return `至${endDay}日`
  }
  
  return '限时'
}

// 计算直播时长（分钟）
const calculateSessionDuration = (startTime, endTime) => {
  // 处理时间戳格式（毫秒）
  if (typeof startTime === 'number' && typeof endTime === 'number') {
    return Math.floor((endTime - startTime) / (1000 * 60))
  }
  
  // 处理字符串格式（HH:MM）
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  let duration = (endHour - startHour) * 60 + (endMin - startMin)
  // 处理跨天的情况
  if (duration < 0) {
    duration += 24 * 60
  }
  return duration
}

// 将时间戳转换为日期对象
const timestampToDate = (timestamp) => {
  return new Date(timestamp)
}

// 将时间戳转换为时间字符串（HH:MM）
const timestampToTimeString = (timestamp) => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 直播记录数据（从API获取）
const liveRecords = ref([])
const liveRecordsLoading = ref(false)

// 当前月直播记录数据（用于liveHours计算，不受弹窗切换月份影响）
const currentMonthLiveRecords = ref([])

// 直播时长计算模式：'all'(全算，默认) 或 'sameDay'(不计算跨日直播)
const liveHoursMode = ref('all')

// 获取直播记录数据
const fetchLiveRecords = async (month) => {
  liveRecordsLoading.value = true
  try {
    const res = await getLiveDuration(month)
    if (res.code === 200) {
      liveRecords.value = res.data || []
    } else {
      console.error('获取直播记录失败:', res.message)
      liveRecords.value = []
    }
  } catch (error) {
    console.error('获取直播记录失败:', error)
    liveRecords.value = []
  } finally {
    liveRecordsLoading.value = false
  }
}

// 获取指定日期的直播数据
const generateFakeLiveData = (year, month, day) => {
  // 从API数据中获取指定日期的直播场次
  const sessions = liveRecords.value.filter(session => {
    // 处理正在直播的情况（endTime为null）
    const endTime = session.endTime || Date.now()
    const startDate = timestampToDate(session.startTime)
    const endDate = timestampToDate(endTime)
    const currentDate = new Date(year, month - 1, day)
    const currentDateStart = new Date(year, month - 1, day, 0, 0, 0).getTime()
    const currentDateEnd = new Date(year, month - 1, day, 23, 59, 59).getTime()
    
    // 检查当天是否在直播时间段内（包括开播当天、结束当天和中间的所有天）
    // 直播在当天有内容当且仅当：直播开始时间 <= 当天结束时间 且 直播结束时间 >= 当天开始时间
    const isLiveOnCurrentDay = session.startTime <= currentDateEnd && endTime >= currentDateStart
    
    return isLiveOnCurrentDay
  })
  
  // 计算当天总直播时长（小时）
  let totalHours = 0
  sessions.forEach(session => {
    // 处理正在直播的情况（endTime为null）
    const endTime = session.endTime || Date.now()
    const startDate = timestampToDate(session.startTime)
    const endDate = timestampToDate(endTime)
    const currentDate = new Date(year, month - 1, day)
    
    // 判断当天在直播中的位置
    const isStartDay = startDate.getFullYear() === currentDate.getFullYear() &&
                       startDate.getMonth() === currentDate.getMonth() &&
                       startDate.getDate() === currentDate.getDate()
    const isEndDay = endDate.getFullYear() === currentDate.getFullYear() &&
                     endDate.getMonth() === currentDate.getMonth() &&
                     endDate.getDate() === currentDate.getDate()
    
    if (isStartDay && isEndDay) {
      // 同一天直播：计算完整时长
      const duration = calculateSessionDuration(session.startTime, endTime)
      totalHours += duration / 60
    } else if (isStartDay) {
      // 开播当天：从开播时间到24:00
      const minutesToMidnight = (24 - startDate.getHours()) * 60 - startDate.getMinutes()
      totalHours += minutesToMidnight / 60
    } else if (isEndDay) {
      // 结束当天：从00:00到结束时间
      const minutesFromMidnight = endDate.getHours() * 60 + endDate.getMinutes()
      totalHours += minutesFromMidnight / 60
    } else {
      // 中间天：全天24小时
      totalHours += 24
    }
  })
  
  // 判断是否为有效天：当天只要有一场直播超过2小时就算有效天
  let isEffective = false
  if (sessions.length > 0) {
    for (const session of sessions) {
      // 处理正在直播的情况（endTime为null）
      const endTime = session.endTime || Date.now()
      const startDate = timestampToDate(session.startTime)
      const endDate = timestampToDate(endTime)
      const currentDate = new Date(year, month - 1, day)
      
      // 判断当天在直播中的位置
      const isStartDay = startDate.getFullYear() === currentDate.getFullYear() &&
                         startDate.getMonth() === currentDate.getMonth() &&
                         startDate.getDate() === currentDate.getDate()
      const isEndDay = endDate.getFullYear() === currentDate.getFullYear() &&
                       endDate.getMonth() === currentDate.getMonth() &&
                       endDate.getDate() === currentDate.getDate()
      
      let dayDuration = 0
      if (isStartDay && isEndDay) {
        // 同一天直播：计算完整时长
        dayDuration = calculateSessionDuration(session.startTime, endTime)
      } else if (isStartDay) {
        // 开播当天：从开播时间到24:00
        dayDuration = (24 - startDate.getHours()) * 60 - startDate.getMinutes()
      } else if (isEndDay) {
        // 结束当天：从00:00到结束时间
        dayDuration = endDate.getHours() * 60 + endDate.getMinutes()
      } else {
        // 中间天：全天24小时
        dayDuration = 24 * 60
      }
      
      // 如果当天直播时长超过2小时（120分钟），则为有效天
      if (dayDuration >= 120) {
        isEffective = true
        break
      }
    }
  }
  
  // 转换时间戳为时间字符串，便于显示
  const formattedSessions = sessions.map(session => {
    // 处理正在直播的情况（endTime为null）
    const endTime = session.endTime || Date.now()
    const startDate = timestampToDate(session.startTime)
    const endDate = timestampToDate(endTime)
    const currentDate = new Date(year, month - 1, day)
    
    // 判断当天在直播中的位置
    const isStartDay = startDate.getFullYear() === currentDate.getFullYear() &&
                       startDate.getMonth() === currentDate.getMonth() &&
                       startDate.getDate() === currentDate.getDate()
    const isEndDay = endDate.getFullYear() === currentDate.getFullYear() &&
                     endDate.getMonth() === currentDate.getMonth() &&
                     endDate.getDate() === currentDate.getDate()
    
    let startTimeStr = timestampToTimeString(session.startTime)
    let endTimeStr = session.endTime ? timestampToTimeString(session.endTime) : '直播中'
    
    // 为跨天直播添加标注
    if (isStartDay && !isEndDay) {
      // 开播当天（跨天）：显示实际开播时间，下播时间标注接后一天
      endTimeStr = '24:00（接后一天）'
    } else if (!isStartDay && isEndDay) {
      // 结束当天：标注接前一天
      startTimeStr = '00:00（接前一天）'
    } else if (!isStartDay && !isEndDay) {
      // 中间天：标注全天跨天
      startTimeStr = '00:00（接前一天）'
      endTimeStr = '24:00（接后一天）'
    }
    
    return {
      startTime: startTimeStr,
      endTime: endTimeStr,
      title: session.title
    }
  })
  
  return { 
    hours: totalHours, 
    isEffective,
    sessions: formattedSessions
  }
}

// 计算本月总时长
const calculateMonthTotal = () => {
  let totalHours = 0
  calendarDays.value.forEach(day => {
    if (day.month === currentMonth.value) {
      totalHours += day.liveHours
    }
  })
  return totalHours
}

// 获取显示用的月份总时长（当前月使用liveHours，其他月使用calculateMonthTotal）
const getDisplayMonthTotal = () => {
  const now = new Date()
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() + 1

  // 如果查看的是当前月，使用liveHours（支持模式切换）
  if (currentYear.value === nowYear && currentMonth.value === nowMonth) {
    return liveHours.value
  }

  // 其他月份使用原来的计算方式
  return calculateMonthTotal()
}

// 计算本月有效天数
const calculateEffectiveDays = () => {
  let effectiveDays = 0
  calendarDays.value.forEach(day => {
    if (day.month === currentMonth.value && day.isEffective) {
      effectiveDays++
    }
  })
  return effectiveDays
}

// 计算跨天直播在指定日期的时长
const calculateCrossDayLiveHours = (sessions, year, month, day) => {
  let totalMinutes = 0
  
  sessions.forEach(session => {
    const [startHour, startMin] = session.startTime.split(':').map(Number)
    const [endHour, endMin] = session.endTime.split(':').map(Number)
    
    // 判断是否为跨天直播
    const isCrossDay = endHour < startHour || (endHour === startHour && endMin < startMin)
    
    if (isCrossDay) {
      // 跨天直播：计算当天的时间（从开播到24:00）
      const minutesToMidnight = (24 - startHour) * 60 - startMin
      totalMinutes += minutesToMidnight
    } else {
      // 非跨天直播：计算完整时长
      const duration = (endHour - startHour) * 60 + (endMin - startMin)
      totalMinutes += duration
    }
  })
  
  return totalMinutes / 60
}

// 格式化直播时长（用于显示）
const formatSessionDuration = (startTime, endTime) => {
  // 提取实际时间（去掉标注）
  const extractTime = (timeStr) => {
    if (timeStr.includes('（')) {
      return timeStr.split('（')[0]
    }
    return timeStr
  }
  
  const actualStartTime = extractTime(startTime)
  const actualEndTime = extractTime(endTime)
  
  // 处理正在直播的情况
  if (endTime === '直播中') {
    // 从时间字符串计算到当前时间的时长
    const [startHour, startMin] = actualStartTime.split(':').map(Number)
    const now = new Date()
    const currentHour = now.getHours()
    const currentMin = now.getMinutes()
    
    let durationMinutes = (currentHour - startHour) * 60 + (currentMin - startMin)
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60
    }
    
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    
    if (hours > 0 && minutes > 0) {
      return `${hours}小时${minutes}分钟（进行中）`
    } else if (hours > 0) {
      return `${hours}小时（进行中）`
    } else {
      return `${minutes}分钟（进行中）`
    }
  }
  
  // 处理24:00特殊情况
  let durationMinutes
  if (actualEndTime === '24:00') {
    const [startHour, startMin] = actualStartTime.split(':').map(Number)
    durationMinutes = (24 - startHour) * 60 - startMin
  } else {
    durationMinutes = calculateSessionDuration(actualStartTime, actualEndTime)
  }
  
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  
  if (hours > 0 && minutes > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时`
  } else {
    return `${minutes}分钟`
  }
}

// 计算还差多少有效天
const calculateRemainingEffectiveDays = () => {
  const effectiveDays = calculateEffectiveDays()
  return Math.max(0, requiredEffectiveDays - effectiveDays)
}

// 生成日历数据
const generateCalendar = () => {
  const days = []
  const firstDay = new Date(currentYear.value, currentMonth.value - 1, 1)
  const lastDay = new Date(currentYear.value, currentMonth.value, 0)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  // 生成日历数据
  for (let i = 0; i < 42; i++) { // 6行7列
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + i)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    
    // 获取当天的直播数据（包括跨天直播）
    const dayData = generateFakeLiveData(year, month, day)
    
    // 判断是否为有效天
    const isEffective = dayData.isEffective
    
    // 计算当天实际直播时长
    let liveHours = dayData.hours
    
    days.push({
      day: day,
      month: month,
      year: year,
      isOtherMonth: month !== currentMonth.value,
      isCurrentDay: day === new Date().getDate() && 
                    date.getMonth() === new Date().getMonth() && 
                    year === new Date().getFullYear(),
      liveHours: liveHours,
      isEffective: isEffective,
      liveSessions: dayData.sessions
    })
  }
  
  calendarDays.value = days
}

// 格式化直播时间
const formatLiveTime = (hours) => {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h${m}m`
}

// 切换月份
const changeMonth = async (delta) => {
  currentMonth.value += delta
  if (currentMonth.value > 12) {
    currentMonth.value = 1
    currentYear.value++
  } else if (currentMonth.value < 1) {
    currentMonth.value = 12
    currentYear.value--
  }
  // 获取新月份的直播记录
  const monthStr = `${currentYear.value}-${String(currentMonth.value).padStart(2, '0')}`
  await fetchLiveRecords(monthStr)
  generateCalendar()
  selectedDate.value = null
}

// 选择日期
const selectDate = (day) => {
  selectedDate.value = day
}

// 上一次的数据（用于比较变化）
const prevAttention = ref(null)
const prevCaptain = ref(null)

// 飘动动画数据
const attentionChange = ref({ show: false, value: 0, type: '' })
const captainChange = ref({ show: false, value: 0, type: '' })

// 获取直播状态文本
const getStatusText = (status) => {
  const statusMap = {
    0: '未开播',
    1: '直播中',
    2: '轮播中'
  }
  return statusMap[status] || '未知状态'
}

// 将小时转换为"xx小时xx分钟"格式
const formatHoursToHM = (hours) => {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0 && m > 0) {
    return `${h}小时${m}分钟`
  } else if (h > 0) {
    return `${h}小时`
  } else {
    return `${m}分钟`
  }
}

// 格式化数字（添加千位分隔符）
const formatNumber = (num) => {
  if (!num && num !== 0) return '---'
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 切换直播时长计算模式
const toggleLiveHoursMode = () => {
  liveHoursMode.value = liveHoursMode.value === 'all' ? 'sameDay' : 'all'
}

const goTo = (url, isRoute) => {
  if (isRoute) router.push(url)
  else window.open(url, '_blank')
}

// 打开B站视频
function openBilibiliVideo(bvid) {
  window.open(`https://www.bilibili.com/video/${bvid}`, '_blank')
}

// 显示飘动动画
const showFloatAnimation = (changeRef, diff) => {
  changeRef.value = {
    show: true,
    value: Math.abs(diff),
    type: diff > 0 ? 'increase' : 'decrease'
  }
  setTimeout(() => {
    changeRef.value.show = false
  }, 1000)
}

// 获取直播间信息
const fetchRoomInfo = async (firstTime = false) => {
  const res = await getRoomInfo()
  const captainInfo = await getTopListNew()

  if (res.code === 200) {
    const newAttention = res.data.attention
    const newCaptain = captainInfo.data.info.num

    // 非第一次获取时，检查变化并显示动画
    if (!firstTime) {
      if (prevAttention.value !== null && newAttention !== prevAttention.value) {
        const diff = newAttention - prevAttention.value
        showFloatAnimation(attentionChange, diff)
      }
      if (prevCaptain.value !== null && newCaptain !== prevCaptain.value) {
        const diff = newCaptain - prevCaptain.value
        showFloatAnimation(captainChange, diff)
      }
    }

    // 更新数据
    roomInfo.value = res.data
    captain.value = newCaptain
    prevAttention.value = newAttention
    prevCaptain.value = newCaptain

  } else {
    error.value = res.message || res.msg || '获取直播间信息失败'
  }
}

const getUserInfo = async (firstTime = false) => {
  loading.value = true
  const userInfo = await getMasterInfo()
  defaultAvatar.value = userInfo.data.info.face
  await fetchRoomInfo(firstTime)
  loading.value = false
}

// 打开统计数据详情弹窗
const openStatsDetail = async (type) => {
  statsType.value = type
  statsTimeRange.value = 'month'
  showStatsDetailDialog.value = true
  await fetchStatsData()
  
  // 如果是舰长详细，获取舰礼信息
  if (type === 'captain') {
    await fetchCaptainGifts()
  }
}

// 获取舰礼信息
const fetchCaptainGifts = async () => {
  try {
    const res = await getCurrentMonthGifts()
    if (res.code === 200) {
      captainGifts.value = res.data.gifts || []
    } else {
      captainGifts.value = []
    }
  } catch (error) {
    console.error('获取舰礼信息失败:', error)
    captainGifts.value = []
  }
}

// 获取统计数据
const fetchStatsData = async () => {
  statsLoading.value = true
  try {
    const res = await getAnchorStats(statsTimeRange.value)
    if (res.code === 200) {
      statsData.value = res.data.data || []
    } else {
      statsData.value = []
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    statsData.value = []
  } finally {
    statsLoading.value = false
  }
}

// 获取本月最高舰长数
const fetchCurrentMonthMaxCaptainCount = async () => {
  try {
    const res = await getCurrentMonthMaxCaptainCount()
    if (res.code === 200 && res.data) {
      maxCaptainCount.value = res.data.maxCaptainCount || 0
    }
  } catch (error) {
    console.error('获取本月最高舰长数失败:', error)
  }
}

// 切换时间范围
const changeStatsTimeRange = async (range) => {
  statsTimeRange.value = range
  await fetchStatsData()
}

// 获取功能模块数据（聚合接口）
const fetchHomeModules = async () => {
  try {
    const response = await getHomeModules()
    if (response.code === 200 && response.data) {
      const data = response.data
      
      // 最新相片
      if (data.photo) {
        latestPhoto.value = {
          url: data.photo.url,
          title: data.photo.title
        }
      }
      
      // 本周最热音声
      if (data.audio) {
        hotAudio.value = {
          cover: data.audio.cover,
          title: data.audio.title
        }
      }
      
      // 当前企划
      if (data.plan) {
        currentPlan.value = {
          id: data.plan.id,
          title: data.plan.title,
          filePath: data.plan.filePath,
          fileName: data.plan.fileName
        }
      }
      
      // 本周最热视频
      if (data.video) {
        hotVideo.value = {
          cover: data.video.cover,
          title: data.video.title,
          bvid: data.video.bvid
        }
      }
    }
  } catch (error) {
    console.error('获取首页模块数据失败:', error)
  }
}

// 组件挂载后获取直播间信息
onMounted(async () => {
  // 获取当前月份的直播记录
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  await fetchLiveRecords(monthStr)
  // 同时保存到 currentMonthLiveRecords，用于 liveHours 计算
  currentMonthLiveRecords.value = [...liveRecords.value]

  //每分钟获取一次
  roomInfoInterval.value = setInterval(fetchRoomInfo, 60000)
  await getUserInfo(true)

  // 获取本月最高舰长数
  await fetchCurrentMonthMaxCaptainCount()

  // 获取舰礼信息（需要在 getUserInfo 之后，因为要用到 captain 值）
  await fetchCaptainGifts()

  // 获取功能模块数据
  await fetchHomeModules()

  generateCalendar()
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (roomInfoInterval.value) {
    clearInterval(roomInfoInterval.value)
    roomInfoInterval.value = null
  }
})
</script>

<template>
  <div class="live-room-page">
    <div class="body">
      <!-- 主播信息卡片 -->
      <div class="anchor-card">
        <div class="avatar-section">
          <div class="avatar">
            <img :src="defaultAvatar" alt="主播头像">
          </div>
          <div class="anchor-basic">
            <h2 class="anchor-name">{{ anchorName }}</h2>
            <p class="anchor-id">房间号: {{ roomInfo.short_id || roomInfo.room_id || '---' }}</p>
          </div>
        </div>
        <el-button type="primary" plain
          @click="goTo(`https://space.bilibili.com/${userId}`, false)">进入主页</el-button>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="loading-spinner"></div>
        <p>正在加载直播间信息...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-container">
        <h3>加载失败</h3>
        <p>{{ error }}</p>
        <button @click="fetchRoomInfo" class="retry-btn">重试</button>
      </div>

      <!-- 主要内容 -->
      <div v-else class="main-content">

        <div class="module-card fans-module">
          <div class="module-header">
            <h2>粉丝数量</h2>
            <el-button type="text" size="small" @click="openStatsDetail('fans')" style="color: var(--color-primary);">查看详细</el-button>
          </div>
          <div class="module-body">
            <div class="fans-count">
              <el-statistic :value="roomInfo.attention">
                <template #title>
                  <div class="stat-title">
                    {{ roomInfo.attention >= 100000 ? '猫猫今天20w粉了吗？' : '猫猫今天10w粉了吗？' }}
                  </div>
                </template>
                <template #suffix>/{{ roomInfo.attention >= 100000 ? '200,000' : '100,000' }}</template>
              </el-statistic>
              <div style="font-size: 13px;color: #52c41a;">
                <template v-if="roomInfo.attention >= 100000">
                  恭喜猫猫10w粉达成！距离20w粉还差 {{ formatNumber(200000 - roomInfo.attention) }} 粉丝
                </template>
                <template v-else>
                  距离10w粉还差 {{ formatNumber(100000 - roomInfo.attention) }} 粉丝
                </template>
              </div>
              <transition :name="attentionChange.type === 'increase' ? 'float-up' : 'float-down'">
                <div v-if="attentionChange.show" class="float-change" :class="attentionChange.type">
                  {{ attentionChange.type === 'increase' ? '+' : '-' }}{{ attentionChange.value }}
                </div>
              </transition>
            </div>
          </div>
        </div>

        <div class="module-card revenue-module">
          <div class="module-header">
            <h2>舰长数量</h2>
            <div class="header-actions">
              <el-button v-if="showGiftsSection" type="text" size="small" @click="showGiftsDetailDialog = true" style="color: var(--color-primary);">本月舰礼</el-button>
              <el-button type="text" size="small" @click="openStatsDetail('captain')" style="color: var(--color-primary);">查看详细</el-button>
            </div>
          </div>
          <div class="module-body">
            <div class="fans-count">
              <el-statistic :value="captain">
                <template #title>
                  <div class="stat-title">
                    猫猫今天多了几个爹呢？
                  </div>
                </template>
                <template #suffix>位舰长大人</template>
              </el-statistic>
              <div style="font-size: 13px;color: #52c41a;">
                距离千舰还差 {{ formatNumber(1000 - captain) }} 个舰长
              </div>
              <transition :name="captainChange.type === 'increase' ? 'float-up' : 'float-down'">
                <div v-if="captainChange.show" class="float-change" :class="captainChange.type">
                  {{ captainChange.type === 'increase' ? '+' : '-' }}{{ captainChange.value }}
                </div>
              </transition>
            </div>
          </div>
        </div>

        <div class="module-card hours-module">
          <div class="module-header">
            <h2>直播时长</h2>
            <el-button type="text" size="small" @click="showLiveDetailDialog = true" style="color: var(--color-primary);">查看详细</el-button>
          </div>
          <div class="module-body">
            <div class="fans-count">
              <el-statistic :value="liveHours">
                <template #title>
                  <div class="stat-title">
                    猫猫月末又要补时长了吗？
                  </div>
                </template>
                <template #suffix>小时/90小时</template>
              </el-statistic>
              <!-- 四种状态显示 -->
              <div v-if="90 - liveHours > 0 && calculateRemainingEffectiveDays() > 0" style="font-size: 13px;color: #f56c6c;">
                本月还差 {{ formatHoursToHM(90 - liveHours) }}，还差 {{ calculateRemainingEffectiveDays() }} 天有效天，猫猫加油哦~
              </div>
              <div v-else-if="90 - liveHours <= 0 && calculateRemainingEffectiveDays() > 0" style="font-size: 13px;color: #e6a23c;">
                本月时长达标辣！但是还差 {{ calculateRemainingEffectiveDays() }} 天有效天
              </div>
              <div v-else-if="90 - liveHours > 0 && calculateRemainingEffectiveDays() <= 0" style="font-size: 13px;color: var(--color-primary);">
                本月还差 {{ formatHoursToHM(90 - liveHours) }}，但是有效天达标辣！
              </div>
              <div v-else style="font-size: 13px;color: #67c23a;">
                本月时长和有效天都达标辣！撒花撒花~
              </div>
            </div>
          </div>
        </div>

        <!-- 直播详细信息弹窗 -->
        <el-dialog
          v-model="showLiveDetailDialog"
          title="直播时长详细"
          width="600px"
          :close-on-click-modal="false"
          custom-class="live-detail-dialog"
          align-center
        >
          <div class="live-detail-container">
            <!-- 月份和总时长信息 -->
            <div class="month-info">
              <div class="month-header">
                <div class="month-selector">
                  <el-button @click="changeMonth(-1)">上一月</el-button>
                  <span class="current-month">{{ currentYear }}年{{ currentMonth }}月</span>
                  <el-button @click="changeMonth(1)">下一月</el-button>
                </div>
                <el-tooltip :content="liveHoursMode === 'all' ? '当前计算跨日直播的全时长' : '当前只计算单天直播时长（跨日直播只算当天）'" placement="top">
                  <el-button type="primary" size="small" @click="toggleLiveHoursMode" plain>
                    <el-icon><Switch /></el-icon>
                    <span style="margin-left: 4px;">{{ liveHoursMode === 'all' ? '全算时长' : '不跨日时长' }}</span>
                  </el-button>
                </el-tooltip>
              </div>
              <div class="month-stats">
                <div class="stat-item">
                  <span class="stat-label">本月总时长</span>
                  <span class="stat-value">{{ formatLiveTime(getDisplayMonthTotal()) }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">有效天数</span>
                  <span class="stat-value">{{ calculateEffectiveDays() }}/{{ requiredEffectiveDays }}</span>
                </div>
                <div v-if="calculateRemainingEffectiveDays() > 0" class="stat-item">
                  <span class="stat-label">还差有效天</span>
                  <span class="stat-value">{{ calculateRemainingEffectiveDays() }} 天</span>
                </div>
                <div v-if="90 - liveHours > 0" class="stat-item">
                  <span class="stat-label">还差时长</span>
                  <span class="stat-value">{{ formatHoursToHM(90 - liveHours) }}</span>
                </div>
              </div>
            </div>
            
            <!-- 日历 -->
            <div class="calendar">
              <div class="calendar-header">
                <div v-for="day in weekDays" :key="day" class="week-day">{{ day }}</div>
              </div>
              <div class="calendar-body">
                <div 
                  v-for="(day, index) in calendarDays" 
                  :key="index"
                  class="calendar-day"
                  :class="{
                    'other-month': day.isOtherMonth, 
                    'current-day': day.isCurrentDay, 
                    'has-live': day.liveHours > 0,
                    'effective': day.liveHours > 0 && day.isEffective,
                    'ineffective': day.liveHours > 0 && !day.isEffective,
                    'no-live': day.liveHours === 0
                  }"
                  @click="selectDate(day)"
                >
                  <div class="day-number">{{ day.day }}</div>
                  <div v-if="day.liveHours > 0" class="live-hours">{{ formatLiveTime(day.liveHours) }}</div>
                </div>
              </div>
            </div>
            
            <!-- 详细信息 -->
            <div v-if="selectedDate" class="live-detail-info">
              <h3>{{ selectedDate.year }}年{{ selectedDate.month }}月{{ selectedDate.day }}日 直播详情</h3>
              <div v-if="selectedDate.liveSessions.length > 0" class="live-sessions">
                <div v-for="(session, index) in selectedDate.liveSessions" :key="index" class="live-session">
                  <div class="session-item">
                    <span class="label">开播时间：</span>
                    <span class="value">{{ session.startTime }}</span>
                  </div>
                  <div class="session-item">
                    <span class="label">下播时间：</span>
                    <span class="value">{{ session.endTime }}</span>
                  </div>
                  <div class="session-item">
                    <span class="label">直播时长：</span>
                    <span class="value" style="color: var(--color-primary); font-weight: 600;">{{ formatSessionDuration(session.startTime, session.endTime) }}</span>
                  </div>
                  <div class="session-item">
                    <span class="label">直播标题：</span>
                    <span class="value">{{ session.title }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="no-live-tag">
                当天无直播记录
              </div>
            </div>
          </div>
        </el-dialog>

        <!-- 主播统计数据详情弹窗 -->
        <el-dialog
          v-model="showStatsDetailDialog"
          :title="statsType === 'fans' ? '粉丝数量趋势' : '舰长数量趋势'"
          width="800px"
          :close-on-click-modal="false"
          custom-class="stats-detail-dialog"
          align-center
        >
          <div class="stats-detail-container">
            <!-- 时间范围选择器 -->
            <div class="time-range-selector">
              <el-radio-group v-model="statsTimeRange" @change="changeStatsTimeRange">
                <el-radio-button label="week">近1周</el-radio-button>
                <el-radio-button label="month">近1月</el-radio-button>
                <el-radio-button label="year">近1年</el-radio-button>
              </el-radio-group>
              <!-- 舰长显示模式切换 -->
              <el-radio-group v-if="statsType === 'captain'" v-model="captainDisplayMode" style="margin-left: 16px;">
                <el-radio-button label="total">总数</el-radio-button>
                <el-radio-button label="detail">详细</el-radio-button>
              </el-radio-group>
            </div>

            <!-- 加载状态 -->
            <div v-if="statsLoading" class="stats-loading">
              <el-skeleton :rows="6" animated />
            </div>

            <!-- 无数据提示 -->
            <div v-else-if="statsData.length === 0" class="stats-empty">
              <el-empty description="暂无统计数据" />
            </div>

            <!-- 图表区域 -->
            <div v-else class="stats-chart-container">
              <!-- 统计摘要 -->
              <div class="stats-summary">
                <!-- 粉丝详细：显示粉丝数和粉丝团数量的统计 -->
                <template v-if="statsType === 'fans'">
                  <div class="summary-item">
                    <span class="summary-label">当前粉丝数：</span>
                    <span class="summary-value">{{ formatNumber(statsData[statsData.length - 1]?.fansCount) }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">粉丝增长：</span>
                    <span class="summary-value" :class="{
                      'positive': (statsData[statsData.length - 1]?.fansCount - statsData[0]?.fansCount) > 0,
                      'negative': (statsData[statsData.length - 1]?.fansCount - statsData[0]?.fansCount) < 0
                    }">
                      {{ (statsData[statsData.length - 1]?.fansCount - statsData[0]?.fansCount) > 0 ? '+' : '' }}{{ formatNumber(statsData[statsData.length - 1]?.fansCount - statsData[0]?.fansCount) }}
                    </span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">当前粉丝团成员：</span>
                    <span class="summary-value">{{ formatNumber(statsData[statsData.length - 1]?.fansMemberCount) }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">粉丝团成员增长：</span>
                    <span class="summary-value" :class="{
                      'positive': (statsData[statsData.length - 1]?.fansMemberCount - statsData[0]?.fansMemberCount) > 0,
                      'negative': (statsData[statsData.length - 1]?.fansMemberCount - statsData[0]?.fansMemberCount) < 0
                    }">
                      {{ (statsData[statsData.length - 1]?.fansMemberCount - statsData[0]?.fansMemberCount) > 0 ? '+' : '' }}{{ formatNumber(statsData[statsData.length - 1]?.fansMemberCount - statsData[0]?.fansMemberCount) }}
                    </span>
                  </div>
                </template>
                <!-- 舰长详细：根据显示模式展示总数或详细统计 -->
                <template v-else>
                  <!-- 总数模式 -->
                  <template v-if="captainDisplayMode === 'total'">
                    <div class="summary-item">
                      <span class="summary-label">当前大航海总数：</span>
                      <span class="summary-value">{{ formatNumber((statsData[statsData.length - 1]?.commanderCount || 0) + (statsData[statsData.length - 1]?.viceCommanderCount || 0) + (statsData[statsData.length - 1]?.captainCount || 0)) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">总数增长：</span>
                      <span class="summary-value" :class="{
                        'positive': ((statsData[statsData.length - 1]?.commanderCount + statsData[statsData.length - 1]?.viceCommanderCount + statsData[statsData.length - 1]?.captainCount) - (statsData[0]?.commanderCount + statsData[0]?.viceCommanderCount + statsData[0]?.captainCount)) > 0,
                        'negative': ((statsData[statsData.length - 1]?.commanderCount + statsData[statsData.length - 1]?.viceCommanderCount + statsData[statsData.length - 1]?.captainCount) - (statsData[0]?.commanderCount + statsData[0]?.viceCommanderCount + statsData[0]?.captainCount)) < 0
                      }">
                        {{ ((statsData[statsData.length - 1]?.commanderCount + statsData[statsData.length - 1]?.viceCommanderCount + statsData[statsData.length - 1]?.captainCount) - (statsData[0]?.commanderCount + statsData[0]?.viceCommanderCount + statsData[0]?.captainCount)) > 0 ? '+' : '' }}{{ formatNumber((statsData[statsData.length - 1]?.commanderCount + statsData[statsData.length - 1]?.viceCommanderCount + statsData[statsData.length - 1]?.captainCount) - (statsData[0]?.commanderCount + statsData[0]?.viceCommanderCount + statsData[0]?.captainCount)) }}
                      </span>
                    </div>
                  </template>
                  <!-- 详细模式 -->
                  <template v-else>
                    <div class="summary-item">
                      <span class="summary-label">当前总督：</span>
                      <span class="summary-value">{{ formatNumber(statsData[statsData.length - 1]?.commanderCount) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">总督增长：</span>
                      <span class="summary-value" :class="{
                        'positive': (statsData[statsData.length - 1]?.commanderCount - statsData[0]?.commanderCount) > 0,
                        'negative': (statsData[statsData.length - 1]?.commanderCount - statsData[0]?.commanderCount) < 0
                      }">
                        {{ (statsData[statsData.length - 1]?.commanderCount - statsData[0]?.commanderCount) > 0 ? '+' : '' }}{{ formatNumber(statsData[statsData.length - 1]?.commanderCount - statsData[0]?.commanderCount) }}
                      </span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">当前提督：</span>
                      <span class="summary-value">{{ formatNumber(statsData[statsData.length - 1]?.viceCommanderCount) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">提督增长：</span>
                      <span class="summary-value" :class="{
                        'positive': (statsData[statsData.length - 1]?.viceCommanderCount - statsData[0]?.viceCommanderCount) > 0,
                        'negative': (statsData[statsData.length - 1]?.viceCommanderCount - statsData[0]?.viceCommanderCount) < 0
                      }">
                        {{ (statsData[statsData.length - 1]?.viceCommanderCount - statsData[0]?.viceCommanderCount) > 0 ? '+' : '' }}{{ formatNumber(statsData[statsData.length - 1]?.viceCommanderCount - statsData[0]?.viceCommanderCount) }}
                      </span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">当前舰长：</span>
                      <span class="summary-value">{{ formatNumber(statsData[statsData.length - 1]?.captainCount) }}</span>
                    </div>
                    <div class="summary-item">
                      <span class="summary-label">舰长增长：</span>
                      <span class="summary-value" :class="{
                        'positive': (statsData[statsData.length - 1]?.captainCount - statsData[0]?.captainCount) > 0,
                        'negative': (statsData[statsData.length - 1]?.captainCount - statsData[0]?.captainCount) < 0
                      }">
                        {{ (statsData[statsData.length - 1]?.captainCount - statsData[0]?.captainCount) > 0 ? '+' : '' }}{{ formatNumber(statsData[statsData.length - 1]?.captainCount - statsData[0]?.captainCount) }}
                      </span>
                    </div>
                  </template>
                </template>
              </div>

              <!-- 折线图 -->
              <div class="chart-wrapper">
                <v-chart class="stats-chart" :option="chartOption" autoresize />
              </div>
            </div>
          </div>
        </el-dialog>

        <!-- 舰礼详情弹窗 -->
        <el-dialog
          v-model="showGiftsDetailDialog"
          title="当月舰礼详情"
          width="600px"
          :close-on-click-modal="false"
          custom-class="gifts-detail-dialog"
          align-center
        >
          <el-scrollbar max-height="70vh">
            <div class="gifts-detail-content">
              <!-- 提示信息 -->
              <el-alert
                title="本舰礼进度仅供参考，具体以北立交桥官网为准"
                type="info"
                :closable="false"
                show-icon
                style="margin-bottom: 16px;"
              />
              
              <!-- 进度概览 -->
              <div class="gifts-overview">
                <div class="overview-stat">
                  <span class="overview-label">{{ giftProgressMode === 'max' ? '本月最高' : '当前舰长' }}</span>
                  <span class="overview-value">{{ progressCaptainCount }}</span>
                </div>
                <div class="overview-center">
                  <!-- 计数方式切换 -->
                  <el-radio-group v-model="giftProgressMode" size="small" class="progress-mode-switch">
                    <el-radio-button label="max">本月最高</el-radio-button>
                    <el-radio-button label="current">当前舰长</el-radio-button>
                  </el-radio-group>
                  <div class="overview-progress">
                    <el-progress
                      :percentage="overallProgress"
                      :stroke-width="12"
                      :show-text="false"
                      :color="overallProgress >= 100 ? '#67c23a' : '#e6a23c'"
                    />
                  </div>
                </div>
                <div class="overview-target">
                  <span class="overview-label">下一目标</span>
                  <span class="overview-value" v-if="nextTargetGift">{{ nextTargetGift.requiredFansCount }}</span>
                  <span class="overview-remain" v-if="nextTargetGift">(还差 {{ nextTargetGift.requiredFansCount - progressCaptainCount }})</span>
                  <span v-else>暂无目标</span>
                </div>
              </div>

              <!-- 单条多阶段进度条 -->
              <div class="single-progress-bar">
                <!-- 阶段节点 - 按位置分组显示 -->
                <div class="stage-nodes">
                  <template v-for="(group, position) in groupedGiftsByPosition" :key="position">
                    <el-tooltip
                      placement="top"
                      :show-after="200"
                    >
                      <template #content>
                        <div class="gift-tooltip-content">
                          <div class="tooltip-title">该节点包含 {{ group.length }} 个礼物</div>
                          <div class="tooltip-gifts-wrapper">
                            <div v-for="gift in group" :key="gift.id" class="tooltip-gift-item">
                              <div class="tooltip-header" :style="{ color: giftTypeColors[gift.giftType] }">
                                <el-icon size="14"><Present /></el-icon>
                                <span>{{ giftTypeLabels[gift.giftType] }}</span>
                                <el-tag size="small" :type="isGiftUnlocked(gift) ? 'success' : 'info'" class="tooltip-status-tag">
                                  {{ gift.requiredFansCount === 0 ? '基础' : gift.requiredFansCount + '舰长' }}
                                </el-tag>
                              </div>
                              <div class="tooltip-gift-name">{{ gift.giftName }}</div>
                              <div class="tooltip-gift-content" v-if="gift.giftContent">{{ gift.giftContent }}</div>
                              <div class="tooltip-gift-tags" v-if="parseInt(gift.includes) > 0">
                                <el-tag v-if="parseInt(gift.includes) & 1" type="info" size="small">含舰长礼</el-tag>
                                <el-tag v-if="parseInt(gift.includes) & 2" type="info" size="small">含提督礼</el-tag>
                              </div>
                              <div class="tooltip-gift-date" v-if="gift.startDate || gift.endDate" :class="getGiftDateStatusClass(gift.startDate, gift.endDate)">
                                <el-icon size="12"><Timer /></el-icon>
                                {{ getGiftDateStatusText(gift.startDate, gift.endDate) }}: {{ formatGiftDateRange(gift.startDate, gift.endDate) }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                      <div
                        class="stage-node"
                        :class="{
                          'unlocked': group.some(g => isGiftUnlocked(g)),
                          'current': group.some(g => isNextTarget(g)),
                          'multi-gifts': group.length > 1,
                          'multi-2': group.length === 2,
                          'multi-3': group.length >= 3,
                          'type-captain': group.length === 1 && group[0].giftType === 1,
                          'type-commander': group.length === 1 && group[0].giftType === 2,
                          'type-governor': group.length === 1 && group[0].giftType === 3
                        }"
                        :style="{ left: position + '%' }"
                      >
                        <div class="node-badge" :class="{ 'multi-badge': group.length > 1 }">
                          <template v-if="group.length > 1">
                            <div class="multi-indicator">
                              <span class="multi-count">{{ group.length }}</span>
                            </div>
                          </template>
                          <template v-else>
                            <el-icon v-if="isGiftUnlocked(group[0])"><Check /></el-icon>
                            <span v-else>{{ group[0].index + 1 }}</span>
                          </template>
                        </div>
                        <div class="node-label">{{ group[0].requiredFansCount === 0 ? '基础' : group[0].requiredFansCount }}</div>
                      </div>
                    </el-tooltip>
                  </template>
                </div>

                <!-- 进度条背景 -->
                <div class="progress-track">
                  <div class="progress-completed" :style="{ width: overallProgress + '%' }"></div>
                </div>
                
                <!-- 当前位置标记（在进度条下方） -->
                <div class="current-marker" :style="{ left: overallProgress + '%' }" v-if="overallProgress < 100">
                  <div class="marker-triangle"></div>
                  <div class="marker-label">{{ progressCaptainCount }}</div>
                </div>
              </div>

              <!-- 图例 -->
              <div class="progress-legend">
                <div class="legend-item">
                  <div class="legend-dot type-captain"></div>
                  <span>舰长礼</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot type-commander"></div>
                  <span>提督礼</span>
                </div>
                <div class="legend-item">
                  <div class="legend-dot type-governor"></div>
                  <span>总督礼</span>
                </div>
              </div>

              <!-- 舰礼卡片列表 - 按类型分组 -->
              <div class="gifts-by-type">
                <template v-for="type in [1, 2, 3]" :key="type">
                  <div v-if="groupedGifts[type]?.length > 0" class="gift-type-section" :style="{ borderLeftColor: giftTypeColors[type] }">
                    <div class="gift-type-header" :style="{ color: giftTypeColors[type] }">
                      <el-icon size="18"><Present /></el-icon>
                      <span class="type-name">{{ giftTypeLabels[type] }}</span>
                      <el-tag size="small" :type="type === 1 ? 'primary' : (type === 2 ? 'warning' : 'danger')" effect="light" class="count-tag">
                        {{ groupedGifts[type].length }}
                      </el-tag>
                    </div>
                    <div class="gifts-cards">
                      <div
                        v-for="(gift, index) in groupedGifts[type]"
                        :key="gift.id"
                        class="gift-card"
                        :class="{
                          'unlocked': isGiftUnlocked(gift),
                          'current': isNextTarget(gift)
                        }"
                      >
                        <div class="gift-card-header">
                          <div class="gift-step-num">{{ index + 1 }}</div>
                          <div class="gift-status-icon">
                            <el-icon v-if="isGiftUnlocked(gift)"><Check /></el-icon>
                            <el-icon v-else-if="isNextTarget(gift)"><Loading /></el-icon>
                            <el-icon v-else><Lock /></el-icon>
                          </div>
                        </div>
                        <div class="gift-card-body">
                          <div class="gift-name">{{ gift.giftName }}</div>
                          <div class="gift-content" v-if="gift.giftContent">{{ gift.giftContent }}</div>
                          <div class="gift-tags-row">
                            <el-tag 
                              :type="isGiftUnlocked(gift) ? 'success' : (isNextTarget(gift) ? 'warning' : 'info')" 
                              size="small"
                              class="gift-tag"
                            >
                              {{ gift.requiredFansCount === 0 ? '基础' : gift.requiredFansCount + '解锁' }}
                            </el-tag>
                            <el-tag v-if="parseInt(gift.includes) & 1" type="info" size="small" class="gift-tag">含舰长礼</el-tag>
                            <el-tag v-if="parseInt(gift.includes) & 2" type="info" size="small" class="gift-tag">含提督礼</el-tag>
                            <el-tag 
                              v-if="gift.startDate || gift.endDate" 
                              :type="getGiftDateStatus(gift.startDate, gift.endDate) === 'active' ? 'success' : (getGiftDateStatus(gift.startDate, gift.endDate) === 'upcoming' ? 'warning' : 'info')" 
                              size="small" 
                              class="gift-tag" 
                              effect="dark"
                            >
                              <el-icon size="10"><Timer /></el-icon>
                              {{ getGiftDateStatusText(gift.startDate, gift.endDate) }} {{ formatGiftDateRange(gift.startDate, gift.endDate) }}
                            </el-tag>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </el-scrollbar>
        </el-dialog>

        <!-- 企划详情弹窗 -->
        <el-dialog
          v-model="planDialogVisible"
          :title="planDetail?.title || '企划详情'"
          width="900px"
          :close-on-click-modal="true"
          align-center
          destroy-on-close
          custom-class="plan-preview-dialog"
        >
          <div v-if="planDetail" class="plan-preview-content">
             <div class="plan-preview-panel">
               <el-empty v-if="planPreviewError" :description="planPreviewError" :image-size="60" />
               <docx-preview
                  v-else
                  :key="planPreviewKey"
                  :src="getPlanPreviewUrl(planDetail.filePath)"
                  style="height: 60vh"
                  @error="onPlanPreviewError"
                />
             </div>
            <div class="plan-preview-footer">
              <el-button @click="planDialogVisible = false">关闭</el-button>
              <el-button type="primary" @click="downloadPlanDocument(planDetail)">
                <el-icon><Download /></el-icon>
                下载文档
              </el-button>
              <el-button type="success" @click="goTo('/plan-document', true); planDialogVisible = false">
                查看全部企划
              </el-button>
            </div>
          </div>
        </el-dialog>

        <div class="module-card status-module">
          <div class="module-header">
            <h2>直播状态</h2>
          </div>
          <img class="module-img" :src="roomInfo.user_cover" alt="直播封面">
          <div class="module-body">
            <div class="status-content">
              <div class="status-indicator clickable" @click="goTo(`https://live.bilibili.com/${roomId}`, false)">
                {{ getStatusText(roomInfo.live_status) }}
              </div>
              <div v-if="roomInfo.live_status === 1" class="online-count">
                当前观看人数: <strong>{{ formatNumber(roomInfo.online) }}</strong>
              </div>
              <div v-else class="offline-notice">
                主播当前未开播
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- 分隔线 -->
      <hr class="section-divider">

      <div class="maruko-section">
        <div class="maruko-content">

          <!-- 丸子相簿 -->
          <div class="module-card feature-module">
            <div class="module-header">
              <h2>{{ nickName }}相簿</h2>
              <el-button type="text" size="small" style="color: var(--color-primary);" @click="goTo('/photo-album', true)">查看全部</el-button>
            </div>
            <div class="module-body feature-body">
              <div v-if="latestPhoto" class="feature-preview photo-preview">
                <img :src="getFullImageUrl(latestPhoto.url)" :alt="latestPhoto.title" />
                <div class="preview-overlay">
                  <span class="preview-label">最新相片</span>
                  <span class="preview-title">{{ latestPhoto.title }}</span>
                </div>
              </div>
              <div v-else class="feature-empty">
                <el-icon><Picture /></el-icon>
                <p>暂无照片</p>
              </div>
            </div>
          </div>

          <!-- 丸子音声 -->
          <div class="module-card feature-module">
            <div class="module-header">
              <h2>{{ nickName }}音声</h2>
              <el-button type="text" size="small" style="color: var(--color-primary);" @click="goTo('/audio', true)">查看全部</el-button>
            </div>
            <div class="module-body feature-body">
              <div v-if="hotAudio" class="feature-content audio-content clickable" @click="playAudio(hotAudio)">
                <div class="audio-icon-large" :class="{ 'is-playing': isPlayingAudio && currentAudioUrl === getFullImageUrl(hotAudio.cover) }">
                  <el-icon v-if="isPlayingAudio && currentAudioUrl === getFullImageUrl(hotAudio.cover)"><VideoPause /></el-icon>
                  <el-icon v-else><VideoPlay /></el-icon>
                </div>
                <div class="audio-info">
                  <span class="audio-label">本周最热</span>
                  <span class="audio-title">{{ hotAudio.title }}</span>
                </div>
                <audio ref="audioPlayer" :src="currentAudioUrl" @ended="isPlayingAudio = false" style="display: none;"></audio>
              </div>
              <div v-else class="feature-empty">
                <el-icon><Headset /></el-icon>
                <p>暂无音声</p>
              </div>
            </div>
          </div>

          <!-- 丸子企划 -->
          <div class="module-card feature-module">
            <div class="module-header">
              <h2>{{ nickName }}企划</h2>
              <el-button type="text" size="small" style="color: var(--color-primary);" @click="goTo('/plan-document', true)">查看全部</el-button>
            </div>
            <div class="module-body feature-body">
              <div v-if="currentPlan" class="feature-content plan-content clickable" @click="viewPlanDetail(currentPlan)">
                <div class="plan-icon-large">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="plan-info">
                  <span class="plan-label">当前企划</span>
                  <span class="plan-title">{{ currentPlan.title }}</span>
                </div>
              </div>
              <div v-else class="feature-empty">
                <el-icon><Document /></el-icon>
                <p>暂无企划</p>
              </div>
            </div>
          </div>

          <!-- 丸子视频 -->
          <div class="module-card feature-module" @click="hotVideo?.bvid ? openBilibiliVideo(hotVideo.bvid) : goTo('/video-favorite', true)">
            <div class="module-header">
              <h2>{{ nickName }}视频</h2>
              <el-button type="text" size="small" style="color: var(--color-primary);" @click.stop="goTo('/video-favorite', true)">查看全部</el-button>
            </div>
            <div class="module-body feature-body">
              <div v-if="hotVideo" class="feature-preview video-preview">
                <img :src="getFullImageUrl(hotVideo.cover)" :alt="hotVideo.title" />
                <div class="preview-overlay">
                  <span class="preview-label">本周热门</span>
                  <span class="preview-title">{{ hotVideo.title }}</span>
                </div>
              </div>
              <div v-else class="feature-empty">
                <el-icon><VideoPlay /></el-icon>
                <p>暂无视频</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.live-room-page {
  max-width: 100vw;
  background: #f5f7fa;
  min-height: 100vh;
  box-sizing: border-box;
}

.body {
  padding: 20px;
}

.page-header h1 {
  color: var(--color-primary);
  font-size: 28px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.page-header h1 i {
  font-size: 24px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
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
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.error-container i {
  font-size: 50px;
  color: #ff4d4f;
  margin-bottom: 15px;
}

.error-container h3 {
  color: #333;
  margin-bottom: 10px;
}

.error-container p {
  color: #666;
  margin-bottom: 20px;
}

.retry-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.retry-btn:hover {
  background: var(--color-primary-dark);
}

.anchor-card {
  background: white;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--color-primary);
  box-shadow: 0 4px 10px var(--color-primary-alpha-30);
}

.avatar img {
  width: 100%;
  height: 100%;
}

.anchor-name {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.anchor-id {
  color: #666;
  font-size: 14px;
}

.room-id .label {
  color: #666;
  margin-right: 5px;
}

.room-id .value {
  font-weight: 600;
  color: var(--color-primary);
}

.main-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
}

.module-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.3s, box-shadow 0.3s;
  position: relative;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

/* 可点击卡片的特殊样式 */
.photo-album-module:hover,
.message-module:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 25px var(--color-primary-alpha-15);
  border-color: var(--color-primary-alpha-20);
}

.photo-album-module,
.message-module {
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.module-header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  background: #fafbfc;
  border-bottom: 1px solid #f0f2f5;
}

.module-header i {
  color: var(--color-primary);
  font-size: 18px;
  margin-right: 10px;
}

.module-header h2 {
  font-size: 18px;
  color: #333;
  font-weight: 600;
  flex: 1;
}

.module-header .el-button {
  margin-left: 10px;
}

/* 头部操作按钮组 */
.header-actions {
  display: flex;
  align-items: center;
}

.header-actions .el-button {
  margin-left: 0;
}

/* 直播详情弹窗样式 */
.live-detail-dialog {
  max-width: 500px !important;
  max-height: 40vh !important;
}

.live-detail-dialog .el-dialog__body {
  padding: 12px;
  overflow: auto;
  max-height: calc(40vh - 100px);
}

.live-detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 月份和总时长信息 */
.month-info {
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.month-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 15px;
}

.current-month {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  min-width: 120px;
  text-align: center;
}

.month-stats {
  display: flex;
  gap: 30px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.stat-value {
  font-size: 16px;
  color: var(--color-primary);
  font-weight: 600;
}

/* 日历样式 */
.calendar {
  background: white;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  margin-bottom: 10px;
}

.week-day {
  text-align: center;
  font-weight: 600;
  color: #666;
  padding: 8px 6px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
}

.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.calendar-day {
  min-height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  padding: 6px;
  background: white;
}

.calendar-day:hover {
  background: #ecf5ff;
  border-color: var(--color-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--color-primary-alpha-15);
}

.calendar-day.other-month {
  color: #c0c4cc;
  background: #fafafa;
}

.calendar-day.current-day {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
  color: #000;
  font-weight: 600;
  box-shadow: 0 2px 8px var(--color-primary-alpha-30);
}

.calendar-day.no-live {
  /* 无直播，默认样式 */
}

.calendar-day.has-live {
  position: relative;
}

.calendar-day.has-live.effective {
  border-color: #67c23a;
  background: #f0f9eb;
}

.calendar-day.has-live.ineffective {
  border-color: #f56c6c;
  background: #fef0f0;
}

.calendar-day.has-live::before {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  background: #67c23a;
  border-radius: 50%;
}

.day-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.live-hours {
  font-size: 10px;
  color: #67c23a;
  font-weight: 500;
  text-align: center;
  line-height: 1.1;
}

/* 详细信息样式 */
.live-detail-info {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.live-detail-info h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
  font-size: 16px;
  font-weight: 600;
}

.live-sessions {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.live-session {
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 4px solid var(--color-primary);
}

.session-item {
  margin-bottom: 8px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.session-item:last-child {
  margin-bottom: 0;
}

.session-item .label {
  font-weight: 600;
  color: #666;
  min-width: 80px;
  flex-shrink: 0;
}

.session-item .value {
  color: #333;
  flex: 1;
  word-break: break-word;
}

.no-live-tag {
  text-align: center;
  color: #909399;
  background: #f9f9f9;
  border-radius: 8px;
  padding: 20px 10px;
}

.no-live {
  text-align: center;
  color: #909399;
  background: #f9f9f9;
  border-radius: 8px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .live-detail-dialog {
    width: 98vw !important;
    height: 85vh !important;
    margin: 5px auto !important;
  }
  
  .live-detail-dialog .el-dialog__header {
    padding: 15px;
  }
  
  .live-detail-dialog .el-dialog__title {
    font-size: 16px;
  }
  
  .live-detail-dialog .el-dialog__body {
    padding: 10px;
    max-height: calc(85vh - 60px);
  }
  
  .live-detail-container {
    gap: 10px;
  }
  
  .month-info {
    gap: 10px;
    padding-bottom: 10px;
  }

  .month-header {
    flex-direction: column;
    gap: 10px;
  }

  .month-selector {
    gap: 8px;
  }

  .month-selector .el-button {
    padding: 6px 12px;
    font-size: 12px;
  }

  .current-month {
    font-size: 14px;
    min-width: 100px;
  }

  .month-stats {
    justify-content: center;
    gap: 20px;
  }

  .stat-item {
    align-items: center;
  }

  .stat-label {
    font-size: 11px;
  }

  .stat-value {
    font-size: 14px;
  }
  
  .calendar {
    padding: 10px;
    border-radius: 8px;
  }
  
  .calendar-header {
    gap: 4px;
    margin-bottom: 8px;
  }
  
  .week-day {
    padding: 6px 4px;
    font-size: 11px;
    border-radius: 3px;
  }
  
  .calendar-body {
    gap: 4px;
  }
  
  .calendar-day {
    min-height: 40px;
    padding: 3px 2px;
    border-radius: 4px;
  }
  
  .calendar-day:hover {
    transform: none;
  }
  
  .day-number {
    font-size: 12px;
    margin-bottom: 1px;
  }
  
  .live-hours {
    font-size: 9px;
    line-height: 1;
    white-space: nowrap;
  }
  
  .calendar-day.has-live::before {
    top: 2px;
    right: 2px;
    width: 4px;
    height: 4px;
  }
  
  .live-detail-info {
    padding: 12px;
    border-radius: 8px;
  }
  
  .live-detail-info h3 {
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .live-sessions {
    gap: 10px;
  }
  
  .live-session {
    padding: 12px;
    border-radius: 6px;
  }
  
  .session-item {
    margin-bottom: 6px;
    gap: 6px;
  }
  
  .session-item .label {
    font-size: 13px;
    min-width: 70px;
  }
  
  .session-item .value {
    font-size: 13px;
  }
}

/* 小屏幕手机适配（iPhone SE等） */
@media (max-width: 375px) {
  .live-detail-dialog {
    width: 100vw !important;
    height: 80vh !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }
  
  .live-detail-dialog .el-dialog__body {
    padding: 8px;
    max-height: calc(80vh - 50px);
  }
  
  .calendar {
    padding: 8px;
  }
  
  .week-day {
    padding: 4px 2px;
    font-size: 10px;
  }
  
  .calendar-day {
    min-height: 32px;
    padding: 2px 1px;
  }
  
  .day-number {
    font-size: 11px;
  }
  
  .live-hours {
    font-size: 8px;
  }
  
  .month-selector .el-button {
    padding: 4px 8px;
    font-size: 11px;
  }
  
  .current-month {
    font-size: 12px;
    min-width: 80px;
  }
  
  .month-total {
    font-size: 11px;
  }
}

/* 横屏手机适配 */
@media screen and (max-width: 896px) and (orientation: landscape) {
  .live-detail-dialog {
    height: 90vh !important;
  }
  
  .live-detail-dialog .el-dialog__body {
    max-height: calc(90vh - 60px);
  }
  
  .live-detail-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
  }
  
  .calendar {
    padding: 10px;
  }
  
  .calendar-day {
    min-height: 35px;
    padding: 3px;
  }
  
  .day-number {
    font-size: 11px;
  }
  
  .live-hours {
    font-size: 8px;
  }
  
  .live-detail-info {
    margin-top: 0;
  }
}

.module-img {
  position: absolute;
  width: 100%;
  z-index: 1;
  opacity: 0.7;
}

.module-body {
  padding: 20px;
  position: relative;
  z-index: 2;
}

.status-content {
  text-align: center;
  padding: 10px 0;
}

.status-indicator {
  display: inline-flex;
  align-items: center;
  padding: 12px 24px;
  border-radius: 50px;
  color: white;
  font-weight: 600;
  margin-bottom: 15px;
  font-size: 16px;
  background:
    linear-gradient(135deg, var(--color-primary-alpha-70) 0%, rgba(102, 177, 255, 0.6) 50%, var(--color-primary-alpha-70) 100%),
    linear-gradient(135deg, var(--color-primary-alpha-10) 0%, rgba(102, 177, 255, 0.2) 100%);
  background-size: 200% 200%, 100% 100%;
  background-blend-mode: normal;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow:
    0 4px 15px var(--color-primary-alpha-40),
    0 2px 8px var(--color-primary-alpha-20),
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -1px 0 rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
  opacity: 0.7;
}

.status-indicator::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transition: left 0.6s ease;
}

.status-indicator.clickable {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-indicator.clickable:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 8px 25px var(--color-primary-alpha-60),
    0 4px 15px var(--color-primary-alpha-40),
    inset 0 1px 0 rgba(255, 255, 255, 0.4),
    inset 0 -1px 0 rgba(0, 0, 0, 0.05);
  background-position: right center;
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-color: rgba(255, 255, 255, 0.3);
}

.status-indicator.clickable:hover::before {
  left: 100%;
}

.status-indicator.clickable:active {
  transform: translateY(-1px) scale(1.01);
  transition: all 0.1s ease;
}

.online-count {
  font-size: 16px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.online-count strong {
  color: #ff4d4f;
  font-size: 18px;
}

.offline-notice {
  color: #666;
}

.fans-count {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  text-align: center;
  margin: 15px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-direction: column;
  position: relative;
}

/* 飘动数字样式 */
.float-change {
  width: 20px;
  height: 20px;
  position: absolute;
  right: 10%;
  top: 50%;
  font-size: 14px;
  font-weight: bold;
  padding: 6px 6px;
  border-radius: 100%;
  pointer-events: none;
  z-index: 10;
}

.float-change.increase {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}

.float-change.decrease {
  color: #52c41a;
  background: rgba(82, 196, 26, 0.1);
}

/* 往上飘动画（增加） */
.float-up-enter-active {
  animation: float-up-anim 1.5s ease-out forwards;
}

.float-up-leave-active {
  animation: float-up-anim 1.5s ease-out forwards;
}

@keyframes float-up-anim {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.8);
  }
  20% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  80% {
    opacity: 1;
    transform: translateY(-20px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
}

/* 往下飘动画（减少） */
.float-down-enter-active {
  animation: float-down-anim 1.5s ease-out forwards;
}

.float-down-leave-active {
  animation: float-down-anim 1.5s ease-out forwards;
}

@keyframes float-down-anim {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.9);
  }
  20% {
    opacity: 1;
    transform: translateY(-20px) scale(1);
  }
  80% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(10px) scale(0.8);
  }
}

.stat-title {
  display: inline-flex;
  align-items: center;
  color: var(--color-primary);
  font-size: 15px;
  font-weight: bold;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item .label {
  color: #666;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.info-item .value {
  color: #333;
  font-weight: 500;
  word-break: break-word;
}

.revenue-placeholder i,
.other-placeholder i {
  font-size: 40px;
  margin-bottom: 10px;
  color: #d9d9d9;
}

/* 主播相簿样式 */
.album-content,
.message-content {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.album-placeholder,
.message-placeholder {
  text-align: center;
  color: #999;
}

.album-placeholder i,
.message-placeholder i {
  font-size: 40px;
  margin-bottom: 10px;
  color: #d9d9d9;
}

.album-placeholder p,
.message-placeholder p {
  font-size: 16px;
  margin: 0;
  color: #666;
}

.revenue-item .value {
  font-weight: 600;
  color: var(--color-primary);
  font-size: 18px;
}

.cover-image img {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 分隔线样式 */
.section-divider {
  margin: 40px 0;
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, var(--color-primary) 20%, var(--color-primary) 80%, transparent 100%);
  opacity: 0.3;
}

/* 主播专区样式 */
.maruko-section {
  margin-top: 20px;
}

.maruko-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

/* 功能模块卡片 - 与页面其他模块风格统一 */
.feature-module {
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.feature-module:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.feature-body {
  padding: 15px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 预览区域 */
.feature-preview {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}

.feature-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.feature-preview:hover img {
  transform: scale(1.05);
}

.preview-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  font-size: 13px;
}

.preview-overlay span {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.video-title {
  font-weight: 500;
}

.video-hot {
  font-size: 11px;
  color: #ffd700;
  margin-top: 4px;
}

/* 空状态 */
.feature-empty {
  text-align: center;
  color: #999;
}

.feature-empty .el-icon {
  font-size: 48px;
  margin-bottom: 10px;
  color: #ddd;
}

.feature-empty p {
  margin: 0;
  font-size: 14px;
}

/* 音声和企划内容展示 */
.feature-content {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
  position: relative;
}

.audio-content {
  background: linear-gradient(135deg, #fef3f3 0%, #fde8e8 100%);
}

.plan-content {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
}

.audio-icon-large,
.plan-icon-large {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.audio-icon-large .el-icon {
  font-size: 24px;
  color: #e74c3c;
}

.plan-icon-large .el-icon {
  font-size: 24px;
  color: #0ea5e9;
}

.audio-info,
.plan-info {
  text-align: center;
  padding: 0 10px;
}

.audio-label,
.plan-label {
  display: block;
  font-size: 11px;
  color: #999;
  margin-bottom: 4px;
}

.audio-title,
.plan-title {
  display: block;
  font-size: 13px;
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* 播放中状态 */
.audio-icon-large.is-playing {
  background: #e74c3c;
  animation: pulse 1.5s infinite;
}

.audio-icon-large.is-playing .el-icon {
  color: white;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(231, 76, 60, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(231, 76, 60, 0);
  }
}

/* 企划预览弹窗 */
.plan-preview-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.plan-preview-panel {
  flex: 1;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.plan-preview-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

/* 信息展示 */
.feature-info {
  text-align: center;
  padding: 10px;
}

.feature-icon-large {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px;
}

.feature-icon-large .el-icon {
  font-size: 28px;
  color: var(--color-primary);
}

.feature-icon-large.plan-icon .el-icon {
  color: #0ea5e9;
}

.feature-desc {
  margin: 0;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

/* 移动端统计数字优化 */
@media (max-width: 768px) {
  .fans-count {
    text-align: center;
    margin: 15px 0;
  }
}

/* 响应式设计 */
/* 大屏优化 (>1200px) */
@media (min-width: 1200px) {

  .anchor-card {
    padding: 30px;
    gap: 25px;
  }

  .avatar {
    width: 90px;
    height: 90px;
  }
}

/* 中等屏幕 (769px-1199px) */
@media (min-width: 769px) and (max-width: 1199px) {

  .anchor-card {
    padding: 20px;
    gap: 20px;
  }
}

/* 平板 (481px-768px) */
@media (max-width: 768px) {

  .main-content {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .maruko-content {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .anchor-card {
    flex-direction: column;
    text-align: center;
    padding: 20px;
    gap: 15px;
  }

  .avatar-section {
    justify-content: center;
  }

  .avatar {
    width: 70px;
    height: 70px;
  }

  .anchor-name {
    font-size: 20px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .module-header {
    padding: 0 15px;
  }

  .module-header h2 {
    font-size: 16px;
  }

  .fans-count {
    font-size: 24px;
    margin: 10px 0;
  }

  .stat-title {
    font-size: 14px;
  }

  .floating-login-btn i {
    font-size: 14px;
  }

  /* 触摸设备优化 */
  .module-card {
    -webkit-tap-highlight-color: var(--color-primary-alpha-10);
  }

  .status-indicator {
    padding: 10px 20px;
    font-size: 15px;
  }

  .status-indicator {
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
  }

  .status-indicator.clickable:hover {
    transform: none;
    box-shadow:
      0 4px 15px var(--color-primary-alpha-50),
      0 2px 8px var(--color-primary-alpha-30),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .photo-album-module,
  .message-module {
    cursor: pointer;
    -webkit-tap-highlight-color: var(--color-primary-alpha-15);
  }

  /* 优化按钮触摸体验 */
  .retry-btn {
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* 小屏手机 (≤480px) */
@media (max-width: 480px) {

  .body {
    padding: 15px 5px;
  }

  .anchor-card {
    padding: 15px;
    margin-bottom: 20px;
    border-radius: 10px;
  }

  .avatar {
    width: 60px;
    height: 60px;
  }

  .avatar-section {
    gap: 12px;
  }

  .anchor-name {
    font-size: 18px;
  }

  .anchor-id {
    font-size: 13px;
  }

  .main-content {
    gap: 12px;
  }

  .maruko-content {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .feature-body {
    min-height: 120px;
    padding: 10px;
  }

  .feature-preview {
    height: 100px;
  }

  .preview-overlay {
    padding: 8px;
    font-size: 12px;
  }

  .feature-empty .el-icon {
    font-size: 36px;
  }

  .feature-icon-large {
    width: 50px;
    height: 50px;
  }

  .feature-icon-large .el-icon {
    font-size: 22px;
  }

  .feature-desc {
    font-size: 12px;
  }

  .feature-content {
    height: 100px;
  }

  .audio-icon-large,
  .plan-icon-large {
    width: 40px;
    height: 40px;
    margin-bottom: 8px;
  }

  .audio-icon-large .el-icon,
  .plan-icon-large .el-icon {
    font-size: 20px;
  }

  .audio-title,
  .plan-title {
    font-size: 12px;
    max-width: 150px;
  }

  .module-header {
    padding: 0 12px;
  }

  .module-header h2 {
    font-size: 15px;
  }

  .module-body {
    padding: 15px 12px;
  }

  .fans-count {
    font-size: 20px;
    margin: 8px 0;
  }

  .stat-title {
    font-size: 13px;
  }

  .status-indicator {
    padding: 8px 16px;
    font-size: 14px;
  }

  .info-grid {
    gap: 12px;
  }

  .info-item .label,
  .info-item .value {
    font-size: 13px;
  }

  .section-divider {
    margin: 30px 0;
  }
}

/* 超小屏幕 (≤375px) */
@media (max-width: 375px) {
  .anchor-card {
    padding: 12px;
  }

  .avatar {
    width: 55px;
    height: 55px;
  }

  .anchor-name {
    font-size: 16px;
  }

  .anchor-id {
    font-size: 12px;
  }

  .maruko-content {
    grid-template-columns: 1fr;
  }

  .feature-body {
    min-height: 100px;
  }

  .feature-preview {
    height: 80px;
  }

  .feature-icon-large {
    width: 40px;
    height: 40px;
    margin-bottom: 10px;
  }

  .feature-icon-large .el-icon {
    font-size: 18px;
  }

  .module-header h2 {
    font-size: 14px;
  }

  .module-body {
    padding: 12px 10px;
  }

  .fans-count {
    font-size: 18px;
    margin: 6px 0;
  }

  .stat-title {
    font-size: 12px;
  }

  .retry-btn {
    padding: 8px 16px;
    font-size: 13px;
  }

  /* 小屏幕进度条优化 */
  .single-progress-bar {
    padding: 30px 4px 20px;
  }

  .stage-nodes {
    height: 35px;
    margin-bottom: -18px;
  }

  .node-badge {
    width: 22px;
    height: 22px;
    font-size: 10px;
  }

  .node-label {
    font-size: 8px;
    max-width: 35px;
  }

  .multi-count {
    font-size: 9px;
  }

  .progress-legend {
    gap: 8px;
    flex-wrap: wrap;
  }

  .legend-item {
    font-size: 10px;
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-width: 1px;
  }

  /* 小屏幕悬浮提示 */
  .gift-tooltip-multi {
    max-width: 200px;
  }

  .tooltip-title {
    font-size: 11px;
  }

  .tooltip-gift-item {
    padding: 6px 8px;
    margin-bottom: 8px;
  }

  .tooltip-gift-item:last-child {
    margin-bottom: 0;
  }

  .tooltip-gift-item .tooltip-header {
    font-size: 10px;
  }

  .tooltip-gift-name {
    font-size: 11px;
  }

  .tooltip-gift-content {
    font-size: 9px;
  }

  .tooltip-status-tag {
    font-size: 9px;
    height: 16px;
    padding: 0 4px;
  }
}

/* 横屏手机适配 */
@media screen and (max-width: 896px) and (orientation: landscape) {

  .body {
    padding: 10px 5px;
  }

  .anchor-card {
    padding: 12px;
    margin-bottom: 15px;
  }

  .avatar {
    width: 50px;
    height: 50px;
  }

  .anchor-name {
    font-size: 16px;
  }

  .module-header {
    padding: 0 10px;
  }

  .module-header h2 {
    font-size: 14px;
  }

  .module-body {
    padding: 10px;
  }

  .fans-count {
    font-size: 16px;
  }

  .stat-title {
    font-size: 11px;
  }

  .status-indicator {
    padding: 6px 12px;
    font-size: 13px;
  }

}

/* 主播统计数据弹窗样式 */
.stats-detail-container {
  padding: 10px;
}

.time-range-selector {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.stats-loading {
  padding: 20px;
}

.stats-empty {
  padding: 40px 20px;
}

.stats-chart-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-summary {
  display: flex;
  justify-content: space-around;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 10px;
}

.summary-item {
  text-align: center;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  display: block;
  margin-bottom: 5px;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.summary-value.positive {
  color: #67c23a;
}

.summary-value.negative {
  color: #f56c6c;
}

.chart-wrapper {
  height: 300px;
  background: #fafafa;
  border-radius: 8px;
  padding: 10px;
}

.stats-chart {
  width: 100%;
  height: 100%;
}

.stats-table-wrapper {
  margin-top: 10px;
}

/* 舰礼进度条样式 - 与页面风格统一 */
.gifts-section {
  margin-top: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
}

.gifts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
  flex-wrap: wrap;
  gap: 8px;
}

.gifts-header h4 {
  margin: 0;
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}

.gifts-stats {
  display: flex;
  gap: 16px;
  font-size: 13px;
}

.stat-current {
  color: var(--color-primary);
  font-weight: 500;
}

.stat-remain {
  color: #e6a23c;
  font-weight: 500;
}

/* 单条多阶段进度条 */
.single-progress-bar {
  position: relative;
  padding: 35px 20px 25px;
  overflow: visible;
}

/* 阶段节点 */
.stage-nodes {
  position: relative;
  height: 50px;
  margin-bottom: -25px;
  z-index: 10;
}

.stage-node {
  position: absolute;
  top: 50%;
  transform: translateX(-50%) translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.node-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #c0c4cc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #909399;
  transition: all 0.3s ease;
}

.stage-node.unlocked .node-badge {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.stage-node.current .node-badge {
  background: #fff;
  border-color: #e6a23c;
  color: #e6a23c;
  box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2);
  animation: pulse-current 2s infinite;
}

@keyframes pulse-current {
  0%, 100% { box-shadow: 0 0 0 3px rgba(230, 162, 60, 0.2); }
  50% { box-shadow: 0 0 0 6px rgba(230, 162, 60, 0.1); }
}

.node-label {
  font-size: 11px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}

.stage-node.unlocked .node-label {
  color: var(--color-primary);
}

.stage-node.current .node-label {
  color: #e6a23c;
  font-weight: 600;
}

/* 礼物类型颜色区分 */
/* 礼物类型颜色区分 - 未解锁状态 */
.stage-node.type-captain .node-badge {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}

.stage-node.type-commander .node-badge {
  border-color: #e6a23c;
  color: #e6a23c;
  background: #fdf6ec;
}

.stage-node.type-governor .node-badge {
  border-color: #f56c6c;
  color: #f56c6c;
  background: #fef0f0;
}

/* 礼物类型颜色区分 - 已解锁状态 */
.stage-node.type-captain.unlocked .node-badge {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}

.stage-node.type-commander.unlocked .node-badge {
  background: #e6a23c;
  border-color: #e6a23c;
  color: #fff;
}

.stage-node.type-governor.unlocked .node-badge {
  background: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}

/* 多礼物节点样式 */
.stage-node.multi-gifts .node-badge {
  background: linear-gradient(135deg, #409eff 33%, #e6a23c 33%, #e6a23c 66%, #f56c6c 66%);
  border-color: #909399;
  color: #fff;
}

.stage-node.multi-gifts.unlocked .node-badge {
  background: linear-gradient(135deg, #409eff 33%, #e6a23c 33%, #e6a23c 66%, #f56c6c 66%);
  border-color: #67c23a;
}

.multi-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.multi-count {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

/* 多礼物悬浮提示 */
.gift-tooltip-multi,
.gift-tooltip-content {
  max-width: 280px;
  max-height: 350px;
  overflow: hidden;
}

.gift-tooltip-multi > .tooltip-title,
.gift-tooltip-content > .tooltip-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

/* tooltip 礼物列表滚动区域 */
.tooltip-gifts-wrapper {
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}

/* 自定义滚动条样式 */
.tooltip-gifts-wrapper::-webkit-scrollbar {
  width: 4px;
}

.tooltip-gifts-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

.tooltip-gifts-wrapper::-webkit-scrollbar-thumb {
  background: #c0c4cc;
  border-radius: 2px;
}

.tooltip-gifts-wrapper::-webkit-scrollbar-thumb:hover {
  background: #909399;
}



.tooltip-gift-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
}

/* 舰礼日期状态样式 */
.tooltip-gift-date {
  margin-top: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.gift-date-whole_month {
  color: #67c23a;
}

.gift-date-active {
  color: #67c23a;
  font-weight: 600;
}

.gift-date-upcoming {
  color: #e6a23c;
}

.gift-date-expired {
  color: #909399;
  text-decoration: line-through;
}

.tooltip-gift-item .tooltip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ebeef5;
  font-size: 12px;
  font-weight: 600;
}

.tooltip-status-tag {
  margin-left: auto;
  font-size: 10px;
  height: 18px;
  padding: 0 6px;
}

.tooltip-gift-name {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.tooltip-gift-content {
  font-size: 11px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 4px;
}

/* 图例 */
.progress-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #e4e7ed;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid;
}

.legend-dot.type-captain {
  border-color: #409eff;
  background: #ecf5ff;
}

.legend-dot.type-commander {
  border-color: #e6a23c;
  background: #fdf6ec;
}

.legend-dot.type-governor {
  border-color: #f56c6c;
  background: #fef0f0;
}

/* 礼物悬浮提示 */
.gift-tooltip-multi {
  max-width: 280px;
}

.gift-tooltip-multi > .tooltip-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.tooltip-gifts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.tooltip-gift-item {
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 6px;
  border-left: 3px solid #dcdfe6;
  margin-bottom: 10px;
}

.tooltip-gift-item:last-child {
  margin-bottom: 0;
}

.tooltip-gift-item:nth-child(3n+1) {
  border-left-color: #409eff;
}

.tooltip-gift-item:nth-child(3n+2) {
  border-left-color: #e6a23c;
}

.tooltip-gift-item:nth-child(3n+3) {
  border-left-color: #f56c6c;
}

/* 进度条轨道 */
.progress-track {
  position: relative;
  height: 10px;
  background: #e4e7ed;
  border-radius: 5px;
  overflow: visible;
}

.progress-completed {
  height: 100%;
  background: var(--color-primary);
  border-radius: 5px;
  transition: width 0.5s ease;
}

/* 当前位置标记 - 在进度条下方 */
.current-marker {
  position: absolute;
  top: 100%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 8px;
  z-index: 20;
  min-width: 40px;
}

/* 当标记在左侧边缘时，调整位置 */
.current-marker[style*="left: 0%"] {
  transform: translateX(0);
  align-items: flex-start;
}

.current-marker[style*="left: 100%"] {
  transform: translateX(-100%);
  align-items: flex-end;
}

.marker-triangle {
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 8px solid var(--color-primary);
}

.marker-label {
  padding: 3px 10px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 舰礼详情 - 卡片式步骤 */
.gifts-cards {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed #dcdfe6;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gift-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: #f5f7fa;
  border-radius: 10px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.gift-card.unlocked {
  background: #f0f9ff;
  border-color: var(--color-primary);
}

.gift-card.current {
  background: #fdf6ec;
  border-color: #e6a23c;
  box-shadow: 0 0 0 2px rgba(230, 162, 60, 0.2);
}

.gift-card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.gift-step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #dcdfe6;
  color: #606266;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gift-card.unlocked .gift-step-num {
  background: var(--color-primary);
  color: #fff;
}

.gift-card.current .gift-step-num {
  background: #e6a23c;
  color: #fff;
}

.gift-status-icon {
  font-size: 16px;
  color: #c0c4cc;
}

.gift-card.unlocked .gift-status-icon {
  color: var(--color-primary);
}

.gift-card.current .gift-status-icon {
  color: #e6a23c;
}

.gift-card-body {
  flex: 1;
  min-width: 0;
}

.gift-card-body .gift-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.gift-card-body .gift-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
  margin-bottom: 8px;
  word-break: break-all;
}

.gift-card-body .gift-tag {
  font-size: 12px;
}

/* 查看舰礼详情按钮 */
.gifts-view-more {
  margin-top: 16px;
  text-align: center;
}

/* 舰礼详情弹窗样式 */
.gifts-detail-dialog {
  max-height: 85vh !important;
}

.gifts-detail-dialog .el-dialog__body {
  padding: 20px;
  overflow: hidden;
}

.gifts-detail-content {
  padding-right: 8px;
}

.gifts-overview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 10px;
  margin-bottom: 20px;
}

.overview-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.overview-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.progress-mode-switch {
  .el-radio-button__inner {
    padding: 4px 12px;
    font-size: 12px;
  }
}

.overview-center .overview-progress {
  width: 100%;
  max-width: 400px;
}

.overview-stat .overview-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.overview-stat .overview-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-primary);
}

.overview-progress {
  flex: 1;
}

.overview-target {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;
}

.overview-target .overview-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.overview-target .overview-value {
  font-size: 18px;
  font-weight: 700;
  color: #e6a23c;
}

.overview-target .overview-remain {
  font-size: 11px;
  color: #f56c6c;
}

@media (max-width: 600px) {
  .single-progress-bar {
    padding: 35px 8px 25px;
  }

  .stage-nodes {
    height: 40px;
    margin-bottom: -20px;
  }

  .node-badge {
    width: 26px;
    height: 26px;
    font-size: 11px;
  }

  .node-label {
    font-size: 9px;
    max-width: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .multi-count {
    font-size: 11px;
  }

  .current-marker {
    margin-top: 6px;
  }

  .marker-label {
    font-size: 10px;
    padding: 2px 6px;
  }

  .progress-legend {
    gap: 12px;
    margin-top: 12px;
  }

  .legend-item {
    font-size: 11px;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
  }

  .gifts-stats {
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
  }

  .gift-name {
    font-size: 13px;
  }

  /* 手机端悬浮提示优化 */
  .gift-tooltip-multi {
    max-width: 240px;
  }

  .tooltip-gifts-list {
    max-height: 200px;
  }

  .tooltip-gift-item {
    padding: 8px 10px;
    margin-bottom: 8px;
  }

  .tooltip-gift-item:last-child {
    margin-bottom: 0;
  }

  .tooltip-gift-name {
    font-size: 12px;
  }

  .tooltip-gift-content {
    font-size: 10px;
  }
}

/* 舰礼类型分组样式 */
.gifts-by-type {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.gift-type-section {
  background: #fafafa;
  border-radius: 10px;
  padding: 16px;
  border-left: 4px solid;
}

.gift-type-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 16px;
}

.gift-type-header .type-name {
  flex: 1;
}

.gift-type-header .count-tag {
  font-weight: 600;
  border-radius: 10px;
  padding: 0 10px;
  height: 22px;
  line-height: 20px;
}

/* ========== 补充手机端适配 ========== */
@media (max-width: 768px) {
  /* 视频预览模块手机端适配 */
  .video-preview {
    height: 160px;
  }

  .video-preview .preview-overlay {
    padding: 8px;
  }

  .video-preview .preview-label {
    font-size: 10px;
    padding: 2px 6px;
    background: rgba(255, 215, 0, 0.9);
    border-radius: 3px;
    display: inline-block;
    margin-bottom: 4px;
  }

  .video-preview .preview-title {
    font-size: 12px;
  }

  /* 功能模块手机端优化 */
  .feature-module {
    -webkit-tap-highlight-color: var(--color-primary-alpha-10);
  }

  .feature-module:active {
    transform: scale(0.98);
  }

  /* 统计图表弹窗手机端适配 */
  .stats-detail-dialog {
    width: 95vw !important;
    max-height: 80vh !important;
  }

  .stats-detail-dialog .el-dialog__body {
    padding: 12px;
  }

  .chart-wrapper {
    height: 250px;
    padding: 8px;
  }

  .stats-summary {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 8px 0;
    border-bottom: 1px solid #e4e7ed;
  }

  .summary-item:last-child {
    border-bottom: none;
  }

  .summary-label {
    font-size: 13px;
    margin-bottom: 0;
  }

  .summary-value {
    font-size: 16px;
  }

  /* 舰礼详情弹窗手机端适配 */
  .gifts-detail-dialog {
    width: 95vw !important;
    max-height: 85vh !important;
  }

  .gifts-detail-dialog .el-dialog__body {
    padding: 12px;
  }

  .gifts-overview {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .overview-stat,
  .overview-target {
    min-width: auto;
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .overview-stat .overview-label,
  .overview-target .overview-label {
    margin-bottom: 0;
  }

  .overview-center {
    width: 100%;
    order: -1;
    padding-bottom: 12px;
    border-bottom: 1px solid #e4e7ed;
  }

  .gift-type-section {
    padding: 12px;
  }

  .gift-type-header {
    font-size: 14px;
  }

  .gift-card {
    padding: 12px;
    gap: 10px;
  }

  .gift-card-body .gift-name {
    font-size: 14px;
  }

  .gift-card-body .gift-content {
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  /* 视频预览小屏适配 */
  .video-preview {
    height: 130px;
  }

  .video-preview .preview-title {
    font-size: 11px;
  }

  /* 功能模块小屏优化 */
  .feature-body {
    min-height: 100px;
    padding: 8px;
  }

  .feature-preview {
    height: 90px;
  }

  .preview-overlay {
    padding: 6px;
    font-size: 11px;
  }

  .preview-label {
    font-size: 9px;
  }

  .preview-title {
    font-size: 11px;
  }

  /* 音频和企划模块小屏适配 */
  .audio-icon-large,
  .plan-icon-large {
    width: 36px;
    height: 36px;
    margin-bottom: 6px;
  }

  .audio-icon-large .el-icon,
  .plan-icon-large .el-icon {
    font-size: 18px;
  }

  .audio-title,
  .plan-title {
    font-size: 11px;
    max-width: 120px;
  }

  .audio-label,
  .plan-label {
    font-size: 10px;
  }

  /* 图表小屏适配 */
  .chart-wrapper {
    height: 200px;
  }

  /* 舰礼进度条小屏适配 */
  .gifts-section {
    padding: 12px;
    margin-top: 16px;
  }

  .gifts-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }

  .gifts-header h4 {
    font-size: 14px;
  }

  .single-progress-bar {
    padding: 30px 12px 20px;
  }

  .stage-nodes {
    height: 40px;
    margin-bottom: -20px;
  }

  .node-badge {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }

  .node-label {
    font-size: 9px;
    max-width: 50px;
  }

  .marker-label {
    font-size: 10px;
    padding: 2px 6px;
  }

  .progress-legend {
    gap: 12px;
    margin-top: 12px;
    padding-top: 10px;
  }

  .legend-item {
    font-size: 11px;
  }

  .legend-dot {
    width: 10px;
    height: 10px;
  }

  .gift-card {
    padding: 10px;
  }

  .gift-step-num {
    width: 22px;
    height: 22px;
    font-size: 12px;
  }

  .gift-status-icon {
    font-size: 14px;
  }
}

@media (max-width: 375px) {
  .video-preview {
    height: 110px;
  }

  .feature-preview {
    height: 80px;
  }

  .chart-wrapper {
    height: 180px;
  }

  .single-progress-bar {
    padding: 25px 8px 18px;
  }

  .node-badge {
    width: 22px;
    height: 22px;
    font-size: 9px;
  }

  .node-label {
    font-size: 8px;
    max-width: 40px;
  }
}
</style>