import http from '@/utils/http'

/**
 * 用户登录
 * @param {string} accountNumber - 账号
 * @param {string} password - 密码
 * @returns {Promise<{token: string, permission: string, name: string}>}
 */
export function login(accountNumber, password) {
    return http.post('/login', {
        accountNumber,
        password
    })
}

/**
 * 刷新token
 * @param {string} token - 现有token
 * @returns {Promise<{token: string}>}
 */
export function refreshToken(token) {
    return http.post('/login', {
        token
    })
}

/**
 * 发送验证码
 * @param {string} email - 邮箱地址
 * @returns {Promise}
 */
export function sendVerification(email) {
    return http.post('/sendVerification', {
        email
    })
}

/**
 * 验证验证码
 * @param {string} email - 邮箱地址
 * @param {string} code - 验证码
 * @returns {Promise}
 */
export function verifyCode(email, code) {
    return http.post('/verifyCode', {
        email,
        code
    })
}

/**
 * 用户注册
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @param {string} email - 邮箱地址
 * @param {string} verificationCode - 验证码
 * @returns {Promise}
 */
export function register(username, password, email, verificationCode) {
    return http.post('/register', {
        username,
        password,
        email,
        verificationCode
    })
}
