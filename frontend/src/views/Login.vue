<script setup>
import { ref, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, ArrowRight, ArrowLeft, Message } from '@element-plus/icons-vue'
import { sendVerification, verifyCode, register } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const loginForm = reactive({
  email: '',
  password: ''
})

const bindForm = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  verificationCode: ''
})

const loginFormRef = ref(null)
const bindFormRef = ref(null)

const loading = ref(false)

const isHovered = ref(false)
const isLoginMode = ref(true)
const sendingCode = ref(false)
const codeCountdown = ref(0)
const codeButtonText = ref('发送验证码')
const verificationSent = ref(false) // 标记是否已发送过验证码

// 登录表单验证规则
const loginRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: '请输入正确的邮箱格式',
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能少于8位', trigger: 'blur' }
  ]
}

// 注册表单验证规则
const bindRules = {
  name: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: '请输入正确的邮箱格式',
      trigger: 'blur'
    }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, message: '密码长度不能少于8位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== bindForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  verificationCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      validator: async (rule, value, callback) => {
        // 只有当已经发送过验证码且用户输入了内容时才验证
        if (verificationSent.value && value && value.length > 0) {
          try {
            // 调用验证验证码接口
            await verifyCode(bindForm.email, value)
            callback()
          } catch (error) {
            callback(new Error('验证码错误，请输入正确的验证码'))
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  try {
    await loginFormRef.value.validate()
    loading.value = true

    // 调用登录API
    await userStore.login(loginForm.email, loginForm.password)

    ElMessage.success('登录成功！欢迎回来~')
    await nextTick()

    // 检查是否可以返回上一页
    if (window.history.length > 1) {
      router.go(-1)
    } else {
      router.replace('/')
    }
  } catch (error) {
    ElMessage.error('登录失败，请检查账号密码是否正确~')
  } finally {
    loading.value = false
  }
}

const handleRegister = async () => {
  if (!bindFormRef.value) return

  try {
    await bindFormRef.value.validate()

    loading.value = true

    // 调用注册接口
    await register(
      bindForm.name,
      bindForm.password,
      bindForm.email,
      bindForm.verificationCode
    )

    ElMessage.success('注册成功！快去登录吧~')
    isLoginMode.value = true
    bindForm.name = ''
    bindForm.email = ''
    bindForm.password = ''
    bindForm.confirmPassword = ''
    bindForm.verificationCode = ''
    // 重置验证码状态
    codeCountdown.value = 0
    codeButtonText.value = '发送验证码'
    verificationSent.value = false
  } catch (error) {
    ElMessage.error('注册失败，请检查输入信息~')
  } finally {
    loading.value = false
  }
}

// 发送验证码
const sendVerificationCode = async () => {
  if (!bindForm.email) {
    ElMessage.warning('请输入邮箱地址')
    return
  }

  // 简单的邮箱格式验证
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(bindForm.email)) {
    ElMessage.warning('请输入正确的邮箱格式')
    return
  }

  if (codeCountdown.value > 0) return

  sendingCode.value = true

  try {
    // 调用发送验证码接口
    await sendVerification(bindForm.email)

    ElMessage.success('验证码已发送，请查收邮件')

    // 标记已发送验证码
    verificationSent.value = true

    // 开始倒计时
    codeCountdown.value = 60
    startCountdown()
  } catch (error) {
    ElMessage.error('发送验证码失败，请重试')
  } finally {
    sendingCode.value = false
  }
}

// 倒计时逻辑
const startCountdown = () => {
  const timer = setInterval(() => {
    codeCountdown.value--
    codeButtonText.value = `${codeCountdown.value}s`

    if (codeCountdown.value <= 0) {
      clearInterval(timer)
      codeButtonText.value = '发送验证码'
      codeCountdown.value = 0
    }
  }, 1000)
}

