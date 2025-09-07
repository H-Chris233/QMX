<template>
  <section :id="id" class="section">
    <h2>{{ title }}</h2>
    <slot></slot>
  </section>
</template>

<script>
export default {
  props: {
    title: String,
    id: String,
    dark: Boolean
  }
}
</script>

<style scoped>
.section {
  background-color: #1e1e1e;
  border-radius: 10px;
  padding: 25px 30px;
  margin-bottom: 25px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.3);
  transition: transform 0.3s ease;
}

.section:hover {
  transform: translateY(-5px);
}

h2 {
  color: #ffffff;
  border-bottom: 2px solid #333;
  padding-bottom: 8px;
  margin-top: 0;
}
</style>
