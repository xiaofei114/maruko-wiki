<script setup>
import { ref, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, ArrowRight, ArrowLeft, Message } from '@element-plus/icons-vue'
import { sendVerification, verifyCode, register, resetPassword } from '@/api/auth'
import { useUserStore } from '@/stores/user'
import img from '@/assets/登录页背景图.jpg'

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

const forgotForm = reactive({
  email: '',
  verificationCode: '',
  newPassword: '',
  confirmPassword: ''
})

const loginFormRef = ref(null)
const bindFormRef = ref(null)
const forgotFormRef = ref(null)

const loading = ref(false)

const isHovered = ref(false)
const isLoginMode = ref(true)
const isForgotPasswordMode = ref(false)
const sendingCode = ref(false)
const codeCountdown = ref(0)
const codeButtonText = ref('发送验证码')
const forgotCodeButtonText = ref('发送验证码')
const verificationSent = ref(false) // 标记是否已发送过验证码
const forgotVerificationSent = ref(false)

const ddName = import.meta.env.VITE_APP_DD_NAME
const hostName = import.meta.env.VITE_APP_TITLE

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
    // { min: 8, message: '密码长度不能少于8位', trigger: 'blur' }
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
    // { min: 8, message: '密码长度不能少于8位', trigger: 'blur' }
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

