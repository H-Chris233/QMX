<template>
  <button v-show="show" class="scroll-button" @click="scrollToTop">
    ↑ 返回顶部
  </button>
</template>

<script>
export default {
  props: ['show'],
  methods: {
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }
}
</script>

<style scoped>
.scroll-button {
  position: fixed;
  bottom: 30px;
  right: 30px;
  padding: 12px 16px;
  background: #212121;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  transition: opacity 0.3s;
  z-index: 100;
}

.scroll-button:hover {
  background: #333;
}
</style>
