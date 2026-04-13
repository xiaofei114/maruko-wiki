import { Client } from "@/utils/HttpClient.js"

//获取用户列表
export function get_userlist(data) {
    return Client.get('/api/super-admin/users', data)
}

//封禁/解封用户
export function api_setBanStatus(data) {
    return Client.post(`/api/super-admin/users/${data.id}/ban`, { is_banned: data.isBanned })
}

//重置密码
export function api_resetPassword(id) {
    return Client.post(`/api/super-admin/users/${id}/reset-password`)
}

//修改权限
export function api_updatePermission(data) {
    return Client.put(`/api/super-admin/users/${data.account}/permission`, { permission: data.newPermission })
}

//删除用户
export function user_deleteUser(id) {
    return Client.delete(`/api/super-admin/users/${id}`)
}

//创建用户 (需要另外实现，暂时保留原接口或注释)
// export function api_addUser(data) {
//     return Client.post('/api/super-admin/users', data)
// }