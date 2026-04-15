import { Client } from "@/utils/HttpClient.js"

// 获取音声列表
export function getAudios(data) {
    return Client.get('/api/admin/audios', data)
}

// 审核音声
export function reviewAudio(audioId, isReview) {
    return Client.post(`/api/admin/audios/${audioId}/review`, {
        is_review: isReview
    })
}

// 修改音声信息
export function updateAudio(audioId, data) {
    return Client.put(`/api/admin/audios/${audioId}`, data)
}

// 删除音声
export function deleteAudio(audioId) {
    return Client.delete(`/api/admin/audios/${audioId}`)
}

// 修改音声分类
export function updateAudioClassification(classificationId, data) {
    return Client.put(`/api/admin/audio-classifications/${classificationId}`, data)
}

// 删除音声分类
export function deleteAudioClassification(classificationId) {
    return Client.delete(`/api/admin/audio-classifications/${classificationId}`)
}
