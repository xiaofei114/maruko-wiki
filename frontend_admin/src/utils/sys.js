import { get_getItemsPaged } from '@/api/dictionary.js'

export async function getSysDict(...sys) {
    const results = await Promise.all(sys.map(item =>
        get_getItemsPaged({
            dictType: item,
            page: 1,
            pageSize: 1000,
            includeBanned: false,
            compulsoryAcquisition: false
        }).then(res => res.code === 200 ? res.data.data : [])
    ))

    return Object.fromEntries(sys.map((key, i) => [key, results[i]]))
}