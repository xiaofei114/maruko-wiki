/**
 * 获取格式化日期时间字符串
 * @returns {string} 格式：年-月-日 时:分:秒
 */
export function getDateTime() {
    const date = new Date()
    // 提取时间组件
    const year = date.getFullYear();
    const month = date.getMonth() + 1;    // 月份从0开始
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}