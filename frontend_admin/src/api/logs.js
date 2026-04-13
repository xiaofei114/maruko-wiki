import { Client } from "@/utils/HttpClient.js"

export function get_QueryLogs(data) {
    return Client.get(`/api/admin/logs`, data)
}