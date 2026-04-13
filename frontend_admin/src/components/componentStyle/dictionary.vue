<script setup>
import { computed } from 'vue'

const props = defineProps({
    copy: String, //显示内容
    value: [String, Number], //传参
    data: Array //字典数据
})

// console.log('props', props);

const showContents = computed(() => {
    if (props.copy) {
        return props.copy
    } else {
        const foundItem = props.data?.find(item => item.dict_key == props.value)
        return foundItem?.dict_label || props.value
    }
})

const displayStyle = computed(() => {
    if (props.copy) {
        return props.value
    } else {
        const foundItem = props.data?.find(item => item.dict_key == props.value)
        return foundItem?.display_style || 'none'
    }
})

</script>

<template>
    <span style="margin: 0 5px;">
        <el-tag v-if="displayStyle !== null && displayStyle !== 'none'" :type="displayStyle">
            {{ showContents }}
        </el-tag>
        <span v-else>
            {{ showContents ?? '-' }}
        </span>
    </span>
</template>