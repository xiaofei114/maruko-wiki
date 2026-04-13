<script setup>
import { ref, onMounted } from 'vue'
import { api_Login } from '@/api/login.js'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user.js'
import { ElMessage } from 'element-plus'
import background from "@/assets/background.png"

const router = useRouter()
const ruleForm = ref({})
const userStore = useUserStore()

const loginMethod = data => {
    api_Login(data).then(res => {
        if (res.data?.token) {
            userStore.loginIn(res.data.token, res.data.name, res.data.permission)
            router.push("/home")
        }
    })
}

const Login = () => {
    if (Object.values(ruleForm.value).some(v => !v)) {
        ElMessage.warning('请输入账号密码')
    }
    loginMethod(ruleForm.value)
}

onMounted(() => {
    // 优先从 URL 参数中解析 token（跨域跳转场景）
    const urlParams = new URLSearchParams(window.location.search)
    const urlToken = urlParams.get('token')
    if (urlToken) {
        loginMethod({ token: urlToken })
        return
    }

    // 其次使用 localStorage 中已保存的 token
    if (userStore.isAuthenticated) {
        const { token } = userStore
        loginMethod({ token })
    }
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
