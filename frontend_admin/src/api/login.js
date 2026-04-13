import { Client } from "@/utils/HttpClient.js"



export function api_Login(data) {
    return Client.post(`/login`, data)
}