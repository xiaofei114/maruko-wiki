import { Client } from "@/utils/HttpClient.js"

//获取字典类型列表
export function get_getTypesPaged(data) {
    return Client.get('/api/admin/dictionary/types', data)
}

//删除字典类型
export function get_deleteType(typeId) {
    return Client.delete(`/api/admin/dictionary/types/${typeId}`)
}

//禁用字典类型
export function get_banType(data) {
    return Client.put(`/api/admin/dictionary/types/${data.id}/ban`, { banned: data.banned })
}

//添加/修改字典类型
export function get_addorupdateType(data) {
    return Client.post('/api/admin/dictionary/types', data)
}

//获取字典项列表
export function get_getItemsPaged(data) {
    return Client.get('/api/admin/dictionary/items', data)
}

//获取通用字典项列表
export function get_getPublicItemsPaged(data) {
    return Client.get('/api/dictionary/items', data)
}

//添加/修改字典项
export function get_addorupdateItem(data) {
    return Client.post('/api/admin/dictionary/items', data)
}

//删除字典项
export function get_deleteItem(itemId) {
    return Client.delete(`/api/admin/dictionary/items/${itemId}`)
}

//禁用字典项
export function get_banItem(data) {
    return Client.put(`/api/admin/dictionary/items/${data.id}/ban`, { banned: data.banned })
}