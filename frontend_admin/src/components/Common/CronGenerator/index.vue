<template>
  <div class="cron-generator">
    <div class="cron-tabs">
      <el-radio-group v-model="activeTab" size="small">
        <el-radio-button label="second">秒</el-radio-button>
        <el-radio-button label="minute">分</el-radio-button>
        <el-radio-button label="hour">时</el-radio-button>
        <el-radio-button label="day">日</el-radio-button>
        <el-radio-button label="month">月</el-radio-button>
        <el-radio-button label="week">周</el-radio-button>
      </el-radio-group>
    </div>

    <div class="cron-content">
      <!-- 秒 -->
      <div v-show="activeTab === 'second'" class="tab-panel">
        <el-radio-group v-model="second.type" class="type-group">
          <el-radio label="every">每秒</el-radio>
          <el-radio label="range">范围</el-radio>
          <el-radio label="interval">间隔</el-radio>
          <el-radio label="specific">指定</el-radio>
        </el-radio-group>
        <div class="panel-content">
          <div v-if="second.type === 'every'" class="tip">每秒执行</div>
          <div v-if="second.type === 'range'" class="input-row">
            <span>从</span>
            <el-input-number v-model="second.rangeStart" :min="0" :max="59" size="small" />
            <span>到</span>
            <el-input-number v-model="second.rangeEnd" :min="0" :max="59" size="small" />
            <span>秒</span>
          </div>
          <div v-if="second.type === 'interval'" class="input-row">
            <span>从</span>
            <el-input-number v-model="second.intervalStart" :min="0" :max="59" size="small" />
            <span>秒开始，每</span>
            <el-input-number v-model="second.intervalStep" :min="1" :max="59" size="small" />
            <span>秒执行</span>
          </div>
          <div v-if="second.type === 'specific'" class="checkbox-group">
            <el-checkbox-group v-model="second.specific">
              <el-checkbox v-for="n in 60" :key="n-1" :label="n-1">{{ n-1 }}</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>

      <!-- 分 -->
      <div v-show="activeTab === 'minute'" class="tab-panel">
        <el-radio-group v-model="minute.type" class="type-group">
          <el-radio label="every">每分</el-radio>
          <el-radio label="range">范围</el-radio>
          <el-radio label="interval">间隔</el-radio>
          <el-radio label="specific">指定</el-radio>
        </el-radio-group>
        <div class="panel-content">
          <div v-if="minute.type === 'every'" class="tip">每分执行</div>
          <div v-if="minute.type === 'range'" class="input-row">
            <span>从</span>
            <el-input-number v-model="minute.rangeStart" :min="0" :max="59" size="small" />
            <span>到</span>
            <el-input-number v-model="minute.rangeEnd" :min="0" :max="59" size="small" />
            <span>分</span>
          </div>
          <div v-if="minute.type === 'interval'" class="input-row">
            <span>从</span>
            <el-input-number v-model="minute.intervalStart" :min="0" :max="59" size="small" />
            <span>分开始，每</span>
            <el-input-number v-model="minute.intervalStep" :min="1" :max="59" size="small" />
            <span>分执行</span>
          </div>
          <div v-if="minute.type === 'specific'" class="checkbox-group">
            <el-checkbox-group v-model="minute.specific">
              <el-checkbox v-for="n in 60" :key="n-1" :label="n-1">{{ n-1 }}</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>

      <!-- 时 -->
      <div v-show="activeTab === 'hour'" class="tab-panel">
        <el-radio-group v-model="hour.type" class="type-group">
          <el-radio label="every">每小时</el-radio>
          <el-radio label="range">范围</el-radio>
          <el-radio label="interval">间隔</el-radio>
          <el-radio label="specific">指定</el-radio>
        </el-radio-group>
        <div class="panel-content">
          <div v-if="hour.type === 'every'" class="tip">每小时执行</div>
          <div v-if="hour.type === 'range'" class="input-row">
            <span>从</span>
            <el-input-number v-model="hour.rangeStart" :min="0" :max="23" size="small" />
            <span>到</span>
            <el-input-number v-model="hour.rangeEnd" :min="0" :max="23" size="small" />
            <span>时</span>
          </div>
          <div v-if="hour.type === 'interval'" class="input-row">
            <span>从</span>
            <el-input-number v-model="hour.intervalStart" :min="0" :max="23" size="small" />
            <span>时开始，每</span>
            <el-input-number v-model="hour.intervalStep" :min="1" :max="23" size="small" />
            <span>时执行</span>
          </div>
          <div v-if="hour.type === 'specific'" class="checkbox-group">
            <el-checkbox-group v-model="hour.specific">
              <el-checkbox v-for="n in 24" :key="n-1" :label="n-1">{{ n-1 }}</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>

      <!-- 日 -->
      <div v-show="activeTab === 'day'" class="tab-panel">
        <el-radio-group v-model="day.type" class="type-group">
          <el-radio label="every">每日</el-radio>
          <el-radio label="range">范围</el-radio>
          <el-radio label="interval">间隔</el-radio>
          <el-radio label="specific">指定</el-radio>
          <el-radio label="not">不指定</el-radio>
          <el-radio label="last">最后一日</el-radio>
        </el-radio-group>
        <div class="panel-content">
          <div v-if="day.type === 'every'" class="tip">每日执行</div>
          <div v-if="day.type === 'not'" class="tip">不指定（配合周使用）</div>
          <div v-if="day.type === 'last'" class="tip">每月最后一日执行</div>
          <div v-if="day.type === 'range'" class="input-row">
            <span>从</span>
            <el-input-number v-model="day.rangeStart" :min="1" :max="31" size="small" />
            <span>到</span>
            <el-input-number v-model="day.rangeEnd" :min="1" :max="31" size="small" />
            <span>日</span>
          </div>
          <div v-if="day.type === 'interval'" class="input-row">
            <span>从</span>
            <el-input-number v-model="day.intervalStart" :min="1" :max="31" size="small" />
            <span>日开始，每</span>
            <el-input-number v-model="day.intervalStep" :min="1" :max="31" size="small" />
            <span>日执行</span>
          </div>
          <div v-if="day.type === 'specific'" class="checkbox-group">
            <el-checkbox-group v-model="day.specific">
              <el-checkbox v-for="n in 31" :key="n" :label="n">{{ n }}</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>

      <!-- 月 -->
      <div v-show="activeTab === 'month'" class="tab-panel">
        <el-radio-group v-model="month.type" class="type-group">
          <el-radio label="every">每月</el-radio>
          <el-radio label="range">范围</el-radio>
          <el-radio label="interval">间隔</el-radio>
          <el-radio label="specific">指定</el-radio>
        </el-radio-group>
        <div class="panel-content">
          <div v-if="month.type === 'every'" class="tip">每月执行</div>
          <div v-if="month.type === 'range'" class="input-row">
            <span>从</span>
            <el-input-number v-model="month.rangeStart" :min="1" :max="12" size="small" />
            <span>到</span>
            <el-input-number v-model="month.rangeEnd" :min="1" :max="12" size="small" />
            <span>月</span>
          </div>
          <div v-if="month.type === 'interval'" class="input-row">
            <span>从</span>
            <el-input-number v-model="month.intervalStart" :min="1" :max="12" size="small" />
            <span>月开始，每</span>
            <el-input-number v-model="month.intervalStep" :min="1" :max="12" size="small" />
            <span>月执行</span>
          </div>
          <div v-if="month.type === 'specific'" class="checkbox-group">
            <el-checkbox-group v-model="month.specific">
              <el-checkbox v-for="n in 12" :key="n" :label="n">{{ n }}月</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>

      <!-- 周 -->
      <div v-show="activeTab === 'week'" class="tab-panel">
        <el-radio-group v-model="week.type" class="type-group">
          <el-radio label="every">每周</el-radio>
          <el-radio label="specific">指定</el-radio>
          <el-radio label="not">不指定</el-radio>
        </el-radio-group>
        <div class="panel-content">
          <div v-if="week.type === 'every'" class="tip">每周执行</div>
          <div v-if="week.type === 'not'" class="tip">不指定（配合日使用）</div>
          <div v-if="week.type === 'specific'" class="checkbox-group">
            <el-checkbox-group v-model="week.specific">
              <el-checkbox :label="1">周日</el-checkbox>
              <el-checkbox :label="2">周一</el-checkbox>
              <el-checkbox :label="3">周二</el-checkbox>
              <el-checkbox :label="4">周三</el-checkbox>
              <el-checkbox :label="5">周四</el-checkbox>
              <el-checkbox :label="6">周五</el-checkbox>
              <el-checkbox :label="7">周六</el-checkbox>
            </el-checkbox-group>
          </div>
        </div>
      </div>
    </div>

    <div class="cron-result">
      <div class="result-header">
        <span class="result-label">生成的 Cron 表达式</span>
        <el-button type="primary" size="small" @click="handleConfirm">使用此表达式</el-button>
      </div>
      <div class="result-content">
        <code class="cron-expression">{{ cronExpression }}</code>
        <div class="cron-desc">{{ cronDescription }}</div>
      </div>
    </div>

    <div class="cron-presets">
      <div class="presets-header">常用表达式</div>
      <div class="presets-list">
        <el-tag 
          v-for="preset in presets" 
          :key="preset.value"
          class="preset-tag"
          @click="applyPreset(preset.value)"
        >
          {{ preset.label }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: '0 0 * * * *'
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const activeTab = ref('second')

// 秒
const second = ref({
  type: 'every',
  rangeStart: 0,
  rangeEnd: 59,
  intervalStart: 0,
  intervalStep: 1,
  specific: []
})

// 分
const minute = ref({
  type: 'every',
  rangeStart: 0,
  rangeEnd: 59,
  intervalStart: 0,
  intervalStep: 1,
  specific: []
})

// 时
const hour = ref({
  type: 'every',
  rangeStart: 0,
  rangeEnd: 23,
  intervalStart: 0,
  intervalStep: 1,
  specific: []
})

// 日
const day = ref({
  type: 'every',
  rangeStart: 1,
  rangeEnd: 31,
  intervalStart: 1,
  intervalStep: 1,
  specific: []
})

// 月
const month = ref({
  type: 'every',
  rangeStart: 1,
  rangeEnd: 12,
  intervalStart: 1,
  intervalStep: 1,
  specific: []
})

// 周
const week = ref({
  type: 'not',
  specific: []
})

// 常用预设
const presets = [
  { label: '每秒', value: '* * * * * *' },
  { label: '每分钟', value: '0 * * * * *' },
  { label: '每小时', value: '0 0 * * * *' },
  { label: '每天0点', value: '0 0 0 * * *' },
  { label: '每天3点', value: '0 0 3 * * *' },
  { label: '每天4点', value: '0 0 4 * * *' },
  { label: '每周一0点', value: '0 0 0 * * 1' },
  { label: '每月1日0点', value: '0 0 0 1 * *' }
]

// 生成表达式
const generateField = (field) => {
  switch (field.type) {
    case 'every':
      return '*'
    case 'range':
      return `${field.rangeStart}-${field.rangeEnd}`
    case 'interval':
      return `${field.intervalStart}/${field.intervalStep}`
    case 'specific':
      return field.specific.length > 0 ? field.specific.sort((a, b) => a - b).join(',') : '*'
    case 'not':
      return '?'
    case 'last':
      return 'L'
    default:
      return '*'
  }
}

const cronExpression = computed(() => {
  const s = generateField(second.value)
  const m = generateField(minute.value)
  const h = generateField(hour.value)
  const d = generateField(day.value)
  const mo = generateField(month.value)
  const w = generateField(week.value)
  return `${s} ${m} ${h} ${d} ${mo} ${w}`
})

// 解析表达式
const parseExpression = (expr) => {
  const parts = expr.split(' ')
  if (parts.length !== 6) return

  const parseField = (value, field) => {
    if (value === '*') {
      field.type = 'every'
    } else if (value === '?') {
      field.type = 'not'
    } else if (value === 'L') {
      field.type = 'last'
    } else if (value.includes('-')) {
      const [start, end] = value.split('-').map(Number)
      field.type = 'range'
      field.rangeStart = start
      field.rangeEnd = end
    } else if (value.includes('/')) {
      const [start, step] = value.split('/').map(Number)
      field.type = 'interval'
      field.intervalStart = start
      field.intervalStep = step
    } else if (value.includes(',')) {
      field.type = 'specific'
      field.specific = value.split(',').map(Number)
    } else {
      field.type = 'specific'
      field.specific = [Number(value)]
    }
  }

  parseField(parts[0], second.value)
  parseField(parts[1], minute.value)
  parseField(parts[2], hour.value)
  parseField(parts[3], day.value)
  parseField(parts[4], month.value)
  parseField(parts[5], week.value)
}

// 监听输入变化
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    parseExpression(newVal)
  }
}, { immediate: true })

