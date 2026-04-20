<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getRoomInfo, getMasterInfo, getTopListNew, getLiveDuration } from '@/api/bilibiliApis.js'
import { Check, CircleCheckFilled, Present, UserFilled, Timer, Loading, Lock } from '@element-plus/icons-vue'
import { getAnchorStats } from '@/api/anchorStats.js'
import { getCurrentMonthGifts } from '@/api/captainGift.js'

const router = useRouter()

// 响应式数据
const loading = ref(true)
const error = ref(null)
const anchorName = ref('猫丸子Maruko') // 可以在这里修改为主播名字
const defaultAvatar = ref("")
const roomInfo = ref({})
const captain = ref(0)
const requiredEffectiveDays = 22 // 每月需要的有效天数

// 计算本月总直播时长（精确到分钟）
const liveHours = computed(() => {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() // 0-based
  
  // 本月开始和结束时间戳
  const monthStart = new Date(currentYear, currentMonth, 1, 0, 0, 0).getTime()
  const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime()
  
  let totalMinutes = 0
  
  liveRecords.value.forEach(session => {
    // 处理正在直播的情况（endTime为null）
    const sessionEndTime = session.endTime || Date.now()
    
    // 计算该直播在本月内的实际时间段
    // 取直播时间段和本月时间段的交集
    const effectiveStartTime = Math.max(session.startTime, monthStart)
    const effectiveEndTime = Math.min(sessionEndTime, monthEnd)
    
    // 如果直播在本月内有有效时间段
    if (effectiveStartTime < effectiveEndTime) {
      const duration = Math.floor((effectiveEndTime - effectiveStartTime) / (1000 * 60))
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

// 按目标舰长数排序的舰礼列表（基础舰礼排在最前面）
const sortedGifts = computed(() => {
  return [...captainGifts.value].sort((a, b) => {
    // 基础舰礼（requiredFansCount === 0）排在最前面
    if (a.requiredFansCount === 0) return -1
    if (b.requiredFansCount === 0) return 1
    return a.requiredFansCount - b.requiredFansCount
  })
})

// 最大目标舰长数（用于计算进度条位置）
const maxTargetCount = computed(() => {
  if (sortedGifts.value.length === 0) return 0
  const max = sortedGifts.value[sortedGifts.value.length - 1].requiredFansCount
  return Math.max(max, maxCaptainCount.value)
})

// 总体进度百分比
const overallProgress = computed(() => {
  if (maxTargetCount.value === 0) return 0
  return Math.min(100, Math.round((maxCaptainCount.value / maxTargetCount.value) * 100))
})

// 判断舰礼是否已解锁
const isGiftUnlocked = (gift) => {
  return gift.requiredFansCount === 0 || maxCaptainCount.value >= gift.requiredFansCount
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
  if (maxCaptainCount.value >= gift.requiredFansCount) return 100
  return Math.round((maxCaptainCount.value / gift.requiredFansCount) * 100)
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

const goTo = (url, isRoute) => {
  if (isRoute) router.push(url)
  else window.open(url, '_blank')
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

    console.log({
      roomInfo: roomInfo.value,
      captain: captain.value,
    });

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
      // 使用当前实时舰长数
      maxCaptainCount.value = captain.value
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

// 切换时间范围
const changeStatsTimeRange = async (range) => {
  statsTimeRange.value = range
  await fetchStatsData()
}

// 组件挂载后获取直播间信息
onMounted(async () => {
  // 获取当前月份的直播记录
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  await fetchLiveRecords(monthStr)
  
  //每分钟获取一次
  setInterval(fetchRoomInfo, 60000)
  await getUserInfo(true)
  
  // 获取舰礼信息（需要在 getUserInfo 之后，因为要用到 captain 值）
  await fetchCaptainGifts()
  
  generateCalendar()
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
          @click="goTo('https://space.bilibili.com/3546938511198692', false)">进入主页</el-button>
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
              <div class="month-selector">
                <el-button @click="changeMonth(-1)">上一月</el-button>
                <span class="current-month">{{ currentYear }}年{{ currentMonth }}月</span>
                <el-button @click="changeMonth(1)">下一月</el-button>
              </div>
              <div class="month-stats">
                <div class="month-total">本月总时长：{{ formatLiveTime(calculateMonthTotal()) }}</div>
                <div class="month-effective">有效天数：{{ calculateEffectiveDays() }}/{{ requiredEffectiveDays }}</div>
                <div class="month-remaining">还差：{{ calculateRemainingEffectiveDays() }} 天有效天</div>
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
                  <span class="overview-label">当前舰长</span>
                  <span class="overview-value">{{ maxCaptainCount }}</span>
                </div>
                <div class="overview-progress">
                  <el-progress 
                    :percentage="overallProgress" 
                    :stroke-width="12"
                    :show-text="false"
                    :color="overallProgress >= 100 ? '#67c23a' : '#e6a23c'"
                  />
                </div>
                <div class="overview-target" v-if="nextTargetGift">
                  <span class="overview-label">下一目标</span>
                  <span class="overview-value">{{ nextTargetGift.requiredFansCount }}</span>
                  <span class="overview-remain">(还差 {{ nextTargetGift.requiredFansCount - maxCaptainCount }})</span>
                </div>
              </div>

              <!-- 单条多阶段进度条 -->
              <div class="single-progress-bar">
                <!-- 阶段节点 -->
                <div class="stage-nodes">
                  <div
                    v-for="(gift, index) in sortedGifts"
                    :key="gift.id"
                    class="stage-node"
                    :class="{
                      'unlocked': isGiftUnlocked(gift),
                      'current': isNextTarget(gift)
                    }"
                    :style="{ left: getStagePosition(gift) + '%' }"
                  >
                    <div class="node-badge">
                      <el-icon v-if="isGiftUnlocked(gift)"><Check /></el-icon>
                      <span v-else>{{ index + 1 }}</span>
                    </div>
                    <div class="node-label">{{ gift.requiredFansCount === 0 ? '基础' : gift.requiredFansCount }}</div>
                  </div>
                </div>

                <!-- 进度条背景 -->
                <div class="progress-track">
                  <div class="progress-completed" :style="{ width: overallProgress + '%' }"></div>
                </div>
                
                <!-- 当前位置标记（在进度条下方） -->
                <div class="current-marker" :style="{ left: overallProgress + '%' }" v-if="overallProgress < 100">
                  <div class="marker-triangle"></div>
                  <div class="marker-label">{{ maxCaptainCount }}</div>
                </div>
              </div>

              <!-- 舰礼卡片列表 -->
              <div class="gifts-cards">
                <div
                  v-for="(gift, index) in sortedGifts"
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
                    <el-tag 
                      :type="isGiftUnlocked(gift) ? 'success' : (isNextTarget(gift) ? 'warning' : 'info')" 
                      size="small"
                      class="gift-tag"
                    >
                      {{ gift.requiredFansCount === 0 ? '基础舰礼' : gift.requiredFansCount + '舰长解锁' }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </el-dialog>

        <div class="module-card status-module">
          <div class="module-header">
            <h2>直播状态</h2>
          </div>
          <img class="module-img" :src="roomInfo.user_cover" alt="直播封面">
          <div class="module-body">
            <div class="status-content">
              <div class="status-indicator clickable" @click="goTo('https://live.bilibili.com/1929354869', false)">
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

      <!-- 丸子专区 -->
      <div class="maruko-section">
        <div class="maruko-content">

          <div class="module-card photo-album-module" @click="goTo('/photo-album', true)" style="cursor: pointer;">
            <div class="module-header">
              <h2>丸子相簿</h2>
            </div>
            <div class="module-body">
              <div class="album-content">
                <div class="album-placeholder">
                  <p>记录精彩时刻，与你分享美好时光</p>
                </div>
              </div>
            </div>
          </div>

          <div class="module-card message-module" @click="goTo('/audio', true)" style="cursor: pointer;">
            <div class="module-header">
              <h2>丸子音声</h2>
            </div>
            <div class="module-body">
              <div class="message-content">
                <div class="message-placeholder">
                  <p>聆听奇妙回响，与你分享此刻欢愉</p>
                </div>
              </div>
            </div>
          </div>

          <div class="module-card message-module" @click="goTo('/plan-document', true)" style="cursor: pointer;">
            <div class="module-header">
              <h2>丸子企划</h2>
            </div>
            <div class="module-body">
              <div class="message-content">
                <div class="message-placeholder">
                  <p>绘出明日蓝图，邀你共同执笔未来</p>
                </div>
              </div>
            </div>
          </div>

          <div class="module-card photo-album-module" @click="goTo('/announcement', true)" style="cursor: pointer;">
            <div class="module-header">
              <h2>公告中心</h2>
            </div>
            <div class="module-body">
              <div class="album-content">
                <div class="album-placeholder">
                  <p>同步每份动态，与你共赴崭新旅程</p>
                </div>
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
  justify-content: space-between;
  align-items: center;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
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

.month-total {
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
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding-bottom: 10px;
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
  
  .month-total {
    font-size: 13px;
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

/* 丸子相簿样式 */
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

/* 丸子专区样式 */
.maruko-section {
  margin-top: 20px;
}

.maruko-content {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 25px;
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
    gap: 12px;
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
  top: 0;
  transform: translateX(-50%);
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
  min-width: 60px;
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
    padding: 35px 5px 25px;
  }

  .node-badge {
    width: 28px;
    height: 28px;
    font-size: 12px;
  }

  .node-label {
    font-size: 10px;
  }

  .gifts-stats {
    flex-direction: column;
    gap: 4px;
    align-items: flex-end;
  }

  .gift-name {
    font-size: 13px;
  }
}
</style>