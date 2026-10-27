<script setup>
import { ref, onMounted, watch } from 'vue'
import { api_Login } from '@/api/login.js'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore, getUserIdFromToken } from '@/stores/user.js'
import { ElMessage } from 'element-plus'
import background from "@/assets/background.png"

const router = useRouter()
const route = useRoute()
const ruleForm = ref({})
const userStore = useUserStore()

// 已经用哪个用户的 token 尝试过自动登录，避免同一账号反复请求
let attemptedUserId = undefined

const loginMethod = data => {
    api_Login(data).then(res => {
        if (res.data?.token) {
            // 只有管理员才能进入后台，普通用户保留主站登录态
            if (res.data.permission <= 2) {
                userStore.loginIn(res.data.token, res.data.name, res.data.permission, res.data.avatar)
                router.push("/home")
            } else {
                ElMessage.warning('当前账号无管理权限，请使用管理员账号登录')
            }
        }
    }).catch(() => {
        // 错误提示由 HttpClient 统一处理，这里只需要停留在登录页
    })
}

const Login = () => {
    const { accountNumber, password } = ruleForm.value
    if (!accountNumber || !password) {
        ElMessage.warning('请输入账号密码')
        return
    }
    loginMethod(ruleForm.value)
}

// 同源部署，直接复用用户端保存的 token，无需从 URL 参数传入
const tryAutoLogin = () => {
    const token = userStore.token
    if (!token) return

    const userId = getUserIdFromToken(token)
    // 同一个 token / 同一个账号只自动尝试一次
    if (userId === attemptedUserId) return

    attemptedUserId = userId
    loginMethod({ token })
}

onMounted(() => {
    // 守卫刚刚校验过这个 token 且确认不是管理员，先不重复请求
    if (route.query.checked === '1') {
        attemptedUserId = getUserIdFromToken(userStore.token)
        return
    }
    tryAutoLogin()
})

// 另一个标签页（主站）登录或切换账号后，后台停留在登录页时也能自动进入
watch(() => userStore.token, (token) => {
    if (!token) {
        attemptedUserId = undefined
        return
    }
    tryAutoLogin()
})
</script>

<template>
    <div class="page" :style="{ backgroundImage: `url(${background})` }">
        <el-card class="card">
            <div class="title">登录</div>
            <el-form :model="ruleForm" class="form">
                <el-form-item label="账号" prop="accountNumber" class="form_item">
                    <el-input v-model="ruleForm.accountNumber" class="form_input" placeholder="请输入账号" />
                </el-form-item>
                <el-form-item label="密码" prop="password" class="form_item">
                    <el-input v-model="ruleForm.password" type="password" show-password class="form_input"
                        placeholder="请输入密码" />
                </el-form-item>
                <el-form-item class="form_item_button">
                    <el-button type="primary" @click="Login" class="button">
                        登录
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<style scoped>
.page {
    width: 100%;
    height: 100%;
    /* background-image: url('@/assets/background0.png'); */
    background-position: center;
    background-size: cover;
    display: flex;
    justify-content: center;
    align-items: center;
}

.card {
    width: 400px;
    height: 300px;
    background-color: #ffffff8c;
    backdrop-filter: blur(3px);
}

.title {
    width: 100%;
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 25px;
    font-weight: bold;
    margin-bottom: 10px;
}

.form {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.form_item {
    width: 80%;
    margin-top: 10px;
}

.form_input:deep(input) {
    text-indent: 10px;
}

:deep(.el-input__suffix) {
    transform: translateX(-10px);
}

.form_item_button {
    margin-top: 20px;
    height: 35px;
    width: 80%;
}

.button {
    height: 100%;
    width: 100%;
}
</style>