// 忘记密码表单验证规则
const forgotRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: '请输入正确的邮箱格式',
      trigger: 'blur'
    }
  ],
  verificationCode: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    {
      validator: async (rule, value, callback) => {
        if (forgotVerificationSent.value && value && value.length > 0) {
          try {
            await verifyCode(forgotForm.email, value)
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
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== forgotForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
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
  isForgotPasswordMode.value = false
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

const showForgotPassword = () => {
  isForgotPasswordMode.value = true
  isLoginMode.value = false
}

const backToLogin = () => {
  isForgotPasswordMode.value = false
  isLoginMode.value = true
  forgotForm.email = ''
  forgotForm.verificationCode = ''
  forgotForm.newPassword = ''
  forgotForm.confirmPassword = ''
  forgotCodeButtonText.value = '发送验证码'
  forgotVerificationSent.value = false
}

// 发送忘记密码验证码
const sendForgotVerificationCode = async () => {
  if (!forgotForm.email) {
    ElMessage.warning('请输入邮箱地址')
    return
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(forgotForm.email)) {
    ElMessage.warning('请输入正确的邮箱格式')
    return
  }

  if (codeCountdown.value > 0) return

  sendingCode.value = true

  try {
    await sendVerification(forgotForm.email, 'resetPassword')
    ElMessage.success('验证码已发送，请查收邮件')
    forgotVerificationSent.value = true
    codeCountdown.value = 60
    startForgotCountdown()
  } catch (error) {
    ElMessage.error('发送验证码失败，请重试')
  } finally {
    sendingCode.value = false
  }
}

// 忘记密码倒计时
const startForgotCountdown = () => {
  const timer = setInterval(() => {
    codeCountdown.value--
    forgotCodeButtonText.value = `${codeCountdown.value}s`

    if (codeCountdown.value <= 0) {
      clearInterval(timer)
      forgotCodeButtonText.value = '发送验证码'
      codeCountdown.value = 0
    }
  }, 1000)
}

// 处理重置密码
const handleResetPassword = async () => {
  if (!forgotFormRef.value) return

  try {
    await forgotFormRef.value.validate()
    loading.value = true

    await resetPassword(
      forgotForm.email,
      forgotForm.verificationCode,
      forgotForm.newPassword
    )

    ElMessage.success('密码重置成功，请使用新密码登录')
    backToLogin()
  } catch (error) {
    ElMessage.error('密码重置失败，请检查输入信息')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="login-container" :style="{ backgroundImage: `url(${img})` }">
    <div class="login-box" :class="{ 'hover': isHovered }" @mouseenter="isHovered = true"
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
        <h2>{{ hostName }}</h2>
        <p v-if="!isForgotPasswordMode">{{ isLoginMode ? `${ddName}，欢迎回家！` : `是新的${ddName}嘛！？` }}</p>
        <p v-else>是忘记密码了嘛？</p>
      </div>

      <div class="form-flipper" :class="{ 'flipped': !isLoginMode, 'forgot-flipped': isForgotPasswordMode }"
        :style="{ height: isForgotPasswordMode ? '280px' : (isLoginMode ? '200px' : '310px') }">
        <!-- 登录表单 -->
        <div class="form-panel login-panel">
          <el-form class="login-form" ref="loginFormRef" :model="loginForm" :rules="loginRules">
            <el-form-item prop="email">
              <el-input v-model="loginForm.email" placeholder="请输入邮箱" :prefix-icon="Message" clearable />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" :prefix-icon="Lock"
                show-password clearable />
            </el-form-item>
            <div class="forgot-password-link">
              <el-button type="text" size="small" @click="showForgotPassword">忘记密码？</el-button>
            </div>
            <el-button type="primary" class="login-button" :loading="loading" @click="handleLogin">
              登录
              <el-icon class="button-icon">
                <ArrowRight />
              </el-icon>
            </el-button>
          </el-form>
        </div>

        <!-- 注册表单 -->
        <div class="form-panel register-panel">
          <el-form class="register-form" ref="bindFormRef" :model="bindForm" :rules="bindRules">
            <el-form-item prop="name">
              <el-input v-model="bindForm.name" placeholder="请输入用户名" :prefix-icon="User" clearable />
            </el-form-item>
            <div class="email-row">
              <el-form-item prop="email" class="email-item">
                <el-input v-model="bindForm.email" placeholder="请输入邮箱" :prefix-icon="Message" clearable />
              </el-form-item>
              <el-button class="send-code-btn" :loading="sendingCode" :disabled="codeCountdown > 0"
                @click="sendVerificationCode">
                {{ codeButtonText }}
              </el-button>
            </div>
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

        <!-- 忘记密码表单 -->
        <div class="form-panel forgot-panel">
          <el-form ref="forgotFormRef" :model="forgotForm" :rules="forgotRules">
            <div class="email-row">
              <el-form-item prop="email" class="email-item">
                <el-input v-model="forgotForm.email" placeholder="请输入邮箱" :prefix-icon="Message" clearable />
              </el-form-item>
              <el-button class="send-code-btn" :loading="sendingCode" :disabled="codeCountdown > 0"
                @click="sendForgotVerificationCode">
                {{ forgotCodeButtonText }}
              </el-button>
            </div>
            <el-form-item prop="verificationCode">
              <el-input v-model="forgotForm.verificationCode" placeholder="请输入验证码" :prefix-icon="Lock" clearable />
            </el-form-item>
            <el-form-item prop="newPassword">
              <el-input v-model="forgotForm.newPassword" type="password" placeholder="请输入新密码" :prefix-icon="Lock"
                show-password clearable />
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input v-model="forgotForm.confirmPassword" type="password" placeholder="确认新密码" :prefix-icon="Lock"
                show-password clearable />
            </el-form-item>
            <el-button type="primary" class="login-button" :loading="loading" @click="handleResetPassword">
              重置密码
              <el-icon class="button-icon">
                <ArrowRight />
              </el-icon>
            </el-button>
          </el-form>
        </div>
      </div>

      <div class="mode-switch">
        <el-button v-if="isForgotPasswordMode" class="switch-button" @click="backToLogin">
          返回登录
        </el-button>
        <el-button v-else class="switch-button" @click="toggleMode">
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
  background: var(--color-primary);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.3) 0%, transparent 50%);
  animation: float 20s ease-in-out infinite;
}

.login-box {
  width: 100%;
  max-width: 420px;
  padding: 50px 40px 30px 40px;
  background: rgba(255, 255, 255, 0.381);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  position: relative;
  z-index: 1;
  transform: translateY(30px);
  opacity: 0;
  animation: slideUp 0.6s ease forwards;
  border: 2px solid rgba(255, 255, 255, 0.2);
  margin: 20px;
  box-sizing: border-box;
}

@keyframes slideUp {
  to {
    transform: translateY(0);
    opacity: 1;
  }
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
  color: var(--color-primary);
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

/* 表单翻转容器 */
.form-flipper {
  position: relative;
  height: 200px;
  perspective: 1000px;
  transition: height 0.4s ease;
}

.form-panel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transition: transform 0.6s ease, opacity 0.6s ease;
  transform-style: preserve-3d;
  opacity: 0;
  pointer-events: none;
}

.login-panel {
  transform: rotateY(0deg);
  opacity: 1;
  pointer-events: auto;
}

.register-panel {
  transform: rotateY(180deg);
}

.forgot-panel {
  transform: rotateY(180deg);
}

.form-flipper.flipped .login-panel {
  transform: rotateY(-180deg);
  opacity: 0;
  pointer-events: none;
}

.form-flipper.flipped .register-panel {
  transform: rotateY(0deg);
  opacity: 1;
  pointer-events: auto;
}

.form-flipper.forgot-flipped .login-panel {
  transform: rotateY(-180deg);
  opacity: 0;
  pointer-events: none;
}

.form-flipper.forgot-flipped .forgot-panel {
  transform: rotateY(0deg);
  opacity: 1;
  pointer-events: auto;
}

.form-flipper.forgot-flipped .register-panel {
  transform: rotateY(180deg);
  opacity: 0;
  pointer-events: none;
}

.login-form,
.register-form {
  width: 100%;
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
  border-top: 1px solid var(--color-primary-alpha-10);
}

.switch-button {
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid var(--color-primary-alpha-20);
  color: var(--color-primary);
  font-size: 15px;
  padding: 12px 24px;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px var(--color-primary-alpha-10);
  font-weight: 500;
}

.switch-button:hover {
  background: var(--color-primary-alpha-10);
  border-color: var(--color-primary-alpha-30);
  box-shadow: 0 6px 20px var(--color-primary-alpha-20);
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
  margin-bottom: 16px;
  box-shadow: 0 4px 15px var(--color-primary-alpha-30);
}

.back-button-container {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
}

.back-button {
  color: var(--color-primary);
  font-weight: 500;
  transition: all 0.3s ease;
}

.back-button:hover {
  color: var(--color-primary-light);
}

/* 忘记密码链接 */
.forgot-password-link {
  text-align: right;
  margin-bottom: 10px;
}

.forgot-password-link .el-button {
  color: var(--color-primary);
  font-size: 13px;
}

/* 忘记密码表单 */
.forgot-password-form {
  margin-bottom: 20px;
}
</style>