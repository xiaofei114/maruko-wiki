<script setup>
import Top from '../components/Top.vue'
import Bottom from '../components/Bottom.vue'
</script>

<template>
  <div class="app-container">
    <Top />
    <Suspense>
      <RouterView />
    </Suspense>
    <Bottom />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
