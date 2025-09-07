<template>
  <div class="settings-container">
    <!-- 页面标题 -->
    <div class="section-header">
      <h2>设置</h2>
    </div>

    <!-- 设置内容 -->
    <div class="settings-grid">
      <!-- 外观设置 -->
      <div class="settings-card">
        <div class="card-header">
          <h3>外观</h3>
        </div>
        <div class="card-content">
          <div class="setting-item">
            <div class="setting-info">
              <label>主题模式</label>
              <p class="setting-description">选择应用程序的主题外观</p>
            </div>
            <div class="setting-control">
              <button 
                class="theme-toggle-btn" 
                @click="toggleTheme"
                :title="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
              >
                <span v-if="theme === 'dark'">🌑 深色</span>
                <span v-else>🌕 浅色</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 通用设置 -->
      <div class="settings-card">
        <div class="card-header">
          <h3>通用</h3>
        </div>
        <div class="card-content">
          <div class="setting-item">
  <div class="setting-info">
    <label>自动保存</label>
    <p class="setting-description">为了防止忘记保存的悲剧发生，本开关无法关闭。</p>
  </div>
  <div class="setting-control">
    <label class="switch">
      <input type="checkbox" v-model="autoSave" disabled @change="saveSettings">
      <span class="slider"></span>
    </label>
  </div>
</div>
        </div>
      </div>

      <!-- 关于 -->
      <div class="settings-card">
        <div class="card-header">
          <h3>关于</h3>
        </div>
        <div class="card-content">
          <div class="about-info">
            <h4>启明星管理系统</h4>
            <p class="version">版本: 1.0.0</p>
            <p class="tech-stack">基于 Tauri + Vue 3 构建</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'Settings',
  setup() {
    const theme = ref('dark')
    const autoSave = ref(true)

    const toggleTheme = () => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', theme.value)
      document.documentElement.className = theme.value + '-theme'
    }

    const saveSettings = () => {
      localStorage.setItem('autoSave', autoSave.value.toString())
    }

    onMounted(() => {
      // 初始化主题
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        theme.value = savedTheme
      } else {
        theme.value = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      document.documentElement.className = theme.value + '-theme'

      // 加载设置
      const savedAutoSave = localStorage.getItem('autoSave')
      if (savedAutoSave) {
        autoSave.value = savedAutoSave === 'true'
      }
    })

    return {
      theme,
      autoSave,
      toggleTheme,
      saveSettings
    }
  }
}
</script>

<style scoped>
.settings-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-header h2 {
  margin: 0;
  color: var(--text-primary);
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.settings-card {
  background-color: var(--bg-secondary);
  border-radius: 8px;
  box-shadow: 0 2px 8px var(--shadow-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.card-header {
  padding: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.card-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.card-content {
  padding: 1.5rem;
  flex-grow: 1;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-info label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.25rem;
  color: var(--text-primary);
}

.setting-description {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.setting-control {
  margin-left: 1rem;
}

.theme-toggle-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 500;
}

.theme-toggle-btn:hover {
  background-color: var(--accent-primary);
  border-color: var(--accent-primary);
  color: white;
  transform: translateY(-1px);
}

/* 开关样式 */
.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input:disabled + .slider {
  background-color: var(--bg-tertiary);
  opacity: 0.6;
  cursor: not-allowed;
}

.switch input:disabled + .slider:before {
  background-color: #aaa;
}

.switch input:disabled {
  -webkit-appearance: none;
  appearance: none;
  background-color: transparent;
  border: none;
  outline: none;
  pointer-events: none;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-tertiary);
  transition: .4s;
  border-radius: 34px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--accent-primary);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.about-info h4 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.version,
.tech-stack {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .setting-control {
    align-self: flex-end;
  }
}
</style>