// 生成描述
const cronDescription = computed(() => {
  const parts = cronExpression.value.split(' ')
  const desc = []

  // 解析秒
  if (parts[0] !== '0') {
    if (parts[0] === '*') desc.push('每秒')
    else desc.push(`第 ${parts[0]} 秒`)
  }

  // 解析分
  if (parts[1] === '*') desc.push('每分')
  else if (parts[1] !== '0') desc.push(`第 ${parts[1]} 分`)

  // 解析时
  if (parts[2] === '*') desc.push('每小时')
  else desc.push(`${parts[2]} 点`)

  // 解析日
  if (parts[3] === '*') desc.push('每日')
  else if (parts[3] === 'L') desc.push('每月最后一日')
  else desc.push(`${parts[3]} 日`)

  // 解析月
  if (parts[4] === '*') desc.push('每月')
  else desc.push(`${parts[4]} 月`)

  // 解析周
  if (parts[5] !== '?' && parts[5] !== '*') {
    const weekMap = { 1: '周日', 2: '周一', 3: '周二', 4: '周三', 5: '周四', 6: '周五', 7: '周六' }
    desc.push(weekMap[parts[5]] || `周${parts[5]}`)
  }

  return desc.join('，') || '每秒执行'
})

// 应用预设
const applyPreset = (value) => {
  parseExpression(value)
}