const toggleMode = () => {
  isLoginMode.value = !isLoginMode.value
  bindForm.name = ''
  bindForm.email = ''
  bindForm.password = ''
  bindForm.confirmPassword = ''
  bindForm.verificationCode = ''
  // 重置验证码状态
  codeCountdown.value = 0
  codeButtonText.value = '发送验证码'
  verificationSent.value = false
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="login-container">
    <div class="login-box" :class="{ 'animate-in': true, 'hover': isHovered }" @mouseenter="isHovered = true"
      @mouseleave="isHovered = false">

      <div class="back-button-container">
        <el-button class="back-button" @click="goBack" type="text" size="small">
          <el-icon>
            <ArrowLeft />
          </el-icon>
          返回
        </el-button>
      </div>

      <div class="login-header">
        <h2>猫丸子Maruko</h2>
        <p>{{ isLoginMode ? '欢迎回来！' : '加入我们吧！' }}</p>
      </div>

      <div class="form-container" :class="{ 'flipped': !isLoginMode }"
        :style="{ height: isLoginMode ? '160px' : '310px' }">
        <div class="form-card">
          <!-- 登录表单 -->
          <el-form class="login-form" ref="loginFormRef" :model="loginForm" :rules="loginRules">
            <el-form-item prop="email">
              <el-input v-model="loginForm.email" placeholder="请输入邮箱" :prefix-icon="Message" clearable />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" :prefix-icon="Lock"
                show-password clearable />
            </el-form-item>
            <el-button type="primary" class="login-button" :loading="loading" @click="handleLogin">
              登录
              <el-icon class="button-icon">
                <ArrowRight />
              </el-icon>
            </el-button>
          </el-form>

          <!-- 注册表单 -->
          <el-form class="register-form" ref="bindFormRef" :model="bindForm" :rules="bindRules">
            <!-- 验证码输入框 -->
            <el-form-item prop="name">
              <el-input v-model="bindForm.name" placeholder="请输入用户名" :prefix-icon="User" clearable />
            </el-form-item>
            <!-- 邮箱和验证码按钮行 -->
            <div class="email-row">
              <el-form-item prop="email" class="email-item">
                <el-input v-model="bindForm.email" placeholder="请输入邮箱" :prefix-icon="Message" clearable />
              </el-form-item>
              <el-button class="send-code-btn" :loading="sendingCode" :disabled="codeCountdown > 0"
                @click="sendVerificationCode">
                {{ codeButtonText }}
              </el-button>
            </div>

            <!-- 验证码输入框 -->
            <el-form-item prop="verificationCode">
              <el-input v-model="bindForm.verificationCode" placeholder="请输入验证码" :prefix-icon="Lock" clearable />
            </el-form-item>

            <el-form-item prop="password">
              <el-input v-model="bindForm.password" type="password" placeholder="请输入密码" :prefix-icon="Lock"
                show-password clearable />
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input v-model="bindForm.confirmPassword" type="password" placeholder="确认密码" :prefix-icon="Lock"
                show-password clearable />
            </el-form-item>
            <el-button type="primary" class="register-button" :loading="loading" @click="handleRegister">
              注册
              <el-icon class="button-icon">
                <ArrowRight />
              </el-icon>
            </el-button>
          </el-form>
        </div>
      </div>

      <div class="mode-switch">
        <el-button class="switch-button" @click="toggleMode">
          {{ isLoginMode ? '没有账号？点击注册！' : '已有账号？点击登录！' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
}

.login-box {
  width: 100%;
  max-width: 420px;
  padding: 50px 40px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  position: relative;
  z-index: 1;
  transform: translateY(30px) scale(0.95);
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  margin: 20px;
  box-sizing: border-box;
}

.login-box.animate-in {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.login-box.hover {
  box-shadow: 0 25px 70px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.2);
}

.login-header {
  text-align: center;
  margin-bottom: 35px;
}

.login-header h2 {
  font-size: 32px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 12px 0;
  font-weight: 700;
  letter-spacing: 2px;
  font-family: 'Comic Sans MS', cursive;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.login-header p {
  font-size: 16px;
  color: #7c7c7c;
  margin: 0;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.form-container {
  position: relative;
  width: 100%;
  /* min-height: 260px; */
  perspective: 1000px;
  -webkit-perspective: 1000px;
  transition: all 0.3s ease;
}

.form-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  transform-origin: center center;
  -webkit-transform-origin: center center;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  -webkit-transition: -webkit-transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.form-container.flipped .form-card {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
}

.login-form,
.register-form {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -moz-backface-visibility: hidden;
  -ms-backface-visibility: hidden;
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
  transform-origin: center center;
  -webkit-transform-origin: center center;
}

.register-form {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
}

/* 邮箱行布局 */
.email-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.email-item {
  flex: 1;
}

.send-code-btn {
  padding: 0;
  transition: all 0.3s ease;
  min-width: 110px;
  box-sizing: border-box;
}

.mode-switch {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid rgba(102, 126, 234, 0.1);
}

.switch-button {
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(102, 126, 234, 0.2);
  color: #667eea;
  font-size: 15px;
  padding: 12px 24px;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
  font-weight: 500;
}

.switch-button:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.2);
}

.login-button,
.register-button {
  width: 100%;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  margin-top: 12px;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.back-button-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

.back-button {
  color: #667eea;
  font-weight: 500;
  transition: all 0.3s ease;
}

.back-button:hover {
  color: #764ba2;
}
</style>