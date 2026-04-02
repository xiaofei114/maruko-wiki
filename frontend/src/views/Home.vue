<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getRoomInfo, getMasterInfo, getTopListNew, getLiveDuration } from '@/api/bilibiliApis.js'

const router = useRouter()

// 响应式数据
const loading = ref(true)
const error = ref(null)
const anchorName = ref('猫丸子Maruko') // 可以在这里修改为主播名字
const defaultAvatar = ref("https://i2.hdslb.com/bfs/face/037080004e33990818de22a63394c7de53c0e92c.jpg")
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

// 直播详情弹窗相关
const showLiveDetailDialog = ref(false)
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const selectedDate = ref(null)
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const calendarDays = ref([])

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

// 组件挂载后获取直播间信息
onMounted(async () => {
  // 获取当前月份的直播记录
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
  await fetchLiveRecords(monthStr)
  
  //每分钟获取一次
  setInterval(fetchRoomInfo, 60000)
  getUserInfo(true)
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
            <el-button type="text" size="small" @click="showLiveDetailDialog = true" style="color: #409eff;">查看详细</el-button>
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
              <div v-else-if="90 - liveHours > 0 && calculateRemainingEffectiveDays() <= 0" style="font-size: 13px;color: #409eff;">
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
                    <span class="value" style="color: #409eff; font-weight: 600;">{{ formatSessionDuration(session.startTime, session.endTime) }}</span>
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

          <div class="module-card photo-album-module" @click="goTo('/plan-document', true)" style="cursor: pointer;">
            <div class="module-header">
              <h2>企划表</h2>
            </div>
            <div class="module-body">
              <div class="album-content">
                <div class="album-placeholder">
                  <p>查看和管理企划文档，规划未来方向</p>
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
  color: #409eff;
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
  border-top: 5px solid #409eff;
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
  background: #409eff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.retry-btn:hover {
  background: #337ecc;
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
  border: 3px solid #409eff;
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.3);
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
  color: #409eff;
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
  box-shadow: 0 12px 25px rgba(64, 158, 255, 0.15);
  border-color: rgba(64, 158, 255, 0.2);
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
  color: #409eff;
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
  color: #409eff;
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
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.calendar-day.other-month {
  color: #c0c4cc;
  background: #fafafa;
}

.calendar-day.current-day {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  color: #000;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
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
  border-left: 4px solid #409eff;
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
    linear-gradient(135deg, rgba(64, 158, 255, 0.7) 0%, rgba(102, 177, 255, 0.6) 50%, rgba(64, 158, 255, 0.7) 100%),
    linear-gradient(135deg, rgba(64, 158, 255, 0.1) 0%, rgba(102, 177, 255, 0.2) 100%);
  background-size: 200% 200%, 100% 100%;
  background-blend-mode: normal;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow:
    0 4px 15px rgba(64, 158, 255, 0.4),
    0 2px 8px rgba(64, 158, 255, 0.2),
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
    0 8px 25px rgba(64, 158, 255, 0.6),
    0 4px 15px rgba(64, 158, 255, 0.4),
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
  color: #409eff;
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
  color: #409eff;
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
  color: #409eff;
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
  background: linear-gradient(90deg, transparent 0%, #409eff 20%, #409eff 80%, transparent 100%);
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
    -webkit-tap-highlight-color: rgba(64, 158, 255, 0.1);
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
      0 4px 15px rgba(64, 158, 255, 0.5),
      0 2px 8px rgba(64, 158, 255, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .photo-album-module,
  .message-module {
    cursor: pointer;
    -webkit-tap-highlight-color: rgba(64, 158, 255, 0.15);
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
</style>