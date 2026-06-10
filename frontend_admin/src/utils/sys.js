import { get_getPublicItemsPaged } from '@/api/dictionary.js'

export async function getSysDict(...sys) {
    const results = await Promise.all(sys.map(item =>
        get_getPublicItemsPaged({
            dictType: item
        }).then(res => res.code === 200 ? res.data : [])
    ))

    return Object.fromEntries(sys.map((key, i) => [key, results[i]]))
}