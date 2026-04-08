<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  }
})
</script>

<template>
  <section class="page-hero">
    <div class="hero-content">
      <h1 class="hero-title">{{ title }}</h1>
      <p class="hero-subtitle">{{ subtitle }}</p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
// 导入主题色
@use '@/assets/theme' as *;

.page-hero {
  text-align: center;
  margin-bottom: 40px;
  padding: 60px 20px;
  // 背景渐变色使用主色的极淡版本
  background: linear-gradient(135deg, #{rgba($theme-color, 0.08)} 0%, #{rgba($theme-color, 0.15)} 100%);
  border-radius: 20px;
  box-shadow: 0 8px 25px var(--color-primary-alpha-10);
  position: relative;
  overflow: hidden;
}

.page-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, #{rgba($theme-color, 0.05)} 0%, transparent 70%);
  animation: float 20s infinite linear;
}

@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(180deg); }
  100% { transform: translateY(0px) rotate(360deg); }
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: clamp(2rem, 5vw, 3rem);
  color: var(--color-primary);
  margin-bottom: 10px;
  font-weight: 700;
  font-family: 'Comic Sans MS', cursive;
  text-shadow: 0 2px 10px #{rgba($theme-color, 0.2)};
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #666;
  max-width: 500px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .page-hero {
    padding: 40px 20px;
    margin-bottom: 30px;
  }

  .hero-title {
    font-size: 2.2rem;
  }
}
</style>