// 确认使用
const handleConfirm = () => {
  emit('update:modelValue', cronExpression.value)
  emit('confirm', cronExpression.value)
}
</script>

<style scoped>
.cron-generator {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.cron-tabs {
  margin-bottom: 16px;
}

.cron-content {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}

.tab-panel {
  min-height: 120px;
}

.type-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.panel-content {
  padding: 8px 0;
}

.tip {
  color: #909399;
  font-size: 14px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.input-row span {
  color: #606266;
}

.checkbox-group {
  max-height: 150px;
  overflow-y: auto;
}

.checkbox-group :deep(.el-checkbox) {
  margin-right: 16px;
  margin-bottom: 8px;
}

.cron-result {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-label {
  font-weight: 500;
  color: #303133;
}

.result-content {
  background: #f5f7fa;
  border-radius: 4px;
  padding: 12px;
}

.cron-expression {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 8px;
  font-family: 'Courier New', monospace;
}

.cron-desc {
  color: #606266;
  font-size: 13px;
}

.cron-presets {
  background: #fff;
  border-radius: 4px;
  padding: 16px;
}

.presets-header {
  font-weight: 500;
  color: #303133;
  margin-bottom: 12px;
}

.presets-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preset-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.preset-tag:hover {
  background-color: #409eff;
  color: #fff;
}
</style>
