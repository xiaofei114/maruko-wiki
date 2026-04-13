import { Client } from "@/utils/HttpClient.js"

// 获取仪表盘数据
export function getDashboardStats() {
    return Client.get('/api/super-admin/dashboard')
}
