import http from '@/utils/http'

// 获取字典项列表（公开接口）
export function getDictionaryItems(dictType) {
    return http.get('/api/dictionary/items', { params: { dictType } })
}
